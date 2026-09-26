# Failure Bonus Reserve and Success Premium

## Decision

Moral Trade uses a common Failure Bonus Reserve for refund-bonus pools:

1. Maximum eligible failure-bonus exposure must be backed before a pool opens.
2. A pool that fails under its published qualifying-failure rule pays no success premium.
3. Eligible participants receive their principal treatment and failure bonus through separate, auditable settlement channels.
4. A pool that clears an approved threshold pays a disclosed success premium into the common reserve.
5. Future expected premiums are never treated as present collateral.

Pausing the reserve blocks new exposure allocations but does not strand already-promised obligations: existing qualifying claims, required reserve expenses, and exposure releases remain settleable, subject to the same solvency and approval checks.

The implementation in this change is a pricing, proposal, disclosure, schema, and simulation-settlement foundation. It does not enable production custody, charging, refunds, payouts, or reserve posting by itself.

## Premium pricing

A universal percentage is not hard-coded. The versioned experience-rated quote is:

```text
expected claims rate
  = ((1 - success probability) / success probability)
    × failure-bonus rate
    × expected eligible funding at failure as a share of the net threshold

success-premium rate
  = expected claims rate
    + claims/administration load
    + reserve risk margin
```

All calculations use integer cents and basis points. The pool creator selects the failure-bonus rate, but Moral Trade—not the creator—owns the provisional success-probability, failure-fill, expense-load, and reserve-margin assumptions. The server recomputes the rate and amount from the versioned platform policy and rejects client-side mismatches or attempts to mark a quote final.

The initial Labs illustration uses:

- 75% estimated success probability;
- 10% failure bonus;
- eligible failed funding equal to 40% of the net threshold on average;
- 0.25% claims and administration load;
- 0.42% reserve risk margin.

That yields a provisional rate of **2.01%**. For a **$10,000 net recipient threshold**, the premium is **$201** and the gross success requirement is **$10,201**, before separately disclosed payment fees.

This is an illustrative pilot quote, not a claim that 2.01% is actuarially adequate. Production pricing requires observed success rates, failure balances, claim acceptance rates, fraud and chargeback loss, payout expense, and correlated-failure stress tests. A final quote must be approved by an operator; approved quotes and the corresponding proposal terms are immutable.

The automatic v0.1 quote supports percentage-of-contribution bonuses. Fixed-per-contributor and progressive formulas must remain operator-reviewed until the quote engine receives a verified expected-liability calculation, contributor-count cap, and per-person cap; the platform must not force those formulas into a percentage-rate approximation.

## Relationship to thresholds

Threshold size alone does not determine the percentage. It determines dollar exposure after the risk rate is known. The percentage also depends on:

- the failure-bonus formula and caps;
- success probability;
- expected eligible balance at failure;
- participant-count exposure for fixed per-person bonuses;
- fraud, payout, and administration costs;
- reserve risk margin;
- correlated failure risk and any sponsor co-funding.

For one threshold:

```text
success premium = ceil(net recipient threshold × premium rate)
gross success requirement = net recipient threshold + success premium
```

For multiple cumulative thresholds, each incremental tranche is priced once. Clearing threshold 2 charges the premium for tranche 1 plus the incremental amount between thresholds 1 and 2. It does not charge the threshold-1 amount twice. A tranche that does not clear owes no premium.

The proposal form, persistence layer, operator queue, database constraints, approval RPC, and simulation settlement now support one to ten cumulative thresholds. All thresholds share one pool-wide failure-bonus formula and eligibility policy, while each incremental tranche may use a different conservative success-probability and expected-failure-fill estimate. The legacy scalar threshold remains a compatibility mirror of threshold 1. See `docs/failure-bonus-multi-threshold-editor.md` for the complete contract.

## Threshold presentation

The success premium is **not included in and is not deducted from the net recipient threshold**.

The product must present three separate amounts:

- net amount promised to the recipient;
- success premium credited to the reserve;
- gross success requirement, before payment fees.

The v0.1 payer is the pool creator or a named sponsor. A contributor-funded pro-rata option exists only in the forward-compatible data model; it remains disabled until separate participant-acceptance and collection terms exist, and it can never be silently taken from pledged charitable principal. Reaching the net threshold is not sufficient for settlement: the quoted premium must also be funded, so the gross success requirement is a separate fail-closed settlement condition.

Reserve accounting is append-only. A qualifying failure debit reduces cash and the corresponding reserved exposure atomically; any unused exposure is released separately. This avoids a transient or hidden undercollateralization state and prevents one pool from releasing another pool's backing.

## Files

- `src/lib/mpgf/failure-bonus-success-premium.ts`: versioned pricing and multi-threshold schedule logic.
- `src/components/mpgf/mpgf-console.tsx`: one-to-ten-threshold editor, exact schedule preview, fixed creator-or-sponsor payer rule, and disclosure.
- `src/lib/mpgf/failure-bonus-threshold-editor.ts`: exact input parsing, editor operations, schedule construction, and server-side schedule validation.
- `src/lib/mpgf/failure-bonus-operator.ts`: validated pending-schedule operator queue.
- `src/lib/mpgf/persistence.ts`: server-side recomputation and tamper rejection.
- `src/lib/mpgf/public-goods-refund-bonus-non-mvp.ts`: simulation settlement outputs and reserve ledger events.
- `src/app/labs/moral-public-goods/[poolSlug]/moral-public-goods-labs-client.tsx`: participant-facing Labs disclosure.
- `supabase/migrations/20260726140000_mpgf_failure_bonus_success_premium_reserve.sql`: proposal columns, versioned quotes, common-reserve metadata, append-only ledger, solvency enforcement, and aggregate disclosure view.
- `supabase/migrations/20260726170500_mpgf_multi_threshold_failure_bonus_editor.sql`: one-to-ten schedule validation, quote synchronization, atomic approval, and post-pledge immutability.
- `supabase/tests/mpgf_failure_bonus_success_premium_reserve.sql`: transactional reserve invariant test.
- `supabase/tests/mpgf_multi_threshold_failure_bonus_editor.sql`: transactional multi-threshold editor and atomic-approval regression.

## Production gates

Before live use, all of the following remain mandatory:

- legal classification and approved public terminology;
- confirmed reserve capitalization and provider/partner custody route;
- approved premium quote for every threshold tranche;
- immutable contribution and eligibility manifest;
- exact success/failure finalization;
- principal refund and bonus payout rails;
- successful-pool premium funding confirmation;
- idempotent webhooks and reserve entries;
- chargeback, fraud, duplicate-account, and related-party controls;
- no reserve overbooking;
- reconciliation proving recipient amount, premium amount, and reserve entry independently;
- portfolio monitoring and repricing.
