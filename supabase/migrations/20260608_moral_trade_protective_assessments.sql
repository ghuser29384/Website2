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
      'performance_bond_neutral_review'
    )
  );

create table if not exists public.moral_trade_protective_assessment_records (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (
    subject_type in (
      'donation_offset',
      'pledge_swap',
      'compensated_moral_action',
      'performance_bond',
      'evidence_claim',
      'side_agreement',
      'recipient_choice',
      'common_ground_budget',
      'public_goods_round',
      'cleared_trade_agreement'
    )
  ),
  subject_ref text not null,
  assessment_dimension text not null check (
    assessment_dimension in (
      'negative_commitment_substitution',
      'action_reversibility_high_stakes',
      'donor_of_record_tax_receipt',
      'third_party_obligation',
      'representative_authority',
      'reporting_integrity_non_suppression',
      'civil_rights_discrimination',
      'participant_autonomy_undue_influence',
      'confidentiality_privacy_rights',
      'evidence_authenticity_synthetic_media',
      'financial_crime_fraud_source_of_funds',
      'agreement_non_transferability',
      'regulated_goods_hazardous_activity',
      'cyber_abuse_digital_systems_integrity',
      'anti_corruption_process_integrity',
      'least_intrusive_evidence',
      'performance_bond_neutral_review'
    )
  ),
  assessment_state text not null default 'under_review' check (
    assessment_state in (
      'not_triggered',
      'required',
      'under_review',
      'non_blocking',
      'blocked',
      'not_required_for_stage',
      'waived_by_neutral_review',
      'stale',
      'superseded',
      'missing'
    )
  ),
  risk_trigger text not null default 'unknown' check (
    risk_trigger in ('none', 'possible', 'confirmed', 'rejected', 'unknown')
  ),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  assessment_hash text not null check (assessment_hash ~ '^sha256:[a-f0-9]{64}$'),
  user_facing_reason_category text not null,
  evidence_plan_state text not null default 'under_review' check (
    evidence_plan_state in (
      'not_required_for_stage',
      'least_intrusive_approved',
      'high_burden_reviewer_approved',
      'under_review',
      'invasive_without_review',
      'missing',
      'stale',
      'superseded'
    )
  ),
  neutral_review_state text not null default 'under_review' check (
    neutral_review_state in (
      'not_required_for_stage',
      'approved_neutral',
      'under_review',
      'counterparty_benefits',
      'conflicted',
      'missing',
      'stale',
      'superseded'
    )
  ),
  reviewer_quality_state text not null default 'missing' check (
    reviewer_quality_state in (
      'authorized',
      'not_required_for_stage',
      'missing',
      'out_of_scope',
      'conflicted',
      'stale',
      'superseded'
    )
  ),
  participant_notice_state text not null default 'missing' check (
    participant_notice_state in ('sent', 'not_required_for_stage', 'missing', 'failed', 'stale')
  ),
  appeal_path_state text not null default 'missing' check (
    appeal_path_state in ('available', 'not_required_for_stage', 'missing', 'emergency_only', 'stale')
  ),
  reviewed_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz,
  superseded_by uuid references public.moral_trade_protective_assessment_records (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (subject_type, subject_ref, assessment_dimension, assessment_hash),
  check (
    assessment_state <> 'not_required_for_stage'
    or risk_trigger in ('none', 'rejected')
  ),
  check (
    assessment_state <> 'waived_by_neutral_review'
    or neutral_review_state = 'approved_neutral'
  )
);

comment on table public.moral_trade_protective_assessment_records is
  'First-class MoralTrade60 protective assessment records. Donation offsets, pledge swaps, compensated actions, performance bonds, and side agreements fail closed before lock, payment, payout, public completion, or release promotion unless every required assessment is non-blocking, not required under a frozen policy, or neutral-review waived.';

create index if not exists moral_trade_protective_assessment_subject_idx
on public.moral_trade_protective_assessment_records (subject_type, subject_ref);

create index if not exists moral_trade_protective_assessment_dimension_state_idx
on public.moral_trade_protective_assessment_records (assessment_dimension, assessment_state);

create table if not exists public.moral_trade_negative_commitment_scopes (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('donation_offset', 'pledge_swap', 'compensated_moral_action')),
  subject_ref text not null,
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  covered_action_hash text not null check (covered_action_hash ~ '^sha256:[a-f0-9]{64}$'),
  time_window_hash text not null check (time_window_hash ~ '^sha256:[a-f0-9]{64}$'),
  known_affiliates_substitutes_hash text not null check (known_affiliates_substitutes_hash ~ '^sha256:[a-f0-9]{64}$'),
  excluded_de_minimis_conduct_hash text not null check (excluded_de_minimis_conduct_hash ~ '^sha256:[a-f0-9]{64}$'),
  evidence_standard_hash text not null check (evidence_standard_hash ~ '^sha256:[a-f0-9]{64}$'),
  abstention_confidence_state text not null default 'manual_review' check (
    abstention_confidence_state in ('low', 'medium', 'high', 'manual_review', 'blocked')
  ),
  least_intrusive_evidence_state text not null default 'under_review' check (
    least_intrusive_evidence_state in ('least_intrusive_approved', 'under_review', 'invasive_without_review', 'blocked')
  ),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.moral_trade_action_reversibility_assessments (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('pledge_swap', 'compensated_moral_action', 'performance_bond')),
  subject_ref text not null,
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  reversibility_state text not null default 'under_review' check (
    reversibility_state in ('reversible', 'partly_reversible', 'effectively_irreversible', 'under_review', 'blocked')
  ),
  high_stakes_bool boolean not null default false,
  legal_review_state text not null default 'under_review' check (
    legal_review_state in ('not_required_for_stage', 'passed', 'under_review', 'blocked', 'stale')
  ),
  externality_review_state text not null default 'under_review' check (
    externality_review_state in ('not_required_for_stage', 'passed', 'under_review', 'blocked', 'stale')
  ),
  vulnerability_review_state text not null default 'under_review' check (
    vulnerability_review_state in ('not_required_for_stage', 'passed', 'under_review', 'blocked', 'stale')
  ),
  created_at timestamptz not null default timezone('utc', now()),
  check (
    high_stakes_bool = false
    or (
      legal_review_state = 'passed'
      and externality_review_state = 'passed'
      and vulnerability_review_state = 'passed'
    )
  )
);

create table if not exists public.moral_trade_donor_of_record_tax_reviews (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('donation_offset', 'public_goods_round', 'common_ground_budget')),
  subject_ref text not null,
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  donor_of_record_hash text not null check (donor_of_record_hash ~ '^sha256:[a-f0-9]{64}$'),
  receipt_beneficiary_hash text not null check (receipt_beneficiary_hash ~ '^sha256:[a-f0-9]{64}$'),
  tax_benefit_claim_state text not null default 'not_claimed' check (
    tax_benefit_claim_state in ('not_claimed', 'supported_by_policy', 'under_review', 'blocked')
  ),
  charitable_solicitation_review_state text not null default 'under_review' check (
    charitable_solicitation_review_state in ('not_required_for_stage', 'passed', 'under_review', 'blocked', 'stale')
  ),
  double_claim_review_state text not null default 'under_review' check (
    double_claim_review_state in ('not_required_for_stage', 'passed', 'under_review', 'blocked', 'stale')
  ),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.moral_trade_authority_obligation_assessments (
  id uuid primary key default gen_random_uuid(),
  assessment_type text not null check (
    assessment_type in ('third_party_obligation', 'representative_authority')
  ),
  subject_type text not null check (subject_type in ('donation_offset', 'pledge_swap', 'compensated_moral_action', 'side_agreement')),
  subject_ref text not null,
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  authority_scope_hash text check (authority_scope_hash is null or authority_scope_hash ~ '^sha256:[a-f0-9]{64}$'),
  obligations_hash text check (obligations_hash is null or obligations_hash ~ '^sha256:[a-f0-9]{64}$'),
  conflict_review_state text not null default 'under_review' check (
    conflict_review_state in ('not_required_for_stage', 'passed', 'under_review', 'blocked', 'disputed', 'stale')
  ),
  review_state text not null default 'under_review' check (
    review_state in ('not_required_for_stage', 'passed', 'under_review', 'blocked', 'disputed', 'stale')
  ),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists moral_trade_negative_commitment_subject_idx
on public.moral_trade_negative_commitment_scopes (subject_type, subject_ref);

create index if not exists moral_trade_action_reversibility_subject_idx
on public.moral_trade_action_reversibility_assessments (subject_type, subject_ref);

create index if not exists moral_trade_donor_tax_subject_idx
on public.moral_trade_donor_of_record_tax_reviews (subject_type, subject_ref);

create index if not exists moral_trade_authority_obligation_subject_idx
on public.moral_trade_authority_obligation_assessments (subject_type, subject_ref, assessment_type);

alter table public.moral_trade_protective_assessment_records enable row level security;
alter table public.moral_trade_negative_commitment_scopes enable row level security;
alter table public.moral_trade_action_reversibility_assessments enable row level security;
alter table public.moral_trade_donor_of_record_tax_reviews enable row level security;
alter table public.moral_trade_authority_obligation_assessments enable row level security;
