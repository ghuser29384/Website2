# Evaluator Core Loop — Run-Owned QA Audit

## Status

- **Issue:** #809.
- **Candidate:** Q, repository-only evaluator harness.
- **Selected base:** `26d1fe436dbf9a4440bfafd501ddf8db944a1127`.
- **Base tree:** `47fe96dfc881f1c57dea711283fc3db36a44e053`.
- **Execution target:** the exact TLS-only isolated-QA project `hvmxfjjbdcgjjudmthdz`.
- **Merge state:** not authorized.
- **Runtime, production, provider, payment, participant, and research effect:** none.

## Authority

This candidate implements the Q boundary from the merged Commitments source of truth and issue #809. It reuses the run-owned namespace and exact-cleanup architecture accepted through merged PR #733, while replacing the preserved PR #722 evaluator fixture’s fixed identities and broad cleanup.

## Objective

Provide a permanent, read-only GitHub Actions harness that can safely prove the zero-dollar evaluator/core-loop lifecycle on an exact Q+R proof candidate without allowing one run, stale branch, or cleanup routine to discover or mutate another run’s synthetic data.

## Decisions

1. Q contains only the ten manifest-listed QA and audit paths.
2. Six distinct run-owned identities are derived from repository, workflow, run ID, run attempt, and QA project reference:
   - owner/payer;
   - responder/payee;
   - initial reviewer;
   - appeal reviewer;
   - outsider;
   - administrator.
3. Initial and appeal reviewers are never the same Auth user, profile, session, refresh token, or MFA factor.
4. The evaluator uses a dedicated run-owned `milestone-appeal` object rather than reusing a payment appeal identifier.
5. Preflight is read-only. Residue blocks the run before mutation.
6. Fixture creation never deletes, thaws, or repairs earlier state.
7. Cleanup is exact, ownership-aware, dependency-ordered, idempotent, and repeated.
8. Prefixes, `LIKE`, first-N selection, global ordering, recency, and inferred ownership are prohibited.
9. Service-role access may create and remove the isolated-QA fixture, but browser and Data API authorization assertions use the exact participant/reviewer roles.
10. Q is repository-only. Initial R owns runtime and RLS semantics; proof-only I combines the exact Q and R heads but never merges.

## Scope

1. `.github/workflows/evidence-payment-release-qa.yml`
2. `scripts/evidence-payment-qa-namespace.mjs`
3. `scripts/evidence-payment-qa-namespace.test.mjs`
4. `scripts/evaluator-core-loop-qa-run-ownership.test.mjs`
5. `supabase/tests/evaluator_core_loop_browser_preflight.sql`
6. `supabase/tests/evaluator_core_loop_browser_fixture.sql`
7. `supabase/tests/evaluator_core_loop_browser_cleanup.sql`
8. `supabase/tests/evaluator_core_loop_evidence_authorization.sql`
9. `tests/evaluator-core-loop-authenticated.spec.ts`
10. `docs/evaluator-core-loop-audit.md`

## Non-goals

Q does not:

- implement the product runtime;
- add or apply a production migration;
- create a Preview or production deployment;
- call a payment or donation provider;
- create a bond, receipt, mandate, capture, refund, transfer, custody balance, payout, or bonus;
- contact, recruit, or enroll participants;
- collect consent or execute research;
- calibrate reliability;
- identify additionality;
- activate learned ranking or public credibility;
- authorize its own merge.

## Run identity contract

The namespace manifest must bind:

```text
repository
workflow_ref
run_id
run_attempt
qa_project_ref
namespace_handle
namespace_sha256
six role IDs and emails
all exact object IDs
```

The manifest is non-secret and reproducible. Passwords, TOTP secrets, cookies, access tokens, refresh tokens, database credentials, and provider credentials are excluded.

## Preflight contract

The preflight performs only exact `SELECT count(*)` queries over the current namespace. It contains no `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, DDL, prefix, pattern, order, limit, or inferred-discovery operation.

Any nonzero count produces `blocked_residue_before_mutation`. The workflow must not clean and continue.

## Fixture contract

The fixture:

- creates exactly six Auth users and identities;
- writes the namespace marker into user metadata;
- creates six profiles;
- grants reviewer roles only to the two reviewers and administrator role only to the administrator;
- creates one exact zero-dollar offer;
- uses one ephemeral password generated inside the job;
- does not create payment/provider objects;
- does not repair previous state.

## Authorization proof

The rollback-only SQL proof verifies:

- participant AAL1 read;
- assigned initial reviewer AAL1 denial;
- assigned initial reviewer AAL2 read before decision;
- retained initial-reviewer AAL2 audit after decision;
- distinct assigned appeal-reviewer AAL2 read;
- immediate denial after appeal-reviewer role revocation, even with an existing AAL2 token;
- outsider denial;
- administrator AAL2 read;
- zero durable rows after rollback.

## Browser proof

The exact production build must exercise:

1. signed-out directory and exact offer;
2. responder private interest submission;
3. owner atomic acceptance;
4. canonical RPC-returned agreement navigation;
5. competing-response decline and stale acceptance denial;
6. frozen terms and bilateral confirmation;
7. private evidence submission;
8. initial reviewer AAL1 denial and AAL2 action;
9. distinct appeal reviewer AAL2 action;
10. retained initial-reviewer read-only audit;
11. role revocation;
12. outsider denial;
13. administrator AAL2 path;
14. prospective unilateral exit;
15. exactly one exit POST, HTTP `303`, same-agreement navigation, cancelled state, and no stuck pending control.

Rendered evidence must cover desktop and mobile and check visibility, overflow, console errors, page errors, unexpected same-origin failures, duplicate mutation, and final state.

## No-money boundary

The evidence must prove exact zero for:

```text
maximum financial amount
performance bonds
external payment receipts
provider requests
payment methods
mandates
charges
captures
refunds
transfers
custody balances
payouts
platform-funded bonuses
```

A zero-value financial row still fails.

## Cleanup contract

Cleanup enumerates and removes only exact current-namespace rows, including application, evidence, review, appeal, exit, notification, event, profile, private-account, Auth identity/session/refresh/MFA, and outbox records. It runs twice and both postflight results must be zero.

## Failure states

- `blocked_wrong_target`
- `blocked_missing_secret`
- `blocked_head_or_base_mismatch`
- `blocked_namespace_collision`
- `blocked_residue_before_mutation`
- `blocked_static_identity`
- `blocked_authorization_failure`
- `blocked_browser_failure`
- `blocked_money_or_provider_object`
- `blocked_cleanup_residue`
- `blocked_artifact_secret`

A later quiet run does not erase a failure. The root cause must be identified and the affected plus upstream identity/no-money/cleanup gates rerun on a new exact head.

## Evidence boundary

Passing Q or proof-only I establishes software behavior in one synthetic isolated-QA execution. It does not establish ordinary-user comprehension, adoption, feasibility, reliability calibration, causal additionality, impact, payment readiness, or free-rider mitigation.

## Implementation implications

- Q may merge only after exact-head Q/R/I evidence, independent review, and fresh owner authorization.
- Initial R and I remain unmerged.
- After Q merges, final R must be reconstructed from the then-current Q-containing `main` and rerun under the permanent harness.

## Review requirements

Independent review must inspect:

- exact base/head/tree and ten-path diff;
- namespace derivation and collision resistance;
- preflight read-only guarantee;
- fixture exactness;
- cleanup exactness and two-pass result;
- SQL role matrix;
- browser and rendered evidence;
- no-money output;
- artifact secret scan;
- absence of production/provider/participant effects;
- proof-only I nonmergeability.
