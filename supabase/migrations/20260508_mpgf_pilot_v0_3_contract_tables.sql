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
  status text not null check (status in ('created', 'requires_provider', 'requires_payment_method', 'requires_confirmation', 'processing', 'succeeded', 'failed', 'cancelled')),
  idempotency_key text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_contributions (
  id uuid primary key default gen_random_uuid(),
  cycle_id text references public.mpgf_cycles (id),
  budget_effective_cycle_id text references public.mpgf_cycles (id),
  user_id uuid,
  payment_intent_id uuid references public.mpgf_payment_intents (id),
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'usd' check (currency = 'usd'),
  contribution_mode text not null check (contribution_mode in ('test_payment', 'real_money')),
  status text not null check (status in ('pending', 'recorded', 'late_assigned_next_cycle', 'refunded', 'voided')),
  received_at timestamptz,
  budget_effective_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.mpgf_pledges
  add column if not exists intended_cycle_id text references public.mpgf_cycles (id),
  add column if not exists budget_effective_cycle_id text references public.mpgf_cycles (id),
  add column if not exists pledge_mode text default 'pledge_only' check (pledge_mode = 'pledge_only'),
  add column if not exists converted_payment_intent_id uuid references public.mpgf_payment_intents (id);

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
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  payload_json jsonb not null default '{}'::jsonb,
  status text not null default 'received' check (status in ('received', 'processed', 'ignored', 'failed')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (provider, provider_event_id)
);

create table if not exists public.mpgf_refunds (
  id uuid primary key default gen_random_uuid(),
  contribution_id uuid references public.mpgf_contributions (id),
  payment_intent_id uuid references public.mpgf_payment_intents (id),
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'usd' check (currency = 'usd'),
  status text not null check (status in ('requested', 'approved', 'rejected', 'succeeded', 'failed')),
  reason text,
  created_at timestamptz not null default timezone('utc', now())
);

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
  request_hash text not null,
  cycle_id text references public.mpgf_cycles (id),
  status text not null check (status in ('reserved', 'succeeded', 'failed', 'expired')),
  response_json jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz,
  unique (scope, idempotency_key)
);

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
