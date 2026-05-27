create table if not exists public.background_notification_preferences (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  event_kind text not null check (
    event_kind in (
      'match_suggestions',
      'consent_decisions',
      'introduction_updates',
      'grant_activity',
      'operator_review',
      'safety_review'
    )
  ),
  channel text not null check (channel in ('in_app', 'email_digest', 'web_push')),
  enabled boolean not null default true,
  digest_cadence text not null default 'daily' check (digest_cadence in ('immediate', 'daily', 'weekly', 'none')),
  quiet_until timestamptz,
  last_digest_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (profile_id, event_kind, channel)
);

create table if not exists public.profile_data_right_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  request_type text not null check (request_type in ('export', 'correction', 'deletion', 'restriction')),
  scope text not null default 'background_networking' check (scope in ('background_networking', 'profile', 'full_account')),
  status text not null default 'open' check (status in ('open', 'in_review', 'fulfilled', 'denied', 'cancelled')),
  request_details text not null default '',
  operator_note text not null default '',
  due_at timestamptz not null default (timezone('utc', now()) + interval '30 days'),
  reviewed_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists background_notification_preferences_profile_idx
  on public.background_notification_preferences (profile_id, event_kind, channel);
create index if not exists background_notification_preferences_enabled_idx
  on public.background_notification_preferences (channel, enabled, digest_cadence, updated_at desc);
create index if not exists profile_data_right_requests_profile_status_idx
  on public.profile_data_right_requests (profile_id, status, created_at desc);
create index if not exists profile_data_right_requests_status_due_idx
  on public.profile_data_right_requests (status, due_at asc, created_at desc);

alter table public.background_notification_preferences enable row level security;
alter table public.profile_data_right_requests enable row level security;

grant select, insert, update on public.background_notification_preferences to authenticated;
grant select, insert, update on public.profile_data_right_requests to authenticated;
grant all on public.background_notification_preferences to service_role;
grant all on public.profile_data_right_requests to service_role;

drop policy if exists "background_notification_preferences_select_own"
on public.background_notification_preferences;
create policy "background_notification_preferences_select_own"
on public.background_notification_preferences
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "background_notification_preferences_insert_own"
on public.background_notification_preferences;
create policy "background_notification_preferences_insert_own"
on public.background_notification_preferences
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "background_notification_preferences_update_own"
on public.background_notification_preferences;
create policy "background_notification_preferences_update_own"
on public.background_notification_preferences
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "profile_data_right_requests_select_own"
on public.profile_data_right_requests;
create policy "profile_data_right_requests_select_own"
on public.profile_data_right_requests
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "profile_data_right_requests_insert_own"
on public.profile_data_right_requests;
create policy "profile_data_right_requests_insert_own"
on public.profile_data_right_requests
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "profile_data_right_requests_update_own_open"
on public.profile_data_right_requests;
create policy "profile_data_right_requests_update_own_open"
on public.profile_data_right_requests
for update
to authenticated
using (
  profile_id = (select auth.uid())
  and status in ('open', 'cancelled')
)
with check (
  profile_id = (select auth.uid())
  and status in ('open', 'cancelled')
);
