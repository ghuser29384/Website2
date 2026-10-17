-- Enforce one canonical A1 recommendation-training write per natural schedule slot,
-- retain explicit provenance for every run/model/guardrail, and classify historical
-- dual-project runs without deleting operational history.

alter table public.recommendation_training_runs
  add column if not exists scheduled_slot text,
  add column if not exists source_project_id text,
  add column if not exists source_deployment_id text,
  add column if not exists execution_class text not null default 'legacy_unclassified',
  add column if not exists duplicate_of uuid,
  add column if not exists provenance_note text not null default '';

alter table public.recommendation_model_versions
  add column if not exists source_run_id uuid,
  add column if not exists source_project_id text,
  add column if not exists source_deployment_id text,
  add column if not exists execution_class text not null default 'legacy_unclassified',
  add column if not exists duplicate_of uuid,
  add column if not exists provenance_note text not null default '';

alter table public.recommendation_guardrail_snapshots
  add column if not exists training_run_id uuid,
  add column if not exists source_project_id text,
  add column if not exists source_deployment_id text,
  add column if not exists execution_class text not null default 'legacy_unclassified',
  add column if not exists duplicate_of uuid,
  add column if not exists provenance_note text not null default '';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'recommendation_training_runs_execution_class_check'
  ) then
    alter table public.recommendation_training_runs
      add constraint recommendation_training_runs_execution_class_check
      check (execution_class in ('canonical', 'noncanonical_duplicate', 'manual', 'legacy_unclassified'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'recommendation_model_versions_execution_class_check'
  ) then
    alter table public.recommendation_model_versions
      add constraint recommendation_model_versions_execution_class_check
      check (execution_class in ('canonical', 'noncanonical_duplicate', 'manual', 'legacy_unclassified'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'recommendation_guardrail_snapshots_execution_class_check'
  ) then
    alter table public.recommendation_guardrail_snapshots
      add constraint recommendation_guardrail_snapshots_execution_class_check
      check (execution_class in ('canonical', 'noncanonical_duplicate', 'manual', 'legacy_unclassified'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'recommendation_training_runs_duplicate_fk'
  ) then
    alter table public.recommendation_training_runs
      add constraint recommendation_training_runs_duplicate_fk
      foreign key (duplicate_of)
      references public.recommendation_training_runs(id)
      on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'recommendation_model_versions_source_run_fk'
  ) then
    alter table public.recommendation_model_versions
      add constraint recommendation_model_versions_source_run_fk
      foreign key (source_run_id)
      references public.recommendation_training_runs(id)
      on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'recommendation_model_versions_duplicate_fk'
  ) then
    alter table public.recommendation_model_versions
      add constraint recommendation_model_versions_duplicate_fk
      foreign key (duplicate_of)
      references public.recommendation_model_versions(id)
      on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'recommendation_guardrail_snapshots_training_run_fk'
  ) then
    alter table public.recommendation_guardrail_snapshots
      add constraint recommendation_guardrail_snapshots_training_run_fk
      foreign key (training_run_id)
      references public.recommendation_training_runs(id)
      on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'recommendation_guardrail_snapshots_duplicate_fk'
  ) then
    alter table public.recommendation_guardrail_snapshots
      add constraint recommendation_guardrail_snapshots_duplicate_fk
      foreign key (duplicate_of)
      references public.recommendation_guardrail_snapshots(id)
      on delete set null;
  end if;
end $$;

create index if not exists recommendation_training_runs_scheduled_slot_idx
  on public.recommendation_training_runs (scheduled_slot, started_at desc)
  where scheduled_slot is not null;

create unique index if not exists recommendation_training_runs_one_canonical_slot_idx
  on public.recommendation_training_runs (scheduled_slot)
  where scheduled_slot is not null
    and execution_class = 'canonical'
    and status in ('running', 'succeeded');

create unique index if not exists recommendation_model_versions_source_run_idx
  on public.recommendation_model_versions (source_run_id)
  where source_run_id is not null;

create unique index if not exists recommendation_guardrail_snapshots_training_run_idx
  on public.recommendation_guardrail_snapshots (training_run_id)
  where training_run_id is not null;

create table if not exists public.recommendation_training_slots (
  slot_key text primary key,
  scheduled_for timestamptz not null,
  status text not null check (status in ('claimed', 'succeeded', 'failed')),
  canonical_project_id text not null,
  claimed_by_project_id text not null,
  claimed_by_deployment_id text,
  run_id uuid,
  model_version_id uuid,
  attempt_count integer not null default 1 check (attempt_count >= 1),
  claimed_at timestamptz not null default now(),
  completed_at timestamptz,
  last_error text not null default '' check (char_length(last_error) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'recommendation_training_slots_run_fk'
  ) then
    alter table public.recommendation_training_slots
      add constraint recommendation_training_slots_run_fk
      foreign key (run_id)
      references public.recommendation_training_runs(id)
      on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'recommendation_training_slots_model_fk'
  ) then
    alter table public.recommendation_training_slots
      add constraint recommendation_training_slots_model_fk
      foreign key (model_version_id)
      references public.recommendation_model_versions(id)
      on delete set null;
  end if;
end $$;

create index if not exists recommendation_training_slots_status_time_idx
  on public.recommendation_training_slots (status, scheduled_for desc);

alter table public.recommendation_training_slots enable row level security;
revoke all on table public.recommendation_training_slots from anon, authenticated;
grant all on table public.recommendation_training_slots to service_role;

comment on table public.recommendation_training_slots is
  'Service-only durable idempotency ledger for naturally scheduled A1 recommendation training.';

create or replace function public.claim_recommendation_training_slot(
  p_slot_key text,
  p_scheduled_for timestamptz,
  p_project_id text,
  p_deployment_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  claimed_row public.recommendation_training_slots%rowtype;
begin
  if p_project_id <> 'prj_Em3j7Uj7RatX2R1ZYhla3XSHRde7' then
    raise exception 'Only the canonical Moral Trade Vercel project may claim an A1 training slot.';
  end if;

  insert into public.recommendation_training_slots (
    slot_key,
    scheduled_for,
    status,
    canonical_project_id,
    claimed_by_project_id,
    claimed_by_deployment_id
  ) values (
    p_slot_key,
    p_scheduled_for,
    'claimed',
    'prj_Em3j7Uj7RatX2R1ZYhla3XSHRde7',
    p_project_id,
    p_deployment_id
  )
  on conflict (slot_key) do update
    set status = 'claimed',
        claimed_by_project_id = excluded.claimed_by_project_id,
        claimed_by_deployment_id = excluded.claimed_by_deployment_id,
        attempt_count = public.recommendation_training_slots.attempt_count + 1,
        claimed_at = now(),
        completed_at = null,
        last_error = '',
        updated_at = now()
    where public.recommendation_training_slots.status = 'failed'
  returning * into claimed_row;

  if claimed_row.slot_key is not null then
    return jsonb_build_object(
      'claimed', true,
      'slotKey', claimed_row.slot_key,
      'status', claimed_row.status,
      'attemptCount', claimed_row.attempt_count,
      'existingRunId', claimed_row.run_id,
      'existingModelId', claimed_row.model_version_id
    );
  end if;

  select * into claimed_row
  from public.recommendation_training_slots
  where slot_key = p_slot_key;

  return jsonb_build_object(
    'claimed', false,
    'slotKey', claimed_row.slot_key,
    'status', claimed_row.status,
    'attemptCount', claimed_row.attempt_count,
    'existingRunId', claimed_row.run_id,
    'existingModelId', claimed_row.model_version_id
  );
end;
$$;

create or replace function public.complete_recommendation_training_slot(
  p_slot_key text,
  p_run_id uuid,
  p_model_id uuid,
  p_project_id text,
  p_deployment_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  model_trained_at timestamptz;
  guardrail_id uuid;
begin
  if p_project_id <> 'prj_Em3j7Uj7RatX2R1ZYhla3XSHRde7' then
    raise exception 'Only the canonical Moral Trade Vercel project may complete an A1 training slot.';
  end if;

  update public.recommendation_training_runs
  set scheduled_slot = p_slot_key,
      source_project_id = p_project_id,
      source_deployment_id = p_deployment_id,
      execution_class = 'canonical',
      duplicate_of = null,
      provenance_note = 'Canonical natural Vercel cron execution protected by the durable scheduled-slot claim.'
  where id = p_run_id;

  if not found then
    raise exception 'Training run % was not found while completing slot %.', p_run_id, p_slot_key;
  end if;

  update public.recommendation_model_versions
  set source_run_id = p_run_id,
      source_project_id = p_project_id,
      source_deployment_id = p_deployment_id,
      execution_class = 'canonical',
      duplicate_of = null,
      provenance_note = 'Produced by the canonical natural Vercel cron execution.'
  where id = p_model_id
  returning trained_at into model_trained_at;

  if model_trained_at is null then
    raise exception 'Model % was not found while completing slot %.', p_model_id, p_slot_key;
  end if;

  select id into guardrail_id
  from public.recommendation_guardrail_snapshots
  where measured_at between model_trained_at - interval '15 seconds'
                        and model_trained_at + interval '15 seconds'
    and training_run_id is null
  order by abs(extract(epoch from (measured_at - model_trained_at)))
  limit 1;

  if guardrail_id is not null then
    update public.recommendation_guardrail_snapshots
    set training_run_id = p_run_id,
        source_project_id = p_project_id,
        source_deployment_id = p_deployment_id,
        execution_class = 'canonical',
        duplicate_of = null,
        provenance_note = 'Produced by the canonical natural Vercel cron execution.'
    where id = guardrail_id;
  end if;

  update public.recommendation_training_slots
  set status = 'succeeded',
      run_id = p_run_id,
      model_version_id = p_model_id,
      completed_at = now(),
      last_error = '',
      updated_at = now()
  where slot_key = p_slot_key
    and status = 'claimed'
    and claimed_by_project_id = p_project_id;

  if not found then
    raise exception 'Slot % was not in a claimable completion state.', p_slot_key;
  end if;

  return jsonb_build_object(
    'slotKey', p_slot_key,
    'status', 'succeeded',
    'runId', p_run_id,
    'modelId', p_model_id,
    'guardrailId', guardrail_id
  );
end;
$$;

create or replace function public.fail_recommendation_training_slot(
  p_slot_key text,
  p_project_id text,
  p_error text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.recommendation_training_slots
  set status = 'failed',
      completed_at = now(),
      last_error = left(coalesce(p_error, 'unknown training error'), 1000),
      updated_at = now()
  where slot_key = p_slot_key
    and status = 'claimed'
    and claimed_by_project_id = p_project_id;
end;
$$;

revoke all on function public.claim_recommendation_training_slot(text, timestamptz, text, text) from public, anon, authenticated;
revoke all on function public.complete_recommendation_training_slot(text, uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.fail_recommendation_training_slot(text, text, text) from public, anon, authenticated;
grant execute on function public.claim_recommendation_training_slot(text, timestamptz, text, text) to service_role;
grant execute on function public.complete_recommendation_training_slot(text, uuid, uuid, text, text) to service_role;
grant execute on function public.fail_recommendation_training_slot(text, text, text) to service_role;

-- Preserve the paired natural runs from July 26-29 as immutable operational history.
-- The first run in each daily window came from the canonical moraltrade-site project;
-- the later run came from the duplicate website2 project. This classification is
-- inferred from the paired Vercel invocation timing observed during incident review.
with ranked as (
  select
    r.id,
    r.model_version_id,
    (r.started_at at time zone 'UTC')::date as run_day,
    row_number() over (
      partition by (r.started_at at time zone 'UTC')::date
      order by r.started_at, r.id
    ) as run_order,
    count(*) over (
      partition by (r.started_at at time zone 'UTC')::date
    ) as daily_count,
    first_value(r.id) over (
      partition by (r.started_at at time zone 'UTC')::date
      order by r.started_at, r.id
    ) as canonical_run_id
  from public.recommendation_training_runs r
  where r.started_at >= timestamptz '2026-07-26 12:25:00+00'
    and r.started_at <  timestamptz '2026-07-30 12:45:00+00'
    and (r.started_at at time zone 'UTC')::time >= time '12:25:00'
    and (r.started_at at time zone 'UTC')::time <  time '12:45:00'
    and r.objective = 'pareto_safe_additionality'
    and r.status = 'succeeded'
    and r.stage = 'complete'
), classified as (
  select *
  from ranked
  where daily_count >= 2
)
update public.recommendation_training_runs r
set scheduled_slot = 'pareto-causal-v1:' || to_char(c.run_day, 'YYYY-MM-DD') || ':12:30Z',
    source_project_id = case
      when c.run_order = 1 then 'prj_Em3j7Uj7RatX2R1ZYhla3XSHRde7'
      else 'prj_uhfNhPo00nQrcbG0dk2zLWo7UmdK'
    end,
    source_deployment_id = null,
    execution_class = case
      when c.run_order = 1 then 'canonical'
      else 'noncanonical_duplicate'
    end,
    duplicate_of = case when c.run_order = 1 then null else c.canonical_run_id end,
    provenance_note = case
      when c.run_order = 1
        then 'Historical canonical natural run inferred from paired Vercel invocation order.'
      else 'Historical noncanonical duplicate inferred from paired Vercel invocation order; retained for audit.'
    end
from classified c
where r.id = c.id;

with run_map as (
  select
    r.id as run_id,
    r.model_version_id,
    r.source_project_id,
    r.source_deployment_id,
    r.execution_class,
    r.duplicate_of,
    r.provenance_note
  from public.recommendation_training_runs r
  where r.execution_class in ('canonical', 'noncanonical_duplicate')
    and r.scheduled_slot like 'pareto-causal-v1:2026-07-2%:12:30Z'
), model_map as (
  select
    rm.*,
    canonical_run.model_version_id as canonical_model_id
  from run_map rm
  left join public.recommendation_training_runs canonical_run
    on canonical_run.id = rm.duplicate_of
)
update public.recommendation_model_versions m
set source_run_id = mm.run_id,
    source_project_id = mm.source_project_id,
    source_deployment_id = mm.source_deployment_id,
    execution_class = mm.execution_class,
    duplicate_of = case
      when mm.execution_class = 'noncanonical_duplicate' then mm.canonical_model_id
      else null
    end,
    provenance_note = mm.provenance_note
from model_map mm
where m.id = mm.model_version_id;

with run_map as (
  select
    r.id as run_id,
    r.model_version_id,
    r.source_project_id,
    r.source_deployment_id,
    r.execution_class,
    r.duplicate_of,
    r.provenance_note,
    m.trained_at
  from public.recommendation_training_runs r
  join public.recommendation_model_versions m on m.id = r.model_version_id
  where r.execution_class in ('canonical', 'noncanonical_duplicate')
    and r.scheduled_slot like 'pareto-causal-v1:2026-07-2%:12:30Z'
), matched as (
  select
    rm.*,
    g.id as guardrail_id
  from run_map rm
  join lateral (
    select gs.id
    from public.recommendation_guardrail_snapshots gs
    where gs.measured_at between rm.trained_at - interval '15 seconds'
                              and rm.trained_at + interval '15 seconds'
    order by abs(extract(epoch from (gs.measured_at - rm.trained_at)))
    limit 1
  ) g on true
), linked as (
  select
    m.*,
    canonical_match.guardrail_id as canonical_guardrail_id
  from matched m
  left join matched canonical_match
    on canonical_match.run_id = m.duplicate_of
)
update public.recommendation_guardrail_snapshots g
set training_run_id = l.run_id,
    source_project_id = l.source_project_id,
    source_deployment_id = l.source_deployment_id,
    execution_class = l.execution_class,
    duplicate_of = case
      when l.execution_class = 'noncanonical_duplicate' then l.canonical_guardrail_id
      else null
    end,
    provenance_note = l.provenance_note
from linked l
where g.id = l.guardrail_id;
