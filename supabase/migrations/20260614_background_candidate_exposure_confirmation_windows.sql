alter table public.wish_profiles
  add column if not exists inbound_delegate_confirmed_at timestamptz,
  add column if not exists inbound_delegate_expires_at timestamptz;
