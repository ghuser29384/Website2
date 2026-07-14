# Conditional payment activation status

Checked: 2026-07-14 UTC

## Implemented and verified

- Conditional card mandates are bound to an immutable donation-offset condition hash.
- Stripe Checkout setup-mode authorization, off-session capture, separate Connect transfers, compensating refunds, transfer reversals, webhook replay controls, and MFA-gated operator recovery are implemented.
- The Stripe platform account identifier is resolved through `STRIPE_PLATFORM_ACCOUNT_ID`, with the current Moral Trade sandbox account as a non-secret fallback.
- A Stripe test key safely infers test mode when no explicit conditional-payment mode is set. Explicit `disabled` still wins; live mode still requires a live key.
- The conditional-payment migrations, transfer-retry repair, and atomic finalization function are applied to the connected Supabase project.
- Rollback-only database tests verify both successful settlement finalization and failure atomicity.
- A test-only destination is mapped to the active Stripe test connected account. It is explicitly labelled simulated and cannot be used in live mode.
- Two existing test participants and a reviewed $1 + $1 donation-offset fixture exist. The fixture is dormant (`offer=paused`, `match=cancelled`) so older production metrics cannot count it before the sandbox runtime is ready.
- Targeted conditional-payment tests and the production application build pass in GitHub Actions.
- Both Vercel preview projects build successfully.

## External runtime blocker

The connected Vercel Preview environments do not currently provide:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

A protected-preview readiness probe therefore reports conditional payments disabled and no database or Stripe runtime connectivity. GitHub Actions also has no copies of those secrets, so it cannot substitute as the end-to-end payment runner.

Until those values are configured in one canonical Vercel Preview project, the following evidence cannot be produced honestly:

- a processed signed Stripe test webhook;
- two participant SetupIntents and ready mandates;
- successful paired test capture and Connect transfer;
- forced second-charge failure and compensating refund;
- forced transfer failure and reversal/refund recovery;
- signed webhook replay exercise.

## Live-mode boundary

Live mode remains blocked. It requires the Stripe account owner to complete business details and accept Stripe terms, platform charges and payouts to be enabled, a verified live recipient, approved mandate/refund/dispute terms, and an approved operator incident runbook. No live key or live destination is inferred from test configuration.
