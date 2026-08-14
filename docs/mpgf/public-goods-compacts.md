# Transaction-based public-goods Compacts v2

Compact v2 is a cause-specific, opt-in constitution. It is not a government jurisdiction: Moral Trade has no taxing authority, nobody is randomly assigned, and the ordinary marketplace is not taxed. One person may join multiple cause-area Compacts, but every joined Compact shares one aggregate monthly obligation.

The frozen version is `mpgf-public-goods-compact/transaction-v2`. Future Flourishing, Animal Welfare, and Global Health use the same numeric rules:

- one aggregate obligation equal to `floor(prior complete UTC month eligible Moral Trade net-settled outgoing cents / 10)`, with no cap;
- one complete allocation across all joined Compacts, stored as integer basis points totaling exactly 10,000;
- Compact-local monthly qualification only at $1 or more of planned contribution before collection is live, and actual net-settled contribution once collection is live;
- numerical readiness only when the same frozen snapshot contains at least 100 verified unique people and at least $500 of planned monthly contribution;
- voting weight of 70% equal member weight plus 30% square-root actual net-settled contribution weight;
- direct-only delegation, no re-delegation of incoming weight, and rejection when a proxy would control more than 10% of the effective electorate.

Membership and monthly qualification are separate. Allocating or settling less than $1 removes that Compact's qualification for the cycle, including the ability to vote, delegate, or receive a delegation; it does not delete charter membership.

## Authoritative transaction boundary

The obligation calculation accepts only a complete, service-attested view of the prior UTC month. Only outgoing, settled `moral_trade_payment` observations count. Compact contributions, incoming/internal/self flows, wallet funding, deposits, escrow, pending and failed records are excluded. Refunds, reversals, and chargebacks are deducted, with the net floored at zero.

The current repository does not contain an authoritative ledger that proves complete coverage of every eligible Moral Trade payment and later reversal. It also lacks a stable privacy-preserving key that deduplicates one verified human across accounts. Compact v2 therefore fails closed in the product:

- coverage, eligible outflow, aggregate obligation, planned cents, qualification, and voting weight remain unavailable;
- accepting a constitution creates membership only;
- multiple memberships require an explicit allocation instruction totaling exactly 100.00%, but cents are not scheduled while coverage or dormant authorization is unavailable;
- the UI never asks for self-reported spending and never presents an allocation as payment.

The schema defines service-only interfaces for future complete coverage, unique-person evidence, dormant authorization, settlement, and snapshot freezing. The shipped product has no writer that fabricates those facts.

## Cent-exact allocation

One joined Compact defaults to 10,000 basis points. With multiple joined Compacts, the submitted keys must exactly match all current joined Compacts and sum to 10,000. Otherwise scheduling and all downstream eligibility fail closed.

When an authoritative obligation exists, each preliminary allocation is `floor(obligation_cents * allocation_bps / 10000)`. Remaining cents are assigned by largest fractional remainder, then stable Compact key. The final scheduled rows always sum to the aggregate obligation exactly.

## Frozen snapshots and readiness

Membership, outflow coverage, obligation, allocation, scheduled amount, settled contribution, qualification, readiness, voting weight, delegation events, and final delegated holdings are separate records. Financial, readiness, voting, and delegation outputs are append-only immutable snapshots.

Readiness counts `distinct unique_person_key_hash`, not accounts or memberships, and sums only Compact-local `scheduled_qualified` rows from the same frozen cycle. Both `count >= 100` and `scheduled cents >= 50000` must be true. The snapshot may then say `threshold_ready`, but `activation_blocked` remains true.

This PR cannot activate a Compact. Database constraints and an update trigger reject `active` status and reject enabling activation execution. A later, separately reviewed tranche must satisfy identity, legal, fiscal-sponsor/payment-provider, donor-of-record/receipt/custody, sanctions/jurisdiction, and production-release gates before changing that hard boundary.

## Voting and delegation

Voting uses only `settled_qualified` rows backed by complete settlement evidence. For `N` qualified people and per-person Compact net settlement `P_i`, the implementation allocates one trillion immutable units:

`0.70 / N + 0.30 * sqrt(P_i) / sum_j(sqrt(P_j))`

Integer remainders are distributed deterministically so the final total is exactly one trillion units. A zero-person or zero-settlement electorate cannot pass.

A member may delegate only that member's own frozen weight to another qualified member in the same Compact and cycle. Incoming weight stays with its immediate proxy even if that proxy delegates their own weight. Two-way delegation is therefore well-defined, not recursive. A set operation is rejected, never truncated, if any proxy would control more than 100 billion of the one-trillion-unit electorate. The final delegation snapshot preserves every member's original ownership and exact effective holding without double counting.

## Security and privacy boundary

All Compact v2 tables use row-level security with direct browser writes revoked. Authenticated users can call fixed-search-path, versioned, idempotent RPCs for membership, allocation, exit, and delegation. Financial/readiness/voting/delegation freeze functions are service-role-only. Participant financial and identity evidence is owner-readable where needed; public state contains published terms and non-identifying aggregate readiness only.

The migrations grant privileges explicitly instead of relying on database defaults. Snapshot and event rows reject update/delete. Accepted constitutional terms reject mutation after the first membership acceptance.

## Money and release boundary

Joining, allocating, delegating, or requesting exit does not create a charge, Stripe object, checkout, mandate, receipt, escrow balance, custody claim, tax claim, or charitable-deduction claim. All mutation responses must explicitly state the applicable no-money and no-transfer flags.

The two Compact migrations are repository code only. Pull-request validation may first reconstruct their checked-in eligibility prerequisites, then apply the Compact migrations with synthetic fixtures inside one workflow-owned transaction on an isolated non-production Supabase target, execute the QA suite, roll the transaction back, and prove zero Compact schema and synthetic-user residue. The clean-ephemeral job independently reconstructs the full historical migration chain. Neither path authorizes a persistent staging/production migration, Preview/Production deployment, payment-provider setup, merge, or real activation.
