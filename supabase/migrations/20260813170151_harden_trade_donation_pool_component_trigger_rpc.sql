-- Keep the agreement-change trigger helper out of the exposed PostgREST RPC
-- surface. The existing agreements trigger continues to invoke it; browser
-- clients must not call this SECURITY DEFINER helper directly.

revoke all on function public.mark_trade_donation_pool_component_stale()
  from public, anon, authenticated;

grant execute on function public.mark_trade_donation_pool_component_stale()
  to service_role;
