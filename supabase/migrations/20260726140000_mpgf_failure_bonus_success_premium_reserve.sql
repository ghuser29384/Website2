begin;

create extension if not exists pgcrypto;

alter table public.mpgf_pool_proposals
  add column if not exists public_goods_failure_bonus_enabled boolean not null default false,
  add column if not exists public_goods_failure_bonus_rate_bps integer,
  add column if not exists public_goods_success_premium_rate_bps integer,
  add column if not exists public_goods_success_premium_cents bigint,
  add column if not exists public_goods_success_premium_payer text,
  add column if not exists public_goods_success_premium_policy_version text,
  add column if not exists public_goods_success_premium_included_in_net_threshold boolean not null default false,
  add column if not exists public_goods_success_premium_provisional boolean,
  add column if not exists public_goods_gross_success_requirement_cents bigint,
  add column if not exists public_goods_success_premium_pricing_json jsonb;

create or replace function public.mpgf_failure_bonus_provisional_pricing_valid(
  pricing_json jsonb,
  failure_bonus_rate_bps integer,
  success_premium_rate_bps integer
)
returns boolean
language plpgsql
immutable
strict
set search_path = public, pg_temp
as $function$
declare
  success_probability_bps integer;
  pricing_failure_bonus_rate_bps integer;
  expected_eligible_failure_fill_bps integer;
  expense_load_bps integer;
  reserve_risk_margin_bps integer;
  expected_claims_rate_bps bigint;
  denominator bigint;
begin
  if jsonb_typeof(pricing_json) <> 'object'
     or jsonb_typeof(pricing_json -> 'successProbabilityBps') <> 'number'
     or jsonb_typeof(pricing_json -> 'failureBonusRateBps') <> 'number'
     or jsonb_typeof(pricing_json -> 'expectedEligibleFailureFillBps') <> 'number'
     or jsonb_typeof(pricing_json -> 'expenseLoadBps') <> 'number'
     or jsonb_typeof(pricing_json -> 'reserveRiskMarginBps') <> 'number' then
    return false;
  end if;

  success_probability_bps := (pricing_json ->> 'successProbabilityBps')::integer;
  pricing_failure_bonus_rate_bps := (pricing_json ->> 'failureBonusRateBps')::integer;
  expected_eligible_failure_fill_bps :=
    (pricing_json ->> 'expectedEligibleFailureFillBps')::integer;
  expense_load_bps := (pricing_json ->> 'expenseLoadBps')::integer;
  reserve_risk_margin_bps := (pricing_json ->> 'reserveRiskMarginBps')::integer;

  if success_probability_bps <> 7500
     or pricing_failure_bonus_rate_bps <> failure_bonus_rate_bps
     or expected_eligible_failure_fill_bps <> 4000
     or expense_load_bps <> 25
     or reserve_risk_margin_bps <> 42 then
    return false;
  end if;

  denominator := success_probability_bps::bigint * 10000;
  expected_claims_rate_bps := (
    ((10000 - success_probability_bps)::bigint
      * pricing_failure_bonus_rate_bps::bigint
      * expected_eligible_failure_fill_bps::bigint)
    + denominator - 1
  ) / denominator;

  return success_premium_rate_bps =
    expected_claims_rate_bps + expense_load_bps + reserve_risk_margin_bps;
exception
  when others then
    return false;
end;
$function$;

revoke all on function public.mpgf_failure_bonus_provisional_pricing_valid(jsonb, integer, integer)
  from public;
grant execute on function public.mpgf_failure_bonus_provisional_pricing_valid(jsonb, integer, integer)
  to authenticated, service_role;

alter table public.mpgf_pool_proposals
  drop constraint if exists mpgf_pool_proposals_failure_bonus_rate_valid,
  add constraint mpgf_pool_proposals_failure_bonus_rate_valid check (
    public_goods_failure_bonus_rate_bps is null
    or public_goods_failure_bonus_rate_bps between 1 and 10000
  ),
  drop constraint if exists mpgf_pool_proposals_success_premium_rate_valid,
  add constraint mpgf_pool_proposals_success_premium_rate_valid check (
    public_goods_success_premium_rate_bps is null
    or public_goods_success_premium_rate_bps between 1 and 1000000
  ),
  drop constraint if exists mpgf_pool_proposals_success_premium_payer_valid,
  add constraint mpgf_pool_proposals_success_premium_payer_valid check (
    public_goods_success_premium_payer is null
    or public_goods_success_premium_payer in ('pool_creator_or_sponsor', 'contributors_pro_rata')
  ),
  drop constraint if exists mpgf_pool_proposals_success_premium_outside_threshold,
  add constraint mpgf_pool_proposals_success_premium_outside_threshold check (
    public_goods_success_premium_included_in_net_threshold = false
  ),
  drop constraint if exists mpgf_pool_proposals_success_premium_complete,
  add constraint mpgf_pool_proposals_success_premium_complete check (
    (
      public_goods_failure_bonus_enabled = false
      and public_goods_failure_bonus_rate_bps is null
      and public_goods_success_premium_rate_bps is null
      and public_goods_success_premium_cents is null
      and public_goods_success_premium_payer is null
      and public_goods_success_premium_policy_version is null
      and public_goods_success_premium_provisional is null
      and public_goods_gross_success_requirement_cents is null
      and public_goods_success_premium_pricing_json is null
    )
    or
    (
      public_goods_failure_bonus_enabled = true
      and public_goods_threshold_amount_cents is not null
      and public_goods_threshold_amount_cents > 0
      and public_goods_failure_bonus_rate_bps is not null
      and public_goods_success_premium_rate_bps is not null
      and public_goods_success_premium_cents is not null
      and public_goods_success_premium_cents > 0
      and public_goods_success_premium_payer = 'pool_creator_or_sponsor'
      and public_goods_success_premium_policy_version =
        'mpgf_failure_bonus_success_premium_v0_1'
      and public_goods_success_premium_provisional = true
      and public_goods_gross_success_requirement_cents is not null
      and public.mpgf_failure_bonus_provisional_pricing_valid(
        public_goods_success_premium_pricing_json,
        public_goods_failure_bonus_rate_bps,
        public_goods_success_premium_rate_bps
      )
    )
  ),
  drop constraint if exists mpgf_pool_proposals_success_premium_amount_exact,
  add constraint mpgf_pool_proposals_success_premium_amount_exact check (
    public_goods_success_premium_cents is null
    or public_goods_success_premium_cents =
      ((public_goods_threshold_amount_cents * public_goods_success_premium_rate_bps::bigint) + 9999) / 10000
  ),
  drop constraint if exists mpgf_pool_proposals_gross_success_requirement_exact,
  add constraint mpgf_pool_proposals_gross_success_requirement_exact check (
    public_goods_gross_success_requirement_cents is null
    or public_goods_gross_success_requirement_cents =
      public_goods_threshold_amount_cents + public_goods_success_premium_cents
  );

comment on column public.mpgf_pool_proposals.public_goods_failure_bonus_enabled is
  'Whether the proposal requests a fully backed failure-bonus mechanism. This does not itself authorize live payments.';
comment on column public.mpgf_pool_proposals.public_goods_success_premium_rate_bps is
  'Versioned success-premium quote in basis points, derived from expected claims, expense load, and reserve margin.';
comment on column public.mpgf_pool_proposals.public_goods_success_premium_cents is
  'Success premium owed only when the quoted threshold tranche clears. It is separate from the recipient amount.';
comment on column public.mpgf_pool_proposals.public_goods_success_premium_included_in_net_threshold is
  'Must remain false: the recipient threshold is a net amount and the premium is an additional gross requirement.';
comment on column public.mpgf_pool_proposals.public_goods_success_premium_pricing_json is
  'Non-PII pricing assumptions used to reproduce the provisional quote. The server recomputes the rate and amount.';

create table if not exists public.mpgf_failure_bonus_reserves (
  id uuid primary key default gen_random_uuid(),
  reserve_key text not null unique check (reserve_key = btrim(reserve_key) and reserve_key <> ''),
  display_name text not null check (display_name = btrim(display_name) and display_name <> ''),
  currency text not null default 'usd' check (currency = 'usd'),
  status text not null default 'simulation_only' check (
    status in ('simulation_only', 'funded', 'paused', 'closed')
  ),
  policy_version text not null check (policy_version = btrim(policy_version) and policy_version <> ''),
  custody_mode text not null default 'partner_or_provider_held_not_platform_custody' check (
    custody_mode = 'partner_or_provider_held_not_platform_custody'
  ),
  public_description text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

insert into public.mpgf_failure_bonus_reserves (
  id,
  reserve_key,
  display_name,
  status,
  policy_version,
  public_description
) values (
  'fb000000-0000-4000-8000-000000000001',
  'moral-trade-common-failure-bonus-usd',
  'Moral Trade Common Failure Bonus Reserve',
  'simulation_only',
  'mpgf_failure_bonus_success_premium_v0_1',
  'Common reserve accounting shell. No balance, custody, or live payout is implied until backed entries are posted and production gates are approved.'
)
on conflict (reserve_key) do update set
  display_name = excluded.display_name,
  policy_version = excluded.policy_version,
  public_description = excluded.public_description,
  updated_at = timezone('utc', now());

create table if not exists public.mpgf_failure_bonus_premium_quotes (
  id uuid primary key default gen_random_uuid(),
  reserve_id uuid not null references public.mpgf_failure_bonus_reserves (id) on delete restrict,
  pool_proposal_id uuid not null references public.mpgf_pool_proposals (id) on delete cascade,
  threshold_id text not null,
  threshold_index integer not null check (threshold_index between 1 and 10),
  cumulative_net_recipient_threshold_cents bigint not null check (cumulative_net_recipient_threshold_cents > 0),
  incremental_net_recipient_cents bigint not null check (incremental_net_recipient_cents > 0),
  premium_rate_bps integer not null check (premium_rate_bps between 1 and 1000000),
  success_premium_cents bigint not null check (success_premium_cents > 0),
  cumulative_success_premium_cents bigint not null check (cumulative_success_premium_cents > 0),
  gross_success_requirement_cents bigint not null check (gross_success_requirement_cents > 0),
  premium_payer text not null check (
    premium_payer in ('pool_creator_or_sponsor', 'contributors_pro_rata')
  ),
  premium_included_in_net_recipient_threshold boolean not null default false check (
    premium_included_in_net_recipient_threshold = false
  ),
  pricing_mode text not null default 'experience_rated' check (
    pricing_mode in ('experience_rated', 'operator_override')
  ),
  pricing_json jsonb not null default '{}'::jsonb check (jsonb_typeof(pricing_json) = 'object'),
  policy_version text not null check (policy_version = btrim(policy_version) and policy_version <> ''),
  provisional boolean not null default true,
  rationale text not null default '',
  status text not null default 'pending_review' check (
    status in ('pending_review', 'approved', 'superseded', 'voided')
  ),
  quote_hash text not null unique check (quote_hash ~ '^sha256:[0-9a-f]{64}$'),
  approved_by uuid references public.profiles (id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint mpgf_failure_bonus_premium_quotes_increment_exact check (
    success_premium_cents = ((incremental_net_recipient_cents * premium_rate_bps::bigint) + 9999) / 10000
  ),
  constraint mpgf_failure_bonus_premium_quotes_cumulative_single_threshold check (
    threshold_index <> 1
    or (
      cumulative_net_recipient_threshold_cents = incremental_net_recipient_cents
      and cumulative_success_premium_cents = success_premium_cents
    )
  ),
  constraint mpgf_failure_bonus_premium_quotes_gross_exact check (
    gross_success_requirement_cents =
      cumulative_net_recipient_threshold_cents + cumulative_success_premium_cents
  ),
  constraint mpgf_failure_bonus_premium_quotes_approval_complete check (
    (status <> 'approved' and approved_at is null and approved_by is null)
    or (
      status = 'approved'
      and provisional = false
      and approved_at is not null
      and approved_by is not null
    )
  )
);

create index if not exists mpgf_failure_bonus_premium_quotes_proposal_idx
  on public.mpgf_failure_bonus_premium_quotes (pool_proposal_id, threshold_index, created_at desc);
create index if not exists mpgf_failure_bonus_premium_quotes_reserve_idx
  on public.mpgf_failure_bonus_premium_quotes (reserve_id, status, created_at desc);

create unique index if not exists mpgf_failure_bonus_premium_quotes_one_approved_threshold_idx
  on public.mpgf_failure_bonus_premium_quotes (pool_proposal_id, threshold_index)
  where status = 'approved';

create or replace function public.mpgf_failure_bonus_approved_quote_immutable()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  if old.status = 'approved' then
    if tg_op = 'DELETE' then
      raise exception 'Approved failure-bonus premium quotes are immutable.'
        using errcode = '23514';
    end if;

    if new is distinct from old then
      raise exception 'Approved failure-bonus premium quotes are immutable.'
        using errcode = '23514';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$function$;

revoke all on function public.mpgf_failure_bonus_approved_quote_immutable()
  from public, anon, authenticated;

drop trigger if exists mpgf_failure_bonus_approved_quote_immutable
  on public.mpgf_failure_bonus_premium_quotes;
create trigger mpgf_failure_bonus_approved_quote_immutable
before update or delete on public.mpgf_failure_bonus_premium_quotes
for each row
execute function public.mpgf_failure_bonus_approved_quote_immutable();

create or replace function public.mpgf_freeze_proposal_with_approved_premium_quote()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  if new is not distinct from old then
    return new;
  end if;

  if exists (
    select 1
    from public.mpgf_failure_bonus_premium_quotes quote
    where quote.pool_proposal_id = old.id
      and quote.status = 'approved'
  ) then
    raise exception 'Create a new proposal version before changing approved failure-bonus premium terms.'
      using errcode = '23514';
  end if;

  return new;
end;
$function$;

revoke all on function public.mpgf_freeze_proposal_with_approved_premium_quote()
  from public, anon, authenticated;

drop trigger if exists mpgf_pool_proposals_freeze_approved_premium_terms
  on public.mpgf_pool_proposals;
create trigger mpgf_pool_proposals_freeze_approved_premium_terms
before update of
  public_goods_threshold_amount_cents,
  public_goods_failure_bonus_enabled,
  public_goods_failure_bonus_rate_bps,
  public_goods_success_premium_rate_bps,
  public_goods_success_premium_cents,
  public_goods_success_premium_payer,
  public_goods_success_premium_policy_version,
  public_goods_success_premium_included_in_net_threshold,
  public_goods_success_premium_provisional,
  public_goods_gross_success_requirement_cents,
  public_goods_success_premium_pricing_json
on public.mpgf_pool_proposals
for each row
execute function public.mpgf_freeze_proposal_with_approved_premium_quote();

create or replace function public.mpgf_sync_failure_bonus_premium_quote()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  reserve_row public.mpgf_failure_bonus_reserves%rowtype;
  quote_hash_value text;
begin
  select *
  into reserve_row
  from public.mpgf_failure_bonus_reserves
  where reserve_key = 'moral-trade-common-failure-bonus-usd';

  if reserve_row.id is null then
    raise exception 'Common failure-bonus reserve metadata is missing.';
  end if;

  if new.public_goods_failure_bonus_enabled = false then
    update public.mpgf_failure_bonus_premium_quotes
    set status = 'superseded'
    where pool_proposal_id = new.id
      and status = 'pending_review';
    return new;
  end if;

  quote_hash_value := 'sha256:' || pg_catalog.encode(
    extensions.digest(
      concat_ws(
        '|',
        new.id::text,
        new.public_goods_threshold_amount_cents::text,
        new.public_goods_success_premium_rate_bps::text,
        new.public_goods_success_premium_cents::text,
        new.public_goods_success_premium_payer,
        new.public_goods_success_premium_policy_version,
        new.public_goods_success_premium_pricing_json::text
      ),
      'sha256'
    ),
    'hex'
  );

  update public.mpgf_failure_bonus_premium_quotes
  set status = 'superseded'
  where pool_proposal_id = new.id
    and status = 'pending_review'
    and quote_hash <> quote_hash_value;

  insert into public.mpgf_failure_bonus_premium_quotes (
    reserve_id,
    pool_proposal_id,
    threshold_id,
    threshold_index,
    cumulative_net_recipient_threshold_cents,
    incremental_net_recipient_cents,
    premium_rate_bps,
    success_premium_cents,
    cumulative_success_premium_cents,
    gross_success_requirement_cents,
    premium_payer,
    premium_included_in_net_recipient_threshold,
    pricing_mode,
    pricing_json,
    policy_version,
    provisional,
    rationale,
    status,
    quote_hash
  ) values (
    reserve_row.id,
    new.id,
    new.id::text || ':threshold:1',
    1,
    new.public_goods_threshold_amount_cents,
    new.public_goods_threshold_amount_cents,
    new.public_goods_success_premium_rate_bps,
    new.public_goods_success_premium_cents,
    new.public_goods_success_premium_cents,
    new.public_goods_gross_success_requirement_cents,
    new.public_goods_success_premium_payer,
    false,
    'experience_rated',
    new.public_goods_success_premium_pricing_json,
    new.public_goods_success_premium_policy_version,
    new.public_goods_success_premium_provisional,
    'Automatically reproduced from the proposal assumptions; operator approval remains required.',
    'pending_review',
    quote_hash_value
  )
  on conflict (quote_hash) do nothing;

  return new;
end;
$function$;

revoke all on function public.mpgf_sync_failure_bonus_premium_quote() from public, anon, authenticated;

drop trigger if exists mpgf_pool_proposals_sync_failure_bonus_premium_quote
  on public.mpgf_pool_proposals;
create trigger mpgf_pool_proposals_sync_failure_bonus_premium_quote
after insert or update of
  public_goods_failure_bonus_enabled,
  public_goods_failure_bonus_rate_bps,
  public_goods_success_premium_rate_bps,
  public_goods_success_premium_cents,
  public_goods_success_premium_payer,
  public_goods_success_premium_policy_version,
  public_goods_success_premium_provisional,
  public_goods_gross_success_requirement_cents,
  public_goods_success_premium_pricing_json
on public.mpgf_pool_proposals
for each row
execute function public.mpgf_sync_failure_bonus_premium_quote();

create table if not exists public.mpgf_failure_bonus_reserve_entries (
  id uuid primary key default gen_random_uuid(),
  reserve_id uuid not null references public.mpgf_failure_bonus_reserves (id) on delete restrict,
  pool_proposal_id uuid references public.mpgf_pool_proposals (id) on delete set null,
  premium_quote_id uuid references public.mpgf_failure_bonus_premium_quotes (id) on delete set null,
  threshold_index integer check (threshold_index between 1 and 10),
  event_type text not null check (
    event_type in (
      'anchor_capital_credit',
      'success_premium_credit',
      'failure_bonus_debit',
      'reserve_expense_debit',
      'bonus_exposure_allocation',
      'bonus_exposure_release'
    )
  ),
  cash_delta_cents bigint not null default 0,
  exposure_delta_cents bigint not null default 0,
  currency text not null default 'usd' check (currency = 'usd'),
  status text not null default 'pending_review' check (
    status in ('pending_review', 'posted', 'voided')
  ),
  idempotency_key text not null unique check (idempotency_key = btrim(idempotency_key) and idempotency_key <> ''),
  source_ref_hash text not null check (source_ref_hash ~ '^sha256:[0-9a-f]{64}$'),
  event_hash text not null unique check (event_hash ~ '^sha256:[0-9a-f]{64}$'),
  public_memo text not null default '',
  approved_by uuid references public.profiles (id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint mpgf_failure_bonus_reserve_entries_effect_valid check (
    (event_type in ('anchor_capital_credit', 'success_premium_credit') and cash_delta_cents > 0 and exposure_delta_cents = 0)
    or (
      event_type = 'failure_bonus_debit'
      and cash_delta_cents < 0
      and exposure_delta_cents = cash_delta_cents
    )
    or (event_type = 'reserve_expense_debit' and cash_delta_cents < 0 and exposure_delta_cents = 0)
    or (event_type = 'bonus_exposure_allocation' and cash_delta_cents = 0 and exposure_delta_cents > 0)
    or (event_type = 'bonus_exposure_release' and cash_delta_cents = 0 and exposure_delta_cents < 0)
  ),
  constraint mpgf_failure_bonus_reserve_entries_premium_quote_required check (
    event_type <> 'success_premium_credit'
    or (premium_quote_id is not null and pool_proposal_id is not null and threshold_index is not null)
  ),
  constraint mpgf_failure_bonus_reserve_entries_pool_scope_required check (
    event_type not in (
      'failure_bonus_debit',
      'reserve_expense_debit',
      'bonus_exposure_allocation',
      'bonus_exposure_release'
    )
    or (pool_proposal_id is not null and threshold_index is not null)
  ),
  constraint mpgf_failure_bonus_reserve_entries_posted_approval check (
    (status <> 'posted' and approved_at is null and approved_by is null)
    or (status = 'posted' and approved_at is not null and approved_by is not null)
  )
);

create index if not exists mpgf_failure_bonus_reserve_entries_reserve_idx
  on public.mpgf_failure_bonus_reserve_entries (reserve_id, status, created_at desc);
create index if not exists mpgf_failure_bonus_reserve_entries_proposal_idx
  on public.mpgf_failure_bonus_reserve_entries (pool_proposal_id, event_type, created_at desc);

create or replace function public.mpgf_failure_bonus_reserve_entry_immutable()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  if tg_op = 'DELETE' then
    raise exception 'Failure-bonus reserve entries are append-only; post a reversing entry instead.'
      using errcode = '23514';
  end if;

  if old.status = 'posted' and new is distinct from old then
    raise exception 'Posted failure-bonus reserve entries are immutable.'
      using errcode = '23514';
  end if;

  return new;
end;
$function$;

revoke all on function public.mpgf_failure_bonus_reserve_entry_immutable() from public, anon, authenticated;

drop trigger if exists mpgf_failure_bonus_reserve_entries_immutable
  on public.mpgf_failure_bonus_reserve_entries;
create trigger mpgf_failure_bonus_reserve_entries_immutable
before update or delete on public.mpgf_failure_bonus_reserve_entries
for each row
execute function public.mpgf_failure_bonus_reserve_entry_immutable();

create or replace function public.mpgf_assert_failure_bonus_reserve_solvency()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  reserve_status text;
  current_cash_cents bigint;
  current_exposure_cents bigint;
  next_cash_cents bigint;
  next_exposure_cents bigint;
  current_pool_exposure_cents bigint;
  next_pool_exposure_cents bigint;
  quote_row public.mpgf_failure_bonus_premium_quotes%rowtype;
begin
  if new.status <> 'posted' then
    return new;
  end if;

  select status
  into reserve_status
  from public.mpgf_failure_bonus_reserves
  where id = new.reserve_id
  for update;

  if reserve_status is null then
    raise exception 'Failure-bonus reserve is missing.';
  end if;

  if reserve_status in ('simulation_only', 'closed') then
    raise exception 'Reserve status % does not permit posted accounting entries.', reserve_status
      using errcode = '23514';
  end if;

  if reserve_status = 'paused'
     and new.event_type = 'bonus_exposure_allocation' then
    raise exception 'Paused reserves cannot accept new bonus exposure; existing claims and releases remain settleable.'
      using errcode = '23514';
  end if;

  if new.event_type = 'success_premium_credit' then
    select *
    into quote_row
    from public.mpgf_failure_bonus_premium_quotes
    where id = new.premium_quote_id;

    if quote_row.id is null
       or quote_row.status <> 'approved'
       or quote_row.provisional <> false
       or quote_row.reserve_id <> new.reserve_id
       or quote_row.pool_proposal_id <> new.pool_proposal_id
       or quote_row.threshold_index <> new.threshold_index
       or quote_row.success_premium_cents <> new.cash_delta_cents then
      raise exception 'Success-premium credits must exactly match a final approved quote.'
        using errcode = '23514';
    end if;
  end if;

  select
    coalesce(sum(cash_delta_cents), 0),
    coalesce(sum(exposure_delta_cents), 0)
  into current_cash_cents, current_exposure_cents
  from public.mpgf_failure_bonus_reserve_entries
  where reserve_id = new.reserve_id
    and status = 'posted'
    and id <> new.id;

  next_cash_cents := current_cash_cents + new.cash_delta_cents;
  next_exposure_cents := current_exposure_cents + new.exposure_delta_cents;

  if next_cash_cents < 0 then
    raise exception 'Failure-bonus reserve cash balance cannot become negative.'
      using errcode = '23514';
  end if;

  if next_exposure_cents < 0 then
    raise exception 'Failure-bonus reserve open exposure cannot become negative.'
      using errcode = '23514';
  end if;

  if next_cash_cents - next_exposure_cents < 0 then
    raise exception 'Failure-bonus reserve cannot allocate more exposure than posted cash backing.'
      using errcode = '23514';
  end if;

  if new.exposure_delta_cents <> 0 then
    select coalesce(sum(exposure_delta_cents), 0)
    into current_pool_exposure_cents
    from public.mpgf_failure_bonus_reserve_entries
    where reserve_id = new.reserve_id
      and pool_proposal_id = new.pool_proposal_id
      and threshold_index = new.threshold_index
      and status = 'posted'
      and id <> new.id;

    next_pool_exposure_cents := current_pool_exposure_cents + new.exposure_delta_cents;

    if next_pool_exposure_cents < 0 then
      raise exception 'A pool threshold cannot release or debit another pool threshold''s bonus exposure.'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$function$;

revoke all on function public.mpgf_assert_failure_bonus_reserve_solvency() from public, anon, authenticated;

drop trigger if exists mpgf_failure_bonus_reserve_entries_solvency
  on public.mpgf_failure_bonus_reserve_entries;
create trigger mpgf_failure_bonus_reserve_entries_solvency
before insert or update of status, cash_delta_cents, exposure_delta_cents, reserve_id
on public.mpgf_failure_bonus_reserve_entries
for each row
execute function public.mpgf_assert_failure_bonus_reserve_solvency();

alter table public.mpgf_failure_bonus_reserves enable row level security;
alter table public.mpgf_failure_bonus_premium_quotes enable row level security;
alter table public.mpgf_failure_bonus_reserve_entries enable row level security;

drop policy if exists mpgf_failure_bonus_reserves_public_select on public.mpgf_failure_bonus_reserves;
create policy mpgf_failure_bonus_reserves_public_select
  on public.mpgf_failure_bonus_reserves
  for select
  to anon, authenticated
  using (true);

drop policy if exists mpgf_failure_bonus_premium_quotes_public_or_owner_select
  on public.mpgf_failure_bonus_premium_quotes;
create policy mpgf_failure_bonus_premium_quotes_public_or_owner_select
  on public.mpgf_failure_bonus_premium_quotes
  for select
  to anon, authenticated
  using (
    status = 'approved'
    or (
      auth.uid() is not null
      and exists (
        select 1
        from public.mpgf_pool_proposals proposal
        where proposal.id = pool_proposal_id
          and proposal.proposer_id = auth.uid()
      )
    )
  );

grant select on public.mpgf_failure_bonus_reserves to anon, authenticated;
grant select on public.mpgf_failure_bonus_premium_quotes to anon, authenticated;
grant all on public.mpgf_failure_bonus_reserves to service_role;
grant all on public.mpgf_failure_bonus_premium_quotes to service_role;
grant all on public.mpgf_failure_bonus_reserve_entries to service_role;

create or replace view public.mpgf_failure_bonus_reserve_public_summary
with (security_barrier = true)
as
select
  reserve.id,
  reserve.reserve_key,
  reserve.display_name,
  reserve.currency,
  reserve.status,
  reserve.policy_version,
  reserve.custody_mode,
  reserve.public_description,
  coalesce(sum(entry.cash_delta_cents) filter (where entry.status = 'posted'), 0)::bigint as posted_cash_balance_cents,
  coalesce(sum(entry.exposure_delta_cents) filter (where entry.status = 'posted'), 0)::bigint as open_bonus_exposure_cents,
  (
    coalesce(sum(entry.cash_delta_cents) filter (where entry.status = 'posted'), 0)
    - coalesce(sum(entry.exposure_delta_cents) filter (where entry.status = 'posted'), 0)
  )::bigint as available_backing_cents,
  coalesce(sum(entry.cash_delta_cents) filter (
    where entry.status = 'posted' and entry.event_type = 'success_premium_credit'
  ), 0)::bigint as success_premiums_credited_cents,
  abs(coalesce(sum(entry.cash_delta_cents) filter (
    where entry.status = 'posted' and entry.event_type = 'failure_bonus_debit'
  ), 0))::bigint as failure_bonuses_paid_cents,
  abs(coalesce(sum(entry.cash_delta_cents) filter (
    where entry.status = 'posted' and entry.event_type = 'reserve_expense_debit'
  ), 0))::bigint as reserve_expenses_paid_cents,
  count(entry.id) filter (where entry.status = 'posted')::bigint as posted_entry_count,
  reserve.updated_at
from public.mpgf_failure_bonus_reserves reserve
left join public.mpgf_failure_bonus_reserve_entries entry
  on entry.reserve_id = reserve.id
group by reserve.id;

grant select on public.mpgf_failure_bonus_reserve_public_summary to anon, authenticated;

comment on table public.mpgf_failure_bonus_reserves is
  'Common Failure Bonus Reserve metadata. The default row is simulation-only and carries no implied balance or custody.';
comment on table public.mpgf_failure_bonus_premium_quotes is
  'Versioned threshold-tranche success-premium quotes. Each premium is additional to the net recipient threshold.';
comment on table public.mpgf_failure_bonus_reserve_entries is
  'Append-only common-reserve accounting ledger. Only posted, approved entries affect solvency calculations.';
comment on view public.mpgf_failure_bonus_reserve_public_summary is
  'Aggregate reserve disclosure without raw payment, participant, or source identifiers.';

commit;
