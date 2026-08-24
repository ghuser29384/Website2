# Compact authoritative eligible-outflow ledger v1

## Release posture

This tranche is a private, append-only, shadow-only authority layer for the transaction-based Compact v2 formula. It never creates a payment mandate, charge, receipt, custody balance, settlement, electorate, activation, or collection instruction.

The exact formula remains:

```text
shadow_compact_amount_cents(t)
  = floor(authoritative_eligible_net_settled_moral_trade_outflow_cents(t-1) / 10)
```

The preceding month is the complete UTC calendar month. Money is stored and calculated only in integer minor units. The v1 authority currency is USD; mixed or non-USD source sets fail closed because the repository has no frozen authoritative FX primitive.

## Existing source-of-truth audit

| Mechanism or surface | Canonical repository source | What it proves | Adjustment coverage | Payer binding | Environment / currency | Idempotency | Historical completeness | v1 disposition |
|---|---|---|---|---|---|---|---|---|
| Core two-party trade external payment | `trade_milestone_payouts`, `trade_external_payment_receipts`, payment review decisions | A frozen amount due plus participant-reported external-payment evidence that may be confirmed or adjudicated | Review/correction/appeal exists, but no provider-complete refund, reversal, or chargeback event stream | Payout payer and payee are profile-bound | ISO currency is recorded; provider environment is not an authoritative settlement feed | Provider/reference fingerprint and payout/cycle/attempt uniqueness | Not complete for provider settlement and later adjustments | `provisional` evidence only; production authority remains unavailable |
| Donation Redirect / Donation Upgrade / donation offsets | `src/lib/donation-offsets.ts` and preview/legal gate objects | Proposed destination, matching, evidence and donor-of-record review state | No canonical provider settlement or adjustment stream | Draft/preview participant data only | External destinations/providers; no frozen provider truth | Preview identifiers only | Incomplete | unavailable |
| Co-Fund / Co-Act group contributions | create-interface group-contribution drafts and Discover projections | Proposal/commitment shape and UI state | No authoritative settlement/refund/chargeback adapter | Participant proposals, not provider facts | No authoritative provider environment/currency event stream | Draft/request keys | Incomplete | unavailable |
| DAC / threshold pools / group buying | threshold and group-buying proposal/lifecycle records | Pledges, thresholds, terms and previews | No authoritative completed provider event stream | Membership/pledge identity, not final payment authority | No complete provider binding | Mechanism identifiers | Incomplete | unavailable |
| Wallet, deposits, escrow, reserves, internal transfers | scattered proposal/docs or absent live ledger | At most internal accounting or planned balance movement | Not applicable to eligible outflow | May be account-bound | No canonical production settlement authority | N/A | Not an eligible source | explicitly excluded |
| Compact contributions | Compact v2 schedule/settlement placeholders | Compact-internal contribution state | Deliberately unavailable in this no-charge prototype | Compact member | No payment provider | Snapshot hashes | No real settlement | explicitly excluded to prevent recursive assessment |
| Stripe / Every.org provider events | no canonical production webhook/event ledger found | Nothing authoritative in the current repository | No complete refund/reversal/chargeback coverage | unavailable | unavailable | unavailable | unavailable | unavailable |
| Isolated-QA synthetic provider | `qa_authoritative_synthetic` adapter added by this tranche | Deterministic synthetic settlement and adjustment facts for tests only | Complete within the rollback-only QA fixture | Synthetic profile-bound | QA / USD only | source event hash + sequence + supersession | Complete only inside one test transaction | eligible in QA only; prohibited as production authority |

## Architecture

The existing public Compact tables remain the only Compact projection consumed by the application:

- `mpgf_public_goods_outflow_coverage_snapshots`
- `mpgf_public_goods_outflow_observations`
- `mpgf_public_goods_obligation_snapshots`

This tranche does not create a second public ledger. It adds private metadata and linkage around those existing append-only rows:

- adapter registry and production availability disposition;
- environment, currency, source version and monotonically increasing source sequence;
- explicit observation supersession for late refunds, reversals and chargebacks;
- source-level coverage dispositions and watermarks;
- immutable coverage snapshot hash, cutoff and unresolved-source count;
- immutable links selecting exactly one current source event per source record for a frozen snapshot.

Exact duplicate delivery returns the original observation. A materially changed source record must explicitly supersede the current leaf event and use a higher source sequence. Frozen historical snapshots keep their original links; a late adjustment is represented by a new event and a new superseding coverage snapshot.

## Coverage authority states

Private authority metadata distinguishes:

- `unavailable`
- `incomplete`
- `provisional`
- `complete`
- `superseded`
- `invalidated`

The existing public projection maps these to its compatibility vocabulary:

- complete → `complete`
- incomplete or provisional → `partial`
- unavailable, superseded or invalidated → `unavailable`

A complete snapshot requires:

1. exact prior-complete-UTC-month bounds;
2. a cutoff at or after month end;
3. USD-only events;
4. matching environment;
5. no production-synthetic event;
6. every required adapter in that environment marked complete;
7. every complete adapter capable of authoritative coverage;
8. zero unresolved sources.

Current production adapters do not satisfy those requirements, so production remains truthfully unavailable. A complete zero is possible only when all required adapters prove complete coverage and select zero eligible observations; absence of rows alone is never treated as proof of zero.

## Eligibility and netting

Only linked events satisfying all of the following enter the amount:

- outgoing;
- `moral_trade_payment`;
- settled;
- occurred in the exact prior UTC month;
- has a settlement timestamp;
- matches the complete snapshot environment and USD currency;
- is not production-synthetic.

For each selected canonical source record:

```text
net_cents = max(0, gross_settled_cents
                   - refunded_cents
                   - reversed_cents
                   - chargeback_cents)
```

Compact contributions, incoming/self/internal flows, wallet funding, deposits, escrow, pending and failed payments are stored only when useful for provenance and are excluded from the sum.

## Privacy and authorization

- Private authority tables live in `moral_trade_private` and are not exposed to browser roles.
- Direct table access by `anon` or `authenticated` is revoked.
- Operator functions require workflow service authority or the existing AAL2 administrator role check.
- The application continues to read only the self-scoped `get_mpgf_public_goods_compacts_v2_state()` projection.
- The public state contains only the viewer's aggregate coverage status, net amount, calculated shadow amount and observation count; it does not expose source records, provider references, event hashes, watermarks or adapter details.
- No application runtime service-role key is introduced.

## Compact integration boundary

When complete synthetic or future production authority exists, the UI may show a **shadow calculated 10% amount**. It is not a charge, collection, legal debt, mandate, settlement, custody balance, tax-deductibility claim or enforceable obligation.

Complete outflow authority alone does not enable:

- readiness without verified unique-person status and approved dormant authorization;
- voting without frozen actual net-settled Compact contributions;
- activation or electorate opening;
- any provider call or money movement.

## Next dependency

After this ledger is validated, the next dependency should be a privacy-preserving verified-unique-person eligibility primitive. Dormant payment authorization remains later and separately gated by legal, provider, entity, donor-of-record, receipt, custody, dispute and production-release decisions.
