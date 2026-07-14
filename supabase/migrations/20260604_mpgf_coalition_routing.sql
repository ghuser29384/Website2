create table if not exists public.mpgf_user_budgets (
  id text primary key,
  round_id text not null references public.mpgf_public_goods_rounds (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete set null,
  user_ref_hash text not null check (user_ref_hash ~ '^sha256:[0-9a-f]{64}$'),
  budget_period text not null default 'monthly' check (budget_period in ('monthly', 'round_limited')),
  monthly_budget_cents bigint check (monthly_budget_cents is null or monthly_budget_cents >= 0),
  round_budget_cents bigint check (round_budget_cents is null or round_budget_cents >= 0),
  total_budget_cents bigint not null check (total_budget_cents > 0),
  settlement_currency text not null default 'usd' check (settlement_currency = 'usd'),
  currency text not null default 'usd' check (currency = 'usd'),
  recurrence_rule text,
  payment_profile_ref_hash text check (
    payment_profile_ref_hash is null or payment_profile_ref_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  external_payment_evidence_mode text not null default 'reviewed_manual_evidence_only' check (
    external_payment_evidence_mode = 'reviewed_manual_evidence_only'
  ),
  default_visibility text not null default 'private_aggregate_only' check (
    default_visibility in ('private_aggregate_only', 'public_after_aggregation_review')
  ),
  default_allocation_baseline text not null default 'participant_default_allocation_or_non_participation',
  baseline_confidence_level text not null default 'medium' check (
    baseline_confidence_level in ('low', 'medium', 'high')
  ),
  baseline_confidence_rationale text,
  participant_surplus_confirmation_required boolean not null default true check (
    participant_surplus_confirmation_required = true
  ),
  participant_surplus_confirmed_at timestamptz,
  eligible_project_set_hash text not null default 'sha256:0000000000000000000000000000000000000000000000000000000000000000' check (
    eligible_project_set_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  eligible_pool_set_hash text not null default 'sha256:0000000000000000000000000000000000000000000000000000000000000000' check (
    eligible_pool_set_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  project_set_change_policy text not null default 'require_reconfirmation' check (
    project_set_change_policy in ('require_reconfirmation', 'allow_if_matches_preapproved_policy')
  ),
  fallback_reroute_policy_ref text not null default 'frozen_eligible_set_then_carry_forward_release_hold_or_manual_review_v1',
  fallback_eligible_project_set_hash text not null default 'sha256:0000000000000000000000000000000000000000000000000000000000000000' check (
    fallback_eligible_project_set_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  unroutable_budget_policy text not null default 'carry_forward' check (
    unroutable_budget_policy in ('carry_forward', 'release_hold', 'manual_review')
  ),
  fallback_rule jsonb not null default jsonb_build_object(
    'onProjectFailure', 'release_hold',
    'onAuthorizationExpiry', 'reauthorize_near_capture',
    'carryForwardAllowed', true
  ),
  round_lock_confirmation_required boolean not null default true check (
    round_lock_confirmation_required = true
  ),
  cancel_until timestamptz,
  terms_snapshot_hash text check (
    terms_snapshot_hash is null or terms_snapshot_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  participant_confirmation_hash text check (
    participant_confirmation_hash is null or participant_confirmation_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  status text not null default 'draft' check (
    status in (
      'draft',
      'active',
      'authorization_pending',
      'authorized',
      'partially_routed',
      'settled',
      'released',
      'voided',
      'expired'
    )
  ),
  no_global_moral_ranking boolean not null default true check (no_global_moral_ranking = true),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (round_id, user_ref_hash)
);

create table if not exists public.mpgf_support_stances (
  id text primary key,
  budget_id text references public.mpgf_user_budgets (id) on delete cascade,
  round_id text not null references public.mpgf_public_goods_rounds (id) on delete cascade,
  campaign_id text references public.mpgf_public_goods_campaigns (id) on delete cascade,
  bucket_id text,
  profile_id uuid references public.profiles (id) on delete set null,
  user_ref_hash text not null check (user_ref_hash ~ '^sha256:[0-9a-f]{64}$'),
  stance text not null check (stance in ('strong', 'weak', 'dissent', 'abstain')),
  max_alloc_amount_cents bigint check (max_alloc_amount_cents is null or max_alloc_amount_cents >= 0),
  max_alloc_pct_bps integer check (max_alloc_pct_bps is null or max_alloc_pct_bps between 0 and 10000),
  rank_order integer check (rank_order is null or rank_order > 0),
  redacted_note_hash text check (
    redacted_note_hash is null or redacted_note_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  acceptable_counter_buckets text[] not null default '{}',
  private_by_default boolean not null default true check (private_by_default = true),
  counts_for_common_ground boolean not null default true,
  no_global_moral_ranking boolean not null default true check (no_global_moral_ranking = true),
  created_at timestamptz not null default timezone('utc', now()),
  constraint mpgf_support_stances_project_or_bucket check (
    (campaign_id is not null and bucket_id is null) or (campaign_id is null and bucket_id is not null)
  ),
  unique (round_id, user_ref_hash, campaign_id, bucket_id)
);

create table if not exists public.mpgf_coalition_candidates (
  id text primary key,
  round_id text not null references public.mpgf_public_goods_rounds (id) on delete cascade,
  campaign_id text not null references public.mpgf_public_goods_campaigns (id) on delete cascade,
  hard_gate_status text not null check (
    hard_gate_status in ('passed', 'pending_review', 'challenge_open', 'blocked')
  ),
  candidate_status text not null check (
    candidate_status in (
      'threshold_feasible',
      'amount_gap',
      'supporter_gap',
      'cluster_gap',
      'hard_gate_pending',
      'hard_gate_blocked'
    )
  ),
  direct_eligible_cents bigint not null default 0 check (direct_eligible_cents >= 0),
  eligible_weak_budget_cents bigint not null default 0 check (eligible_weak_budget_cents >= 0),
  routed_weak_budget_cents bigint not null default 0 check (
    routed_weak_budget_cents >= 0 and routed_weak_budget_cents <= eligible_weak_budget_cents
  ),
  threshold_amount_cents bigint not null check (threshold_amount_cents > 0),
  threshold_supporters integer not null check (threshold_supporters > 0),
  threshold_cluster_min integer not null default 2 check (threshold_cluster_min > 0),
  active_supporter_count integer not null default 0 check (active_supporter_count >= 0),
  active_cluster_count integer not null default 0 check (active_cluster_count >= 0),
  threshold_feasible_flag boolean not null default false,
  ecm_batch_clearing_eligible boolean not null default false,
  failure_bonus_or_carry_forward_eligible boolean not null default false,
  no_global_moral_ranking boolean not null default true check (no_global_moral_ranking = true),
  calculation_hash text not null check (calculation_hash ~ '^sha256:[0-9a-f]{64}$'),
  created_at timestamptz not null default timezone('utc', now()),
  unique (round_id, campaign_id)
);

create index if not exists mpgf_user_budgets_round_status_idx
  on public.mpgf_user_budgets (round_id, status);

create index if not exists mpgf_support_stances_round_campaign_idx
  on public.mpgf_support_stances (round_id, campaign_id, stance);

create index if not exists mpgf_coalition_candidates_round_status_idx
  on public.mpgf_coalition_candidates (round_id, candidate_status, threshold_feasible_flag);

alter table public.mpgf_user_budgets enable row level security;
alter table public.mpgf_support_stances enable row level security;
alter table public.mpgf_coalition_candidates enable row level security;

drop policy if exists "mpgf_user_budgets_select_own" on public.mpgf_user_budgets;
create policy "mpgf_user_budgets_select_own"
on public.mpgf_user_budgets
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "mpgf_user_budgets_write_own" on public.mpgf_user_budgets;
create policy "mpgf_user_budgets_write_own"
on public.mpgf_user_budgets
for all
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "mpgf_support_stances_select_own" on public.mpgf_support_stances;
create policy "mpgf_support_stances_select_own"
on public.mpgf_support_stances
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "mpgf_support_stances_write_own" on public.mpgf_support_stances;
create policy "mpgf_support_stances_write_own"
on public.mpgf_support_stances
for all
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "mpgf_coalition_candidates_public_select" on public.mpgf_coalition_candidates;
create policy "mpgf_coalition_candidates_public_select"
on public.mpgf_coalition_candidates
for select
to anon, authenticated
using (true);

grant select, insert, update on public.mpgf_user_budgets to authenticated;
grant select, insert, update on public.mpgf_support_stances to authenticated;
grant select on public.mpgf_coalition_candidates to anon, authenticated;

grant all on public.mpgf_user_budgets to service_role;
grant all on public.mpgf_support_stances to service_role;
grant all on public.mpgf_coalition_candidates to service_role;

comment on table public.mpgf_user_budgets is
  'Per-round MPGF Common Ground Budget records. Budget records freeze baseline, participant surplus confirmation, eligible-set hashes, fallback policy, and no-capture preview terms; public outputs remain aggregate-only.';

comment on table public.mpgf_support_stances is
  'Private-by-default strong, weak, dissent, or abstain stances over projects or buckets. Stances include caps, rank order, and redacted-note hashes, feed coalition feasibility, and never create global moral rankings.';

comment on table public.mpgf_coalition_candidates is
  'Aggregate coalition-feasibility candidates for Coalition-Routed Escrowed Conditional Matching. Rows publish threshold feasibility, cluster breadth, and routed weak-support totals only.';
