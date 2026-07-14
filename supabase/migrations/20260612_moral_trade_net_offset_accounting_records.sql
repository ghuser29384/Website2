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
      'direct_pair_clearing'
    )
  );

create table if not exists public.moral_trade_net_offset_accounting_records (
  id uuid primary key default gen_random_uuid(),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  subject_type text not null check (
    subject_type in (
      'offset_offer',
      'matched_trade_lock_proposal',
      'cleared_trade_agreement',
      'negative_commitment_scope',
      'evidence_record'
    )
  ),
  subject_id text not null,
  participant_id_hash text not null check (participant_id_hash ~ '^sha256:[a-f0-9]{64}$'),
  net_offset_accounting_policy_ref text not null,
  policy_status text not null default 'missing' check (
    policy_status in ('resolved_immutable', 'missing', 'mutable', 'stale', 'superseded')
  ),
  baseline_opposed_action_type text not null default 'unknown' check (
    baseline_opposed_action_type in (
      'donation',
      'abstention',
      'advocacy',
      'purchase',
      'service_use',
      'other',
      'unknown'
    )
  ),
  baseline_opposed_amount_cents bigint not null default 0 check (baseline_opposed_amount_cents >= 0),
  baseline_opposed_action_units numeric not null default 0 check (baseline_opposed_action_units >= 0),
  matched_canceled_amount_cents bigint not null default 0 check (matched_canceled_amount_cents >= 0),
  matched_canceled_action_units numeric not null default 0 check (matched_canceled_action_units >= 0),
  compromise_transfer_amount_cents bigint not null default 0 check (compromise_transfer_amount_cents >= 0),
  sponsor_or_match_amount_cents bigint not null default 0 check (sponsor_or_match_amount_cents >= 0),
  residual_opposed_amount_cents bigint not null default 0 check (residual_opposed_amount_cents >= 0),
  residual_opposed_action_units numeric not null default 0 check (residual_opposed_action_units >= 0),
  residual_action_policy text not null default 'manual_review' check (
    residual_action_policy in (
      'allowed_if_disclosed',
      'blocks_clearance',
      'manual_review',
      'not_applicable'
    )
  ),
  substitution_channel_review_state text not null default 'under_review' check (
    substitution_channel_review_state in (
      'not_required',
      'under_review',
      'non_blocking',
      'blocked',
      'manual_review',
      'superseded'
    )
  ),
  evidence_claim_refs_json jsonb not null default '[]'::jsonb,
  evidence_standard_ref text,
  net_offset_state text not null default 'draft' check (
    net_offset_state in (
      'draft',
      'previewed',
      'locked',
      'verified',
      'challenged',
      'blocked',
      'superseded'
    )
  ),
  reviewer_decision_ref text,
  public_participant_identity_bool boolean not null default false check (public_participant_identity_bool = false),
  public_private_baseline_details_bool boolean not null default false check (public_private_baseline_details_bool = false),
  public_substitution_channel_details_bool boolean not null default false check (public_substitution_channel_details_bool = false),
  public_reviewer_notes_bool boolean not null default false check (public_reviewer_notes_bool = false),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    jsonb_typeof(evidence_claim_refs_json) = 'array'
  ),
  check (
    matched_canceled_amount_cents <= baseline_opposed_amount_cents
    and matched_canceled_action_units <= baseline_opposed_action_units
  ),
  check (
    not (
      compromise_transfer_amount_cents > 0
      and matched_canceled_amount_cents = 0
      and matched_canceled_action_units = 0
    )
  ),
  check (
    residual_opposed_amount_cents = 0
    and residual_opposed_action_units = 0
    or residual_action_policy = 'allowed_if_disclosed'
  ),
  check (
    net_offset_state not in ('locked', 'verified')
    or (
      policy_status = 'resolved_immutable'
      and length(trim(net_offset_accounting_policy_ref)) > 0
      and baseline_opposed_action_type <> 'unknown'
      and (
        baseline_opposed_amount_cents > 0
        or baseline_opposed_action_units > 0
      )
      and (
        matched_canceled_amount_cents > 0
        or matched_canceled_action_units > 0
      )
      and substitution_channel_review_state in ('not_required', 'non_blocking')
      and jsonb_array_length(evidence_claim_refs_json) > 0
      and length(trim(coalesce(evidence_standard_ref, ''))) > 0
      and reviewer_decision_ref is not null
      and reviewed_at is not null
    )
  ),
  check (
    public_participant_identity_bool = false
    and public_private_baseline_details_bool = false
    and public_substitution_channel_details_bool = false
    and public_reviewer_notes_bool = false
  )
);

comment on table public.moral_trade_net_offset_accounting_records is
  'First-class net-offset accounting records for donation-offset and negative-commitment Moral Trade flows. Records distinguish baseline opposed action, matched canceled amount, compromise transfer, sponsor or match amount, residual opposed action, substitution-channel status, and evidence standard so gross transfers, sponsor matches, or payment evidence cannot count as moral-trade volume without a reviewed net canceled opposed action.';

create index if not exists moral_trade_net_offset_accounting_subject_idx
  on public.moral_trade_net_offset_accounting_records (subject_type, subject_id, net_offset_state, updated_at desc);

create index if not exists moral_trade_net_offset_accounting_policy_idx
  on public.moral_trade_net_offset_accounting_records (policy_snapshot_id, policy_status, net_offset_state);

create index if not exists moral_trade_net_offset_accounting_participant_idx
  on public.moral_trade_net_offset_accounting_records (participant_id_hash, baseline_opposed_action_type, updated_at desc);

alter table public.moral_trade_net_offset_accounting_records enable row level security;
