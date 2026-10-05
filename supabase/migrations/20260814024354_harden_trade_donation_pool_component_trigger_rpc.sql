-- Keep the pooled-settlement agreement-change trigger helper out of the exposed RPC surface.
--
-- Production already contains the trigger function even though the broader pooled-settlement
-- source has not yet merged into main. The existence check keeps this migration safe for fresh
-- databases where the feature migration is not present yet; once that earlier migration exists,
-- this later migration revokes browser-role execution deterministically.

do $$
begin
  if to_regprocedure('public.mark_trade_donation_pool_component_stale()') is not null then
    execute 'revoke all on function public.mark_trade_donation_pool_component_stale() from public, anon, authenticated';
    execute 'grant execute on function public.mark_trade_donation_pool_component_stale() to service_role';
  end if;
end;
$$;
