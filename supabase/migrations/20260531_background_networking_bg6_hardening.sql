alter table public.match_concierge_requests
  add column if not exists no_trade_baseline text not null default '';
