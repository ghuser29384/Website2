-- Keep donation-backed bilateral confirmation on the participant-authenticated
-- boundary enforced by moral_trade_private.bind_trade_confirmation_actor().
--
-- This is forward-only privilege normalization. Do not weaken or bypass the
-- trigger: the caller must carry the participant's auth.uid().

revoke all on function public.confirm_trade_donation_version_v2(
  uuid, uuid, uuid
) from public, anon, authenticated, service_role;

grant execute on function public.confirm_trade_donation_version_v2(
  uuid, uuid, uuid
) to authenticated;

comment on function public.confirm_trade_donation_version_v2(
  uuid, uuid, uuid
) is
  'Confirms an exact donation-backed agreement version only for the participant represented by the authenticated auth.uid(); anonymous and service-role calls are intentionally denied.';

notify pgrst, 'reload schema';
