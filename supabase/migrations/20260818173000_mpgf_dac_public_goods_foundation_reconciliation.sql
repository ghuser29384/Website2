begin;

-- Production reconciliation for the canonical public-goods tables that the
-- reviewed DAC publication and pledge migrations extend. Some long-lived
-- environments have the proposal-side MPGF schema and visibility enums but
-- never installed these four canonical tables. This migration is additive,
-- contains no seed rows, and deliberately creates no payment execution path.

create extension if not exists pgcrypto with schema extensions;

do $prerequisites$
begin
  if to_regclass('public.profiles') is null
     or to_regclass('public.mpgf_pool_proposals') is null
     or to_regclass('public.mpgf_candidate_alternatives') is null then
    raise exception using
      errcode = '55000',
      message = 'The canonical MPGF proposal and profile prerequisites are missing.';
  end if;

  if to_regtype('public.mpgf_threshold_visibility') is null
     or to_regtype('public.mpgf_progress_visibility') is null then
    raise exception using
      errcode = '55000',
      message = 'The canonical MPGF visibility enum prerequisites are missing.';
  end if;

  if (
    select array_agg(enum_value order by enum_order)
    from (
      select e.enumlabel::text as enum_value, e.enumsortorder as enum_order
      from pg_enum e
      where e.enumtypid = 'public.mpgf_threshold_visibility'::regtype
    ) labels
  ) is distinct from array['public_exact']::text[] then
    raise exception using
      errcode = '55000',
      message = 'The threshold-visibility enum differs from the reviewed canonical contract.';
  end if;

  if (
    select array_agg(enum_value order by enum_order)
    from (
      select e.enumlabel::text as enum_value, e.enumsortorder as enum_order
      from pg_enum e
      where e.enumtypid = 'public.mpgf_progress_visibility'::regtype
    ) labels
  ) is distinct from array[
    'exact_amount',
    'progress_range',
    'threshold_status_only',
    'sealed_progress'
  ]::text[] then
    raise exception using
      errcode = '55000',
      message = 'The progress-visibility enum differs from the reviewed canonical contract.';
  end if;
end;
$prerequisites$;

create table if not exists public.mpgf_public_goods_match_pools (
  id text primary key,
  funder_type text not null check (
    funder_type in (
      'demo_common_ground_pool',
      'sponsor',
      'subscription_pool',
      'institution'
    )
  ),
  budget_cents bigint not null check (budget_cents >= 0),
  base_match_ratio numeric not null default 1 check (base_match_ratio >= 0),
  qf_bonus_cents bigint not null default 0 check (qf_bonus_cents >= 0),
  visible_commitment text not null,
  restrictions_json jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (
    status in ('draft', 'active', 'paused', 'closed', 'voided')
  ),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_public_goods_rounds (
  id text primary key,
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  match_pool_id text not null
    references public.mpgf_public_goods_match_pools (id),
  qf_enabled boolean not null default false,
  qf_cap_multiple numeric not null default 1.5 check (qf_cap_multiple >= 0),
  supporter_gate text not null check (
    supporter_gate in (
      'demo_self_attestation',
      'verified_human',
      'repository_existing_verification'
    )
  ),
  status text not null default 'scheduled' check (
    status in (
      'draft',
      'scheduled',
      'open',
      'allocation_pending',
      'published',
      'closed',
      'emergency_suspended'
    )
  ),
  created_at timestamptz not null default timezone('utc', now()),
  constraint mpgf_public_goods_rounds_valid_window
    check (ends_at > starts_at)
);

create table if not exists public.mpgf_public_goods_campaigns (
  id text primary key,
  round_id text
    references public.mpgf_public_goods_rounds (id) on delete set null,
  slug text not null unique,
  pool_alternative_id text
    references public.mpgf_candidate_alternatives (id) on delete set null,
  title text not null,
  destination_type text not null check (
    destination_type in (
      'external_charity',
      'fiscal_host',
      'internal_demo_pool',
      'signed_sponsor_route'
    )
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
    review_status in (
      'draft',
      'submitted',
      'needs_evidence',
      'challenge_window',
      'approved',
      'blocked',
      'finalized'
    )
  ),
  challenge_window_ends_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_public_goods_pledges (
  id uuid primary key default gen_random_uuid(),
  campaign_id text not null
    references public.mpgf_public_goods_campaigns (id) on delete cascade,
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
    eligibility_state in (
      'eligible',
      'pending_review',
      'duplicate_identity',
      'below_minimum',
      'blocked'
    )
  ),
  human_score_bps integer not null default 0 check (
    human_score_bps between 0 and 10000
  ),
  status text not null default 'pledged' check (
    status in ('pledged', 'captured', 'voided', 'expired')
  ),
  supporter_reason text,
  payment_intent_ref text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint mpgf_public_goods_no_custody_default check (
    capture_mode <> 'stored_payment_method' or payment_intent_ref is not null
  )
);

alter table public.mpgf_public_goods_match_pools enable row level security;
alter table public.mpgf_public_goods_rounds enable row level security;
alter table public.mpgf_public_goods_campaigns enable row level security;
alter table public.mpgf_public_goods_pledges enable row level security;

drop policy if exists mpgf_public_goods_match_pools_public_read
  on public.mpgf_public_goods_match_pools;
create policy mpgf_public_goods_match_pools_public_read
on public.mpgf_public_goods_match_pools
for select to anon, authenticated
using (true);

drop policy if exists mpgf_public_goods_rounds_public_read
  on public.mpgf_public_goods_rounds;
create policy mpgf_public_goods_rounds_public_read
on public.mpgf_public_goods_rounds
for select to anon, authenticated
using (true);

drop policy if exists mpgf_public_goods_campaigns_public_read
  on public.mpgf_public_goods_campaigns;
create policy mpgf_public_goods_campaigns_public_read
on public.mpgf_public_goods_campaigns
for select to anon, authenticated
using (true);

drop policy if exists mpgf_public_goods_pledges_select_own
  on public.mpgf_public_goods_pledges;
create policy mpgf_public_goods_pledges_select_own
on public.mpgf_public_goods_pledges
for select to authenticated
using (profile_id = auth.uid());

drop policy if exists mpgf_public_goods_pledges_insert_own
  on public.mpgf_public_goods_pledges;
create policy mpgf_public_goods_pledges_insert_own
on public.mpgf_public_goods_pledges
for insert to authenticated
with check (profile_id = auth.uid());

drop policy if exists mpgf_public_goods_pledges_update_own
  on public.mpgf_public_goods_pledges;
create policy mpgf_public_goods_pledges_update_own
on public.mpgf_public_goods_pledges
for update to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

revoke all on table public.mpgf_public_goods_match_pools
  from public, anon, authenticated;
revoke all on table public.mpgf_public_goods_rounds
  from public, anon, authenticated;
revoke all on table public.mpgf_public_goods_campaigns
  from public, anon, authenticated;
revoke all on table public.mpgf_public_goods_pledges
  from public, anon, authenticated;

grant select on table public.mpgf_public_goods_match_pools
  to anon, authenticated;
grant select on table public.mpgf_public_goods_rounds
  to anon, authenticated;
grant select on table public.mpgf_public_goods_campaigns
  to anon, authenticated;
grant select, insert, update on table public.mpgf_public_goods_pledges
  to authenticated;

grant all on table public.mpgf_public_goods_match_pools to service_role;
grant all on table public.mpgf_public_goods_rounds to service_role;
grant all on table public.mpgf_public_goods_campaigns to service_role;
grant all on table public.mpgf_public_goods_pledges to service_role;

do $verify$
declare
  table_name text;
  column_contract_count integer;
begin
  foreach table_name in array array[
    'mpgf_public_goods_match_pools',
    'mpgf_public_goods_rounds',
    'mpgf_public_goods_campaigns',
    'mpgf_public_goods_pledges'
  ]
  loop
    if to_regclass('public.' || table_name) is null then
      raise exception using
        errcode = '55000',
        message = format('Required canonical table public.%s is missing.', table_name);
    end if;

    if not exists (
      select 1
      from pg_class c
      where c.oid = ('public.' || table_name)::regclass
        and c.relrowsecurity = true
    ) then
      raise exception using
        errcode = '55000',
        message = format('RLS is not enabled on public.%s.', table_name);
    end if;
  end loop;

  select count(*) into column_contract_count
  from information_schema.columns
  where table_schema = 'public'
    and (
      (table_name = 'mpgf_public_goods_match_pools'
       and column_name in (
         'id', 'funder_type', 'budget_cents', 'base_match_ratio',
         'qf_bonus_cents', 'visible_commitment', 'restrictions_json',
         'status', 'created_at'
       ))
      or
      (table_name = 'mpgf_public_goods_rounds'
       and column_name in (
         'id', 'name', 'starts_at', 'ends_at', 'match_pool_id',
         'qf_enabled', 'qf_cap_multiple', 'supporter_gate', 'status',
         'created_at'
       ))
      or
      (table_name = 'mpgf_public_goods_campaigns'
       and column_name in (
         'id', 'round_id', 'slug', 'pool_alternative_id', 'title',
         'destination_type', 'destination_ref', 'cause_tags',
         'public_summary', 'threshold_amount_cents',
         'threshold_supporters', 'deadline_at', 'verification_method',
         'baseline_rule', 'exit_rule', 'review_status',
         'challenge_window_ends_at', 'created_at'
       ))
      or
      (table_name = 'mpgf_public_goods_pledges'
       and column_name in (
         'id', 'campaign_id', 'profile_id', 'user_ref', 'amount_cents',
         'currency', 'visibility_mode', 'is_recurring', 'capture_mode',
         'eligibility_state', 'human_score_bps', 'status',
         'supporter_reason', 'payment_intent_ref', 'created_at'
       ))
    );

  if column_contract_count <> 52 then
    raise exception using
      errcode = '55000',
      message = format(
        'Canonical public-goods foundation column contract is incomplete: expected 52, found %s.',
        column_contract_count
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'mpgf_public_goods_campaigns'
      and policyname = 'mpgf_public_goods_campaigns_public_read'
      and cmd = 'SELECT'
  ) or not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'mpgf_public_goods_pledges'
      and policyname = 'mpgf_public_goods_pledges_select_own'
      and cmd = 'SELECT'
  ) then
    raise exception using
      errcode = '55000',
      message = 'Canonical public-goods privacy policies are incomplete.';
  end if;
end;
$verify$;

comment on table public.mpgf_public_goods_match_pools is
  'Canonical public-goods funding-pool registry. This reconciliation inserts no funding pool and authorizes no money movement.';
comment on table public.mpgf_public_goods_rounds is
  'Canonical public-goods round registry. Production rounds require a separate governance configuration; this migration inserts none.';
comment on table public.mpgf_public_goods_campaigns is
  'Canonical public campaign table extended by the reviewed DAC publication lifecycle.';
comment on table public.mpgf_public_goods_pledges is
  'Canonical pledge ledger extended by the reviewed DAC immutable-consent lifecycle. Payment execution remains disabled.';

commit;
