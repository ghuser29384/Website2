-- Bg17 Forethought-aligned background networking pilot surface.
-- Reviewed summaries, schema-bound wish dialogue, helper runs, exact-tag overlap
-- metadata, and append-only transparency receipts. Raw ingestion and autonomous
-- outreach remain disabled.

create table if not exists public.background_source_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  source_connection_id uuid not null references public.source_connections (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  state text not null default 'queued' check (state in ('queued', 'running', 'retry', 'done', 'failed', 'cancelled')),
  attempts integer not null default 0 check (attempts >= 0),
  next_run_at timestamptz not null default timezone('utc', now()),
  last_error_code text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.background_helper_runs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  trigger_kind text not null check (trigger_kind in ('saved_search', 'new_summary', 'manual_scan', 'scheduled_digest')),
  state text not null default 'queued' check (state in ('queued', 'running', 'retry', 'done', 'failed', 'cancelled')),
  attempts integer not null default 0 check (attempts >= 0),
  next_run_at timestamptz not null default timezone('utc', now()),
  query_fingerprint text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (profile_id, trigger_kind, query_fingerprint, state)
);

alter table public.background_opportunity_briefs
  add column if not exists helper_run_id uuid references public.background_helper_runs (id) on delete set null,
  add column if not exists cooloff_until timestamptz,
  add column if not exists explanation_version text not null default 'background-explanation-v1',
  add column if not exists source_scope_version text not null default 'reviewed-summary-v1';

alter table public.background_profile_signals
  drop constraint if exists background_profile_signals_source_check;

alter table public.background_profile_signals
  add constraint background_profile_signals_source_check
  check (source in ('manual', 'approved_source_summary', 'interview', 'wish_dialogue'));

create table if not exists public.background_wish_dialogue_sessions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  state text not null default 'draft' check (state in ('draft', 'proposed', 'applied', 'abandoned')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.background_wish_dialogue_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.background_wish_dialogue_sessions (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  actor text not null check (actor in ('user', 'assistant')),
  body text not null default '[encrypted private field]',
  body_ciphertext text not null,
  body_encryption_version text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.background_wish_field_proposals (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.background_wish_dialogue_sessions (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  proposal jsonb not null,
  uncertainty_flags jsonb not null default '[]'::jsonb,
  explanation jsonb not null default '[]'::jsonb,
  approved boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.background_private_overlap_tags (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  tag_namespace text not null check (tag_namespace in ('exact_capability_tag', 'exact_constraint_tag', 'exact_verification_tag')),
  blinded_token bytea not null,
  token_version text not null default 'bg17-demo-blinded-token-v1',
  expiry_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (profile_id, tag_namespace, blinded_token)
);

create table if not exists public.background_private_overlap_checks (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  counterparty_id uuid not null references public.profiles (id) on delete cascade,
  stage text not null check (stage in ('registry', 'consent', 'introduced')),
  tag_namespace text not null check (tag_namespace in ('exact_capability_tag', 'exact_constraint_tag', 'exact_verification_tag')),
  result_bucket text not null check (result_bucket in ('none', '1', '2_to_3', '4_plus')),
  receipt_id uuid,
  created_at timestamptz not null default timezone('utc', now()),
  check (requester_id <> counterparty_id)
);

create table if not exists public.transparency_receipts (
  id uuid primary key default gen_random_uuid(),
  seq bigint generated always as identity unique,
  event_type text not null,
  actor_scope text not null,
  redacted_payload jsonb not null,
  prev_hash text,
  entry_hash text not null,
  created_at timestamptz not null default timezone('utc', now())
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'background_private_overlap_checks_receipt_id_fkey'
  ) then
    alter table public.background_private_overlap_checks
      add constraint background_private_overlap_checks_receipt_id_fkey
      foreign key (receipt_id) references public.transparency_receipts (id) on delete set null;
  end if;
end
$$;

create index if not exists background_source_sync_jobs_profile_state_idx
on public.background_source_sync_jobs (profile_id, state, next_run_at asc, updated_at desc);

create index if not exists background_source_sync_jobs_connection_idx
on public.background_source_sync_jobs (source_connection_id, state, next_run_at asc);

create index if not exists background_helper_runs_profile_state_idx
on public.background_helper_runs (profile_id, state, next_run_at asc, updated_at desc);

create index if not exists background_opportunity_briefs_helper_run_idx
on public.background_opportunity_briefs (helper_run_id, profile_id)
where helper_run_id is not null;

create index if not exists background_wish_dialogue_sessions_profile_state_idx
on public.background_wish_dialogue_sessions (profile_id, state, updated_at desc);

create index if not exists background_wish_dialogue_messages_session_idx
on public.background_wish_dialogue_messages (session_id, created_at asc);

create index if not exists background_wish_field_proposals_session_idx
on public.background_wish_field_proposals (session_id, created_at desc);

create index if not exists background_private_overlap_tags_profile_namespace_idx
on public.background_private_overlap_tags (profile_id, tag_namespace, expiry_at asc);

create index if not exists background_private_overlap_checks_requester_idx
on public.background_private_overlap_checks (requester_id, created_at desc);

create index if not exists background_private_overlap_checks_counterparty_idx
on public.background_private_overlap_checks (counterparty_id, created_at desc);

create index if not exists transparency_receipts_actor_scope_idx
on public.transparency_receipts (actor_scope, created_at desc);

drop trigger if exists background_source_sync_jobs_set_updated_at on public.background_source_sync_jobs;
create trigger background_source_sync_jobs_set_updated_at
before update on public.background_source_sync_jobs
for each row execute function public.set_updated_at();

drop trigger if exists background_helper_runs_set_updated_at on public.background_helper_runs;
create trigger background_helper_runs_set_updated_at
before update on public.background_helper_runs
for each row execute function public.set_updated_at();

drop trigger if exists background_wish_dialogue_sessions_set_updated_at on public.background_wish_dialogue_sessions;
create trigger background_wish_dialogue_sessions_set_updated_at
before update on public.background_wish_dialogue_sessions
for each row execute function public.set_updated_at();

alter table public.background_source_sync_jobs enable row level security;
alter table public.background_helper_runs enable row level security;
alter table public.background_wish_dialogue_sessions enable row level security;
alter table public.background_wish_dialogue_messages enable row level security;
alter table public.background_wish_field_proposals enable row level security;
alter table public.background_private_overlap_tags enable row level security;
alter table public.background_private_overlap_checks enable row level security;
alter table public.transparency_receipts enable row level security;

grant select, insert, update on public.background_source_sync_jobs to authenticated;
grant select, insert, update on public.background_helper_runs to authenticated;
grant select, insert, update on public.background_wish_dialogue_sessions to authenticated;
grant select, insert on public.background_wish_dialogue_messages to authenticated;
grant select, insert, update on public.background_wish_field_proposals to authenticated;
grant select, insert, delete on public.background_private_overlap_tags to authenticated;
grant select, insert on public.background_private_overlap_checks to authenticated;
grant select, insert on public.transparency_receipts to authenticated;

grant all on public.background_source_sync_jobs to service_role;
grant all on public.background_helper_runs to service_role;
grant all on public.background_wish_dialogue_sessions to service_role;
grant all on public.background_wish_dialogue_messages to service_role;
grant all on public.background_wish_field_proposals to service_role;
grant all on public.background_private_overlap_tags to service_role;
grant all on public.background_private_overlap_checks to service_role;
grant all on public.transparency_receipts to service_role;

drop policy if exists "background_source_sync_jobs_select_own" on public.background_source_sync_jobs;
create policy "background_source_sync_jobs_select_own"
on public.background_source_sync_jobs
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "background_source_sync_jobs_insert_own" on public.background_source_sync_jobs;
create policy "background_source_sync_jobs_insert_own"
on public.background_source_sync_jobs
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "background_source_sync_jobs_update_own" on public.background_source_sync_jobs;
create policy "background_source_sync_jobs_update_own"
on public.background_source_sync_jobs
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "background_helper_runs_select_own" on public.background_helper_runs;
create policy "background_helper_runs_select_own"
on public.background_helper_runs
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "background_helper_runs_insert_own" on public.background_helper_runs;
create policy "background_helper_runs_insert_own"
on public.background_helper_runs
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "background_helper_runs_update_own" on public.background_helper_runs;
create policy "background_helper_runs_update_own"
on public.background_helper_runs
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "background_wish_dialogue_sessions_select_own" on public.background_wish_dialogue_sessions;
create policy "background_wish_dialogue_sessions_select_own"
on public.background_wish_dialogue_sessions
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "background_wish_dialogue_sessions_insert_own" on public.background_wish_dialogue_sessions;
create policy "background_wish_dialogue_sessions_insert_own"
on public.background_wish_dialogue_sessions
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "background_wish_dialogue_sessions_update_own" on public.background_wish_dialogue_sessions;
create policy "background_wish_dialogue_sessions_update_own"
on public.background_wish_dialogue_sessions
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "background_wish_dialogue_messages_select_own" on public.background_wish_dialogue_messages;
create policy "background_wish_dialogue_messages_select_own"
on public.background_wish_dialogue_messages
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "background_wish_dialogue_messages_insert_own" on public.background_wish_dialogue_messages;
create policy "background_wish_dialogue_messages_insert_own"
on public.background_wish_dialogue_messages
for insert
to authenticated
with check (
  profile_id = (select auth.uid())
  and exists (
    select 1
    from public.background_wish_dialogue_sessions
    where background_wish_dialogue_sessions.id = session_id
      and background_wish_dialogue_sessions.profile_id = (select auth.uid())
  )
);

drop policy if exists "background_wish_field_proposals_select_own" on public.background_wish_field_proposals;
create policy "background_wish_field_proposals_select_own"
on public.background_wish_field_proposals
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "background_wish_field_proposals_insert_own" on public.background_wish_field_proposals;
create policy "background_wish_field_proposals_insert_own"
on public.background_wish_field_proposals
for insert
to authenticated
with check (
  profile_id = (select auth.uid())
  and exists (
    select 1
    from public.background_wish_dialogue_sessions
    where background_wish_dialogue_sessions.id = session_id
      and background_wish_dialogue_sessions.profile_id = (select auth.uid())
  )
);

drop policy if exists "background_wish_field_proposals_update_own" on public.background_wish_field_proposals;
create policy "background_wish_field_proposals_update_own"
on public.background_wish_field_proposals
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "background_private_overlap_tags_select_own" on public.background_private_overlap_tags;
create policy "background_private_overlap_tags_select_own"
on public.background_private_overlap_tags
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "background_private_overlap_tags_insert_own" on public.background_private_overlap_tags;
create policy "background_private_overlap_tags_insert_own"
on public.background_private_overlap_tags
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "background_private_overlap_tags_delete_own" on public.background_private_overlap_tags;
create policy "background_private_overlap_tags_delete_own"
on public.background_private_overlap_tags
for delete
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "background_private_overlap_checks_select_relevant" on public.background_private_overlap_checks;
create policy "background_private_overlap_checks_select_relevant"
on public.background_private_overlap_checks
for select
to authenticated
using (requester_id = (select auth.uid()) or counterparty_id = (select auth.uid()));

drop policy if exists "background_private_overlap_checks_insert_requester" on public.background_private_overlap_checks;
create policy "background_private_overlap_checks_insert_requester"
on public.background_private_overlap_checks
for insert
to authenticated
with check (requester_id = (select auth.uid()));

drop policy if exists "transparency_receipts_select_own_actor_scope" on public.transparency_receipts;
create policy "transparency_receipts_select_own_actor_scope"
on public.transparency_receipts
for select
to authenticated
using (actor_scope = ('profile:' || (select auth.uid())::text));

drop policy if exists "transparency_receipts_insert_own_actor_scope" on public.transparency_receipts;
create policy "transparency_receipts_insert_own_actor_scope"
on public.transparency_receipts
for insert
to authenticated
with check (actor_scope = ('profile:' || (select auth.uid())::text));
