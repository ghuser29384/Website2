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
      'appeal_case'
    )
  );

create table if not exists public.moral_trade_appeal_policies (
  id uuid primary key default gen_random_uuid(),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  policy_version text not null default 'moral-trade-challenge-appeal-v0.3',
  subject text not null check (
    subject in (
      'claim',
      'evidence_row',
      'baseline_concern',
      'disclosure_decision',
      'externality_trigger',
      'completion_state',
      'policy_flag'
    )
  ),
  status text not null default 'missing' check (
    status in ('passed', 'not_required_for_stage', 'missing', 'under_review', 'failed', 'stale', 'superseded')
  ),
  notice_required_bool boolean not null default true,
  deadline_required_bool boolean not null default true,
  neutral_review_required_bool boolean not null default true,
  non_retaliation_required_bool boolean not null default true,
  safety_blocker_waiver_prohibited_bool boolean not null default true,
  settled_obligation_reopen_prohibited_bool boolean not null default true,
  max_appeal_age_days integer not null default 30 check (max_appeal_age_days > 0),
  policy_hash text not null check (policy_hash ~ '^sha256:[a-f0-9]{64}$'),
  reviewed_by text,
  reviewed_at timestamptz,
  superseded_by uuid references public.moral_trade_appeal_policies (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.moral_trade_appeal_policies is
  'Frozen appeal-case policies governing notice, deadlines, neutral review, non-retaliation, safety-blocker non-waiver, and settled-obligation non-reopening for bounded correction paths.';

create table if not exists public.moral_trade_appeal_cases (
  id uuid primary key default gen_random_uuid(),
  appeal_policy_ref uuid not null references public.moral_trade_appeal_policies (id) on delete restrict,
  subject text not null check (
    subject in (
      'claim',
      'evidence_row',
      'baseline_concern',
      'disclosure_decision',
      'externality_trigger',
      'completion_state',
      'policy_flag'
    )
  ),
  standing text not null check (
    standing in (
      'participant',
      'counterparty',
      'affected_party',
      'reviewer',
      'admin_safety',
      'external_verifier'
    )
  ),
  trigger text not null check (
    trigger in (
      'duplicate_proof',
      'coercive_baseline',
      'wrong_scope_evidence',
      'material_factual_error',
      'privacy_disclosure_error',
      'externality_remedy_gap',
      'reviewer_conflict',
      'policy_misapplied'
    )
  ),
  outcome text not null check (
    outcome in (
      'uphold_decision',
      'request_evidence',
      'route_human_review',
      'open_challenge_window',
      'block_reliance',
      'record_remedy',
      'close_unresolved',
      'correct_record'
    )
  ),
  status text not null default 'filed' check (
    status in (
      'draft',
      'filed',
      'noticed',
      'under_neutral_review',
      'correction_requested',
      'upheld',
      'corrected',
      'dismissed',
      'closed_unresolved',
      'superseded',
      'stale'
    )
  ),
  notice_state text not null default 'missing' check (
    notice_state in ('missing', 'queued', 'delivered', 'failed', 'not_required_for_stage')
  ),
  deadline_at timestamptz,
  filed_at timestamptz,
  reviewed_at timestamptz,
  expires_at timestamptz,
  neutral_review_status text not null default 'missing' check (
    neutral_review_status in ('passed', 'not_required_for_stage', 'missing', 'under_review', 'failed', 'stale', 'superseded')
  ),
  standing_status text not null default 'missing' check (
    standing_status in ('passed', 'not_required_for_stage', 'missing', 'under_review', 'failed', 'stale', 'superseded')
  ),
  scope_hash text not null check (scope_hash ~ '^sha256:[a-f0-9]{64}$'),
  evidence_scope_refs text[] not null default '{}'::text[],
  private_details_redacted_bool boolean not null default false,
  safety_blocker_waiver_attempted_bool boolean not null default false,
  settled_obligation_reopen_attempted_bool boolean not null default false,
  non_retaliation_notice_sent_bool boolean not null default false,
  case_hash text not null check (case_hash ~ '^sha256:[a-f0-9]{64}$'),
  review_decision_id uuid references public.moral_trade_review_decisions (id) on delete set null,
  superseded_by uuid references public.moral_trade_appeal_cases (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.moral_trade_appeal_cases is
  'First-class bounded appeal and correction cases. Appeals require notice, deadline, scope, evidence scope, standing, neutral review where relevant, non-retaliation, redaction, and cannot waive safety blockers or silently reopen settled obligations.';

create index if not exists moral_trade_appeal_policies_subject_status_idx
  on public.moral_trade_appeal_policies (subject, status, reviewed_at desc);

create index if not exists moral_trade_appeal_cases_policy_status_idx
  on public.moral_trade_appeal_cases (appeal_policy_ref, status, filed_at desc);

create index if not exists moral_trade_appeal_cases_subject_trigger_idx
  on public.moral_trade_appeal_cases (subject, trigger, status, created_at desc);

alter table public.moral_trade_appeal_policies enable row level security;
alter table public.moral_trade_appeal_cases enable row level security;
