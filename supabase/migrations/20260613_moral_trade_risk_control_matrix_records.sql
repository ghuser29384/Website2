create table if not exists public.moral_trade_risk_control_packs (
  id uuid primary key default gen_random_uuid(),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  policy_version text not null default 'moral-trade-risk-control-matrix-v0.1-2026-06',
  pack_name text not null,
  applies_to_trade_type text not null check (
    applies_to_trade_type in (
      'donation_offset',
      'pledge_swap',
      'compensated_moral_action',
      'performance_bond',
      'side_agreement',
      'evidence_claim',
      'payment_event',
      'manual_review',
      'mixed'
    )
  ),
  applies_to_release_stages_json jsonb not null default '[]'::jsonb check (jsonb_typeof(applies_to_release_stages_json) = 'array'),
  applies_to_tiers_json jsonb not null default '[]'::jsonb check (jsonb_typeof(applies_to_tiers_json) = 'array'),
  required_control_codes_json jsonb not null default '[]'::jsonb check (jsonb_typeof(required_control_codes_json) = 'array'),
  optional_control_codes_json jsonb not null default '[]'::jsonb check (jsonb_typeof(optional_control_codes_json) = 'array'),
  not_required_control_codes_json jsonb not null default '[]'::jsonb check (jsonb_typeof(not_required_control_codes_json) = 'array'),
  fail_closed_unknown_controls_bool boolean not null default true,
  control_pack_hash text not null check (control_pack_hash ~ '^sha256:[a-f0-9]{64}$'),
  reviewer_decision_ref text,
  superseded_by uuid references public.moral_trade_risk_control_packs (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (fail_closed_unknown_controls_bool = true),
  check (jsonb_array_length(required_control_codes_json) > 0)
);

create table if not exists public.moral_trade_control_applicability_matrices (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (
    subject_type in (
      'offset_offer',
      'pledge_swap_offer',
      'matched_trade_lock_proposal',
      'cleared_trade_agreement',
      'compensated_action_terms',
      'pledge_performance_bond_record',
      'payment_event',
      'evidence_record',
      'dispute_case',
      'appeal_case'
    )
  ),
  subject_id text not null,
  release_stage text not null check (
    release_stage in (
      'draft_preview',
      'match_candidate_preview',
      'matched_trade_lock',
      'payment_authorization',
      'payment_capture',
      'reliance_bearing_transition',
      'public_metric_release',
      'manual_review',
      'release_gate_promotion'
    )
  ),
  trade_type text not null check (
    trade_type in (
      'donation_offset',
      'pledge_swap',
      'compensated_moral_action',
      'performance_bond',
      'side_agreement',
      'evidence_claim',
      'payment_event',
      'manual_review',
      'mixed'
    )
  ),
  non_public_goods_market_tier text not null check (
    non_public_goods_market_tier in (
      'tier_1_money_only_donation_offset',
      'tier_2_donation_offset_with_abstention_or_additionality_proof',
      'tier_3_closed_counterparty_pledge_swap',
      'tier_4_open_market_pledge_swap_or_compensated_action',
      'not_applicable'
    )
  ),
  jurisdiction_bucket text not null,
  money_movement_bool boolean not null default false,
  participant_term_sheet_required_bool boolean not null default false,
  counterparty_blinding_required_bool boolean not null default false,
  recipient_acceptance_required_bool boolean not null default false,
  ai_preference_elicitation_used_bool boolean not null default false,
  post_clear_audit_required_bool boolean not null default false,
  compensation_bool boolean not null default false,
  negative_commitment_bool boolean not null default false,
  high_stakes_or_irreversible_bool boolean not null default false,
  open_market_matching_bool boolean not null default false,
  evidence_burden_level text not null default 'medium' check (
    evidence_burden_level in ('none_required', 'low', 'medium', 'high', 'confidential_attestation_required')
  ),
  noncompensable_blocker_present_bool boolean not null default false,
  stale_offer_bool boolean not null default false,
  batch_clearing_required_bool boolean not null default false,
  direct_pair_clearing_bool boolean not null default false,
  cause_bucket_taxonomy_ref text,
  resource_compatibility_required_bool boolean not null default false,
  net_offset_accounting_required_bool boolean not null default false,
  confidential_verification_required_bool boolean not null default false,
  applicable_risk_control_pack_refs_json jsonb not null default '[]'::jsonb check (jsonb_typeof(applicable_risk_control_pack_refs_json) = 'array'),
  applicable_control_codes_json jsonb not null default '[]'::jsonb check (jsonb_typeof(applicable_control_codes_json) = 'array'),
  matrix_hash text not null check (matrix_hash ~ '^sha256:[a-f0-9]{64}$'),
  reviewer_decision_ref text,
  superseded_by uuid references public.moral_trade_control_applicability_matrices (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (jsonb_array_length(applicable_risk_control_pack_refs_json) > 0),
  check (jsonb_array_length(applicable_control_codes_json) > 0)
);

create table if not exists public.moral_trade_control_requirement_results (
  id uuid primary key default gen_random_uuid(),
  control_applicability_matrix_ref text not null,
  risk_control_pack_ref text not null,
  subject_type text not null check (
    subject_type in (
      'offset_offer',
      'pledge_swap_offer',
      'matched_trade_lock_proposal',
      'cleared_trade_agreement',
      'compensated_action_terms',
      'pledge_performance_bond_record',
      'payment_event',
      'evidence_record',
      'dispute_case',
      'appeal_case'
    )
  ),
  subject_id text not null,
  control_code text not null,
  result_status text not null default 'under_review' check (
    result_status in (
      'passed',
      'not_required_for_stage',
      'privileged_neutral_review_waiver',
      'missing',
      'unknown',
      'unmapped',
      'duplicated',
      'under_review',
      'failed',
      'stale',
      'superseded'
    )
  ),
  policy_snapshot_ref text,
  evidence_ref text,
  reviewer_decision_ref text,
  neutral_review_ref text,
  privileged_action_ref text,
  result_hash text not null check (result_hash ~ '^sha256:[a-f0-9]{64}$'),
  checked_at timestamptz not null,
  expires_at timestamptz,
  superseded_by uuid references public.moral_trade_control_requirement_results (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    result_status <> 'privileged_neutral_review_waiver'
    or (neutral_review_ref is not null and privileged_action_ref is not null)
  ),
  check (
    result_status <> 'not_required_for_stage'
    or policy_snapshot_ref is not null
  )
);

create table if not exists public.moral_trade_risk_control_matrix_enforcement_records (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  transition text not null check (
    transition in (
      'draft_preview',
      'match_candidate_preview',
      'matched_trade_lock',
      'payment_authorization',
      'payment_capture',
      'reliance_bearing_transition',
      'public_metric_publication',
      'release_gate_promotion',
      'dispute_or_appeal_resolution'
    )
  ),
  enforcement_status text not null check (enforcement_status in ('pass', 'blocked')),
  matrix_count integer not null default 0 check (matrix_count >= 0),
  pack_count integer not null default 0 check (pack_count >= 0),
  result_count integer not null default 0 check (result_count >= 0),
  required_control_count integer not null default 0 check (required_control_count >= 0),
  non_blocking_control_count integer not null default 0 check (non_blocking_control_count >= 0),
  privileged_waiver_count integer not null default 0 check (privileged_waiver_count >= 0),
  blocker_count integer not null default 0 check (blocker_count >= 0),
  enforcement_input_json jsonb not null,
  evaluation_result_json jsonb not null,
  blocker_codes text[] not null default '{}',
  user_facing_blocker_categories text[] not null default '{}',
  contract_version text not null,
  validator_version text not null,
  evaluation_hash text not null check (evaluation_hash ~ '^sha256:[a-f0-9]{64}$'),
  idempotency_key text not null,
  runtime_transition_allowed_bool boolean not null default false,
  matched_trade_lock_allowed_bool boolean not null default false,
  payment_authorization_allowed_bool boolean not null default false,
  payment_capture_allowed_bool boolean not null default false,
  public_metric_publication_allowed_bool boolean not null default false,
  release_gate_promotion_allowed_bool boolean not null default false,
  superseded_by uuid references public.moral_trade_risk_control_matrix_enforcement_records (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  check (non_blocking_control_count <= required_control_count),
  check (privileged_waiver_count <= non_blocking_control_count),
  check (matrix_count <= 24),
  check (pack_count <= 32),
  check (result_count <= 160),
  check (runtime_transition_allowed_bool = false),
  check (matched_trade_lock_allowed_bool = false),
  check (payment_authorization_allowed_bool = false),
  check (payment_capture_allowed_bool = false),
  check (public_metric_publication_allowed_bool = false),
  check (release_gate_promotion_allowed_bool = false),
  unique (owner_profile_id, idempotency_key)
);

comment on table public.moral_trade_risk_control_packs is
  'Reviewed risk-control packs that map a trade type, release stage, and market tier to required, optional, and explicitly not-required control codes. Unknown controls fail closed by table constraint.';

comment on table public.moral_trade_control_applicability_matrices is
  'Subject-scoped control applicability matrices for non-public-goods transitions. A matrix records the reviewed control codes and risk-control pack references required before a runtime transition can proceed.';

comment on table public.moral_trade_control_requirement_results is
  'Per-control requirement results for a control applicability matrix. Only passed, not-required-with-policy, or privileged neutral-review waiver results can be treated as non-blocking by the evaluator.';

comment on table public.moral_trade_risk_control_matrix_enforcement_records is
  'Append-only owner-scoped risk-control matrix enforcement records. Enforcement records store normalized input and deterministic evaluation output while enforcing that this endpoint cannot authorize transition, lock, payment, public metrics, or release promotion.';

create index if not exists mt_risk_control_pack_trade_stage_idx
  on public.moral_trade_risk_control_packs (applies_to_trade_type, created_at desc);

create index if not exists mt_control_matrix_subject_idx
  on public.moral_trade_control_applicability_matrices (subject_type, subject_id, release_stage, created_at desc);

create index if not exists mt_control_result_subject_idx
  on public.moral_trade_control_requirement_results (subject_type, subject_id, control_code, result_status, created_at desc);

create index if not exists mt_control_result_matrix_pack_idx
  on public.moral_trade_control_requirement_results (control_applicability_matrix_ref, risk_control_pack_ref, control_code, created_at desc);

create index if not exists mt_risk_control_matrix_enforce_owner_status_idx
  on public.moral_trade_risk_control_matrix_enforcement_records (owner_profile_id, enforcement_status, created_at desc);

create index if not exists mt_risk_control_matrix_enforce_transition_idx
  on public.moral_trade_risk_control_matrix_enforcement_records (transition, enforcement_status, created_at desc);

create index if not exists mt_risk_control_matrix_enforce_hash_idx
  on public.moral_trade_risk_control_matrix_enforcement_records (evaluation_hash, created_at desc);

alter table public.moral_trade_risk_control_packs enable row level security;
alter table public.moral_trade_control_applicability_matrices enable row level security;
alter table public.moral_trade_control_requirement_results enable row level security;
alter table public.moral_trade_risk_control_matrix_enforcement_records enable row level security;

drop policy if exists "mt_risk_control_packs_select_auth"
  on public.moral_trade_risk_control_packs;
create policy "mt_risk_control_packs_select_auth"
  on public.moral_trade_risk_control_packs
  for select
  to authenticated
  using (true);

drop policy if exists "mt_control_applicability_matrices_select_auth"
  on public.moral_trade_control_applicability_matrices;
create policy "mt_control_applicability_matrices_select_auth"
  on public.moral_trade_control_applicability_matrices
  for select
  to authenticated
  using (true);

drop policy if exists "mt_control_requirement_results_select_auth"
  on public.moral_trade_control_requirement_results;
create policy "mt_control_requirement_results_select_auth"
  on public.moral_trade_control_requirement_results
  for select
  to authenticated
  using (true);

drop policy if exists "mt_risk_control_matrix_enforce_select_owner"
  on public.moral_trade_risk_control_matrix_enforcement_records;
create policy "mt_risk_control_matrix_enforce_select_owner"
  on public.moral_trade_risk_control_matrix_enforcement_records
  for select
  to authenticated
  using (owner_profile_id = auth.uid());

drop policy if exists "mt_risk_control_matrix_enforce_insert_owner"
  on public.moral_trade_risk_control_matrix_enforcement_records;
create policy "mt_risk_control_matrix_enforce_insert_owner"
  on public.moral_trade_risk_control_matrix_enforcement_records
  for insert
  to authenticated
  with check (
    owner_profile_id = auth.uid()
    and runtime_transition_allowed_bool = false
    and matched_trade_lock_allowed_bool = false
    and payment_authorization_allowed_bool = false
    and payment_capture_allowed_bool = false
    and public_metric_publication_allowed_bool = false
    and release_gate_promotion_allowed_bool = false
  );
