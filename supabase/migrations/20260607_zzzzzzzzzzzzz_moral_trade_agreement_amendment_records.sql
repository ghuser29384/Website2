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
      'agreement_amendment'
    )
  );

create table if not exists public.moral_trade_agreement_amendment_policies (
  id uuid primary key default gen_random_uuid(),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  policy_version text not null default 'moral-trade-agreement-amendments-v0.1-2026-06',
  subject_type text not null check (
    subject_type in (
      'locked_donation_offset',
      'locked_pledge_swap',
      'matched_trade_lock_proposal',
      'cleared_trade_agreement'
    )
  ),
  amendment_type text not null check (
    amendment_type in (
      'correction',
      'mutual_modification',
      'pause',
      'early_termination',
      'evidence_standard_change',
      'schedule_change',
      'compensation_change',
      'destination_change',
      'baseline_correction',
      'privacy_change',
      'other'
    )
  ),
  status text not null default 'missing' check (
    status in ('passed', 'not_required_for_stage', 'missing', 'under_review', 'failed', 'stale', 'superseded')
  ),
  renewed_confirmation_required_bool boolean not null default true,
  neutral_review_required_for_burden_shift_bool boolean not null default true,
  non_retroactivity_required_bool boolean not null default true,
  before_after_hash_required_bool boolean not null default true,
  notice_required_bool boolean not null default true,
  reviewer_quality_required_bool boolean not null default true,
  baseline_integrity_required_bool boolean not null default true,
  max_amendment_age_days integer not null default 45 check (max_amendment_age_days > 0),
  policy_hash text not null check (policy_hash ~ '^sha256:[a-f0-9]{64}$'),
  reviewed_by text,
  reviewed_at timestamptz,
  superseded_by uuid references public.moral_trade_agreement_amendment_policies (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.moral_trade_agreement_amendment_policies is
  'Frozen agreement-amendment policies governing renewed confirmations, non-retroactivity, before/after hashes, notice, reviewer quality, baseline integrity, and neutral review before material post-lock changes.';

create table if not exists public.moral_trade_agreement_amendment_records (
  id uuid primary key default gen_random_uuid(),
  agreement_amendment_policy_ref uuid not null references public.moral_trade_agreement_amendment_policies (id) on delete restrict,
  subject_type text not null check (
    subject_type in (
      'locked_donation_offset',
      'locked_pledge_swap',
      'matched_trade_lock_proposal',
      'cleared_trade_agreement'
    )
  ),
  subject_ref text not null default '',
  amendment_type text not null check (
    amendment_type in (
      'correction',
      'mutual_modification',
      'pause',
      'early_termination',
      'evidence_standard_change',
      'schedule_change',
      'compensation_change',
      'destination_change',
      'baseline_correction',
      'privacy_change',
      'other'
    )
  ),
  amendment_state text not null default 'draft' check (
    amendment_state in ('draft', 'presented', 'confirmed', 'approved', 'applied', 'rejected', 'withdrawn', 'superseded', 'stale')
  ),
  material_change_bool boolean not null default true,
  burden_or_benefit_shift_bool boolean not null default false,
  parent_record_edit_detected_bool boolean not null default false,
  retroactive_performance_change_bool boolean not null default false,
  evidence_claim_retyped_bool boolean not null default false,
  exposure_increase_bool boolean not null default false,
  funds_redirect_bool boolean not null default false,
  compensation_change_bool boolean not null default false,
  cancellation_rights_narrowed_bool boolean not null default false,
  privacy_disclosure_change_bool boolean not null default false,
  donor_of_record_change_bool boolean not null default false,
  third_party_obligation_change_bool boolean not null default false,
  before_terms_hash text not null check (before_terms_hash ~ '^sha256:[a-f0-9]{64}$'),
  after_terms_hash text not null check (after_terms_hash ~ '^sha256:[a-f0-9]{64}$'),
  policy_snapshot_bundle_hash text not null check (policy_snapshot_bundle_hash ~ '^sha256:[a-f0-9]{64}$'),
  renewed_confirmation_refs uuid[] not null default '{}'::uuid[],
  confirmation_state text not null default 'missing' check (
    confirmation_state in ('missing', 'stale', 'scope_mismatch', 'passed', 'not_required_for_stage')
  ),
  neutral_review_status text not null default 'missing' check (
    neutral_review_status in ('passed', 'not_required_for_stage', 'missing', 'under_review', 'failed', 'stale', 'superseded')
  ),
  notice_status text not null default 'missing' check (
    notice_status in ('passed', 'not_required_for_stage', 'missing', 'under_review', 'failed', 'stale', 'superseded')
  ),
  reviewer_quality_status text not null default 'missing' check (
    reviewer_quality_status in ('passed', 'not_required_for_stage', 'missing', 'under_review', 'failed', 'stale', 'superseded')
  ),
  baseline_integrity_status text not null default 'missing' check (
    baseline_integrity_status in ('passed', 'not_required_for_stage', 'missing', 'under_review', 'failed', 'stale', 'superseded')
  ),
  amendment_hash text not null check (amendment_hash ~ '^sha256:[a-f0-9]{64}$'),
  review_decision_id uuid references public.moral_trade_review_decisions (id) on delete set null,
  reviewed_at timestamptz,
  expires_at timestamptz,
  applied_at timestamptz,
  superseded_by uuid references public.moral_trade_agreement_amendment_records (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.moral_trade_agreement_amendment_records is
  'Append-only agreement-amendment records. Parent-record edits, retroactive performance changes, retyped evidence claims, unconfirmed exposure/funds/compensation/privacy changes, and missing neutral or reviewer-quality checks fail closed before material post-lock changes.';

create index if not exists moral_trade_agreement_amendment_policies_subject_status_idx
  on public.moral_trade_agreement_amendment_policies (subject_type, amendment_type, status, reviewed_at desc);

create index if not exists moral_trade_agreement_amendment_records_policy_state_idx
  on public.moral_trade_agreement_amendment_records (agreement_amendment_policy_ref, amendment_state, reviewed_at desc);

create index if not exists moral_trade_agreement_amendment_records_subject_idx
  on public.moral_trade_agreement_amendment_records (subject_type, subject_ref, amendment_state, created_at desc);

alter table public.moral_trade_agreement_amendment_policies enable row level security;
alter table public.moral_trade_agreement_amendment_records enable row level security;
