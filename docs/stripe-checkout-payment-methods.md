# Stripe-hosted payment methods

## Status

Moral Trade delegates payment-method selection to Stripe-hosted Checkout. The application no longer sends a card-only `payment_method_types` allow-list for conditional payment authorization.

Stripe can therefore display the methods enabled in the Stripe Dashboard that are eligible for the customer, account country, currency, device, and Checkout mode. The intended set is:

- Card
- Apple Pay, surfaced as an eligible card wallet
- Google Pay, surfaced as an eligible card wallet
- Link
- PayPal, only where the Stripe account region and Connect configuration support it

The conditional authorization flow remains a Checkout Session in `setup` mode. It saves the selected reusable method without charging it. Authoritative payment state continues to come from signed Stripe webhooks, and later settlement remains subject to the existing condition hash, idempotency, refund, transfer, destination, and operational-readiness gates.

## Dashboard activation

1. Enable Cards and Link in Stripe payment-method settings.
2. Leave dynamic payment methods enabled so Stripe can choose eligible methods per session.
3. Test Apple Pay on an eligible Apple device and browser, and Google Pay on an eligible browser/device profile.
4. Request PayPal activation only for a Stripe account in a supported region. Connect marketplace use also requires Stripe approval.
5. Exercise SetupIntent success/failure, signed-webhook replay, off-session capture, refund, dispute, and Connect transfer paths in test mode before changing any live gate.

## Current live-money boundary

`CONDITIONAL_PAYMENTS_MODE` remains `disabled` by default, and the existing live acceptance gates remain fail-closed. This deployment does not claim that a Hong Kong Stripe account can offer PayPal through Stripe, does not enable live money, and does not alter the separate Every.org donation handoff.
