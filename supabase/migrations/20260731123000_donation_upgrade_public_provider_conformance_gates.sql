-- Replace external written-approval gates with evidence-based technical readiness gates.
--
-- Moral Trade does not require a provider-specific approval letter before shipping the
-- integration. Live activation still fails closed until the exact Every.org flow and
-- Stripe account are technically verified, participant disclosures are versioned,
-- reserves and operator procedures are configured, and the controlled launch gate passes.

insert into public.trade_donation_pool_gate_status(
  environment,
  gate_key,
  status,
  notes
)
values
  (
    'live',
    'every_org_live_flow_verified',
    'blocked',
    'Pass after the exact live Every.org Donate Link and partner-webhook flow verifies recipient identity, amount, currency, one-time frequency, partner donation ID, signed metadata, webhook replay behavior, and provider settlement state. No external approval letter is required.'
  ),
  (
    'live',
    'stripe_live_account_ready',
    'blocked',
    'Pass after the canonical live Stripe account is reachable and reports details submitted, charges enabled, payouts enabled, and no currently due or past-due requirements. No separate product-review letter is required.'
  )
on conflict (environment, gate_key) do update
set
  notes = excluded.notes,
  updated_at = timezone('utc', now());

delete from public.trade_donation_pool_gate_status
where environment = 'live'
  and gate_key in (
    'every_org_written_approval',
    'stripe_account_and_product_review'
  );

insert into public.trade_donation_pool_audit_events(
  actor_profile_id,
  actor_kind,
  event_type,
  object_type,
  object_id,
  details
)
values (
  null,
  'system',
  'live_gate_policy_updated',
  'gate',
  null,
  jsonb_build_object(
    'policyVersion', 'donation-upgrade-live-readiness-v2',
    'retiredGateKeys', jsonb_build_array(
      'every_org_written_approval',
      'stripe_account_and_product_review'
    ),
    'requiredReplacementGateKeys', jsonb_build_array(
      'every_org_live_flow_verified',
      'stripe_live_account_ready'
    ),
    'externalWrittenConfirmationRequired', false
  )
);
