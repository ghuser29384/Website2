-- Keep the shared pool-integrity trigger record-safe across pool tables.
-- institutional_pool_votes intentionally has no status column, so direct
-- NEW.status access in a compound boolean expression can fail before the
-- table-name guard is honored by PostgreSQL's expression planner.
create or replace function public.institutional_validate_pool_record()
returns trigger language plpgsql set search_path=pg_catalog,public as $$
declare pool_row public.institutional_pool_terms; account_row public.institutional_budget_accounts; reservation_row public.institutional_budget_reservations;
begin
 select * into pool_row from public.institutional_pool_terms where deal_id=new.deal_id;
 if not found then raise exception 'Pool terms do not exist for the deal.' using errcode='23503'; end if;
 if new.terms_hash<>pool_row.terms_hash then raise exception 'Pool record is not bound to the current exact terms.' using errcode='23514'; end if;
 if not exists(select 1 from public.institutional_deal_parties p where p.deal_id=new.deal_id and p.party_capacity='organization' and p.organization_id=new.organization_id and p.program_id is not distinct from new.program_id) then
  raise exception 'Pool organization/program is not an eligible exact-scope organization deal party.' using errcode='23514';
 end if;
 if tg_table_name='institutional_pool_contributions' and (to_jsonb(new)->>'status') in('committed','paid') then
  if new.budget_reservation_id is null or new.finance_authority_grant_id is null or new.committed_by is null then
   raise exception 'Committed pool contribution requires a financial reservation, finance authority, and committing actor.' using errcode='23514';
  end if;
  select * into reservation_row from public.institutional_budget_reservations where id=new.budget_reservation_id;
  if not found or reservation_row.deal_id<>new.deal_id or reservation_row.amount_cents<new.amount_cents or reservation_row.status not in('approved','committed') then
   raise exception 'Pool contribution financial reservation is invalid for this deal and amount.' using errcode='23514';
  end if;
  select * into account_row from public.institutional_budget_accounts where id=reservation_row.budget_account_id;
  if account_row.organization_id<>new.organization_id or account_row.program_id is distinct from new.program_id then
   raise exception 'Pool contribution reservation must belong to the exact organization/program.' using errcode='23514';
  end if;
  if not exists(select 1 from public.institutional_authority_grants g where g.id=new.finance_authority_grant_id and g.profile_id=new.committed_by
   and g.organization_id=new.organization_id and g.program_id is not distinct from new.program_id and 'finance:reserve'=any(g.permissions)
   and g.revoked_at is null and g.valid_from<=timezone('utc',now()) and (g.valid_until is null or g.valid_until>timezone('utc',now()))
   and (g.amount_limit_cents is null or g.amount_limit_cents>=new.amount_cents)) then
   raise exception 'Pool contribution lacks valid exact-scope finance reservation authority.' using errcode='42501';
  end if;
  if not exists(select 1 from public.institutional_approvals a where a.deal_id=new.deal_id and a.organization_id=new.organization_id
   and a.program_id is not distinct from new.program_id and a.approval_kind='pool_participation' and a.decision='approve'
   and a.decided_by is not null and a.decided_by<>new.committed_by) then
   raise exception 'Financial reservation cannot substitute for independent pool participation approval.' using errcode='42501';
  end if;
 elsif tg_table_name='institutional_pool_anchors' and (to_jsonb(new)->>'status')='committed' then
  if not exists(select 1 from public.institutional_pool_contributions c where c.id=new.contribution_id and c.deal_id=new.deal_id
   and c.organization_id=new.organization_id and c.program_id is not distinct from new.program_id and c.status in('committed','paid') and c.amount_cents>=new.amount_cents) then
   raise exception 'Anchor commitment requires an eligible committed contribution for the same exact scope.' using errcode='23514';
  end if;
 elsif tg_table_name='institutional_pool_underwritings' and (to_jsonb(new)->>'status')='committed' then
  if new.budget_reservation_id is null or not exists(select 1 from public.institutional_budget_reservations r
   join public.institutional_budget_accounts a on a.id=r.budget_account_id where r.id=new.budget_reservation_id and r.deal_id=new.deal_id
   and r.amount_cents>=new.maximum_amount_cents and r.status in('approved','committed') and a.organization_id=new.organization_id and a.program_id is not distinct from new.program_id) then
   raise exception 'Committed underwriting requires a sufficient exact-scope financial reservation.' using errcode='23514';
  end if;
 elsif tg_table_name='institutional_pool_votes' then
  if not exists(select 1 from public.institutional_authority_grants g where g.id=new.authority_grant_id and g.profile_id=new.voter_profile_id
   and g.organization_id=new.organization_id and g.program_id is not distinct from new.program_id and 'pool:approve'=any(g.permissions)
   and g.revoked_at is null and g.valid_from<=timezone('utc',now()) and (g.valid_until is null or g.valid_until>timezone('utc',now()))) then
   raise exception 'Pool vote requires valid exact-scope pool approval authority.' using errcode='42501';
  end if;
 end if;
 return new;
end $$;
