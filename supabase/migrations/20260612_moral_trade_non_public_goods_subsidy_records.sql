alter table public.moral_trade_policy_snapshots
  drop constraint if exists moral_trade_policy_snapshots_subject_kind_check;

alter table public.moral_trade_policy_snapshots
  add constraint moral_trade_policy_snapshots_subject_kind_check
  check (
    subject_kind in (
      'release_gate',
      'state_interpretation',
      'payment_capture',
      'payout_release',
      'refund_cancellation',
      'provider_source_authentication',
      'time_authority',
      'notification',
      'fx',
      'platform_fee',
      'public_metrics',
      'data_retention',
      'participant_eligibility',
      'recipient_destination_verification',
      'account_security',
      'backup_recovery',
      'deployment_release',
      'configuration_snapshot',
      'schema_migration',
      'environment_data_isolation',
      'financial_reconciliation',
      'audit_integrity',
      'data_security',
      'reviewer_quality',
      'anti_enumeration',
      'privacy_disclosure',
      'impact_claim_methodology',
      'matching_clearing',
      'matched_trade_lock',
      'baseline_integrity',
      'baseline_manufacturing',
      'agreement_amendment',
      'appeal_case',
      'side_agreement_disclosure',
      'side_agreement_review',
      'trade_classification',
      'compensated_moral_action',
      'ordinary_service_procurement',
      'protective_assessment',
      'negative_commitment_scope',
      'action_reversibility_assessment',
      'donor_of_record_tax_receipt',
      'third_party_obligation_assessment',
      'representative_authority_assessment',
      'reporting_integrity_assessment',
      'civil_rights_discrimination_assessment',
      'participant_autonomy_assessment',
      'confidentiality_privacy_rights_assessment',
      'evidence_authenticity_assessment',
      'financial_crime_fraud_assessment',
      'agreement_transferability_assessment',
      'regulated_goods_hazardous_activity_assessment',
      'cyber_abuse_digital_integrity_assessment',
      'anti_corruption_assessment',
      'least_intrusive_evidence_assessment',
      'performance_bond_neutral_review',
      'user_safety',
      'contact_interaction',
      'abuse_report',
      'content_moderation',
      'prohibited_use',
      'challenge_window',
      'payout_milestone',
      'approved_trade_template',
      'template_parameter',
      'review_capacity',
      'review_queue_admission',
      'participant_term_sheet',
      'counterparty_blinding',
      'staged_counterparty_disclosure',
      'recipient_acceptance',
      'adverse_association',
      'ai_preference_elicitation',
      'post_clear_audit',
      'non_public_goods_subsidy',
      'subsidy_schedule'
    )
  );

create table if not exists public.moral_trade_non_public_goods_subsidy_pools (
  id uuid primary key default gen_random_uuid(),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  sponsor_id_hash text not null check (sponsor_id_hash ~ '^sha256:[a-f0-9]{64}$'),
  applies_to_trade_type text not null check (
    applies_to_trade_type in ('donation_offset', 'pledge_swap', 'compensated_moral_action', 'manual_review')
  ),
  applies_to_tiers text[] not null default array['tier_1_money_only_donation_offset'],
  total_budget_cents bigint not null check (total_budget_cents > 0),
  settlement_currency text not null default 'USD' check (settlement_currency ~ '^[A-Z]{3}$'),
  source_of_funds_review_state text not null default 'not_started' check (
    source_of_funds_review_state in ('not_started', 'under_review', 'non_blocking', 'blocked', 'manual_review', 'superseded')
  ),
  sponsor_conflict_of_interest_state text not null default 'not_started' check (
    sponsor_conflict_of_interest_state in ('not_started', 'under_review', 'non_blocking', 'disclosed_nonblocking', 'blocked', 'manual_review', 'superseded')
  ),
  allowed_cause_bucket_taxonomy_refs text[] not null default '{}',
  allowed_recipient_or_destination_classes_json jsonb not null default '[]'::jsonb,
  eligibility_rule_hash text not null check (eligibility_rule_hash ~ '^sha256:[a-f0-9]{64}$'),
  allocation_schedule_hash text not null check (allocation_schedule_hash ~ '^sha256:[a-f0-9]{64}$'),
  max_subsidy_per_participant_cents bigint not null check (max_subsidy_per_participant_cents > 0),
  max_subsidy_per_trade_cents bigint not null check (max_subsidy_per_trade_cents > 0),
  max_subsidy_ratio_bps integer not null check (max_subsidy_ratio_bps > 0 and max_subsidy_ratio_bps <= 10000),
  public_disclosure_level text not null default 'aggregate_only' check (
    public_disclosure_level in ('aggregate_only', 'source_bucket', 'named_sponsor', 'manual_review', 'undisclosed')
  ),
  refund_or_carry_forward_policy text not null default 'manual_review' check (
    refund_or_carry_forward_policy in ('return_to_sponsor', 'carry_forward', 'manual_review')
  ),
  subsidy_pool_state text not null default 'draft' check (
    subsidy_pool_state in ('draft', 'active', 'paused', 'exhausted', 'closed', 'superseded', 'blocked')
  ),
  reviewer_decision_ref text,
  sponsor_identity_public_bool boolean not null default false check (sponsor_identity_public_bool = false),
  private_source_details_public_bool boolean not null default false check (private_source_details_public_bool = false),
  reviewer_notes_public_bool boolean not null default false check (reviewer_notes_public_bool = false),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  expires_at timestamptz,
  superseded_by uuid references public.moral_trade_non_public_goods_subsidy_pools (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    applies_to_tiers <@ array[
      'tier_1_money_only_donation_offset',
      'tier_2_donation_offset_with_abstention_or_additionality_proof',
      'tier_3_closed_counterparty_pledge_swap',
      'tier_4_open_market_pledge_swap_or_compensated_action'
    ]
  ),
  check (
    max_subsidy_per_trade_cents <= total_budget_cents
    and max_subsidy_per_participant_cents <= total_budget_cents
  ),
  check (
    subsidy_pool_state <> 'active'
    or (
      applies_to_trade_type = 'donation_offset'
      and applies_to_tiers <@ array['tier_1_money_only_donation_offset']
      and cardinality(applies_to_tiers) > 0
      and source_of_funds_review_state = 'non_blocking'
      and sponsor_conflict_of_interest_state in ('non_blocking', 'disclosed_nonblocking')
      and cardinality(allowed_cause_bucket_taxonomy_refs) > 0
      and jsonb_array_length(allowed_recipient_or_destination_classes_json) > 0
      and public_disclosure_level not in ('manual_review', 'undisclosed')
      and refund_or_carry_forward_policy <> 'manual_review'
      and reviewer_decision_ref is not null
      and reviewed_at is not null
      and superseded_by is null
    )
  )
);

comment on table public.moral_trade_non_public_goods_subsidy_pools is
  'Frozen sponsor-funded non-public-goods subsidy pools. Active pools are limited to low-risk tier-1 donation offsets and require source-of-funds review, conflict review, eligibility/cap hashes, disclosure policy, refund or carry-forward policy, and reviewer decision before any clearing, payment, public metric, or release gate can rely on them.';

create table if not exists public.moral_trade_subsidy_schedule_records (
  id uuid primary key default gen_random_uuid(),
  non_public_goods_subsidy_pool_id uuid not null references public.moral_trade_non_public_goods_subsidy_pools (id) on delete restrict,
  matching_clearing_run_ref text not null,
  matched_trade_lock_proposal_ref text,
  cleared_trade_agreement_ref text,
  subsidy_type text not null check (
    subsidy_type in ('fixed_bonus', 'ratio_match', 'fee_offset', 'verification_cost_coverage', 'manual_review')
  ),
  eligibility_input_hash text not null check (eligibility_input_hash ~ '^sha256:[a-f0-9]{64}$'),
  schedule_hash text not null check (schedule_hash ~ '^sha256:[a-f0-9]{64}$'),
  subsidy_amount_cents bigint not null default 0 check (subsidy_amount_cents >= 0),
  subsidy_ratio_bps integer not null default 0 check (subsidy_ratio_bps >= 0 and subsidy_ratio_bps <= 10000),
  cap_binding_bool boolean not null default false,
  participant_moral_trade_volume_exclusion_bool boolean not null default true,
  direct_contribution_exclusion_bool boolean not null default true,
  impact_claim_exclusion_bool boolean not null default true,
  counterparty_distinctness_exclusion_bool boolean not null default true,
  subsidy_state text not null default 'previewed' check (
    subsidy_state in ('previewed', 'reserved', 'applied', 'released', 'cancelled', 'refunded', 'superseded', 'blocked')
  ),
  reviewer_decision_ref text,
  raw_eligibility_input_public_bool boolean not null default false check (raw_eligibility_input_public_bool = false),
  participant_specific_subsidy_public_bool boolean not null default false check (participant_specific_subsidy_public_bool = false),
  private_sponsor_terms_public_bool boolean not null default false check (private_sponsor_terms_public_bool = false),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    subsidy_state not in ('reserved', 'applied', 'released')
    or (
      subsidy_type <> 'manual_review'
      and cap_binding_bool = true
      and participant_moral_trade_volume_exclusion_bool = true
      and direct_contribution_exclusion_bool = true
      and impact_claim_exclusion_bool = true
      and counterparty_distinctness_exclusion_bool = true
      and reviewer_decision_ref is not null
    )
  )
);

comment on table public.moral_trade_subsidy_schedule_records is
  'Hash-backed subsidy schedule records linking sponsor subsidy pools to matching-clearing runs, matched-trade lock proposals, or cleared agreements. Records preserve cap checks and metric exclusions so subsidy dollars cannot inflate participant moral-trade volume, direct contribution, impact claims, or counterparty distinctness.';

create index if not exists moral_trade_non_public_goods_subsidy_pools_state_idx
  on public.moral_trade_non_public_goods_subsidy_pools (subsidy_pool_state, applies_to_trade_type, created_at desc);

create index if not exists moral_trade_non_public_goods_subsidy_pools_policy_idx
  on public.moral_trade_non_public_goods_subsidy_pools (policy_snapshot_id, subsidy_pool_state);

create index if not exists moral_trade_subsidy_schedule_records_pool_idx
  on public.moral_trade_subsidy_schedule_records (non_public_goods_subsidy_pool_id, subsidy_state, created_at desc);

create index if not exists moral_trade_subsidy_schedule_records_run_idx
  on public.moral_trade_subsidy_schedule_records (matching_clearing_run_ref, subsidy_state, created_at desc);

alter table public.moral_trade_non_public_goods_subsidy_pools enable row level security;
alter table public.moral_trade_subsidy_schedule_records enable row level security;
