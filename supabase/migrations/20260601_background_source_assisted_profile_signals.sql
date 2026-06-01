alter table public.background_source_summaries
  add column if not exists redaction_report jsonb not null default '{}'::jsonb;

alter table public.background_source_summaries
  add column if not exists summary_version integer not null default 1;

alter table public.background_source_summaries
  add column if not exists approved_at timestamptz;

alter table public.background_source_summaries
  drop constraint if exists background_source_summaries_summary_version_check;

alter table public.background_source_summaries
  add constraint background_source_summaries_summary_version_check
  check (summary_version > 0);

create table if not exists public.background_profile_signals (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  source text not null check (source in ('manual', 'approved_source_summary', 'interview')),
  source_connection_id uuid references public.source_connections (id) on delete set null,
  source_summary_id uuid references public.background_source_summaries (id) on delete set null,
  signal_key text not null,
  signal_value text not null,
  allowed_field_key text not null check (
    allowed_field_key in (
      'cause_priorities',
      'capability_tags',
      'offer_ask_terms',
      'verification_preferences',
      'availability_context',
      'safety_constraints'
    )
  ),
  sensitivity text not null check (sensitivity in ('broad', 'specific')),
  confidence_band text not null check (confidence_band in ('low', 'medium', 'high')),
  status text not null default 'active' check (status in ('active', 'stale', 'expired', 'revoked')),
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.background_shadow_runs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  source_connection_id uuid references public.source_connections (id) on delete set null,
  source_summary_id uuid references public.background_source_summaries (id) on delete set null,
  model_name text not null default 'deterministic-redaction-v1',
  purpose text not null check (purpose in ('signal_extraction', 'clarification_draft')),
  output_json jsonb not null,
  was_promoted boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists background_profile_signals_profile_status_idx
on public.background_profile_signals (profile_id, status, expires_at asc, updated_at desc);

create index if not exists background_profile_signals_source_summary_idx
on public.background_profile_signals (source_summary_id, profile_id)
where source_summary_id is not null;

create index if not exists background_profile_signals_source_connection_idx
on public.background_profile_signals (source_connection_id, profile_id)
where source_connection_id is not null;

create index if not exists background_shadow_runs_profile_created_idx
on public.background_shadow_runs (profile_id, created_at desc);

create index if not exists background_shadow_runs_source_connection_idx
on public.background_shadow_runs (source_connection_id, profile_id, created_at desc)
where source_connection_id is not null;

drop trigger if exists background_profile_signals_set_updated_at on public.background_profile_signals;
create trigger background_profile_signals_set_updated_at
before update on public.background_profile_signals
for each row execute function public.set_updated_at();

alter table public.background_profile_signals enable row level security;
alter table public.background_shadow_runs enable row level security;

drop policy if exists "background_profile_signals_select_own" on public.background_profile_signals;
create policy "background_profile_signals_select_own"
on public.background_profile_signals
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "background_profile_signals_insert_own" on public.background_profile_signals;
create policy "background_profile_signals_insert_own"
on public.background_profile_signals
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "background_profile_signals_update_own" on public.background_profile_signals;
create policy "background_profile_signals_update_own"
on public.background_profile_signals
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "background_profile_signals_delete_own" on public.background_profile_signals;
create policy "background_profile_signals_delete_own"
on public.background_profile_signals
for delete
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "background_shadow_runs_select_own" on public.background_shadow_runs;
create policy "background_shadow_runs_select_own"
on public.background_shadow_runs
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "background_shadow_runs_insert_own" on public.background_shadow_runs;
create policy "background_shadow_runs_insert_own"
on public.background_shadow_runs
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "background_shadow_runs_update_own" on public.background_shadow_runs;
create policy "background_shadow_runs_update_own"
on public.background_shadow_runs
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "background_shadow_runs_delete_own" on public.background_shadow_runs;
create policy "background_shadow_runs_delete_own"
on public.background_shadow_runs
for delete
to authenticated
using (profile_id = (select auth.uid()));
