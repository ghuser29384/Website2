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
      'noncompensable_blocker'
    )
  );

create table if not exists public.moral_trade_noncompensable_blocker_assessments (
  id uuid primary key default gen_random_uuid(),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  subject_type text not null check (
    subject_type in (
      'offset_offer',
      'pledge_swap_offer',
      'matched_trade_lock_proposal',
      'cleared_trade_agreement',
      'compensated_action_terms',
      'pledge_performance_bond_record',
      'side_agreement_disclosure',
      'payment_event',
      'evidence_record',
      'dispute_case'
    )
  ),
  subject_id text not null,
  participant_id_hash text not null check (participant_id_hash ~ '^sha256:[a-f0-9]{64}$'),
  noncompensable_blocker_policy_ref text not null,
  policy_status text not null default 'missing' check (
    policy_status in ('resolved_immutable', 'missing', 'mutable', 'stale', 'superseded')
  ),
  protected_interest_type text not null check (
    protected_interest_type in (
      'participant_waivable_interest',
      'nonparticipant_interest',
      'legal_or_regulatory',
      'public_safety',
      'truthful_reporting',
      'civil_rights',
      'confidentiality_or_privacy',
      'institutional_process',
      'digital_system_integrity',
      'anti_threat',
      'other'
    )
  ),
  blocking_control_codes_json jsonb not null default '[]'::jsonb,
  attempted_compensation_or_waiver_state text not null default 'none' check (
    attempted_compensation_or_waiver_state in ('none', 'possible', 'under_review', 'blocking', 'superseded')
  ),
  personal_waiver_allowed_state text not null default 'not_applicable' check (
    personal_waiver_allowed_state in (
      'not_applicable',
      'allowed_with_renewed_confirmation',
      'disallowed',
      'disputed',
      'manual_review'
    )
  ),
  renewed_confirmation_record_refs text[] not null default '{}',
  review_state text not null default 'under_review' check (
    review_state in ('not_required', 'under_review', 'non_blocking', 'blocked', 'manual_review', 'superseded')
  ),
  reviewer_decision_ref text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (jsonb_typeof(blocking_control_codes_json) = 'array'),
  check (
    review_state = 'not_required'
    or jsonb_array_length(blocking_control_codes_json) > 0
  ),
  check (
    review_state <> 'non_blocking'
    or (
      policy_status = 'resolved_immutable'
      and length(trim(noncompensable_blocker_policy_ref)) > 0
      and reviewer_decision_ref is not null
      and reviewed_at is not null
    )
  ),
  check (
    protected_interest_type = 'participant_waivable_interest'
    or personal_waiver_allowed_state <> 'allowed_with_renewed_confirmation'
  ),
  check (
    protected_interest_type = 'participant_waivable_interest'
    or attempted_compensation_or_waiver_state not in ('possible', 'under_review', 'blocking')
    or review_state <> 'non_blocking'
  ),
  check (
    protected_interest_type <> 'participant_waivable_interest'
    or personal_waiver_allowed_state <> 'allowed_with_renewed_confirmation'
    or cardinality(renewed_confirmation_record_refs) > 0
  )
);

comment on table public.moral_trade_noncompensable_blocker_assessments is
  'First-class noncompensable blocker assessments for safety, legal, privacy, third-party-rights, reporting-integrity, civil-rights, confidentiality, regulated-goods, cyber-abuse, financial-crime, anti-threat, and process-integrity controls. These blockers are constraints, not prices, and side payments, higher donations, performance bonds, reciprocal favors, private agreements, or private waivers cannot clear them by themselves.';

create index if not exists moral_trade_noncompensable_blocker_subject_idx
  on public.moral_trade_noncompensable_blocker_assessments (subject_type, subject_id, review_state, updated_at desc);

create index if not exists moral_trade_noncompensable_blocker_participant_idx
  on public.moral_trade_noncompensable_blocker_assessments (participant_id_hash, protected_interest_type, review_state);

create index if not exists moral_trade_noncompensable_blocker_policy_idx
  on public.moral_trade_noncompensable_blocker_assessments (policy_snapshot_id, policy_status, review_state);

alter table public.moral_trade_noncompensable_blocker_assessments enable row level security;
