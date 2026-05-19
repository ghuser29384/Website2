-- Run this entire file as one query. In the Supabase SQL editor, clear any
-- text selection first; otherwise Supabase runs only the selected fragment.
begin;

create extension if not exists pgcrypto;

create table if not exists public.mpgf_cycles (
  id text primary key,
  label text not null,
  stage text not null check (stage in ('pilot', 'public_beta', 'mature')),
  mode text not null check (mode in ('non_real_money_demo', 'pledge_only', 'test_mode', 'real_money')),
  currency text not null default 'usd' check (currency = 'usd'),
  budget_cents integer not null default 0 check (budget_cents >= 0),
  protocol_parameter_version text not null,
  terms_version text not null,
  privacy_version text not null,
  status text not null default 'draft',
  proposal_opens_at timestamptz,
  ballot_opens_at timestamptz,
  ballot_closes_at timestamptz,
  summary_published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_candidate_alternatives (
  id text primary key,
  cycle_id text references public.mpgf_cycles (id) on delete cascade,
  name text not null,
  short_name text not null,
  cause_area text not null,
  recipient_name text not null,
  description text not null,
  moral_public_good_rationale text not null,
  outcome_unit text not null,
  status text not null check (status in ('approved_demo', 'carryover_only', 'draft', 'rejected')),
  operational_reliability_bps integer not null check (operational_reliability_bps between 0 and 10000),
  risk_bps integer not null check (risk_bps between 0 and 10000),
  tail_loss_bps integer not null check (tail_loss_bps between 0 and 10000),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_recurring_contribution_commitments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'usd' check (currency = 'usd'),
  cadence text not null check (cadence = 'monthly'),
  mode text not null check (mode in ('pledge_only', 'test_payment', 'real_money')),
  status text not null check (status in ('active', 'paused', 'cancelled', 'expired', 'provider_action_required', 'provider_failed')),
  start_cycle_id text references public.mpgf_cycles (id),
  next_cycle_id text references public.mpgf_cycles (id),
  next_scheduled_at timestamptz,
  provider_subscription_id text,
  created_at timestamptz not null default timezone('utc', now()),
  paused_at timestamptz,
  cancelled_at timestamptz
);

create table if not exists public.mpgf_pledges (
  id uuid primary key default gen_random_uuid(),
  cycle_id text references public.mpgf_cycles (id) on delete set null,
  profile_id uuid references public.profiles (id) on delete set null,
  user_id uuid,
  contributor_label text not null default 'Demo participant',
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'usd' check (currency = 'usd'),
  cadence text not null check (cadence in ('one_time', 'monthly')),
  status text not null default 'pledged' check (status in ('pledged', 'cancelled', 'converted_to_payment_intent', 'expired')),
  pledge_mode text not null default 'pledge_only' check (pledge_mode = 'pledge_only'),
  intended_cycle_id text references public.mpgf_cycles (id),
  budget_effective_cycle_id text references public.mpgf_cycles (id),
  recurring_commitment_id uuid references public.mpgf_recurring_contribution_commitments (id),
  converted_payment_intent_id uuid,
  cancelled_at timestamptz,
  expires_at timestamptz,
  real_money boolean not null default false,
  payment_provider_object_id text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint mpgf_pledges_no_real_money_provider check (
    real_money = false and payment_provider_object_id is null
  )
);

alter table public.mpgf_pledges
  add column if not exists user_id uuid,
  add column if not exists currency text not null default 'usd' check (currency = 'usd'),
  add column if not exists pledge_mode text default 'pledge_only' check (pledge_mode = 'pledge_only'),
  add column if not exists intended_cycle_id text references public.mpgf_cycles (id),
  add column if not exists budget_effective_cycle_id text references public.mpgf_cycles (id),
  add column if not exists recurring_commitment_id uuid references public.mpgf_recurring_contribution_commitments (id),
  add column if not exists converted_payment_intent_id uuid,
  add column if not exists cancelled_at timestamptz,
  add column if not exists expires_at timestamptz;

update public.mpgf_pledges
set
  currency = coalesce(currency, 'usd'),
  pledge_mode = coalesce(pledge_mode, 'pledge_only'),
  real_money = coalesce(real_money, false)
where currency is null or pledge_mode is null or real_money is null;

create table if not exists public.mpgf_pool_proposals (
  id uuid primary key default gen_random_uuid(),
  proposer_id uuid references public.profiles (id) on delete set null,
  title text not null,
  problem text not null,
  intervention text not null,
  moral_public_good_rationale text not null,
  proposed_recipient_name text,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'under_review', 'approved_as_candidate', 'rejected', 'withdrawn')),
  candidate_alternative_id text references public.mpgf_candidate_alternatives (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_ballots (
  id uuid primary key default gen_random_uuid(),
  cycle_id text not null references public.mpgf_cycles (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete set null,
  user_id uuid,
  voter_label text not null default 'Demo voter',
  weights_json jsonb not null default '[]'::jsonb,
  total_abs_integral_rational_json jsonb not null default '{}'::jsonb,
  total_abs_integral_decimal_cache numeric,
  locked_budget_cents_at_submission bigint,
  status text default 'draft' check (status in ('draft', 'submitted', 'invalidated', 'voided')),
  draft_version integer not null default 1,
  eligibility_snapshot_id uuid,
  candidate_set_snapshot_id uuid,
  validation_trace_id uuid,
  submitted_at timestamptz not null default timezone('utc', now()),
  real_money boolean not null default false,
  constraint mpgf_ballots_demo_only check (real_money = false)
);

alter table public.mpgf_ballots
  add column if not exists user_id uuid,
  add column if not exists total_abs_integral_decimal_cache numeric,
  add column if not exists locked_budget_cents_at_submission bigint,
  add column if not exists status text default 'draft' check (status in ('draft', 'submitted', 'invalidated', 'voided')),
  add column if not exists draft_version integer not null default 1,
  add column if not exists eligibility_snapshot_id uuid,
  add column if not exists candidate_set_snapshot_id uuid,
  add column if not exists validation_trace_id uuid;

insert into public.mpgf_cycles (
  id,
  label,
  stage,
  mode,
  currency,
  budget_cents,
  protocol_parameter_version,
  terms_version,
  privacy_version,
  status,
  proposal_opens_at,
  ballot_opens_at,
  ballot_closes_at,
  summary_published_at
)
values (
  'mpgf-cycle-demo-2026-05',
  'May 2026 MPGF Direct-Working Demo',
  'pilot',
  'non_real_money_demo',
  'usd',
  100000,
  'mpgf-pilot-v0.3-demo-2026-05',
  'mpgf-demo-terms-v1',
  'mpgf-demo-privacy-v1',
  'active',
  '2026-05-01T00:00:00.000Z',
  '2026-05-07T00:00:00.000Z',
  '2026-05-21T00:00:00.000Z',
  '2026-05-22T00:00:00.000Z'
)
on conflict (id) do update
set
  label = excluded.label,
  stage = excluded.stage,
  mode = excluded.mode,
  currency = excluded.currency,
  budget_cents = excluded.budget_cents,
  protocol_parameter_version = excluded.protocol_parameter_version,
  terms_version = excluded.terms_version,
  privacy_version = excluded.privacy_version,
  status = excluded.status,
  proposal_opens_at = excluded.proposal_opens_at,
  ballot_opens_at = excluded.ballot_opens_at,
  ballot_closes_at = excluded.ballot_closes_at,
  summary_published_at = excluded.summary_published_at;

insert into public.mpgf_candidate_alternatives (
  id, cycle_id, name, short_name, cause_area, recipient_name, description,
  moral_public_good_rationale, outcome_unit, status, operational_reliability_bps, risk_bps, tail_loss_bps
)
values (
  'global-health-basic-needs', 'mpgf-cycle-demo-2026-05', 'Global health and basic needs reserve', 'Global health',
  'Global poverty and health', 'Demo recipient: vetted global health fund',
  'A demo ordinary-pool alternative representing cost-effective poverty, health, and basic-needs interventions.',
  'Many moral views value reducing severe poverty and preventable illness, even when they disagree about other priorities.',
  'expected severe-poverty relief unit', 'approved_demo', 9400, 500, 200
)
on conflict (id) do update set
  cycle_id = excluded.cycle_id,
  name = excluded.name,
  short_name = excluded.short_name,
  cause_area = excluded.cause_area,
  recipient_name = excluded.recipient_name,
  description = excluded.description,
  moral_public_good_rationale = excluded.moral_public_good_rationale,
  outcome_unit = excluded.outcome_unit,
  status = excluded.status,
  operational_reliability_bps = excluded.operational_reliability_bps,
  risk_bps = excluded.risk_bps,
  tail_loss_bps = excluded.tail_loss_bps;

insert into public.mpgf_candidate_alternatives (
  id, cycle_id, name, short_name, cause_area, recipient_name, description,
  moral_public_good_rationale, outcome_unit, status, operational_reliability_bps, risk_bps, tail_loss_bps
)
values (
  'existential-risk-resilience', 'mpgf-cycle-demo-2026-05', 'Existential-risk resilience reserve', 'Existential risk',
  'Long-run future', 'Demo recipient: resilience research fund',
  'A demo ordinary-pool alternative for projects that reduce catastrophic or existential risk without live disbursement.',
  'Preserving the option of a flourishing future is broadly valuable across many longtermist, humanitarian, and pluralist views.',
  'risk-reduction research unit', 'approved_demo', 9000, 900, 350
)
on conflict (id) do update set
  cycle_id = excluded.cycle_id,
  name = excluded.name,
  short_name = excluded.short_name,
  cause_area = excluded.cause_area,
  recipient_name = excluded.recipient_name,
  description = excluded.description,
  moral_public_good_rationale = excluded.moral_public_good_rationale,
  outcome_unit = excluded.outcome_unit,
  status = excluded.status,
  operational_reliability_bps = excluded.operational_reliability_bps,
  risk_bps = excluded.risk_bps,
  tail_loss_bps = excluded.tail_loss_bps;

insert into public.mpgf_candidate_alternatives (
  id, cycle_id, name, short_name, cause_area, recipient_name, description,
  moral_public_good_rationale, outcome_unit, status, operational_reliability_bps, risk_bps, tail_loss_bps
)
values (
  'animal-welfare-transition', 'mpgf-cycle-demo-2026-05', 'Animal welfare transition reserve', 'Animal welfare',
  'Animal welfare', 'Demo recipient: animal welfare transition fund',
  'A demo ordinary-pool alternative for reducing intense animal suffering while preserving ordinary pilot safeguards.',
  'Many moral views assign at least some weight to avoiding severe suffering, including nonhuman suffering.',
  'welfare-improvement unit', 'approved_demo', 9100, 700, 250
)
on conflict (id) do update set
  cycle_id = excluded.cycle_id,
  name = excluded.name,
  short_name = excluded.short_name,
  cause_area = excluded.cause_area,
  recipient_name = excluded.recipient_name,
  description = excluded.description,
  moral_public_good_rationale = excluded.moral_public_good_rationale,
  outcome_unit = excluded.outcome_unit,
  status = excluded.status,
  operational_reliability_bps = excluded.operational_reliability_bps,
  risk_bps = excluded.risk_bps,
  tail_loss_bps = excluded.tail_loss_bps;

insert into public.mpgf_candidate_alternatives (
  id, cycle_id, name, short_name, cause_area, recipient_name, description,
  moral_public_good_rationale, outcome_unit, status, operational_reliability_bps, risk_bps, tail_loss_bps
)
values (
  'public-interest-knowledge', 'mpgf-cycle-demo-2026-05', 'Public-interest knowledge reserve', 'Knowledge',
  'Epistemics and institutions', 'Demo recipient: public-interest research fund',
  'A demo ordinary-pool alternative for knowledge infrastructure that helps diverse moral communities reason and coordinate.',
  'Better shared knowledge can improve coordination and allocation decisions across otherwise conflicting moral views.',
  'public-knowledge unit', 'approved_demo', 9300, 400, 150
)
on conflict (id) do update set
  cycle_id = excluded.cycle_id,
  name = excluded.name,
  short_name = excluded.short_name,
  cause_area = excluded.cause_area,
  recipient_name = excluded.recipient_name,
  description = excluded.description,
  moral_public_good_rationale = excluded.moral_public_good_rationale,
  outcome_unit = excluded.outcome_unit,
  status = excluded.status,
  operational_reliability_bps = excluded.operational_reliability_bps,
  risk_bps = excluded.risk_bps,
  tail_loss_bps = excluded.tail_loss_bps;

grant select on public.mpgf_cycles to anon, authenticated;
grant select on public.mpgf_candidate_alternatives to anon, authenticated;
grant select, insert, update on public.mpgf_pledges to authenticated;
grant select, insert, update on public.mpgf_recurring_contribution_commitments to authenticated;
grant select, insert, update on public.mpgf_pool_proposals to authenticated;
grant select, insert, update on public.mpgf_ballots to authenticated;

alter table public.mpgf_pledges enable row level security;
alter table public.mpgf_recurring_contribution_commitments enable row level security;
alter table public.mpgf_pool_proposals enable row level security;
alter table public.mpgf_ballots enable row level security;

drop policy if exists mpgf_pledges_participant_select on public.mpgf_pledges;
create policy mpgf_pledges_participant_select
  on public.mpgf_pledges
  for select
  to authenticated
  using (profile_id = auth.uid() or user_id = auth.uid());

drop policy if exists mpgf_pledges_participant_insert on public.mpgf_pledges;
create policy mpgf_pledges_participant_insert
  on public.mpgf_pledges
  for insert
  to authenticated
  with check (
    (profile_id = auth.uid() or user_id = auth.uid())
    and real_money = false
    and payment_provider_object_id is null
    and pledge_mode = 'pledge_only'
  );

drop policy if exists mpgf_pledges_participant_update on public.mpgf_pledges;
create policy mpgf_pledges_participant_update
  on public.mpgf_pledges
  for update
  to authenticated
  using (profile_id = auth.uid() or user_id = auth.uid())
  with check (
    (profile_id = auth.uid() or user_id = auth.uid())
    and real_money = false
    and payment_provider_object_id is null
    and pledge_mode = 'pledge_only'
  );

drop policy if exists mpgf_recurring_commitments_participant_select on public.mpgf_recurring_contribution_commitments;
create policy mpgf_recurring_commitments_participant_select
  on public.mpgf_recurring_contribution_commitments
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists mpgf_recurring_commitments_participant_insert on public.mpgf_recurring_contribution_commitments;
create policy mpgf_recurring_commitments_participant_insert
  on public.mpgf_recurring_contribution_commitments
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and mode = 'pledge_only'
    and provider_subscription_id is null
  );

drop policy if exists mpgf_recurring_commitments_participant_update on public.mpgf_recurring_contribution_commitments;
create policy mpgf_recurring_commitments_participant_update
  on public.mpgf_recurring_contribution_commitments
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and mode = 'pledge_only'
    and provider_subscription_id is null
  );

drop policy if exists mpgf_pool_proposals_participant_select on public.mpgf_pool_proposals;
create policy mpgf_pool_proposals_participant_select
  on public.mpgf_pool_proposals
  for select
  to authenticated
  using (proposer_id = auth.uid());

drop policy if exists mpgf_pool_proposals_participant_insert on public.mpgf_pool_proposals;
create policy mpgf_pool_proposals_participant_insert
  on public.mpgf_pool_proposals
  for insert
  to authenticated
  with check (proposer_id = auth.uid());

drop policy if exists mpgf_pool_proposals_participant_update on public.mpgf_pool_proposals;
create policy mpgf_pool_proposals_participant_update
  on public.mpgf_pool_proposals
  for update
  to authenticated
  using (proposer_id = auth.uid())
  with check (proposer_id = auth.uid());

drop policy if exists mpgf_ballots_participant_select on public.mpgf_ballots;
create policy mpgf_ballots_participant_select
  on public.mpgf_ballots
  for select
  to authenticated
  using (profile_id = auth.uid() or user_id = auth.uid());

drop policy if exists mpgf_ballots_participant_insert on public.mpgf_ballots;
create policy mpgf_ballots_participant_insert
  on public.mpgf_ballots
  for insert
  to authenticated
  with check (
    (profile_id = auth.uid() or user_id = auth.uid())
    and real_money = false
  );

drop policy if exists mpgf_ballots_participant_update on public.mpgf_ballots;
create policy mpgf_ballots_participant_update
  on public.mpgf_ballots
  for update
  to authenticated
  using (profile_id = auth.uid() or user_id = auth.uid())
  with check (
    (profile_id = auth.uid() or user_id = auth.uid())
    and real_money = false
  );

commit;
