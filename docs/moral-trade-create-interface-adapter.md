# Moral Trade Create interface adapter

## Release contract

The accepted Create interface is preserved as a static, same-origin application at
`/moral-trade-create/index.html` and mounted at the default `/trades/new` route.
Its visual hierarchy, four-step interaction, responsive layout, cause selection,
request structures, contribution alternatives, one-to-ten threshold editor,
failure-bonus timing workbench, custom formula preview, visibility controls,
review screen, and receipt screen remain the product contract.

The production adapter changes only the trust boundary:

- the browser submits the complete versioned state to `/api/create/publish`;
- the route requires a signed-in Moral Trade account and validates the exact state;
- persistence is one atomic, idempotent database transaction;
- the success screen appears only after a durable submission and target record are
  returned by the database;
- no submitted record becomes public, accepts pledges, authorizes payment, or
  claims reserve backing merely because it was submitted.

## Supported structures

### Pledge-swap

Creates a private `offers` record in `paused` / `pending_review` state. Exact
requested action and all concrete contribution alternatives are retained in
`moral_trade_create_offer_terms`.

### Donation redirect

Creates the same private reviewable offer shell plus a dedicated
`moral_trade_donation_redirect_proposals` intake record. This is not represented
as an active protected match. Planned-donation baseline, fallback destination,
payment authorization, settlement, refund, and unmatched-surplus terms must be
completed in the protected Donation Redirect workflow before activation.

### Existing-pool contribution

Creates a private bilateral offer and records the existing pool reference,
requested amount, and currency exactly. It does not alter the referenced pool.

### Direct moral-public-goods pool

Creates a private submitted `mpgf_pool_proposals` record plus
`moral_trade_create_pool_terms`, which retains:

- one to ten strictly increasing cumulative thresholds;
- the exact deadline;
- base failure-bonus terms;
- early-contributor timing mode and exact terms;
- custom formula source, whitelisted AST, language version, SHA-256 hash, and
  variables where applicable;
- continuation behavior;
- public exact threshold visibility;
- the selected funding-progress visibility;
- requested Moral Trade failure-bonus share;
- any additional activation rule;
- underwriting and operator-review state.

The adapter deliberately does not project richer timing or custom-formula terms
into the existing percentage-only live reserve contract. The legacy proposal is
created with failure bonuses disabled while the exact sidecar remains pending
underwriting and review. This prevents a submitted formula from being mistaken
for an approved, backed, or payable promise.

## Authentication and idempotency

The browser stores an unsubmitted draft in same-origin `sessionStorage` before
redirecting to login. After authentication, `/trades/new?resume=create` restores
the draft.

Each draft has a stable `submissionKey`. The database takes transaction-scoped
advisory locks on the actor/key and actor/payload-hash pairs. Exact retries return
the original receipt. Reuse of a key for changed terms is rejected, and a payload
hash collision with different JSON is rejected.

The persistence function is service-role-only. Authenticated and anonymous
clients cannot invoke it directly. Owners may read their own receipts and
structured sidecars through RLS; outsiders cannot.

## Formula boundary

The browser formula workbench is preserved for immediate feedback. The server
parses the formula again using the same versioned, whitelisted expression
language and validates sampled finiteness, the `[0, 1]` range, and monotonicity in
time and rank. No `eval`, `Function`, SQL, arbitrary code, network data, random
input, or current-time function is permitted.

A valid formula is still only a reviewable proposal. It remains non-public and
non-payable until an independent review and underwriting path approves the exact
formula and reserves the resulting liability.

## Immutable terms

`moral_trade_create_pool_terms` cannot be updated or deleted after the linked
pool receives its first accepted pledge. Approved terms are also immutable. The
existing pool-visibility trigger independently prevents post-acceptance
transparency downgrades.

## Release gates

The release candidate must pass all of the following on one exact commit:

1. Transactional database regression against isolated MoralTrade QA.
2. Focused parser, validator, formula, source-contract, and route tests.
3. Full repository unit suite.
4. Full repository lint.
5. Production Next.js build.
6. `git diff --check` against the exact MPGF integration base.
7. Both Vercel Preview deployments in `READY` state for the exact head.
8. Fresh authenticated desktop and mobile browser flows covering creator,
   signed-out resume, durable receipt, custom-formula pool submission, and
   outsider denial.
9. Exact synthetic-data cleanup and a zero-residue query.
10. Production migration, deployment, and a read-only production smoke only
    after every preceding gate passes.

## Live-money boundary

This adapter does not enable custody, card or bank charging, contribution capture,
reserve capitalization, success-premium collection, refunds, failure-bonus
payouts, or public pledge acceptance. Those capabilities retain their existing
legal, payment-provider, fraud-control, reconciliation, reserve, and operator
release gates.
