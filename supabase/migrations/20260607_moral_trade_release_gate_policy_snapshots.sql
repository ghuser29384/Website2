create table if not exists public.moral_trade_policy_snapshots (
  id uuid primary key default gen_random_uuid(),
  subject_kind text not null check (
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
      'recipient_destination_verification'
    )
  ),
  subject_key text not null,
  version_label text not null,
  status text not null default 'draft' check (status in ('draft', 'approved', 'immutable', 'superseded', 'revoked')),
  snapshot_hash text not null check (snapshot_hash ~ '^sha256:[a-f0-9]{64}$'),
  snapshot_payload jsonb not null default '{}'::jsonb,
  approved_by uuid references public.profiles (id) on delete set null,
  approved_at timestamptz,
  immutable_after timestamptz,
  superseded_by uuid references public.moral_trade_policy_snapshots (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (subject_kind, subject_key, version_label)
);

comment on table public.moral_trade_policy_snapshots is
  'Immutable policy snapshots for release gates, state interpretation, payment, notification, FX, fees, public metrics, retention, eligibility, and destination verification.';

create table if not exists public.moral_trade_state_interpretation_policies (
  id uuid primary key default gen_random_uuid(),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  state_family text not null,
  missing_state_behavior text not null default 'block' check (missing_state_behavior in ('block', 'not_required_for_stage')),
  unknown_state_behavior text not null default 'block' check (unknown_state_behavior in ('block', 'not_required_for_stage')),
  stale_state_behavior text not null default 'block' check (stale_state_behavior in ('block', 'not_required_for_stage')),
  under_review_state_behavior text not null default 'block' check (under_review_state_behavior in ('block', 'not_required_for_stage')),
  unmapped_state_behavior text not null default 'block' check (unmapped_state_behavior in ('block', 'not_required_for_stage')),
  superseded_state_behavior text not null default 'block' check (superseded_state_behavior in ('block', 'not_required_for_stage')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (policy_snapshot_id, state_family)
);

comment on table public.moral_trade_state_interpretation_policies is
  'Frozen state-interpretation policy rows: missing, unknown, stale, under-review, unmapped, and superseded states fail closed unless explicitly not required for stage.';

create table if not exists public.moral_trade_privileged_action_records (
  id uuid primary key default gen_random_uuid(),
  subject_kind text not null check (
    subject_kind in (
      'release_gate',
      'policy_snapshot',
      'recipient_destination',
      'privacy_grant',
      'impact_claim',
      'blocker_override',
      'manual_capture',
      'manual_payout_release',
      'emergency_unpause',
      'refund_cancellation'
    )
  ),
  subject_id uuid,
  action_key text not null check (
    action_key in (
      'release_gate_approval',
      'policy_snapshot_approval',
      'recipient_destination_verification',
      'private_data_access_grant',
      'impact_claim_publication',
      'blocker_override',
      'manual_capture',
      'manual_payout_release',
      'emergency_unpause',
      'nonroutine_refund_cancellation'
    )
  ),
  status text not null default 'requested' check (status in ('requested', 'approved', 'blocked', 'expired', 'superseded')),
  requested_by uuid references public.profiles (id) on delete set null,
  first_approver_id uuid references public.profiles (id) on delete set null,
  second_approver_id uuid references public.profiles (id) on delete set null,
  neutral_reviewer_id uuid references public.profiles (id) on delete set null,
  reason_codes text[] not null default '{}',
  emergency_pause_allowed boolean not null default false,
  decided_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  check (
    status <> 'approved'
    or emergency_pause_allowed
    or neutral_reviewer_id is not null
    or (first_approver_id is not null and second_approver_id is not null and first_approver_id <> second_approver_id)
  )
);

comment on table public.moral_trade_privileged_action_records is
  'Dual-control or neutral-review records for high-risk actions such as gate approval, manual capture, private-data grants, emergency unpause, and non-routine refunds.';

create table if not exists public.moral_trade_release_gates (
  id uuid primary key default gen_random_uuid(),
  stage text not null check (
    stage in (
      'public_goods_preview',
      'donation_offset_payable',
      'pledge_swap_reliance_manual_pilot',
      'capped_real_money_release',
      'public_metric_release'
    )
  ),
  feature_flag_key text not null,
  status text not null default 'draft' check (status in ('draft', 'under_review', 'approved', 'blocked', 'paused', 'superseded')),
  policy_snapshot_bundle_hash text not null check (policy_snapshot_bundle_hash ~ '^sha256:[a-f0-9]{64}$'),
  state_interpretation_policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  approval_action_record_id uuid references public.moral_trade_privileged_action_records (id) on delete restrict,
  emergency_paused boolean not null default false,
  approved_by uuid references public.profiles (id) on delete set null,
  approved_at timestamptz,
  superseded_by uuid references public.moral_trade_release_gates (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.moral_trade_release_gates is
  'First-class release-gate subjects. Gates cannot be represented only by editing a parent round or agreement field.';

create table if not exists public.moral_trade_release_gate_requirement_results (
  id uuid primary key default gen_random_uuid(),
  release_gate_id uuid not null references public.moral_trade_release_gates (id) on delete cascade,
  requirement_key text not null,
  status text not null check (
    status in (
      'passed',
      'not_required_for_stage',
      'waived_by_neutral_review',
      'failed',
      'missing',
      'stale',
      'unknown',
      'under_review'
    )
  ),
  evidence_ref text not null default '',
  policy_snapshot_id uuid references public.moral_trade_policy_snapshots (id) on delete restrict,
  privileged_action_record_id uuid references public.moral_trade_privileged_action_records (id) on delete restrict,
  recorded_by uuid references public.profiles (id) on delete set null,
  recorded_at timestamptz not null default timezone('utc', now()),
  notes text not null default '',
  unique (release_gate_id, requirement_key)
);

comment on table public.moral_trade_release_gate_requirement_results is
  'Append-only-by-supersession release-gate requirement results; missing, stale, unknown, under-review, or unreviewed waivers fail closed in application validators.';

create index if not exists moral_trade_policy_snapshots_subject_idx
  on public.moral_trade_policy_snapshots (subject_kind, subject_key, status);
create index if not exists moral_trade_release_gates_stage_status_idx
  on public.moral_trade_release_gates (stage, status, created_at desc);
create index if not exists moral_trade_release_gate_results_gate_status_idx
  on public.moral_trade_release_gate_requirement_results (release_gate_id, status);
create index if not exists moral_trade_privileged_actions_subject_idx
  on public.moral_trade_privileged_action_records (subject_kind, action_key, status);

alter table public.moral_trade_policy_snapshots enable row level security;
alter table public.moral_trade_state_interpretation_policies enable row level security;
alter table public.moral_trade_privileged_action_records enable row level security;
alter table public.moral_trade_release_gates enable row level security;
alter table public.moral_trade_release_gate_requirement_results enable row level security;
