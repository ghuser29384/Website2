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
      'batch_clearing_objective',
      'sensitive_evidence_attestation'
    )
  );

create table if not exists public.moral_trade_sensitive_evidence_attestations (
  id uuid primary key default gen_random_uuid(),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  subject_type text not null check (
    subject_type in (
      'evidence_record',
      'impact_claim',
      'matched_trade_lock_proposal',
      'payout_milestone',
      'recipient_destination',
      'noncompensable_blocker_assessment',
      'appeal_case',
      'disclosure_decision'
    )
  ),
  subject_id text not null,
  evidence_path_type text not null check (
    evidence_path_type in (
      'private_receipt',
      'identity_artifact',
      'legal_capacity_artifact',
      'payment_destination_artifact',
      'source_note',
      'private_message',
      'protected_trait_evidence',
      'safety_report',
      'reviewer_note',
      'provider_record',
      'raw_private_artifact'
    )
  ),
  claim_type text not null check (
    claim_type in (
      'payment_receipt_verified',
      'destination_verified',
      'eligibility_verified',
      'baseline_scope_verified',
      'completion_evidence_verified',
      'impact_evidence_verified',
      'safety_review_non_blocking',
      'confidentiality_review_non_blocking',
      'uncertainty_present',
      'manual_review'
    )
  ),
  attestation_policy_ref text not null,
  policy_status text not null default 'missing' check (
    policy_status in ('resolved_immutable', 'missing', 'mutable', 'stale', 'superseded')
  ),
  raw_private_artifact_ref_hash text check (raw_private_artifact_ref_hash is null or raw_private_artifact_ref_hash ~ '^sha256:[a-f0-9]{64}$'),
  attestation_result_hash text check (attestation_result_hash is null or attestation_result_hash ~ '^sha256:[a-f0-9]{64}$'),
  uncertainty_statement text not null default '',
  scope_statement text not null default '',
  challenge_route text not null default '',
  disclosure_mode text not null default 'attestation_only' check (
    disclosure_mode in (
      'attestation_only',
      'counterparty_claim_typed_summary',
      'reviewer_raw_artifact',
      'privacy_grant_broader_disclosure',
      'public_suppressed'
    )
  ),
  privacy_grant_status text not null default 'missing' check (
    privacy_grant_status in ('not_required', 'granted_current', 'missing', 'expired', 'revoked', 'scope_mismatch')
  ),
  confidentiality_review_status text not null default 'missing' check (
    confidentiality_review_status in ('passed', 'not_required_for_stage', 'missing', 'under_review', 'failed', 'stale', 'superseded')
  ),
  counterparty_receives_raw_artifact_bool boolean not null default false,
  public_raw_artifact_bool boolean not null default false,
  result_state text not null default 'under_review' check (
    result_state in ('draft', 'attested', 'insufficient', 'challenged', 'under_review', 'blocked', 'superseded')
  ),
  reviewer_decision_ref text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    result_state <> 'attested'
    or (
      policy_status = 'resolved_immutable'
      and length(trim(attestation_policy_ref)) > 0
      and raw_private_artifact_ref_hash is not null
      and attestation_result_hash is not null
      and length(trim(uncertainty_statement)) >= 12
      and length(trim(scope_statement)) >= 12
      and challenge_route in (
        '/api/moral-trade/challenge-appeal/evaluate',
        '/api/moral-trade/challenge-appeal/enforce',
        '/api/moral-trade/challenge-appeal/contract'
      )
      and confidentiality_review_status = 'passed'
      and reviewer_decision_ref is not null
      and reviewed_at is not null
    )
  ),
  check (not public_raw_artifact_bool),
  check (
    not counterparty_receives_raw_artifact_bool
    or (
      disclosure_mode = 'privacy_grant_broader_disclosure'
      and privacy_grant_status = 'granted_current'
      and confidentiality_review_status = 'passed'
    )
  )
);

comment on table public.moral_trade_sensitive_evidence_attestations is
  'First-class sensitive-evidence attestation records. Counterparties receive claim-typed attestation results, uncertainty, scope, and challenge routes rather than raw private artifacts unless a privacy grant and passed confidentiality review explicitly allow broader disclosure.';

create index if not exists moral_trade_sensitive_evidence_attestations_subject_idx
  on public.moral_trade_sensitive_evidence_attestations (subject_type, subject_id, result_state, updated_at desc);

create index if not exists moral_trade_sensitive_evidence_attestations_policy_idx
  on public.moral_trade_sensitive_evidence_attestations (policy_snapshot_id, policy_status, result_state);

create index if not exists moral_trade_sensitive_evidence_attestations_claim_idx
  on public.moral_trade_sensitive_evidence_attestations (evidence_path_type, claim_type, disclosure_mode, result_state);

alter table public.moral_trade_sensitive_evidence_attestations enable row level security;
