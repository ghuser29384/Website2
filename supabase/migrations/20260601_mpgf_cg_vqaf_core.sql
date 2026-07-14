begin;

create table if not exists public.mpgf_moral_profiles (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  primary_causes text[] not null default '{}',
  secondary_common_ground_causes text[] not null default '{}',
  privacy_stage text not null default 'private' check (privacy_stage in ('private', 'aggregate_only', 'public_opt_in')),
  no_global_moral_ranking boolean not null default true check (no_global_moral_ranking = true),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_support_signals (
  id text primary key,
  round_id text not null references public.mpgf_public_goods_rounds (id) on delete cascade,
  campaign_id text not null references public.mpgf_public_goods_campaigns (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete set null,
  user_ref_hash text not null check (user_ref_hash ~ '^sha256:[0-9a-f]{64}$'),
  moral_cluster_hash text not null check (moral_cluster_hash ~ '^sha256:[0-9a-f]{64}$'),
  signal_type text not null check (
    signal_type in ('strong_support', 'weak_common_ground_support', 'dissent_review_requested')
  ),
  strength_bps integer not null check (strength_bps between 0 and 10000),
  private_by_default boolean not null default true check (private_by_default = true),
  counts_for_common_ground boolean not null default true,
  no_global_moral_ranking boolean not null default true check (no_global_moral_ranking = true),
  calc_hash text not null check (calc_hash ~ '^sha256:[0-9a-f]{64}$'),
  created_at timestamptz not null default timezone('utc', now()),
  unique (round_id, campaign_id, user_ref_hash)
);

create table if not exists public.mpgf_conditional_pledges (
  id text primary key,
  round_id text not null references public.mpgf_public_goods_rounds (id) on delete cascade,
  campaign_id text not null references public.mpgf_public_goods_campaigns (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete set null,
  amount_cents bigint not null check (amount_cents > 0),
  counted_cap_cents bigint not null check (counted_cap_cents > 0),
  visibility text not null default 'private_amount' check (visibility in ('private_amount', 'public_supporter', 'public_reason')),
  payment_mode text not null check (payment_mode in ('every_org_fast_route', 'stripe_setup_intent_saved_commitment', 'manual_proof_fallback')),
  status text not null default 'signal_only' check (
    status in ('signal_only', 'pledge_saved', 'pending_verification', 'threshold_cleared', 'counted', 'voided', 'expired')
  ),
  deadline_at timestamptz not null,
  capture_policy text not null default 'capture_only_after_threshold_review_and_challenge_window' check (
    capture_policy = 'capture_only_after_threshold_review_and_challenge_window'
  ),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_payment_method_tokens (
  id text primary key,
  profile_id uuid references public.profiles (id) on delete set null,
  provider text not null check (provider in ('stripe')),
  provider_customer_id_hash text not null check (provider_customer_id_hash ~ '^sha256:[0-9a-f]{64}$'),
  provider_payment_method_id_hash text not null check (provider_payment_method_id_hash ~ '^sha256:[0-9a-f]{64}$'),
  setup_status text not null check (setup_status in ('setup_intent_created', 'setup_succeeded', 'setup_failed', 'revoked')),
  future_use_consent_at timestamptz,
  raw_card_data_stored boolean not null default false check (raw_card_data_stored = false),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_payment_events (
  id text primary key,
  conditional_pledge_id text references public.mpgf_conditional_pledges (id) on delete set null,
  provider text not null check (provider in ('stripe', 'every_org', 'fiscal_host', 'manual_evidence')),
  provider_event_id_hash text not null unique check (provider_event_id_hash ~ '^sha256:[0-9a-f]{64}$'),
  provider_status text not null,
  amount_cents bigint not null check (amount_cents >= 0),
  signature_verified boolean not null default false,
  payload_hash text check (payload_hash is null or payload_hash ~ '^sha256:[0-9a-f]{64}$'),
  verified_at timestamptz,
  final_payout_authorized boolean not null default false check (final_payout_authorized = false),
  append_only_hash text not null check (append_only_hash ~ '^sha256:[0-9a-f]{64}$'),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_sponsor_pool_entries (
  id text primary key,
  round_id text references public.mpgf_public_goods_rounds (id) on delete set null,
  sponsor_pool_id text not null references public.mpgf_public_goods_match_pools (id) on delete cascade,
  source_type text not null check (
    source_type in ('direct_sponsor_deposit', 'recurring_member_tithe', 'donation_offset_surplus', 'trade_surplus_tithe')
  ),
  amount_cents bigint not null check (amount_cents > 0),
  restricted_or_unrestricted text not null check (restricted_or_unrestricted in ('restricted_to_round', 'unrestricted_future_rounds')),
  provenance_hash text not null check (provenance_hash ~ '^sha256:[0-9a-f]{64}$'),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_allocation_results (
  id text primary key,
  round_id text not null references public.mpgf_public_goods_rounds (id) on delete cascade,
  campaign_id text not null references public.mpgf_public_goods_campaigns (id) on delete cascade,
  eligible_direct_cents bigint not null check (eligible_direct_cents >= 0),
  base_match_cents bigint not null check (base_match_cents >= 0),
  q_signal_cents bigint not null check (q_signal_cents >= 0),
  bonus_match_cents bigint not null check (bonus_match_cents >= 0),
  final_allocated_cents bigint not null check (final_allocated_cents >= 0),
  formula_version text not null check (formula_version = 'cg_vqaf_capital_constrained_qf_v1'),
  lambda numeric not null check (lambda >= 0),
  calculation_hash text not null check (calculation_hash ~ '^sha256:[0-9a-f]{64}$'),
  no_global_moral_ranking boolean not null default true check (no_global_moral_ranking = true),
  created_at timestamptz not null default timezone('utc', now()),
  unique (round_id, campaign_id, formula_version)
);

create table if not exists public.mpgf_dissent_notes (
  id text primary key,
  campaign_id text not null references public.mpgf_public_goods_campaigns (id) on delete cascade,
  filed_by_profile_id uuid references public.profiles (id) on delete set null,
  filer_ref_hash text not null check (filer_ref_hash ~ '^sha256:[0-9a-f]{64}$'),
  reason_code text not null check (
    reason_code in ('externality_review', 'threat_baseline_review', 'destination_review', 'collusion_review', 'other_reviewable_claim')
  ),
  public_summary text not null,
  status text not null default 'opened' check (status in ('opened', 'under_review', 'resolved', 'dismissed')),
  pauses_unreleased_milestones boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_milestones (
  id text primary key,
  campaign_id text not null references public.mpgf_public_goods_campaigns (id) on delete cascade,
  percent_release integer not null check (percent_release between 0 and 100),
  evidence_requirements jsonb not null default '{}'::jsonb,
  release_status text not null default 'pending' check (
    release_status in ('pending', 'partner_release_pending', 'released', 'paused', 'voided')
  ),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists mpgf_support_signals_round_campaign_idx
  on public.mpgf_support_signals (round_id, campaign_id, signal_type, created_at desc);

create index if not exists mpgf_conditional_pledges_round_campaign_idx
  on public.mpgf_conditional_pledges (round_id, campaign_id, status, payment_mode);

create index if not exists mpgf_payment_events_pledge_idx
  on public.mpgf_payment_events (conditional_pledge_id, provider, created_at desc);

create index if not exists mpgf_allocation_results_round_idx
  on public.mpgf_allocation_results (round_id, formula_version, campaign_id);

alter table public.mpgf_moral_profiles enable row level security;
alter table public.mpgf_support_signals enable row level security;
alter table public.mpgf_conditional_pledges enable row level security;
alter table public.mpgf_payment_method_tokens enable row level security;
alter table public.mpgf_payment_events enable row level security;
alter table public.mpgf_sponsor_pool_entries enable row level security;
alter table public.mpgf_allocation_results enable row level security;
alter table public.mpgf_dissent_notes enable row level security;
alter table public.mpgf_milestones enable row level security;

drop policy if exists "mpgf_moral_profiles_select_own" on public.mpgf_moral_profiles;
create policy "mpgf_moral_profiles_select_own"
on public.mpgf_moral_profiles
for select
to authenticated
using (profile_id = auth.uid());

drop policy if exists "mpgf_moral_profiles_write_own" on public.mpgf_moral_profiles;
create policy "mpgf_moral_profiles_write_own"
on public.mpgf_moral_profiles
for all
to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

drop policy if exists "mpgf_support_signals_select_own" on public.mpgf_support_signals;
create policy "mpgf_support_signals_select_own"
on public.mpgf_support_signals
for select
to authenticated
using (profile_id = auth.uid());

drop policy if exists "mpgf_support_signals_insert_own" on public.mpgf_support_signals;
create policy "mpgf_support_signals_insert_own"
on public.mpgf_support_signals
for insert
to authenticated
with check (profile_id = auth.uid());

drop policy if exists "mpgf_conditional_pledges_select_own" on public.mpgf_conditional_pledges;
create policy "mpgf_conditional_pledges_select_own"
on public.mpgf_conditional_pledges
for select
to authenticated
using (profile_id = auth.uid());

drop policy if exists "mpgf_conditional_pledges_insert_own" on public.mpgf_conditional_pledges;
create policy "mpgf_conditional_pledges_insert_own"
on public.mpgf_conditional_pledges
for insert
to authenticated
with check (profile_id = auth.uid());

drop policy if exists "mpgf_payment_method_tokens_select_own" on public.mpgf_payment_method_tokens;
create policy "mpgf_payment_method_tokens_select_own"
on public.mpgf_payment_method_tokens
for select
to authenticated
using (profile_id = auth.uid());

drop policy if exists "mpgf_sponsor_pool_entries_public_select" on public.mpgf_sponsor_pool_entries;
create policy "mpgf_sponsor_pool_entries_public_select"
on public.mpgf_sponsor_pool_entries
for select
to anon, authenticated
using (true);

drop policy if exists "mpgf_allocation_results_public_select" on public.mpgf_allocation_results;
create policy "mpgf_allocation_results_public_select"
on public.mpgf_allocation_results
for select
to anon, authenticated
using (true);

drop policy if exists "mpgf_dissent_notes_public_select" on public.mpgf_dissent_notes;
create policy "mpgf_dissent_notes_public_select"
on public.mpgf_dissent_notes
for select
to anon, authenticated
using (true);

drop policy if exists "mpgf_milestones_public_select" on public.mpgf_milestones;
create policy "mpgf_milestones_public_select"
on public.mpgf_milestones
for select
to anon, authenticated
using (true);

grant select, insert, update on public.mpgf_moral_profiles to authenticated;
grant select, insert on public.mpgf_support_signals to authenticated;
grant select, insert on public.mpgf_conditional_pledges to authenticated;
grant select on public.mpgf_payment_method_tokens to authenticated;
grant select on public.mpgf_sponsor_pool_entries to anon, authenticated;
grant select on public.mpgf_allocation_results to anon, authenticated;
grant select on public.mpgf_dissent_notes to anon, authenticated;
grant select on public.mpgf_milestones to anon, authenticated;
grant all on public.mpgf_moral_profiles to service_role;
grant all on public.mpgf_support_signals to service_role;
grant all on public.mpgf_conditional_pledges to service_role;
grant all on public.mpgf_payment_method_tokens to service_role;
grant all on public.mpgf_payment_events to service_role;
grant all on public.mpgf_sponsor_pool_entries to service_role;
grant all on public.mpgf_allocation_results to service_role;
grant all on public.mpgf_dissent_notes to service_role;
grant all on public.mpgf_milestones to service_role;

comment on table public.mpgf_support_signals is
  'Private-by-default Common-Ground Verified Quadratic Assurance Funding support signals. Public outputs aggregate signal counts and moral-cluster breadth only; they do not create a global moral ranking.';

comment on table public.mpgf_conditional_pledges is
  'CG-VQAF conditional pledge records for fast Every.org routes, Stripe SetupIntent saved commitments, and manual proof fallback.';

comment on table public.mpgf_payment_method_tokens is
  'Stripe SetupIntent-first saved payment-method tokens. Provider ids are stored only as hashes; raw card data is never stored.';

comment on table public.mpgf_payment_events is
  'Append-only CG-VQAF payment events from Stripe, Every.org, fiscal hosts, or manual evidence. Events cannot authorize final payout by themselves.';

comment on table public.mpgf_allocation_results is
  'Deterministic CG-VQAF allocation results using bonus_j = min(qf_cap_multiple * direct_j, lambda * q_signal_j) under a finite sponsor bonus budget.';

commit;
