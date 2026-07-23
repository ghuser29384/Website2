-- Cover the foreign keys introduced by the conditional redirect ledger.

create index conditional_redirect_offers_creator_idx
  on public.conditional_redirect_offers (creator_profile_id, created_at desc);
create index conditional_redirect_offers_fallback_destination_idx
  on public.conditional_redirect_offers (fallback_destination_id);
create index conditional_redirect_offers_matched_destination_idx
  on public.conditional_redirect_offers (matched_destination_id);
create index conditional_redirect_offers_winning_candidate_idx
  on public.conditional_redirect_offers (winning_candidate_id)
  where winning_candidate_id is not null;
create index conditional_redirect_settlement_legs_destination_idx
  on public.conditional_redirect_settlement_legs (destination_id);
create index conditional_redirect_settlement_legs_mandate_idx
  on public.conditional_redirect_settlement_legs (mandate_id);
create index conditional_redirect_settlement_legs_profile_idx
  on public.conditional_redirect_settlement_legs (profile_id);
