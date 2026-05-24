create table if not exists public.match_concierge_requests (
  id uuid primary key default gen_random_uuid(),
  requester_profile_id uuid not null references public.profiles (id) on delete cascade,
  target_profile_id uuid references public.profiles (id) on delete set null,
  match_id uuid references public.match_suggestions (id) on delete set null,
  route text not null default 'private_match' check (route in ('private_match', 'pledge_swap', 'donation_offset', 'mpgf', 'other')),
  cause_areas text[] not null default '{}',
  target_preview text not null default '',
  intent_summary text not null default '',
  offer_summary text not null default '',
  ask_summary text not null default '',
  constraints text not null default '',
  desired_timeline text not null default '',
  risk_notes text not null default '',
  status text not null default 'open' check (status in ('open', 'triaged', 'waiting_on_requester', 'waiting_on_counterparty', 'introduced', 'declined', 'closed')),
  operator_notes text not null default '',
  sla_due_at timestamptz not null default (timezone('utc', now()) + interval '24 hours'),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (target_profile_id is null or requester_profile_id <> target_profile_id)
);

create table if not exists public.match_concierge_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.match_concierge_requests (id) on delete cascade,
  actor_profile_id uuid references public.profiles (id) on delete set null,
  event_type text not null,
  summary text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists match_concierge_requests_status_sla_idx on public.match_concierge_requests (status, sla_due_at asc, created_at desc);
create index if not exists match_concierge_requests_requester_idx on public.match_concierge_requests (requester_profile_id, updated_at desc);
create index if not exists match_concierge_requests_target_idx on public.match_concierge_requests (target_profile_id, updated_at desc);
create index if not exists match_concierge_events_request_idx on public.match_concierge_events (request_id, created_at desc);

drop trigger if exists match_concierge_requests_set_updated_at on public.match_concierge_requests;
create trigger match_concierge_requests_set_updated_at
before update on public.match_concierge_requests
for each row execute procedure public.set_updated_at();

alter table public.match_concierge_requests enable row level security;
alter table public.match_concierge_events enable row level security;

drop policy if exists "match_concierge_requests_select_relevant" on public.match_concierge_requests;
create policy "match_concierge_requests_select_relevant"
on public.match_concierge_requests
for select
to authenticated
using (
  requester_profile_id = (select auth.uid())
  or target_profile_id = (select auth.uid())
);

drop policy if exists "match_concierge_requests_insert_requester" on public.match_concierge_requests;
create policy "match_concierge_requests_insert_requester"
on public.match_concierge_requests
for insert
to authenticated
with check (
  requester_profile_id = (select auth.uid())
);

drop policy if exists "match_concierge_requests_update_requester_open" on public.match_concierge_requests;
create policy "match_concierge_requests_update_requester_open"
on public.match_concierge_requests
for update
to authenticated
using (
  requester_profile_id = (select auth.uid())
  and status in ('open', 'waiting_on_requester')
)
with check (
  requester_profile_id = (select auth.uid())
);

drop policy if exists "match_concierge_events_select_relevant" on public.match_concierge_events;
create policy "match_concierge_events_select_relevant"
on public.match_concierge_events
for select
to authenticated
using (
  exists (
    select 1
    from public.match_concierge_requests
    where match_concierge_requests.id = match_concierge_events.request_id
      and (
        match_concierge_requests.requester_profile_id = (select auth.uid())
        or match_concierge_requests.target_profile_id = (select auth.uid())
      )
  )
);
