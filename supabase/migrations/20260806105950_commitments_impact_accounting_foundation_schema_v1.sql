begin;

create table if not exists public.impact_model_approvers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active boolean not null default true,
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users(id) on delete set null,
  note text,
  constraint impact_model_approvers_note_length check (note is null or char_length(note) <= 1000)
);

create table if not exists public.impact_model_versions (
  id uuid primary key default gen_random_uuid(),
  mechanism_family text not null,
  model_key text not null,
  version integer not null,
  lifecycle_status text not null default 'draft',
  methodology jsonb not null,
  methodology_hash text not null,
  approval_blockers text[] not null default '{}',
  material_change_from uuid references public.impact_model_versions(id) on delete restrict,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz,
  approved_at timestamptz,
  activated_at timestamptz,
  superseded_at timestamptz,
  constraint impact_model_versions_mechanism_family_check check (
    mechanism_family in ('trade','co_fund','threshold_funding','donation_upgrade','threshold_sign_on','donation_redirect')
  ),
  constraint impact_model_versions_model_key_check check (
    model_key = btrim(model_key) and char_length(model_key) between 3 and 120
  ),
  constraint impact_model_versions_version_check check (version > 0),
  constraint impact_model_versions_lifecycle_status_check check (
    lifecycle_status in ('draft','under_review','approved','active','inactive','superseded')
  ),
  constraint impact_model_versions_methodology_hash_check check (
    methodology_hash ~ '^sha256:[a-f0-9]{64}$'
  ),
  constraint impact_model_versions_methodology_object_check check (jsonb_typeof(methodology) = 'object'),
  constraint impact_model_versions_approved_timestamp_check check (
    lifecycle_status not in ('approved','active','inactive','superseded') or approved_at is not null
  ),
  constraint impact_model_versions_active_timestamp_check check (
    lifecycle_status <> 'active' or activated_at is not null
  ),
  constraint impact_model_versions_superseded_timestamp_check check (
    lifecycle_status <> 'superseded' or superseded_at is not null
  ),
  unique (model_key, version)
);

create unique index if not exists impact_model_versions_one_active_per_mechanism_idx
  on public.impact_model_versions (mechanism_family)
  where lifecycle_status = 'active';
create index if not exists impact_model_versions_review_queue_idx
  on public.impact_model_versions (lifecycle_status, mechanism_family, created_at desc);

create table if not exists public.impact_model_approval_events (
  id uuid primary key default gen_random_uuid(),
  model_version_id uuid not null references public.impact_model_versions(id) on delete restrict,
  approver_user_id uuid not null references auth.users(id) on delete restrict,
  decision text not null,
  methodology_hash text not null,
  material_methodology_change boolean not null,
  notes text,
  created_at timestamptz not null default now(),
  constraint impact_model_approval_events_decision_check check (decision in ('approve','reject')),
  constraint impact_model_approval_events_methodology_hash_check check (methodology_hash ~ '^sha256:[a-f0-9]{64}$'),
  constraint impact_model_approval_events_notes_length check (notes is null or char_length(notes) <= 5000)
);
create index if not exists impact_model_approval_events_model_idx
  on public.impact_model_approval_events (model_version_id, created_at desc);

create table if not exists public.impact_model_health_snapshots (
  id uuid primary key default gen_random_uuid(),
  model_version_id uuid not null references public.impact_model_versions(id) on delete restrict,
  health_status text not null,
  checked_at timestamptz not null,
  data_as_of timestamptz,
  expires_at timestamptz,
  metrics jsonb not null default '{}',
  blockers text[] not null default '{}',
  warnings text[] not null default '{}',
  created_at timestamptz not null default now(),
  constraint impact_model_health_snapshots_status_check check (health_status in ('passed','warning','blocked','stale')),
  constraint impact_model_health_snapshots_metrics_object_check check (jsonb_typeof(metrics) = 'object'),
  constraint impact_model_health_snapshots_expiry_check check (expires_at is null or expires_at > checked_at)
);
create index if not exists impact_model_health_snapshots_latest_idx
  on public.impact_model_health_snapshots (model_version_id, checked_at desc);

create table if not exists public.impact_reference_observations (
  id uuid primary key default gen_random_uuid(),
  model_version_id uuid not null references public.impact_model_versions(id) on delete restrict,
  mechanism_family text not null,
  observation_ref text not null,
  observed_at timestamptz not null,
  attributes jsonb not null,
  outcome jsonb not null,
  quality_status text not null default 'eligible',
  exclusion_reason text,
  created_at timestamptz not null default now(),
  constraint impact_reference_observations_mechanism_family_check check (
    mechanism_family in ('trade','co_fund','threshold_funding','donation_upgrade','threshold_sign_on','donation_redirect')
  ),
  constraint impact_reference_observations_ref_check check (
    observation_ref = btrim(observation_ref) and char_length(observation_ref) between 3 and 240
  ),
  constraint impact_reference_observations_attributes_object_check check (jsonb_typeof(attributes) = 'object'),
  constraint impact_reference_observations_outcome_object_check check (jsonb_typeof(outcome) = 'object'),
  constraint impact_reference_observations_quality_status_check check (quality_status in ('eligible','excluded','quarantined')),
  constraint impact_reference_observations_exclusion_reason_check check (quality_status = 'eligible' or exclusion_reason is not null),
  unique (model_version_id, observation_ref)
);
create index if not exists impact_reference_observations_reference_class_idx
  on public.impact_reference_observations (model_version_id, mechanism_family, quality_status, observed_at desc);

create table if not exists public.impact_estimate_snapshots (
  id uuid primary key default gen_random_uuid(),
  participant_user_id uuid not null references auth.users(id) on delete cascade,
  subject_ref text not null,
  mechanism_family text not null,
  model_version_id uuid references public.impact_model_versions(id) on delete restrict,
  methodology_hash text,
  schema_version text not null default 'moral-trade-impact-accounting-v1',
  input_state_hash text not null,
  state_as_of timestamptz not null,
  generated_at timestamptz not null default now(),
  expires_at timestamptz,
  health_status text not null,
  publication_status text not null default 'current',
  snapshot jsonb not null,
  supersedes_snapshot_id uuid references public.impact_estimate_snapshots(id) on delete restrict,
  constraint impact_estimate_snapshots_subject_ref_check check (
    subject_ref = btrim(subject_ref) and char_length(subject_ref) between 3 and 240
  ),
  constraint impact_estimate_snapshots_mechanism_family_check check (
    mechanism_family in ('trade','co_fund','threshold_funding','donation_upgrade','threshold_sign_on','donation_redirect')
  ),
  constraint impact_estimate_snapshots_methodology_hash_check check (
    methodology_hash is null or methodology_hash ~ '^sha256:[a-f0-9]{64}$'
  ),
  constraint impact_estimate_snapshots_schema_version_check check (schema_version = 'moral-trade-impact-accounting-v1'),
  constraint impact_estimate_snapshots_input_state_hash_check check (input_state_hash ~ '^sha256:[a-f0-9]{64}$'),
  constraint impact_estimate_snapshots_health_status_check check (health_status in ('passed','warning','blocked','stale')),
  constraint impact_estimate_snapshots_publication_status_check check (publication_status in ('current','superseded','revoked')),
  constraint impact_estimate_snapshots_snapshot_object_check check (jsonb_typeof(snapshot) = 'object'),
  constraint impact_estimate_snapshots_expiry_check check (expires_at is null or expires_at > state_as_of),
  constraint impact_estimate_snapshots_model_hash_pair_check check (
    (model_version_id is null and methodology_hash is null)
    or (model_version_id is not null and methodology_hash is not null)
  )
);
create unique index if not exists impact_estimate_snapshots_one_current_subject_idx
  on public.impact_estimate_snapshots (participant_user_id, subject_ref)
  where publication_status = 'current';
create index if not exists impact_estimate_snapshots_participant_current_idx
  on public.impact_estimate_snapshots (participant_user_id, publication_status, generated_at desc);
create index if not exists impact_estimate_snapshots_model_idx
  on public.impact_estimate_snapshots (model_version_id, generated_at desc)
  where model_version_id is not null;

create table if not exists public.impact_estimate_audit_events (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.impact_estimate_snapshots(id) on delete restrict,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  detail jsonb not null default '{}',
  created_at timestamptz not null default now(),
  constraint impact_estimate_audit_events_type_check check (
    event_type in ('generated','published','withheld','superseded','revoked','refresh_requested')
  ),
  constraint impact_estimate_audit_events_detail_object_check check (jsonb_typeof(detail) = 'object')
);
create index if not exists impact_estimate_audit_events_snapshot_idx
  on public.impact_estimate_audit_events (snapshot_id, created_at);

create table if not exists public.impact_refresh_queue (
  id uuid primary key default gen_random_uuid(),
  participant_user_id uuid not null references auth.users(id) on delete cascade,
  subject_ref text not null,
  mechanism_family text not null,
  reason text not null,
  status text not null default 'queued',
  requested_at timestamptz not null default now(),
  not_before timestamptz not null default now(),
  locked_at timestamptz,
  completed_at timestamptz,
  attempt_count integer not null default 0,
  last_error text,
  constraint impact_refresh_queue_subject_ref_check check (
    subject_ref = btrim(subject_ref) and char_length(subject_ref) between 3 and 240
  ),
  constraint impact_refresh_queue_mechanism_family_check check (
    mechanism_family in ('trade','co_fund','threshold_funding','donation_upgrade','threshold_sign_on','donation_redirect')
  ),
  constraint impact_refresh_queue_reason_check check (
    reason = btrim(reason) and char_length(reason) between 3 and 240
  ),
  constraint impact_refresh_queue_status_check check (status in ('queued','running','completed','failed','cancelled')),
  constraint impact_refresh_queue_attempt_count_check check (attempt_count >= 0)
);
create unique index if not exists impact_refresh_queue_one_open_subject_idx
  on public.impact_refresh_queue (participant_user_id, subject_ref)
  where status in ('queued','running');
create index if not exists impact_refresh_queue_worker_idx
  on public.impact_refresh_queue (status, not_before, requested_at)
  where status in ('queued','failed');

create or replace function public.impact_accounting_reject_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception '% is append-only', tg_table_name using errcode = '55000';
end;
$$;

create or replace function public.impact_accounting_guard_model_version_update()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  transition_allowed boolean;
begin
  if new.id <> old.id
    or new.mechanism_family <> old.mechanism_family
    or new.model_key <> old.model_key
    or new.version <> old.version
    or new.created_at <> old.created_at
    or new.created_by is distinct from old.created_by
  then
    raise exception 'Impact model identity is immutable' using errcode = '55000';
  end if;

  if old.lifecycle_status in ('approved','active','inactive','superseded')
    and (
      new.methodology is distinct from old.methodology
      or new.methodology_hash <> old.methodology_hash
      or new.approval_blockers is distinct from old.approval_blockers
      or new.material_change_from is distinct from old.material_change_from
    )
  then
    raise exception 'Approved impact methodology is immutable; create a new version' using errcode = '55000';
  end if;

  transition_allowed := case old.lifecycle_status
    when 'draft' then new.lifecycle_status in ('draft','under_review')
    when 'under_review' then new.lifecycle_status in ('under_review','draft','approved')
    when 'approved' then new.lifecycle_status in ('approved','active','inactive','superseded')
    when 'active' then new.lifecycle_status in ('active','inactive','superseded')
    when 'inactive' then new.lifecycle_status in ('inactive','active','superseded')
    when 'superseded' then new.lifecycle_status = 'superseded'
    else false
  end;

  if not transition_allowed then
    raise exception 'Invalid impact model lifecycle transition: % -> %', old.lifecycle_status, new.lifecycle_status
      using errcode = '23514';
  end if;
  new.updated_at := now();
  return new;
end;
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
    then
      raise exception 'Modeled impact snapshots require the matching active approved model' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.is_impact_model_approver(require_aal2 boolean default true)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select auth.uid() is not null
    and exists (
      select 1 from public.impact_model_approvers approver
      where approver.user_id = auth.uid() and approver.active
    )
    and (not require_aal2 or coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2');
$$;

create or replace function public.submit_impact_model_version_for_review(p_model_version_id uuid)
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
  if model_row.lifecycle_status <> 'draft' then
    raise exception 'Only draft impact models can enter review' using errcode = '23514';
  end if;
  if cardinality(model_row.approval_blockers) <> 0 then
    raise exception 'Impact methodology still has approval blockers' using errcode = '23514';
  end if;
  update public.impact_model_versions
    set lifecycle_status = 'under_review', submitted_at = now()
    where id = model_row.id returning * into model_row;
  return model_row;
end;
$$;

create or replace function public.review_impact_model_version(
  p_model_version_id uuid,
  p_decision text,
  p_notes text default null
)
returns public.impact_model_versions
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  model_row public.impact_model_versions%rowtype;
  is_material boolean;
begin
  if not public.is_impact_model_approver(true) then
    raise exception 'AAL2 impact-model approver authorization required' using errcode = '42501';
  end if;
  if p_decision not in ('approve','reject') then
    raise exception 'Decision must be approve or reject' using errcode = '22023';
  end if;
  if p_notes is not null and char_length(p_notes) > 5000 then
    raise exception 'Review notes exceed 5000 characters' using errcode = '22001';
  end if;
  select * into model_row from public.impact_model_versions where id = p_model_version_id for update;
  if not found then raise exception 'Impact model version not found' using errcode = 'P0002'; end if;
  if model_row.lifecycle_status <> 'under_review' then
    raise exception 'Impact model must be under review' using errcode = '23514';
  end if;
  if cardinality(model_row.approval_blockers) <> 0 then
    raise exception 'Impact methodology still has approval blockers' using errcode = '23514';
  end if;
  is_material := model_row.material_change_from is not null;
  insert into public.impact_model_approval_events (
    model_version_id, approver_user_id, decision, methodology_hash, material_methodology_change, notes
  ) values (
    model_row.id, auth.uid(), p_decision, model_row.methodology_hash, is_material, nullif(btrim(p_notes), '')
  );
  if p_decision = 'approve' then
    update public.impact_model_versions set lifecycle_status = 'approved', approved_at = now()
      where id = model_row.id returning * into model_row;
  else
    update public.impact_model_versions set lifecycle_status = 'draft', submitted_at = null
      where id = model_row.id returning * into model_row;
  end if;
  return model_row;
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

create or replace function public.publish_impact_estimate_snapshot(
  p_participant_user_id uuid,
  p_subject_ref text,
  p_mechanism_family text,
  p_model_version_id uuid,
  p_methodology_hash text,
  p_input_state_hash text,
  p_state_as_of timestamptz,
  p_expires_at timestamptz,
  p_snapshot jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  prior_snapshot_id uuid;
  inserted_snapshot_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Service role required to publish impact estimates' using errcode = '42501';
  end if;
  select id into prior_snapshot_id
    from public.impact_estimate_snapshots
    where participant_user_id = p_participant_user_id
      and subject_ref = p_subject_ref
      and publication_status = 'current'
    for update;
  if prior_snapshot_id is not null then
    update public.impact_estimate_snapshots set publication_status = 'superseded' where id = prior_snapshot_id;
    insert into public.impact_estimate_audit_events (snapshot_id, event_type, detail)
      values (prior_snapshot_id, 'superseded', jsonb_build_object('reason','replacement_snapshot'));
  end if;
  insert into public.impact_estimate_snapshots (
    participant_user_id, subject_ref, mechanism_family, model_version_id, methodology_hash,
    input_state_hash, state_as_of, expires_at, health_status, publication_status, snapshot, supersedes_snapshot_id
  ) values (
    p_participant_user_id, p_subject_ref, p_mechanism_family, p_model_version_id, p_methodology_hash,
    p_input_state_hash, p_state_as_of, p_expires_at, p_snapshot #>> '{health,status}', 'current', p_snapshot, prior_snapshot_id
  ) returning id into inserted_snapshot_id;
  insert into public.impact_estimate_audit_events (snapshot_id, event_type, detail)
    values (inserted_snapshot_id, 'published', jsonb_build_object('modelVersionId',p_model_version_id,'inputStateHash',p_input_state_hash));
  return inserted_snapshot_id;
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
    and (
      estimate.model_version_id is null
      or (model.lifecycle_status = 'active' and model.methodology_hash = estimate.methodology_hash)
    )
  order by estimate.generated_at desc;
$$;

create or replace function public.get_impact_model_review_queue()
returns table (
  id uuid,
  mechanism_family text,
  model_key text,
  version integer,
  lifecycle_status text,
  methodology jsonb,
  methodology_hash text,
  approval_blockers text[],
  material_change_from uuid,
  created_at timestamptz,
  submitted_at timestamptz,
  approved_at timestamptz,
  activated_at timestamptz
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select model.id, model.mechanism_family, model.model_key, model.version,
    model.lifecycle_status, model.methodology, model.methodology_hash,
    model.approval_blockers, model.material_change_from, model.created_at,
    model.submitted_at, model.approved_at, model.activated_at
  from public.impact_model_versions model
  where public.is_impact_model_approver(false)
  order by model.created_at desc;
$$;

create trigger impact_model_versions_guard_update
before update on public.impact_model_versions
for each row execute function public.impact_accounting_guard_model_version_update();
create trigger impact_model_approval_events_append_only
before update or delete on public.impact_model_approval_events
for each row execute function public.impact_accounting_reject_mutation();
create trigger impact_model_health_snapshots_append_only
before update or delete on public.impact_model_health_snapshots
for each row execute function public.impact_accounting_reject_mutation();
create trigger impact_reference_observations_append_only
before update or delete on public.impact_reference_observations
for each row execute function public.impact_accounting_reject_mutation();
create trigger impact_estimate_audit_events_append_only
before update or delete on public.impact_estimate_audit_events
for each row execute function public.impact_accounting_reject_mutation();
create trigger impact_estimate_snapshots_validate
before insert or update of participant_user_id, subject_ref, mechanism_family, model_version_id,
  methodology_hash, schema_version, input_state_hash, state_as_of, expires_at, health_status, snapshot
on public.impact_estimate_snapshots
for each row execute function public.impact_accounting_validate_snapshot();

alter table public.impact_model_approvers enable row level security;
alter table public.impact_model_versions enable row level security;
alter table public.impact_model_approval_events enable row level security;
alter table public.impact_model_health_snapshots enable row level security;
alter table public.impact_reference_observations enable row level security;
alter table public.impact_estimate_snapshots enable row level security;
alter table public.impact_estimate_audit_events enable row level security;
alter table public.impact_refresh_queue enable row level security;

create policy impact_model_approvers_select_own on public.impact_model_approvers
  for select to authenticated using (user_id = auth.uid());
create policy impact_model_versions_select_approver on public.impact_model_versions
  for select to authenticated using (public.is_impact_model_approver(false));
create policy impact_model_approval_events_select_approver on public.impact_model_approval_events
  for select to authenticated using (public.is_impact_model_approver(false));
create policy impact_model_health_snapshots_select_approver on public.impact_model_health_snapshots
  for select to authenticated using (public.is_impact_model_approver(false));
create policy impact_estimate_snapshots_select_participant on public.impact_estimate_snapshots
  for select to authenticated using (participant_user_id = auth.uid());

revoke all on table public.impact_model_approvers from anon, authenticated;
revoke all on table public.impact_model_versions from anon, authenticated;
revoke all on table public.impact_model_approval_events from anon, authenticated;
revoke all on table public.impact_model_health_snapshots from anon, authenticated;
revoke all on table public.impact_reference_observations from anon, authenticated;
revoke all on table public.impact_estimate_snapshots from anon, authenticated;
revoke all on table public.impact_estimate_audit_events from anon, authenticated;
revoke all on table public.impact_refresh_queue from anon, authenticated;

grant select on table public.impact_model_approvers to authenticated;
grant select on table public.impact_model_versions to authenticated;
grant select on table public.impact_model_approval_events to authenticated;
grant select on table public.impact_model_health_snapshots to authenticated;
grant select on table public.impact_estimate_snapshots to authenticated;

grant all on table public.impact_model_approvers to service_role;
grant all on table public.impact_model_versions to service_role;
grant all on table public.impact_model_approval_events to service_role;
grant all on table public.impact_model_health_snapshots to service_role;
grant all on table public.impact_reference_observations to service_role;
grant all on table public.impact_estimate_snapshots to service_role;
grant all on table public.impact_estimate_audit_events to service_role;
grant all on table public.impact_refresh_queue to service_role;

revoke all on function public.impact_accounting_reject_mutation() from public, anon, authenticated;
revoke all on function public.impact_accounting_guard_model_version_update() from public, anon, authenticated;
revoke all on function public.impact_accounting_validate_snapshot() from public, anon, authenticated;
revoke all on function public.is_impact_model_approver(boolean) from public, anon;
revoke all on function public.submit_impact_model_version_for_review(uuid) from public, anon;
revoke all on function public.review_impact_model_version(uuid,text,text) from public, anon;
revoke all on function public.activate_impact_model_version(uuid) from public, anon;
revoke all on function public.publish_impact_estimate_snapshot(uuid,text,text,uuid,text,text,timestamptz,timestamptz,jsonb) from public, anon, authenticated;
revoke all on function public.get_my_impact_accounting_snapshots() from public, anon;
revoke all on function public.get_impact_model_review_queue() from public, anon;

grant execute on function public.is_impact_model_approver(boolean) to authenticated, service_role;
grant execute on function public.submit_impact_model_version_for_review(uuid) to authenticated, service_role;
grant execute on function public.review_impact_model_version(uuid,text,text) to authenticated, service_role;
grant execute on function public.activate_impact_model_version(uuid) to authenticated, service_role;
grant execute on function public.publish_impact_estimate_snapshot(uuid,text,text,uuid,text,text,timestamptz,timestamptz,jsonb) to service_role;
grant execute on function public.get_my_impact_accounting_snapshots() to authenticated, service_role;
grant execute on function public.get_impact_model_review_queue() to authenticated, service_role;

comment on table public.impact_model_versions is
  'Versioned impact methodologies. No model may become active without an AAL2 approver event for the exact methodology hash.';
comment on table public.impact_estimate_snapshots is
  'Participant-scoped estimate payloads. Current rows must be state-bound, healthy, and tied to an active approved model when modeled.';
comment on function public.get_my_impact_accounting_snapshots() is
  'Returns only the current authenticated participant impact snapshots.';

commit;
