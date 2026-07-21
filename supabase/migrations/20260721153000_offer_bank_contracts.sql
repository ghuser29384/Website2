-- Publish the owner-authorized Moral Trade offer bank.
-- The catalog uses exact-effort pairings, excludes donation-for-donation rows,
-- preserves one active instance per counterparty, and enforces one shared USD 500 pool.

create table if not exists public.financial_commitment_pools (
  pool_key text primary key,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  currency text not null default 'USD',
  total_cents integer not null check (total_cents > 0),
  reserved_cents integer not null default 0 check (reserved_cents >= 0),
  spent_cents integer not null default 0 check (spent_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint financial_commitment_pools_currency_check check (currency = 'USD'),
  constraint financial_commitment_pools_capacity_check
    check (reserved_cents + spent_cents <= total_cents)
);

create table if not exists public.offer_catalog_entries (
  offer_id uuid primary key references public.offers(id) on delete cascade,
  offer_code text not null,
  request_code text not null,
  effort_level text not null check (effort_level in ('L1','L2','L3','L4','L5')),
  offer_category text not null,
  request_category text not null,
  request_priority_code text not null default '',
  default_terms_version integer not null default 1 check (default_terms_version > 0),
  repeatable boolean not null default true,
  shared_financial_pool_key text references public.financial_commitment_pools(pool_key) on delete restrict,
  financial_maximum_cents integer,
  reserve_all_remaining boolean not null default false,
  created_at timestamptz not null default now(),
  constraint offer_catalog_entries_code_key unique (offer_code, request_code),
  constraint offer_catalog_entries_financial_shape_check check (
    (
      shared_financial_pool_key is null
      and financial_maximum_cents is null
      and reserve_all_remaining = false
    )
    or
    (
      shared_financial_pool_key is not null
      and (
        (reserve_all_remaining = true and financial_maximum_cents is null)
        or
        (reserve_all_remaining = false and financial_maximum_cents > 0)
      )
    )
  )
);

create table if not exists public.financial_commitment_reservations (
  agreement_id uuid primary key references public.agreements(id) on delete cascade,
  offer_id uuid not null references public.offers(id) on delete cascade,
  pool_key text not null references public.financial_commitment_pools(pool_key) on delete restrict,
  reserved_cents integer not null check (reserved_cents > 0),
  status text not null default 'reserved'
    check (status in ('reserved','spent','released')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists offer_catalog_entries_effort_level_idx
  on public.offer_catalog_entries (effort_level, offer_code, request_code);
create index if not exists offer_catalog_entries_priority_idx
  on public.offer_catalog_entries (request_priority_code, request_code);
create index if not exists financial_commitment_reservations_pool_status_idx
  on public.financial_commitment_reservations (pool_key, status);

create unique index if not exists agreements_one_current_instance_per_offer_counterparty_idx
  on public.agreements (offer_id, responder_id)
  where lifecycle_status in ('draft','proposed','confirmed','active','evidence_due','disputed');

alter table public.financial_commitment_pools enable row level security;
alter table public.offer_catalog_entries enable row level security;
alter table public.financial_commitment_reservations enable row level security;

drop policy if exists "Public can read catalog metadata" on public.offer_catalog_entries;
create policy "Public can read catalog metadata"
  on public.offer_catalog_entries
  for select
  using (true);

drop policy if exists "Owners can read their financial pool" on public.financial_commitment_pools;
create policy "Owners can read their financial pool"
  on public.financial_commitment_pools
  for select
  using (owner_id = (select auth.uid()));

drop policy if exists "Participants can read financial reservations" on public.financial_commitment_reservations;
create policy "Participants can read financial reservations"
  on public.financial_commitment_reservations
  for select
  using (
    exists (
      select 1
      from public.financial_commitment_pools pool
      where pool.pool_key = financial_commitment_reservations.pool_key
        and pool.owner_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.agreements agreement
      where agreement.id = financial_commitment_reservations.agreement_id
        and (select auth.uid()) in (agreement.proposer_id, agreement.responder_id)
    )
  );

grant select on public.offer_catalog_entries to anon, authenticated;
grant select on public.financial_commitment_pools to authenticated;
grant select on public.financial_commitment_reservations to authenticated;
grant all on public.offer_catalog_entries to service_role;
grant all on public.financial_commitment_pools to service_role;
grant all on public.financial_commitment_reservations to service_role;

create or replace function public.preserve_repeatable_catalog_offer()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = 'matched'::public.offer_status
     and new.workflow_status = 'closed'
     and exists (
       select 1
       from public.offer_catalog_entries catalog
       where catalog.offer_id = new.id
         and catalog.repeatable = true
     )
  then
    new.status := 'open'::public.offer_status;
    new.workflow_status := 'published';
    new.closed_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists preserve_repeatable_catalog_offer_on_match on public.offers;
create trigger preserve_repeatable_catalog_offer_on_match
before update of status, workflow_status, closed_at on public.offers
for each row
execute function public.preserve_repeatable_catalog_offer();

create or replace function public.reserve_catalog_financial_commitment()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  agreement_row public.agreements%rowtype;
  catalog_row public.offer_catalog_entries%rowtype;
  confirmation_count integer;
  pool_total integer;
  pool_reserved integer;
  pool_spent integer;
  available_cents integer;
  reservation_cents integer;
  inserted_count integer;
begin
  select agreement.*
  into agreement_row
  from public.agreements agreement
  where agreement.current_version_id = new.agreement_version_id;

  if not found then
    return new;
  end if;

  select catalog.*
  into catalog_row
  from public.offer_catalog_entries catalog
  where catalog.offer_id = agreement_row.offer_id
    and catalog.shared_financial_pool_key is not null;

  if not found then
    return new;
  end if;

  select count(*)
  into confirmation_count
  from public.trade_agreement_confirmations confirmation
  where confirmation.agreement_version_id = new.agreement_version_id;

  if confirmation_count < 2 then
    return new;
  end if;

  if exists (
    select 1
    from public.financial_commitment_reservations reservation
    where reservation.agreement_id = agreement_row.id
  ) then
    return new;
  end if;

  select pool.total_cents, pool.reserved_cents, pool.spent_cents
  into pool_total, pool_reserved, pool_spent
  from public.financial_commitment_pools pool
  where pool.pool_key = catalog_row.shared_financial_pool_key
  for update;

  if not found then
    raise exception 'The shared financial commitment pool is unavailable.';
  end if;

  available_cents := pool_total - pool_reserved - pool_spent;

  if catalog_row.reserve_all_remaining then
    reservation_cents := least(available_cents, 50000);
  else
    reservation_cents := catalog_row.financial_maximum_cents;
  end if;

  if reservation_cents is null or reservation_cents <= 0 then
    raise exception 'The shared $500 commitment pool has no unreserved capacity.';
  end if;

  if reservation_cents > available_cents then
    raise exception
      'The shared $500 commitment pool has only $% available; this agreement requires up to $%.',
      to_char(available_cents / 100.0, 'FM999999990.00'),
      to_char(reservation_cents / 100.0, 'FM999999990.00');
  end if;

  insert into public.financial_commitment_reservations (
    agreement_id,
    offer_id,
    pool_key,
    reserved_cents,
    status
  )
  values (
    agreement_row.id,
    agreement_row.offer_id,
    catalog_row.shared_financial_pool_key,
    reservation_cents,
    'reserved'
  )
  on conflict (agreement_id) do nothing;

  get diagnostics inserted_count = row_count;

  if inserted_count = 1 then
    update public.financial_commitment_pools
    set reserved_cents = reserved_cents + reservation_cents,
        updated_at = now()
    where pool_key = catalog_row.shared_financial_pool_key;
  end if;

  return new;
end;
$$;

drop trigger if exists reserve_catalog_financial_commitment_after_confirmation
  on public.trade_agreement_confirmations;
create trigger reserve_catalog_financial_commitment_after_confirmation
after insert on public.trade_agreement_confirmations
for each row
execute function public.reserve_catalog_financial_commitment();

create or replace function public.settle_catalog_financial_commitment()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  reservation_row public.financial_commitment_reservations%rowtype;
begin
  if new.lifecycle_status is not distinct from old.lifecycle_status then
    return new;
  end if;

  select reservation.*
  into reservation_row
  from public.financial_commitment_reservations reservation
  where reservation.agreement_id = new.id
    and reservation.status = 'reserved'
  for update;

  if not found then
    return new;
  end if;

  if new.lifecycle_status = 'completed' then
    update public.financial_commitment_pools
    set reserved_cents = reserved_cents - reservation_row.reserved_cents,
        spent_cents = spent_cents + reservation_row.reserved_cents,
        updated_at = now()
    where pool_key = reservation_row.pool_key
      and reserved_cents >= reservation_row.reserved_cents;

    update public.financial_commitment_reservations
    set status = 'spent',
        updated_at = now()
    where agreement_id = new.id;
  elsif new.lifecycle_status in ('cancelled','expired') then
    update public.financial_commitment_pools
    set reserved_cents = reserved_cents - reservation_row.reserved_cents,
        updated_at = now()
    where pool_key = reservation_row.pool_key
      and reserved_cents >= reservation_row.reserved_cents;

    update public.financial_commitment_reservations
    set status = 'released',
        updated_at = now()
    where agreement_id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists settle_catalog_financial_commitment_on_agreement
  on public.agreements;
create trigger settle_catalog_financial_commitment_on_agreement
after update of lifecycle_status on public.agreements
for each row
execute function public.settle_catalog_financial_commitment();

revoke all on function public.preserve_repeatable_catalog_offer() from public;
revoke all on function public.reserve_catalog_financial_commitment() from public;
revoke all on function public.settle_catalog_financial_commitment() from public;
