begin;

create table if not exists public.mpgf_public_goods_sponsor_pool_deposits (
  id uuid primary key default gen_random_uuid(),
  sponsor_pool_id text not null references public.mpgf_public_goods_match_pools (id) on delete cascade,
  round_id text references public.mpgf_public_goods_rounds (id) on delete set null,
  source_type text not null check (
    source_type in (
      'direct_sponsor_deposit',
      'recurring_member_tithe',
      'donation_offset_surplus',
      'trade_surplus_tithe'
    )
  ),
  source_ref_hash text not null check (source_ref_hash ~ '^sha256:[0-9a-f]{64}$'),
  amount_cents bigint not null check (amount_cents > 0),
  status text not null default 'pending_review' check (status in ('available', 'pending_review', 'voided')),
  custody_mode text not null default 'partner_or_provider_held_not_platform_custody' check (
    custody_mode = 'partner_or_provider_held_not_platform_custody'
  ),
  public_memo text not null default '',
  counts_toward_matching boolean not null default false,
  received_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  unique (sponsor_pool_id, source_ref_hash)
);

create index if not exists mpgf_public_goods_sponsor_pool_deposits_pool_idx
  on public.mpgf_public_goods_sponsor_pool_deposits (sponsor_pool_id, status, received_at desc);

create index if not exists mpgf_public_goods_sponsor_pool_deposits_source_idx
  on public.mpgf_public_goods_sponsor_pool_deposits (source_type, received_at desc);

alter table public.mpgf_public_goods_sponsor_pool_deposits enable row level security;

drop policy if exists "mpgf_public_goods_sponsor_pool_deposits_public_select"
on public.mpgf_public_goods_sponsor_pool_deposits;
create policy "mpgf_public_goods_sponsor_pool_deposits_public_select"
on public.mpgf_public_goods_sponsor_pool_deposits
for select
to anon, authenticated
using (status in ('available', 'pending_review'));

grant select on public.mpgf_public_goods_sponsor_pool_deposits to anon, authenticated;
grant all on public.mpgf_public_goods_sponsor_pool_deposits to service_role;

comment on table public.mpgf_public_goods_sponsor_pool_deposits is
  'MPGF sponsor-pool flywheel ledger: direct sponsor deposits, recurring member tithes, donation-offset surplus, and moral-trade surplus routed into matching pools.';

comment on column public.mpgf_public_goods_sponsor_pool_deposits.source_ref_hash is
  'Hashed source reference only; raw donor, trade, payment, and offset identifiers are not public.';

comment on column public.mpgf_public_goods_sponsor_pool_deposits.custody_mode is
  'Sponsor-pool funds are partner/provider-held and not Moral Trade application custody.';

commit;
