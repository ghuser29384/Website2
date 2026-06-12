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
      'subsidy_schedule',
      'cause_bucket_taxonomy',
      'resource_compatibility',
      'net_offset_accounting',
      'offer_validity',
      'direct_pair_clearing',
      'private_exchange_rate_quote',
      'noncompensable_blocker',
      'batch_clearing_objective'
    )
  );

create table if not exists public.moral_trade_batch_clearing_objective_records (
  id uuid primary key default gen_random_uuid(),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  subject_type text not null check (
    subject_type in (
      'donation_offset_batch',
      'donation_offset_offer_pool',
      'matched_trade_lock_proposal',
      'cleared_trade_agreement',
      'public_metric_batch',
      'release_gate'
    )
  ),
  subject_id text not null,
  batch_clearing_objective_policy_ref text not null,
  policy_status text not null default 'missing' check (
    policy_status in ('resolved_immutable', 'missing', 'mutable', 'stale', 'superseded')
  ),
  objective_type text not null check (
    objective_type in (
      'maximize_safe_matched_volume',
      'maximize_safe_participant_count',
      'minimize_unmatched_residual',
      'manual_review'
    )
  ),
  objective_frozen_at timestamptz,
  deterministic_algorithm_version text not null,
  tie_break_fairness_rule_type text not null check (
    tie_break_fairness_rule_type in (
      'seeded_deterministic_hash',
      'pro_rata_by_frozen_capacity',
      'round_robin_by_hash',
      'reviewer_approved_manual',
      'manual_review'
    )
  ),
  tie_break_fairness_policy_ref text not null,
  scarce_capacity_bool boolean not null default false,
  input_bundle_hash text check (input_bundle_hash is null or input_bundle_hash ~ '^sha256:[a-f0-9]{64}$'),
  excluded_records_hash text check (excluded_records_hash is null or excluded_records_hash ~ '^sha256:[a-f0-9]{64}$'),
  objective_result_hash text check (objective_result_hash is null or objective_result_hash ~ '^sha256:[a-f0-9]{64}$'),
  reproducibility_check_ref text,
  allocation_drivers_json jsonb not null default '[]'::jsonb,
  result_state text not null default 'under_review' check (
    result_state in ('draft', 'reproducible', 'under_review', 'non_blocking', 'blocked', 'superseded')
  ),
  reviewer_decision_ref text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (jsonb_typeof(allocation_drivers_json) = 'array'),
  check (
    result_state not in ('reproducible', 'non_blocking')
    or (
      policy_status = 'resolved_immutable'
      and length(trim(batch_clearing_objective_policy_ref)) > 0
      and objective_type <> 'manual_review'
      and objective_frozen_at is not null
      and length(trim(deterministic_algorithm_version)) > 0
      and tie_break_fairness_rule_type in (
        'seeded_deterministic_hash',
        'pro_rata_by_frozen_capacity',
        'round_robin_by_hash'
      )
      and length(trim(tie_break_fairness_policy_ref)) > 0
      and input_bundle_hash is not null
      and excluded_records_hash is not null
      and objective_result_hash is not null
      and reproducibility_check_ref is not null
      and reviewer_decision_ref is not null
      and reviewed_at is not null
    )
  ),
  check (
    result_state not in ('reproducible', 'non_blocking')
    or not (
      allocation_drivers_json ?| array[
        'moral_score',
        'operator_preference',
        'public_pressure',
        'timestamp_race',
        'private_cap_leakage',
        'database_order',
        'protected_trait',
        'hidden_reviewer_preference'
      ]
    )
  ),
  check (
    result_state not in ('reproducible', 'non_blocking')
    or not scarce_capacity_bool
    or allocation_drivers_json ?| array[
      'seeded_hash',
      'frozen_capacity',
      'participant_confirmed_bounds'
    ]
  )
);

comment on table public.moral_trade_batch_clearing_objective_records is
  'First-class donation-offset batch-clearing objective records. Batch clearing needs a frozen objective, deterministic tie-break fairness rule, reproducible objective result, and prohibited allocation drivers counter before scarce matches can allocate, lock, capture, rely, publish metrics, or promote release gates.';

create index if not exists moral_trade_batch_clearing_objective_subject_idx
  on public.moral_trade_batch_clearing_objective_records (subject_type, subject_id, result_state, updated_at desc);

create index if not exists moral_trade_batch_clearing_objective_policy_idx
  on public.moral_trade_batch_clearing_objective_records (policy_snapshot_id, policy_status, result_state);

create index if not exists moral_trade_batch_clearing_objective_result_idx
  on public.moral_trade_batch_clearing_objective_records (objective_type, tie_break_fairness_rule_type, result_state);

alter table public.moral_trade_batch_clearing_objective_records enable row level security;
