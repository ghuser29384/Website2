begin;

alter table public.mpgf_pledge_intents
  add column if not exists acceptable_counterpart_buckets text[] not null default array['any-pre-vetted-distinct-moral-bucket'],
  add column if not exists minimum_counterparty_cleared_cents bigint not null default 100 check (minimum_counterparty_cleared_cents >= 0),
  add column if not exists max_exposure_cents bigint not null default 0 check (max_exposure_cents >= 0),
  add column if not exists donor_exposure_disclosure jsonb not null default '{}'::jsonb,
  add column if not exists cross_view_clearance_policy text not null default 'explicit_distinct_counterpart_bucket_conditions_before_moral_trade_counting';

alter table public.mpgf_conditional_pledges
  add column if not exists acceptable_counterpart_buckets text[] not null default array['any-pre-vetted-distinct-moral-bucket'],
  add column if not exists minimum_counterparty_cleared_cents bigint not null default 100 check (minimum_counterparty_cleared_cents >= 0),
  add column if not exists max_exposure_cents bigint not null default 0 check (max_exposure_cents >= 0),
  add column if not exists failure_path_disclosure jsonb not null default '{}'::jsonb,
  add column if not exists cross_view_clearance_policy text not null default 'explicit_distinct_counterpart_bucket_conditions_before_moral_trade_counting';

alter table public.mpgf_public_goods_pledges
  add column if not exists acceptable_counterpart_buckets text[] not null default array['any-pre-vetted-distinct-moral-bucket'],
  add column if not exists minimum_counterparty_cleared_cents bigint not null default 100 check (minimum_counterparty_cleared_cents >= 0),
  add column if not exists max_exposure_cents bigint not null default 0 check (max_exposure_cents >= 0),
  add column if not exists donor_exposure_disclosure jsonb not null default '{}'::jsonb;

create table if not exists public.mpgf_round_rulebooks (
  id text primary key,
  round_id text not null references public.mpgf_public_goods_rounds (id) on delete cascade,
  policy text not null default 'ecm_core_supervised_custody_cross_view_batch_rulebook_v1',
  batch_cadence_policy text not null default 'recurring_batch_rounds_close_clear_jit_authorize_custody_verify_challenge_release_audit',
  custody_policy text not null default 'partner_or_fiscal_host_supervised_custody_required_for_cleared_funds_no_platform_escrow_claim',
  rulebook_json jsonb not null,
  published_before_round_open boolean not null default true,
  no_global_moral_ranking boolean not null default true check (no_global_moral_ranking = true),
  moral_reputation_can_increase_allocation_power boolean not null default false check (moral_reputation_can_increase_allocation_power = false),
  created_at timestamptz not null default timezone('utc', now()),
  unique (round_id, policy)
);

create table if not exists public.mpgf_recipient_registry (
  id text primary key,
  campaign_id text not null references public.mpgf_public_goods_campaigns (id) on delete cascade,
  legal_entity_or_fiscal_host text not null,
  registry_status text not null check (
    registry_status in ('eligible_after_review_and_challenge', 'review_required_before_payable', 'demo_only_not_payable', 'blocked_not_payable')
  ),
  payout_rail text not null check (
    payout_rail in ('partner_donation_route', 'fiscal_host_release', 'signed_sponsor_route', 'not_payable_demo_only')
  ),
  allowed_uses text[] not null default '{}',
  receipt_or_milestone_rules text not null,
  review_state text not null,
  challenge_state text not null check (challenge_state in ('challenge_window_open', 'closed_or_not_open')),
  challenge_window_ends_at timestamptz,
  public_aggregation_only boolean not null default true check (public_aggregation_only = true),
  created_at timestamptz not null default timezone('utc', now()),
  unique (campaign_id)
);

create table if not exists public.mpgf_custody_holds (
  id text primary key,
  round_id text not null references public.mpgf_public_goods_rounds (id) on delete cascade,
  campaign_id text not null references public.mpgf_public_goods_campaigns (id) on delete cascade,
  pledge_intent_id text references public.mpgf_pledge_intents (id) on delete set null,
  provider text not null check (provider in ('stripe', 'fiscal_host', 'external_provider', 'manual_evidence')),
  custodial_state text not null check (
    custodial_state in (
      'awaiting_partner_or_fiscal_host_custody_confirmation',
      'custody_confirmed',
      'release_ready_after_challenge_window',
      'released',
      'cancelled',
      'expired'
    )
  ),
  amount_cents bigint not null check (amount_cents >= 0),
  max_exposure_cents bigint not null check (max_exposure_cents >= amount_cents),
  escrow_claim_allowed boolean not null default false check (escrow_claim_allowed = false),
  release_only_after_recipient_verification boolean not null default true check (release_only_after_recipient_verification = true),
  release_only_after_challenge_window_completion boolean not null default true check (release_only_after_challenge_window_completion = true),
  failure_rule jsonb not null default '{}'::jsonb,
  provider_ref_hash text check (provider_ref_hash is null or provider_ref_hash ~ '^sha256:[0-9a-f]{64}$'),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists mpgf_round_rulebooks_round_idx
  on public.mpgf_round_rulebooks (round_id, policy);

create index if not exists mpgf_recipient_registry_status_idx
  on public.mpgf_recipient_registry (registry_status, payout_rail);

create index if not exists mpgf_custody_holds_round_state_idx
  on public.mpgf_custody_holds (round_id, custodial_state, created_at desc);

alter table public.mpgf_round_rulebooks enable row level security;
alter table public.mpgf_recipient_registry enable row level security;
alter table public.mpgf_custody_holds enable row level security;

drop policy if exists "mpgf_round_rulebooks_public_select" on public.mpgf_round_rulebooks;
create policy "mpgf_round_rulebooks_public_select"
on public.mpgf_round_rulebooks
for select
to anon, authenticated
using (true);

drop policy if exists "mpgf_recipient_registry_public_select" on public.mpgf_recipient_registry;
create policy "mpgf_recipient_registry_public_select"
on public.mpgf_recipient_registry
for select
to anon, authenticated
using (true);

drop policy if exists "mpgf_custody_holds_service_only_select" on public.mpgf_custody_holds;
create policy "mpgf_custody_holds_service_only_select"
on public.mpgf_custody_holds
for select
to service_role
using (true);

grant select on public.mpgf_round_rulebooks, public.mpgf_recipient_registry to anon, authenticated;
grant all on public.mpgf_round_rulebooks, public.mpgf_recipient_registry, public.mpgf_custody_holds to service_role;

comment on table public.mpgf_round_rulebooks is
  'Published MPGF ECM-core round rulebooks: fixed match schedule, batch cadence, custody policy, donor disclosure rules, and preserved safety/privacy/provenance invariants.';

comment on table public.mpgf_recipient_registry is
  'Public MPGF recipient registry with legal entity or fiscal host, payout rail, allowed uses, receipt or milestone rules, review state, and challenge state.';

comment on table public.mpgf_custody_holds is
  'Private post-clear MPGF custody-hold records. These require partner or fiscal-host custody confirmation and do not create a platform escrow claim.';

commit;
