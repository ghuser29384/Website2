# Moral Goods Group Buying

This feature implements Moral Goods Group Buying as a first-class Moral Trade surface. It adds adjusted-impact-unit rounds, crowdfunded pledge-swap lots, pledge-swap baskets, standing microfund pools, participant donation-recipient choice, sponsor gap-fill, private participant-proposal intake, shared settlement primitives, and action-first public UI.

The implementation lives in `src/lib/moral-trade/group-buying.ts`, public/API routes under `src/app/api/moral-trade/group-buying`, the page at `/moral-goods-group-buying`, and the additive schema migration `supabase/migrations/20260624_moral_goods_group_buying.sql`.

## Mechanism

Moral Goods Group Buying buys verified moral actions under frozen terms. The adjusted-impact formula is:

```text
Adjusted Impact Units =
raw action units
* P(additional)
* verification confidence
* moral impact weight
* persistence multiplier
```

The service computes this with integer basis points and milli-units, not binary floating-point arithmetic. Money is represented as integer minor units plus explicit currency.

Fixed-consideration pledge-swap lots and baskets keep three accounting layers separate:

- Consideration accounting: the fixed participant payout, charity donation, mixed consideration, fee, release, or shortfall obligation.
- Protocol impact accounting: raw verified units and adjusted impact units under the frozen methodology.
- Net-impact claims: optional, aggregate, uncertainty-qualified claims that require funder counterfactuals, substitution/rebound handling, and public copy review.

## Shared Primitives

Rounds, lots, baskets, basket items, standing budgets, and pledge-swap adapters are represented through shared service-layer primitives:

- `PurchaseEnvelopeRegistry`: authoritative public id, state group, enabled modules, snapshot hash, and projection status.
- `FundingSourceCommitment`: ordinary pledges, micro-pledges, standing allocations, sponsor gap-fill, platform reserve, and dev reserve.
- `ParticipantActionCommitment`: participant obligations across rounds, lots, baskets, and pledge-swap adapters.
- `ConsiderationObligation`: participant payout, charitable donation, mixed consideration, fees, withholding, sponsor bonus, release, or refund.
- `CreditedActionUnit`: de-duplicated verified raw action units, keyed with private HMAC-derived raw-unit keys.
- `SettlementPlan`: deterministic binding of funding sources, credited units, obligations, fees, donation/payout/release operations, and ledger entries.
- `DomainEventOutbox`: state-change events for notifications, receipts, public-progress projections, provider operations, and repair jobs.

Disabled modules fail closed in UI, API, settlement previews, and public reporting.

## UX And Copy

Ordinary users see action-first labels:

- Fund many verified actions
- Fund one verified action
- Fund several similar actions
- Set a small recurring budget
- Sponsor remaining funding
- Suggest an action privately

The public page uses three main tabs: Fund, Participate, and Results. Every deal card is generated from server state and shows Action, Consideration, Your role, Status, Next step, If it does not complete, and one Details disclosure. Details contain methodology, fees, privacy, verification, dispute, donation/tax limits, and snapshot identifiers.

The presenter enforces copy-lint rules that reject internal terms such as purchase envelope, consideration obligation, funding-source commitment, policy bundle, raw-unit key, HMAC, and settlement plan in ordinary UI. It also blocks unsupported guaranteed/confirmed/offset claims.

Commitment cards use this order:

1. What you are agreeing to.
2. When money or action starts.
3. What can still fail or change.
4. Your deadlines and rights.
5. Your receipt.

Failure templates cover failed funding, team expiry, participant decline, waitlist/control assignment, withdrawal, verification failure, late proof, payment reauthorization, donation-recipient fallback, donation failure after verification, payout hold, operational pause, settlement delay, and public-report suppression.

## Seed Data

The module seeds:

- Sponsored 30-Day Vegetarian Diet-Shift Round.
- Crowdfunded $50 / 2-Day No-Meat Pledge-Swap Lot.
- Crowdfunded Basket of Five $50 / 2-Day No-Meat Pledge Swaps.
- Standing microfund pool for a $5/month animal-welfare budget.
- Development feature-capability gates for lots, baskets, standing pools, recipient choice, sponsor gap-fill, simulated donation execution, disabled wallet support, and disabled production real-money movement.
- Funding-source commitments, participant action commitments, credited action units, consideration obligations, and deterministic settlement previews.

Seeded money movement is development/simulated. It must not be presented as real production capture, custody, escrow, payout, or donation execution.

## Persistence And Migration

The migration creates additive `moral_goods_*` tables for:

- Envelope-specific records: group-buy rounds, crowdfunded lots, baskets, basket items, standing pools, proposals, donation recipients, and donation operations.
- Shared primitives: registry, funding commitments, action commitments, consideration obligations, credited action units, settlement plans, settlement line items, domain-event outbox, receipts, ledger, payment operations, provider events, disputes, verification records, evidence access logs, risk reviews, reviewer-quality audits, AI-processing logs, idempotency records, terms acceptances, pauses, incidents, deadline jobs, erasure/retention actions, backfills, reconciliation runs, and backup/restore checks.

Settlement-critical fields are typed columns. Flexible policy and snapshot material stays in JSONB. Constraints enforce nonnegative money, single known lifecycle state groups, UTC temporal ordering where appropriate, unique slugs, unique snapshot hashes, unique provider/idempotency keys, and unique raw-unit keys.

## Privacy And Retention

Baseline answers, private evidence, payout references, KYC/tax references, fraud/risk rationales, anti-threat flags, private proposal text, private donation-recipient rationales, and private policy snapshots are private by default. Public APIs expose allowlisted summaries only.

Evidence records track original hashes, sanitized-preview hashes, redacted-derivative hashes, scan/quarantine status, metadata stripping, third-party redaction, retention expiry, and access logs. Erasure requests use redaction, blob deletion, token deletion, crypto-erasure, tombstones, and legal holds rather than mutating append-only audit, ledger, payment, or review history.

Public reports suppress, coarsen, delay, or aggregate small cells that could reveal participant identity, participant behavior, funder behavior, charity choice, evidence status, disputes, or invitation graphs.

## Public And Private Snapshots

The frozen policy bundle and purchase-envelope registry are authoritative for launch, activation, settlement, receipts, and public reporting. Public exports include action, consideration, verification level, user-facing state label, deadline/status, expected impact range or fixed terms, public methodology summary, limitation summary, and public-safe snapshot identifier.

Private snapshots retain anti-gaming thresholds, exact baseline/risk heuristics, private evidence references, private proposal text, reviewer notes, protected score thresholds, fraud/risk rationales, security policy, and raw HMAC/key material references.

Hash notes:

- Canonicalization uses sorted-key canonical JSON.
- Public snapshot identifiers are derived from hashes and are safe to expose.
- Raw-unit keys are HMAC-derived from private participant/action/window material and are not public.
- Evidence hashes, request hashes, provider signatures, and sensitive HMACs remain private or redacted.
- Key rotation must preserve old verification references without exposing raw secrets.

## Validity Modes And Teams

The implementation distinguishes instant-valid and team-threshold validity modes. Pending team-threshold pledges, enrollments, and credited units do not count toward reserve, launch solvency, public activated progress, settlement, or impact reporting until activated.

Team activation uses qualified distinct-member counts, hashed invite tokens, revocation, expiry, rate limits, and non-authoritative cached counters that must be recomputed before threshold success, expiry, launch, clearing, settlement, or public reporting. It must not use leaderboards, shame lists, identity-revealing social proof, or pressure copy. Activated selected participants are paid or donated for their own verified obligations under frozen terms, not later group behavior.

## Lots, Baskets, Recipient Choice, And Sponsors

Crowdfunded pledge-swap lots allow many micro-funders to jointly fund one fixed consideration. Micro-contributions such as $0.50 are stored as integer minor units and are available only when the configured provider-minimum policy supports them. Production must enforce provider minimums, batching, sponsor reserves, or compliant wallet support before offering sub-dollar card transactions.

Baskets batch equivalent pledge swaps, lower overhead, reduce single-participant privacy risk, smooth non-completion risk, and produce aggregate reports. Each basket item settles independently; the basket report aggregates outcomes.

Participant donation-recipient choice is allowed only from frozen approved lists. The selected recipient, fallback, donor-of-record policy, tax-receipt policy, restricted-fund policy, and donation-failure policy must be frozen before action begins. If the recipient becomes blocked before action, use the fallback or cancel before action. After a verified action, donation failure creates a ledger-visible obligation and support/retry path.

Sponsor gap-fill has explicit threshold, max amount, reserve status, expiration, line items, and public-reporting treatment. It is reported as funding source, not duplicate impact.

## Standing Microfund Pools

Standing pools are constrained allocation preferences unless legally reviewed wallet/stored-balance support exists. A pool freezes period cap, per-lot/basket caps, cause/action allowlists, consideration types, recipient scope, review mode, fee-ratio policy, routing objective, and cancellation rules.

Review modes are automatic within my rules, ask me before locking, and manual only. Allocation receipts explain why money routed, e.g. matched animal-welfare/no-meat rules and was closest to clearing. Allocations outside frozen constraints fail closed.

## Proposal Intake And Anti-Threat Review

The private proposal form starts with five fields: what you would do, how long it would last, what consideration would make it worthwhile, which approved charity or payout option you would accept, and any safety or access concerns.

Submissions are private until reviewed and standardized. Threat-framed, coercive, illegal, discriminatory, self-harm, medical-risk, baseline-worsening, vote-buying, related-party/self-dealing, sanctioned-recipient, and off-platform-circumvention proposals are blocked or routed to risk review. Raw proposal text is excluded from public pages, search, analytics, and funder dashboards.

## Payments, Ledger, And Compliance

The service includes a simulated provider path only. Production real-money movement is disabled until payment authorization/capture/release, payout, donation execution, KYC/tax, AML/sanctions, webhook signature verification, replay protection, chargeback/reversal handling, shortfall handling, jurisdiction gating, support, dispute, and reconciliation gates pass.

No UI should claim escrow, custody, guaranteed donation, charged money, paid money, donated money, or tax receipt treatment unless provider and ledger state make it true. Use authorized before capture, charged after capture, released after release, paid after payout, and donated after donation operation succeeds.

Ledger/accounting notes:

- Provider operations are not the ledger.
- Reserves, captures, releases, rollovers, payable obligations, platform fees, provider clearing, sponsor gap-fill, shortfalls, and adjustments reconcile through ledger entries.
- Settlement previews create line items before money movement.
- Execution must be idempotent and reject stale approved plans when funding, credited units, obligations, fee lines, donation/payout/release operations, or ledger plan hashes change.
- Failed/unclaimed payouts remain liabilities under retry, hold, expiry, participant contact, escheatment/remittance review, or compliance disposition. They cannot default to platform revenue.

## Verification And Double Counting

Verification strength scales with action risk, consideration value, gaming risk, and evidence sensitivity. Low-value lots can use light attestations and audits only when methodology, terms, and public reporting disclose that standard. High-risk or high-value cases need stronger evidence and review.

CreditedActionUnit rows prevent paying or crediting the same participant/action/window twice across group buying and existing pledge swaps. Backfills from existing pledge-swap agreements must run dry-run counts, reconciliation reports, idempotency checks, rollback/repair paths, and fail-closed enforcement before production cross-feature de-duplication becomes mandatory.

## Public Reporting

Public reports show applicants, eligible/selected/waitlist counts where safe, verified completions, raw units, adjusted units, fixed consideration earned/executed, gross/net payouts where appropriate, sponsor gap-fill, ordinary charges, releases/rollovers, cost per adjusted unit, methodology version, limitations, uncertainty, public snapshot id, donor-of-record treatment, and offset/moral-licensing disclaimers.

Reports do not expose private evidence, raw-unit keys, private HMACs, exact anti-gaming thresholds, private counterfactual notes, rejected proposal text, invite graphs, or participant identity/story/charity rationale without separate reviewed opt-in.

## Operations And Rollout

Rollout stages:

1. Simulated adjusted-impact rounds.
2. Production-gated adjusted-impact rounds without wallet support.
3. Crowdfunded lots with provider-minimum-compliant contributions.
4. Baskets.
5. Standing microfund pools using constrained authorizations.
6. Wallet/stored-balance support only after legal/compliance approval.

Operational checklists cover publication, launch, reserve, evidence, settlement, public-report readiness, capability dependencies, cap utilization, emergency pauses, stale projections, deadline jobs, reconciliation, provider events, unusual evidence access, failed notifications, payout holds, incidents, and backup/restore drills.

Step-up authentication or recent re-authentication is required where the repository supports it for launch approval, settlement approval/execution, payout execution, evidence export, private-evidence emergency override, feature unpause, and overrides of fraud, safety, participant-welfare, legal, or payment-compliance holds.

## Testing

Tests cover:

- Action-first deal cards and progressive disclosure.
- Copy lint against internal terms and unsupported money/impact claims.
- Integer adjusted-unit and payout calculations.
- SettlementPlan input/output hashes and stale-plan rejection.
- Feature-capability dependency fail-closed behavior.
- Anti-threat proposal flagging.
- API route fail-closed behavior.
- Migration/API/profile wiring.

Run:

```bash
npm test -- src/lib/moral-trade/group-buying.test.ts
npm run lint
npm run build
```
