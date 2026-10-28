begin;

create or replace function public.impact_model_has_current_passing_health(p_model_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select health.health_status = 'passed'
      and health.checked_at <= now()
      and (health.expires_at is null or health.expires_at > now())
    from public.impact_model_health_snapshots health
    where health.model_version_id = p_model_version_id
    order by health.checked_at desc, health.created_at desc, health.id desc
    limit 1
  ), false);
$$;

create or replace function public.impact_accounting_validate_snapshot()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  model_row public.impact_model_versions%rowtype;
begin
  if new.snapshot ->> 'schemaVersion' <> new.schema_version
    or new.snapshot ->> 'subjectRef' <> new.subject_ref
    or new.snapshot ->> 'mechanismFamily' <> new.mechanism_family
    or new.snapshot ->> 'inputStateHash' <> new.input_state_hash
  then
    raise exception 'Impact snapshot columns must match the immutable JSON payload' using errcode = '23514';
  end if;
  if jsonb_typeof(new.snapshot -> 'components') <> 'array'
    or jsonb_typeof(new.snapshot -> 'health') <> 'object'
  then
    raise exception 'Impact snapshot requires components and health payloads' using errcode = '23514';
  end if;
  if new.snapshot #>> '{health,status}' <> new.health_status then
    raise exception 'Impact snapshot health status must match the JSON payload' using errcode = '23514';
  end if;
  if new.publication_status = 'current' and new.health_status <> 'passed' then
    raise exception 'Only passing impact snapshots may be current' using errcode = '23514';
  end if;
  if new.model_version_id is not null then
    select * into model_row from public.impact_model_versions where id = new.model_version_id;
    if not found
      or model_row.lifecycle_status <> 'active'
      or model_row.methodology_hash <> new.methodology_hash
      or model_row.mechanism_family <> new.mechanism_family
      or not public.impact_model_has_current_passing_health(model_row.id)
    then
      raise exception 'Modeled impact snapshots require the matching active, currently healthy, approved model' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.activate_impact_model_version(p_model_version_id uuid)
returns public.impact_model_versions
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  model_row public.impact_model_versions%rowtype;
begin
  if not public.is_impact_model_approver(true) then
    raise exception 'AAL2 impact-model approver authorization required' using errcode = '42501';
  end if;
  select * into model_row from public.impact_model_versions where id = p_model_version_id for update;
  if not found then raise exception 'Impact model version not found' using errcode = 'P0002'; end if;
  if model_row.lifecycle_status not in ('approved','inactive') then
    raise exception 'Only approved or inactive impact models can be activated' using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.impact_model_approval_events approval
    where approval.model_version_id = model_row.id
      and approval.decision = 'approve'
      and approval.methodology_hash = model_row.methodology_hash
  ) then
    raise exception 'Matching founder approval event is required' using errcode = '23514';
  end if;
  if not public.impact_model_has_current_passing_health(model_row.id) then
    raise exception 'A current passing model-health snapshot is required before activation' using errcode = '23514';
  end if;
  update public.impact_model_versions
    set lifecycle_status = 'superseded', superseded_at = now()
    where mechanism_family = model_row.mechanism_family
      and lifecycle_status = 'active'
      and id <> model_row.id;
  update public.impact_model_versions
    set lifecycle_status = 'active', activated_at = coalesce(activated_at, now())
    where id = model_row.id returning * into model_row;
  return model_row;
end;
$$;

create or replace function public.get_my_impact_accounting_snapshots()
returns table (
  snapshot_id uuid,
  subject_ref text,
  mechanism_family text,
  model_version_id uuid,
  methodology_hash text,
  input_state_hash text,
  state_as_of timestamptz,
  generated_at timestamptz,
  expires_at timestamptz,
  health_status text,
  snapshot jsonb
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select estimate.id, estimate.subject_ref, estimate.mechanism_family,
    estimate.model_version_id, estimate.methodology_hash, estimate.input_state_hash,
    estimate.state_as_of, estimate.generated_at, estimate.expires_at,
    estimate.health_status, estimate.snapshot
  from public.impact_estimate_snapshots estimate
  left join public.impact_model_versions model on model.id = estimate.model_version_id
  where estimate.participant_user_id = auth.uid()
    and estimate.publication_status = 'current'
    and estimate.health_status = 'passed'
    and (estimate.expires_at is null or estimate.expires_at > now())
    and (
      estimate.model_version_id is null
      or (
        model.lifecycle_status = 'active'
        and model.methodology_hash = estimate.methodology_hash
        and public.impact_model_has_current_passing_health(model.id)
      )
    )
  order by estimate.generated_at desc;
$$;

revoke all on function public.impact_model_has_current_passing_health(uuid) from public, anon, authenticated;
grant execute on function public.impact_model_has_current_passing_health(uuid) to service_role;

comment on function public.impact_model_has_current_passing_health(uuid) is
  'Returns true only when the latest model-health record is passing and unexpired. Activation and modeled publication fail closed otherwise.';

commit;
