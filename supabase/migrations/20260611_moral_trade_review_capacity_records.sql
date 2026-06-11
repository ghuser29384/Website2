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
      'review_queue_admission'
    )
  );

create table if not exists public.moral_trade_review_capacity_policies (
  id uuid primary key default gen_random_uuid(),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  release_stage text not null,
  subject_type text not null check (
    subject_type in (
      'donation_offset',
      'pledge_swap',
      'compensated_moral_action',
      'performance_bond_condition',
      'side_agreement',
      'matched_trade_lock_proposal',
      'cleared_trade_agreement'
    )
  ),
  policy_status text not null default 'missing' check (
    policy_status in ('resolved_immutable', 'missing', 'mutable', 'stale', 'superseded')
  ),
  max_open_queue_depth integer not null check (max_open_queue_depth >= 0),
  max_estimated_wait_days integer not null check (max_estimated_wait_days >= 0),
  min_eligible_reviewer_count integer not null check (min_eligible_reviewer_count >= 0),
  neutral_panel_required_bool boolean not null default false,
  max_baseline_age_days integer not null check (max_baseline_age_days >= 0),
  max_payment_authorization_age_days integer not null check (max_payment_authorization_age_days >= 0),
  policy_hash text not null check (policy_hash ~ '^sha256:[a-f0-9]{64}$'),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  expires_at timestamptz,
  superseded_by uuid references public.moral_trade_review_capacity_policies (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (release_stage, subject_type, policy_snapshot_id),
  check (
    policy_status <> 'resolved_immutable'
    or (
      max_open_queue_depth > 0
      and max_estimated_wait_days > 0
      and min_eligible_reviewer_count > 0
      and max_baseline_age_days > 0
      and max_payment_authorization_age_days > 0
      and reviewed_at is not null
    )
  )
);

comment on table public.moral_trade_review_capacity_policies is
  'Frozen review-capacity policies for non-public-goods release stages. Live, matchable, payable, reliance-bearing, and public-metric transitions must fail closed when review capacity, reviewer eligibility, neutral-panel requirements, or freshness windows are missing or stale.';

create table if not exists public.moral_trade_review_queue_records (
  id uuid primary key default gen_random_uuid(),
  review_capacity_policy_id uuid not null references public.moral_trade_review_capacity_policies (id) on delete restrict,
  subject_type text not null check (
    subject_type in (
      'donation_offset',
      'pledge_swap',
      'compensated_moral_action',
      'performance_bond_condition',
      'side_agreement',
      'matched_trade_lock_proposal',
      'cleared_trade_agreement'
    )
  ),
  subject_ref text not null,
  queue_state text not null default 'preview_only' check (
    queue_state in ('preview_only', 'admitted', 'waitlisted', 'expired', 'blocked', 'superseded')
  ),
  queue_position integer check (queue_position is null or queue_position > 0),
  open_queue_depth integer not null default 0 check (open_queue_depth >= 0),
  eligible_reviewer_count integer not null default 0 check (eligible_reviewer_count >= 0),
  neutral_panel_available_bool boolean not null default false,
  visible_user_queue_status text not null check (
    visible_user_queue_status in (
      'preview',
      'in_review_queue',
      'waitlisted_capacity',
      'review_delayed',
      'expired_stale',
      'blocked_needs_review',
      'ready_for_review'
    )
  ),
  user_status_copy_hash text not null check (user_status_copy_hash ~ '^sha256:[a-f0-9]{64}$'),
  estimated_review_by timestamptz,
  baseline_expires_at timestamptz,
  payment_authorization_expires_at timestamptz,
  private_queue_reason_public_bool boolean not null default false,
  reviewer_identity_public_bool boolean not null default false,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  expires_at timestamptz,
  superseded_by uuid references public.moral_trade_review_queue_records (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (subject_type, subject_ref, review_capacity_policy_id),
  check (
    queue_state <> 'admitted'
    or (
      queue_position is not null
      and eligible_reviewer_count > 0
      and estimated_review_by is not null
      and visible_user_queue_status in ('in_review_queue', 'ready_for_review')
      and private_queue_reason_public_bool = false
      and reviewer_identity_public_bool = false
      and reviewed_at is not null
    )
  ),
  check (baseline_expires_at is null or estimated_review_by is null or estimated_review_by <= baseline_expires_at),
  check (payment_authorization_expires_at is null or estimated_review_by is null or estimated_review_by <= payment_authorization_expires_at)
);

comment on table public.moral_trade_review_queue_records is
  'Review queue-admission records for non-public-goods offers and locks. Overflow, waitlisted, blocked, expired, stale, or private-status-leaking queue records keep offers preview-only rather than silently accumulating unreviewed promises.';

create table if not exists public.moral_trade_reviewer_panel_assignments (
  id uuid primary key default gen_random_uuid(),
  review_queue_record_id uuid not null references public.moral_trade_review_queue_records (id) on delete restrict,
  assignment_state text not null default 'missing' check (
    assignment_state in ('eligible', 'missing', 'conflicted', 'unavailable', 'stale', 'superseded')
  ),
  reviewer_count integer not null default 0 check (reviewer_count >= 0),
  neutral_reviewer_count integer not null default 0 check (neutral_reviewer_count >= 0),
  conflict_screening_state text not null default 'missing' check (
    conflict_screening_state in (
      'passed',
      'disclosed_nonblocking',
      'not_required_for_stage',
      'missing',
      'unresolved',
      'conflicted',
      'superseded'
    )
  ),
  reviewer_quality_state text not null default 'missing' check (
    reviewer_quality_state in (
      'current',
      'not_required_for_stage',
      'missing',
      'failed',
      'stale',
      'superseded'
    )
  ),
  assignment_hash text not null check (assignment_hash ~ '^sha256:[a-f0-9]{64}$'),
  reviewer_identity_public_bool boolean not null default false,
  conflict_facts_public_bool boolean not null default false,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  expires_at timestamptz,
  superseded_by uuid references public.moral_trade_reviewer_panel_assignments (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (review_queue_record_id),
  check (
    assignment_state <> 'eligible'
    or (
      reviewer_count > 0
      and conflict_screening_state in ('passed', 'disclosed_nonblocking', 'not_required_for_stage')
      and reviewer_quality_state in ('current', 'not_required_for_stage')
      and reviewer_identity_public_bool = false
      and conflict_facts_public_bool = false
      and reviewed_at is not null
    )
  )
);

comment on table public.moral_trade_reviewer_panel_assignments is
  'Reviewer and neutral-panel assignment records for review-capacity admission. Public contract surfaces expose only status categories, never reviewer identities, conflict facts, or reviewer notes.';

create index if not exists moral_trade_review_capacity_policies_stage_idx
  on public.moral_trade_review_capacity_policies (release_stage, subject_type, policy_status);

create index if not exists moral_trade_review_queue_records_subject_idx
  on public.moral_trade_review_queue_records (subject_type, subject_ref, queue_state, created_at desc);

create index if not exists moral_trade_review_queue_records_policy_idx
  on public.moral_trade_review_queue_records (review_capacity_policy_id, queue_state, estimated_review_by);

create index if not exists moral_trade_reviewer_panel_assignments_queue_idx
  on public.moral_trade_reviewer_panel_assignments (review_queue_record_id, assignment_state, reviewed_at desc);

alter table public.moral_trade_review_capacity_policies enable row level security;
alter table public.moral_trade_review_queue_records enable row level security;
alter table public.moral_trade_reviewer_panel_assignments enable row level security;
