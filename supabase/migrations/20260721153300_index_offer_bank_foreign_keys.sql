-- Cover the foreign keys introduced by the offer-bank tables.
create index if not exists financial_commitment_pools_owner_idx
  on public.financial_commitment_pools (owner_id);

create index if not exists offer_catalog_entries_shared_financial_pool_idx
  on public.offer_catalog_entries (shared_financial_pool_key);

create index if not exists financial_commitment_reservations_offer_idx
  on public.financial_commitment_reservations (offer_id);
