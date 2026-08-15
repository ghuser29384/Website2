do $assert$
begin
  if (select count(*) from public.direct_spending_upgrade_candidates
      where offer_id = 'f1200000-0000-4000-8000-000000000012') <> 1
     or (select count(*) from public.direct_spending_upgrade_obligations
         where offer_id = 'f1200000-0000-4000-8000-000000000012') <> 2
     or not exists (
       select 1 from public.direct_spending_upgrade_offers
       where id = 'f1200000-0000-4000-8000-000000000012'
         and status = 'matched'
         and winning_candidate_id is not null
     ) then
    raise exception 'Concurrent exact-match attempts did not produce one matcher and two obligations.';
  end if;

  if (select count(*) from public.direct_spending_upgrade_proposals
      where offer_id = 'f2200000-0000-4000-8000-000000000022'
        and status = 'accepted') <> 1
     or (select count(*) from public.direct_spending_upgrade_offers
         where supersedes_offer_id = 'f2200000-0000-4000-8000-000000000022') <> 1
     or (select count(*)
         from public.direct_spending_upgrade_obligations obligation
         join public.direct_spending_upgrade_offers successor
           on successor.id = obligation.offer_id
         where successor.supersedes_offer_id = 'f2200000-0000-4000-8000-000000000022') <> 2
     or not exists (
       select 1 from public.direct_spending_upgrade_offers
       where id = 'f2200000-0000-4000-8000-000000000022'
         and status = 'superseded'
         and superseded_by_offer_id is not null
     ) then
    raise exception 'Concurrent proposal acceptance did not produce one immutable matched successor.';
  end if;

  raise notice 'direct_spending_upgrade concurrent transitions passed';
end;
$assert$;
