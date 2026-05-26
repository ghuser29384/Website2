create table if not exists public.funnel_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id) on delete set null,
  anonymous_id text not null default '',
  event_type text not null check (
    event_type in (
      'page_view',
      'landing_cta_click',
      'signup_start',
      'signup_complete',
      'email_confirm_complete',
      'role_selected',
      'cause_selected',
      'onboarding_complete',
      'first_action_selected',
      'worked_example_view',
      'clone_example_action',
      'wish_profile_completion',
      'referral_invite_drafted',
      'invite_sent',
      'invite_accepted',
      'pair_completed',
      'intro_requested',
      'public_good_action_logged',
      'webinar_rsvp',
      'partner_page_view',
      'email_nurture_subscribed',
      'day_one_return',
      'day_seven_return'
    )
  ),
  path text not null default '',
  referrer text not null default '',
  utm_source text not null default '',
  utm_medium text not null default '',
  utm_campaign text not null default '',
  utm_content text not null default '',
  utm_term text not null default '',
  referral_code text not null default '',
  partner_slug text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.cohort_attributions (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  anonymous_id text not null default '',
  first_path text not null default '',
  last_path text not null default '',
  referrer text not null default '',
  utm_source text not null default '',
  utm_medium text not null default '',
  utm_campaign text not null default '',
  utm_content text not null default '',
  utm_term text not null default '',
  referral_code text not null default '',
  partner_slug text not null default '',
  first_seen_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.cohort_onboarding_profiles (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  primary_goal text not null default 'find_counterparty' check (
    primary_goal in ('find_counterparty', 'support_public_good', 'browse_examples')
  ),
  participant_kind text not null default 'individual' check (
    participant_kind in ('individual', 'collective', 'institution', 'organizer')
  ),
  cause_areas text[] not null default '{}',
  first_action text not null default 'clone_example' check (
    first_action in ('clone_example', 'create_broad_preview', 'log_public_good_action', 'invite_counterparty')
  ),
  invite_target text not null default '',
  referral_source text not null default '',
  status text not null default 'started' check (status in ('started', 'completed')),
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.webinar_rsvps (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id) on delete set null,
  email text not null,
  display_name text not null default '',
  role text not null default '',
  community text not null default '',
  session_preference text not null default 'next_available',
  notes text not null default '',
  attribution jsonb not null default '{}'::jsonb,
  status text not null default 'requested' check (status in ('requested', 'confirmed', 'attended', 'cancelled')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.email_nurture_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id) on delete set null,
  email text not null,
  segment text not null default 'lead' check (
    segment in ('lead', 'signed_up_not_activated', 'activated_not_invited', 'invited_no_pair', 'advocate')
  ),
  source text not null default '',
  status text not null default 'subscribed' check (status in ('subscribed', 'unsubscribed', 'suppressed')),
  next_step text not null default '',
  attribution jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (email, segment)
);

create index if not exists funnel_events_type_created_idx on public.funnel_events (event_type, created_at desc);
create index if not exists funnel_events_profile_created_idx on public.funnel_events (profile_id, created_at desc);
create index if not exists funnel_events_partner_created_idx on public.funnel_events (partner_slug, created_at desc);
create index if not exists cohort_attributions_partner_idx on public.cohort_attributions (partner_slug, updated_at desc);
create index if not exists cohort_onboarding_status_idx on public.cohort_onboarding_profiles (status, updated_at desc);
create index if not exists webinar_rsvps_status_idx on public.webinar_rsvps (status, created_at desc);
create index if not exists email_nurture_segment_idx on public.email_nurture_subscriptions (segment, updated_at desc);

drop trigger if exists cohort_attributions_set_updated_at on public.cohort_attributions;
create trigger cohort_attributions_set_updated_at
before update on public.cohort_attributions
for each row execute procedure public.set_updated_at();

drop trigger if exists cohort_onboarding_profiles_set_updated_at on public.cohort_onboarding_profiles;
create trigger cohort_onboarding_profiles_set_updated_at
before update on public.cohort_onboarding_profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists webinar_rsvps_set_updated_at on public.webinar_rsvps;
create trigger webinar_rsvps_set_updated_at
before update on public.webinar_rsvps
for each row execute procedure public.set_updated_at();

drop trigger if exists email_nurture_subscriptions_set_updated_at on public.email_nurture_subscriptions;
create trigger email_nurture_subscriptions_set_updated_at
before update on public.email_nurture_subscriptions
for each row execute procedure public.set_updated_at();

alter table public.funnel_events enable row level security;
alter table public.cohort_attributions enable row level security;
alter table public.cohort_onboarding_profiles enable row level security;
alter table public.webinar_rsvps enable row level security;
alter table public.email_nurture_subscriptions enable row level security;

grant insert on public.funnel_events to anon, authenticated;
grant select on public.funnel_events to authenticated;
grant all on public.funnel_events to service_role;
grant select, insert, update on public.cohort_attributions to authenticated;
grant all on public.cohort_attributions to service_role;
grant select, insert, update on public.cohort_onboarding_profiles to authenticated;
grant all on public.cohort_onboarding_profiles to service_role;
grant insert on public.webinar_rsvps to anon, authenticated;
grant select, update on public.webinar_rsvps to authenticated;
grant all on public.webinar_rsvps to service_role;
grant insert on public.email_nurture_subscriptions to anon, authenticated;
grant select, update on public.email_nurture_subscriptions to authenticated;
grant all on public.email_nurture_subscriptions to service_role;

drop policy if exists "funnel_events_insert_any" on public.funnel_events;
create policy "funnel_events_insert_any"
on public.funnel_events
for insert
to anon, authenticated
with check (true);

drop policy if exists "funnel_events_select_own" on public.funnel_events;
create policy "funnel_events_select_own"
on public.funnel_events
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "cohort_attributions_select_own" on public.cohort_attributions;
create policy "cohort_attributions_select_own"
on public.cohort_attributions
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "cohort_attributions_insert_own" on public.cohort_attributions;
create policy "cohort_attributions_insert_own"
on public.cohort_attributions
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "cohort_attributions_update_own" on public.cohort_attributions;
create policy "cohort_attributions_update_own"
on public.cohort_attributions
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "cohort_onboarding_select_own" on public.cohort_onboarding_profiles;
create policy "cohort_onboarding_select_own"
on public.cohort_onboarding_profiles
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "cohort_onboarding_insert_own" on public.cohort_onboarding_profiles;
create policy "cohort_onboarding_insert_own"
on public.cohort_onboarding_profiles
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "cohort_onboarding_update_own" on public.cohort_onboarding_profiles;
create policy "cohort_onboarding_update_own"
on public.cohort_onboarding_profiles
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "webinar_rsvps_insert_any" on public.webinar_rsvps;
create policy "webinar_rsvps_insert_any"
on public.webinar_rsvps
for insert
to anon, authenticated
with check (true);

drop policy if exists "webinar_rsvps_select_own" on public.webinar_rsvps;
create policy "webinar_rsvps_select_own"
on public.webinar_rsvps
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "email_nurture_insert_any" on public.email_nurture_subscriptions;
create policy "email_nurture_insert_any"
on public.email_nurture_subscriptions
for insert
to anon, authenticated
with check (true);

drop policy if exists "email_nurture_select_own" on public.email_nurture_subscriptions;
create policy "email_nurture_select_own"
on public.email_nurture_subscriptions
for select
to authenticated
using (profile_id = (select auth.uid()));
