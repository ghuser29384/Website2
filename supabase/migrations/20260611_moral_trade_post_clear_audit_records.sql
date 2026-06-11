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
      'post_clear_audit'
    )
  );

create table if not exists public.moral_trade_post_clear_audit_policies (
  id uuid primary key default gen_random_uuid(),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  release_stage text not null,
  policy_status text not null default 'missing' check (
    policy_status in ('resolved_immutable', 'missing', 'mutable', 'stale', 'superseded')
  ),
  policy_hash text not null check (policy_hash ~ '^sha256:[a-f0-9]{64}$'),
  sampled_subject_types text[] not null default array[
    'cleared_trade_agreement',
    'matched_trade_lock_proposal',
    'payment_event',
    'evidence_record',
    'payout_milestone',
    'impact_claim_record'
  ],
  audit_types text[] not null default array[
    'random_sample',
    'risk_triggered',
    'dispute_triggered',
    'payment_triggered',
    'evidence_triggered',
    'recipient_triggered',
    'classification_triggered',
    'manual_review'
  ],
  max_policy_age_days integer not null default 120 check (max_policy_age_days > 0),
  requires_term_sheet_match_bool boolean not null default true,
  requires_baseline_evidence_match_bool boolean not null default true,
  requires_recipient_acceptance_match_bool boolean not null default true,
  requires_payment_reconciliation_match_bool boolean not null default true,
  requires_privacy_disclosure_match_bool boolean not null default true,
  requires_classification_match_bool boolean not null default true,
  prohibits_public_reputation_effect_bool boolean not null default true,
  permits_correction_only_under_frozen_policy_bool boolean not null default true,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  expires_at timestamptz,
  superseded_by uuid references public.moral_trade_post_clear_audit_policies (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (release_stage, policy_snapshot_id),
  check (
    sampled_subject_types <@ array[
      'cleared_trade_agreement',
      'matched_trade_lock_proposal',
      'payment_event',
      'evidence_record',
      'payout_milestone',
      'impact_claim_record'
    ]
  ),
  check (
    audit_types <@ array[
      'random_sample',
      'risk_triggered',
      'dispute_triggered',
      'payment_triggered',
      'evidence_triggered',
      'recipient_triggered',
      'classification_triggered',
      'manual_review'
    ]
  ),
  check (
    policy_status <> 'resolved_immutable'
    or (
      reviewed_at is not null
      and prohibits_public_reputation_effect_bool = true
      and permits_correction_only_under_frozen_policy_bool = true
    )
  )
);

comment on table public.moral_trade_post_clear_audit_policies is
  'Frozen post-clear audit policies. Public metrics, payout release, reconciliation close, and release promotion fail closed when required post-clear audit sampling is missing, mutable, stale, superseded, unresolved, or privacy-leaking.';

create table if not exists public.moral_trade_post_clear_audit_records (
  id uuid primary key default gen_random_uuid(),
  post_clear_audit_policy_id uuid not null references public.moral_trade_post_clear_audit_policies (id) on delete restrict,
  subject_type text not null check (
    subject_type in (
      'cleared_trade_agreement',
      'matched_trade_lock_proposal',
      'payment_event',
      'evidence_record',
      'payout_milestone',
      'impact_claim_record'
    )
  ),
  subject_ref text not null,
  audit_type text not null check (
    audit_type in (
      'random_sample',
      'risk_triggered',
      'dispute_triggered',
      'payment_triggered',
      'evidence_triggered',
      'recipient_triggered',
      'classification_triggered',
      'manual_review'
    )
  ),
  sampled_fields_json jsonb not null default '{}'::jsonb,
  sampled_fields_hash text not null check (sampled_fields_hash ~ '^sha256:[a-f0-9]{64}$'),
  term_sheet_match_state text not null default 'not_checked' check (
    term_sheet_match_state in ('not_checked', 'matched', 'mismatch', 'manual_review')
  ),
  baseline_and_evidence_match_state text not null default 'not_checked' check (
    baseline_and_evidence_match_state in ('not_checked', 'matched', 'mismatch', 'manual_review')
  ),
  recipient_acceptance_match_state text not null default 'not_checked' check (
    recipient_acceptance_match_state in ('not_checked', 'matched', 'mismatch', 'manual_review')
  ),
  payment_and_reconciliation_match_state text not null default 'not_checked' check (
    payment_and_reconciliation_match_state in ('not_checked', 'matched', 'mismatch', 'manual_review')
  ),
  privacy_or_disclosure_match_state text not null default 'not_checked' check (
    privacy_or_disclosure_match_state in ('not_checked', 'matched', 'mismatch', 'manual_review')
  ),
  classification_match_state text not null default 'not_checked' check (
    classification_match_state in ('not_checked', 'matched', 'mismatch', 'manual_review')
  ),
  corrective_action_refs_json jsonb not null default '[]'::jsonb,
  public_reputation_effect_prohibited_bool boolean not null default true check (
    public_reputation_effect_prohibited_bool = true
  ),
  audit_state text not null default 'pending' check (
    audit_state in (
      'pending',
      'passed',
      'failed',
      'corrective_action_open',
      'closed',
      'superseded'
    )
  ),
  reviewer_decision_ref text,
  raw_payment_evidence_public_bool boolean not null default false,
  private_counterparty_terms_public_bool boolean not null default false,
  reviewer_notes_public_bool boolean not null default false,
  raw_reconciliation_rows_public_bool boolean not null default false,
  provider_payload_public_bool boolean not null default false,
  participant_specific_rows_public_bool boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (subject_type, subject_ref, audit_type, post_clear_audit_policy_id),
  check (
    audit_state not in ('passed', 'closed')
    or (
      reviewer_decision_ref is not null
      and public_reputation_effect_prohibited_bool = true
    )
  ),
  check (
    audit_state <> 'passed'
    or (
      term_sheet_match_state = 'matched'
      and baseline_and_evidence_match_state = 'matched'
      and recipient_acceptance_match_state = 'matched'
      and payment_and_reconciliation_match_state = 'matched'
      and privacy_or_disclosure_match_state = 'matched'
      and classification_match_state = 'matched'
    )
  ),
  check (
    raw_payment_evidence_public_bool = false
    and private_counterparty_terms_public_bool = false
    and reviewer_notes_public_bool = false
    and raw_reconciliation_rows_public_bool = false
    and provider_payload_public_bool = false
    and participant_specific_rows_public_bool = false
  )
);

comment on table public.moral_trade_post_clear_audit_records is
  'Hash-backed post-clear audit records. Records sample completed non-public-goods trades against frozen baselines, evidence, recipient acceptance, disclosure, payment, classification, and term sheets without exposing raw payment evidence, private counterparty terms, reviewer notes, raw provider payloads, or participant-specific audit rows.';

create index if not exists moral_trade_post_clear_audit_policies_stage_idx
  on public.moral_trade_post_clear_audit_policies (release_stage, policy_status);

create index if not exists moral_trade_post_clear_audit_records_subject_idx
  on public.moral_trade_post_clear_audit_records (subject_type, subject_ref, audit_state, created_at desc);

create index if not exists moral_trade_post_clear_audit_records_policy_idx
  on public.moral_trade_post_clear_audit_records (post_clear_audit_policy_id, audit_type, updated_at desc);

alter table public.moral_trade_post_clear_audit_policies enable row level security;
alter table public.moral_trade_post_clear_audit_records enable row level security;
