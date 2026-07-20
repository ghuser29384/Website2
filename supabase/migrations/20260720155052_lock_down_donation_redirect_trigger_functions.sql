-- The v2 trigger functions are internal database mechanisms, not public RPCs.
revoke all on function public.validate_donation_offset_redirect_plan()
  from public, anon, authenticated;
revoke all on function public.seed_donation_offset_redirect_plans()
  from public, anon, authenticated;
revoke all on function public.validate_public_donation_redirect_receipt()
  from public, anon, authenticated;

grant execute on function public.validate_donation_offset_redirect_plan() to service_role;
grant execute on function public.seed_donation_offset_redirect_plans() to service_role;
grant execute on function public.validate_public_donation_redirect_receipt() to service_role;
