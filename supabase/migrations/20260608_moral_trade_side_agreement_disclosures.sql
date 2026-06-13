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

create table if not exists public.moral_trade_side_agreement_enforcement_records (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  transition text not null check (
    transition in (
      'draft_preview',
      'matched_trade_lock',
      'payment_capture',
      'payout_release',
      'public_completion_claim',
      'challenge_decision',
      'release_gate_promotion'
    )
  ),
  enforcement_status text not null check (enforcement_status in ('pass', 'blocked')),
  required_disclosure_count integer not null default 0 check (required_disclosure_count >= 0),
  passing_disclosure_count integer not null default 0 check (passing_disclosure_count >= 0),
  disclosure_count integer not null default 0 check (disclosure_count >= 0),
  enforcement_input_json jsonb not null,
  evaluation_result_json jsonb not null,
  blocker_codes text[] not null default '{}',
  user_facing_blocker_categories text[] not null default '{}',
  contract_version text not null,
  validator_version text not null,
  evaluation_hash text not null check (evaluation_hash ~ '^sha256:[a-f0-9]{64}$'),
  idempotency_key text not null,
  lock_transition_allowed_bool boolean not null default false,
  payment_transition_allowed_bool boolean not null default false,
  payout_release_allowed_bool boolean not null default false,
  reliance_bearing_transition_allowed_bool boolean not null default false,
  challenge_decision_allowed_bool boolean not null default false,
  public_completion_claim_allowed_bool boolean not null default false,
  release_gate_promotion_allowed_bool boolean not null default false,
  superseded_by uuid references public.moral_trade_side_agreement_enforcement_records (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  check (passing_disclosure_count <= disclosure_count),
  check (lock_transition_allowed_bool = false),
  check (payment_transition_allowed_bool = false),
  check (payout_release_allowed_bool = false),
  check (reliance_bearing_transition_allowed_bool = false),
  check (challenge_decision_allowed_bool = false),
  check (public_completion_claim_allowed_bool = false),
  check (release_gate_promotion_allowed_bool = false),
  unique (owner_profile_id, idempotency_key)
);

comment on table public.moral_trade_side_agreement_enforcement_records is
  'Append-only user-owned side-agreement enforcement records. A record stores normalized side-agreement disclosure input, deterministic evaluation result, blockers, and evaluation hash while enforcing that enforcement records cannot authorize lock, payment, payout, reliance, challenge decisions, public completion, or release-gate promotion.';

create index if not exists moral_trade_side_agreement_disclosures_subject_idx
  on public.moral_trade_side_agreement_disclosures (subject_type, subject_ref, disclosure_status, created_at desc);
create index if not exists moral_trade_side_agreement_disclosures_policy_idx
  on public.moral_trade_side_agreement_disclosures (policy_snapshot_id, disclosure_status, reviewed_at desc);
create index if not exists moral_trade_side_agreement_reviews_dimension_idx
  on public.moral_trade_side_agreement_reviews (side_agreement_disclosure_id, review_dimension, status);
create index if not exists moral_trade_side_agreement_enforcement_records_owner_status_idx
  on public.moral_trade_side_agreement_enforcement_records (owner_profile_id, enforcement_status, created_at desc);
create index if not exists moral_trade_side_agreement_enforcement_records_transition_status_idx
  on public.moral_trade_side_agreement_enforcement_records (transition, enforcement_status, created_at desc);
create index if not exists moral_trade_side_agreement_enforcement_records_hash_idx
  on public.moral_trade_side_agreement_enforcement_records (evaluation_hash, created_at desc);

alter table public.moral_trade_side_agreement_disclosures enable row level security;
alter table public.moral_trade_side_agreement_reviews enable row level security;
alter table public.moral_trade_side_agreement_enforcement_records enable row level security;

drop policy if exists "moral_trade_side_agreement_enforcement_records_select_owner"
  on public.moral_trade_side_agreement_enforcement_records;
create policy "moral_trade_side_agreement_enforcement_records_select_owner"
  on public.moral_trade_side_agreement_enforcement_records
  for select
  to authenticated
  using (owner_profile_id = auth.uid());

drop policy if exists "moral_trade_side_agreement_enforcement_records_insert_owner"
  on public.moral_trade_side_agreement_enforcement_records;
create policy "moral_trade_side_agreement_enforcement_records_insert_owner"
  on public.moral_trade_side_agreement_enforcement_records
  for insert
  to authenticated
  with check (
    owner_profile_id = auth.uid()
    and lock_transition_allowed_bool = false
    and payment_transition_allowed_bool = false
    and payout_release_allowed_bool = false
    and reliance_bearing_transition_allowed_bool = false
    and challenge_decision_allowed_bool = false
    and public_completion_claim_allowed_bool = false
    and release_gate_promotion_allowed_bool = false
  );
