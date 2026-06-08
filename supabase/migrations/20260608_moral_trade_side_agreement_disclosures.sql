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
      'side_agreement_review'
    )
  );

create table if not exists public.moral_trade_side_agreement_disclosures (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (
    subject_type in (
      'donation_offset',
      'pledge_swap',
      'compensated_moral_action',
      'performance_bond',
      'evidence_term',
      'challenge_term',
      'recipient_choice',
      'common_ground_budget',
      'public_goods_round'
    )
  ),
  subject_ref text not null,
  side_agreement_present_bool boolean not null default false,
  disclosure_status text not null default 'under_review' check (
    disclosure_status in ('none_declared', 'disclosed', 'under_review', 'non_blocking', 'blocked', 'missing', 'stale', 'superseded')
  ),
  public_safe_summary text not null default '',
  private_details_redacted_bool boolean not null default false,
  participant_notice_status text not null default 'missing' check (
    participant_notice_status in ('sent', 'not_required_for_stage', 'missing', 'failed', 'stale')
  ),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  disclosure_hash text not null check (disclosure_hash ~ '^sha256:[a-f0-9]{64}$'),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  expires_at timestamptz,
  superseded_by uuid references public.moral_trade_side_agreement_disclosures (id) on delete set null,
  private_review_notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    side_agreement_present_bool = true
    or disclosure_status in ('none_declared', 'missing', 'stale', 'superseded')
  ),
  check (
    disclosure_status <> 'non_blocking'
    or (
      reviewed_at is not null
      and private_details_redacted_bool = true
      and participant_notice_status in ('sent', 'not_required_for_stage')
    )
  )
);

comment on table public.moral_trade_side_agreement_disclosures is
  'First-class side-agreement disclosure records. Off-platform compensation, reciprocal favors, side promises, threats, collusion, authority claims, or reporting-suppression terms are blockers until represented and reviewed here.';

create table if not exists public.moral_trade_side_agreement_reviews (
  id uuid primary key default gen_random_uuid(),
  side_agreement_disclosure_id uuid not null references public.moral_trade_side_agreement_disclosures (id) on delete cascade,
  review_dimension text not null check (
    review_dimension in (
      'collusion',
      'externality',
      'legal_jurisdiction',
      'anti_threat',
      'reporting_integrity',
      'civil_rights_discrimination',
      'participant_autonomy',
      'confidentiality_privacy_rights',
      'financial_crime_fraud',
      'anti_corruption',
      'representative_authority'
    )
  ),
  status text not null default 'under_review' check (
    status in ('passed', 'not_required_for_stage', 'missing', 'under_review', 'failed', 'blocked', 'stale', 'superseded')
  ),
  evidence_hash text not null check (evidence_hash ~ '^sha256:[a-f0-9]{64}$'),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  privileged_action_record_id uuid references public.moral_trade_privileged_action_records (id) on delete restrict,
  reviewer_id uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  expires_at timestamptz,
  notes text not null default '',
  superseded_by uuid references public.moral_trade_side_agreement_reviews (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  check (
    status not in ('passed', 'not_required_for_stage')
    or reviewed_at is not null
  )
);

comment on table public.moral_trade_side_agreement_reviews is
  'Dimension-level side-agreement review records for collusion, externality, legal, anti-threat, reporting-integrity, civil-rights, autonomy, confidentiality/privacy, fraud, anti-corruption, and representative-authority checks.';

create index if not exists moral_trade_side_agreement_disclosures_subject_idx
  on public.moral_trade_side_agreement_disclosures (subject_type, subject_ref, disclosure_status, created_at desc);
create index if not exists moral_trade_side_agreement_disclosures_policy_idx
  on public.moral_trade_side_agreement_disclosures (policy_snapshot_id, disclosure_status, reviewed_at desc);
create index if not exists moral_trade_side_agreement_reviews_dimension_idx
  on public.moral_trade_side_agreement_reviews (side_agreement_disclosure_id, review_dimension, status);

alter table public.moral_trade_side_agreement_disclosures enable row level security;
alter table public.moral_trade_side_agreement_reviews enable row level security;
