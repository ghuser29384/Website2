-- Non-AI background networking infrastructure.
-- Apply after the base schema. This adds durable delegate settings, source-connection
-- consent records, deterministic synthesis, helper strategies/runs, first-step plans,
-- field-level privacy grants, risk signals, brokerage bounties, and collectives.

create table if not exists public.personal_delegates (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  label text not null default 'Personal delegate',
  goals text[] not null default '{}',
  operating_mode text not null default 'passive' check (operating_mode in ('passive', 'active', 'paused')),
  search_scope text not null default '',
  risk_tolerance text not null default 'conservative' check (risk_tolerance in ('conservative', 'moderate', 'exploratory')),
  introduction_policy text not null default 'ask_each_time' check (introduction_policy in ('ask_each_time', 'auto_draft_only')),
  max_weekly_suggestions smallint not null default 5 check (max_weekly_suggestions between 0 and 50),
  status text not null default 'active' check (status in ('active', 'paused')),
  last_run_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.source_connections (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  provider text not null default 'manual' check (provider in ('manual', 'social', 'blog', 'email', 'calendar', 'chat_history', 'search_profile', 'other')),
  label text not null,
  url text not null default '',
  access_status text not null default 'not_connected' check (access_status in ('not_connected', 'connected', 'revoked', 'needs_review')),
  access_scope text not null default '',
  consent_notes text not null default '',
  last_imported_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.profile_syntheses (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  hopes text not null default '',
  intent text not null default '',
  capabilities text not null default '',
  constraints text not null default '',
  uncertainty text not null default '',
  confidence_score smallint not null default 0 check (confidence_score between 0 and 100),
  source_count integer not null default 0 check (source_count >= 0),
  synthesis_version text not null default 'deterministic-v1',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.helper_strategies (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  helper_kind text not null default 'cause_overlap' check (helper_kind in ('cause_overlap', 'payment_compatibility', 'geographic', 'network_expansion', 'saved_search', 'risk_filter')),
  label text not null,
  priority smallint not null default 3 check (priority between 1 and 5),
  status text not null default 'active' check (status in ('active', 'paused')),
  last_run_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.helper_runs (
  id uuid primary key default gen_random_uuid(),
  strategy_id uuid references public.helper_strategies (id) on delete set null,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  candidates_scanned integer not null default 0 check (candidates_scanned >= 0),
  suggestions_created integer not null default 0 check (suggestions_created >= 0),
  notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz
);

create table if not exists public.match_introduction_plans (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.match_suggestions (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  counterparty_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'shared', 'archived')),
  intro_message text not null default '',
  proposal_outline text not null default '',
  agenda text not null default '',
  verification_plan text not null default '',
  privacy_notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (match_id, profile_id),
  check (profile_id <> counterparty_id)
);

create table if not exists public.privacy_grants (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  counterparty_id uuid references public.profiles (id) on delete cascade,
  match_id uuid references public.match_suggestions (id) on delete cascade,
  field_key text not null,
  access_level text not null default 'broad' check (access_level in ('hidden', 'broad', 'specific', 'contact')),
  status text not null default 'draft' check (status in ('draft', 'granted', 'revoked')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (profile_id, counterparty_id, match_id, field_key)
);

create table if not exists public.risk_signals (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id) on delete cascade,
  match_id uuid references public.match_suggestions (id) on delete cascade,
  signal_type text not null,
  severity text not null default 'low' check (severity in ('low', 'medium', 'high', 'critical')),
  summary text not null default '',
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at timestamptz not null default timezone('utc', now()),
  reviewed_at timestamptz
);

create table if not exists public.brokerage_bounties (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  label text not null,
  cause_area text not null default '',
  max_amount_cents integer not null default 0 check (max_amount_cents >= 0),
  currency text not null default 'usd' check (currency ~ '^[a-z]{3}$'),
  success_condition text not null default '',
  status text not null default 'active' check (status in ('active', 'paused', 'awarded', 'cancelled')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.collectives (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  description text not null default '',
  verification_status text not null default 'unverified' check (verification_status in ('unverified', 'review_pending', 'verified')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.collective_members (
  collective_id uuid not null references public.collectives (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member', 'viewer')),
  status text not null default 'active' check (status in ('invited', 'active', 'removed')),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (collective_id, profile_id)
);

create index if not exists personal_delegates_status_idx on public.personal_delegates (status, operating_mode, last_run_at asc nulls first);
create index if not exists source_connections_profile_status_idx on public.source_connections (profile_id, access_status, updated_at desc);
create index if not exists helper_strategies_profile_status_idx on public.helper_strategies (profile_id, status, priority asc, updated_at desc);
create index if not exists helper_runs_profile_created_idx on public.helper_runs (profile_id, created_at desc);
create index if not exists helper_runs_strategy_created_idx on public.helper_runs (strategy_id, created_at desc);
create index if not exists match_introduction_plans_match_idx on public.match_introduction_plans (match_id, status, updated_at desc);
create index if not exists match_introduction_plans_profile_idx on public.match_introduction_plans (profile_id, status, updated_at desc);
create index if not exists privacy_grants_profile_status_idx on public.privacy_grants (profile_id, status, updated_at desc);
create index if not exists privacy_grants_counterparty_status_idx on public.privacy_grants (counterparty_id, status, updated_at desc);
create index if not exists risk_signals_status_idx on public.risk_signals (status, severity, created_at desc);
create index if not exists risk_signals_profile_status_idx on public.risk_signals (profile_id, status, created_at desc);
create index if not exists brokerage_bounties_profile_status_idx on public.brokerage_bounties (profile_id, status, updated_at desc);
create index if not exists brokerage_bounties_cause_idx on public.brokerage_bounties (cause_area, status, max_amount_cents desc);
create index if not exists collectives_owner_idx on public.collectives (owner_id, updated_at desc);
create index if not exists collective_members_profile_idx on public.collective_members (profile_id, status, created_at desc);

drop trigger if exists personal_delegates_set_updated_at on public.personal_delegates;
create trigger personal_delegates_set_updated_at before update on public.personal_delegates for each row execute procedure public.set_updated_at();
drop trigger if exists source_connections_set_updated_at on public.source_connections;
create trigger source_connections_set_updated_at before update on public.source_connections for each row execute procedure public.set_updated_at();
drop trigger if exists profile_syntheses_set_updated_at on public.profile_syntheses;
create trigger profile_syntheses_set_updated_at before update on public.profile_syntheses for each row execute procedure public.set_updated_at();
drop trigger if exists helper_strategies_set_updated_at on public.helper_strategies;
create trigger helper_strategies_set_updated_at before update on public.helper_strategies for each row execute procedure public.set_updated_at();
drop trigger if exists match_introduction_plans_set_updated_at on public.match_introduction_plans;
create trigger match_introduction_plans_set_updated_at before update on public.match_introduction_plans for each row execute procedure public.set_updated_at();
drop trigger if exists privacy_grants_set_updated_at on public.privacy_grants;
create trigger privacy_grants_set_updated_at before update on public.privacy_grants for each row execute procedure public.set_updated_at();
drop trigger if exists brokerage_bounties_set_updated_at on public.brokerage_bounties;
create trigger brokerage_bounties_set_updated_at before update on public.brokerage_bounties for each row execute procedure public.set_updated_at();
drop trigger if exists collectives_set_updated_at on public.collectives;
create trigger collectives_set_updated_at before update on public.collectives for each row execute procedure public.set_updated_at();

create or replace function public.viewer_can_access_collective(target_collective_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    auth.uid() is not null
    and (
      exists (
        select 1
        from public.collectives
        where id = target_collective_id
          and owner_id = auth.uid()
      )
      or exists (
        select 1
        from public.collective_members
        where collective_id = target_collective_id
          and profile_id = auth.uid()
          and status = 'active'
      )
    );
$$;

grant execute on function public.viewer_can_access_collective(uuid) to authenticated;

alter table public.personal_delegates enable row level security;
alter table public.source_connections enable row level security;
alter table public.profile_syntheses enable row level security;
alter table public.helper_strategies enable row level security;
alter table public.helper_runs enable row level security;
alter table public.match_introduction_plans enable row level security;
alter table public.privacy_grants enable row level security;
alter table public.risk_signals enable row level security;
alter table public.brokerage_bounties enable row level security;
alter table public.collectives enable row level security;
alter table public.collective_members enable row level security;

drop policy if exists "personal_delegates_select_own" on public.personal_delegates;
create policy "personal_delegates_select_own" on public.personal_delegates for select to authenticated using (profile_id = (select auth.uid()));
drop policy if exists "personal_delegates_insert_own" on public.personal_delegates;
create policy "personal_delegates_insert_own" on public.personal_delegates for insert to authenticated with check (profile_id = (select auth.uid()));
drop policy if exists "personal_delegates_update_own" on public.personal_delegates;
create policy "personal_delegates_update_own" on public.personal_delegates for update to authenticated using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

drop policy if exists "source_connections_select_own" on public.source_connections;
create policy "source_connections_select_own" on public.source_connections for select to authenticated using (profile_id = (select auth.uid()));
drop policy if exists "source_connections_insert_own" on public.source_connections;
create policy "source_connections_insert_own" on public.source_connections for insert to authenticated with check (profile_id = (select auth.uid()));
drop policy if exists "source_connections_update_own" on public.source_connections;
create policy "source_connections_update_own" on public.source_connections for update to authenticated using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));
drop policy if exists "source_connections_delete_own" on public.source_connections;
create policy "source_connections_delete_own" on public.source_connections for delete to authenticated using (profile_id = (select auth.uid()));

drop policy if exists "profile_syntheses_select_own" on public.profile_syntheses;
create policy "profile_syntheses_select_own" on public.profile_syntheses for select to authenticated using (profile_id = (select auth.uid()));
drop policy if exists "profile_syntheses_insert_own" on public.profile_syntheses;
create policy "profile_syntheses_insert_own" on public.profile_syntheses for insert to authenticated with check (profile_id = (select auth.uid()));
drop policy if exists "profile_syntheses_update_own" on public.profile_syntheses;
create policy "profile_syntheses_update_own" on public.profile_syntheses for update to authenticated using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

drop policy if exists "helper_strategies_select_own" on public.helper_strategies;
create policy "helper_strategies_select_own" on public.helper_strategies for select to authenticated using (profile_id = (select auth.uid()));
drop policy if exists "helper_strategies_insert_own" on public.helper_strategies;
create policy "helper_strategies_insert_own" on public.helper_strategies for insert to authenticated with check (profile_id = (select auth.uid()));
drop policy if exists "helper_strategies_update_own" on public.helper_strategies;
create policy "helper_strategies_update_own" on public.helper_strategies for update to authenticated using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

drop policy if exists "helper_runs_select_own" on public.helper_runs;
create policy "helper_runs_select_own" on public.helper_runs for select to authenticated using (profile_id = (select auth.uid()));
drop policy if exists "helper_runs_insert_own" on public.helper_runs;
create policy "helper_runs_insert_own" on public.helper_runs for insert to authenticated with check (profile_id = (select auth.uid()));

drop policy if exists "match_introduction_plans_select_participants" on public.match_introduction_plans;
create policy "match_introduction_plans_select_participants" on public.match_introduction_plans for select to authenticated using (profile_id = (select auth.uid()) or counterparty_id = (select auth.uid()));
drop policy if exists "match_introduction_plans_insert_participants" on public.match_introduction_plans;
create policy "match_introduction_plans_insert_participants" on public.match_introduction_plans for insert to authenticated with check (profile_id = (select auth.uid()) and public.viewer_participates_in_match(match_id));
drop policy if exists "match_introduction_plans_update_own" on public.match_introduction_plans;
create policy "match_introduction_plans_update_own" on public.match_introduction_plans for update to authenticated using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

drop policy if exists "privacy_grants_select_relevant" on public.privacy_grants;
create policy "privacy_grants_select_relevant" on public.privacy_grants for select to authenticated using (profile_id = (select auth.uid()) or (counterparty_id = (select auth.uid()) and status = 'granted'));
drop policy if exists "privacy_grants_insert_own" on public.privacy_grants;
create policy "privacy_grants_insert_own" on public.privacy_grants for insert to authenticated with check (profile_id = (select auth.uid()));
drop policy if exists "privacy_grants_update_own" on public.privacy_grants;
create policy "privacy_grants_update_own" on public.privacy_grants for update to authenticated using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

drop policy if exists "risk_signals_select_relevant" on public.risk_signals;
create policy "risk_signals_select_relevant" on public.risk_signals for select to authenticated using (profile_id = (select auth.uid()) or (match_id is not null and public.viewer_participates_in_match(match_id)));
drop policy if exists "risk_signals_insert_relevant" on public.risk_signals;
create policy "risk_signals_insert_relevant" on public.risk_signals for insert to authenticated with check (profile_id = (select auth.uid()) or (match_id is not null and public.viewer_participates_in_match(match_id)));

drop policy if exists "brokerage_bounties_select_own" on public.brokerage_bounties;
create policy "brokerage_bounties_select_own" on public.brokerage_bounties for select to authenticated using (profile_id = (select auth.uid()));
drop policy if exists "brokerage_bounties_insert_own" on public.brokerage_bounties;
create policy "brokerage_bounties_insert_own" on public.brokerage_bounties for insert to authenticated with check (profile_id = (select auth.uid()));
drop policy if exists "brokerage_bounties_update_own" on public.brokerage_bounties;
create policy "brokerage_bounties_update_own" on public.brokerage_bounties for update to authenticated using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

drop policy if exists "collectives_select_relevant" on public.collectives;
create policy "collectives_select_relevant" on public.collectives for select to authenticated using (public.viewer_can_access_collective(id));
drop policy if exists "collectives_insert_own" on public.collectives;
create policy "collectives_insert_own" on public.collectives for insert to authenticated with check (owner_id = (select auth.uid()));
drop policy if exists "collectives_update_owner" on public.collectives;
create policy "collectives_update_owner" on public.collectives for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

drop policy if exists "collective_members_select_relevant" on public.collective_members;
create policy "collective_members_select_relevant" on public.collective_members for select to authenticated using (profile_id = (select auth.uid()) or public.viewer_can_access_collective(collective_id));
drop policy if exists "collective_members_insert_owner" on public.collective_members;
create policy "collective_members_insert_owner" on public.collective_members for insert to authenticated with check (profile_id = (select auth.uid()) or public.viewer_can_access_collective(collective_id));
drop policy if exists "collective_members_update_owner" on public.collective_members;
create policy "collective_members_update_owner" on public.collective_members for update to authenticated using (profile_id = (select auth.uid()) or public.viewer_can_access_collective(collective_id)) with check (profile_id = (select auth.uid()) or public.viewer_can_access_collective(collective_id));
