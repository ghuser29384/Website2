-- Cross-user pooled settlement for sub-$10 Every.org-backed trade obligations.
--
-- Participants fund exact obligations through Stripe. Moral Trade consolidates compatible,
-- fully funded obligations into an immutable bundle, pays Every.org as the platform donor,
-- and activates every component agreement atomically only after the exact provider webhook.
-- All money-moving entry points are service-role-only and application-gated by environment,
-- account readiness, disclosures, and operator MFA.

create extension if not exists pgcrypto;

create table if not exists public.trade_donation_pool_gate_status (
  environment text not null check (environment in ('test', 'live')),
  gate_key text not null,
  status text not null check (status in ('passed', 'pending', 'blocked')),
  notes text not null default '',
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (environment, gate_key)
);

insert into public.trade_donation_pool_gate_status(environment, gate_key, status, notes)
values
  ('test', 'stripe_test_account', 'pending', 'Pass after QA can create and complete a Stripe test Checkout Session.'),
  ('test', 'stripe_signed_webhook', 'pending', 'Pass after QA processes a signed Stripe test webhook through the production handler code.'),
  ('test', 'every_org_staging_webhook', 'pending', 'Pass after QA processes an exact Every.org staging bundle webhook and rejects replay and mismatch cases.'),
  ('test', 'qa_scenario_matrix', 'pending', 'Pass after the full pooled-settlement QA scenario matrix is recorded.'),
  ('live', 'every_org_written_approval', 'blocked', 'Written authorization for Moral Trade to act as a consolidated platform payer has not been recorded.'),
  ('live', 'stripe_account_and_product_review', 'blocked', 'Stripe live account readiness and the pooled-settlement product classification have not been approved.'),
  ('live', 'stripe_signed_webhook', 'blocked', 'No signed live Stripe webhook has been verified for pooled-settlement events.'),
  ('live', 'participant_terms_approved', 'pending', 'Custody, donor-of-record, non-tax-deductibility, fee, refund, abandonment, dispute, and chargeback terms require accountable approval.'),
  ('live', 'platform_reserve_approved', 'pending', 'The funding account, minimum reserve, and shortfall owner require approval.'),
  ('live', 'operator_runbook_approved', 'pending', 'Named operators, monitoring ownership, reconciliation, incident response, and disable procedures require approval.'),
  ('live', 'controlled_launch_approved', 'pending', 'A controlled live bundle may proceed only after every other live gate passes.')
on conflict (environment, gate_key) do nothing;

create table if not exists public.trade_donation_pool_obligations (
  id uuid primary key default gen_random_uuid(),
  donation_term_id uuid not null references public.trade_donation_terms(id) on delete restrict,
  agreement_id uuid not null references public.agreements(id) on delete restrict,
  agreement_version_id uuid not null references public.trade_agreement_versions(id) on delete restrict,
  payer_user_id uuid not null references public.profiles(id) on delete restrict,
  environment text not null check (environment in ('test', 'live')),
  provider text not null default 'every_org' check (provider = 'every_org'),
  target_id text not null,
  target_name text not null,
  nonprofit_slug text not null,
  nonprofit_ein text not null default '',
  amount_cents integer not null check (amount_cents between 100 and 999),
  currency text not null default 'USD' check (currency = 'USD'),
  frequency text not null default 'ONCE' check (frequency = 'ONCE'),
  condition_hash text not null check (condition_hash ~ '^[0-9a-f]{64}$'),
  status text not null default 'awaiting_funding' check (status in (
    'awaiting_funding',
    'checkout_started',
    'checkout_abandoned',
    'payment_failed',
    'funded',
    'bundled',
    'settled',
    'refund_pending',
    'refunded',
    'needs_review',
    'disputed',
    'cancelled'
  )),
  stripe_livemode boolean not null,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  stripe_charge_id_hash text not null default '',
  stripe_payload_hash text not null default '',
  bundle_id uuid,
  disclosure_version text not null,
  disclosures_accepted_at timestamptz not null,
  checkout_started_at timestamptz,
  funded_at timestamptz,
  refund_requested_at timestamptz,
  refunded_at timestamptz,
  settled_at timestamptz,
  failure_code text not null default '',
  failure_message text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (donation_term_id),
  unique (environment, stripe_checkout_session_id),
  unique (environment, stripe_payment_intent_id)
);

create index if not exists trade_donation_pool_obligations_bundle_key_idx
  on public.trade_donation_pool_obligations(
    environment,
    nonprofit_slug,
    nonprofit_ein,
    currency,
    frequency,
    funded_at,
    id
  )
  where status = 'funded' and bundle_id is null;

create index if not exists trade_donation_pool_obligations_agreement_idx
  on public.trade_donation_pool_obligations(agreement_id, agreement_version_id, updated_at desc);

create table if not exists public.trade_donation_pool_bundles (
  id uuid primary key default gen_random_uuid(),
  environment text not null check (environment in ('test', 'live')),
  provider text not null default 'every_org' check (provider = 'every_org'),
  target_id text not null,
  target_name text not null,
  nonprofit_slug text not null,
  nonprofit_ein text not null default '',
  amount_cents integer not null check (amount_cents >= 1000),
  currency text not null default 'USD' check (currency = 'USD'),
  frequency text not null default 'ONCE' check (frequency = 'ONCE'),
  manifest jsonb not null,
  manifest_hash text not null check (manifest_hash ~ '^[0-9a-f]{64}$'),
  partner_donation_id text,
  status text not null default 'frozen' check (status in (
    'frozen',
    'checkout_started',
    'completed',
    'needs_review',
    'cancelled'
  )),
  provider_charge_id_hash text not null default '',
  provider_payload_hash text not null default '',
  provider_amount_cents integer,
  provider_currency text not null default '',
  provider_nonprofit_slug text not null default '',
  provider_nonprofit_ein text not null default '',
  provider_donation_date timestamptz,
  provider_payment_method text not null default '',
  failure_code text not null default '',
  failure_message text not null default '',
  frozen_at timestamptz not null default timezone('utc', now()),
  checkout_started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (manifest_hash),
  unique (environment, partner_donation_id)
);

alter table public.trade_donation_pool_obligations
  drop constraint if exists trade_donation_pool_obligations_bundle_id_fkey;
alter table public.trade_donation_pool_obligations
  add constraint trade_donation_pool_obligations_bundle_id_fkey
  foreign key (bundle_id) references public.trade_donation_pool_bundles(id) on delete restrict;

create unique index if not exists trade_donation_pool_bundles_provider_charge_uidx
  on public.trade_donation_pool_bundles(provider, provider_charge_id_hash)
  where provider_charge_id_hash <> '';

create index if not exists trade_donation_pool_bundles_status_idx
  on public.trade_donation_pool_bundles(environment, status, frozen_at, id);

create table if not exists public.trade_donation_pool_bundle_items (
  bundle_id uuid not null references public.trade_donation_pool_bundles(id) on delete restrict,
  obligation_id uuid not null references public.trade_donation_pool_obligations(id) on delete restrict,
  agreement_id uuid not null references public.agreements(id) on delete restrict,
  agreement_version_id uuid not null references public.trade_agreement_versions(id) on delete restrict,
  donation_term_id uuid not null references public.trade_donation_terms(id) on delete restrict,
  payer_user_id uuid not null references public.profiles(id) on delete restrict,
  allocation_cents integer not null check (allocation_cents between 100 and 999),
  position integer not null check (position > 0),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (bundle_id, obligation_id),
  unique (obligation_id),
  unique (bundle_id, position)
);

create index if not exists trade_donation_pool_bundle_items_agreement_idx
  on public.trade_donation_pool_bundle_items(agreement_id, agreement_version_id);

create table if not exists public.trade_donation_pool_ledger_journals (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  journal_type text not null check (journal_type in (
    'participant_funding',
    'participant_refund',
    'bundle_settlement',
    'post_settlement_chargeback',
    'pre_settlement_chargeback'
  )),
  obligation_id uuid references public.trade_donation_pool_obligations(id) on delete restrict,
  bundle_id uuid references public.trade_donation_pool_bundles(id) on delete restrict,
  currency text not null default 'USD' check (currency = 'USD'),
  status text not null default 'draft' check (status in ('draft', 'posted')),
  description text not null,
  created_at timestamptz not null default timezone('utc', now()),
  posted_at timestamptz
);

create table if not exists public.trade_donation_pool_ledger_lines (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid not null references public.trade_donation_pool_ledger_journals(id) on delete restrict,
  account_code text not null check (account_code in (
    'platform_cash_asset',
    'participant_settlement_liability',
    'chargeback_loss_expense'
  )),
  entry_side text not null check (entry_side in ('debit', 'credit')),
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'USD' check (currency = 'USD'),
  profile_id uuid references public.profiles(id) on delete restrict,
  obligation_id uuid references public.trade_donation_pool_obligations(id) on delete restrict,
  bundle_id uuid references public.trade_donation_pool_bundles(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists trade_donation_pool_ledger_lines_journal_idx
  on public.trade_donation_pool_ledger_lines(journal_id, entry_side);

create table if not exists public.trade_donation_pool_stripe_events (
  stripe_event_id text primary key,
  event_type text not null,
  livemode boolean not null,
  payload_hash text not null check (payload_hash ~ '^[0-9a-f]{64}$'),
  signature_verified boolean not null,
  obligation_id uuid references public.trade_donation_pool_obligations(id) on delete set null,
  status text not null check (status in ('processed', 'duplicate', 'mismatch', 'ignored', 'failed')),
  details jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default timezone('utc', now()),
  processed_at timestamptz
);

create table if not exists public.trade_donation_pool_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid references public.profiles(id) on delete set null,
  actor_kind text not null check (actor_kind in ('participant', 'operator', 'system', 'stripe', 'every_org')),
  event_type text not null,
  object_type text not null check (object_type in ('obligation', 'bundle', 'ledger', 'gate')),
  object_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists trade_donation_pool_audit_object_idx
  on public.trade_donation_pool_audit_events(object_type, object_id, created_at desc);

create or replace function public.guard_trade_donation_pool_obligation_terms()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Pooled-settlement obligations are retained as an audit record.';
  end if;
  if new.donation_term_id <> old.donation_term_id
     or new.agreement_id <> old.agreement_id
     or new.agreement_version_id <> old.agreement_version_id
     or new.payer_user_id <> old.payer_user_id
     or new.environment <> old.environment
     or new.provider <> old.provider
     or new.target_id <> old.target_id
     or new.target_name <> old.target_name
     or new.nonprofit_slug <> old.nonprofit_slug
     or new.nonprofit_ein <> old.nonprofit_ein
     or new.amount_cents <> old.amount_cents
     or new.currency <> old.currency
     or new.frequency <> old.frequency
     or new.condition_hash <> old.condition_hash
     or new.stripe_livemode <> old.stripe_livemode
     or new.disclosure_version <> old.disclosure_version
     or new.disclosures_accepted_at <> old.disclosures_accepted_at
     or new.created_at <> old.created_at then
    raise exception 'Pooled-settlement obligation terms are immutable.';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_trade_donation_pool_obligation_terms_trigger
  on public.trade_donation_pool_obligations;
create trigger guard_trade_donation_pool_obligation_terms_trigger
before update or delete on public.trade_donation_pool_obligations
for each row execute function public.guard_trade_donation_pool_obligation_terms();

create or replace function public.guard_trade_donation_pool_bundle_manifest()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Pooled-settlement bundles are retained as an audit record.';
  end if;
  if new.environment <> old.environment
     or new.provider <> old.provider
     or new.target_id <> old.target_id
     or new.target_name <> old.target_name
     or new.nonprofit_slug <> old.nonprofit_slug
     or new.nonprofit_ein <> old.nonprofit_ein
     or new.amount_cents <> old.amount_cents
     or new.currency <> old.currency
     or new.frequency <> old.frequency
     or new.manifest <> old.manifest
     or new.manifest_hash <> old.manifest_hash
     or new.frozen_at <> old.frozen_at
     or new.created_at <> old.created_at then
    raise exception 'Pooled-settlement bundle manifests are immutable.';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_trade_donation_pool_bundle_manifest_trigger
  on public.trade_donation_pool_bundles;
create trigger guard_trade_donation_pool_bundle_manifest_trigger
before update or delete on public.trade_donation_pool_bundles
for each row execute function public.guard_trade_donation_pool_bundle_manifest();

create or replace function public.prevent_trade_donation_pool_bundle_item_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception 'Pooled-settlement bundle items are immutable.';
end;
$$;

drop trigger if exists prevent_trade_donation_pool_bundle_item_mutation_trigger
  on public.trade_donation_pool_bundle_items;
create trigger prevent_trade_donation_pool_bundle_item_mutation_trigger
before update or delete on public.trade_donation_pool_bundle_items
for each row execute function public.prevent_trade_donation_pool_bundle_item_mutation();

create or replace function public.guard_trade_donation_pool_ledger_journal()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Pooled-settlement ledger journals are immutable.';
  end if;
  if old.status = 'posted' then
    raise exception 'Posted pooled-settlement ledger journals are immutable.';
  end if;
  if new.event_key <> old.event_key
     or new.journal_type <> old.journal_type
     or new.obligation_id is distinct from old.obligation_id
     or new.bundle_id is distinct from old.bundle_id
     or new.currency <> old.currency
     or new.description <> old.description
     or new.created_at <> old.created_at
     or new.status <> 'posted'
     or new.posted_at is null then
    raise exception 'A draft pooled-settlement journal may only transition once to posted.';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_trade_donation_pool_ledger_journal_trigger
  on public.trade_donation_pool_ledger_journals;
create trigger guard_trade_donation_pool_ledger_journal_trigger
before update or delete on public.trade_donation_pool_ledger_journals
for each row execute function public.guard_trade_donation_pool_ledger_journal();

create or replace function public.prevent_trade_donation_pool_ledger_line_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception 'Pooled-settlement ledger lines are immutable.';
end;
$$;

drop trigger if exists prevent_trade_donation_pool_ledger_line_mutation_trigger
  on public.trade_donation_pool_ledger_lines;
create trigger prevent_trade_donation_pool_ledger_line_mutation_trigger
before update or delete on public.trade_donation_pool_ledger_lines
for each row execute function public.prevent_trade_donation_pool_ledger_line_mutation();

alter table public.trade_donation_pool_gate_status enable row level security;
alter table public.trade_donation_pool_obligations enable row level security;
alter table public.trade_donation_pool_bundles enable row level security;
alter table public.trade_donation_pool_bundle_items enable row level security;
alter table public.trade_donation_pool_ledger_journals enable row level security;
alter table public.trade_donation_pool_ledger_lines enable row level security;
alter table public.trade_donation_pool_stripe_events enable row level security;
alter table public.trade_donation_pool_audit_events enable row level security;

revoke all on public.trade_donation_pool_gate_status from anon, authenticated;
revoke all on public.trade_donation_pool_obligations from anon, authenticated;
revoke all on public.trade_donation_pool_bundles from anon, authenticated;
revoke all on public.trade_donation_pool_bundle_items from anon, authenticated;
revoke all on public.trade_donation_pool_ledger_journals from anon, authenticated;
revoke all on public.trade_donation_pool_ledger_lines from anon, authenticated;
revoke all on public.trade_donation_pool_stripe_events from anon, authenticated;
revoke all on public.trade_donation_pool_audit_events from anon, authenticated;

create or replace function public.set_trade_donation_pool_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_trade_donation_pool_obligations_updated_at
  on public.trade_donation_pool_obligations;
create trigger set_trade_donation_pool_obligations_updated_at
before update on public.trade_donation_pool_obligations
for each row execute function public.set_trade_donation_pool_updated_at();

drop trigger if exists set_trade_donation_pool_bundles_updated_at
  on public.trade_donation_pool_bundles;
create trigger set_trade_donation_pool_bundles_updated_at
before update on public.trade_donation_pool_bundles
for each row execute function public.set_trade_donation_pool_updated_at();

create or replace function public.assert_trade_donation_pool_journal_balanced()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  debit_total bigint;
  credit_total bigint;
begin
  if new.status <> 'posted' then
    return new;
  end if;

  select
    coalesce(sum(case when entry_side = 'debit' then amount_cents else 0 end), 0),
    coalesce(sum(case when entry_side = 'credit' then amount_cents else 0 end), 0)
  into debit_total, credit_total
  from public.trade_donation_pool_ledger_lines
  where journal_id = new.id;

  if debit_total <= 0 or debit_total <> credit_total then
    raise exception 'Pooled-settlement journal % is not balanced.', new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trade_donation_pool_journal_balance_trigger
  on public.trade_donation_pool_ledger_journals;
create constraint trigger trade_donation_pool_journal_balance_trigger
after insert or update of status on public.trade_donation_pool_ledger_journals
deferrable initially deferred
for each row execute function public.assert_trade_donation_pool_journal_balanced();

create or replace function moral_trade_private.trade_donation_pool_bundle_key(
  p_environment text,
  p_nonprofit_slug text,
  p_nonprofit_ein text,
  p_currency text,
  p_frequency text
)
returns text
language sql
immutable
set search_path = pg_catalog
as $$
  select lower(trim(p_environment)) || '|' || lower(trim(p_nonprofit_slug)) || '|' ||
    regexp_replace(coalesce(p_nonprofit_ein, ''), '[^0-9]', '', 'g') || '|' ||
    upper(trim(p_currency)) || '|' || upper(trim(p_frequency));
$$;

create or replace function moral_trade_private.post_trade_donation_pool_funding_journal(
  p_obligation public.trade_donation_pool_obligations,
  p_event_key text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  journal_id_value uuid;
begin
  insert into public.trade_donation_pool_ledger_journals(
    event_key,
    journal_type,
    obligation_id,
    currency,
    status,
    description
  ) values (
    p_event_key,
    'participant_funding',
    p_obligation.id,
    p_obligation.currency,
    'draft',
    'Participant funding reserved for a pooled charitable settlement.'
  )
  on conflict (event_key) do nothing
  returning id into journal_id_value;

  if journal_id_value is null then
    select id into journal_id_value
    from public.trade_donation_pool_ledger_journals
    where event_key = p_event_key;
    return journal_id_value;
  end if;

  insert into public.trade_donation_pool_ledger_lines(
    journal_id, account_code, entry_side, amount_cents, currency,
    profile_id, obligation_id
  ) values
    (
      journal_id_value, 'platform_cash_asset', 'debit', p_obligation.amount_cents,
      p_obligation.currency, p_obligation.payer_user_id, p_obligation.id
    ),
    (
      journal_id_value, 'participant_settlement_liability', 'credit', p_obligation.amount_cents,
      p_obligation.currency, p_obligation.payer_user_id, p_obligation.id
    );

  update public.trade_donation_pool_ledger_journals
  set status = 'posted', posted_at = timezone('utc', now())
  where id = journal_id_value;

  return journal_id_value;
end;
$$;

create or replace function moral_trade_private.post_trade_donation_pool_refund_journal(
  p_obligation public.trade_donation_pool_obligations,
  p_event_key text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  journal_id_value uuid;
begin
  insert into public.trade_donation_pool_ledger_journals(
    event_key, journal_type, obligation_id, currency, status, description
  ) values (
    p_event_key,
    'participant_refund',
    p_obligation.id,
    p_obligation.currency,
    'draft',
    'Participant contribution refunded before pooled settlement.'
  )
  on conflict (event_key) do nothing
  returning id into journal_id_value;

  if journal_id_value is null then
    select id into journal_id_value
    from public.trade_donation_pool_ledger_journals
    where event_key = p_event_key;
    return journal_id_value;
  end if;

  insert into public.trade_donation_pool_ledger_lines(
    journal_id, account_code, entry_side, amount_cents, currency,
    profile_id, obligation_id
  ) values
    (
      journal_id_value, 'participant_settlement_liability', 'debit', p_obligation.amount_cents,
      p_obligation.currency, p_obligation.payer_user_id, p_obligation.id
    ),
    (
      journal_id_value, 'platform_cash_asset', 'credit', p_obligation.amount_cents,
      p_obligation.currency, p_obligation.payer_user_id, p_obligation.id
    );

  update public.trade_donation_pool_ledger_journals
  set status = 'posted', posted_at = timezone('utc', now())
  where id = journal_id_value;

  return journal_id_value;
end;
$$;

create or replace function moral_trade_private.try_freeze_trade_donation_pool_bundle(
  p_environment text,
  p_nonprofit_slug text,
  p_nonprofit_ein text,
  p_currency text,
  p_frequency text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  bundle_key_value text;
  bundle_id_value uuid := gen_random_uuid();
  total_cents integer := 0;
  manifest_items jsonb;
  manifest_value jsonb;
  manifest_hash_value text;
begin
  bundle_key_value := moral_trade_private.trade_donation_pool_bundle_key(
    p_environment,
    p_nonprofit_slug,
    p_nonprofit_ein,
    p_currency,
    p_frequency
  );
  perform pg_advisory_xact_lock(hashtextextended(bundle_key_value, 0));

  with eligible as (
    select
      o.*,
      row_number() over (order by o.funded_at, o.id) as position,
      sum(o.amount_cents) over (order by o.funded_at, o.id rows unbounded preceding) as cumulative_cents
    from public.trade_donation_pool_obligations o
    join public.agreements a on a.id = o.agreement_id
    join public.trade_donation_terms t on t.id = o.donation_term_id
    where o.status = 'funded'
      and o.bundle_id is null
      and o.environment = p_environment
      and lower(o.nonprofit_slug) = lower(p_nonprofit_slug)
      and regexp_replace(o.nonprofit_ein, '[^0-9]', '', 'g') = regexp_replace(coalesce(p_nonprofit_ein, ''), '[^0-9]', '', 'g')
      and o.currency = upper(p_currency)
      and o.frequency = upper(p_frequency)
      and a.lifecycle_status = 'awaiting_donation'
      and a.current_version_id = o.agreement_version_id
      and t.agreement_version_id = o.agreement_version_id
      and t.amount_cents = o.amount_cents
      and t.nonprofit_slug = o.nonprofit_slug
      and t.currency = o.currency
      and t.frequency = o.frequency
  ), selected as (
    select *
    from eligible
    where cumulative_cents - amount_cents < 1000
  )
  select
    coalesce(sum(amount_cents), 0)::integer,
    jsonb_agg(
      jsonb_build_object(
        'position', position,
        'obligationId', id,
        'agreementId', agreement_id,
        'agreementVersionId', agreement_version_id,
        'donationTermId', donation_term_id,
        'payerUserId', payer_user_id,
        'allocationCents', amount_cents,
        'conditionHash', condition_hash
      ) order by position
    )
  into total_cents, manifest_items
  from selected;

  if total_cents < 1000 or manifest_items is null then
    return null;
  end if;

  manifest_value := jsonb_build_object(
    'schemaVersion', 'moral-trade-pooled-settlement-manifest-v1',
    'bundleId', bundle_id_value,
    'environment', p_environment,
    'provider', 'every_org',
    'recipientSlug', lower(p_nonprofit_slug),
    'recipientEin', regexp_replace(coalesce(p_nonprofit_ein, ''), '[^0-9]', '', 'g'),
    'currency', upper(p_currency),
    'frequency', upper(p_frequency),
    'aggregateAmountCents', total_cents,
    'items', manifest_items
  );
  manifest_hash_value := encode(extensions.digest(convert_to(manifest_value::text, 'UTF8'), 'sha256'), 'hex');

  insert into public.trade_donation_pool_bundles(
    id,
    environment,
    provider,
    target_id,
    target_name,
    nonprofit_slug,
    nonprofit_ein,
    amount_cents,
    currency,
    frequency,
    manifest,
    manifest_hash,
    status
  )
  select
    bundle_id_value,
    p_environment,
    'every_org',
    min(o.target_id),
    min(o.target_name),
    lower(p_nonprofit_slug),
    regexp_replace(coalesce(p_nonprofit_ein, ''), '[^0-9]', '', 'g'),
    total_cents,
    upper(p_currency),
    upper(p_frequency),
    manifest_value,
    manifest_hash_value,
    'frozen'
  from public.trade_donation_pool_obligations o
  where o.id in (
    select (item->>'obligationId')::uuid
    from jsonb_array_elements(manifest_items) item
  );

  insert into public.trade_donation_pool_bundle_items(
    bundle_id,
    obligation_id,
    agreement_id,
    agreement_version_id,
    donation_term_id,
    payer_user_id,
    allocation_cents,
    position
  )
  select
    bundle_id_value,
    (item->>'obligationId')::uuid,
    (item->>'agreementId')::uuid,
    (item->>'agreementVersionId')::uuid,
    (item->>'donationTermId')::uuid,
    (item->>'payerUserId')::uuid,
    (item->>'allocationCents')::integer,
    (item->>'position')::integer
  from jsonb_array_elements(manifest_items) item;

  update public.trade_donation_pool_obligations
  set status = 'bundled', bundle_id = bundle_id_value, failure_code = '', failure_message = ''
  where id in (
    select obligation_id
    from public.trade_donation_pool_bundle_items
    where bundle_id = bundle_id_value
  )
    and status = 'funded'
    and bundle_id is null;

  if (
    select count(*)
    from public.trade_donation_pool_bundle_items i
    join public.trade_donation_pool_obligations o on o.id = i.obligation_id
    where i.bundle_id = bundle_id_value and o.bundle_id = bundle_id_value and o.status = 'bundled'
  ) <> jsonb_array_length(manifest_items) then
    raise exception 'The pooled-settlement bundle could not lock every component atomically.';
  end if;

  insert into public.trade_donation_pool_audit_events(
    actor_kind, event_type, object_type, object_id, details
  ) values (
    'system',
    'bundle_frozen',
    'bundle',
    bundle_id_value,
    jsonb_build_object('manifestHash', manifest_hash_value, 'amountCents', total_cents)
  );

  return bundle_id_value;
end;
$$;

create or replace function public.create_trade_donation_pool_obligation(
  p_actor_id uuid,
  p_agreement_id uuid,
  p_agreement_version_id uuid,
  p_environment text,
  p_condition_hash text,
  p_disclosure_version text,
  p_disclosures_accepted boolean
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  agreement_row public.agreements%rowtype;
  term_row public.trade_donation_terms%rowtype;
  payer_id_value uuid;
  obligation_row public.trade_donation_pool_obligations%rowtype;
  livemode_value boolean;
begin
  if p_environment not in ('test', 'live') then
    raise exception 'Invalid pooled-settlement environment.';
  end if;
  if not p_disclosures_accepted or length(trim(coalesce(p_disclosure_version, ''))) = 0 then
    raise exception 'Pooled-settlement custody and donor-of-record disclosures must be accepted.';
  end if;
  if coalesce(p_condition_hash, '') !~ '^[0-9a-f]{64}$' then
    raise exception 'A valid pooled-settlement condition hash is required.';
  end if;

  select * into agreement_row
  from public.agreements
  where id = p_agreement_id
    and p_actor_id in (proposer_id, responder_id)
  for update;

  if not found
     or agreement_row.lifecycle_status <> 'awaiting_donation'
     or agreement_row.current_version_id <> p_agreement_version_id then
    raise exception 'The exact agreement version is not awaiting a donation.';
  end if;

  select * into term_row
  from public.trade_donation_terms
  where agreement_id = p_agreement_id
    and agreement_version_id = p_agreement_version_id;

  if not found or term_row.provider <> 'every_org' or term_row.amount_cents >= 1000 then
    raise exception 'Only sub-$10 Every.org obligations use pooled settlement.';
  end if;

  payer_id_value := case
    when term_row.payer_role = 'proposer' then agreement_row.proposer_id
    else agreement_row.responder_id
  end;
  if p_actor_id <> payer_id_value then
    raise exception 'Only the designated payer can fund this pooled obligation.';
  end if;
  livemode_value := p_environment = 'live';

  select * into obligation_row
  from public.trade_donation_pool_obligations
  where donation_term_id = term_row.id
  for update;

  if found then
    if obligation_row.condition_hash <> p_condition_hash
       or obligation_row.agreement_version_id <> p_agreement_version_id
       or obligation_row.payer_user_id <> payer_id_value
       or obligation_row.environment <> p_environment then
      raise exception 'An existing pooled obligation is bound to different immutable terms.';
    end if;
    return to_jsonb(obligation_row);
  end if;

  insert into public.trade_donation_pool_obligations(
    donation_term_id,
    agreement_id,
    agreement_version_id,
    payer_user_id,
    environment,
    provider,
    target_id,
    target_name,
    nonprofit_slug,
    nonprofit_ein,
    amount_cents,
    currency,
    frequency,
    condition_hash,
    status,
    stripe_livemode,
    disclosure_version,
    disclosures_accepted_at
  ) values (
    term_row.id,
    agreement_row.id,
    p_agreement_version_id,
    payer_id_value,
    p_environment,
    'every_org',
    term_row.target_id,
    term_row.target_name,
    lower(term_row.nonprofit_slug),
    regexp_replace(term_row.nonprofit_ein, '[^0-9]', '', 'g'),
    term_row.amount_cents,
    term_row.currency,
    term_row.frequency,
    p_condition_hash,
    'awaiting_funding',
    livemode_value,
    p_disclosure_version,
    timezone('utc', now())
  )
  returning * into obligation_row;

  insert into public.trade_donation_pool_audit_events(
    actor_profile_id, actor_kind, event_type, object_type, object_id, details
  ) values (
    p_actor_id,
    'participant',
    'obligation_created',
    'obligation',
    obligation_row.id,
    jsonb_build_object('conditionHash', p_condition_hash, 'amountCents', obligation_row.amount_cents)
  );

  return to_jsonb(obligation_row);
end;
$$;

create or replace function public.attach_trade_donation_pool_checkout(
  p_actor_id uuid,
  p_obligation_id uuid,
  p_checkout_session_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  obligation_row public.trade_donation_pool_obligations%rowtype;
begin
  if length(trim(coalesce(p_checkout_session_id, ''))) = 0 then
    raise exception 'A Stripe Checkout Session ID is required.';
  end if;

  select * into obligation_row
  from public.trade_donation_pool_obligations
  where id = p_obligation_id
    and payer_user_id = p_actor_id
  for update;

  if not found then
    raise exception 'Pooled obligation not found or access denied.';
  end if;
  if obligation_row.status not in ('awaiting_funding', 'checkout_abandoned', 'payment_failed') then
    raise exception 'This pooled obligation cannot start another checkout.';
  end if;

  update public.trade_donation_pool_obligations
  set
    status = 'checkout_started',
    stripe_checkout_session_id = p_checkout_session_id,
    checkout_started_at = timezone('utc', now()),
    failure_code = '',
    failure_message = ''
  where id = obligation_row.id
  returning * into obligation_row;

  insert into public.trade_donation_pool_audit_events(
    actor_profile_id, actor_kind, event_type, object_type, object_id, details
  ) values (
    p_actor_id,
    'participant',
    'stripe_checkout_started',
    'obligation',
    obligation_row.id,
    jsonb_build_object('checkoutSessionIdHash', encode(extensions.digest(convert_to(p_checkout_session_id, 'UTF8'), 'sha256'), 'hex'))
  );

  return to_jsonb(obligation_row);
end;
$$;

create or replace function public.record_trade_donation_pool_stripe_success(
  p_stripe_event_id text,
  p_event_type text,
  p_livemode boolean,
  p_payload_hash text,
  p_signature_verified boolean,
  p_obligation_id uuid,
  p_checkout_session_id text,
  p_payment_intent_id text,
  p_charge_id_hash text,
  p_amount_cents integer,
  p_currency text,
  p_condition_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  obligation_row public.trade_donation_pool_obligations%rowtype;
  bundle_id_value uuid;
  inserted_count integer := 0;
begin
  insert into public.trade_donation_pool_stripe_events(
    stripe_event_id, event_type, livemode, payload_hash, signature_verified,
    obligation_id, status, details, processed_at
  ) values (
    p_stripe_event_id, p_event_type, p_livemode, p_payload_hash, p_signature_verified,
    p_obligation_id, 'processed', '{}'::jsonb, timezone('utc', now())
  )
  on conflict (stripe_event_id) do nothing;
  get diagnostics inserted_count = row_count;

  if inserted_count = 0 then
    return jsonb_build_object('status', 'duplicate', 'bundleId', null);
  end if;
  if not p_signature_verified then
    update public.trade_donation_pool_stripe_events
    set status = 'mismatch', details = jsonb_build_object('failureCode', 'signature_not_verified')
    where stripe_event_id = p_stripe_event_id;
    return jsonb_build_object('status', 'mismatch', 'bundleId', null);
  end if;

  select * into obligation_row
  from public.trade_donation_pool_obligations
  where id = p_obligation_id
  for update;

  if not found then
    update public.trade_donation_pool_stripe_events
    set status = 'mismatch', details = jsonb_build_object('failureCode', 'obligation_not_found')
    where stripe_event_id = p_stripe_event_id;
    return jsonb_build_object('status', 'mismatch', 'bundleId', null);
  end if;

  if obligation_row.status in ('funded', 'bundled', 'settled')
     and obligation_row.stripe_payment_intent_id = p_payment_intent_id then
    return jsonb_build_object('status', 'already_funded', 'bundleId', obligation_row.bundle_id);
  end if;

  if obligation_row.status not in ('checkout_started', 'awaiting_funding', 'payment_failed')
     or obligation_row.stripe_livemode <> p_livemode
     or obligation_row.stripe_checkout_session_id is distinct from p_checkout_session_id
     or obligation_row.amount_cents <> p_amount_cents
     or obligation_row.currency <> upper(p_currency)
     or obligation_row.condition_hash <> p_condition_hash
     or length(trim(coalesce(p_payment_intent_id, ''))) = 0
     or coalesce(p_charge_id_hash, '') !~ '^[0-9a-f]{64}$' then
    update public.trade_donation_pool_obligations
    set
      status = 'needs_review',
      failure_code = 'stripe_funding_mismatch',
      failure_message = 'The signed Stripe event did not match the frozen pooled obligation.',
      stripe_payload_hash = p_payload_hash
    where id = p_obligation_id;
    update public.trade_donation_pool_stripe_events
    set status = 'mismatch', details = jsonb_build_object('failureCode', 'stripe_funding_mismatch')
    where stripe_event_id = p_stripe_event_id;
    return jsonb_build_object('status', 'mismatch', 'bundleId', null);
  end if;

  update public.trade_donation_pool_obligations
  set
    status = 'funded',
    stripe_payment_intent_id = p_payment_intent_id,
    stripe_charge_id_hash = p_charge_id_hash,
    stripe_payload_hash = p_payload_hash,
    funded_at = coalesce(funded_at, timezone('utc', now())),
    failure_code = '',
    failure_message = ''
  where id = obligation_row.id
  returning * into obligation_row;

  perform moral_trade_private.post_trade_donation_pool_funding_journal(
    obligation_row,
    'stripe-funding:' || p_payment_intent_id
  );

  bundle_id_value := moral_trade_private.try_freeze_trade_donation_pool_bundle(
    obligation_row.environment,
    obligation_row.nonprofit_slug,
    obligation_row.nonprofit_ein,
    obligation_row.currency,
    obligation_row.frequency
  );

  insert into public.trade_donation_pool_audit_events(
    actor_kind, event_type, object_type, object_id, details
  ) values (
    'stripe',
    'participant_funding_verified',
    'obligation',
    obligation_row.id,
    jsonb_build_object('stripeEventId', p_stripe_event_id, 'bundleId', bundle_id_value)
  );

  return jsonb_build_object(
    'status', case when bundle_id_value is null then 'funded' else 'bundled' end,
    'bundleId', bundle_id_value
  );
end;
$$;

create or replace function public.record_trade_donation_pool_stripe_failure(
  p_stripe_event_id text,
  p_event_type text,
  p_livemode boolean,
  p_payload_hash text,
  p_signature_verified boolean,
  p_obligation_id uuid,
  p_failure_code text,
  p_failure_message text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  obligation_row public.trade_donation_pool_obligations%rowtype;
  next_status text;
  inserted_count integer := 0;
begin
  insert into public.trade_donation_pool_stripe_events(
    stripe_event_id, event_type, livemode, payload_hash, signature_verified,
    obligation_id, status, details, processed_at
  ) values (
    p_stripe_event_id, p_event_type, p_livemode, p_payload_hash, p_signature_verified,
    p_obligation_id, 'processed', jsonb_build_object('failureCode', p_failure_code), timezone('utc', now())
  )
  on conflict (stripe_event_id) do nothing;
  get diagnostics inserted_count = row_count;

  if inserted_count = 0 then
    return jsonb_build_object('status', 'duplicate');
  end if;
  if not p_signature_verified then
    update public.trade_donation_pool_stripe_events set status = 'mismatch'
    where stripe_event_id = p_stripe_event_id;
    return jsonb_build_object('status', 'mismatch');
  end if;

  select * into obligation_row
  from public.trade_donation_pool_obligations
  where id = p_obligation_id
  for update;
  if not found then
    return jsonb_build_object('status', 'ignored');
  end if;
  if obligation_row.status not in ('checkout_started', 'awaiting_funding', 'payment_failed', 'checkout_abandoned') then
    return jsonb_build_object('status', 'ignored');
  end if;

  next_status := case
    when p_failure_code = 'checkout_abandoned' then 'checkout_abandoned'
    else 'payment_failed'
  end;
  update public.trade_donation_pool_obligations
  set
    status = next_status,
    failure_code = left(coalesce(p_failure_code, 'stripe_payment_failed'), 120),
    failure_message = left(coalesce(p_failure_message, 'Stripe did not fund the pooled obligation.'), 500)
  where id = obligation_row.id;

  return jsonb_build_object('status', next_status);
end;
$$;

create or replace function public.prepare_trade_donation_pool_refund(
  p_actor_id uuid,
  p_obligation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  obligation_row public.trade_donation_pool_obligations%rowtype;
begin
  select * into obligation_row
  from public.trade_donation_pool_obligations
  where id = p_obligation_id
    and payer_user_id = p_actor_id
  for update;

  if not found then
    raise exception 'Pooled obligation not found or access denied.';
  end if;
  if obligation_row.status = 'refunded' then
    return to_jsonb(obligation_row);
  end if;
  if obligation_row.status <> 'funded' or obligation_row.bundle_id is not null then
    raise exception 'A contribution can be self-service refunded only before bundle freeze.';
  end if;
  if length(obligation_row.stripe_payment_intent_id) = 0 then
    raise exception 'The funded Stripe payment is unavailable for refund.';
  end if;

  update public.trade_donation_pool_obligations
  set status = 'refund_pending', refund_requested_at = timezone('utc', now())
  where id = obligation_row.id
  returning * into obligation_row;

  return to_jsonb(obligation_row);
end;
$$;

create or replace function public.record_trade_donation_pool_refund_or_dispute(
  p_stripe_event_id text,
  p_event_type text,
  p_livemode boolean,
  p_payload_hash text,
  p_signature_verified boolean,
  p_obligation_id uuid,
  p_is_dispute boolean,
  p_amount_cents integer,
  p_failure_message text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  obligation_row public.trade_donation_pool_obligations%rowtype;
  bundle_row public.trade_donation_pool_bundles%rowtype;
  inserted_count integer := 0;
  journal_id_value uuid;
begin
  insert into public.trade_donation_pool_stripe_events(
    stripe_event_id, event_type, livemode, payload_hash, signature_verified,
    obligation_id, status, details, processed_at
  ) values (
    p_stripe_event_id, p_event_type, p_livemode, p_payload_hash, p_signature_verified,
    p_obligation_id, 'processed', jsonb_build_object('isDispute', p_is_dispute), timezone('utc', now())
  )
  on conflict (stripe_event_id) do nothing;
  get diagnostics inserted_count = row_count;
  if inserted_count = 0 then
    return jsonb_build_object('status', 'duplicate');
  end if;
  if not p_signature_verified then
    update public.trade_donation_pool_stripe_events set status = 'mismatch'
    where stripe_event_id = p_stripe_event_id;
    return jsonb_build_object('status', 'mismatch');
  end if;

  select * into obligation_row
  from public.trade_donation_pool_obligations
  where id = p_obligation_id
  for update;
  if not found then
    return jsonb_build_object('status', 'ignored');
  end if;
  if p_amount_cents <> obligation_row.amount_cents or p_livemode <> obligation_row.stripe_livemode then
    update public.trade_donation_pool_obligations
    set status = 'needs_review', failure_code = 'refund_or_dispute_mismatch',
        failure_message = 'Stripe refund or dispute amount/environment did not match the obligation.'
    where id = obligation_row.id;
    return jsonb_build_object('status', 'mismatch');
  end if;

  if obligation_row.bundle_id is null and obligation_row.status in ('funded', 'refund_pending') then
    update public.trade_donation_pool_obligations
    set
      status = case when p_is_dispute then 'disputed' else 'refunded' end,
      refunded_at = case when p_is_dispute then refunded_at else timezone('utc', now()) end,
      failure_code = case when p_is_dispute then 'pre_settlement_dispute' else '' end,
      failure_message = left(coalesce(p_failure_message, ''), 500)
    where id = obligation_row.id
    returning * into obligation_row;

    if p_is_dispute then
      insert into public.trade_donation_pool_ledger_journals(
        event_key, journal_type, obligation_id, currency, status, description
      ) values (
        'stripe-dispute:' || p_stripe_event_id,
        'pre_settlement_chargeback',
        obligation_row.id,
        obligation_row.currency,
        'draft',
        'Participant payment disputed before pooled settlement.'
      )
      returning id into journal_id_value;
      insert into public.trade_donation_pool_ledger_lines(
        journal_id, account_code, entry_side, amount_cents, currency, profile_id, obligation_id
      ) values
        (journal_id_value, 'participant_settlement_liability', 'debit', obligation_row.amount_cents, obligation_row.currency, obligation_row.payer_user_id, obligation_row.id),
        (journal_id_value, 'platform_cash_asset', 'credit', obligation_row.amount_cents, obligation_row.currency, obligation_row.payer_user_id, obligation_row.id);
      update public.trade_donation_pool_ledger_journals
      set status = 'posted', posted_at = timezone('utc', now())
      where id = journal_id_value;
    else
      perform moral_trade_private.post_trade_donation_pool_refund_journal(
        obligation_row,
        'stripe-refund:' || p_stripe_event_id
      );
    end if;
    return jsonb_build_object('status', obligation_row.status);
  end if;

  if obligation_row.bundle_id is not null then
    select * into bundle_row
    from public.trade_donation_pool_bundles
    where id = obligation_row.bundle_id
    for update;

    update public.trade_donation_pool_obligations
    set
      status = 'disputed',
      failure_code = case when p_is_dispute then 'post_bundle_dispute' else 'post_bundle_refund' end,
      failure_message = left(coalesce(p_failure_message, 'Participant funds reversed after bundle freeze.'), 500)
    where id = obligation_row.id;

    update public.trade_donation_pool_bundles
    set
      status = 'needs_review',
      failure_code = case when p_is_dispute then 'component_dispute_after_bundle' else 'component_refund_after_bundle' end,
      failure_message = 'A participant contribution was reversed after the bundle became immutable.'
    where id = obligation_row.bundle_id
      and status in ('frozen', 'checkout_started', 'completed');

    if bundle_row.status = 'completed' then
      insert into public.trade_donation_pool_ledger_journals(
        event_key, journal_type, obligation_id, bundle_id, currency, status, description
      ) values (
        'stripe-post-settlement-loss:' || p_stripe_event_id,
        'post_settlement_chargeback',
        obligation_row.id,
        obligation_row.bundle_id,
        obligation_row.currency,
        'draft',
        'Participant funds reversed after the consolidated charitable gift was completed.'
      )
      returning id into journal_id_value;
      insert into public.trade_donation_pool_ledger_lines(
        journal_id, account_code, entry_side, amount_cents, currency, profile_id, obligation_id, bundle_id
      ) values
        (journal_id_value, 'chargeback_loss_expense', 'debit', obligation_row.amount_cents, obligation_row.currency, obligation_row.payer_user_id, obligation_row.id, obligation_row.bundle_id),
        (journal_id_value, 'platform_cash_asset', 'credit', obligation_row.amount_cents, obligation_row.currency, obligation_row.payer_user_id, obligation_row.id, obligation_row.bundle_id);
      update public.trade_donation_pool_ledger_journals
      set status = 'posted', posted_at = timezone('utc', now())
      where id = journal_id_value;
    end if;

    return jsonb_build_object('status', 'needs_review', 'bundleId', obligation_row.bundle_id);
  end if;

  return jsonb_build_object('status', 'ignored');
end;
$$;

create or replace function public.start_trade_donation_pool_bundle_checkout(
  p_actor_id uuid,
  p_bundle_id uuid,
  p_partner_donation_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  bundle_row public.trade_donation_pool_bundles%rowtype;
  invalid_component_count integer;
begin
  if length(trim(coalesce(p_partner_donation_id, ''))) = 0 then
    raise exception 'A unique partner donation ID is required.';
  end if;

  select * into bundle_row
  from public.trade_donation_pool_bundles
  where id = p_bundle_id
  for update;
  if not found then
    raise exception 'Pooled-settlement bundle not found.';
  end if;
  if bundle_row.status = 'checkout_started' and bundle_row.partner_donation_id = p_partner_donation_id then
    return to_jsonb(bundle_row);
  end if;
  if bundle_row.status <> 'frozen' then
    raise exception 'Only a frozen bundle can start provider checkout.';
  end if;

  select count(*) into invalid_component_count
  from public.trade_donation_pool_bundle_items i
  join public.trade_donation_pool_obligations o on o.id = i.obligation_id
  join public.agreements a on a.id = i.agreement_id
  join public.trade_donation_terms t on t.id = i.donation_term_id
  where i.bundle_id = bundle_row.id
    and (
      o.status <> 'bundled'
      or o.bundle_id <> bundle_row.id
      or a.lifecycle_status <> 'awaiting_donation'
      or a.current_version_id <> i.agreement_version_id
      or t.agreement_version_id <> i.agreement_version_id
      or t.amount_cents <> i.allocation_cents
      or t.nonprofit_slug <> bundle_row.nonprofit_slug
      or t.currency <> bundle_row.currency
      or t.frequency <> bundle_row.frequency
    );
  if invalid_component_count > 0 then
    update public.trade_donation_pool_bundles
    set status = 'needs_review', failure_code = 'component_invalid_before_checkout',
        failure_message = 'One or more component obligations changed before provider checkout.'
    where id = bundle_row.id;
    raise exception 'The bundle contains a stale or invalid component.';
  end if;

  update public.trade_donation_pool_bundles
  set
    status = 'checkout_started',
    partner_donation_id = p_partner_donation_id,
    checkout_started_at = timezone('utc', now()),
    failure_code = '',
    failure_message = ''
  where id = bundle_row.id
  returning * into bundle_row;

  insert into public.trade_donation_pool_audit_events(
    actor_profile_id, actor_kind, event_type, object_type, object_id, details
  ) values (
    p_actor_id,
    'operator',
    'every_org_bundle_checkout_started',
    'bundle',
    bundle_row.id,
    jsonb_build_object('manifestHash', bundle_row.manifest_hash)
  );

  return to_jsonb(bundle_row);
end;
$$;

create or replace function public.complete_every_org_trade_donation_pool_bundle(
  p_bundle_id uuid,
  p_manifest_hash text,
  p_provider_charge_id_hash text,
  p_provider_payload_hash text,
  p_provider_amount_cents integer,
  p_provider_currency text,
  p_provider_nonprofit_slug text,
  p_provider_nonprofit_ein text,
  p_provider_donation_date timestamptz,
  p_provider_payment_method text,
  p_is_valid boolean,
  p_failure_code text,
  p_failure_message text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  bundle_row public.trade_donation_pool_bundles%rowtype;
  item_row record;
  invalid_component_count integer;
  manifest_item_count integer;
  manifest_mismatch_count integer;
  item_count integer;
  allocation_total integer;
  manifest_header_valid boolean;
  recomputed_manifest_hash text;
  activated_count integer := 0;
  journal_id_value uuid;
  evidence_reference_hash text;
  effective_failure_code text;
  effective_failure_message text;
begin
  select * into bundle_row
  from public.trade_donation_pool_bundles
  where id = p_bundle_id
  for update;

  if not found then
    return jsonb_build_object('outcome', 'unknown_bundle');
  end if;
  if bundle_row.status = 'completed'
     and bundle_row.provider_charge_id_hash = p_provider_charge_id_hash then
    return jsonb_build_object('outcome', 'already_completed', 'bundleId', bundle_row.id);
  end if;

  if exists (
    select 1 from public.trade_donation_pool_bundles b
    where b.id <> bundle_row.id
      and b.provider = 'every_org'
      and b.provider_charge_id_hash = p_provider_charge_id_hash
      and p_provider_charge_id_hash <> ''
  ) then
    p_is_valid := false;
    p_failure_code := 'provider_charge_reused';
    p_failure_message := 'The Every.org charge was already allocated to another bundle.';
    p_provider_charge_id_hash := '';
  end if;

  if not p_is_valid
     or bundle_row.status <> 'checkout_started'
     or bundle_row.manifest_hash <> p_manifest_hash
     or p_provider_charge_id_hash !~ '^[0-9a-f]{64}$'
     or p_provider_payload_hash !~ '^[0-9a-f]{64}$'
     or p_provider_amount_cents <> bundle_row.amount_cents
     or upper(p_provider_currency) <> bundle_row.currency
     or lower(p_provider_nonprofit_slug) <> lower(bundle_row.nonprofit_slug)
     or (
       bundle_row.nonprofit_ein <> ''
       and regexp_replace(coalesce(p_provider_nonprofit_ein, ''), '[^0-9]', '', 'g') <> bundle_row.nonprofit_ein
     )
     or p_provider_donation_date is null then
    effective_failure_code := coalesce(nullif(p_failure_code, ''), 'provider_bundle_mismatch');
    effective_failure_message := coalesce(nullif(p_failure_message, ''), 'The Every.org payload did not match the frozen pooled-settlement bundle.');
    update public.trade_donation_pool_bundles
    set
      status = 'needs_review',
      provider_charge_id_hash = case when p_provider_charge_id_hash ~ '^[0-9a-f]{64}$' then p_provider_charge_id_hash else '' end,
      provider_payload_hash = case when p_provider_payload_hash ~ '^[0-9a-f]{64}$' then p_provider_payload_hash else '' end,
      provider_amount_cents = p_provider_amount_cents,
      provider_currency = upper(coalesce(p_provider_currency, '')),
      provider_nonprofit_slug = lower(coalesce(p_provider_nonprofit_slug, '')),
      provider_nonprofit_ein = regexp_replace(coalesce(p_provider_nonprofit_ein, ''), '[^0-9]', '', 'g'),
      provider_donation_date = p_provider_donation_date,
      provider_payment_method = left(coalesce(p_provider_payment_method, ''), 120),
      failure_code = effective_failure_code,
      failure_message = left(effective_failure_message, 500)
    where id = bundle_row.id;
    update public.trade_donation_pool_obligations
    set status = 'needs_review', failure_code = effective_failure_code,
        failure_message = left(effective_failure_message, 500)
    where bundle_id = bundle_row.id and status = 'bundled';
    return jsonb_build_object('outcome', 'needs_review', 'bundleId', bundle_row.id);
  end if;

  select count(*), coalesce(sum(i.allocation_cents), 0)
  into item_count, allocation_total
  from public.trade_donation_pool_bundle_items i
  where i.bundle_id = bundle_row.id;

  manifest_header_valid := coalesce(
    jsonb_typeof(bundle_row.manifest) = 'object'
    and bundle_row.manifest->>'schemaVersion' = 'moral-trade-pooled-settlement-manifest-v1'
    and bundle_row.manifest->>'bundleId' = bundle_row.id::text
    and bundle_row.manifest->>'environment' = bundle_row.environment
    and bundle_row.manifest->>'provider' = bundle_row.provider
    and lower(bundle_row.manifest->>'recipientSlug') = lower(bundle_row.nonprofit_slug)
    and regexp_replace(coalesce(bundle_row.manifest->>'recipientEin', ''), '[^0-9]', '', 'g') = bundle_row.nonprofit_ein
    and upper(bundle_row.manifest->>'currency') = bundle_row.currency
    and upper(bundle_row.manifest->>'frequency') = bundle_row.frequency
    and bundle_row.manifest->>'aggregateAmountCents' = bundle_row.amount_cents::text
    and jsonb_typeof(bundle_row.manifest->'items') = 'array',
    false
  );

  manifest_item_count := case
    when jsonb_typeof(bundle_row.manifest->'items') = 'array'
      then jsonb_array_length(bundle_row.manifest->'items')
    else 0
  end;

  select count(*) into manifest_mismatch_count
  from jsonb_array_elements(
    case
      when jsonb_typeof(bundle_row.manifest->'items') = 'array'
        then bundle_row.manifest->'items'
      else '[]'::jsonb
    end
  ) as manifest_item(item)
  left join public.trade_donation_pool_bundle_items i
    on i.bundle_id = bundle_row.id
   and i.position::text = coalesce(manifest_item.item->>'position', '')
  left join public.trade_donation_pool_obligations o on o.id = i.obligation_id
  where i.obligation_id is null
     or i.obligation_id::text is distinct from manifest_item.item->>'obligationId'
     or i.agreement_id::text is distinct from manifest_item.item->>'agreementId'
     or i.agreement_version_id::text is distinct from manifest_item.item->>'agreementVersionId'
     or i.donation_term_id::text is distinct from manifest_item.item->>'donationTermId'
     or i.payer_user_id::text is distinct from manifest_item.item->>'payerUserId'
     or i.allocation_cents::text is distinct from manifest_item.item->>'allocationCents'
     or o.condition_hash is distinct from manifest_item.item->>'conditionHash';

  recomputed_manifest_hash := encode(
    extensions.digest(convert_to(bundle_row.manifest::text, 'UTF8'), 'sha256'),
    'hex'
  );

  select count(*) into invalid_component_count
  from public.trade_donation_pool_bundle_items i
  join public.trade_donation_pool_obligations o on o.id = i.obligation_id
  join public.agreements a on a.id = i.agreement_id
  join public.trade_donation_terms t on t.id = i.donation_term_id
  where i.bundle_id = bundle_row.id
    and (
      o.status <> 'bundled'
      or o.bundle_id <> bundle_row.id
      or o.agreement_id <> i.agreement_id
      or o.agreement_version_id <> i.agreement_version_id
      or o.donation_term_id <> i.donation_term_id
      or o.payer_user_id <> i.payer_user_id
      or o.amount_cents <> i.allocation_cents
      or a.lifecycle_status <> 'awaiting_donation'
      or a.current_version_id <> i.agreement_version_id
      or t.agreement_version_id <> i.agreement_version_id
      or t.amount_cents <> i.allocation_cents
      or lower(t.nonprofit_slug) <> lower(bundle_row.nonprofit_slug)
      or t.currency <> bundle_row.currency
      or t.frequency <> bundle_row.frequency
    );

  if not manifest_header_valid
     or recomputed_manifest_hash <> bundle_row.manifest_hash
     or item_count = 0
     or item_count <> manifest_item_count
     or allocation_total <> bundle_row.amount_cents
     or manifest_mismatch_count > 0
     or invalid_component_count > 0 then
    update public.trade_donation_pool_bundles
    set status = 'needs_review', failure_code = 'bundle_manifest_component_mismatch',
        failure_message = 'At least one component no longer matches the frozen bundle manifest.'
    where id = bundle_row.id;
    update public.trade_donation_pool_obligations
    set status = 'needs_review', failure_code = 'bundle_manifest_component_mismatch',
        failure_message = 'The component could not be atomically allocated from the provider donation.'
    where bundle_id = bundle_row.id and status = 'bundled';
    return jsonb_build_object('outcome', 'needs_review', 'bundleId', bundle_row.id);
  end if;

  perform set_config('app.core_trade_internal', '1', true);

  for item_row in
    select i.*, o.target_name, o.nonprofit_slug, o.nonprofit_ein, o.currency,
           a.proposer_id, a.responder_id
    from public.trade_donation_pool_bundle_items i
    join public.trade_donation_pool_obligations o on o.id = i.obligation_id
    join public.agreements a on a.id = i.agreement_id
    where i.bundle_id = bundle_row.id
    order by i.position
  loop
    evidence_reference_hash := encode(
      extensions.digest(convert_to(p_provider_charge_id_hash || ':' || item_row.obligation_id::text, 'UTF8'), 'sha256'),
      'hex'
    );

    insert into public.trade_evidence_items(
      agreement_id,
      submitted_by,
      evidence_type,
      evidence_url,
      attestation,
      status,
      public_title,
      public_summary,
      public_visibility,
      redaction_status,
      public_redaction_note,
      public_mime_type,
      challenge_window_ends_at,
      reviewed_at,
      provider,
      provider_reference_hash,
      provider_metadata
    ) values (
      item_row.agreement_id,
      item_row.payer_user_id,
      'provider_donation',
      '',
      format(
        'Moral Trade allocated $%s USD of a consolidated Every.org donation to %s to this frozen obligation.',
        to_char(item_row.allocation_cents / 100.0, 'FM999999990.00'),
        item_row.target_name
      ),
      'accepted',
      'Provider-confirmed pooled donation allocation',
      format(
        'Every.org confirmed a consolidated donation and Moral Trade atomically allocated $%s USD to this agreement. Moral Trade, not the participant, was the provider-facing payer and presumptive donor of record.',
        to_char(item_row.allocation_cents / 100.0, 'FM999999990.00')
      ),
      'public',
      'not_required',
      'The public record omits participant payment credentials, contact information, raw Stripe and Every.org payloads, and other bundle participants.',
      'application/json',
      timezone('utc', now()),
      timezone('utc', now()),
      'every_org',
      evidence_reference_hash,
      jsonb_build_object(
        'schemaVersion', 'moral-trade-pooled-provider-donation-evidence-v1',
        'bundleId', bundle_row.id,
        'bundleManifestHash', bundle_row.manifest_hash,
        'obligationId', item_row.obligation_id,
        'allocationCents', item_row.allocation_cents,
        'aggregateAmountCents', bundle_row.amount_cents,
        'currency', bundle_row.currency,
        'recipientSlug', bundle_row.nonprofit_slug,
        'recipientEin', bundle_row.nonprofit_ein,
        'donationDate', p_provider_donation_date,
        'paymentMethod', left(coalesce(p_provider_payment_method, ''), 120),
        'participantWasDirectEveryOrgDonor', false
      )
    )
    on conflict (provider, provider_reference_hash)
      where provider <> '' and provider_reference_hash <> ''
    do nothing;

    update public.agreements
    set
      status = 'active',
      lifecycle_status = 'active',
      activated_at = coalesce(activated_at, timezone('utc', now())),
      updated_at = timezone('utc', now())
    where id = item_row.agreement_id
      and current_version_id = item_row.agreement_version_id
      and lifecycle_status = 'awaiting_donation';

    if not found then
      raise exception 'Atomic activation failed for agreement %.', item_row.agreement_id;
    end if;
    activated_count := activated_count + 1;
  end loop;

  insert into public.trade_donation_pool_ledger_journals(
    event_key, journal_type, bundle_id, currency, status, description
  ) values (
    'every-org-bundle-settlement:' || p_provider_charge_id_hash,
    'bundle_settlement',
    bundle_row.id,
    bundle_row.currency,
    'draft',
    'Consolidated Every.org donation settled every component liability atomically.'
  )
  returning id into journal_id_value;

  insert into public.trade_donation_pool_ledger_lines(
    journal_id, account_code, entry_side, amount_cents, currency,
    profile_id, obligation_id, bundle_id
  )
  select
    journal_id_value,
    'participant_settlement_liability',
    'debit',
    i.allocation_cents,
    bundle_row.currency,
    i.payer_user_id,
    i.obligation_id,
    bundle_row.id
  from public.trade_donation_pool_bundle_items i
  where i.bundle_id = bundle_row.id;

  insert into public.trade_donation_pool_ledger_lines(
    journal_id, account_code, entry_side, amount_cents, currency, bundle_id
  ) values (
    journal_id_value,
    'platform_cash_asset',
    'credit',
    bundle_row.amount_cents,
    bundle_row.currency,
    bundle_row.id
  );

  update public.trade_donation_pool_ledger_journals
  set status = 'posted', posted_at = timezone('utc', now())
  where id = journal_id_value;

  update public.trade_donation_pool_obligations
  set status = 'settled', settled_at = timezone('utc', now()), failure_code = '', failure_message = ''
  where bundle_id = bundle_row.id and status = 'bundled';

  update public.trade_donation_pool_bundles
  set
    status = 'completed',
    provider_charge_id_hash = p_provider_charge_id_hash,
    provider_payload_hash = p_provider_payload_hash,
    provider_amount_cents = p_provider_amount_cents,
    provider_currency = upper(p_provider_currency),
    provider_nonprofit_slug = lower(p_provider_nonprofit_slug),
    provider_nonprofit_ein = regexp_replace(coalesce(p_provider_nonprofit_ein, ''), '[^0-9]', '', 'g'),
    provider_donation_date = p_provider_donation_date,
    provider_payment_method = left(coalesce(p_provider_payment_method, ''), 120),
    failure_code = '',
    failure_message = '',
    completed_at = timezone('utc', now())
  where id = bundle_row.id;

  insert into public.trade_notifications(
    user_id, notification_type, title, body, href, dedupe_key, created_at
  )
  select distinct
    participant_id,
    'pooled_donation_verified',
    'Pooled donation verified; agreement active',
    format(
      'Every.org confirmed the consolidated donation and Moral Trade allocated $%s USD to this agreement. The reciprocal action is now active.',
      to_char(i.allocation_cents / 100.0, 'FM999999990.00')
    ),
    '/trade-agreements/' || i.agreement_id::text,
    'pooled_donation_verified:' || bundle_row.id::text || ':' || i.agreement_id::text || ':' || participant_id::text,
    timezone('utc', now())
  from public.trade_donation_pool_bundle_items i
  join public.agreements a on a.id = i.agreement_id
  cross join lateral (values (a.proposer_id), (a.responder_id)) participants(participant_id)
  where i.bundle_id = bundle_row.id
  on conflict (dedupe_key) do nothing;

  insert into public.trade_messages(
    thread_id, sender_id, message_type, body, metadata, created_at
  )
  select
    t.id,
    null,
    'system',
    format(
      'Every.org verified the consolidated donation. Moral Trade allocated $%s USD to this agreement, and the reciprocal action is now active.',
      to_char(i.allocation_cents / 100.0, 'FM999999990.00')
    ),
    jsonb_build_object(
      'source', 'every_org_pooled_settlement',
      'bundleId', bundle_row.id,
      'obligationId', i.obligation_id,
      'allocationCents', i.allocation_cents
    ),
    timezone('utc', now())
  from public.trade_donation_pool_bundle_items i
  join public.trade_threads t on t.agreement_id = i.agreement_id and t.status = 'active'
  where i.bundle_id = bundle_row.id;

  insert into public.trade_donation_pool_audit_events(
    actor_kind, event_type, object_type, object_id, details
  ) values (
    'every_org',
    'bundle_completed_and_allocated',
    'bundle',
    bundle_row.id,
    jsonb_build_object('activatedAgreementCount', activated_count, 'manifestHash', bundle_row.manifest_hash)
  );

  return jsonb_build_object(
    'outcome', 'activated',
    'bundleId', bundle_row.id,
    'activatedAgreementCount', activated_count
  );
end;
$$;

create or replace function public.mark_trade_donation_pool_component_stale()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if coalesce(current_setting('app.core_trade_internal', true), '') = '1' then
    return new;
  end if;

  if new.current_version_id is distinct from old.current_version_id
     or (
       old.lifecycle_status = 'awaiting_donation'
       and new.lifecycle_status <> 'awaiting_donation'
     ) then
    update public.trade_donation_pool_obligations
    set
      status = 'needs_review',
      failure_code = 'agreement_component_changed',
      failure_message = 'The agreement version or lifecycle changed after pooled funding began.'
    where agreement_id = new.id
      and status in ('checkout_started', 'funded', 'bundled', 'refund_pending');

    update public.trade_donation_pool_bundles b
    set
      status = 'needs_review',
      failure_code = 'component_changed_after_bundle',
      failure_message = 'A component agreement changed after the bundle became immutable.'
    where exists (
      select 1
      from public.trade_donation_pool_bundle_items i
      where i.bundle_id = b.id and i.agreement_id = new.id
    )
      and b.status in ('frozen', 'checkout_started');
  end if;
  return new;
end;
$$;

drop trigger if exists mark_trade_donation_pool_component_stale_trigger on public.agreements;
create trigger mark_trade_donation_pool_component_stale_trigger
after update of current_version_id, lifecycle_status on public.agreements
for each row execute function public.mark_trade_donation_pool_component_stale();

-- Direct Every.org checkout must never open below the provider's $10 floor.
create or replace function public.start_trade_donation_checkout(
  p_agreement_id uuid,
  p_actor_id uuid,
  p_partner_donation_id text
)
returns public.trade_donation_intents
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_agreement public.agreements%rowtype;
  current_term public.trade_donation_terms%rowtype;
  current_intent public.trade_donation_intents%rowtype;
  payer_id uuid;
begin
  select a.*
  into current_agreement
  from public.agreements a
  where a.id = p_agreement_id
  for update;

  if not found then
    raise exception 'Agreement not found.';
  end if;
  if current_agreement.lifecycle_status <> 'awaiting_donation' then
    raise exception 'Both participants must confirm the frozen terms before donation checkout.';
  end if;

  select t.*
  into current_term
  from public.trade_donation_terms t
  where t.agreement_id = current_agreement.id
    and t.agreement_version_id = current_agreement.current_version_id;

  if not found then
    raise exception 'Frozen donation terms not found.';
  end if;
  if current_term.amount_cents < 1000 then
    raise exception 'Every.org requires at least $10. Sub-$10 obligations must use pooled settlement.';
  end if;

  payer_id := case
    when current_term.payer_role = 'proposer' then current_agreement.proposer_id
    else current_agreement.responder_id
  end;
  if p_actor_id <> payer_id then
    raise exception 'Only the named payer can start the donation checkout.';
  end if;

  select i.*
  into current_intent
  from public.trade_donation_intents i
  where i.donation_term_id = current_term.id
  for update;

  if found then
    if current_intent.status = 'completed' then
      return current_intent;
    end if;
    if current_intent.status = 'needs_review' then
      raise exception 'This donation requires operator review before another checkout can start.';
    end if;
    if current_intent.status = 'cancelled' then
      raise exception 'This donation checkout was cancelled and cannot be reopened.';
    end if;
    update public.trade_donation_intents
    set status = 'checkout_started', checkout_started_at = coalesce(checkout_started_at, timezone('utc', now()))
    where id = current_intent.id
    returning * into current_intent;
    return current_intent;
  end if;

  insert into public.trade_donation_intents(
    donation_term_id,
    agreement_id,
    agreement_version_id,
    payer_user_id,
    provider,
    partner_donation_id,
    status,
    expected_target_id,
    expected_target_name,
    expected_nonprofit_slug,
    expected_nonprofit_ein,
    expected_amount_cents,
    expected_currency,
    expected_frequency,
    checkout_started_at
  ) values (
    current_term.id,
    current_agreement.id,
    current_term.agreement_version_id,
    payer_id,
    'every_org',
    p_partner_donation_id,
    'checkout_started',
    current_term.target_id,
    current_term.target_name,
    current_term.nonprofit_slug,
    current_term.nonprofit_ein,
    current_term.amount_cents,
    current_term.currency,
    current_term.frequency,
    timezone('utc', now())
  )
  returning * into current_intent;

  return current_intent;
end;
$$;

revoke all on function public.create_trade_donation_pool_obligation(
  uuid, uuid, uuid, text, text, text, boolean
) from public, anon, authenticated;
revoke all on function public.attach_trade_donation_pool_checkout(uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.record_trade_donation_pool_stripe_success(
  text, text, boolean, text, boolean, uuid, text, text, text, integer, text, text
) from public, anon, authenticated;
revoke all on function public.record_trade_donation_pool_stripe_failure(
  text, text, boolean, text, boolean, uuid, text, text
) from public, anon, authenticated;
revoke all on function public.prepare_trade_donation_pool_refund(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.record_trade_donation_pool_refund_or_dispute(
  text, text, boolean, text, boolean, uuid, boolean, integer, text
) from public, anon, authenticated;
revoke all on function public.start_trade_donation_pool_bundle_checkout(uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.complete_every_org_trade_donation_pool_bundle(
  uuid, text, text, text, integer, text, text, text, timestamptz, text, boolean, text, text
) from public, anon, authenticated;
revoke all on function public.start_trade_donation_checkout(uuid, uuid, text)
  from public, anon, authenticated;

grant execute on function public.create_trade_donation_pool_obligation(
  uuid, uuid, uuid, text, text, text, boolean
) to service_role;
grant execute on function public.attach_trade_donation_pool_checkout(uuid, uuid, text)
  to service_role;
grant execute on function public.record_trade_donation_pool_stripe_success(
  text, text, boolean, text, boolean, uuid, text, text, text, integer, text, text
) to service_role;
grant execute on function public.record_trade_donation_pool_stripe_failure(
  text, text, boolean, text, boolean, uuid, text, text
) to service_role;
grant execute on function public.prepare_trade_donation_pool_refund(uuid, uuid)
  to service_role;
grant execute on function public.record_trade_donation_pool_refund_or_dispute(
  text, text, boolean, text, boolean, uuid, boolean, integer, text
) to service_role;
grant execute on function public.start_trade_donation_pool_bundle_checkout(uuid, uuid, text)
  to service_role;
grant execute on function public.complete_every_org_trade_donation_pool_bundle(
  uuid, text, text, text, integer, text, text, text, timestamptz, text, boolean, text, text
) to service_role;
grant execute on function public.start_trade_donation_checkout(uuid, uuid, text)
  to service_role;

comment on table public.trade_donation_pool_obligations is
  'Exact participant-funded sub-$10 trade obligations. Participant payments fund Moral Trade pooled settlement and are not direct Every.org gifts.';
comment on table public.trade_donation_pool_bundles is
  'Immutable cross-user, same-recipient pooled settlement manifests paid to Every.org by Moral Trade as platform payer.';
comment on table public.trade_donation_pool_ledger_journals is
  'Immutable double-entry pooled-settlement journals. Posted journals must balance at transaction commit.';
comment on function public.complete_every_org_trade_donation_pool_bundle(
  uuid, text, text, text, integer, text, text, text, timestamptz, text, boolean, text, text
) is
  'Validates one exact consolidated Every.org donation and atomically allocates it across every frozen component agreement, or activates none.';
