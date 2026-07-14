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
      'direct_pair_clearing'
    )
  );

create table if not exists public.moral_trade_resource_compatibility_assessments (
  id uuid primary key default gen_random_uuid(),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  subject_type text not null check (
    subject_type in (
      'offset_offer',
      'pledge_swap_offer',
      'matched_trade_lock_proposal',
      'cleared_trade_agreement',
      'compensated_action_terms',
      'negative_commitment_scope',
      'side_agreement_disclosure'
    )
  ),
  subject_id text not null,
  participant_ids_hash text not null check (participant_ids_hash ~ '^sha256:[a-f0-9]{64}$'),
  resource_compatibility_policy_ref text not null,
  policy_status text not null default 'missing' check (
    policy_status in ('resolved_immutable', 'missing', 'mutable', 'stale', 'superseded')
  ),
  resource_or_action_conflict_type text not null default 'unknown' check (
    resource_or_action_conflict_type in (
      'none_disclosed',
      'mutually_exclusive_resource',
      'mutually_exclusive_action',
      'incompatible_destination',
      'incompatible_timing',
      'zero_sum_control_claim',
      'third_party_control_conflict',
      'manual_review',
      'unknown'
    )
  ),
  joint_feasibility_state text not null default 'under_review' check (
    joint_feasibility_state in (
      'feasible',
      'feasible_with_conditions',
      'under_review',
      'infeasible_blocking',
      'disputed',
      'manual_review',
      'superseded'
    )
  ),
  hybrid_or_compromise_good_state text not null default 'unclear' check (
    hybrid_or_compromise_good_state in (
      'not_applicable',
      'identified',
      'unclear',
      'blocked',
      'manual_review'
    )
  ),
  incompatible_duty_or_control_refs_json jsonb not null default '[]'::jsonb,
  review_state text not null default 'under_review' check (
    review_state in (
      'not_required',
      'under_review',
      'non_blocking',
      'blocked',
      'manual_review',
      'superseded'
    )
  ),
  reviewer_decision_ref text,
  public_participant_identity_bool boolean not null default false check (public_participant_identity_bool = false),
  public_private_duties_or_constraints_bool boolean not null default false check (public_private_duties_or_constraints_bool = false),
  public_private_resource_claims_bool boolean not null default false check (public_private_resource_claims_bool = false),
  public_reviewer_notes_bool boolean not null default false check (public_reviewer_notes_bool = false),
  public_third_party_control_facts_bool boolean not null default false check (public_third_party_control_facts_bool = false),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    jsonb_typeof(incompatible_duty_or_control_refs_json) = 'array'
  ),
  check (
    resource_or_action_conflict_type in ('none_disclosed', 'manual_review', 'unknown')
    or jsonb_array_length(incompatible_duty_or_control_refs_json) > 0
  ),
  check (
    review_state <> 'non_blocking'
    or (
      policy_status = 'resolved_immutable'
      and length(trim(resource_compatibility_policy_ref)) > 0
      and resource_or_action_conflict_type = 'none_disclosed'
      and joint_feasibility_state in ('feasible', 'feasible_with_conditions')
      and hybrid_or_compromise_good_state in ('not_applicable', 'identified')
      and reviewer_decision_ref is not null
      and reviewed_at is not null
    )
  ),
  check (
    public_participant_identity_bool = false
    and public_private_duties_or_constraints_bool = false
    and public_private_resource_claims_bool = false
    and public_reviewer_notes_bool = false
    and public_third_party_control_facts_bool = false
  )
);

comment on table public.moral_trade_resource_compatibility_assessments is
  'First-class resource-compatibility and joint-feasibility assessments for non-public-goods trades. Non-blocking assessments require immutable policy, jointly feasible actions, donations, abstentions, destinations, timing, duties, and control claims, and block zero-sum control claims, mutually exclusive resources or actions, incompatible destination or timing, and third-party-control conflicts without exposing participant identity hashes, private duties, private resource claims, reviewer notes, or third-party control facts.';

create index if not exists moral_trade_resource_compatibility_subject_idx
  on public.moral_trade_resource_compatibility_assessments (subject_type, subject_id, review_state, updated_at desc);

create index if not exists moral_trade_resource_compatibility_policy_idx
  on public.moral_trade_resource_compatibility_assessments (policy_snapshot_id, policy_status, review_state);

create index if not exists moral_trade_resource_compatibility_conflict_idx
  on public.moral_trade_resource_compatibility_assessments (resource_or_action_conflict_type, joint_feasibility_state, review_state);

alter table public.moral_trade_resource_compatibility_assessments enable row level security;
