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
      'matched_trade_lock'
    )
  );

create table if not exists public.moral_trade_matching_clearing_runs (
  id uuid primary key default gen_random_uuid(),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  flow_type text not null check (
    flow_type in (
      'donation_offset_batch',
      'pledge_swap_preview',
      'broad_match_candidate',
      'public_goods_round'
    )
  ),
  run_status text not null default 'draft' check (
    run_status in ('draft', 'dry_run', 'reviewed', 'blocked', 'locked', 'superseded', 'expired')
  ),
  algorithm_version text not null default '',
  deterministic_algorithm_bool boolean not null default true,
  input_bundle_hash text not null check (input_bundle_hash ~ '^sha256:[a-f0-9]{64}$'),
  excluded_records_hash text not null check (excluded_records_hash ~ '^sha256:[a-f0-9]{64}$'),
  privacy_policy_snapshot_id uuid references public.moral_trade_policy_snapshots (id) on delete restrict,
  state_interpretation_policy_id uuid references public.moral_trade_state_interpretation_policies (id) on delete restrict,
  result_hash text not null check (result_hash ~ '^sha256:[a-f0-9]{64}$'),
  review_decision_id uuid references public.moral_trade_review_decisions (id) on delete set null,
  manual_override_action_id uuid references public.moral_trade_privileged_action_records (id) on delete set null,
  manual_override_approved_bool boolean not null default false,
  database_order_matching_bool boolean not null default false,
  hidden_match_reasoning_bool boolean not null default false,
  payable_transition_bool boolean not null default false,
  reliance_bearing_transition_bool boolean not null default false,
  private_counterparty_data_public_bool boolean not null default false,
  run_hash text not null check (run_hash ~ '^sha256:[a-f0-9]{64}$'),
  reviewed_at timestamptz,
  expires_at timestamptz,
  superseded_by uuid references public.moral_trade_matching_clearing_runs (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.moral_trade_matching_clearing_runs is
  'Frozen deterministic matching-clearing runs for donation-offset batches, pledge-swap previews, broad match candidates, and public-goods rounds. Payable or reliance-bearing clearing cannot be produced by ad hoc operator matching, database-order matching, or hidden match reasoning.';

create table if not exists public.moral_trade_matched_trade_lock_proposals (
  id uuid primary key default gen_random_uuid(),
  matching_clearing_run_id uuid not null references public.moral_trade_matching_clearing_runs (id) on delete restrict,
  proposal_status text not null default 'draft' check (
    proposal_status in ('draft', 'participant_review', 'confirmed', 'locked', 'declined', 'expired', 'superseded', 'blocked')
  ),
  proposal_subject_kind text not null check (
    proposal_subject_kind in (
      'donation_offset_batch',
      'pledge_swap_match',
      'broad_match_candidate',
      'public_goods_round'
    )
  ),
  exact_terms_hash text not null check (exact_terms_hash ~ '^sha256:[a-f0-9]{64}$'),
  counterparty_bucket_hash text not null check (counterparty_bucket_hash ~ '^sha256:[a-f0-9]{64}$'),
  matched_volume_hash text not null check (matched_volume_hash ~ '^sha256:[a-f0-9]{64}$'),
  clearing_ratio_bps integer not null default 0 check (clearing_ratio_bps >= 0 and clearing_ratio_bps <= 1000000),
  ratio_bounds_status text not null default 'missing' check (
    ratio_bounds_status in ('passed', 'missing', 'under_review', 'failed', 'out_of_bounds', 'stale', 'superseded')
  ),
  baseline_snapshot_hash text not null check (baseline_snapshot_hash ~ '^sha256:[a-f0-9]{64}$'),
  destination_verification_ref uuid references public.moral_trade_recipient_destination_reviews (id) on delete set null,
  commitment_reservation_ref text not null default '',
  atomic_settlement_group_ref text not null default '',
  final_confirmation_refs uuid[] not null default '{}',
  confirmation_state text not null default 'missing' check (
    confirmation_state in ('missing', 'stale', 'scope_mismatch', 'passed', 'not_required_for_stage')
  ),
  fallback_terms_hash text not null check (fallback_terms_hash ~ '^sha256:[a-f0-9]{64}$'),
  evidence_standard_hash text not null check (evidence_standard_hash ~ '^sha256:[a-f0-9]{64}$'),
  private_counterparty_data_public_bool boolean not null default false,
  proposal_hash text not null check (proposal_hash ~ '^sha256:[a-f0-9]{64}$'),
  review_decision_id uuid references public.moral_trade_review_decisions (id) on delete set null,
  reviewed_at timestamptz,
  expires_at timestamptz,
  superseded_by uuid references public.moral_trade_matched_trade_lock_proposals (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.moral_trade_matched_trade_lock_proposals is
  'Frozen matched-trade lock proposals that bind exact matched terms, counterparty bucket, volume, ratio, destination, evidence standard, deadline, no-trade baseline snapshots, residuals, fallback terms, and fresh final confirmations before a donation offset or pledge swap can lock.';

create table if not exists public.moral_trade_matching_clearing_reproducibility_checks (
  id uuid primary key default gen_random_uuid(),
  matching_clearing_run_id uuid not null references public.moral_trade_matching_clearing_runs (id) on delete restrict,
  check_status text not null default 'missing' check (
    check_status in ('passed', 'not_required_for_stage', 'missing', 'under_review', 'failed', 'stale', 'superseded')
  ),
  rerun_input_bundle_hash text not null check (rerun_input_bundle_hash ~ '^sha256:[a-f0-9]{64}$'),
  rerun_result_hash text not null check (rerun_result_hash ~ '^sha256:[a-f0-9]{64}$'),
  deterministic_replay_bool boolean not null default false,
  variance_reason text not null default '',
  check_hash text not null check (check_hash ~ '^sha256:[a-f0-9]{64}$'),
  checked_at timestamptz,
  expires_at timestamptz,
  superseded_by uuid references public.moral_trade_matching_clearing_reproducibility_checks (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.moral_trade_matching_clearing_reproducibility_checks is
  'Replay checks proving a matching-clearing run can be reproduced from the frozen input bundle, deterministic algorithm version, excluded-record list, privacy policy, state-interpretation policy, and result hash.';

create index if not exists moral_trade_matching_clearing_runs_flow_status_idx
  on public.moral_trade_matching_clearing_runs (flow_type, run_status, created_at desc);

create index if not exists moral_trade_matching_clearing_runs_result_idx
  on public.moral_trade_matching_clearing_runs (result_hash, created_at desc);

create index if not exists moral_trade_matched_trade_lock_proposals_run_idx
  on public.moral_trade_matched_trade_lock_proposals (matching_clearing_run_id, proposal_status, created_at desc);

create index if not exists moral_trade_matched_trade_lock_proposals_subject_idx
  on public.moral_trade_matched_trade_lock_proposals (proposal_subject_kind, proposal_status, created_at desc);

create index if not exists moral_trade_matching_clearing_reproducibility_checks_run_idx
  on public.moral_trade_matching_clearing_reproducibility_checks (matching_clearing_run_id, check_status, checked_at desc);

alter table public.moral_trade_matching_clearing_runs enable row level security;
alter table public.moral_trade_matched_trade_lock_proposals enable row level security;
alter table public.moral_trade_matching_clearing_reproducibility_checks enable row level security;
