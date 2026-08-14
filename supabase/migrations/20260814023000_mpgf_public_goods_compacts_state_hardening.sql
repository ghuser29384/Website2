begin;

alter table public.mpgf_public_goods_compacts
  add constraint mpgf_public_goods_compacts_activation_count_consistency
  check (
    (status = 'recruiting'
      and accepted_member_count <= activation_threshold_members)
    or
    (status = 'active'
      and accepted_member_count >= activation_threshold_members)
  );

alter table public.mpgf_public_goods_compacts
  add constraint mpgf_public_goods_compacts_active_electorate_requires_activation
  check (
    not allocation_electorate_active
    or status = 'active'
  );

create or replace function public.mpgf_public_goods_compact_revoke_stale_delegations()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.allocation_electorate_active then
    update public.mpgf_public_goods_compact_delegations
    set status = 'revoked',
        revoked_at = pg_catalog.statement_timestamp()
    where compact_id = new.id
      and status = 'active'
      and electorate_key is distinct from new.allocation_electorate_key;
  else
    update public.mpgf_public_goods_compact_delegations
    set status = 'revoked',
        revoked_at = pg_catalog.statement_timestamp()
    where compact_id = new.id
      and status = 'active';
  end if;

  return new;
end;
$function$;

create trigger mpgf_public_goods_compacts_revoke_stale_delegations
after update of allocation_electorate_active, allocation_electorate_key
on public.mpgf_public_goods_compacts
for each row
when (
  old.allocation_electorate_active is distinct from new.allocation_electorate_active
  or old.allocation_electorate_key is distinct from new.allocation_electorate_key
)
execute function public.mpgf_public_goods_compact_revoke_stale_delegations();

revoke all on function public.mpgf_public_goods_compact_revoke_stale_delegations()
  from public, anon, authenticated;

comment on function public.mpgf_public_goods_compact_revoke_stale_delegations() is
  'Revokes active voting-credit delegations when a compact allocation electorate closes or changes, so stale electorate records cannot remain effective.';

commit;
