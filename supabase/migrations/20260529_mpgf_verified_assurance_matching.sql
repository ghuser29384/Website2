begin;

create extension if not exists pgcrypto;

create table if not exists public.mpgf_public_goods_match_pools (
  id text primary key,
  funder_type text not null check (
    funder_type in ('demo_common_ground_pool', 'sponsor', 'subscription_pool', 'institution')
  ),
  budget_cents bigint not null check (budget_cents >= 0),
  base_match_ratio numeric not null default 1 check (base_match_ratio >= 0),
  qf_bonus_cents bigint not null default 0 check (qf_bonus_cents >= 0),
  visible_commitment text not null,
  restrictions_json jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('draft', 'active', 'paused', 'closed', 'voided')),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_public_goods_rounds (
  id text primary key,
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  match_pool_id text not null references public.mpgf_public_goods_match_pools (id),
  qf_enabled boolean not null default false,
  qf_cap_multiple numeric not null default 1.5 check (qf_cap_multiple >= 0),
  supporter_gate text not null check (
    supporter_gate in ('demo_self_attestation', 'verified_human', 'repository_existing_verification')
  ),
  status text not null default 'scheduled' check (
    status in ('draft', 'scheduled', 'open', 'allocation_pending', 'published', 'closed', 'emergency_suspended')
  ),
  created_at timestamptz not null default timezone('utc', now()),
  constraint mpgf_public_goods_rounds_valid_window check (ends_at > starts_at)
);

create table if not exists public.mpgf_public_goods_campaigns (
  id text primary key,
  round_id text references public.mpgf_public_goods_rounds (id) on delete set null,
  slug text not null unique,
  pool_alternative_id text references public.mpgf_candidate_alternatives (id) on delete set null,
  title text not null,
  destination_type text not null check (
    destination_type in ('external_charity', 'fiscal_host', 'internal_demo_pool', 'signed_sponsor_route')
  ),
  destination_ref text not null,
  cause_tags text[] not null default '{}',
  public_summary text not null,
  threshold_amount_cents bigint not null check (threshold_amount_cents > 0),
  threshold_supporters integer not null check (threshold_supporters > 0),
  deadline_at timestamptz not null,
  verification_method text not null,
  baseline_rule text not null,
  exit_rule text not null,
  review_status text not null default 'draft' check (
    review_status in ('draft', 'submitted', 'needs_evidence', 'challenge_window', 'approved', 'blocked', 'finalized')
  ),
  challenge_window_ends_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_public_goods_identity_attestations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id) on delete cascade,
  user_ref text not null,
  provider text not null check (
    provider in ('demo_self_attestation', 'repository_profile', 'external_proof_of_personhood')
  ),
  human_score_bps integer not null check (human_score_bps between 0 and 10000),
  expires_at timestamptz not null,
  status text not null check (status in ('active', 'expired', 'revoked', 'pending_review')),
  redacted_reference text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_public_goods_pledges (
  id uuid primary key default gen_random_uuid(),
  campaign_id text not null references public.mpgf_public_goods_campaigns (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete set null,
  user_ref text not null,
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'usd' check (currency = 'usd'),
  visibility_mode text not null check (
    visibility_mode in ('private_amount', 'public_supporter', 'public_reason')
  ),
  capture_mode text not null check (
    capture_mode in ('external_handoff', 'stored_payment_method', 'signed_intent')
  ),
  eligibility_state text not null default 'pending_review' check (
    eligibility_state in ('eligible', 'pending_review', 'duplicate_identity', 'below_minimum', 'blocked')
  ),
  human_score_bps integer not null default 0 check (human_score_bps between 0 and 10000),
  status text not null default 'pledged' check (status in ('pledged', 'captured', 'voided', 'expired')),
  supporter_reason text,
  payment_intent_ref text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint mpgf_public_goods_no_custody_default check (
    capture_mode <> 'stored_payment_method' or payment_intent_ref is not null
  )
);

create table if not exists public.mpgf_public_goods_allocation_results (
  id uuid primary key default gen_random_uuid(),
  round_id text not null references public.mpgf_public_goods_rounds (id) on delete cascade,
  campaign_id text not null references public.mpgf_public_goods_campaigns (id) on delete cascade,
  direct_eligible_cents bigint not null check (direct_eligible_cents >= 0),
  verified_supporter_count integer not null check (verified_supporter_count >= 0),
  base_match_cents bigint not null check (base_match_cents >= 0),
  qf_score numeric not null check (qf_score >= 0),
  qf_bonus_cents bigint not null check (qf_bonus_cents >= 0),
  qf_bonus_cap_cents bigint not null check (qf_bonus_cap_cents >= 0),
  total_payout_cents bigint not null check (total_payout_cents >= 0),
  status text not null check (
    status in ('threshold_pending', 'threshold_met', 'review_pending', 'payable', 'expired', 'blocked')
  ),
  proof_required text not null check (
    proof_required in ('external_destination_receipt', 'provider_webhook_and_review', 'signed_intent_review')
  ),
  custody_mode text not null check (
    custody_mode in ('no_custody_external_handoff', 'provider_or_fiscal_host_required')
  ),
  finalized_at timestamptz not null default timezone('utc', now()),
  unique (round_id, campaign_id)
);

create table if not exists public.mpgf_public_goods_payment_proofs (
  id uuid primary key default gen_random_uuid(),
  pledge_id uuid references public.mpgf_public_goods_pledges (id) on delete set null,
  campaign_id text not null references public.mpgf_public_goods_campaigns (id) on delete cascade,
  external_receipt_ref text,
  charity_receipt_ref text,
  amount_verified_cents bigint not null default 0 check (amount_verified_cents >= 0),
  status text not null default 'pending_review' check (
    status in ('pending_review', 'verified', 'rejected', 'superseded')
  ),
  verified_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

grant select on
  public.mpgf_public_goods_match_pools,
  public.mpgf_public_goods_rounds,
  public.mpgf_public_goods_campaigns,
  public.mpgf_public_goods_allocation_results
to anon, authenticated;

grant select, insert on
  public.mpgf_public_goods_pledges,
  public.mpgf_public_goods_identity_attestations,
  public.mpgf_public_goods_payment_proofs
to authenticated;

alter table public.mpgf_public_goods_pledges enable row level security;
alter table public.mpgf_public_goods_identity_attestations enable row level security;
alter table public.mpgf_public_goods_payment_proofs enable row level security;

commit;
