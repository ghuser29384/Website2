# Donation Upgrade live release sequence

This sequence is fail-closed. It separates infrastructure preparation, technical readiness, mandate creation, and money movement so that no passing test or deployment can silently authorize a charge.

**No external written confirmation from Every.org or Stripe is required.** Provider readiness is established from supported public integration behavior, exact account state, signed webhooks, recipient identity, and controlled end-to-end evidence.

## Phase 0 — Provider and account preparation

1. Connect the canonical live Moral Trade Stripe account rather than a sandbox.
2. Complete Stripe-hosted business onboarding, identity verification, payout setup, and Terms acceptance.
3. Require `details_submitted=true`, `charges_enabled=true`, `payouts_enabled=true`, and no currently due or past-due requirements.
4. Configure the Every.org public API key, live Donate Link environment, Partner Webhook token, path secret, and metadata secret.
5. Name and verify the local fallback charity and reverify GiveWell Top Charities Fund against exact Every.org identifiers.
6. Complete the readiness and operator records.

## Phase 1 — Production schema, still disabled

1. Verify the release branch is based on exact current `main` and all required checks pass.
2. Apply production migrations:
   - `20260725152000_cross_user_pooled_trade_donations`
   - `20260731084000_donation_upgrade_destination_review_and_gate_evidence`
   - `20260731123000_donation_upgrade_public_provider_conformance_gates`
3. Read back migration versions, RLS state, function grants, active gate keys, and zero pooled-settlement residue.
4. Run Supabase security and performance advisors.
5. Leave all money modes disabled.

## Phase 2 — Deploy exact code, still disabled

1. Merge the reviewed release with the expected head SHA.
2. Deploy the exact merge commit to canonical `moraltrade-site` production.
3. Confirm runtime points to production Supabase.
4. Confirm these values remain disabled:
   - `CONDITIONAL_PAYMENTS_MODE=disabled`
   - `TRADE_DONATION_POOL_MODE=disabled`
   - `TRADE_DONATION_POOL_ENABLED=false`
5. Smoke-test public, authenticated, admin, Stripe-webhook, and Every.org-webhook routes without creating financial objects.
6. Inspect runtime errors and application-origin 5xx responses.

## Phase 3 — Live provider configuration, still disabled

1. Install the canonical live Stripe secret key only in Vercel production.
2. Set the exact live `STRIPE_PLATFORM_ACCOUNT_ID`.
3. Create one canonical live Stripe webhook endpoint for `/api/stripe/webhook`.
4. Install its signing secret only in Vercel production.
5. Redeploy and verify account ID and requirements through the Stripe API.
6. Verify Every.org live environment and production webhook/metadata secrets.
7. Resolve and approve the local fallback and GiveWell identities through the destination-review workflow.
8. Keep mandate and pooled-settlement modes disabled.

## Phase 4 — Evidence-bound readiness gates

1. Verify `every_org_live_flow_verified` from the exact supported Donate Link and Partner Webhook behavior. No approval letter is required.
2. Verify `stripe_live_account_ready` from the exact Stripe account API state. No product-review letter is required.
3. Process a signed live Stripe event through the exact production handler.
4. Verify account, environment, metadata, signature, event identity, and deployment commit.
5. Replay the event and prove idempotence.
6. Submit an altered event and prove fail-closed behavior.
7. Record each internal disclosure, reserve, operator, and controlled-launch decision with named ownership and immutable evidence.
8. Pass each database gate separately; pass `controlled_launch_approved` last.

## Phase 5 — Mandate creation only

1. Set `CONDITIONAL_PAYMENTS_MODE=live` while pooled settlement remains disabled unless the exact authorization surface requires both modes.
2. Deploy the environment-only change.
3. Create one Stripe-hosted Checkout Session in setup mode for the explicitly named donor.
4. The donor personally accepts the versioned terms and enters the payment method on Stripe.
5. Verify the signed `setup_intent.succeeded` webhook and exact customer/mandate binding.
6. Confirm that no PaymentIntent, charge, transfer, donation, or provider settlement was created.
7. Run authenticated desktop and mobile rendered smoke tests for the exact $10 local-charity → $20 GiveWell scenario, stopping before any charge.

## Phase 6 — Controlled money movement

This phase requires a separate explicit instruction naming the amount, payer, destination, and permitted maximum loss.

1. Reverify every gate immediately before the test.
2. Enable pooled settlement only inside the configured launch limits:
   - `TRADE_DONATION_POOL_MODE=live`
   - `TRADE_DONATION_POOL_ENABLED=true`
3. Create only the explicitly authorized obligations.
4. Verify signed Stripe funding events and ledger balance.
5. Freeze one immutable provider manifest.
6. Require MFA-protected operator confirmation before Every.org checkout.
7. Verify the exact Every.org webhook before activating any component agreement.
8. Reconcile cash, liability, provider gift, evidence, and agreement state.
9. Disable live modes immediately after the controlled test unless the launch record permits continued operation.
10. Publish the evidence-backed go/no-go record and preserve every incident.

## Mandatory abort conditions

Abort and disable all money modes on any account mismatch, unsigned event, missing readiness evidence, recipient drift, amount drift, version drift, duplicate allocation, ledger imbalance, unexplained cash difference, provider replay anomaly, post-freeze participant reversal, production/preview environment mismatch, or operator uncertainty.
