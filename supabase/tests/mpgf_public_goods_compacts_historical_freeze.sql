-- Runs after the main Compact v2 lifecycle in the same rollback-only transaction.

do $test$
begin
  if not exists (
    select 1 from public.mpgf_public_goods_compact_memberships
    where compact_id = '10000000-0000-4000-8000-000000000001'
  ) then raise exception 'Historical membership evidence disappeared.'; end if;

  begin
    update public.mpgf_public_goods_compacts
    set summary = 'A replacement summary after a constitution was accepted.'
    where public_key = 'future-flourishing';
    raise exception 'Historically accepted constitutional terms became mutable.';
  exception when check_violation then null;
  end;

  begin
    update public.mpgf_public_goods_compacts
    set status = 'active', activated_at = now(), constitution_frozen_at = now(),
        frozen_constitution_version = constitution_version
    where public_key = 'global-health';
    raise exception 'The prototype activated a Compact without a later authorized release.';
  exception when check_violation then null;
  end;

  if exists (
    select 1 from public.mpgf_public_goods_compacts
    where activation_execution_enabled or automatic_collection_enabled
  ) then raise exception 'Activation or automatic collection was enabled.'; end if;
end;
$test$;

select 'Historical constitution freeze and hard activation boundary passed.' as result;
