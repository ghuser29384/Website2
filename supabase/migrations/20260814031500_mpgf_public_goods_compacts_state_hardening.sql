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

create or replace function public.mpgf_public_goods_compact_enforce_constitution_freeze()
returns trigger
language plpgsql
set search_path = ''
as $function$
declare
  historically_accepted boolean;
  old_constitution jsonb;
  new_constitution jsonb;
begin
  if old.status = 'active' and new.status <> 'active' then
    raise exception using
      errcode = '23514',
      message = 'An activated compact cannot return to recruiting.';
  end if;

  select exists (
    select 1
    from public.mpgf_public_goods_compact_memberships as membership
    where membership.compact_id = old.id
  ) into historically_accepted;

  old_constitution := pg_catalog.to_jsonb(old) - array[
    'display_order',
    'status',
    'accepted_member_count',
    'activated_at',
    'constitution_frozen_at',
    'frozen_constitution_version',
    'allocation_electorate_active',
    'allocation_electorate_key',
    'updated_at'
  ];
  new_constitution := pg_catalog.to_jsonb(new) - array[
    'display_order',
    'status',
    'accepted_member_count',
    'activated_at',
    'constitution_frozen_at',
    'frozen_constitution_version',
    'allocation_electorate_active',
    'allocation_electorate_key',
    'updated_at'
  ];

  if (old.status = 'active' or historically_accepted)
    and new_constitution is distinct from old_constitution
  then
    raise exception using
      errcode = '23514',
      message = 'Published compact terms are immutable after the first acceptance.';
  end if;

  if old.status = 'active' and (
    new.activated_at is distinct from old.activated_at
    or new.constitution_frozen_at is distinct from old.constitution_frozen_at
    or new.frozen_constitution_version is distinct from old.frozen_constitution_version
  ) then
    raise exception using
      errcode = '23514',
      message = 'Activated compact activation snapshot is immutable.';
  end if;

  if old.status = 'recruiting' and new.status = 'active' and (
    new.activated_at is null
    or new.constitution_frozen_at is null
    or new.frozen_constitution_version is distinct from new.constitution_version
  ) then
    raise exception using
      errcode = '23514',
      message = 'Activation must freeze the exact current constitution version.';
  end if;

  return new;
end;
$function$;

revoke all on function public.mpgf_public_goods_compact_enforce_constitution_freeze()
  from public, anon, authenticated;

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
