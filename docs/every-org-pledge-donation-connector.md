# Every.org pledge-donation connector

This connector implements the donation-first sequence for pledge swaps:

1. Both participants confirm one immutable agreement version.
2. The named payer opens an Every.org Donate Link with the recipient, amount, one-time frequency, partner donation ID, return URLs, and signed partner metadata fixed by Moral Trade.
3. The reciprocal action remains inactive.
4. Every.org sends the configured Partner Webhook after a completed donation.
5. Moral Trade validates the exact frozen terms, records privacy-safe provider evidence, and atomically activates the reciprocal action.

A browser return to Moral Trade is never treated as payment proof. Screenshots do not activate the agreement.

## Trust and custody boundary

- Every.org, not Moral Trade, receives the charitable payment.
- Moral Trade does not persist donor name, email, card data, or the full webhook payload.
- The local record retains hashes, recipient identifiers, amount/currency/frequency, donation date, payment-method label, and the immutable agreement references.
- A source label such as “GiveWell research” or “Forethought research” is provenance only. Do not claim endorsement, verification, or partnership without written authorization.
- A completed charitable gift is not escrow. Later nonperformance can be recorded, but Moral Trade cannot reverse the gift through this connector.
- The provider donation activates the reciprocal action but does not count as evidence that the reciprocal action was performed. Final completion requires separately accepted performance evidence.

## Environment variables

```bash
EVERY_ORG_PLEDGE_DONATIONS_ENABLED=true
EVERY_ORG_ENVIRONMENT=staging # live is accepted only on the canonical production deployment
EVERY_ORG_WEBHOOK_TOKEN=<token from the Every.org developer dashboard>
EVERY_ORG_WEBHOOK_PATH_SECRET=<at least 32 random characters>
EVERY_ORG_PARTNER_METADATA_SECRET=<at least 32 random characters>
```

Generate independent secrets. Do not reuse the Supabase service-role key, Stripe webhook secret, or session secrets. Staging is rejected on the canonical production deployment, and live mode is rejected on previews or local hosts.

## Every.org dashboard setup

Register this Partner Webhook URL in the matching Every.org environment:

```text
https://<moral-trade-host>/api/connectors/every-org/<EVERY_ORG_WEBHOOK_PATH_SECRET>
```

The Donate Link includes `EVERY_ORG_WEBHOOK_TOKEN`, causing completed donations from that link to notify the registered partner webhook. The webhook URL secret authenticates the sender at the HTTP boundary; the random partner donation ID, HMAC-signed partner metadata, exact frozen-field checks, and unique charge hash provide additional fail-closed validation.

## Staging verification

1. Apply `20260722180000_every_org_pledge_donations.sql`.
2. Create and confirm a two-party pledge swap.
3. Attach a `$10.00` Against Malaria Foundation donation with the counterparty as payer.
4. Confirm the new version as both participants.
5. Verify the agreement is `awaiting_donation` and the reciprocal action is explicitly inactive.
6. Complete Every.org staging checkout using its documented test credentials.
7. Verify one `trade_donation_intents` row becomes `completed`, one `provider_donation` evidence row becomes `accepted`, and the agreement becomes `active` only after the webhook.
8. Replay the webhook. It must be idempotent.
9. Change the amount, slug, EIN, frequency, partner ID, or signed metadata in a test payload. The intent must become `needs_review`, and the agreement must remain inactive.
10. Confirm no donor PII or raw webhook body is stored or logged.
11. Verify that final completion remains unavailable until a non-provider evidence item for the reciprocal action is accepted.
12. After checkout has started, verify that self-service cancellation remains disabled so a delayed webhook cannot strand a completed donor gift.

## Live launch gate

Keep `EVERY_ORG_PLEDGE_DONATIONS_ENABLED=false` in production until all of the following are complete:

- Every.org partner account and live webhook are approved and configured.
- Staging tests, replay tests, mismatch tests, and cancellation-race tests pass.
- The public connector registry accurately describes the relationship and does not imply endorsement.
- Support has an operating procedure for `needs_review`, completed-after-cancellation, and donor questions.
- A controlled live donation confirms that the intended nonprofit receives the gift and the Moral Trade evidence record activates exactly once.
