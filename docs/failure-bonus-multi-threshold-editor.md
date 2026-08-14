# Failure-Bonus Cumulative-Threshold Editor

## Product contract

A failure-bonus pool may define between one and ten cumulative net-recipient thresholds. The editor implements one contract across the entire pool:

- one percentage-of-eligible-contribution failure-bonus formula;
- one immutable eligibility policy;
- one maximum eligible-participant count;
- one maximum failure bonus per participant;
- one creator-or-sponsor success-premium payer;
- one versioned platform expense load and reserve-risk margin;
- a separate success-probability and expected-failure-fill estimate for each incremental tranche.

The creator cannot assign a different failure-bonus formula, eligibility rule, participant cap, or per-person cap to an individual threshold. Those terms apply once across the pool. This prevents a later threshold from silently changing the promise made to earlier contributors or multiplying the same participant cap by the number of thresholds.

## Threshold and premium arithmetic

Thresholds are cumulative net amounts promised to the recipient. They must be strictly increasing and have stable identifiers. For threshold `j`:

```text
incremental net tranche[j]
  = cumulative net threshold[j] - cumulative net threshold[j - 1]

tranche success premium[j]
  = ceil(incremental net tranche[j] × tranche premium rate[j])

cumulative success premium[j]
  = sum(tranche success premium[1..j])

gross success requirement[j]
  = cumulative net threshold[j] + cumulative success premium[j]
```

Threshold 1 uses a previous cumulative amount of zero. Each incremental recipient dollar is therefore priced exactly once. The implementation uses integer cents and basis points and always rounds premium obligations upward to the next cent.

The success premium is outside the net recipient threshold. It is neither deducted from the amount promised to the recipient nor silently collected from contributor principal.

## Pool-wide maximum failure-bonus exposure

For each cumulative threshold, uncapped exposure is:

```text
ceil(cumulative net threshold × pool-wide failure-bonus rate)
```

The pool-wide aggregate cap is:

```text
maximum eligible participants × maximum bonus per participant
```

Cumulative maximum exposure is the smaller of those two amounts. Incremental reserve exposure for threshold `j` is the difference between cumulative exposure at threshold `j` and cumulative exposure at threshold `j - 1`. This means the participant and per-person caps are applied once across the complete pool rather than separately to every tranche.

## Underwriting inputs

A creator may use a more conservative estimate than the provisional platform baseline for a tranche, but may not use a more optimistic one:

- estimated success probability: no more than 75%;
- expected eligible balance at failure: no less than 40% and no more than 100%;
- claims and administration load: fixed by the current policy;
- reserve risk margin: fixed by the current policy.

The server reconstructs every quote from these inputs. It rejects altered premium rates, altered premium amounts, incorrect cumulative totals, incorrect gross requirements, incorrect exposure values, threshold-specific bonus formulas, stale policy versions, or a creator attempt to mark a quote approved.

## Eligibility policy

The v0.1 eligibility policy is versioned and exact:

- one verified unique person per eligible contributor;
- contribution captured before the published deadline;
- creator-controlled and related-party accounts excluded;
- duplicate, reversed, disputed, and fraudulent payments excluded;
- percentage bonus based on the eligible contribution;
- one pool-wide maximum participant count;
- one pool-wide maximum bonus per participant.

The threshold editor does not introduce an early-contributor weighting rule. Any future early-contributor mechanism requires a separately versioned eligibility policy, liability model, disclosure, and migration.

## Editing and approval lifecycle

Creator-authored schedules are always `pending_review` and provisional. A creator may edit the schedule before the first accepted pledge. Any edit regenerates the complete pending quote set and supersedes stale pending quotes.

An authorized MFA-gated operator reviews the complete schedule. Approval is atomic:

- every current threshold quote is approved together;
- partial threshold approval is rejected;
- the proposal schedule and quote records become final in the same database transaction;
- every final tranche receives the same operator rationale;
- the approved proposal terms and quotes become immutable.

An enabled failure-bonus pool cannot accept a pledge until the complete schedule is approved. After the first accepted pledge, the database rejects changes to the formula, eligibility policy, participant cap, per-person cap, threshold schedule, threshold-one compatibility fields, and premium terms.

## Partial clearance and settlement

For a successful pool, settlement derives the highest cumulative threshold reached from verified net-recipient funding. It charges the cumulative premium through that threshold and no premium for a higher uncleared tranche.

A caller-supplied cleared-threshold index cannot be used to undercharge the reserve. If it differs from the highest threshold supported by verified net funding, settlement fails closed. The legacy scalar threshold must continue to mirror threshold 1, while later thresholds are read from the approved schedule.

For a failed pool, no success premium is due. Principal refunds, failure-bonus payments, reserve expenses, and unused-exposure releases remain separate accounting channels.

## Operator interface

`/mpgf/admin/failure-bonus` presents pending schedules only after server-side validation. The review table shows, for every threshold:

- cumulative and incremental net amounts;
- success-probability and failure-fill assumptions;
- premium rate;
- cumulative premium;
- gross success requirement;
- cumulative maximum failure-bonus exposure.

The operator provides one substantive rationale and approves all threshold quotes in one action. Malformed pending records are blocked from approval and surfaced as operator-review exceptions rather than silently treated as valid.

## Database objects

The forward migration adds:

- proposal schedule, policy, cap, and lifecycle columns;
- exact JSON validation for one-to-ten threshold schedules;
- exact exposure and quote columns on premium-quote records;
- monotonic and immutable post-pledge terms;
- an atomic schedule-approval RPC;
- quote synchronization for every threshold;
- an accepted-pledge guard requiring approved schedules.

The migration refuses to guess a multi-threshold backfill for an existing enabled failure-bonus proposal. Such a row must be explicitly reviewed and migrated under a separate backfill plan.

## Verification requirements

The release must cover:

- adding, removing, and reordering thresholds while retaining stable IDs;
- strict cumulative ordering after reordering;
- exact cents and upward rounding;
- different premium rates for different tranches;
- cumulative exposure under pool-wide caps;
- partial clearance and highest-cleared-threshold derivation;
- prevention of double-charging an earlier tranche;
- full quote regeneration after edits;
- rejection of partial approval and self-approval;
- post-acceptance immutability;
- desktop and mobile persistence and reload;
- transactional database rollback and synthetic-data cleanup.

## Live-money boundary

This editor does not activate production custody, premium collection, refunds, bonus payouts, or reserve posting. The common reserve remains simulation-only until the separate legal, custody, capitalization, payment-provider, fraud-control, payout, reconciliation, and portfolio-risk gates pass.
