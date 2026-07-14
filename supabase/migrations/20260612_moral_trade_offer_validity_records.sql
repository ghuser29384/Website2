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
      'direct_pair_clearing'
    )
  );

create table if not exists public.moral_trade_offer_validity_records (
  id uuid primary key default gen_random_uuid(),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  subject_type text not null check (
    subject_type in (
      'offset_offer',
      'pledge_swap_offer',
      'matched_trade_lock_proposal',
      'cleared_trade_agreement',
      'seed_template',
      'worked_example'
    )
  ),
  subject_id text not null,
  offer_validity_policy_ref text not null,
  policy_status text not null default 'missing' check (
    policy_status in ('resolved_immutable', 'missing', 'mutable', 'stale', 'superseded')
  ),
  baseline_snapshot_hash text not null check (baseline_snapshot_hash ~ '^sha256:[a-f0-9]{64}$'),
  terms_snapshot_hash text not null check (terms_snapshot_hash ~ '^sha256:[a-f0-9]{64}$'),
  empirical_assumption_snapshot_refs text[] not null default '{}',
  evidence_standard_refs_json jsonb not null default '[]'::jsonb,
  jurisdiction_policy_version text not null,
  recipient_or_destination_refs_json jsonb not null default '[]'::jsonb,
  valid_from timestamptz not null,
  offer_expires_at timestamptz not null,
  stale_at timestamptz not null,
  renewal_confirmation_record_refs text[] not null default '{}',
  stale_reason_codes_json jsonb not null default '[]'::jsonb,
  validity_state text not null default 'draft' check (
    validity_state in ('draft', 'valid', 'stale', 'expired', 'renewed', 'withdrawn', 'superseded', 'blocked')
  ),
  reviewer_decision_ref text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    jsonb_typeof(evidence_standard_refs_json) = 'array'
    and jsonb_typeof(recipient_or_destination_refs_json) = 'array'
    and jsonb_typeof(stale_reason_codes_json) = 'array'
  ),
  check (
    valid_from < offer_expires_at
    and valid_from <= stale_at
    and stale_at <= offer_expires_at
  ),
  check (
    validity_state not in ('valid', 'renewed')
    or (
      policy_status = 'resolved_immutable'
      and length(trim(offer_validity_policy_ref)) > 0
      and cardinality(empirical_assumption_snapshot_refs) > 0
      and jsonb_array_length(evidence_standard_refs_json) > 0
      and length(trim(jurisdiction_policy_version)) > 0
      and jsonb_array_length(recipient_or_destination_refs_json) > 0
      and jsonb_array_length(stale_reason_codes_json) = 0
      and reviewer_decision_ref is not null
      and reviewed_at is not null
    )
  ),
  check (
    validity_state <> 'renewed'
    or cardinality(renewal_confirmation_record_refs) > 0
  )
);

comment on table public.moral_trade_offer_validity_records is
  'First-class offer-validity records for donation-offset and pledge-swap offers. Records bind baseline snapshots, terms snapshots, empirical assumptions, evidence standards, jurisdiction policy, recipient/destination refs, validity windows, stale reasons, and renewed confirmations so stale or expired offers cannot become matchable, locked, captured, reliance-bearing, publicly counted, or release-promoted.';

create index if not exists moral_trade_offer_validity_subject_idx
  on public.moral_trade_offer_validity_records (subject_type, subject_id, validity_state, offer_expires_at);

create index if not exists moral_trade_offer_validity_policy_idx
  on public.moral_trade_offer_validity_records (policy_snapshot_id, policy_status, validity_state);

create index if not exists moral_trade_offer_validity_expiry_idx
  on public.moral_trade_offer_validity_records (stale_at, offer_expires_at, validity_state);

alter table public.moral_trade_offer_validity_records enable row level security;
