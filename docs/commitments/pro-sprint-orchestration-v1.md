# Commitments Pro Sprint Orchestration v1.1

## Status

- **Issue:** #755.
- **Materialization source base:** `7e993158363710e5fe2c3eaa1cbccdb5cd56c235`.
- **Implementation base:** unresolved until implementation start; the historical source base must not be reused if stale.
- **Current phase:** repository-only materialization and review.
- **Runtime, merge, migration, deployment, recruitment, and study authorization:** none.

## Base-selection invariant

Before Q or R is created:

1. read live `main`;
2. inspect all 23 Q/R paths and overlapping open PRs;
3. choose one immutable fresh `main` SHA;
4. create both Q and initial R directly from that same SHA;
5. record the SHA and tree in both PRs and the proof-only I manifest.

A stale source-materialization SHA is evidence, not an implementation base.

## Exact sequence

### Phase S — source-of-truth materialization

Validate the exact repository-only diff, machine contracts, workflow, SHA-256 artifact, release classification, and substantive review. Keep draft and unmerged pending a separate owner disposition.

### Phase Q — run-owned evaluator harness

Exact 10-path allowlist:

- `.github/workflows/evidence-payment-release-qa.yml`
- `scripts/evidence-payment-qa-namespace.mjs`
- `scripts/evidence-payment-qa-namespace.test.mjs`
- `scripts/evaluator-core-loop-qa-run-ownership.test.mjs`
- `supabase/tests/evaluator_core_loop_browser_preflight.sql`
- `supabase/tests/evaluator_core_loop_browser_fixture.sql`
- `supabase/tests/evaluator_core_loop_browser_cleanup.sql`
- `supabase/tests/evaluator_core_loop_evidence_authorization.sql`
- `tests/evaluator-core-loop-authenticated.spec.ts`
- `docs/evaluator-core-loop-audit.md`

Q uses merged PR #733 primitives; prohibits fixed cross-run identities, preflight deletion, broad/prefix cleanup, first-N/global-order discovery, runtime imports, production data, provider calls, and money. Q is repository-only.

### Phase R0 — initial runtime extraction

Exact 13-path allowlist:

- `src/app/actions.ts`
- `src/app/api/live-now/feedback/route.ts`
- `src/app/api/live-now/feedback/route.test.ts`
- `src/app/trade-review/[milestoneId]/page.tsx`
- `src/components/core-trade/full-navigation-action-form.tsx`
- `src/components/core-trade/trade-agreement-stage-base.tsx`
- `src/components/core-trade/trade-milestone-workflow.tsx`
- `src/components/marketplace/participant-offer-group.tsx`
- `src/lib/evidence-weighted-payment-lifecycle.test.ts`
- `src/lib/marketplace-delta-contract.test.ts`
- `src/lib/trade-evidence-reviewer-rls-contract.test.ts`
- `supabase/migrations/20260814050000_trade_evidence_assigned_reviewer_rls.sql`
- `supabase/migrations/20260815010000_trade_evidence_reviewer_role_aal2.sql`

R preserves the accepted zero-dollar lifecycle and two additive RLS migrations. It is draft and not merge-eligible before Q is separately authorized and merged.

### Phase I — proof-only integration

Conventionally merge exact Q and initial R. The exact union is 23 disjoint paths. Run source, database, Auth/RLS, browser, rendered, no-money, cleanup, and artifact-secrecy gates. Independently review Q, R, and I. Never merge I.

### Q decision, final R, UAT, release, oversight, and Cohort A

A separate owner decision is required before Q merge. If authorized, merge unchanged Q with an expected-head guard; reconstruct final R from Q-containing live `main`; rerun exact-head gates; run the machine-governed protected owner UAT; then obtain separate runtime, migration, production, ethics, staffing, privacy, and recruitment authorizations.

## Stop conditions

Stop rather than weaken assertions on source drift, path overlap, namespace residue, production/real data, provider/money activity, authorization leakage, term mutation, duplicate lifecycle mutation, exit failure, private-evidence exposure, secret leakage, learned-ranking/public-score activation, unsupported causal copy, or incomplete cleanup.

## Non-goals

This sequence does not combine PR #718, PR #722, PR #635, PR #534, PR #691, PR #705, DAC, Compact, Payment, Upgrade, Redirect, Co-Fund, Co-Act, Threshold Sign-On, learned ranking, public credibility, or causal impact into one release.
