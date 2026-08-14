-- Reject signed Stripe failure events whose test/live mode does not match the frozen obligation.
-- Success and refund/dispute paths already enforce this boundary. Failure events must not be
-- allowed to move an obligation in the opposite environment to payment_failed or abandoned.

create or replace function public.record_trade_donation_pool_stripe_failure(
  p_stripe_event_id text,
  p_event_type text,
  p_livemode boolean,
  p_payload_hash text,
  p_signature_verified boolean,
  p_obligation_id uuid,
  p_failure_code text,
  p_failure_message text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  obligation_row public.trade_donation_pool_obligations%rowtype;
  next_status text;
  inserted_count integer := 0;
begin
  insert into public.trade_donation_pool_stripe_events(
    stripe_event_id, event_type, livemode, payload_hash, signature_verified,
    obligation_id, status, details, processed_at
  ) values (
    p_stripe_event_id, p_event_type, p_livemode, p_payload_hash, p_signature_verified,
    p_obligation_id, 'processed', jsonb_build_object('failureCode', p_failure_code), timezone('utc', now())
  )
  on conflict (stripe_event_id) do nothing;
  get diagnostics inserted_count = row_count;

  if inserted_count = 0 then
    return jsonb_build_object('status', 'duplicate');
  end if;
  if not p_signature_verified then
    update public.trade_donation_pool_stripe_events
    set status = 'mismatch',
        details = jsonb_build_object('failureCode', 'signature_not_verified')
    where stripe_event_id = p_stripe_event_id;
    return jsonb_build_object('status', 'mismatch');
  end if;

  select * into obligation_row
  from public.trade_donation_pool_obligations
  where id = p_obligation_id
  for update;
  if not found then
    update public.trade_donation_pool_stripe_events
    set status = 'ignored',
        details = jsonb_build_object('failureCode', 'obligation_not_found')
    where stripe_event_id = p_stripe_event_id;
    return jsonb_build_object('status', 'ignored');
  end if;

  if obligation_row.stripe_livemode <> p_livemode then
    update public.trade_donation_pool_stripe_events
    set status = 'mismatch',
        details = jsonb_build_object('failureCode', 'stripe_failure_environment_mismatch')
    where stripe_event_id = p_stripe_event_id;
    return jsonb_build_object('status', 'mismatch');
  end if;

  if obligation_row.status not in (
    'checkout_started',
    'awaiting_funding',
    'payment_failed',
    'checkout_abandoned'
  ) then
    update public.trade_donation_pool_stripe_events
    set status = 'ignored',
        details = jsonb_build_object('failureCode', 'obligation_state_not_failure_mutable')
    where stripe_event_id = p_stripe_event_id;
    return jsonb_build_object('status', 'ignored');
  end if;

  next_status := case
    when p_failure_code = 'checkout_abandoned' then 'checkout_abandoned'
    else 'payment_failed'
  end;
  update public.trade_donation_pool_obligations
  set
    status = next_status,
    failure_code = left(coalesce(p_failure_code, 'stripe_payment_failed'), 120),
    failure_message = left(coalesce(p_failure_message, 'Stripe did not fund the pooled obligation.'), 500)
  where id = obligation_row.id;

  return jsonb_build_object('status', next_status);
end;
$$;

revoke all on function public.record_trade_donation_pool_stripe_failure(
  text, text, boolean, text, boolean, uuid, text, text
) from public, anon, authenticated;
grant execute on function public.record_trade_donation_pool_stripe_failure(
  text, text, boolean, text, boolean, uuid, text, text
) to service_role;
