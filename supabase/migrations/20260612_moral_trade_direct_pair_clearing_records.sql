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
      'direct_pair_clearing'
    )
  );

create table if not exists public.moral_trade_direct_pair_clearing_records (
  id uuid primary key default gen_random_uuid(),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  trade_type text not null check (
    trade_type in ('donation_offset', 'pledge_swap', 'compensated_moral_action', 'manual_review')
  ),
  source_offer_ids text[] not null default '{}',
  matched_trade_lock_proposal_ref text,
  initiator_participant_id_hash text not null check (initiator_participant_id_hash ~ '^sha256:[a-f0-9]{64}$'),
  invited_or_known_counterparty_id_hash text not null check (invited_or_known_counterparty_id_hash ~ '^sha256:[a-f0-9]{64}$'),
  invite_or_known_counterparty_ref text not null,
  direct_pair_clearing_policy_ref text not null,
  policy_status text not null default 'missing' check (
    policy_status in ('resolved_immutable', 'missing', 'mutable', 'stale', 'superseded')
  ),
  no_background_networking_bool boolean not null default true,
  two_party_terms_snapshot_hash text not null check (two_party_terms_snapshot_hash ~ '^sha256:[a-f0-9]{64}$'),
  final_confirmation_record_refs text[] not null default '{}',
  privacy_grant_refs text[] not null default '{}',
  user_safety_review_state text not null default 'not_started' check (
    user_safety_review_state in ('not_started', 'under_review', 'non_blocking', 'blocked', 'manual_review', 'superseded')
  ),
  matching_clearing_run_ref text,
  direct_pair_state text not null default 'draft' check (
    direct_pair_state in ('draft', 'invited', 'previewed', 'both_confirmed', 'locked', 'expired', 'withdrawn', 'superseded', 'blocked')
  ),
  ordinary_lock_review_payment_privacy_gates_status text not null default 'missing' check (
    ordinary_lock_review_payment_privacy_gates_status in ('passed', 'not_required_for_stage', 'missing', 'under_review', 'blocked', 'stale', 'superseded')
  ),
  reviewer_decision_ref text,
  public_counterparty_identity_bool boolean not null default false check (public_counterparty_identity_bool = false),
  public_direct_contact_details_bool boolean not null default false check (public_direct_contact_details_bool = false),
  public_exact_caps_bool boolean not null default false check (public_exact_caps_bool = false),
  public_private_notes_bool boolean not null default false check (public_private_notes_bool = false),
  public_private_surplus_bool boolean not null default false check (public_private_surplus_bool = false),
  autonomous_outreach_attempted_bool boolean not null default false check (autonomous_outreach_attempted_bool = false),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (cardinality(source_offer_ids) <= 2),
  check (
    direct_pair_state not in ('both_confirmed', 'locked')
    or (
      trade_type in ('donation_offset', 'pledge_swap')
      and cardinality(source_offer_ids) > 0
      and matched_trade_lock_proposal_ref is not null
      and length(trim(invite_or_known_counterparty_ref)) > 0
      and length(trim(direct_pair_clearing_policy_ref)) > 0
      and policy_status = 'resolved_immutable'
      and no_background_networking_bool = true
      and cardinality(final_confirmation_record_refs) >= 2
      and cardinality(privacy_grant_refs) > 0
      and user_safety_review_state = 'non_blocking'
      and matching_clearing_run_ref is not null
      and ordinary_lock_review_payment_privacy_gates_status = 'passed'
      and reviewer_decision_ref is not null
    )
  )
);

comment on table public.moral_trade_direct_pair_clearing_records is
  'Frozen direct-pair clearing records for known or invite-linked two-party donation-offset and pledge-swap previews. Confirmed or locked records require no background networking, both-party confirmations, privacy grants, user-safety review, matching-clearing linkage, reviewer decision, and ordinary lock/review/payment/privacy gates before any lock, capture, public metric, or release gate can rely on them.';

create index if not exists moral_trade_direct_pair_clearing_records_state_idx
  on public.moral_trade_direct_pair_clearing_records (direct_pair_state, trade_type, created_at desc);

create index if not exists moral_trade_direct_pair_clearing_records_policy_idx
  on public.moral_trade_direct_pair_clearing_records (policy_snapshot_id, direct_pair_state);

create index if not exists moral_trade_direct_pair_clearing_records_lock_idx
  on public.moral_trade_direct_pair_clearing_records (matched_trade_lock_proposal_ref, direct_pair_state);

alter table public.moral_trade_direct_pair_clearing_records enable row level security;
