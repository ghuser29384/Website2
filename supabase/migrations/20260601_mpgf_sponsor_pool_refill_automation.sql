begin;

alter table public.mpgf_public_goods_sponsor_pool_deposits
  add column if not exists scheduled_for_round_id text,
  add column if not exists route_share_bps integer not null default 10000
    check (route_share_bps between 0 and 10000),
  add column if not exists automation_policy text not null
    default 'manual_or_automatic_provider_reviewed_refill';

alter table public.mpgf_public_goods_trade_surplus_commitments
  add column if not exists gross_surplus_cents bigint,
  add column if not exists route_share_bps integer not null default 5000
    check (route_share_bps between 0 and 10000),
  add column if not exists scheduled_for_round_id text,
  add column if not exists provider_event_verified boolean not null default false,
  add column if not exists reviewer_approved boolean not null default false;

create index if not exists mpgf_public_goods_sponsor_pool_deposits_scheduled_round_idx
  on public.mpgf_public_goods_sponsor_pool_deposits (scheduled_for_round_id, status, received_at desc);

comment on column public.mpgf_public_goods_sponsor_pool_deposits.scheduled_for_round_id is
  'Future MPGF round targeted by the published automatic refill rule; current-round allocation cannot be retuned by this value.';

comment on column public.mpgf_public_goods_sponsor_pool_deposits.route_share_bps is
  'Published share routed from recurring tithes, donation-offset surplus, or moral-trade surplus into the sponsor pool.';

comment on column public.mpgf_public_goods_trade_surplus_commitments.gross_surplus_cents is
  'Gross surplus before the published route_share_bps is applied; raw trade, counterparty, and offset references remain hashed or private.';

comment on column public.mpgf_public_goods_trade_surplus_commitments.provider_event_verified is
  'Provider or partner confirmation gate required before an automatic surplus refill can count toward matching.';

comment on column public.mpgf_public_goods_trade_surplus_commitments.reviewer_approved is
  'Reviewer confirmation gate required before an automatic surplus refill can count toward matching.';

comment on column public.mpgf_public_goods_trade_surplus_commitments.scheduled_for_round_id is
  'Future public-goods round receiving the automatic refill; sponsors cannot steer a specific campaign after the round opens.';

commit;
