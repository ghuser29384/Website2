-- Account-level setup is deliberately separate from trade-bound mandates.
-- Only authenticated server actions may create provider links; browser roles
-- cannot insert mappings, choose a Stripe customer, or mark anything ready.
create table public.account_payment_settings (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  platform_account_id text not null check (platform_account_id ~ '^acct_[A-Za-z0-9]+$'),
  livemode boolean not null,
  stripe_customer_id text check (stripe_customer_id ~ '^cus_[A-Za-z0-9]+$'),
  customer_started_at timestamptz,
  stripe_account_id text check (stripe_account_id ~ '^acct_[A-Za-z0-9]+$'),
  account_started_at timestamptz,
  account_country text check (account_country ~ '^[A-Z]{2}$'),
  created_at timestamptz not null default now(),
  unique (profile_id, platform_account_id, livemode),
  unique (platform_account_id, livemode, stripe_customer_id),
  unique (platform_account_id, livemode, stripe_account_id),
  check (stripe_account_id is null or stripe_account_id <> platform_account_id)
);
alter table public.account_payment_settings enable row level security;
revoke all on table public.account_payment_settings from public, anon, authenticated;
grant select, insert, update, delete on table public.account_payment_settings to service_role;
comment on table public.account_payment_settings is
  'Server-owned Stripe setup mappings. No card numbers, bank numbers, money balances or trade payment authorizations.';

-- A database-backed limit also applies across serverless instances.
create table public.account_payment_setup_limits (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  window_started_at timestamptz not null,
  attempts integer not null check (attempts between 1 and 11)
);
alter table public.account_payment_setup_limits enable row level security;
revoke all on table public.account_payment_setup_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.account_payment_setup_limits to service_role;
create function public.take_account_payment_setup_slot(p_profile_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare used integer;
begin
  insert into public.account_payment_setup_limits as existing (profile_id, window_started_at, attempts)
  values (p_profile_id, clock_timestamp(), 1)
  on conflict (profile_id) do update set
    attempts = case when existing.window_started_at <= clock_timestamp() - interval '1 minute'
      then 1 else least(existing.attempts + 1, 11) end,
    window_started_at = case when existing.window_started_at <= clock_timestamp() - interval '1 minute'
      then clock_timestamp() else existing.window_started_at end
  returning attempts into used;
  return used <= 10;
end;
$$;
revoke all on function public.take_account_payment_setup_slot(uuid) from public, anon, authenticated;
grant execute on function public.take_account_payment_setup_slot(uuid) to service_role;
