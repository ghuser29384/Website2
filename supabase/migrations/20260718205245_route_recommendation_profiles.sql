create table if not exists public.route_recommendation_profiles (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  goal text not null default '' check (char_length(goal) <= 180),
  cause_priorities text[] not null default '{}'::text[]
    check (cardinality(cause_priorities) <= 16),
  money_budget_cents integer not null default 0
    check (money_budget_cents between 0 and 100000000),
  time_budget_minutes integer not null default 0
    check (time_budget_minutes between 0 and 100000),
  action_budget_count integer not null default 0
    check (action_budget_count between 0 and 1000),
  horizon text not null default 'month'
    check (horizon in ('day', 'week', 'month', 'quarter', 'year')),
  route_formats text[] not null default array['direct']::text[]
    check (
      cardinality(route_formats) between 1 and 5
      and route_formats <@ array['direct', 'threshold', 'redirect', 'personal', 'coalition']::text[]
    ),
  evidence_preference text not null default 'high'
    check (evidence_preference in ('standard', 'high', 'connected')),
  uncertainty_preference text not null default 'balanced'
    check (uncertainty_preference in ('conservative', 'balanced', 'exploratory')),
  interaction_preference text not null default 'open'
    check (interaction_preference in ('solo', 'open', 'invite')),
  privacy_preference text not null default 'private'
    check (privacy_preference in ('private', 'public-safe', 'public')),
  planned_donation_baseline boolean not null default false,
  planned_donation_cents integer not null default 0
    check (planned_donation_cents between 0 and 100000000),
  otherwise_baseline text not null default '' check (char_length(otherwise_baseline) <= 700),
  pairwise_answers jsonb not null default '{}'::jsonb
    check (jsonb_typeof(pairwise_answers) = 'object'),
  interview_answers jsonb not null default '{}'::jsonb
    check (jsonb_typeof(interview_answers) = 'object'),
  sensitive_ciphertexts jsonb not null default '{}'::jsonb
    check (jsonb_typeof(sensitive_ciphertexts) = 'object'),
  sensitive_encryption_version text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (planned_donation_baseline or planned_donation_cents = 0)
);

comment on table public.route_recommendation_profiles is
  'Private owner-only inputs for deterministic route recommendations. No inferred moral score, probability, or public profile is stored here.';

comment on column public.route_recommendation_profiles.cause_priorities is
  'Reserved for non-sensitive taxonomy identifiers. V1 stores an empty array and derives cause labels only after decrypting owner input at runtime.';

comment on column public.route_recommendation_profiles.sensitive_ciphertexts is
  'Application-encrypted goal, counterfactual baseline note, and deliberative interview text. Corresponding text columns contain placeholders only.';

drop trigger if exists route_recommendation_profiles_set_updated_at
  on public.route_recommendation_profiles;
create trigger route_recommendation_profiles_set_updated_at
  before update on public.route_recommendation_profiles
  for each row execute function public.set_updated_at();

alter table public.route_recommendation_profiles enable row level security;

revoke all on table public.route_recommendation_profiles from anon;
revoke all on table public.route_recommendation_profiles from authenticated;
grant select, insert, update, delete on table public.route_recommendation_profiles to authenticated;

drop policy if exists route_recommendation_profiles_select_own
  on public.route_recommendation_profiles;
create policy route_recommendation_profiles_select_own
  on public.route_recommendation_profiles
  for select
  to authenticated
  using ((select auth.uid()) = profile_id);

drop policy if exists route_recommendation_profiles_insert_own
  on public.route_recommendation_profiles;
create policy route_recommendation_profiles_insert_own
  on public.route_recommendation_profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = profile_id);

drop policy if exists route_recommendation_profiles_update_own
  on public.route_recommendation_profiles;
create policy route_recommendation_profiles_update_own
  on public.route_recommendation_profiles
  for update
  to authenticated
  using ((select auth.uid()) = profile_id)
  with check ((select auth.uid()) = profile_id);

drop policy if exists route_recommendation_profiles_delete_own
  on public.route_recommendation_profiles;
create policy route_recommendation_profiles_delete_own
  on public.route_recommendation_profiles
  for delete
  to authenticated
  using ((select auth.uid()) = profile_id);
