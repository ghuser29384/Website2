-- Richer non-AI background networking fields and collective decision workflows.

alter table public.profile_sources
  add column if not exists content_kind text not null default 'manual_summary' check (content_kind in ('manual_summary', 'pasted_excerpt', 'public_post', 'email_note', 'chat_note', 'calendar_note')),
  add column if not exists snapshot_excerpt text not null default '',
  add column if not exists captured_tags text[] not null default '{}',
  add column if not exists needs_review boolean not null default true,
  add column if not exists imported_at timestamptz;

alter table public.network_invites
  add column if not exists target_kind text not null default 'person' check (target_kind in ('person', 'collective', 'institution', 'community', 'public_call')),
  add column if not exists target_url text not null default '',
  add column if not exists desired_capability text not null default '',
  add column if not exists suggested_message text not null default '',
  add column if not exists priority smallint not null default 3 check (priority between 1 and 5);

alter table public.source_connections
  add column if not exists import_mode text not null default 'manual_review' check (import_mode in ('manual_review', 'manual_paste', 'rss_pull', 'forwarded_note')),
  add column if not exists sync_frequency text not null default 'manual' check (sync_frequency in ('manual', 'weekly', 'monthly')),
  add column if not exists last_sync_summary text not null default '',
  add column if not exists last_import_item_count integer not null default 0 check (last_import_item_count >= 0);

alter table public.profile_syntheses
  add column if not exists cause_priorities text[] not null default '{}',
  add column if not exists offer_terms text[] not null default '{}',
  add column if not exists ask_terms text[] not null default '{}',
  add column if not exists capability_tags text[] not null default '{}',
  add column if not exists constraint_flags text[] not null default '{}',
  add column if not exists uncertainty_flags text[] not null default '{}',
  add column if not exists missing_fields text[] not null default '{}',
  add column if not exists confidence_breakdown jsonb not null default '{}'::jsonb;

alter table public.helper_strategies
  add column if not exists min_score smallint not null default 55 check (min_score between 0 and 100),
  add column if not exists strategy_config jsonb not null default '{}'::jsonb;

alter table public.match_introduction_plans
  add column if not exists proposal_terms text not null default '',
  add column if not exists timeline text not null default '',
  add column if not exists next_actions text not null default '';

alter table public.privacy_grants
  add column if not exists audience_stage text not null default 'registry' check (audience_stage in ('registry', 'consent', 'introduced')),
  add column if not exists notes text not null default '',
  add column if not exists expires_at timestamptz;

alter table public.risk_signals
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.brokerage_bounties
  add column if not exists target_kind text not null default 'counterparty' check (target_kind in ('counterparty', 'group', 'institution', 'public_call')),
  add column if not exists reward_type text not null default 'introduction' check (reward_type in ('introduction', 'verified_trade', 'group_formation', 'research_lead')),
  add column if not exists preferred_regions text[] not null default '{}',
  add column if not exists target_note text not null default '';

alter table public.collectives
  add column if not exists homepage_url text not null default '',
  add column if not exists contact_policy text not null default '',
  add column if not exists decision_rule text not null default '',
  add column if not exists verification_notes text not null default '';

alter table public.collective_members
  add column if not exists delegation_scope text not null default '',
  add column if not exists can_approve_matches boolean not null default false,
  add column if not exists can_grant_privacy boolean not null default false,
  add column if not exists can_manage_bounties boolean not null default false;

create table if not exists public.collective_decisions (
  id uuid primary key default gen_random_uuid(),
  collective_id uuid not null references public.collectives (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  decision_type text not null default 'general' check (decision_type in ('match_review', 'privacy_grant', 'bounty_award', 'verification_request', 'general')),
  target_kind text not null default 'internal' check (target_kind in ('match', 'collective', 'bounty', 'privacy_grant', 'internal')),
  target_id uuid,
  target_label text not null default '',
  summary text not null default '',
  required_approvals smallint not null default 1 check (required_approvals between 1 and 25),
  status text not null default 'open' check (status in ('open', 'approved', 'rejected', 'archived')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.collective_decision_responses (
  decision_id uuid not null references public.collective_decisions (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  response text not null default 'approve' check (response in ('approve', 'reject', 'abstain')),
  note text not null default '',
  responded_at timestamptz not null default timezone('utc', now()),
  primary key (decision_id, profile_id)
);

create index if not exists profile_sources_profile_review_idx
  on public.profile_sources (profile_id, needs_review, updated_at desc);
create index if not exists network_invites_profile_priority_idx
  on public.network_invites (profile_id, status, priority asc, updated_at desc);
create index if not exists source_connections_profile_import_idx
  on public.source_connections (profile_id, import_mode, sync_frequency, updated_at desc);
create index if not exists collective_decisions_collective_status_idx
  on public.collective_decisions (collective_id, status, updated_at desc);
create index if not exists collective_decision_responses_profile_idx
  on public.collective_decision_responses (profile_id, responded_at desc);

drop trigger if exists collective_decisions_set_updated_at on public.collective_decisions;
create trigger collective_decisions_set_updated_at
before update on public.collective_decisions
for each row execute procedure public.set_updated_at();

alter table public.collective_decisions enable row level security;
alter table public.collective_decision_responses enable row level security;

drop policy if exists "collective_decisions_select_relevant" on public.collective_decisions;
create policy "collective_decisions_select_relevant"
on public.collective_decisions
for select
to authenticated
using (public.viewer_can_access_collective(collective_id));

drop policy if exists "collective_decisions_insert_relevant" on public.collective_decisions;
create policy "collective_decisions_insert_relevant"
on public.collective_decisions
for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and public.viewer_can_access_collective(collective_id)
);

drop policy if exists "collective_decisions_update_relevant" on public.collective_decisions;
create policy "collective_decisions_update_relevant"
on public.collective_decisions
for update
to authenticated
using (public.viewer_can_access_collective(collective_id))
with check (public.viewer_can_access_collective(collective_id));

drop policy if exists "collective_decision_responses_select_relevant" on public.collective_decision_responses;
create policy "collective_decision_responses_select_relevant"
on public.collective_decision_responses
for select
to authenticated
using (
  profile_id = (select auth.uid())
  or exists (
    select 1
    from public.collective_decisions
    where collective_decisions.id = collective_decision_responses.decision_id
      and public.viewer_can_access_collective(collective_decisions.collective_id)
  )
);

drop policy if exists "collective_decision_responses_insert_own" on public.collective_decision_responses;
create policy "collective_decision_responses_insert_own"
on public.collective_decision_responses
for insert
to authenticated
with check (
  profile_id = (select auth.uid())
  and exists (
    select 1
    from public.collective_decisions
    where collective_decisions.id = collective_decision_responses.decision_id
      and public.viewer_can_access_collective(collective_decisions.collective_id)
  )
);

drop policy if exists "collective_decision_responses_update_own" on public.collective_decision_responses;
create policy "collective_decision_responses_update_own"
on public.collective_decision_responses
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));
