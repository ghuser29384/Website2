alter table public.background_opportunity_briefs
  add column if not exists shared_counts jsonb not null default '{}'::jsonb;

alter table public.background_opportunity_briefs
  add column if not exists safe_summary text not null default '';

alter table public.background_opportunity_briefs
  add column if not exists redacted_fields text[] not null default '{}';

alter table public.background_opportunity_briefs
  add column if not exists seen_at timestamptz;

alter table public.background_opportunity_briefs
  add column if not exists feedback_reason text;

alter table public.background_opportunity_briefs
  drop constraint if exists background_opportunity_briefs_status_check;

alter table public.background_opportunity_briefs
  add constraint background_opportunity_briefs_status_check
  check (status in ('open', 'opened', 'dismissed', 'interested', 'muted', 'packet_requested', 'expired'));

alter table public.background_opportunity_briefs
  drop constraint if exists background_opportunity_briefs_feedback_reason_check;

alter table public.background_opportunity_briefs
  add constraint background_opportunity_briefs_feedback_reason_check
  check (
    feedback_reason is null
    or feedback_reason in ('not_relevant', 'bad_timing', 'too_vague', 'safety_concern', 'interested')
  );

create table if not exists public.background_match_feedback (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  opportunity_brief_id uuid not null references public.background_opportunity_briefs (id) on delete cascade,
  match_id uuid references public.match_suggestions (id) on delete set null,
  outcome text not null check (outcome in ('dismissed', 'interested')),
  reason_code text not null check (reason_code in ('not_relevant', 'bad_timing', 'too_vague', 'safety_concern', 'interested')),
  constraint background_match_feedback_reason_outcome_check check (
    (outcome = 'interested' and reason_code = 'interested')
    or (outcome = 'dismissed' and reason_code <> 'interested')
  ),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (profile_id, opportunity_brief_id)
);

alter table public.background_match_feedback
  drop constraint if exists background_match_feedback_reason_outcome_check;

alter table public.background_match_feedback
  add constraint background_match_feedback_reason_outcome_check
  check (
    (outcome = 'interested' and reason_code = 'interested')
    or (outcome = 'dismissed' and reason_code <> 'interested')
  );

create index if not exists background_match_feedback_profile_idx
on public.background_match_feedback (profile_id, outcome, updated_at desc);

create index if not exists background_match_feedback_brief_idx
on public.background_match_feedback (opportunity_brief_id, profile_id);

drop trigger if exists background_match_feedback_set_updated_at on public.background_match_feedback;
create trigger background_match_feedback_set_updated_at
before update on public.background_match_feedback
for each row execute function public.set_updated_at();

alter table public.background_match_feedback enable row level security;

drop policy if exists "background_match_feedback_select_own" on public.background_match_feedback;
create policy "background_match_feedback_select_own"
on public.background_match_feedback
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "background_match_feedback_insert_own" on public.background_match_feedback;
create policy "background_match_feedback_insert_own"
on public.background_match_feedback
for insert
to authenticated
with check (
  profile_id = (select auth.uid())
  and exists (
    select 1
    from public.background_opportunity_briefs
    where background_opportunity_briefs.id = background_match_feedback.opportunity_brief_id
      and background_opportunity_briefs.profile_id = (select auth.uid())
  )
);

drop policy if exists "background_match_feedback_update_own" on public.background_match_feedback;
create policy "background_match_feedback_update_own"
on public.background_match_feedback
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

alter table public.background_notification_preferences
  add column if not exists quiet_hours_start smallint;

alter table public.background_notification_preferences
  add column if not exists quiet_hours_end smallint;

alter table public.background_notification_preferences
  add column if not exists daily_cap smallint;

alter table public.background_notification_preferences
  drop constraint if exists background_notification_preferences_quiet_hours_start_check;

alter table public.background_notification_preferences
  add constraint background_notification_preferences_quiet_hours_start_check
  check (quiet_hours_start is null or quiet_hours_start between 0 and 23);

alter table public.background_notification_preferences
  drop constraint if exists background_notification_preferences_quiet_hours_end_check;

alter table public.background_notification_preferences
  add constraint background_notification_preferences_quiet_hours_end_check
  check (quiet_hours_end is null or quiet_hours_end between 0 and 23);

alter table public.background_notification_preferences
  drop constraint if exists background_notification_preferences_daily_cap_check;

alter table public.background_notification_preferences
  add constraint background_notification_preferences_daily_cap_check
  check (daily_cap is null or daily_cap between 0 and 24);
