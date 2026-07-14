# Conditional payment operations and incident runbook

Checked: 2026-07-14 UTC

This document governs Moral Trade's donation-offset conditional-payment rail. It does not authorize live money by itself. Stripe payment records are not legal escrow, and the two independent participant charges are not database-atomic. The implemented guarantee is compensated settlement: either every required charge and recipient transfer completes, or every successful transfer is reversed and every captured participant charge is refunded.

## 1. Operating modes

### Disabled

Use `CONDITIONAL_PAYMENTS_MODE=disabled` to block mandate creation and settlement. This is the emergency stop and the default when no valid Stripe key is present.

### Test

A Stripe `sk_test_` key enables clearly labelled sandbox mode when no explicit mode is set. Test mode may use only destinations with:

- `livemode = false`;
- `test_only = true`;
- an active Stripe test connected account;
- an explicit simulated destination label.

No test-mode record may be represented as a donation, tax receipt, payout, or live recipient relationship.

### Live

Live mode requires all live gate rows to be `passed`, an `sk_live_` key, signed live webhooks, an approved live destination, and an enabled Stripe platform account. Never infer live mode from any other configuration.

## 2. Required runtime configuration

Configure these values in one canonical Vercel project and environment. Do not commit their values.

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PLATFORM_ACCOUNT_ID
```

`CONDITIONAL_PAYMENTS_MODE=test` is optional when the secret key is a Stripe test key, but setting it explicitly is preferable for operational clarity. `STRIPE_PLATFORM_ACCOUNT_ID` is non-secret; the application currently has the Moral Trade sandbox account as a fallback.

After any environment-variable change, redeploy and read:

```text
GET /api/payments/conditional/readiness
```

Do not proceed unless the response confirms the intended mode, Stripe account reachability, database reachability, an active destination, and no blockers relevant to the action.

## 3. Test destination and fixture

Current simulated destination:

```text
Destination ID: e8191dee-7867-48cb-b482-2afa81f6762d
Label: TEST ONLY — simulated GiveWell settlement destination
Stripe test connected account: acct_1TLqWzAf75lOqfIk
Livemode: false
Test only: true
```

Prepared fixture:

```text
Offer ID: 7b84b135-1db6-4f32-9c13-5dc2be47c000
Match ID: 7b84b135-1db6-4f32-9c13-5dc2be47c001
Owner profile: 9e51db47-92d1-4d75-80ce-cf10de1121f1
Counterparty profile: f73b3920-15ba-451f-a2ae-d0febd8915a0
Owner amount: $1.00 test mode
Counterparty amount: $1.00 test mode
Compromise total: $2.00 test mode
```

The fixture must remain dormant while runtime configuration is incomplete:

```text
offers.status = paused
donation_offset_matches.status = cancelled
```

Reactivate it only immediately before a supervised test:

```sql
begin;

update public.offers
set status = 'matched', updated_at = timezone('utc', now())
where id = '7b84b135-1db6-4f32-9c13-5dc2be47c000'::uuid
  and status = 'paused';

update public.donation_offset_matches
set status = 'matched', updated_at = timezone('utc', now())
where id = '7b84b135-1db6-4f32-9c13-5dc2be47c001'::uuid
  and status = 'cancelled';

commit;
```

If the test cannot begin immediately, return both rows to their dormant states. Public totals count only completed matches, but dormancy also protects older deployments whose metric logic may predate that rule.

## 4. Signed webhook configuration

The Stripe endpoint must point to:

```text
POST /api/stripe/webhook
```

Subscribe at minimum to:

```text
checkout.session.completed
setup_intent.succeeded
setup_intent.setup_failed
payment_intent.succeeded
payment_intent.payment_failed
payment_intent.processing
payment_intent.requires_action
charge.refunded
refund.created
refund.updated
refund.failed
charge.dispute.created
charge.dispute.updated
charge.dispute.closed
transfer.created
transfer.updated
transfer.reversed
transfer.failed
account.updated
```

The route requires the raw request body, `Stripe-Signature`, and `STRIPE_WEBHOOK_SECRET`. It records each Stripe event ID and payload hash. A repeated event ID with different signed content is an incident and must fail closed.

After processing one genuine signed test event, verify:

- `conditional_payment_webhook_events.signature_verified = true`;
- the event status is `processed` or intentionally `ignored`;
- the test `webhook_signature` gate is `passed`;
- replaying the identical event does not duplicate financial state.

Never mark the webhook gate passed manually as a substitute for a signed event.

## 5. Participant authorization test

1. Sign in as the owner profile.
2. Open `/donation-offsets/payments`.
3. Confirm the exact $1.00 test amount, counterparty, destination, condition-hash prefix, and TEST MODE notice.
4. Start hosted setup and complete the Stripe test SetupIntent.
5. Confirm one ready owner mandate exists with Stripe customer, SetupIntent, and PaymentMethod IDs.
6. Repeat as the counterparty profile.
7. Confirm both mandates have:
   - the same condition hash;
   - distinct profile IDs and roles;
   - the exact role-specific amount;
   - `livemode = false`;
   - `status = ready`;
   - current consent terms and timestamps.

Do not insert ready mandates by SQL for acceptance testing. The hosted SetupIntent and signed webhook are part of the evidence.

## 6. Successful paired settlement test

Once both mandates are ready, the webhook path or the MFA-gated operator route may call settlement.

Expected sequence:

1. Claim one settlement batch with a processing token.
2. Charge the owner off-session using an idempotent PaymentIntent.
3. Re-read and re-hash the complete donation-offset condition.
4. Charge the counterparty off-session.
5. Re-read and re-hash again before transfer.
6. Create one source-linked Connect transfer for each successful charge.
7. Transactionally finalize:
   - batch `transferred`;
   - match `completed`;
   - offer `closed`.
8. Record payment-attempt, transfer, webhook, and audit rows.

Acceptance evidence must include the two PaymentIntent IDs, two charge IDs, two transfer IDs, the batch ID, the common condition hash, and final database states. All objects must be test-mode objects.

## 7. Required failure tests

Use fresh mandates or fresh fixture generations for each test. Never reuse a compensated charge as evidence for a new settlement.

### Second participant charge fails

Induce a Stripe test decline or required-authentication state on the counterparty payment method.

Expected result:

- owner charge is refunded;
- any owner transfer is absent or reversed;
- owner mandate becomes `refunded`;
- counterparty mandate becomes `failed` or `requires_action`;
- batch becomes `refunded` or remains in an explicit operator-attention compensation state;
- match is not completed and offer is not closed.

### Destination transfer fails

Use an isolated test destination state that produces transfer failure. Do not alter the approved production recipient mapping.

Expected result:

- any successful transfer is reversed;
- both participant charges are refunded;
- batch records `destination_transfer_failed` and compensation outcome;
- match is not completed and offer is not closed.

### Condition changes during settlement

Change a material term after the first test charge but before the second charge or transfer.

Expected result:

- the condition hash changes;
- settlement stops;
- successful charge is refunded;
- no stale mandate is reused.

### Webhook replay

Deliver the exact signed event twice.

Expected result:

- one webhook ledger row;
- no duplicate mandate, charge attempt, refund, transfer, or finalization;
- a duplicate event with a different payload hash is rejected and escalated.

## 8. Reconciliation checks

Run these checks after each test or incident.

```sql
select *
from public.conditional_settlement_batches
order by created_at desc
limit 20;

select *
from public.conditional_payment_attempts
order by created_at desc
limit 50;

select *
from public.conditional_settlement_transfers
order by created_at desc
limit 50;

select stripe_event_id, event_type, signature_verified, status, error_message,
       received_at, processed_at
from public.conditional_payment_webhook_events
order by received_at desc
limit 100;

select event_type, object_type, object_id, actor_kind, details, created_at
from public.conditional_payment_audit_events
order by created_at desc
limit 100;
```

Investigate any of these conditions immediately:

- a succeeded charge without a succeeded or pending compensating refund after batch failure;
- a transferred row without a final transferred batch;
- a failed transfer without a reversal/refund sequence;
- a completed match without a transferred batch;
- a transferred batch whose offer is not closed;
- a processed webhook with `signature_verified = false`;
- a stale processing token older than ten minutes;
- a duplicate Stripe event ID with a different payload hash.

## 9. Incident response

### Immediate containment

1. Set `CONDITIONAL_PAYMENTS_MODE=disabled`.
2. Redeploy the affected environment.
3. Do not delete Stripe or database records.
4. Freeze operator retries for the affected subject IDs.
5. Record the incident start time, affected batch IDs, Stripe object IDs, and current database states.

### Participant-loss prevention

1. Reverse any transfer that should not remain with the destination.
2. Refund every participant charge that is not part of a completely finalized settlement.
3. Use stable idempotency keys and verify provider responses before retrying.
4. Do not mark a refund complete until Stripe reports the corresponding status.
5. Notify affected participants with factual status only; do not claim escrow or instantaneous bank settlement.

### Reconciliation and recovery

1. Compare Stripe PaymentIntents, charges, refunds, transfers, reversals, and disputes against local ledgers.
2. Re-run signed webhook delivery for missing provider events.
3. Correct local state only through an auditable migration or reconciliation action.
4. Require fresh participant authorization if terms changed or a prior attempt was fully compensated.
5. Re-enable test mode only after the incident root cause and replay behavior are verified.

## 10. Live gate review

Keep each live gate blocked until the named evidence exists.

### `stripe_account_ready`

Requires the platform account to have completed business details, accepted Stripe terms, and enabled charges and payouts. Only the account owner can supply or accept those facts.

### `webhook_signature`

Requires a configured live endpoint and at least one successfully processed signed live test/health event without mutating participant money.

### `terms_approved`

Requires legal/operational approval of:

- exact maximum charge and condition disclosure;
- off-session authorization language;
- revocation boundary;
- compensated-settlement limitation;
- no-escrow, tax, effectiveness, or legal-enforceability claims;
- treatment of authentication-required and expired mandates.

### `refund_policy_approved`

Requires approval of automatic compensation triggers, refund timing disclosures, partial-provider-failure handling, participant communications, and accounting treatment.

### `destination_approved`

Requires verified recipient identity, live connected account ownership, transfer capability, permitted use, jurisdictional review, and a destination agreement. A test account or a charity website URL is insufficient.

### `operator_runbook_approved`

Requires named operators, MFA, monitoring, retry authority, dispute handling, incident contacts, response-time targets, and periodic reconciliation ownership.

Gate rows may move from `blocked` to `pending` when documentary evidence is assembled. Move to `passed` only after the accountable reviewer records approval and date.

## 11. Disable and rollback

Code rollback does not erase provider obligations. Before reverting application code:

1. Disable new mandates and settlement.
2. Reconcile all non-final batches.
3. Complete required refunds or transfer reversals.
4. Preserve webhook and audit tables.
5. Keep the webhook endpoint available until all expected Stripe events have been processed.
6. Remove or block destinations only after no batch still references them.

Database migrations are additive. Do not drop payment tables as an emergency response; doing so would destroy reconciliation evidence.
