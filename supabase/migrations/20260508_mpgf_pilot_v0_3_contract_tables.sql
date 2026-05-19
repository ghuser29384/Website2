create extension if not exists pgcrypto;

-- MPGF Pilot v0.3 contract-schema supplement.
-- The repository's first MPGF migration created the direct-working subset.
-- This migration adds the remaining logical contract objects in dependency order
-- while preserving the repository adapter's existing text cycle IDs.

create table if not exists public.mpgf_epochs (
  id uuid primary key default gen_random_uuid(),
  epoch_key text unique not null,
  stage text not null check (stage in ('pilot', 'public_beta', 'mature')),
  constitution_version text not null,
  metric_protocol_version text not null,
  theta_version text not null,
  status text not null check (status in ('draft', 'active', 'closed', 'retired')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.mpgf_genesis
  add column if not exists genesis_key text,
  add column if not exists status text,
  add column if not exists feature_mode text,
  add column if not exists config_hash text,
  add column if not exists seed_manifest_json jsonb,
  add column if not exists activated_by uuid;

update public.mpgf_genesis
set
  genesis_key = coalesce(genesis_key, concat('mpgf-genesis-', id::text)),
  status = coalesce(
    status,
    case
      when real_money_enabled then 'real_money_enabled'
      else 'activated_non_real_money'
    end
  ),
  feature_mode = coalesce(
    feature_mode,
    case mode
      when 'non_real_money_demo' then 'demo'
      else mode
    end
  ),
  config_hash = coalesce(config_hash, 'legacy-genesis-config-hash-unrecorded'),
  seed_manifest_json = coalesce(seed_manifest_json, '{}'::jsonb);

alter table public.mpgf_genesis
  alter column genesis_key set not null,
  alter column status set not null,
  alter column feature_mode set not null,
  alter column config_hash set not null,
  alter column seed_manifest_json set not null,
  drop constraint if exists mpgf_genesis_status_check,
  add constraint mpgf_genesis_status_check
    check (status in ('not_started', 'activated_non_real_money', 'ready_for_real_money_review', 'real_money_enabled', 'emergency_disabled')),
  drop constraint if exists mpgf_genesis_feature_mode_check,
  add constraint mpgf_genesis_feature_mode_check
    check (feature_mode in ('demo', 'pledge_only', 'test_mode', 'real_money'));

create unique index if not exists mpgf_genesis_genesis_key_idx
  on public.mpgf_genesis (genesis_key);

alter table public.mpgf_cycles
  add column if not exists epoch_id uuid references public.mpgf_epochs (id),
  add column if not exists cycle_key text,
  add column if not exists locked_budget_cents bigint,
  add column if not exists budget_locked_at timestamptz,
  add column if not exists formal_mechanism_version text default 'mpgf-formal-mechanism-v0.3',
  add column if not exists protocol_version text default 'mpgf-pilot-v0.3',
  add column if not exists theta_version text default 'mpgf-theta-demo-v1',
  add column if not exists opened_at timestamptz,
  add column if not exists closed_at timestamptz;

create unique index if not exists mpgf_cycles_cycle_key_unique
  on public.mpgf_cycles (cycle_key)
  where cycle_key is not null;

create table if not exists public.mpgf_conformance_reports (
  id uuid primary key default gen_random_uuid(),
  phase text not null,
  status text not null check (status in ('draft', 'passed', 'failed', 'blocked', 'superseded')),
  report_json jsonb not null default '{}'::jsonb,
  instruction_artifact_hash text,
  generated_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.mpgf_conformance_reports
  add column if not exists generated_for_version text,
  add column if not exists mechanism_version text,
  add column if not exists protocol_version text,
  add column if not exists theta_version text,
  add column if not exists conformance_json jsonb,
  add column if not exists unresolved_count integer,
  add column if not exists generated_by uuid;

update public.mpgf_conformance_reports
set
  generated_for_version = coalesce(generated_for_version, 'mpgf-pilot-v0.3'),
  mechanism_version = coalesce(mechanism_version, 'mpgf-formal-v0.3'),
  protocol_version = coalesce(protocol_version, 'mpgf-pilot-v0.3'),
  theta_version = coalesce(theta_version, 'theta-pilot-v0.3'),
  conformance_json = coalesce(conformance_json, report_json, '{}'::jsonb),
  unresolved_count = coalesce(
    unresolved_count,
    case
      when status = 'passed' then 0
      else 1
    end
  );

alter table public.mpgf_conformance_reports
  alter column generated_for_version set not null,
  alter column mechanism_version set not null,
  alter column protocol_version set not null,
  alter column theta_version set not null,
  alter column conformance_json set not null,
  alter column unresolved_count set not null,
  drop constraint if exists mpgf_conformance_reports_unresolved_count_nonnegative,
  add constraint mpgf_conformance_reports_unresolved_count_nonnegative
    check (unresolved_count >= 0);

create table if not exists public.mpgf_safe_fallbacks (
  id uuid primary key default gen_random_uuid(),
  fallback_key text unique not null,
  title text not null,
  substantive_risk_bps integer not null default 0 check (substantive_risk_bps between 0 and 10000),
  tail_loss_bps integer not null default 0 check (tail_loss_bps between 0 and 10000),
  priority_bps integer not null default 10000 check (priority_bps between 0 and 10000),
  status text not null default 'draft' check (status in ('draft', 'active', 'retired')),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.mpgf_candidate_alternatives
  add column if not exists alternative_type text default 'ordinary_pool' check (alternative_type in ('ordinary_pool', 'safe_fallback', 'carryover')),
  add column if not exists fallback_id uuid references public.mpgf_safe_fallbacks (id),
  add column if not exists title text,
  add column if not exists eligibility_status text default 'eligible',
  add column if not exists threat_status text,
  add column if not exists downside_status text,
  add column if not exists strong_negative_status text,
  add column if not exists recipient_accreditation_status text;

create table if not exists public.mpgf_recipients (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  public_name text not null,
  recipient_type text not null,
  accreditation_status text not null default 'not_started',
  compliance_status text not null default 'not_started',
  payout_eligibility_status text not null default 'not_eligible',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_recipient_accreditations (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.mpgf_recipients (id) on delete cascade,
  status text not null check (status in ('draft', 'pending_review', 'approved', 'rejected', 'expired', 'revoked')),
  evidence_json jsonb not null default '{}'::jsonb,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_recipient_compliance_reviews (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.mpgf_recipients (id) on delete cascade,
  status text not null check (status in ('draft', 'pending_review', 'approved', 'rejected', 'expired', 'revoked')),
  evidence_json jsonb not null default '{}'::jsonb,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_recipient_payout_destinations (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.mpgf_recipients (id) on delete cascade,
  destination_ref text,
  destination_status text not null default 'disabled',
  verification_status text not null default 'not_required',
  evidence_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_payment_intents (
  id uuid primary key default gen_random_uuid(),
  intended_cycle_id text references public.mpgf_cycles (id),
  budget_effective_cycle_id text references public.mpgf_cycles (id),
  user_id uuid,
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'usd' check (currency = 'usd'),
  mode text not null check (mode in ('test_payment', 'real_money')),
  provider text,
  provider_payment_intent_id text,
  stripe_payment_intent_id text,
  status text not null check (status in ('created', 'requires_action', 'processing', 'succeeded', 'failed', 'cancelled')),
  idempotency_key text,
  created_at timestamptz not null default timezone('utc', now()),
  confirmed_at timestamptz
);

alter table public.mpgf_payment_intents
  add column if not exists stripe_payment_intent_id text,
  add column if not exists confirmed_at timestamptz;

update public.mpgf_payment_intents
set
  stripe_payment_intent_id = coalesce(stripe_payment_intent_id, provider_payment_intent_id),
  status = case status
    when 'requires_provider' then 'requires_action'
    when 'requires_payment_method' then 'requires_action'
    when 'requires_confirmation' then 'requires_action'
    else status
  end;

alter table public.mpgf_payment_intents
  drop constraint if exists mpgf_payment_intents_status_check,
  add constraint mpgf_payment_intents_status_check
    check (status in ('created', 'requires_action', 'processing', 'succeeded', 'failed', 'cancelled'));

create table if not exists public.mpgf_contributions (
  id uuid primary key default gen_random_uuid(),
  cycle_id text references public.mpgf_cycles (id),
  budget_effective_cycle_id text references public.mpgf_cycles (id),
  user_id uuid,
  payment_intent_id uuid references public.mpgf_payment_intents (id),
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'usd' check (currency = 'usd'),
  contribution_mode text not null check (contribution_mode in ('test_payment', 'real_money')),
  status text not null check (status in ('pending', 'recorded', 'late_assigned_next_cycle', 'refunded', 'chargeback_disputed', 'chargeback_lost', 'voided')),
  received_at timestamptz,
  budget_effective_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.mpgf_contributions
  drop constraint if exists mpgf_contributions_status_check,
  add constraint mpgf_contributions_status_check
    check (status in ('pending', 'recorded', 'late_assigned_next_cycle', 'refunded', 'chargeback_disputed', 'chargeback_lost', 'voided'));

alter table public.mpgf_pledges
  add column if not exists user_id uuid,
  add column if not exists currency text not null default 'usd' check (currency = 'usd'),
  add column if not exists intended_cycle_id text references public.mpgf_cycles (id),
  add column if not exists budget_effective_cycle_id text references public.mpgf_cycles (id),
  add column if not exists pledge_mode text default 'pledge_only' check (pledge_mode = 'pledge_only'),
  add column if not exists converted_payment_intent_id uuid references public.mpgf_payment_intents (id),
  add column if not exists cancelled_at timestamptz,
  add column if not exists expires_at timestamptz;

alter table public.mpgf_pledges
  drop constraint if exists mpgf_pledges_status_check,
  add constraint mpgf_pledges_status_check
    check (status in ('pledged', 'cancelled', 'converted_to_payment_intent', 'expired'));

create table if not exists public.mpgf_recurring_contribution_commitments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'usd' check (currency = 'usd'),
  cadence text not null check (cadence = 'monthly'),
  mode text not null check (mode in ('pledge_only', 'test_payment', 'real_money')),
  status text not null check (status in ('active', 'paused', 'cancelled', 'expired')),
  start_cycle_id text references public.mpgf_cycles (id),
  next_cycle_id text references public.mpgf_cycles (id),
  next_scheduled_at timestamptz,
  provider_subscription_id text,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.mpgf_recurring_contribution_commitments
  add column if not exists next_scheduled_at timestamptz,
  add column if not exists provider_subscription_id text,
  add column if not exists paused_at timestamptz,
  add column if not exists cancelled_at timestamptz;

update public.mpgf_recurring_contribution_commitments
set user_id = gen_random_uuid()
where user_id is null;

alter table public.mpgf_recurring_contribution_commitments
  drop constraint if exists mpgf_recurring_contribution_commitments_status_check,
  alter column user_id set not null,
  add constraint mpgf_recurring_contribution_commitments_status_check
    check (status in ('active', 'paused', 'cancelled', 'expired', 'provider_action_required', 'provider_failed'));

alter table public.mpgf_pledges
  add column if not exists recurring_commitment_id uuid references public.mpgf_recurring_contribution_commitments (id);

create table if not exists public.mpgf_payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  stripe_event_id text unique,
  event_type text not null,
  raw_body_hash text,
  payload_json jsonb not null default '{}'::jsonb,
  signature_verified boolean not null default false,
  signature_verified_at timestamptz,
  processed boolean default false,
  processed_at timestamptz,
  processing_error text,
  status text not null default 'received' check (status in ('received', 'processed', 'ignored', 'failed')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (provider, provider_event_id)
);

alter table public.mpgf_payment_webhook_events
  add column if not exists stripe_event_id text,
  add column if not exists raw_body_hash text,
  add column if not exists signature_verified boolean not null default false,
  add column if not exists signature_verified_at timestamptz,
  add column if not exists processed boolean default false,
  add column if not exists processed_at timestamptz,
  add column if not exists processing_error text;

update public.mpgf_payment_webhook_events
set
  stripe_event_id = coalesce(stripe_event_id, provider_event_id),
  raw_body_hash = coalesce(raw_body_hash, 'missing-raw-body-hash'),
  processed = coalesce(processed, status = 'processed'),
  processed_at = case when status = 'processed' then coalesce(processed_at, created_at) else processed_at end;

alter table public.mpgf_payment_webhook_events
  alter column stripe_event_id set not null,
  alter column raw_body_hash set not null;

create unique index if not exists mpgf_payment_webhook_events_stripe_event_id_idx
on public.mpgf_payment_webhook_events (stripe_event_id);

create table if not exists public.mpgf_refunds (
  id uuid primary key default gen_random_uuid(),
  contribution_id uuid references public.mpgf_contributions (id),
  payment_intent_id uuid references public.mpgf_payment_intents (id),
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'usd' check (currency = 'usd'),
  status text not null check (status in ('requested', 'approved', 'submitted_to_provider', 'succeeded', 'failed', 'cancelled')),
  reason text,
  provider_refund_id text,
  requested_by uuid,
  requested_at timestamptz,
  approved_by uuid,
  approved_at timestamptz,
  provider_submitted_at timestamptz,
  processed_at timestamptz,
  evidence_json jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.mpgf_refunds
  add column if not exists provider_refund_id text,
  add column if not exists requested_by uuid,
  add column if not exists requested_at timestamptz,
  add column if not exists approved_by uuid,
  add column if not exists approved_at timestamptz,
  add column if not exists provider_submitted_at timestamptz,
  add column if not exists processed_at timestamptz,
  add column if not exists evidence_json jsonb;

update public.mpgf_refunds
set status = case status
  when 'rejected' then 'failed'
  else status
end;

alter table public.mpgf_refunds
  drop constraint if exists mpgf_refunds_status_check,
  add constraint mpgf_refunds_status_check
    check (status in ('requested', 'approved', 'submitted_to_provider', 'succeeded', 'failed', 'cancelled'));

create table if not exists public.mpgf_cycle_calendars (
  id uuid primary key default gen_random_uuid(),
  cycle_id text not null references public.mpgf_cycles (id) on delete cascade,
  proposal_opens_at timestamptz,
  ballot_opens_at timestamptz,
  ballot_closes_at timestamptz,
  summary_publishes_at timestamptz,
  status text not null default 'draft',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_eligibility_snapshots (
  id uuid primary key default gen_random_uuid(),
  cycle_id text not null references public.mpgf_cycles (id) on delete cascade,
  snapshot_version integer not null default 1,
  eligibility_hash text not null,
  status text not null check (status in ('draft', 'active', 'superseded', 'voided')),
  approved_at timestamptz,
  supersedes_snapshot_id uuid references public.mpgf_eligibility_snapshots (id),
  created_at timestamptz not null default timezone('utc', now()),
  unique (cycle_id, snapshot_version)
);

create table if not exists public.mpgf_participant_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  verification_status text not null check (verification_status in ('not_started', 'pending', 'verified', 'rejected', 'suspended')),
  evidence_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_terms_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  terms_version text not null,
  privacy_version text not null,
  acceptance_mode text not null default 'demo_only',
  revoked_at timestamptz,
  accepted_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_sybil_reviews (
  id uuid primary key default gen_random_uuid(),
  cycle_id text references public.mpgf_cycles (id) on delete cascade,
  user_id uuid not null,
  status text not null check (status in ('open', 'cleared', 'confirmed_duplicate', 'inconclusive', 'voided')),
  evidence_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_cycle_eligible_voters (
  id uuid primary key default gen_random_uuid(),
  eligibility_snapshot_id uuid not null references public.mpgf_eligibility_snapshots (id) on delete cascade,
  cycle_id text not null references public.mpgf_cycles (id) on delete cascade,
  user_id uuid not null,
  governance_weight_units bigint not null default 1 check (governance_weight_units >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  unique (eligibility_snapshot_id, user_id)
);

create table if not exists public.mpgf_candidate_set_snapshots (
  id uuid primary key default gen_random_uuid(),
  cycle_id text not null references public.mpgf_cycles (id) on delete cascade,
  snapshot_version integer not null default 1,
  candidate_set_hash text not null,
  status text not null check (status in ('draft', 'active', 'superseded', 'voided')),
  approved_at timestamptz,
  supersedes_snapshot_id uuid references public.mpgf_candidate_set_snapshots (id),
  created_at timestamptz not null default timezone('utc', now()),
  unique (cycle_id, snapshot_version)
);

create table if not exists public.mpgf_candidate_set_snapshot_items (
  id uuid primary key default gen_random_uuid(),
  candidate_set_snapshot_id uuid not null references public.mpgf_candidate_set_snapshots (id) on delete cascade,
  alternative_id text not null references public.mpgf_candidate_alternatives (id),
  ordering_key text not null,
  item_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique (candidate_set_snapshot_id, alternative_id)
);

create table if not exists public.mpgf_quorum_results (
  id uuid primary key default gen_random_uuid(),
  cycle_id text not null references public.mpgf_cycles (id) on delete cascade,
  eligibility_snapshot_id uuid references public.mpgf_eligibility_snapshots (id),
  candidate_set_snapshot_id uuid references public.mpgf_candidate_set_snapshots (id),
  eligible_voter_count integer not null default 0 check (eligible_voter_count >= 0),
  valid_ballot_count integer not null default 0 check (valid_ballot_count >= 0),
  quorum_bps integer not null check (quorum_bps between 0 and 10000),
  quorum_passed boolean not null default false,
  result_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.mpgf_ballots
  add column if not exists user_id uuid,
  add column if not exists eligibility_snapshot_id uuid references public.mpgf_eligibility_snapshots (id),
  add column if not exists candidate_set_snapshot_id uuid references public.mpgf_candidate_set_snapshots (id),
  add column if not exists status text default 'draft' check (status in ('draft', 'submitted', 'invalidated', 'voided')),
  add column if not exists draft_version integer not null default 1,
  add column if not exists total_abs_integral_decimal_cache numeric,
  add column if not exists locked_budget_cents_at_submission bigint,
  add column if not exists validation_trace_id uuid;

create table if not exists public.mpgf_ballot_curves (
  id uuid primary key default gen_random_uuid(),
  ballot_id uuid not null references public.mpgf_ballots (id) on delete cascade,
  alternative_id text not null references public.mpgf_candidate_alternatives (id),
  curve_json jsonb not null,
  abs_integral_rational_json jsonb not null,
  signed_integral_rational_json jsonb not null,
  abs_integral_decimal_cache numeric,
  signed_integral_decimal_cache numeric,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_cycle_valid_voters (
  id uuid primary key default gen_random_uuid(),
  eligibility_snapshot_id uuid not null references public.mpgf_eligibility_snapshots (id) on delete cascade,
  cycle_id text not null references public.mpgf_cycles (id) on delete cascade,
  user_id uuid not null,
  ballot_id uuid references public.mpgf_ballots (id),
  governance_weight_units bigint not null default 1 check (governance_weight_units >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  unique (eligibility_snapshot_id, user_id)
);

alter table public.mpgf_ledger_transactions
  add column if not exists cycle_id text references public.mpgf_cycles (id),
  add column if not exists transaction_type text,
  add column if not exists status text not null default 'posted';

alter table public.mpgf_ledger_transactions
  drop constraint if exists mpgf_ledger_transactions_status_contract_check;

alter table public.mpgf_ledger_transactions
  add constraint mpgf_ledger_transactions_status_contract_check
  check (status in ('posted', 'voided', 'corrected'));

create table if not exists public.mpgf_partition_dimensions (
  id uuid primary key default gen_random_uuid(),
  dimension_key text unique not null,
  title text not null,
  status text not null default 'active',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_partition_groups (
  id uuid primary key default gen_random_uuid(),
  dimension_id uuid not null references public.mpgf_partition_dimensions (id) on delete cascade,
  group_key text not null,
  title text not null,
  status text not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  unique (dimension_id, group_key)
);

create table if not exists public.mpgf_participant_partition_memberships (
  id uuid primary key default gen_random_uuid(),
  cycle_id text references public.mpgf_cycles (id) on delete cascade,
  user_id uuid not null,
  dimension_id uuid references public.mpgf_partition_dimensions (id),
  group_id uuid references public.mpgf_partition_groups (id),
  created_at timestamptz not null default timezone('utc', now()),
  unique (cycle_id, user_id, dimension_id)
);

create table if not exists public.mpgf_pool_risk_assessments (
  id uuid primary key default gen_random_uuid(),
  cycle_id text references public.mpgf_cycles (id) on delete cascade,
  alternative_id text references public.mpgf_candidate_alternatives (id),
  candidate_set_snapshot_id uuid references public.mpgf_candidate_set_snapshots (id),
  assessment_version integer not null default 1,
  risk_bps integer not null check (risk_bps between 0 and 10000),
  tail_loss_bps integer not null check (tail_loss_bps between 0 and 10000),
  threat_status text not null,
  downside_status text not null,
  assessment_method text not null,
  evidence_json jsonb not null default '{}'::jsonb,
  status text not null check (status in ('draft', 'reviewed', 'approved', 'rejected', 'superseded', 'voided')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  approved_by uuid,
  approved_at timestamptz,
  supersedes_assessment_id uuid references public.mpgf_pool_risk_assessments (id),
  created_at timestamptz not null default timezone('utc', now()),
  unique (cycle_id, alternative_id, assessment_version)
);

create table if not exists public.mpgf_strong_negative_flags (
  id uuid primary key default gen_random_uuid(),
  cycle_id text references public.mpgf_cycles (id) on delete cascade,
  pool_id text references public.mpgf_candidate_alternatives (id),
  user_id uuid not null,
  severity_bps integer not null check (severity_bps between 0 and 10000),
  reason text not null,
  evidence_json jsonb not null default '{}'::jsonb,
  status text not null check (status in ('submitted', 'validated', 'rejected', 'voided')),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_strong_negative_results (
  id uuid primary key default gen_random_uuid(),
  cycle_id text references public.mpgf_cycles (id) on delete cascade,
  pool_id text references public.mpgf_candidate_alternatives (id),
  eligibility_snapshot_id uuid references public.mpgf_eligibility_snapshots (id),
  candidate_set_snapshot_id uuid references public.mpgf_candidate_set_snapshots (id),
  weighted_flag_share_bps integer not null check (weighted_flag_share_bps between 0 and 10000),
  weighted_severity_bps integer not null check (weighted_severity_bps between 0 and 10000),
  threshold_triggered boolean not null,
  filter_effective boolean not null,
  review_required boolean not null,
  result_status text not null check (result_status in ('draft', 'computed', 'review_required', 'review_confirmed', 'review_rejected', 'voided')),
  details_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.mpgf_allocation_plans
  add column if not exists quorum_result_id uuid references public.mpgf_quorum_results (id),
  add column if not exists eligibility_snapshot_id uuid references public.mpgf_eligibility_snapshots (id),
  add column if not exists candidate_set_snapshot_id uuid references public.mpgf_candidate_set_snapshots (id),
  add column if not exists formal_correction_trace_id uuid,
  add column if not exists allocation_type text default 'demo',
  add column if not exists canonical_instance_hash text,
  add column if not exists objective_value_rational_json jsonb,
  add column if not exists solver_certificate_id uuid,
  add column if not exists allocation_json jsonb default '{}'::jsonb,
  add column if not exists certified_at timestamptz;

update public.mpgf_allocation_plans
set status = 'certified_optimal'
where status = 'certified';

update public.mpgf_allocation_plans
set status = 'audit_rejected'
where status = 'superseded';

update public.mpgf_allocation_plans
set status = 'failed_certification'
where status = 'voided';

alter table public.mpgf_allocation_plans
  drop constraint if exists mpgf_allocation_plans_status_check,
  drop constraint if exists mpgf_allocation_plans_status_contract_check;

alter table public.mpgf_allocation_plans
  add constraint mpgf_allocation_plans_status_contract_check
  check (status in ('draft', 'compiled', 'solver_running', 'certified_optimal', 'certified_infeasible', 'failed_certification', 'shadow_only', 'audit_approved', 'audit_rejected'));

create table if not exists public.mpgf_authorizations (
  id uuid primary key default gen_random_uuid(),
  cycle_id text references public.mpgf_cycles (id),
  allocation_plan_id uuid references public.mpgf_allocation_plans (id),
  alternative_id text references public.mpgf_candidate_alternatives (id),
  recipient_id uuid references public.mpgf_recipients (id),
  authorized_amount_cents bigint not null check (authorized_amount_cents >= 0),
  currency text not null default 'usd' check (currency = 'usd'),
  status text not null check (status in ('proposed', 'approved', 'paused', 'voided', 'carried_over', 'closed')),
  use_restrictions_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  approved_by uuid,
  approved_at timestamptz
);

create table if not exists public.mpgf_tranches (
  id uuid primary key default gen_random_uuid(),
  authorization_id uuid references public.mpgf_authorizations (id),
  tranche_index integer not null,
  amount_cents bigint not null check (amount_cents >= 0),
  currency text not null default 'usd' check (currency = 'usd'),
  milestone_json jsonb not null default '{}'::jsonb,
  status text not null check (status in ('draft', 'ready_for_review', 'released_internal', 'payout_authorized', 'externally_paid', 'paused', 'voided', 'carried_over')),
  released_at timestamptz,
  released_by uuid,
  voided_at timestamptz,
  voided_by uuid,
  carried_over_at timestamptz,
  carried_over_by uuid,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_payout_authorizations (
  id uuid primary key default gen_random_uuid(),
  authorization_id uuid references public.mpgf_authorizations (id),
  tranche_id uuid references public.mpgf_tranches (id),
  recipient_id uuid references public.mpgf_recipients (id),
  amount_cents bigint not null check (amount_cents >= 0),
  currency text not null default 'usd' check (currency = 'usd'),
  status text not null check (status in ('draft', 'pending_review', 'approved', 'rejected', 'voided', 'paid_externally')),
  approval_record_ids_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  approved_at timestamptz
);

create table if not exists public.mpgf_external_payment_evidence (
  id uuid primary key default gen_random_uuid(),
  payout_authorization_id uuid references public.mpgf_payout_authorizations (id),
  recipient_id uuid references public.mpgf_recipients (id),
  amount_cents bigint not null check (amount_cents >= 0),
  currency text not null default 'usd' check (currency = 'usd'),
  evidence_hash text not null,
  status text not null check (status in ('pending', 'verified', 'rejected', 'voided')),
  evidence_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_outcome_units (
  id uuid primary key default gen_random_uuid(),
  pool_id text references public.mpgf_candidate_alternatives (id),
  unit_key text not null,
  title text not null,
  description text,
  status text not null default 'draft',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_sae_effect_assessments (
  id uuid primary key default gen_random_uuid(),
  cycle_id text references public.mpgf_cycles (id),
  pool_id text references public.mpgf_candidate_alternatives (id),
  outcome_unit_id uuid references public.mpgf_outcome_units (id),
  status text not null check (status in ('draft', 'reviewed', 'approved', 'rejected', 'superseded', 'voided')),
  evidence_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_sae_effect_curves (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid references public.mpgf_sae_effect_assessments (id) on delete cascade,
  curve_json jsonb not null,
  abs_integral_rational_json jsonb,
  signed_integral_rational_json jsonb,
  status text not null default 'draft',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_governance_judgments (
  id uuid primary key default gen_random_uuid(),
  judgment_key text unique,
  subject text not null,
  judgment_json jsonb not null default '{}'::jsonb,
  status text not null check (status in ('draft', 'approved', 'rejected', 'superseded')),
  appeal_status text not null default 'none',
  supersedes_judgment_id uuid references public.mpgf_governance_judgments (id),
  created_at timestamptz not null default timezone('utc', now()),
  approved_at timestamptz
);

create table if not exists public.mpgf_deterministic_function_traces (
  id uuid primary key default gen_random_uuid(),
  function_name text not null,
  input_hash text not null,
  output_hash text,
  trace_json jsonb not null default '{}'::jsonb,
  status text not null default 'recorded',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_emergency_shutdowns (
  id uuid primary key default gen_random_uuid(),
  status text not null check (status in ('inactive', 'active', 'recovery_review', 'resolved')),
  reason text not null,
  activated_by uuid,
  activated_at timestamptz,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_state_transition_logs (
  id uuid primary key default gen_random_uuid(),
  object_type text not null,
  object_id text not null,
  from_status text,
  to_status text not null,
  actor_user_id uuid,
  reason text,
  trace_id uuid references public.mpgf_deterministic_function_traces (id),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  target_type text not null,
  target_id text,
  actor_user_id uuid,
  audit_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_admin_approval_records (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  target_type text not null,
  target_id text,
  target_version text,
  approver_user_id uuid not null,
  approver_role text not null,
  decision text not null check (decision in ('approve', 'reject', 'abstain')),
  status text not null check (status in ('draft', 'approved', 'rejected', 'abstain', 'revoked', 'expired')),
  conflicted boolean not null default false,
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_appeals (
  id uuid primary key default gen_random_uuid(),
  cycle_id text references public.mpgf_cycles (id),
  appellant_user_id uuid,
  target_type text not null,
  target_id text,
  status text not null check (status in ('submitted', 'under_review', 'granted', 'denied', 'withdrawn')),
  decision text check (decision in ('grant', 'deny', 'withdraw', 'none')),
  allocation_effect_classification text,
  evidence_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_conflict_disclosures (
  id uuid primary key default gen_random_uuid(),
  cycle_id text references public.mpgf_cycles (id),
  user_id uuid,
  target_type text not null,
  target_id text,
  status text not null check (status in ('draft', 'submitted', 'reviewed', 'mitigated', 'unresolved', 'voided')),
  review_decision text,
  proposed_severity text,
  reviewed_severity text,
  evidence_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_production_enablement (
  id uuid primary key default gen_random_uuid(),
  status text not null check (status in ('blocked', 'pre_launch_validated', 'demo_complete', 'exact_pilot_complete', 'real_money_complete', 'revoked')),
  profile text not null,
  conformance_report_id uuid references public.mpgf_conformance_reports (id),
  evidence_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.mpgf_completion_profiles
  add column if not exists id uuid,
  add column if not exists normalization_report_path text,
  add column if not exists dry_run_report_path text,
  add column if not exists launch_readiness_report_path text,
  add column if not exists approved_by uuid,
  add column if not exists approved_at timestamptz,
  add column if not exists created_at timestamptz;

update public.mpgf_completion_profiles
set
  id = coalesce(id, gen_random_uuid()),
  created_at = coalesce(created_at, timezone('utc', now()));

alter table public.mpgf_completion_profiles
  alter column id set default gen_random_uuid(),
  alter column id set not null,
  alter column profile set not null,
  alter column created_at set default timezone('utc', now()),
  alter column created_at set not null,
  drop constraint if exists mpgf_completion_profiles_profile_check,
  add constraint mpgf_completion_profiles_profile_check
    check (profile in ('demo_complete', 'exact_pilot_complete', 'real_money_complete')),
  drop constraint if exists mpgf_completion_profiles_status_check,
  add constraint mpgf_completion_profiles_status_check
    check (status in ('not_started', 'in_progress', 'blocked', 'passed', 'revoked')),
  drop constraint if exists mpgf_completion_profiles_pkey,
  add constraint mpgf_completion_profiles_pkey primary key (id);

create unique index if not exists mpgf_completion_profiles_profile_idx
  on public.mpgf_completion_profiles (profile);

alter table public.mpgf_completion_profiles
  add column if not exists conformance_report_id uuid references public.mpgf_conformance_reports (id);

create table if not exists public.mpgf_receipts (
  id uuid primary key default gen_random_uuid(),
  contribution_id uuid references public.mpgf_contributions (id),
  refund_id uuid references public.mpgf_refunds (id),
  pledge_id uuid references public.mpgf_pledges (id),
  receipt_type text not null check (receipt_type in ('non_real_money_pledge_acknowledgement', 'test_payment_receipt', 'real_money_receipt', 'refund_receipt', 'tax_receipt')),
  status text not null check (status in ('draft', 'rendered', 'issued', 'sent', 'voided')),
  rendered_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  issued_at timestamptz,
  sent_at timestamptz
);

create table if not exists public.mpgf_public_cycle_summaries (
  id uuid primary key default gen_random_uuid(),
  cycle_id text references public.mpgf_cycles (id) on delete cascade,
  publication_status text not null check (publication_status in ('draft', 'generated', 'visibility_filtered', 'validated', 'published', 'withdrawn', 'failed')),
  summary_json jsonb not null default '{}'::jsonb,
  released_internal_cents bigint not null default 0 check (released_internal_cents >= 0),
  payout_authorized_cents bigint not null default 0 check (payout_authorized_cents >= 0),
  externally_paid_cents bigint not null default 0 check (externally_paid_cents >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  published_at timestamptz
);

create table if not exists public.mpgf_idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  idempotency_key text not null,
  actor_user_id uuid,
  action text not null default 'unknown',
  request_hash text not null,
  cycle_id text references public.mpgf_cycles (id),
  status text not null check (status in ('received', 'completed', 'failed', 'conflict', 'expired')),
  response_reference_json jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null default (timezone('utc', now()) + interval '30 days'),
  unique (scope, idempotency_key)
);

alter table public.mpgf_idempotency_keys
  add column if not exists actor_user_id uuid,
  add column if not exists action text default 'unknown',
  add column if not exists response_reference_json jsonb,
  add column if not exists expires_at timestamptz default (timezone('utc', now()) + interval '30 days');

update public.mpgf_idempotency_keys
set
  action = coalesce(action, 'unknown'),
  expires_at = coalesce(expires_at, timezone('utc', now()) + interval '30 days'),
  status = case status
    when 'reserved' then 'received'
    when 'succeeded' then 'completed'
    else status
  end;

alter table public.mpgf_idempotency_keys
  drop constraint if exists mpgf_idempotency_keys_status_check,
  alter column action set not null,
  alter column expires_at set not null,
  add constraint mpgf_idempotency_keys_status_check
    check (status in ('received', 'completed', 'failed', 'conflict', 'expired'));

create table if not exists public.mpgf_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  cycle_id text references public.mpgf_cycles (id),
  notification_type text not null,
  status text not null check (status in ('draft', 'queued', 'sent', 'failed', 'cancelled')),
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_operational_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  cycle_id text references public.mpgf_cycles (id),
  status text not null check (status in ('recorded', 'voided', 'superseded')),
  event_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_dry_run_cycles (
  id uuid primary key default gen_random_uuid(),
  source_cycle_id text references public.mpgf_cycles (id),
  status text not null check (status in ('draft', 'running', 'passed', 'failed', 'cancelled')),
  dry_run_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz
);
