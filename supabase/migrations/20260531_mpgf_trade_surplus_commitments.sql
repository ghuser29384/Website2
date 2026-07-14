begin;

create table if not exists public.mpgf_public_goods_trade_surplus_commitments (
  id text primary key,
  sponsor_pool_id text not null references public.mpgf_public_goods_match_pools (id) on delete cascade,
  round_id text references public.mpgf_public_goods_rounds (id) on delete set null,
  source_type text not null check (source_type in ('donation_offset_surplus', 'trade_surplus_tithe')),
  trade_or_offset_ref_hash text not null unique check (trade_or_offset_ref_hash ~ '^sha256:[0-9a-f]{64}$'),
  amount_cents bigint not null check (amount_cents > 0),
  status text not null default 'committed_pending_settlement' check (
    status in ('committed_pending_settlement', 'settled_to_sponsor_pool', 'voided')
  ),
  custody_mode text not null default 'partner_or_provider_held_not_platform_custody' check (
    custody_mode = 'partner_or_provider_held_not_platform_custody'
  ),
  settlement_deposit_id uuid references public.mpgf_public_goods_sponsor_pool_deposits (id) on delete set null,
  calc_hash text not null check (calc_hash ~ '^sha256:[0-9a-f]{64}$'),
  created_at timestamptz not null default timezone('utc', now()),
  settled_at timestamptz
);

create index if not exists mpgf_public_goods_trade_surplus_commitments_pool_idx
  on public.mpgf_public_goods_trade_surplus_commitments (sponsor_pool_id, status, created_at desc);

alter table public.mpgf_public_goods_trade_surplus_commitments enable row level security;

drop policy if exists "mpgf_public_goods_trade_surplus_commitments_public_select"
on public.mpgf_public_goods_trade_surplus_commitments;
create policy "mpgf_public_goods_trade_surplus_commitments_public_select"
on public.mpgf_public_goods_trade_surplus_commitments
for select
to anon, authenticated
using (status in ('committed_pending_settlement', 'settled_to_sponsor_pool'));

grant select on public.mpgf_public_goods_trade_surplus_commitments to anon, authenticated;
grant all on public.mpgf_public_goods_trade_surplus_commitments to service_role;

comment on table public.mpgf_public_goods_trade_surplus_commitments is
  'MPGF trade-surplus and donation-offset surplus commitments that can settle into sponsor-pool deposits after provider or reviewer confirmation.';

comment on column public.mpgf_public_goods_trade_surplus_commitments.trade_or_offset_ref_hash is
  'Hashed trade or donation-offset source reference only; raw counterparty, payment, and offset records are private by default.';

commit;
