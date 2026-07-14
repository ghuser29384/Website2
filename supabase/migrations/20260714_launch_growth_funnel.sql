-- Launch-critical growth and pilot intake tables.
-- Safe to re-run: objects and policies are created idempotently.

create extension if not exists pgcrypto;

create table if not exists public.funnel_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  anonymous_id text not null default '',
  event_type text not null,
  path text not null default '/',
  referrer text not null default '',
  utm_source text not null default '',
  utm_medium text not null default '',
  utm_campaign text not null default '',
  utm_content text not null default '',
  utm_term text not null default '',
  referral_code text not null default '',
  partner_slug text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint funnel_events_event_type_length check (char_length(event_type) between 1 and 100),
  constraint funnel_events_path_length check (char_length(path) <= 1000),
  constraint funnel_events_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index if not exists funnel_events_created_at_idx
  on public.funnel_events (created_at desc);
create index if not exists funnel_events_event_type_idx
  on public.funnel_events (event_type, created_at desc);
create index if not exists funnel_events_profile_id_idx
  on public.funnel_events (profile_id, created_at desc)
  where profile_id is not null;
create index if not exists funnel_events_referral_code_idx
  on public.funnel_events (referral_code, created_at desc)
  where referral_code <> '';

create table if not exists public.cohort_attributions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
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
  first_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cohort_attributions_referral_code_idx
  on public.cohort_attributions (referral_code)
  where referral_code <> '';
create index if not exists cohort_attributions_partner_slug_idx
  on public.cohort_attributions (partner_slug)
  where partner_slug <> '';

create table if not exists public.email_nurture_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  email text not null,
  segment text not null,
  source text not null default '',
  next_step text not null default '',
  status text not null default 'subscribed',
  attribution jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint email_nurture_email_segment_unique unique (email, segment),
  constraint email_nurture_email_length check (char_length(email) between 3 and 320),
  constraint email_nurture_segment_length check (char_length(segment) between 1 and 80),
  constraint email_nurture_attribution_object check (jsonb_typeof(attribution) = 'object')
);

create index if not exists email_nurture_status_idx
  on public.email_nurture_subscriptions (status, created_at desc);
create index if not exists email_nurture_profile_id_idx
  on public.email_nurture_subscriptions (profile_id)
  where profile_id is not null;

create table if not exists public.cohort_onboarding_profiles (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  primary_goal text not null,
  participant_kind text not null,
  first_action text not null,
  cause_areas text[] not null default '{}',
  invite_target text not null default '',
  referral_source text not null default '',
  status text not null default 'started',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cohort_onboarding_goal_length check (char_length(primary_goal) between 1 and 80),
  constraint cohort_onboarding_kind_length check (char_length(participant_kind) between 1 and 80),
  constraint cohort_onboarding_first_action_length check (char_length(first_action) between 1 and 80)
);

create table if not exists public.webinar_rsvps (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  email text not null,
  display_name text not null default '',
  role text not null default '',
  community text not null default '',
  session_preference text not null default 'next_available',
  notes text not null default '',
  attribution jsonb not null default '{}'::jsonb,
  status text not null default 'requested',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint webinar_rsvps_email_length check (char_length(email) between 3 and 320),
  constraint webinar_rsvps_attribution_object check (jsonb_typeof(attribution) = 'object')
);

create index if not exists webinar_rsvps_created_at_idx
  on public.webinar_rsvps (created_at desc);
create index if not exists webinar_rsvps_email_idx
  on public.webinar_rsvps (lower(email), created_at desc);
create index if not exists webinar_rsvps_status_idx
  on public.webinar_rsvps (status, created_at desc);

-- Keep updated_at consistent with the rest of the application schema.
drop trigger if exists cohort_attributions_set_updated_at on public.cohort_attributions;
create trigger cohort_attributions_set_updated_at
before update on public.cohort_attributions
for each row execute function public.set_updated_at();

drop trigger if exists email_nurture_subscriptions_set_updated_at on public.email_nurture_subscriptions;
create trigger email_nurture_subscriptions_set_updated_at
before update on public.email_nurture_subscriptions
for each row execute function public.set_updated_at();

drop trigger if exists cohort_onboarding_profiles_set_updated_at on public.cohort_onboarding_profiles;
create trigger cohort_onboarding_profiles_set_updated_at
before update on public.cohort_onboarding_profiles
for each row execute function public.set_updated_at();

drop trigger if exists webinar_rsvps_set_updated_at on public.webinar_rsvps;
create trigger webinar_rsvps_set_updated_at
before update on public.webinar_rsvps
for each row execute function public.set_updated_at();

alter table public.funnel_events enable row level security;
alter table public.cohort_attributions enable row level security;
alter table public.email_nurture_subscriptions enable row level security;
alter table public.cohort_onboarding_profiles enable row level security;
alter table public.webinar_rsvps enable row level security;

-- Public intake may write, but never enumerate, launch leads.
drop policy if exists funnel_events_insert_public on public.funnel_events;
create policy funnel_events_insert_public
on public.funnel_events
for insert
to anon, authenticated
with check (
  (profile_id is null or profile_id = (select auth.uid()))
  and char_length(event_type) between 1 and 100
  and char_length(path) <= 1000
  and jsonb_typeof(metadata) = 'object'
);

drop policy if exists webinar_rsvps_insert_public on public.webinar_rsvps;
create policy webinar_rsvps_insert_public
on public.webinar_rsvps
for insert
to anon, authenticated
with check (
  (profile_id is null or profile_id = (select auth.uid()))
  and char_length(email) between 3 and 320
  and jsonb_typeof(attribution) = 'object'
);

drop policy if exists webinar_rsvps_select_own on public.webinar_rsvps;
create policy webinar_rsvps_select_own
on public.webinar_rsvps
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists email_nurture_insert_public on public.email_nurture_subscriptions;
create policy email_nurture_insert_public
on public.email_nurture_subscriptions
for insert
to anon, authenticated
with check (
  (profile_id is null or profile_id = (select auth.uid()))
  and char_length(email) between 3 and 320
  and char_length(segment) between 1 and 80
  and jsonb_typeof(attribution) = 'object'
);

drop policy if exists email_nurture_select_own on public.email_nurture_subscriptions;
create policy email_nurture_select_own
on public.email_nurture_subscriptions
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists cohort_attributions_select_own on public.cohort_attributions;
create policy cohort_attributions_select_own
on public.cohort_attributions
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists cohort_attributions_insert_own on public.cohort_attributions;
create policy cohort_attributions_insert_own
on public.cohort_attributions
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists cohort_attributions_update_own on public.cohort_attributions;
create policy cohort_attributions_update_own
on public.cohort_attributions
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists cohort_onboarding_profiles_select_own on public.cohort_onboarding_profiles;
create policy cohort_onboarding_profiles_select_own
on public.cohort_onboarding_profiles
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists cohort_onboarding_profiles_insert_own on public.cohort_onboarding_profiles;
create policy cohort_onboarding_profiles_insert_own
on public.cohort_onboarding_profiles
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists cohort_onboarding_profiles_update_own on public.cohort_onboarding_profiles;
create policy cohort_onboarding_profiles_update_own
on public.cohort_onboarding_profiles
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

grant insert on public.funnel_events to anon, authenticated;
grant insert on public.webinar_rsvps to anon, authenticated;
grant select on public.webinar_rsvps to authenticated;
grant insert on public.email_nurture_subscriptions to anon, authenticated;
grant select on public.email_nurture_subscriptions to authenticated;
grant select, insert, update on public.cohort_attributions to authenticated;
grant select, insert, update on public.cohort_onboarding_profiles to authenticated;

comment on table public.webinar_rsvps is
  'Private founding-pilot intake. Public roles may insert but cannot enumerate submissions.';
comment on table public.funnel_events is
  'Privacy-safe product funnel events. Public roles may insert sanitized events but cannot read the event stream.';
