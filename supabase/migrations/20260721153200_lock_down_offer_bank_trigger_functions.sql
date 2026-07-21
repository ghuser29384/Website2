-- Trigger functions are internal implementation details and must not be exposed as RPCs.
revoke execute on function public.preserve_repeatable_catalog_offer() from public, anon, authenticated;
revoke execute on function public.reserve_catalog_financial_commitment() from public, anon, authenticated;
revoke execute on function public.settle_catalog_financial_commitment() from public, anon, authenticated;

grant execute on function public.preserve_repeatable_catalog_offer() to service_role;
grant execute on function public.reserve_catalog_financial_commitment() to service_role;
grant execute on function public.settle_catalog_financial_commitment() to service_role;
