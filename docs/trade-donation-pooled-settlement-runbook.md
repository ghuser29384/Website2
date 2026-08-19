# Cross-user pooled settlement runbook

## Scope

This runbook covers sub-$10 donation-backed Moral Trade agreements that cannot use an individual Every.org Donate Link because the provider enforces a $10 checkout minimum.

The funds flow is materially different from the direct Every.org connector:

1. Each designated payer funds an exact settlement obligation through Stripe Checkout.
2. Moral Trade receives and temporarily controls the participant payment.
3. Compatible, fully funded obligations across different users freeze into one immutable bundle.
4. Moral Trade pays the aggregate to Every.org as the platform payer and presumptive provider-facing donor of record.
5. Every.org sends one partner webhook.
6. Moral Trade validates the aggregate and every component, posts a balanced ledger journal, creates privacy-safe evidence, and activates all component agreements atomically.

A participant payment is a payment to Moral Trade toward pooled settlement. It is **not represented as the participant's direct Every.org donation or as a tax-deductible charitable contribution**. Moral Trade absorbs payment-processing charges and does not reduce the frozen charitable allocation.

## Environment controls

```text
TRADE_DONATION_POOL_ENABLED=false
TRADE_DONATION_POOL_MODE=disabled
```

Permitted modes:

- `disabled`: no participant funding and no platform provider checkout.
- `test`: non-production deployment, Stripe test key, signed Stripe test webhook, and Every.org staging.
- `live`: canonical production only, Stripe live key, Every.org live, and every live gate passed.

Production infrastructure must initially deploy with the two disabled values above.

## Compatibility key

The automatic bundle key is:

```text
environment
+ Every.org recipient slug
+ normalized recipient EIN
+ currency
+ frequency
```

The payer is intentionally not part of the key. Different users may fund one bundle. Obligations are selected in verified-funding order. An obligation is indivisible: the minimal ordered prefix whose aggregate first reaches or exceeds $10 freezes together.

## Invariants

- An obligation references one donation term, agreement, immutable agreement version, payer, amount, recipient, currency, frequency, environment, and condition hash.
- Only a signed Stripe webhook may mark an obligation funded.
- Only fully funded, current, `awaiting_donation` components may freeze.
- Advisory locking serializes competing bundle attempts for one compatibility key.
- The manifest lists every component and allocation and has a SHA-256 hash.
- Provider metadata contains only the bundle ID, manifest hash, partner donation ID, schema, and HMAC. It does not expose participant identities or agreement details.
- The Every.org webhook must match amount, currency, frequency, recipient slug/EIN, partner donation ID, signed metadata, unique charge, current bundle state, and every component.
- A mismatch activates zero agreements.
- A valid bundle posts one balanced settlement journal and activates every component in the same database transaction.
- Browser returns and screenshots never prove Stripe funding or Every.org settlement.

## Double-entry ledger

Posted journals are immutable and checked at transaction commit for equal debits and credits.

### Participant funding

```text
Debit   platform_cash_asset
Credit  participant_settlement_liability
```

### Pre-bundle refund

```text
Debit   participant_settlement_liability
Credit  platform_cash_asset
```

### Consolidated Every.org settlement

One liability debit per component, plus one aggregate cash credit:

```text
Debit   participant_settlement_liability  (each obligation)
Credit  platform_cash_asset               (bundle total)
```

### Chargeback after provider settlement

The charitable gift is not reversed. Moral Trade recognizes the shortfall:

```text
Debit   chargeback_loss_expense
Credit  platform_cash_asset
```

## Participant operations

### Before funding

Either participant may cancel the agreement under its frozen exit terms.

### Stripe checkout opened but not funded

- A browser return is not proof.
- An expired Checkout Session becomes `checkout_abandoned`.
- A failed payment becomes `payment_failed`.
- The designated payer may retry.

### Funded but not bundled

- The payer may request a full refund.
- The obligation becomes `refund_pending` until a signed Stripe refund webhook arrives.
- No partial self-service refund is allowed.

### Bundle frozen

- The manifest is immutable.
- Participant cancellation and self-service refund are disabled.
- A component version or lifecycle change moves the bundle to `needs_review`.

### Bundle completed

- The provider gift cannot automatically be pulled back.
- A later refund or dispute creates an operator-review and reserve event.
- The component agreement remains a factual record of the verified provider allocation; operators must not silently delete or rewrite it.

## Operator provider checkout

Route: `/admin/trade-donation-pools`

Requirements:

- allow-listed admin email;
- active authenticator MFA session;
- correct mode and provider environment;
- current bundle state `frozen`;
- exact internal component validation;
- test or live readiness gates as applicable.

Before payment, compare the Every.org checkout against the admin record:

- recipient slug/name;
- aggregate amount;
- USD currency;
- one-time frequency;
- environment.

Do not edit the provider amount or recipient. If they differ, exit without paying and disable the pooled feature.

## Reconciliation

For each bundle, reconcile:

1. Sum of component allocations equals bundle amount.
2. Sum of participant funding journals equals component allocations.
3. One provider charge hash exists only after exact webhook completion.
4. One settlement journal exists and balances.
5. Every component obligation is `settled`.
6. Every component agreement is `active` or a later valid lifecycle state.
7. Every agreement has exactly one privacy-safe pooled provider evidence record.
8. No raw Stripe/Every.org payload or payment credential appears in public evidence.

## Incident response

Immediately set:

```text
TRADE_DONATION_POOL_ENABLED=false
TRADE_DONATION_POOL_MODE=disabled
```

and redeploy if any of the following occurs:

- provider amount or recipient mismatch;
- altered or invalid metadata;
- duplicate charge allocated across bundles;
- unbalanced ledger journal;
- component version/lifecycle drift;
- bundle item total mismatch;
- unexpected live-mode route on a preview;
- unsigned Stripe event accepted;
- participant PII exposed in provider metadata or public evidence;
- unexplained cash/ledger/reconciliation difference.

Do not retry provider payment while a first payment may be awaiting its webhook. Mark the bundle `needs_review`, preserve all records, and reconcile against Stripe, Every.org, and the internal ledger.

## QA scenario matrix

The release is not eligible for fail-closed production infrastructure until all of these pass on the exact commit and QA migration:

1. Four users fund $2.50 each.
2. Four obligations become one $10 bundle.
3. Manifest and ledger allocations total exactly $10.
4. One participant payment fails.
5. One Checkout Session expires without payment.
6. Full refund succeeds before bundle freeze.
7. Cancellation/refund is blocked after bundle freeze.
8. Agreement-version change after funding prevents bundling/settlement.
9. Stale Every.org checkout cannot activate a new version.
10. Duplicate Stripe webhook is idempotent.
11. Duplicate Every.org webhook is idempotent.
12. Incorrect provider amount activates zero agreements.
13. Incorrect recipient activates zero agreements.
14. Altered metadata activates zero agreements.
15. One invalid component sends the whole bundle to review.
16. Simultaneous bundle attempts produce one manifest.
17. Chargeback after consolidated donation creates reserve loss/review and does not erase the gift.
18. Exact provider completion activates all components atomically.
19. Any mismatch activates zero components.

Record the run, commit SHA, environment, IDs, timestamps, expected result, actual result, and evidence for every case.

## Live gates

Before `TRADE_DONATION_POOL_MODE=live`:

- written Every.org approval for consolidated platform-paid gifts;
- Stripe live account and product review;
- signed live Stripe webhook evidence;
- approved participant custody, donor-of-record, non-tax-deductibility, fee, refund, abandonment, dispute, and chargeback terms;
- approved platform funding account and reserve;
- named operators and monitoring ownership;
- approved reconciliation and incident runbook;
- controlled live launch authorization.

No code deployment, test pass, or provider API capability may be treated as satisfying these institutional approvals.
