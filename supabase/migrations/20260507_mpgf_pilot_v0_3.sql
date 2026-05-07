create extension if not exists pgcrypto;

create table if not exists public.mpgf_genesis (
  id uuid primary key default gen_random_uuid(),
  stage text not null default 'pilot' check (stage in ('pilot', 'public_beta', 'mature')),
  mode text not null default 'non_real_money_demo' check (mode in ('non_real_money_demo', 'pledge_only', 'test_mode', 'real_money')),
  protocol_parameter_version text not null,
  terms_version text not null,
  privacy_version text not null,
  real_money_enabled boolean not null default false,
  activated_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

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

create table if not exists public.mpgf_pledges (
  id uuid primary key default gen_random_uuid(),
  cycle_id text references public.mpgf_cycles (id) on delete set null,
  profile_id uuid references public.profiles (id) on delete set null,
  contributor_label text not null default 'Demo participant',
  amount_cents integer not null check (amount_cents > 0),
  cadence text not null check (cadence in ('one_time', 'monthly')),
  status text not null default 'pledged' check (status in ('pledged', 'paused', 'cancelled')),
  real_money boolean not null default false,
  payment_provider_object_id text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint mpgf_pledges_no_real_money_provider check (
    real_money = false and payment_provider_object_id is null
  )
);

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
  voter_label text not null default 'Demo voter',
  weights_json jsonb not null default '[]'::jsonb,
  total_abs_integral_rational_json jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default timezone('utc', now()),
  real_money boolean not null default false,
  constraint mpgf_ballots_demo_only check (real_money = false)
);

create table if not exists public.mpgf_allocation_plans (
  id uuid primary key default gen_random_uuid(),
  cycle_id text not null references public.mpgf_cycles (id) on delete cascade,
  algorithm text not null,
  budget_cents integer not null check (budget_cents >= 0),
  allocated_cents integer not null check (allocated_cents >= 0),
  carryover_cents integer not null check (carryover_cents >= 0),
  certificate_json jsonb not null default '{}'::jsonb,
  lines_json jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'certified', 'superseded', 'voided')),
  created_at timestamptz not null default timezone('utc', now()),
  constraint mpgf_allocation_balances check (budget_cents = allocated_cents + carryover_cents)
);

create table if not exists public.mpgf_ledger_transactions (
  id uuid primary key default gen_random_uuid(),
  template_id text not null,
  description text not null,
  real_money boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  constraint mpgf_ledger_transactions_demo_only check (real_money = false)
);

create table if not exists public.mpgf_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.mpgf_ledger_transactions (id) on delete cascade,
  account text not null,
  direction text not null check (direction in ('debit', 'credit')),
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'usd' check (currency = 'usd')
);

create table if not exists public.mpgf_public_summaries (
  id uuid primary key default gen_random_uuid(),
  cycle_id text not null references public.mpgf_cycles (id) on delete cascade,
  summary_json jsonb not null,
  state text not null default 'draft' check (state in ('draft', 'generated', 'published', 'superseded')),
  released_internal_cents integer not null default 0 check (released_internal_cents >= 0),
  payout_authorized_cents integer not null default 0 check (payout_authorized_cents >= 0),
  externally_paid_cents integer not null default 0 check (externally_paid_cents >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  constraint mpgf_public_summaries_demo_no_disbursement check (
    released_internal_cents = 0 and payout_authorized_cents = 0 and externally_paid_cents = 0
  )
);

create table if not exists public.mpgf_completion_profiles (
  profile text primary key check (profile in ('demo_complete', 'exact_pilot_complete', 'real_money_complete')),
  status text not null default 'blocked' check (status in ('not_started', 'blocked', 'passed', 'revoked')),
  evidence_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

insert into public.mpgf_completion_profiles (profile, status)
values
  ('demo_complete', 'blocked'),
  ('exact_pilot_complete', 'blocked'),
  ('real_money_complete', 'blocked')
on conflict (profile) do nothing;
