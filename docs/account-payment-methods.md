# Account payment methods and receiving

## Scope

`/dashboard/payments` is an authenticated setup and management surface, separate
from the legacy Dashboard sections. Dashboard controls and the account drawer
link directly to it. Payment methods and payout methods are distinct sections.

Adding a method uses Stripe-hosted Checkout in `setup` mode. Explicit consent is
required before session creation. The consent version and request ID are recorded
in Stripe metadata; `allow_redisplay=always` is sent only after that consent.
There are no amounts, charge creation, transfers or subscriptions in the setup
service. Checkout creates the SetupIntent and attaches the method to the dedicated
account customer. Displayed success requires a server-side read of the matching
session, succeeded SetupIntent, and still-attached method; a return URL is not proof.

The account-level customer is deliberately separate from conditional payment
mandates. Its saved methods can be shown by the existing **on-session agreement
checkout**, after that checkout's unchanged authorization checks. Removing an
account-level method does not revoke a separate existing trade mandate. A
conditional trade may require another method setup/authorization on its own terms.
No change to conditional settlement readiness, capture, refunds, fees or releases
is included.

Receiving uses the existing platform's Stripe Connect responsibilities and
capabilities, with Stripe-hosted onboarding and Express Dashboard login links.
Users choose their country; Stripe's country specifications are not a guarantee
that this platform can onboard every listed country. Stripe enforces eligibility.
Provider identity, account metadata, and mode are verified before access; browser
form data never chooses a customer, profile or connected-account owner. Returned
bank/card data is reduced to masked labels and currency. Readiness comes from
Stripe capabilities and flags, not a successful navigation. An authenticated
Refresh receiving status POST copies those verified flags into the existing
agreement-routing account record; page rendering itself never writes readiness.

## Storage and authorization

Apply `20260928182211_account_payment_settings.sql` once per database. The full
schema and TypeScript database declarations include the same objects.

`account_payment_settings` is service-owned, keyed by authenticated profile,
Stripe platform and mode. Its provider IDs are not browser-writable. RLS is enabled
and all browser-role privileges are revoked. No full card/bank details are stored.
Persistent creation keys and first-attempt timestamps stop unsafe customer/account
re-creation after the provider idempotency window; those ambiguous failures require
operator reconciliation rather than guessing. Mapping writes compare against null
and verify the resulting ID. Existing live payout mappings are imported only after
provider ownership verification, never into a sandbox.

`take_account_payment_setup_slot` is a service-only database function that limits
setup mutations across instances to ten per minute per authenticated profile.
Failure to read storage or obtain a slot blocks the action, not its safeguards.
Next.js Server Actions provide the same-origin POST boundary. All actions resolve
identity using `requireViewer` and never accept owner IDs from the form.

## Environment and release boundary

Use the existing STRIPE_SECRET_KEY and SUPABASE_SERVICE_ROLE_KEY. Live Stripe
credentials are rejected outside Vercel production; test credentials are rejected
in production. The provider's actual platform and balance mode are checked. An
explicit STRIPE_PLATFORM_ACCOUNT_ID, when configured, must match that provider.
Return destinations derive only from the configured site origin; hosted links
must be HTTPS URLs on the enumerated Stripe hosts.

The change must not be called production-ready based on fixture tests. Before
release, validate in a Stripe sandbox: real hosted method setup, cancellation,
failed/required-action confirmation, ownership failures, removal, Connect setup,
resumption, external account management and provider approval transitions. Use
only test accounts/details. Verify database grants and the exact migration; inspect
protected preview behavior and logs. Then use the unchanged gated Vercel release,
verify the exact merged SHA and both canonical aliases, and exercise the genuine
signed-in account flow. Do not enable a payment/capture gate as part of this release.

## Local and CI checks

- `node --import tsx --test src/lib/payments/account-payment-service.test.ts`
- `npm test`, `npm run lint -- --quiet`, `npx tsc --noEmit`, `npm run build`
- `npm run test:e2e:release`
- The optional `tests/account-payment-settings.spec.ts` uses loopback Auth,
  PostgREST and Stripe HTTP fixtures, with a test-process-only Node preload under
  `tests/fixtures`. It is not a genuine Stripe confirmation or hosted preview test.
  The preload rejects any non-fixture credential and is never imported by the app.

Stripe references:
- https://docs.stripe.com/payments/save-and-reuse
- https://docs.stripe.com/api/checkout/sessions/create
- https://docs.stripe.com/connect/hosted-onboarding
- https://docs.stripe.com/api/accounts/login_link/create
