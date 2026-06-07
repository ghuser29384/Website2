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
      'baseline_manufacturing'
    )
  );

create table if not exists public.moral_trade_baseline_integrity_policies (
  id uuid primary key default gen_random_uuid(),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  policy_version text not null default 'moral-trade-baseline-integrity-v0.1-2026-06',
  subject_type text not null check (
    subject_type in (
      'offset_offer',
      'pledge_swap_offer',
      'matched_trade_lock_proposal',
      'cleared_trade_agreement'
    )
  ),
  status text not null default 'missing' check (
    status in ('passed', 'not_required_for_stage', 'missing', 'under_review', 'failed', 'stale', 'superseded')
  ),
  predates_offer_required_bool boolean not null default true,
  independent_reason_required_bool boolean not null default true,
  history_evidence_required_bool boolean not null default true,
  additionality_review_required_bool boolean not null default true,
  externality_review_required_bool boolean not null default true,
  reviewer_quality_required_bool boolean not null default true,
  participant_confirmation_required_bool boolean not null default true,
  good_faith_confidence_separation_required_bool boolean not null default true,
  private_evidence_publication_prohibited_bool boolean not null default true,
  max_assessment_age_days integer not null default 90 check (max_assessment_age_days > 0),
  policy_hash text not null check (policy_hash ~ '^sha256:[a-f0-9]{64}$'),
  reviewed_by text,
  reviewed_at timestamptz,
  superseded_by uuid references public.moral_trade_baseline_integrity_policies (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.moral_trade_baseline_integrity_policies is
  'Frozen baseline-integrity and baseline-manufacturing policies governing whether donation-offset and pledge-swap baselines predate marketplace exposure, have independent reasons, preserve good-faith/confidence separation, and require additionality/externality/reviewer/confirmation checks.';

create table if not exists public.moral_trade_baseline_integrity_assessments (
  id uuid primary key default gen_random_uuid(),
  baseline_integrity_policy_ref uuid not null references public.moral_trade_baseline_integrity_policies (id) on delete restrict,
  subject_type text not null check (
    subject_type in (
      'offset_offer',
      'pledge_swap_offer',
      'matched_trade_lock_proposal',
      'cleared_trade_agreement'
    )
  ),
  subject_ref text not null default '',
  assessment_state text not null default 'under_review' check (
    assessment_state in ('not_required', 'under_review', 'non_blocking', 'blocked', 'superseded', 'stale')
  ),
  launch_classification text not null default 'manual_review_required' check (
    launch_classification in ('clearable_moral_trade', 'preview_only', 'rejected_threat_externality', 'manual_review_required')
  ),
  baseline_source_kind text not null default 'unknown' check (
    baseline_source_kind in (
      'pre_existing_behavior',
      'independent_obligation',
      'historical_pattern',
      'marketplace_created',
      'marketplace_escalated',
      'counterparty_triggered',
      'unknown'
    )
  ),
  baseline_snapshot_hash text not null check (baseline_snapshot_hash ~ '^sha256:[a-f0-9]{64}$'),
  predates_offer_bool boolean not null default false,
  independent_reason_present_bool boolean not null default false,
  history_evidence_present_bool boolean not null default false,
  marketplace_created_bool boolean not null default false,
  marketplace_escalated_bool boolean not null default false,
  counterparty_triggered_escalation_bool boolean not null default false,
  harmful_baseline_escalated_bool boolean not null default false,
  good_faith_confidence_separated_bool boolean not null default false,
  additionality_review_status text not null default 'missing' check (
    additionality_review_status in ('passed', 'not_required_for_stage', 'missing', 'under_review', 'failed', 'stale', 'superseded')
  ),
  externality_review_status text not null default 'missing' check (
    externality_review_status in ('passed', 'not_required_for_stage', 'missing', 'under_review', 'failed', 'stale', 'superseded')
  ),
  reviewer_quality_status text not null default 'missing' check (
    reviewer_quality_status in ('passed', 'not_required_for_stage', 'missing', 'under_review', 'failed', 'stale', 'superseded')
  ),
  participant_confirmation_status text not null default 'missing' check (
    participant_confirmation_status in ('passed', 'not_required_for_stage', 'missing', 'under_review', 'failed', 'stale', 'superseded')
  ),
  private_evidence_public_bool boolean not null default false,
  assessment_hash text not null check (assessment_hash ~ '^sha256:[a-f0-9]{64}$'),
  review_decision_id uuid references public.moral_trade_review_decisions (id) on delete set null,
  reviewed_at timestamptz,
  expires_at timestamptz,
  superseded_by uuid references public.moral_trade_baseline_integrity_assessments (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.moral_trade_baseline_integrity_assessments is
  'First-class baseline-integrity and baseline-manufacturing assessments. Marketplace-created, marketplace-escalated, or counterparty-triggered harmful baselines keep donation offsets and pledge swaps preview-only or rejected-threat/externality until review is non-blocking.';

create index if not exists moral_trade_baseline_integrity_policies_subject_status_idx
  on public.moral_trade_baseline_integrity_policies (subject_type, status, reviewed_at desc);

create index if not exists moral_trade_baseline_integrity_assessments_policy_state_idx
  on public.moral_trade_baseline_integrity_assessments (baseline_integrity_policy_ref, assessment_state, reviewed_at desc);

create index if not exists moral_trade_baseline_integrity_assessments_subject_idx
  on public.moral_trade_baseline_integrity_assessments (subject_type, subject_ref, assessment_state, created_at desc);

alter table public.moral_trade_baseline_integrity_policies enable row level security;
alter table public.moral_trade_baseline_integrity_assessments enable row level security;
