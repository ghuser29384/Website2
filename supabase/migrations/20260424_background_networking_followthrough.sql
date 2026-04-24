alter table public.match_introduction_plans
  add column if not exists proposal_terms text not null default '',
  add column if not exists timeline text not null default '',
  add column if not exists next_actions text not null default '',
  add column if not exists verification_plan text not null default '',
  add column if not exists privacy_notes text not null default '';

create table if not exists public.match_introduction_tasks (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.match_introduction_plans (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  step_key text not null,
  title text not null default '',
  detail text not null default '',
  note text not null default '',
  sort_order smallint not null default 1 check (sort_order between 1 and 20),
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'done', 'skipped')),
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (plan_id, step_key)
);

create table if not exists public.privacy_access_requests (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  requester_profile_id uuid not null references public.profiles (id) on delete cascade,
  match_id uuid references public.match_suggestions (id) on delete set null,
  requested_fields text[] not null default '{}',
  requested_stage text not null default 'consent' check (requested_stage in ('registry', 'consent', 'introduced')),
  purpose text not null default '',
  justification text not null default '',
  owner_note text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied', 'withdrawn')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz,
  check (owner_profile_id <> requester_profile_id)
);

create index if not exists match_introduction_tasks_profile_status_idx
  on public.match_introduction_tasks (profile_id, status, updated_at desc);
create index if not exists match_introduction_tasks_plan_sort_idx
  on public.match_introduction_tasks (plan_id, sort_order asc, updated_at desc);
create index if not exists privacy_access_requests_owner_status_idx
  on public.privacy_access_requests (owner_profile_id, status, updated_at desc);
create index if not exists privacy_access_requests_requester_status_idx
  on public.privacy_access_requests (requester_profile_id, status, updated_at desc);
create index if not exists privacy_access_requests_match_idx
  on public.privacy_access_requests (match_id, status, updated_at desc);

drop trigger if exists match_introduction_tasks_set_updated_at on public.match_introduction_tasks;
create trigger match_introduction_tasks_set_updated_at
before update on public.match_introduction_tasks
for each row execute procedure public.set_updated_at();

drop trigger if exists privacy_access_requests_set_updated_at on public.privacy_access_requests;
create trigger privacy_access_requests_set_updated_at
before update on public.privacy_access_requests
for each row execute procedure public.set_updated_at();

alter table public.match_introduction_tasks enable row level security;
alter table public.privacy_access_requests enable row level security;

drop policy if exists "match_introduction_tasks_select_own" on public.match_introduction_tasks;
create policy "match_introduction_tasks_select_own"
on public.match_introduction_tasks
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "match_introduction_tasks_update_own" on public.match_introduction_tasks;
create policy "match_introduction_tasks_update_own"
on public.match_introduction_tasks
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "privacy_access_requests_select_relevant" on public.privacy_access_requests;
create policy "privacy_access_requests_select_relevant"
on public.privacy_access_requests
for select
to authenticated
using (
  owner_profile_id = (select auth.uid())
  or requester_profile_id = (select auth.uid())
);

drop policy if exists "privacy_access_requests_insert_requester" on public.privacy_access_requests;
create policy "privacy_access_requests_insert_requester"
on public.privacy_access_requests
for insert
to authenticated
with check (
  requester_profile_id = (select auth.uid())
  and (
    match_id is null
    or public.profile_participates_in_match(match_id, (select auth.uid()))
  )
);

drop policy if exists "privacy_access_requests_update_relevant" on public.privacy_access_requests;
create policy "privacy_access_requests_update_relevant"
on public.privacy_access_requests
for update
to authenticated
using (
  owner_profile_id = (select auth.uid())
  or requester_profile_id = (select auth.uid())
)
with check (
  owner_profile_id = (select auth.uid())
  or requester_profile_id = (select auth.uid())
);
