create table if not exists public.moral_trade_non_public_goods_tier_policies (
  id uuid primary key default gen_random_uuid(),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  policy_version text not null default 'moral-trade-non-public-goods-tier-v0.1-2026-06',
  tier text not null check (
    tier in (
      'tier_1_money_only_donation_offset',
      'tier_2_donation_offset_with_abstention_or_additionality_proof',
      'tier_3_closed_counterparty_pledge_swap',
      'tier_4_open_market_pledge_swap_or_compensated_action'
    )
  ),
  approved_transition text not null check (
    approved_transition in (
      'draft_preview',
      'match_candidate_preview',
      'matched_trade_lock',
      'payment_authorization',
      'payment_capture',
      'reliance_bearing_transition',
      'public_metric_publication',
      'release_gate_promotion'
    )
  ),
  status text not null default 'under_review' check (
    status in ('passed', 'not_required_for_stage', 'missing', 'under_review', 'failed', 'stale', 'superseded')
  ),
  policy_snapshot_status text not null default 'missing' check (
    policy_snapshot_status in ('resolved_immutable', 'missing', 'mutable', 'stale', 'superseded')
  ),
  release_stage text not null check (
    release_stage in ('donation_offset_pilot', 'pledge_swap_preview_only', 'pledge_swap_manual_pilot', 'sandbox_calculation')
  ),
  payable_allowed_bool boolean not null default false,
  reliance_bearing_allowed_bool boolean not null default false,
  public_metric_allowed_bool boolean not null default false,
  open_market_matching_allowed_bool boolean not null default false,
  requires_counterfactual_trust_assessment_bool boolean not null default true,
  allowed_counterparty_modes text[] not null default '{}',
  policy_hash text not null check (policy_hash ~ '^sha256:[a-f0-9]{64}$'),
  reviewed_at timestamptz,
  expires_at timestamptz,
  superseded_by uuid references public.moral_trade_non_public_goods_tier_policies (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    not (
      tier = 'tier_3_closed_counterparty_pledge_swap'
      and open_market_matching_allowed_bool
    )
  ),
  check (
    not (
      tier = 'tier_4_open_market_pledge_swap_or_compensated_action'
      and (
        payable_allowed_bool
        or reliance_bearing_allowed_bool
        or public_metric_allowed_bool
      )
    )
  )
);

create table if not exists public.moral_trade_counterfactual_trust_assessments (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (
    subject_type in (
      'donation_offset',
      'pledge_swap',
      'compensated_moral_action',
      'matched_trade_lock_proposal',
      'template_instance_record',
      'worked_example'
    )
  ),
  subject_ref text not null,
  tier text not null check (
    tier in (
      'tier_1_money_only_donation_offset',
      'tier_2_donation_offset_with_abstention_or_additionality_proof',
      'tier_3_closed_counterparty_pledge_swap',
      'tier_4_open_market_pledge_swap_or_compensated_action'
    )
  ),
  counterfactual_trust_class text not null check (
    counterfactual_trust_class in (
      'money_only_verified_destination',
      'abstention_or_additionality_claim',
      'closed_counterparty_known_baseline',
      'open_market_behavior_change',
      'compensated_personal_action',
      'self_offset_or_personal_bookkeeping'
    )
  ),
  assessment_status text not null default 'under_review' check (
    assessment_status in ('passed', 'not_required_for_stage', 'missing', 'under_review', 'failed', 'stale', 'superseded')
  ),
  evidence_burden_status text not null default 'under_review' check (
    evidence_burden_status in ('least_intrusive_sufficient', 'not_required_for_stage', 'missing', 'too_intrusive', 'under_review', 'failed', 'stale')
  ),
  counterparty_mode text not null default 'none_required' check (
    counterparty_mode in ('none_required', 'closed_counterparty', 'invite_only', 'user_supplied', 'open_market', 'autonomous_outreach')
  ),
  baseline_confidence_level text not null default 'low' check (
    baseline_confidence_level in ('low', 'medium', 'high', 'not_required_for_stage')
  ),
  baseline_integrity_status text not null default 'under_review' check (
    baseline_integrity_status in ('passed', 'not_required_for_stage', 'missing', 'under_review', 'failed', 'stale', 'superseded')
  ),
  participant_uncertainty_disclosed_bool boolean not null default false,
  participant_confirmation_ref text,
  reviewer_decision_ref text,
  assessment_hash text not null check (assessment_hash ~ '^sha256:[a-f0-9]{64}$'),
  reviewed_at timestamptz,
  expires_at timestamptz,
  superseded_by uuid references public.moral_trade_counterfactual_trust_assessments (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (counterparty_mode <> 'autonomous_outreach'),
  check (
    not (
      counterfactual_trust_class = 'self_offset_or_personal_bookkeeping'
      and subject_type in ('matched_trade_lock_proposal', 'pledge_swap')
    )
  )
);

create table if not exists public.moral_trade_non_public_goods_tier_enforcement_records (
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
      'release_gate_promotion'
    )
  ),
  enforcement_status text not null check (enforcement_status in ('pass', 'blocked')),
  required_policy_count integer not null default 0 check (required_policy_count >= 0),
  passing_policy_count integer not null default 0 check (passing_policy_count >= 0),
  required_assessment_count integer not null default 0 check (required_assessment_count >= 0),
  passing_assessment_count integer not null default 0 check (passing_assessment_count >= 0),
  policy_count integer not null default 0 check (policy_count >= 0),
  assessment_count integer not null default 0 check (assessment_count >= 0),
  blocker_count integer not null default 0 check (blocker_count >= 0),
  enforcement_input_json jsonb not null,
  evaluation_result_json jsonb not null,
  blocker_codes text[] not null default '{}',
  user_facing_blocker_categories text[] not null default '{}',
  contract_version text not null,
  validator_version text not null,
  evaluation_hash text not null check (evaluation_hash ~ '^sha256:[a-f0-9]{64}$'),
  idempotency_key text not null,
  draft_preview_allowed_bool boolean not null default false,
  match_candidate_preview_allowed_bool boolean not null default false,
  matched_trade_lock_allowed_bool boolean not null default false,
  payment_authorization_allowed_bool boolean not null default false,
  payment_capture_allowed_bool boolean not null default false,
  reliance_bearing_transition_allowed_bool boolean not null default false,
  public_metric_publication_allowed_bool boolean not null default false,
  release_gate_promotion_allowed_bool boolean not null default false,
  superseded_by uuid references public.moral_trade_non_public_goods_tier_enforcement_records (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  check (passing_policy_count <= required_policy_count),
  check (passing_assessment_count <= required_assessment_count),
  check (policy_count <= 24),
  check (assessment_count <= 64),
  check (draft_preview_allowed_bool = false),
  check (match_candidate_preview_allowed_bool = false),
  check (matched_trade_lock_allowed_bool = false),
  check (payment_authorization_allowed_bool = false),
  check (payment_capture_allowed_bool = false),
  check (reliance_bearing_transition_allowed_bool = false),
  check (public_metric_publication_allowed_bool = false),
  check (release_gate_promotion_allowed_bool = false),
  unique (owner_profile_id, idempotency_key)
);

comment on table public.moral_trade_non_public_goods_tier_policies is
  'Frozen non-public-goods launch-tier policies. Tier-4 remains disabled for payable, reliance-bearing, and public-metric transitions; closed-counterparty pledge-swap tiers cannot enable open-market matching by default.';

comment on table public.moral_trade_counterfactual_trust_assessments is
  'First-class counterfactual-trust assessment records for donation offsets, pledge swaps, compensated moral-action drafts, and matched-trade proposals. Records classify claim type, counterparty mode, evidence burden, baseline confidence, baseline integrity, participant uncertainty disclosure, and reviewer decision without exposing private baselines publicly.';

comment on table public.moral_trade_non_public_goods_tier_enforcement_records is
  'Append-only owner-scoped non-public-goods tier enforcement records. A record stores normalized tier/counterfactual-trust input, deterministic evaluation result, blockers, and evaluation hash while enforcing that enforcement records cannot authorize preview, lock, payment, reliance, public metric publication, or release-gate promotion.';

create index if not exists mt_non_public_goods_tier_policy_idx
  on public.moral_trade_non_public_goods_tier_policies (tier, approved_transition, status, created_at desc);

create index if not exists mt_counterfactual_trust_subject_idx
  on public.moral_trade_counterfactual_trust_assessments (subject_type, subject_ref, assessment_status, created_at desc);

create index if not exists mt_counterfactual_trust_tier_idx
  on public.moral_trade_counterfactual_trust_assessments (tier, counterfactual_trust_class, assessment_status, created_at desc);

create index if not exists mt_non_public_goods_tier_enforce_owner_status_idx
  on public.moral_trade_non_public_goods_tier_enforcement_records (owner_profile_id, enforcement_status, created_at desc);

create index if not exists mt_non_public_goods_tier_enforce_transition_idx
  on public.moral_trade_non_public_goods_tier_enforcement_records (transition, enforcement_status, created_at desc);

create index if not exists mt_non_public_goods_tier_enforce_hash_idx
  on public.moral_trade_non_public_goods_tier_enforcement_records (evaluation_hash, created_at desc);

alter table public.moral_trade_non_public_goods_tier_policies enable row level security;
alter table public.moral_trade_counterfactual_trust_assessments enable row level security;
alter table public.moral_trade_non_public_goods_tier_enforcement_records enable row level security;

drop policy if exists "mt_non_public_goods_tier_policies_select_auth"
  on public.moral_trade_non_public_goods_tier_policies;
create policy "mt_non_public_goods_tier_policies_select_auth"
  on public.moral_trade_non_public_goods_tier_policies
  for select
  to authenticated
  using (true);

drop policy if exists "mt_counterfactual_trust_assessments_select_auth"
  on public.moral_trade_counterfactual_trust_assessments;
create policy "mt_counterfactual_trust_assessments_select_auth"
  on public.moral_trade_counterfactual_trust_assessments
  for select
  to authenticated
  using (true);

drop policy if exists "mt_non_public_goods_tier_enforce_select_owner"
  on public.moral_trade_non_public_goods_tier_enforcement_records;
create policy "mt_non_public_goods_tier_enforce_select_owner"
  on public.moral_trade_non_public_goods_tier_enforcement_records
  for select
  to authenticated
  using (owner_profile_id = auth.uid());

drop policy if exists "mt_non_public_goods_tier_enforce_insert_owner"
  on public.moral_trade_non_public_goods_tier_enforcement_records;
create policy "mt_non_public_goods_tier_enforce_insert_owner"
  on public.moral_trade_non_public_goods_tier_enforcement_records
  for insert
  to authenticated
  with check (
    owner_profile_id = auth.uid()
    and draft_preview_allowed_bool = false
    and match_candidate_preview_allowed_bool = false
    and matched_trade_lock_allowed_bool = false
    and payment_authorization_allowed_bool = false
    and payment_capture_allowed_bool = false
    and reliance_bearing_transition_allowed_bool = false
    and public_metric_publication_allowed_bool = false
    and release_gate_promotion_allowed_bool = false
  );
