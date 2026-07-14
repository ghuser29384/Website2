begin;

create extension if not exists pgcrypto;

alter table public.mpgf_public_goods_rounds
  add column if not exists mechanism_version text not null default 'verified_assurance_matching_pilot' check (
    mechanism_version in ('verified_assurance_matching_pilot', 'crecm_v1_125')
  ),
  add column if not exists success_reward_policy_version text not null default 'success_reward_v1',
  add column if not exists success_reward_budget_cents bigint not null default 0 check (success_reward_budget_cents >= 0),
  add column if not exists success_reward_rate_bps integer not null default 0 check (
    success_reward_rate_bps between 0 and 10000
  ),
  add column if not exists success_reward_max_rate_bps integer not null default 0 check (
    success_reward_max_rate_bps between 0 and 10000
  ),
  add column if not exists success_reward_dominance_mode text not null default 'off' check (
    success_reward_dominance_mode in ('off', 'sponsor_backed')
  ),
  add column if not exists sealed_pledge_mode text not null default 'blind_until_close' check (
    sealed_pledge_mode in ('blind_until_close', 'delayed_rounded_public', 'public_exact')
  ),
  add column if not exists impact_certificate_policy_hash text not null default 'sha256:pending-impact-certificate-policy';

alter table public.mpgf_public_goods_rounds
  add constraint mpgf_public_goods_rounds_success_reward_policy_version_trim
    check (success_reward_policy_version = btrim(success_reward_policy_version) and success_reward_policy_version <> ''),
  add constraint mpgf_public_goods_rounds_success_reward_rate_order
    check (success_reward_rate_bps <= success_reward_max_rate_bps or success_reward_max_rate_bps = 0),
  add constraint mpgf_public_goods_rounds_impact_certificate_policy_hash
    check (
      impact_certificate_policy_hash ~ '^sha256:[0-9a-f]{64}$'
      or impact_certificate_policy_hash = 'sha256:pending-impact-certificate-policy'
    );

alter table public.mpgf_public_goods_pledges
  add column if not exists sealed_pledge_mode text not null default 'blind_until_close' check (
    sealed_pledge_mode in ('blind_until_close', 'delayed_rounded_public', 'public_exact')
  ),
  add column if not exists exact_progress_public_before_close boolean not null default false;

alter table public.mpgf_public_goods_pledges
  add constraint mpgf_public_goods_pledges_sealed_progress_default
    check (sealed_pledge_mode = 'public_exact' or exact_progress_public_before_close = false);

alter table public.mpgf_public_goods_sponsor_commitments
  add column if not exists sponsor_pool_type text not null default 'base_match' check (
    sponsor_pool_type in ('base_match', 'bonus_match', 'failure_bonus', 'fee_support', 'success_reward')
  ),
  add column if not exists rulebook_hash text not null default 'sha256:pending-rulebook',
  add column if not exists source_hash text not null default 'sha256:pending-source';

alter table public.mpgf_public_goods_sponsor_commitments
  add constraint mpgf_public_goods_sponsor_commitments_rulebook_hash
    check (rulebook_hash ~ '^sha256:[0-9a-f]{64}$' or rulebook_hash = 'sha256:pending-rulebook'),
  add constraint mpgf_public_goods_sponsor_commitments_source_hash
    check (source_hash ~ '^sha256:[0-9a-f]{64}$' or source_hash = 'sha256:pending-source');

create index if not exists mpgf_public_goods_sponsor_commitments_pool_type_idx
  on public.mpgf_public_goods_sponsor_commitments (round_id, sponsor_pool_type, status);

create table if not exists public.mpgf_public_goods_success_reward_claims (
  id uuid primary key default gen_random_uuid(),
  round_id text not null references public.mpgf_public_goods_rounds (id) on delete cascade,
  campaign_id text not null references public.mpgf_public_goods_campaigns (id) on delete cascade,
  participant_ref_hash text not null check (participant_ref_hash ~ '^sha256:[0-9a-f]{64}$'),
  common_ground_budget_id text not null,
  conditional_trade_intent_id text not null,
  contribution_row_hash text not null check (contribution_row_hash ~ '^sha256:[0-9a-f]{64}$'),
  eligibility_input_hash text not null check (eligibility_input_hash ~ '^sha256:[0-9a-f]{64}$'),
  success_reward_policy_version text not null check (
    success_reward_policy_version = btrim(success_reward_policy_version) and success_reward_policy_version <> ''
  ),
  reward_cents bigint not null default 0 check (reward_cents >= 0),
  round_success_reward_budget_cents bigint not null default 0 check (round_success_reward_budget_cents >= 0),
  backed_success_reward_pool_cents bigint not null default 0 check (backed_success_reward_pool_cents >= 0),
  dominance_mode text not null default 'off' check (dominance_mode in ('off', 'sponsor_backed')),
  status text not null default 'pending_review' check (
    status in ('pending_review', 'approved', 'denied', 'paid', 'credited', 'voided')
  ),
  denial_reason text,
  claim_hash text not null unique check (claim_hash ~ '^sha256:[0-9a-f]{64}$'),
  created_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz,
  unique (round_id, campaign_id, participant_ref_hash, common_ground_budget_id, conditional_trade_intent_id, contribution_row_hash)
);

create table if not exists public.mpgf_public_goods_coordination_credit_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  round_id text not null references public.mpgf_public_goods_rounds (id) on delete cascade,
  campaign_id text not null references public.mpgf_public_goods_campaigns (id) on delete cascade,
  participant_ref_hash text not null check (participant_ref_hash ~ '^sha256:[0-9a-f]{64}$'),
  common_ground_budget_id text not null,
  conditional_trade_intent_id text not null,
  credit_kind text not null default 'coordination_participation' check (
    credit_kind in ('coordination_participation', 'cross_view_clearance', 'review_cleared_support')
  ),
  unit_count integer not null default 1 check (unit_count > 0),
  non_transferable boolean not null default true check (non_transferable = true),
  affects_counted_dollars boolean not null default false check (affects_counted_dollars = false),
  affects_match_eligibility boolean not null default false check (affects_match_eligibility = false),
  affects_counterparty_volume boolean not null default false check (affects_counterparty_volume = false),
  affects_supporter_counts boolean not null default false check (affects_supporter_counts = false),
  affects_cluster_counts boolean not null default false check (affects_cluster_counts = false),
  affects_identity_weight boolean not null default false check (affects_identity_weight = false),
  affects_voting_power boolean not null default false check (affects_voting_power = false),
  affects_allocation_power boolean not null default false check (affects_allocation_power = false),
  benefit_context_hash text not null check (benefit_context_hash ~ '^sha256:[0-9a-f]{64}$'),
  ledger_entry_hash text not null unique check (ledger_entry_hash ~ '^sha256:[0-9a-f]{64}$'),
  created_at timestamptz not null default timezone('utc', now()),
  unique (round_id, campaign_id, participant_ref_hash, common_ground_budget_id, conditional_trade_intent_id, benefit_context_hash)
);

create table if not exists public.mpgf_public_goods_impact_certificate_claims (
  id uuid primary key default gen_random_uuid(),
  round_id text not null references public.mpgf_public_goods_rounds (id) on delete cascade,
  campaign_id text not null references public.mpgf_public_goods_campaigns (id) on delete cascade,
  participant_ref_hash text not null check (participant_ref_hash ~ '^sha256:[0-9a-f]{64}$'),
  common_ground_budget_id text not null,
  conditional_trade_intent_id text not null,
  rulebook_hash text not null check (rulebook_hash ~ '^sha256:[0-9a-f]{64}$'),
  clearing_input_bundle_hash text not null check (clearing_input_bundle_hash ~ '^sha256:[0-9a-f]{64}$'),
  payment_commitment_snapshot_hash text not null check (payment_commitment_snapshot_hash ~ '^sha256:[0-9a-f]{64}$'),
  fee_quote_hash text not null check (fee_quote_hash ~ '^sha256:[0-9a-f]{64}$'),
  contribution_row_hash text not null check (contribution_row_hash ~ '^sha256:[0-9a-f]{64}$'),
  net_recipient_disbursed_cents bigint not null check (net_recipient_disbursed_cents > 0),
  captured_at timestamptz not null,
  retroactive_access_allowed boolean not null default false check (retroactive_access_allowed = false),
  double_count_prevention_hash text not null unique check (double_count_prevention_hash ~ '^sha256:[0-9a-f]{64}$'),
  certificate_hash text not null unique check (certificate_hash ~ '^sha256:[0-9a-f]{64}$'),
  status text not null default 'issued' check (status in ('issued', 'voided')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (round_id, campaign_id, participant_ref_hash, common_ground_budget_id, conditional_trade_intent_id, contribution_row_hash)
);

create index if not exists mpgf_public_goods_success_reward_claims_round_idx
  on public.mpgf_public_goods_success_reward_claims (round_id, campaign_id, status);

create index if not exists mpgf_public_goods_coordination_credit_entries_round_idx
  on public.mpgf_public_goods_coordination_credit_ledger_entries (round_id, campaign_id, credit_kind);

create index if not exists mpgf_public_goods_impact_certificate_claims_round_idx
  on public.mpgf_public_goods_impact_certificate_claims (round_id, campaign_id, status);

alter table public.mpgf_public_goods_success_reward_claims enable row level security;
alter table public.mpgf_public_goods_coordination_credit_ledger_entries enable row level security;
alter table public.mpgf_public_goods_impact_certificate_claims enable row level security;

grant all on public.mpgf_public_goods_success_reward_claims to service_role;
grant all on public.mpgf_public_goods_coordination_credit_ledger_entries to service_role;
grant all on public.mpgf_public_goods_impact_certificate_claims to service_role;

comment on column public.mpgf_public_goods_rounds.success_reward_budget_cents is
  'CRECM v1.125 success-reward budget. Existing rounds default to zero unless re-consented under the current rulebook.';

comment on column public.mpgf_public_goods_rounds.mechanism_version is
  'Legacy rounds remain marked as Verified Assurance Matching pilot; CRECM v1.125 rounds are created or re-consented under the MPGF_MECHANISM_VERSION feature flag.';

comment on column public.mpgf_public_goods_rounds.sealed_pledge_mode is
  'CRECM v1.125 sealed-progress default. Existing rounds default to blind_until_close unless re-consented.';

comment on table public.mpgf_public_goods_success_reward_claims is
  'CRECM v1.125 contributor success-reward claims. Rewards are claim-hash backed and require fully backed success-reward pool validation before payout or credit.';

comment on table public.mpgf_public_goods_coordination_credit_ledger_entries is
  'CRECM v1.125 non-transferable coordination-credit ledger entries. Credits are informational and cannot affect counted dollars, matching, voting, identity, or allocation power.';

comment on table public.mpgf_public_goods_impact_certificate_claims is
  'CRECM v1.125 impact-certificate claims for captured successful net-recipient public-good funding. Retroactive access is disabled by constraint.';

commit;
