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
      'reviewer_quality',
      'backup_recovery',
      'deployment_release',
      'configuration_snapshot',
      'schema_migration',
      'environment_data_isolation',
      'financial_reconciliation',
      'audit_integrity',
      'data_security'
    )
  );

create table if not exists public.moral_trade_reviewer_quality_policies (
  id uuid primary key default gen_random_uuid(),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  policy_version text not null default 'moral-trade-reviewer-quality-policy-v0.1-2026-06',
  review_type text not null check (
    review_type in (
      'matching_clearing',
      'release_gate_approval',
      'recipient_destination_verification',
      'privacy_grant_approval',
      'evidence_acceptance',
      'impact_claim_publication',
      'appeal_resolution',
      'incident_closure',
      'payout_release',
      'blocker_override'
    )
  ),
  status text not null default 'under_review' check (
    status in ('passed', 'not_required_for_stage', 'missing', 'under_review', 'failed', 'stale', 'superseded')
  ),
  authorization_required_bool boolean not null default true,
  conflict_check_required_bool boolean not null default true,
  calibration_required_bool boolean not null default true,
  second_review_required_bool boolean not null default true,
  audit_sampling_required_bool boolean not null default true,
  default_approval_prohibited_bool boolean not null default true,
  review_speed_target_creates_default_bool boolean not null default false,
  max_decision_age_days integer not null default 180 check (max_decision_age_days >= 0),
  policy_hash text not null check (policy_hash ~ '^sha256:[a-f0-9]{64}$'),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  superseded_by uuid references public.moral_trade_reviewer_quality_policies (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (policy_snapshot_id, review_type)
);

comment on table public.moral_trade_reviewer_quality_policies is
  'Frozen reviewer-quality policies for authorization, conflict checks, calibration, second review, audit sampling, and default-approval prohibition.';

create table if not exists public.moral_trade_review_quality_audits (
  id uuid primary key default gen_random_uuid(),
  reviewer_id_hash text not null check (reviewer_id_hash ~ '^sha256:[a-f0-9]{64}$'),
  review_type text not null check (
    review_type in (
      'matching_clearing',
      'release_gate_approval',
      'recipient_destination_verification',
      'privacy_grant_approval',
      'evidence_acceptance',
      'impact_claim_publication',
      'appeal_resolution',
      'incident_closure',
      'payout_release',
      'blocker_override'
    )
  ),
  reviewer_quality_policy_id uuid not null references public.moral_trade_reviewer_quality_policies (id) on delete restrict,
  audit_status text not null default 'under_review' check (
    audit_status in ('passed', 'not_required_for_stage', 'missing', 'under_review', 'failed', 'stale', 'superseded')
  ),
  sampled_decision_count integer not null default 0 check (sampled_decision_count >= 0),
  overturn_count integer not null default 0 check (overturn_count >= 0),
  calibration_failure_count integer not null default 0 check (calibration_failure_count >= 0),
  unresolved_conflict_count integer not null default 0 check (unresolved_conflict_count >= 0),
  out_of_scope_decision_count integer not null default 0 check (out_of_scope_decision_count >= 0),
  default_approval_detected boolean not null default false,
  audit_hash text not null check (audit_hash ~ '^sha256:[a-f0-9]{64}$'),
  auditor_decision_id uuid references public.moral_trade_review_decisions (id) on delete set null,
  audited_at timestamptz,
  expires_at timestamptz,
  superseded_by uuid references public.moral_trade_review_quality_audits (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.moral_trade_review_quality_audits is
  'Reviewer-quality audit records. Failed audits, overturns, unresolved conflicts, out-of-scope decisions, stale authorization, or default approvals block reliance-bearing review decisions.';

alter table public.moral_trade_review_decisions
  drop constraint if exists moral_trade_review_decisions_subject_kind_check;

alter table public.moral_trade_review_decisions
  add constraint moral_trade_review_decisions_subject_kind_check
  check (
    subject_kind in (
      'proposal_record',
      'agreement',
      'offer',
      'evidence_claim',
      'matching_clearing_run',
      'matched_trade_lock_proposal',
      'cleared_trade_agreement',
      'release_gate',
      'recipient_registry_entry',
      'payment_destination',
      'privacy_grant',
      'evidence_record',
      'impact_claim_record',
      'appeal_case',
      'incident_response_record',
      'payout_milestone',
      'blocker_override'
    )
  );

alter table public.moral_trade_review_decisions
  add column if not exists reviewer_id_hash text not null default 'sha256:0000000000000000000000000000000000000000000000000000000000000000',
  add column if not exists reviewer_role text not null default 'reviewer',
  add column if not exists conflict_of_interest_state text not null default 'missing',
  add column if not exists neutral_panel_ref text,
  add column if not exists reviewer_quality_policy_ref uuid references public.moral_trade_reviewer_quality_policies (id) on delete restrict,
  add column if not exists review_quality_audit_refs uuid[] not null default '{}',
  add column if not exists decision_state text not null default 'needs_changes',
  add column if not exists prior_decision_id uuid references public.moral_trade_review_decisions (id) on delete set null,
  add column if not exists quality_checked_at timestamptz,
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

alter table public.moral_trade_review_decisions
  drop constraint if exists moral_trade_review_decisions_reviewer_id_hash_check;

alter table public.moral_trade_review_decisions
  add constraint moral_trade_review_decisions_reviewer_id_hash_check
  check (reviewer_id_hash ~ '^sha256:[a-f0-9]{64}$');

alter table public.moral_trade_review_decisions
  drop constraint if exists moral_trade_review_decisions_conflict_state_check;

alter table public.moral_trade_review_decisions
  add constraint moral_trade_review_decisions_conflict_state_check
  check (
    conflict_of_interest_state in (
      'none_declared',
      'disclosed_nonblocking',
      'not_required_for_stage',
      'missing',
      'unresolved',
      'conflicted',
      'superseded'
    )
  );

alter table public.moral_trade_review_decisions
  drop constraint if exists moral_trade_review_decisions_decision_state_check;

alter table public.moral_trade_review_decisions
  add constraint moral_trade_review_decisions_decision_state_check
  check (decision_state in ('approved', 'blocked', 'needs_changes', 'recused', 'superseded'));

create index if not exists moral_trade_reviewer_quality_policies_type_idx
  on public.moral_trade_reviewer_quality_policies (review_type, status, created_at desc);

create index if not exists moral_trade_review_quality_audits_reviewer_idx
  on public.moral_trade_review_quality_audits (reviewer_id_hash, review_type, audit_status, created_at desc);

create index if not exists moral_trade_review_decisions_quality_idx
  on public.moral_trade_review_decisions (subject_kind, subject_id, decision_state, conflict_of_interest_state, created_at desc);

alter table public.moral_trade_reviewer_quality_policies enable row level security;
alter table public.moral_trade_review_quality_audits enable row level security;
