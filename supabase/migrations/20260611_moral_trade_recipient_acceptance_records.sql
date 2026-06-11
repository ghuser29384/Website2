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
      'adverse_association'
    )
  );

create table if not exists public.moral_trade_recipient_acceptance_policies (
  id uuid primary key default gen_random_uuid(),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  release_stage text not null,
  subject_type text not null check (
    subject_type in (
      'donation_offset',
      'pledge_swap',
      'compensated_moral_action',
      'matched_trade_lock_proposal',
      'cleared_trade_agreement',
      'common_ground_budget_project'
    )
  ),
  policy_status text not null default 'missing' check (
    policy_status in ('resolved_immutable', 'missing', 'mutable', 'stale', 'superseded')
  ),
  requires_recipient_consent_bool boolean not null default true,
  requires_adverse_association_review_bool boolean not null default true,
  max_review_age_days integer not null default 90 check (max_review_age_days > 0),
  public_summary_allowed_bool boolean not null default true,
  policy_hash text not null check (policy_hash ~ '^sha256:[a-f0-9]{64}$'),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  expires_at timestamptz,
  superseded_by uuid references public.moral_trade_recipient_acceptance_policies (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (release_stage, subject_type, policy_snapshot_id),
  check (
    policy_status <> 'resolved_immutable'
    or (
      reviewed_at is not null
      and requires_recipient_consent_bool = true
      and requires_adverse_association_review_bool = true
    )
  )
);

comment on table public.moral_trade_recipient_acceptance_policies is
  'Frozen recipient-acceptance and adverse-association policies. Lock, payment, payout, public metric, and release-gate transitions fail closed when recipient acceptance or association review policy is missing, mutable, stale, or superseded.';

create table if not exists public.moral_trade_recipient_acceptance_records (
  id uuid primary key default gen_random_uuid(),
  recipient_acceptance_policy_id uuid not null references public.moral_trade_recipient_acceptance_policies (id) on delete restrict,
  recipient_ref text not null,
  subject_type text not null check (
    subject_type in (
      'donation_offset',
      'pledge_swap',
      'compensated_moral_action',
      'matched_trade_lock_proposal',
      'cleared_trade_agreement',
      'common_ground_budget_project'
    )
  ),
  subject_ref text not null,
  acceptance_status text not null default 'pending_recipient' check (
    acceptance_status in (
      'not_required_for_stage',
      'pending_recipient',
      'accepted',
      'conditional_acceptance',
      'declined',
      'expired',
      'revoked',
      'superseded',
      'blocked'
    )
  ),
  visible_user_status text not null default 'recipient_pending' check (
    visible_user_status in (
      'preview_only',
      'recipient_pending',
      'recipient_accepted',
      'accepted_with_conditions',
      'adverse_association_review',
      'declined_or_blocked',
      'expired_stale'
    )
  ),
  recipient_consent_hash text check (recipient_consent_hash is null or recipient_consent_hash ~ '^sha256:[a-f0-9]{64}$'),
  acceptance_scope_hash text not null check (acceptance_scope_hash ~ '^sha256:[a-f0-9]{64}$'),
  accepted_at timestamptz,
  conditional_terms_public_bool boolean not null default false,
  recipient_private_notes_public_bool boolean not null default false,
  donor_private_terms_public_bool boolean not null default false,
  reviewer_notes_public_bool boolean not null default false,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  expires_at timestamptz,
  superseded_by uuid references public.moral_trade_recipient_acceptance_records (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (recipient_ref, subject_type, subject_ref, recipient_acceptance_policy_id),
  check (
    acceptance_status not in ('accepted', 'conditional_acceptance')
    or (
      recipient_consent_hash is not null
      and accepted_at is not null
      and reviewed_at is not null
      and visible_user_status in ('recipient_accepted', 'accepted_with_conditions')
      and conditional_terms_public_bool = false
      and recipient_private_notes_public_bool = false
      and donor_private_terms_public_bool = false
      and reviewer_notes_public_bool = false
    )
  ),
  check (
    acceptance_status <> 'not_required_for_stage'
    or visible_user_status = 'preview_only'
  )
);

comment on table public.moral_trade_recipient_acceptance_records is
  'Hash-backed recipient acceptance records. Recipient decline, revocation, pending consent, expired acceptance, public private notes, public donor private terms, or reviewer-note leakage blocks lock, payment, payout, public metric, and release-gate transitions.';

create table if not exists public.moral_trade_adverse_association_reviews (
  id uuid primary key default gen_random_uuid(),
  recipient_acceptance_record_id uuid not null references public.moral_trade_recipient_acceptance_records (id) on delete restrict,
  recipient_acceptance_policy_id uuid not null references public.moral_trade_recipient_acceptance_policies (id) on delete restrict,
  review_status text not null default 'under_review' check (
    review_status in (
      'not_required_for_stage',
      'cleared',
      'mitigated',
      'under_review',
      'disclosed_nonblocking',
      'unresolved',
      'severe',
      'recipient_declined',
      'stale',
      'expired',
      'superseded',
      'blocked'
    )
  ),
  risk_class text not null default 'none' check (
    risk_class in ('none', 'low', 'medium', 'high', 'severe')
  ),
  visible_user_status text not null default 'adverse_association_review' check (
    visible_user_status in (
      'preview_only',
      'recipient_pending',
      'recipient_accepted',
      'accepted_with_conditions',
      'adverse_association_review',
      'declined_or_blocked',
      'expired_stale'
    )
  ),
  review_hash text not null check (review_hash ~ '^sha256:[a-f0-9]{64}$'),
  mitigation_hash text check (mitigation_hash is null or mitigation_hash ~ '^sha256:[a-f0-9]{64}$'),
  raw_association_evidence_public_bool boolean not null default false,
  recipient_identity_expansion_public_bool boolean not null default false,
  private_donor_reason_public_bool boolean not null default false,
  reviewer_notes_public_bool boolean not null default false,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  expires_at timestamptz,
  superseded_by uuid references public.moral_trade_adverse_association_reviews (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (recipient_acceptance_record_id, recipient_acceptance_policy_id),
  check (
    review_status not in ('cleared', 'mitigated', 'not_required_for_stage')
    or (
      reviewed_at is not null
      and visible_user_status in (
        'preview_only',
        'recipient_accepted',
        'accepted_with_conditions'
      )
      and raw_association_evidence_public_bool = false
      and recipient_identity_expansion_public_bool = false
      and private_donor_reason_public_bool = false
      and reviewer_notes_public_bool = false
    )
  ),
  check (
    review_status <> 'mitigated'
    or mitigation_hash is not null
  )
);

comment on table public.moral_trade_adverse_association_reviews is
  'Adverse-association review records for recipient acceptance. Public contract surfaces expose only status and risk-class categories, never raw association evidence, expanded recipient identity, private donor reasons, reviewer notes, or participant-specific review evidence.';

create index if not exists moral_trade_recipient_acceptance_policies_stage_idx
  on public.moral_trade_recipient_acceptance_policies (release_stage, subject_type, policy_status);

create index if not exists moral_trade_recipient_acceptance_records_subject_idx
  on public.moral_trade_recipient_acceptance_records (subject_type, subject_ref, acceptance_status, created_at desc);

create index if not exists moral_trade_recipient_acceptance_records_recipient_idx
  on public.moral_trade_recipient_acceptance_records (recipient_ref, acceptance_status, reviewed_at desc);

create index if not exists moral_trade_adverse_association_reviews_acceptance_idx
  on public.moral_trade_adverse_association_reviews (recipient_acceptance_record_id, review_status, risk_class);

create index if not exists moral_trade_adverse_association_reviews_policy_idx
  on public.moral_trade_adverse_association_reviews (recipient_acceptance_policy_id, review_status, reviewed_at desc);

alter table public.moral_trade_recipient_acceptance_policies enable row level security;
alter table public.moral_trade_recipient_acceptance_records enable row level security;
alter table public.moral_trade_adverse_association_reviews enable row level security;
