create table if not exists public.recommendation_preferences (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  learn_from_browsing boolean not null default true,
  exploration_percent smallint not null default 12
    check (exploration_percent between 0 and 30),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

comment on table public.recommendation_preferences is
  'Private, owner-controlled settings for the adaptive moral-opportunity feed. Browsing learning is opt-out and stores only typed in-product interactions, never raw browsing URLs or page content.';

comment on column public.recommendation_preferences.exploration_percent is
  'Share of ranking pressure reserved for cause, action, and opportunity-type diversity. Bounded to 0-30 percent.';

create table if not exists public.recommendation_interactions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  opportunity_type text not null
    check (opportunity_type in ('offer', 'donation_redirect', 'donation_pool', 'cause_topic')),
  opportunity_id text not null
    check (char_length(opportunity_id) between 1 and 160),
  event_type text not null
    check (event_type in (
      'impression', 'open', 'dwell', 'cause_view', 'save', 'unsave',
      'hide', 'not_for_me', 'easy', 'hard', 'propose', 'accept', 'complete'
    )),
  benefit_causes text[] not null default '{}'::text[]
    check (cardinality(benefit_causes) <= 12),
  action_causes text[] not null default '{}'::text[]
    check (cardinality(action_causes) <= 12),
  action_key text not null default ''
    check (char_length(action_key) <= 120),
  action_label text not null default ''
    check (char_length(action_label) <= 160),
  inferred_difficulty numeric(3, 2)
    check (inferred_difficulty is null or inferred_difficulty between 1 and 5),
  dwell_ms integer not null default 0
    check (dwell_ms between 0 and 1800000),
  idempotency_key text not null
    check (char_length(idempotency_key) between 1 and 160),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  occurred_at timestamptz not null default timezone('utc'::text, now()),
  created_at timestamptz not null default timezone('utc'::text, now()),
  unique (profile_id, idempotency_key)
);

comment on table public.recommendation_interactions is
  'Private typed signals used to learn cause interest, action willingness, and action difficulty. Opportunity metadata is resolved server-side; raw URLs and arbitrary page content are not retained.';

comment on column public.recommendation_interactions.inferred_difficulty is
  'Deterministic 1-5 baseline burden estimate for the action at interaction time. Explicit easy/hard feedback is represented by event_type.';

create index if not exists recommendation_interactions_profile_time_idx
  on public.recommendation_interactions (profile_id, occurred_at desc);

create index if not exists recommendation_interactions_profile_action_time_idx
  on public.recommendation_interactions (profile_id, action_key, occurred_at desc)
  where action_key <> '';

create index if not exists recommendation_interactions_profile_opportunity_time_idx
  on public.recommendation_interactions (
    profile_id,
    opportunity_type,
    opportunity_id,
    occurred_at desc
  );

alter table public.recommendation_preferences enable row level security;
alter table public.recommendation_interactions enable row level security;

create policy recommendation_preferences_select_own
  on public.recommendation_preferences
  for select
  to authenticated
  using (profile_id = (select auth.uid()));

create policy recommendation_preferences_insert_own
  on public.recommendation_preferences
  for insert
  to authenticated
  with check (profile_id = (select auth.uid()));

create policy recommendation_preferences_update_own
  on public.recommendation_preferences
  for update
  to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

create policy recommendation_preferences_delete_own
  on public.recommendation_preferences
  for delete
  to authenticated
  using (profile_id = (select auth.uid()));

create policy recommendation_interactions_select_own
  on public.recommendation_interactions
  for select
  to authenticated
  using (profile_id = (select auth.uid()));

create policy recommendation_interactions_insert_own
  on public.recommendation_interactions
  for insert
  to authenticated
  with check (profile_id = (select auth.uid()));

create policy recommendation_interactions_delete_own
  on public.recommendation_interactions
  for delete
  to authenticated
  using (profile_id = (select auth.uid()));

drop trigger if exists recommendation_preferences_set_updated_at
  on public.recommendation_preferences;

create trigger recommendation_preferences_set_updated_at
before update on public.recommendation_preferences
for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.recommendation_preferences to authenticated;
grant select, insert, delete on public.recommendation_interactions to authenticated;
revoke all on public.recommendation_preferences from anon;
revoke all on public.recommendation_interactions from anon;
