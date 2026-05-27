create table if not exists public.match_explanation_snapshots (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.match_suggestions (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  explanation_version text not null default 'background-explanation-v1',
  workflow_stage text not null check (workflow_stage in ('suggested', 'detail_requested', 'grant_pending', 'intro_review', 'intro_ready', 'introduced', 'archived', 'reported')),
  confidence_band text not null check (confidence_band in ('High', 'Moderate', 'Tentative', 'Exploratory')),
  score_bucket text not null check (score_bucket in ('0-24', '25-44', '45-59', '60-74', '75-100')),
  factor_codes text[] not null default '{}',
  scanned_surfaces text[] not null default '{}',
  redacted_surfaces text[] not null default '{}',
  provenance text not null default '',
  summary text not null default '',
  privacy_note text not null default '',
  source_run_kind text not null default 'unknown',
  source_run_id text not null default '',
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists match_explanation_snapshots_profile_created_idx
  on public.match_explanation_snapshots (profile_id, created_at desc);
create index if not exists match_explanation_snapshots_match_profile_idx
  on public.match_explanation_snapshots (match_id, profile_id, created_at desc);
create index if not exists match_explanation_snapshots_stage_idx
  on public.match_explanation_snapshots (workflow_stage, created_at desc);

create table if not exists public.background_query_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id) on delete cascade,
  scope text not null check (scope in ('manual_scan', 'profile_save_scan', 'saved_search_scan', 'delegate_scan', 'registry_search')),
  query_fingerprint text not null default '',
  cost integer not null default 1 check (cost >= 0),
  daily_limit integer not null default 0 check (daily_limit >= 0),
  used_before integer not null default 0 check (used_before >= 0),
  remaining_after integer not null default 0 check (remaining_after >= 0),
  candidate_count integer not null default 0 check (candidate_count >= 0),
  result_count integer not null default 0 check (result_count >= 0),
  was_limited boolean not null default false,
  risk_signal_id uuid references public.risk_signals (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists background_query_events_profile_scope_created_idx
  on public.background_query_events (profile_id, scope, created_at desc);
create index if not exists background_query_events_limited_idx
  on public.background_query_events (was_limited, created_at desc);
create index if not exists background_query_events_fingerprint_idx
  on public.background_query_events (query_fingerprint, created_at desc);

alter table public.match_explanation_snapshots enable row level security;
alter table public.background_query_events enable row level security;

grant select, insert on public.match_explanation_snapshots to authenticated;
grant select, insert on public.background_query_events to authenticated;
grant all on public.match_explanation_snapshots to service_role;
grant all on public.background_query_events to service_role;

drop policy if exists "match_explanation_snapshots_select_own" on public.match_explanation_snapshots;
create policy "match_explanation_snapshots_select_own"
on public.match_explanation_snapshots
for select
to authenticated
using (
  profile_id = (select auth.uid())
  and public.viewer_participates_in_match(match_id)
);

drop policy if exists "match_explanation_snapshots_insert_own" on public.match_explanation_snapshots;
create policy "match_explanation_snapshots_insert_own"
on public.match_explanation_snapshots
for insert
to authenticated
with check (
  profile_id = (select auth.uid())
  and public.viewer_participates_in_match(match_id)
);

drop policy if exists "background_query_events_select_own" on public.background_query_events;
create policy "background_query_events_select_own"
on public.background_query_events
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "background_query_events_insert_own" on public.background_query_events;
create policy "background_query_events_insert_own"
on public.background_query_events
for insert
to authenticated
with check (profile_id = (select auth.uid()));
