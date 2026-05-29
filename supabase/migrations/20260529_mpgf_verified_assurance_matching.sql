begin;

create extension if not exists pgcrypto;

create table if not exists public.mpgf_public_goods_match_pools (
  id text primary key,
  funder_type text not null check (
    funder_type in ('demo_common_ground_pool', 'sponsor', 'subscription_pool', 'institution')
  ),
  budget_cents bigint not null check (budget_cents >= 0),
  base_match_ratio numeric not null default 1 check (base_match_ratio >= 0),
  qf_bonus_cents bigint not null default 0 check (qf_bonus_cents >= 0),
  visible_commitment text not null,
  restrictions_json jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('draft', 'active', 'paused', 'closed', 'voided')),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_public_goods_rounds (
  id text primary key,
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  match_pool_id text not null references public.mpgf_public_goods_match_pools (id),
  qf_enabled boolean not null default false,
  qf_cap_multiple numeric not null default 1.5 check (qf_cap_multiple >= 0),
  supporter_gate text not null check (
    supporter_gate in ('demo_self_attestation', 'verified_human', 'repository_existing_verification')
  ),
  status text not null default 'scheduled' check (
    status in ('draft', 'scheduled', 'open', 'allocation_pending', 'published', 'closed', 'emergency_suspended')
  ),
  created_at timestamptz not null default timezone('utc', now()),
  constraint mpgf_public_goods_rounds_valid_window check (ends_at > starts_at)
);

create table if not exists public.mpgf_public_goods_campaigns (
  id text primary key,
  round_id text references public.mpgf_public_goods_rounds (id) on delete set null,
  slug text not null unique,
  pool_alternative_id text references public.mpgf_candidate_alternatives (id) on delete set null,
  title text not null,
  destination_type text not null check (
    destination_type in ('external_charity', 'fiscal_host', 'internal_demo_pool', 'signed_sponsor_route')
  ),
  destination_ref text not null,
  cause_tags text[] not null default '{}',
  public_summary text not null,
  threshold_amount_cents bigint not null check (threshold_amount_cents > 0),
  threshold_supporters integer not null check (threshold_supporters > 0),
  deadline_at timestamptz not null,
  verification_method text not null,
  baseline_rule text not null,
  exit_rule text not null,
  review_status text not null default 'draft' check (
    review_status in ('draft', 'submitted', 'needs_evidence', 'challenge_window', 'approved', 'blocked', 'finalized')
  ),
  challenge_window_ends_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_public_goods_identity_attestations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id) on delete cascade,
  user_ref text not null,
  provider text not null check (
    provider in ('demo_self_attestation', 'repository_profile', 'external_proof_of_personhood')
  ),
  human_score_bps integer not null check (human_score_bps between 0 and 10000),
  expires_at timestamptz not null,
  status text not null check (status in ('active', 'expired', 'revoked', 'pending_review')),
  redacted_reference text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_public_goods_pledges (
  id uuid primary key default gen_random_uuid(),
  campaign_id text not null references public.mpgf_public_goods_campaigns (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete set null,
  user_ref text not null,
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'usd' check (currency = 'usd'),
  visibility_mode text not null check (
    visibility_mode in ('private_amount', 'public_supporter', 'public_reason')
  ),
  is_recurring boolean not null default false,
  capture_mode text not null check (
    capture_mode in ('external_handoff', 'stored_payment_method', 'signed_intent')
  ),
  eligibility_state text not null default 'pending_review' check (
    eligibility_state in ('eligible', 'pending_review', 'duplicate_identity', 'below_minimum', 'blocked')
  ),
  human_score_bps integer not null default 0 check (human_score_bps between 0 and 10000),
  status text not null default 'pledged' check (status in ('pledged', 'captured', 'voided', 'expired')),
  supporter_reason text,
  payment_intent_ref text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint mpgf_public_goods_no_custody_default check (
    capture_mode <> 'stored_payment_method' or payment_intent_ref is not null
  )
);

create table if not exists public.mpgf_public_goods_allocation_results (
  id uuid primary key default gen_random_uuid(),
  round_id text not null references public.mpgf_public_goods_rounds (id) on delete cascade,
  campaign_id text not null references public.mpgf_public_goods_campaigns (id) on delete cascade,
  direct_eligible_cents bigint not null check (direct_eligible_cents >= 0),
  verified_supporter_count integer not null check (verified_supporter_count >= 0),
  base_match_cents bigint not null check (base_match_cents >= 0),
  qf_score numeric not null check (qf_score >= 0),
  qf_bonus_cents bigint not null check (qf_bonus_cents >= 0),
  qf_bonus_cap_cents bigint not null check (qf_bonus_cap_cents >= 0),
  total_payout_cents bigint not null check (total_payout_cents >= 0),
  status text not null check (
    status in ('threshold_pending', 'threshold_met', 'review_pending', 'payable', 'expired', 'blocked')
  ),
  proof_required text not null check (
    proof_required in ('external_destination_receipt', 'provider_webhook_and_review', 'signed_intent_review')
  ),
  custody_mode text not null check (
    custody_mode in ('no_custody_external_handoff', 'provider_or_fiscal_host_required')
  ),
  finalized_at timestamptz not null default timezone('utc', now()),
  unique (round_id, campaign_id)
);

create table if not exists public.mpgf_public_goods_payment_proofs (
  id uuid primary key default gen_random_uuid(),
  pledge_id uuid references public.mpgf_public_goods_pledges (id) on delete set null,
  campaign_id text not null references public.mpgf_public_goods_campaigns (id) on delete cascade,
  external_receipt_ref text,
  charity_receipt_ref text,
  amount_verified_cents bigint not null default 0 check (amount_verified_cents >= 0),
  status text not null default 'pending_review' check (
    status in ('pending_review', 'verified', 'rejected', 'superseded')
  ),
  verified_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_public_goods_review_cases (
  id uuid primary key default gen_random_uuid(),
  campaign_id text not null references public.mpgf_public_goods_campaigns (id) on delete cascade,
  state text not null check (
    state in ('draft', 'submitted', 'needs_evidence', 'challenge_window', 'approved', 'blocked', 'finalized')
  ),
  action text not null check (
    action in ('approve', 'needs_evidence', 'block', 'challenge', 'finalize')
  ),
  reason_code text not null check (
    reason_code in (
      'destination_verified',
      'needs_destination_evidence',
      'needs_identity_evidence',
      'blocked_threat_baseline',
      'blocked_destination_risk',
      'challenge_opened',
      'challenge_resolved',
      'external_handoff_verified',
      'external_handoff_failed',
      'duplicate_identity_blocked',
      'appeal_requested',
      'appeal_denied',
      'appeal_upheld'
    )
  ),
  reviewer_id uuid references public.profiles (id) on delete set null,
  opened_at timestamptz not null default timezone('utc', now()),
  closed_at timestamptz,
  appeal_status text not null default 'none' check (
    appeal_status in ('none', 'appeal_requested', 'appeal_denied', 'appeal_upheld')
  ),
  challenge_window_ends_at timestamptz,
  public_notes text not null default '',
  allowed_next_actions text[] not null default '{}'
);

create table if not exists public.mpgf_public_goods_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id) on delete cascade,
  user_ref text not null,
  pool_id text not null references public.mpgf_public_goods_match_pools (id) on delete cascade,
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'usd' check (currency = 'usd'),
  interval text not null check (interval in ('monthly', 'annual')),
  status text not null default 'active' check (
    status in ('active', 'paused', 'cancelled', 'past_due', 'expired')
  ),
  capture_mode text not null default 'external_handoff' check (
    capture_mode in ('external_handoff', 'stored_payment_method', 'signed_intent')
  ),
  mode text not null default 'pledge_only' check (mode in ('pledge_only', 'test_payment', 'real_money')),
  provider_subscription_ref text,
  next_charge_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint mpgf_public_goods_subscription_no_hidden_provider check (
    mode = 'pledge_only' or provider_subscription_ref is not null
  )
);

create table if not exists public.mpgf_public_goods_experiment_assignments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id) on delete cascade,
  user_ref_hash text not null,
  experiment_key text not null,
  variant text not null,
  analytics_policy text not null default 'privacy_safe_no_raw_private_text' check (
    analytics_policy = 'privacy_safe_no_raw_private_text'
  ),
  assigned_at timestamptz not null default timezone('utc', now()),
  unique (experiment_key, user_ref_hash)
);

create table if not exists public.mpgf_public_goods_analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_ref_hash text,
  experiment_assignment_id uuid references public.mpgf_public_goods_experiment_assignments (id) on delete set null,
  event_type text not null,
  campaign_id text references public.mpgf_public_goods_campaigns (id) on delete set null,
  event_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint mpgf_public_goods_analytics_no_raw_contact check (
    not (event_json ? 'email') and
    not (event_json ? 'phone') and
    not (event_json ? 'private_wish') and
    not (event_json ? 'raw_evidence_text')
  )
);

alter table public.mpgf_pool_proposals
  add column if not exists public_goods_destination_type text check (
    public_goods_destination_type is null or
    public_goods_destination_type in ('external_charity', 'fiscal_host', 'internal_demo_pool', 'signed_sponsor_route')
  ),
  add column if not exists public_goods_destination_ref text,
  add column if not exists public_goods_threshold_amount_cents bigint check (
    public_goods_threshold_amount_cents is null or public_goods_threshold_amount_cents > 0
  ),
  add column if not exists public_goods_threshold_supporters integer check (
    public_goods_threshold_supporters is null or public_goods_threshold_supporters > 0
  ),
  add column if not exists public_goods_deadline_at timestamptz,
  add column if not exists public_goods_verification_method text,
  add column if not exists public_goods_baseline_rule text,
  add column if not exists public_goods_exit_rule text,
  add column if not exists public_goods_base_match_ratio numeric not null default 1 check (
    public_goods_base_match_ratio >= 0
  ),
  add column if not exists public_goods_qf_enabled boolean not null default false,
  add column if not exists public_goods_qf_cap_multiple numeric not null default 1.5 check (
    public_goods_qf_cap_multiple >= 0
  ),
  add column if not exists public_goods_payout_method text check (
    public_goods_payout_method is null or
    public_goods_payout_method in ('external_handoff', 'stored_payment_method', 'signed_intent')
  );

insert into public.mpgf_public_goods_match_pools (
  id,
  funder_type,
  budget_cents,
  base_match_ratio,
  qf_bonus_cents,
  visible_commitment,
  restrictions_json,
  status
) values (
  'mpgf-common-ground-sponsor-pool-2026-05',
  'demo_common_ground_pool',
  150000,
  1,
  50000,
  'A demo common-ground sponsor pool releases a 1:1 challenge match only after assurance and review gates pass.',
  '{"noCustody": true, "baseMatchDefault": "1:1", "qfCapMultiple": 1.5, "qfAfterThresholdOnly": true, "transferableTokens": false}'::jsonb,
  'active'
) on conflict (id) do update set
  funder_type = excluded.funder_type,
  budget_cents = excluded.budget_cents,
  base_match_ratio = excluded.base_match_ratio,
  qf_bonus_cents = excluded.qf_bonus_cents,
  visible_commitment = excluded.visible_commitment,
  restrictions_json = excluded.restrictions_json,
  status = excluded.status;

insert into public.mpgf_public_goods_rounds (
  id,
  name,
  starts_at,
  ends_at,
  match_pool_id,
  qf_enabled,
  qf_cap_multiple,
  supporter_gate,
  status
) values (
  'mpgf-assurance-round-demo-2026-05',
  'May 2026 Verified Assurance Matching demo',
  '2026-05-01T00:00:00.000Z',
  '2026-05-31T23:59:59.000Z',
  'mpgf-common-ground-sponsor-pool-2026-05',
  true,
  1.5,
  'demo_self_attestation',
  'open'
) on conflict (id) do update set
  name = excluded.name,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  match_pool_id = excluded.match_pool_id,
  qf_enabled = excluded.qf_enabled,
  qf_cap_multiple = excluded.qf_cap_multiple,
  supporter_gate = excluded.supporter_gate,
  status = excluded.status;

insert into public.mpgf_public_goods_campaigns (
  id,
  round_id,
  slug,
  pool_alternative_id,
  title,
  destination_type,
  destination_ref,
  cause_tags,
  public_summary,
  threshold_amount_cents,
  threshold_supporters,
  deadline_at,
  verification_method,
  baseline_rule,
  exit_rule,
  review_status,
  challenge_window_ends_at
) values
  (
    'campaign-global-health-basic-needs',
    'mpgf-assurance-round-demo-2026-05',
    'global-health-basic-needs',
    null,
    'Global health and basic needs assurance campaign',
    'external_charity',
    'Demo external destination: vetted global health fund',
    array['global health', 'basic needs', 'consensus good'],
    'A thresholded route for participants who want an external global-health destination to receive support only after enough verified people join.',
    25000,
    3,
    '2026-05-31T23:59:59.000Z',
    'External receipt or fiscal-host evidence reviewed before counting.',
    'No participant is asked to worsen a baseline or pay to prevent new harm.',
    'If the threshold fails, pledges expire without charge or custody.',
    'approved',
    '2026-06-03T23:59:59.000Z'
  ),
  (
    'campaign-existential-risk-resilience',
    'mpgf-assurance-round-demo-2026-05',
    'existential-risk-resilience',
    null,
    'Existential-risk resilience assurance campaign',
    'fiscal_host',
    'Demo fiscal-host route: resilience research fund',
    array['long-run future', 'resilience', 'hybrid good'],
    'A fiscal-hosted route that can attract support from longtermist, humanitarian, and pluralist participants without making a global moral ranking.',
    50000,
    3,
    '2026-05-31T23:59:59.000Z',
    'Fiscal-host confirmation plus reviewer acceptance.',
    'No threat, coercion, political quid pro quo, or perverse-incentive baseline is allowed.',
    'If the route misses either threshold, pledged intents are voided.',
    'challenge_window',
    '2026-06-04T23:59:59.000Z'
  ),
  (
    'campaign-animal-welfare-transition',
    'mpgf-assurance-round-demo-2026-05',
    'animal-welfare-transition',
    null,
    'Animal welfare transition assurance campaign',
    'external_charity',
    'Demo external destination: animal welfare transition fund',
    array['animal welfare', 'transition', 'hybrid good'],
    'A thresholded external-handoff route for reducing intense animal suffering while preserving review and challenge windows.',
    20000,
    3,
    '2026-05-31T23:59:59.000Z',
    'External receipt evidence and destination review before allocation.',
    'The campaign cannot reward newly increased harm or extortionary threats.',
    'Pledges expire if threshold or review gates do not pass.',
    'approved',
    '2026-06-03T23:59:59.000Z'
  ),
  (
    'campaign-public-interest-knowledge',
    'mpgf-assurance-round-demo-2026-05',
    'public-interest-knowledge',
    null,
    'Public-interest knowledge assurance campaign',
    'signed_sponsor_route',
    'Demo signed intent: public-interest research fund',
    array['epistemics', 'public knowledge', 'consensus good'],
    'A signed-intent route for shared evidence infrastructure that only becomes payable after supporter and review thresholds clear.',
    18000,
    2,
    '2026-05-20T23:59:59.000Z',
    'Signed sponsor intent plus public reviewer note.',
    'No private wish text or sensitive evidence is published by default.',
    'Missed thresholds are recorded as expired, not as failed donations.',
    'submitted',
    null
  )
on conflict (id) do update set
  round_id = excluded.round_id,
  slug = excluded.slug,
  title = excluded.title,
  destination_type = excluded.destination_type,
  destination_ref = excluded.destination_ref,
  cause_tags = excluded.cause_tags,
  public_summary = excluded.public_summary,
  threshold_amount_cents = excluded.threshold_amount_cents,
  threshold_supporters = excluded.threshold_supporters,
  deadline_at = excluded.deadline_at,
  verification_method = excluded.verification_method,
  baseline_rule = excluded.baseline_rule,
  exit_rule = excluded.exit_rule,
  review_status = excluded.review_status,
  challenge_window_ends_at = excluded.challenge_window_ends_at;

grant select on
  public.mpgf_public_goods_match_pools,
  public.mpgf_public_goods_rounds,
  public.mpgf_public_goods_campaigns,
  public.mpgf_public_goods_allocation_results,
  public.mpgf_public_goods_review_cases
to anon, authenticated;

grant select, insert, update on
  public.mpgf_public_goods_pledges,
  public.mpgf_public_goods_identity_attestations,
  public.mpgf_public_goods_payment_proofs,
  public.mpgf_public_goods_subscriptions
to authenticated;

grant select on
  public.mpgf_public_goods_experiment_assignments
to authenticated;

grant all on
  public.mpgf_public_goods_match_pools,
  public.mpgf_public_goods_rounds,
  public.mpgf_public_goods_campaigns,
  public.mpgf_public_goods_identity_attestations,
  public.mpgf_public_goods_pledges,
  public.mpgf_public_goods_allocation_results,
  public.mpgf_public_goods_payment_proofs,
  public.mpgf_public_goods_review_cases,
  public.mpgf_public_goods_subscriptions,
  public.mpgf_public_goods_experiment_assignments,
  public.mpgf_public_goods_analytics_events
to service_role;

alter table public.mpgf_public_goods_pledges enable row level security;
alter table public.mpgf_public_goods_identity_attestations enable row level security;
alter table public.mpgf_public_goods_payment_proofs enable row level security;
alter table public.mpgf_public_goods_review_cases enable row level security;
alter table public.mpgf_public_goods_subscriptions enable row level security;
alter table public.mpgf_public_goods_experiment_assignments enable row level security;
alter table public.mpgf_public_goods_analytics_events enable row level security;

drop policy if exists "mpgf_public_goods_pledges_select_own" on public.mpgf_public_goods_pledges;
create policy "mpgf_public_goods_pledges_select_own"
on public.mpgf_public_goods_pledges
for select
to authenticated
using (profile_id = auth.uid());

drop policy if exists "mpgf_public_goods_pledges_insert_own" on public.mpgf_public_goods_pledges;
create policy "mpgf_public_goods_pledges_insert_own"
on public.mpgf_public_goods_pledges
for insert
to authenticated
with check (profile_id = auth.uid());

drop policy if exists "mpgf_public_goods_pledges_update_own" on public.mpgf_public_goods_pledges;
create policy "mpgf_public_goods_pledges_update_own"
on public.mpgf_public_goods_pledges
for update
to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

drop policy if exists "mpgf_public_goods_identity_select_own" on public.mpgf_public_goods_identity_attestations;
create policy "mpgf_public_goods_identity_select_own"
on public.mpgf_public_goods_identity_attestations
for select
to authenticated
using (profile_id = auth.uid());

drop policy if exists "mpgf_public_goods_identity_insert_own" on public.mpgf_public_goods_identity_attestations;
create policy "mpgf_public_goods_identity_insert_own"
on public.mpgf_public_goods_identity_attestations
for insert
to authenticated
with check (profile_id = auth.uid());

drop policy if exists "mpgf_public_goods_identity_update_own" on public.mpgf_public_goods_identity_attestations;
create policy "mpgf_public_goods_identity_update_own"
on public.mpgf_public_goods_identity_attestations
for update
to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

drop policy if exists "mpgf_public_goods_payment_proofs_select_own" on public.mpgf_public_goods_payment_proofs;
create policy "mpgf_public_goods_payment_proofs_select_own"
on public.mpgf_public_goods_payment_proofs
for select
to authenticated
using (
  exists (
    select 1
    from public.mpgf_public_goods_pledges
    where mpgf_public_goods_pledges.id = mpgf_public_goods_payment_proofs.pledge_id
      and mpgf_public_goods_pledges.profile_id = auth.uid()
  )
);

drop policy if exists "mpgf_public_goods_payment_proofs_insert_own" on public.mpgf_public_goods_payment_proofs;
create policy "mpgf_public_goods_payment_proofs_insert_own"
on public.mpgf_public_goods_payment_proofs
for insert
to authenticated
with check (
  exists (
    select 1
    from public.mpgf_public_goods_pledges
    where mpgf_public_goods_pledges.id = mpgf_public_goods_payment_proofs.pledge_id
      and mpgf_public_goods_pledges.profile_id = auth.uid()
  )
);

drop policy if exists "mpgf_public_goods_review_cases_public_select" on public.mpgf_public_goods_review_cases;
create policy "mpgf_public_goods_review_cases_public_select"
on public.mpgf_public_goods_review_cases
for select
to anon, authenticated
using (true);

drop policy if exists "mpgf_public_goods_subscriptions_select_own" on public.mpgf_public_goods_subscriptions;
create policy "mpgf_public_goods_subscriptions_select_own"
on public.mpgf_public_goods_subscriptions
for select
to authenticated
using (profile_id = auth.uid());

drop policy if exists "mpgf_public_goods_subscriptions_insert_own" on public.mpgf_public_goods_subscriptions;
create policy "mpgf_public_goods_subscriptions_insert_own"
on public.mpgf_public_goods_subscriptions
for insert
to authenticated
with check (profile_id = auth.uid());

drop policy if exists "mpgf_public_goods_subscriptions_update_own" on public.mpgf_public_goods_subscriptions;
create policy "mpgf_public_goods_subscriptions_update_own"
on public.mpgf_public_goods_subscriptions
for update
to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

drop policy if exists "mpgf_public_goods_experiment_assignments_select_own" on public.mpgf_public_goods_experiment_assignments;
create policy "mpgf_public_goods_experiment_assignments_select_own"
on public.mpgf_public_goods_experiment_assignments
for select
to authenticated
using (profile_id = auth.uid());

commit;
