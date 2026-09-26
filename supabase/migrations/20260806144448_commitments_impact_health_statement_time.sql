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
      and health.checked_at <= statement_timestamp()
      and (health.expires_at is null or health.expires_at > statement_timestamp())
    from public.impact_model_health_snapshots health
    where health.model_version_id = p_model_version_id
    order by health.checked_at desc, health.created_at desc, health.id desc
    limit 1
  ), false);
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
    and (estimate.expires_at is null or estimate.expires_at > statement_timestamp())
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

comment on function public.impact_model_has_current_passing_health(uuid) is
  'Returns true only when the latest model-health record is passing and unexpired at the current statement time, including inside long-running transactions.';
comment on function public.get_my_impact_accounting_snapshots() is
  'Returns only current participant snapshots that remain unexpired and backed by a currently healthy active model at statement time.';

commit;
