# MPGF Payment Production Readiness

Status: framework published. Production real money remains blocked until payment and legal gates pass.

## Interim Non-Custodial Path

- Every.org donate links include round, campaign, and partner donation metadata.
- Redirect-back pages show pending state only.
- Every.org partner webhook ingestion is the authority for structured completion data.
- Webhook imports are deduped by hashed charge or partner donation identifiers and mapped to round, campaign, conditional pledge, and pledge intent where available.
- Webhook data may auto-create reviewable contribution evidence, but it never authorizes final payout by itself.

## Conditional Commitment Path

- Stripe SetupIntent is the default way to save a payment method with future-use consent.
- PaymentIntent only after threshold, verified supporter, review, challenge-window, and parameter-lock gates pass.
- Long-lived manual card holds are not the default round mechanism.
- Raw card data is never stored by Moral Trade.

## Webhook and Ledger Controls

- Stripe-Signature verification is required before Stripe webhook events can update payment state.
- Idempotency is required for setup intent, payment intent, and provider event processing.
- Provider identifiers are stored as hashes where possible.
- Manual proof fallback remains available for bank transfer, fiscal-host payment, or provider outage cases, with manual external evidence pending review before counting.
