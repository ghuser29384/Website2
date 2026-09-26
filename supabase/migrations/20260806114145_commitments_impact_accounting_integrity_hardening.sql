begin;

create index if not exists impact_model_approvers_granted_by_idx
  on public.impact_model_approvers (granted_by)
  where granted_by is not null;
create index if not exists impact_model_versions_material_change_from_idx
  on public.impact_model_versions (material_change_from)
  where material_change_from is not null;
create index if not exists impact_model_versions_created_by_idx
  on public.impact_model_versions (created_by)
  where created_by is not null;
create index if not exists impact_model_approval_events_approver_user_idx
  on public.impact_model_approval_events (approver_user_id, created_at desc);
create index if not exists impact_estimate_snapshots_supersedes_idx
  on public.impact_estimate_snapshots (supersedes_snapshot_id)
  where supersedes_snapshot_id is not null;
create index if not exists impact_estimate_audit_events_actor_user_idx
  on public.impact_estimate_audit_events (actor_user_id, created_at desc)
  where actor_user_id is not null;
create index if not exists impact_refresh_queue_participant_idx
  on public.impact_refresh_queue (participant_user_id);

create or replace function public.impact_accounting_assert_snapshot_payload(p_snapshot jsonb)
returns void
language plpgsql
stable
set search_path = public
as $$
declare
  component jsonb;
  quantity jsonb;
  interval_value jsonb;
  model_value jsonb;
  point_value numeric;
  lower_value numeric;
  upper_value numeric;
  checked_at_value timestamptz;
  health_expires_at_value timestamptz;
  component_count integer;
  distinct_key_count integer;
begin
  if jsonb_typeof(p_snapshot) <> 'object' then
    raise exception 'Impact snapshot must be a JSON object' using errcode = '23514';
  end if;
  if p_snapshot ->> 'schemaVersion' <> 'moral-trade-impact-accounting-v1' then
    raise exception 'Impact snapshot schema version is invalid' using errcode = '23514';
  end if;
  if coalesce(btrim(p_snapshot ->> 'subjectRef'), '') = ''
    or coalesce(btrim(p_snapshot ->> 'mechanismFamily'), '') = ''
    or coalesce(btrim(p_snapshot ->> 'inputStateHash'), '') = ''
  then
    raise exception 'Impact snapshot identity fields are required' using errcode = '23514';
  end if;
  if p_snapshot ->> 'mechanismFamily' not in (
    'trade','co_fund','threshold_funding','donation_upgrade','threshold_sign_on','donation_redirect'
  ) then
    raise exception 'Impact snapshot mechanism family is invalid' using errcode = '23514';
  end if;
  if (p_snapshot ->> 'inputStateHash') !~ '^sha256:[a-f0-9]{64}$' then
    raise exception 'Impact snapshot state hash is invalid' using errcode = '23514';
  end if;
  if jsonb_typeof(p_snapshot -> 'components') <> 'array'
    or jsonb_typeof(p_snapshot -> 'health') <> 'object'
    or jsonb_typeof(p_snapshot -> 'blockers') <> 'array'
  then
    raise exception 'Impact snapshot requires components, health, and blockers payloads' using errcode = '23514';
  end if;
  if jsonb_typeof(p_snapshot -> 'explanation') <> 'string'
    or coalesce(btrim(p_snapshot ->> 'explanation'), '') = ''
  then
    raise exception 'Impact snapshot explanation is required' using errcode = '23514';
  end if;
  if p_snapshot #>> '{health,status}' not in ('passed','warning','blocked','stale') then
    raise exception 'Impact snapshot health status is invalid' using errcode = '23514';
  end if;
  if jsonb_typeof(p_snapshot #> '{health,blockers}') <> 'array' then
    raise exception 'Impact snapshot health blockers must be an array' using errcode = '23514';
  end if;
  if jsonb_typeof(p_snapshot #> '{health,checkedAt}') <> 'string' then
    raise exception 'Impact snapshot health checkedAt is required' using errcode = '23514';
  end if;
  begin
    checked_at_value := (p_snapshot #>> '{health,checkedAt}')::timestamptz;
  exception when invalid_datetime_format then
    raise exception 'Impact snapshot health checkedAt is invalid' using errcode = '23514';
  end;
  if p_snapshot #> '{health,expiresAt}' is not null
    and p_snapshot #> '{health,expiresAt}' <> 'null'::jsonb
  then
    if jsonb_typeof(p_snapshot #> '{health,expiresAt}') <> 'string' then
      raise exception 'Impact snapshot health expiresAt is invalid' using errcode = '23514';
    end if;
    begin
      health_expires_at_value := (p_snapshot #>> '{health,expiresAt}')::timestamptz;
    exception when invalid_datetime_format then
      raise exception 'Impact snapshot health expiresAt is invalid' using errcode = '23514';
    end;
    if health_expires_at_value <= checked_at_value then
      raise exception 'Impact snapshot health expiry must follow its check time' using errcode = '23514';
    end if;
  end if;

  select count(*), count(distinct entry ->> 'key')
  into component_count, distinct_key_count
  from jsonb_array_elements(p_snapshot -> 'components') entry;
  if component_count <> distinct_key_count then
    raise exception 'Impact component keys must be unique' using errcode = '23514';
  end if;

  for component in select value from jsonb_array_elements(p_snapshot -> 'components')
  loop
    if jsonb_typeof(component) <> 'object' then
      raise exception 'Each impact component must be an object' using errcode = '23514';
    end if;
    if jsonb_typeof(component -> 'key') <> 'string'
      or coalesce(btrim(component ->> 'key'), '') = ''
      or jsonb_typeof(component -> 'label') <> 'string'
      or coalesce(btrim(component ->> 'label'), '') = ''
      or jsonb_typeof(component -> 'explanation') <> 'string'
      or coalesce(btrim(component ->> 'explanation'), '') = ''
    then
      raise exception 'Impact components require a key, label, and explanation' using errcode = '23514';
    end if;
    if component ->> 'kind' not in (
      'success_case_additional','expected_additional','direct_causal_attribution',
      'verified_additional','cooperative_allocation','value_adjusted',
      'baseline_redirected','platform_funded_bonus'
    ) then
      raise exception 'Impact component kind is invalid' using errcode = '23514';
    end if;
    if component ->> 'status' not in ('available','withheld') then
      raise exception 'Impact component status is invalid' using errcode = '23514';
    end if;
    if component ->> 'source' not in (
      'deterministic_terms','approved_model','reference_class','verified_evidence','platform_subsidy'
    ) then
      raise exception 'Impact component source is invalid' using errcode = '23514';
    end if;
    if component ->> 'confidence' not in ('high','moderate','low','unavailable') then
      raise exception 'Impact component confidence is invalid' using errcode = '23514';
    end if;
    if jsonb_typeof(component -> 'evidenceRefs') <> 'array'
      or jsonb_typeof(component -> 'blockers') <> 'array'
      or jsonb_typeof(component -> 'additiveToCausedTotal') <> 'boolean'
    then
      raise exception 'Impact component evidence, blockers, and additivity fields are invalid' using errcode = '23514';
    end if;

    model_value := component -> 'model';
    if model_value is not null and model_value <> 'null'::jsonb then
      if jsonb_typeof(model_value) <> 'object'
        or jsonb_typeof(model_value -> 'modelKey') <> 'string'
        or coalesce(btrim(model_value ->> 'modelKey'), '') = ''
        or jsonb_typeof(model_value -> 'modelVersion') <> 'number'
        or (model_value ->> 'modelVersion')::numeric < 1
        or (model_value ->> 'modelVersion')::numeric <> trunc((model_value ->> 'modelVersion')::numeric)
        or jsonb_typeof(model_value -> 'methodologyHash') <> 'string'
        or (model_value ->> 'methodologyHash') !~ '^sha256:[a-f0-9]{64}$'
        or jsonb_typeof(model_value -> 'approvedAt') <> 'string'
      then
        raise exception 'Impact component model reference is invalid' using errcode = '23514';
      end if;
      begin
        perform (model_value ->> 'approvedAt')::timestamptz;
      exception when invalid_datetime_format then
        raise exception 'Impact component model approvedAt is invalid' using errcode = '23514';
      end;
    end if;

    if component ->> 'status' = 'available' then
      if component ->> 'confidence' = 'unavailable' then
        raise exception 'Available impact components require a confidence label' using errcode = '23514';
      end if;
      if jsonb_array_length(component -> 'blockers') <> 0 then
        raise exception 'Available impact components cannot carry blockers' using errcode = '23514';
      end if;
      if component ->> 'source' in ('approved_model','reference_class')
        and (model_value is null or model_value = 'null'::jsonb)
      then
        raise exception 'Modeled impact components require a model reference' using errcode = '23514';
      end if;

      quantity := component -> 'quantity';
      interval_value := component -> 'interval';
      if jsonb_typeof(quantity) <> 'object' or jsonb_typeof(interval_value) <> 'object' then
        raise exception 'Available impact components require quantity and interval objects' using errcode = '23514';
      end if;
      if quantity ->> 'kind' not in ('money','value_adjusted_money','count','duration')
        or jsonb_typeof(quantity -> 'value') <> 'number'
      then
        raise exception 'Impact component quantity is invalid' using errcode = '23514';
      end if;
      point_value := (quantity ->> 'value')::numeric;
      if point_value < 0 then
        raise exception 'Impact component quantities cannot be negative' using errcode = '23514';
      end if;
      if quantity ->> 'kind' in ('money','value_adjusted_money') then
        if jsonb_typeof(quantity -> 'currency') <> 'string'
          or coalesce(btrim(quantity ->> 'currency'), '') = ''
        then
          raise exception 'Money impact quantities require a currency' using errcode = '23514';
        end if;
      else
        if jsonb_typeof(quantity -> 'unit') <> 'string'
          or coalesce(btrim(quantity ->> 'unit'), '') = ''
        then
          raise exception 'Count and duration impact quantities require a unit' using errcode = '23514';
        end if;
      end if;
      if jsonb_typeof(interval_value -> 'levelBps') <> 'number'
        or (interval_value ->> 'levelBps')::numeric <> 8000
        or jsonb_typeof(interval_value -> 'lower') <> 'number'
        or jsonb_typeof(interval_value -> 'upper') <> 'number'
      then
        raise exception 'Impact component intervals must be 80 percent numeric intervals' using errcode = '23514';
      end if;
      lower_value := (interval_value ->> 'lower')::numeric;
      upper_value := (interval_value ->> 'upper')::numeric;
      if lower_value < 0 or upper_value < 0
        or lower_value > point_value or point_value > upper_value
      then
        raise exception 'Impact point estimate must lie inside its nonnegative 80 percent interval' using errcode = '23514';
      end if;
    else
      if component -> 'quantity' is null or component -> 'quantity' <> 'null'::jsonb
        or component -> 'interval' is null or component -> 'interval' <> 'null'::jsonb
        or component ->> 'confidence' <> 'unavailable'
        or jsonb_array_length(component -> 'blockers') = 0
        or (component ->> 'additiveToCausedTotal')::boolean
      then
        raise exception 'Withheld impact components must fail closed with blockers and no quantity' using errcode = '23514';
      end if;
    end if;

    if component ->> 'kind' = 'cooperative_allocation'
      and (component ->> 'additiveToCausedTotal')::boolean
    then
      raise exception 'Cooperative allocation cannot be added to direct caused-resource totals' using errcode = '23514';
    end if;
  end loop;
end;
$$;

create or replace function public.impact_accounting_guard_estimate_snapshot_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Impact estimate snapshots are immutable and cannot be deleted' using errcode = '55000';
  end if;

  if (to_jsonb(new) - 'publication_status') is distinct from
     (to_jsonb(old) - 'publication_status')
  then
    raise exception 'Impact estimate snapshot payload and identity are immutable' using errcode = '55000';
  end if;

  if new.publication_status = old.publication_status then
    return new;
  end if;
  if old.publication_status = 'current'
    and new.publication_status in ('superseded','revoked')
  then
    return new;
  end if;
  if old.publication_status = 'superseded'
    and new.publication_status = 'revoked'
  then
    return new;
  end if;

  raise exception 'Invalid impact estimate publication transition: % -> %',
    old.publication_status, new.publication_status using errcode = '23514';
end;
$$;

create or replace function public.impact_accounting_validate_snapshot()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  model_row public.impact_model_versions%rowtype;
  payload_state_as_of timestamptz;
  payload_expires_at timestamptz;
begin
  perform public.impact_accounting_assert_snapshot_payload(new.snapshot);

  if new.snapshot ->> 'schemaVersion' <> new.schema_version
    or new.snapshot ->> 'subjectRef' <> new.subject_ref
    or new.snapshot ->> 'mechanismFamily' <> new.mechanism_family
    or new.snapshot ->> 'inputStateHash' <> new.input_state_hash
  then
    raise exception 'Impact snapshot columns must match the immutable JSON payload' using errcode = '23514';
  end if;
  if new.snapshot #>> '{health,status}' <> new.health_status then
    raise exception 'Impact snapshot health status must match the JSON payload' using errcode = '23514';
  end if;

  if jsonb_typeof(new.snapshot -> 'stateAsOf') <> 'string' then
    raise exception 'Impact snapshot stateAsOf is required' using errcode = '23514';
  end if;
  begin
    payload_state_as_of := (new.snapshot ->> 'stateAsOf')::timestamptz;
  exception when invalid_datetime_format then
    raise exception 'Impact snapshot stateAsOf is invalid' using errcode = '23514';
  end;
  if payload_state_as_of <> new.state_as_of then
    raise exception 'Impact snapshot stateAsOf must match its immutable column' using errcode = '23514';
  end if;

  if new.expires_at is null then
    if new.snapshot -> 'expiresAt' is null or new.snapshot -> 'expiresAt' <> 'null'::jsonb then
      raise exception 'Impact snapshot expiresAt must be explicit null when unbounded' using errcode = '23514';
    end if;
  else
    if jsonb_typeof(new.snapshot -> 'expiresAt') <> 'string' then
      raise exception 'Impact snapshot expiresAt is required' using errcode = '23514';
    end if;
    begin
      payload_expires_at := (new.snapshot ->> 'expiresAt')::timestamptz;
    exception when invalid_datetime_format then
      raise exception 'Impact snapshot expiresAt is invalid' using errcode = '23514';
    end;
    if payload_expires_at <> new.expires_at then
      raise exception 'Impact snapshot expiresAt must match its immutable column' using errcode = '23514';
    end if;
  end if;

  if new.state_as_of > new.generated_at then
    raise exception 'Impact snapshot state cannot be newer than generation time' using errcode = '23514';
  end if;
  if new.expires_at is not null and new.expires_at <= new.generated_at then
    raise exception 'Impact snapshot expiry must follow generation time' using errcode = '23514';
  end if;
  if new.publication_status = 'current' then
    if new.health_status <> 'passed' then
      raise exception 'Only passing impact snapshots may be current' using errcode = '23514';
    end if;
    if new.expires_at is not null and new.expires_at <= now() then
      raise exception 'Expired impact snapshots cannot be current' using errcode = '23514';
    end if;
    if jsonb_array_length(new.snapshot -> 'blockers') <> 0 then
      raise exception 'Current impact snapshots cannot carry top-level blockers' using errcode = '23514';
    end if;
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

drop trigger if exists impact_estimate_snapshots_immutable on public.impact_estimate_snapshots;
create trigger impact_estimate_snapshots_immutable
before update or delete on public.impact_estimate_snapshots
for each row execute function public.impact_accounting_guard_estimate_snapshot_mutation();

revoke update, delete on table public.impact_estimate_snapshots from service_role;
grant select, insert on table public.impact_estimate_snapshots to service_role;

revoke all on function public.impact_accounting_assert_snapshot_payload(jsonb) from public, anon, authenticated, service_role;
revoke all on function public.impact_accounting_guard_estimate_snapshot_mutation() from public, anon, authenticated, service_role;

comment on function public.impact_accounting_assert_snapshot_payload(jsonb) is
  'Validates the complete versioned impact snapshot shape, 80 percent intervals, confidence labels, fail-closed withheld components, and non-additive cooperative allocation.';
comment on function public.impact_accounting_guard_estimate_snapshot_mutation() is
  'Makes estimate identity and payload immutable; permits only forward publication transitions and rejects deletion or revival.';

commit;
