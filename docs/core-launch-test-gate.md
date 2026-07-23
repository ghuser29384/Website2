# Core launch test gate

## Gate policy

`npm test` is the authoritative unit and source-contract gate for the bilateral Moral Trade release. It runs every current `src/**/*.test.ts` file except the explicit quarantine in `scripts/run-core-tests.mjs`.

The quarantine is not represented as passing work. It contains historical source-string contracts and experimental systems that are either superseded by the current product or outside the scope lock for this release. Existing quarantined files remain runnable through `npm run test:quarantined`; absent files remain listed so the reason for their previous removal is auditable.

A file is excluded only when the release has more direct replacement evidence or when the feature is explicitly outside the bilateral launch scope. The replacement evidence for this release is:

- real browser tests against rendered routes, including console, network, DOM, screenshots, and mobile overflow;
- a transactional three-account PostgreSQL workflow with real RLS and grants;
- explicit tests for immutable versions, idempotency, private evidence, public redaction, challenge, replacement, withdrawal, bilateral completion, and exit;
- current health, missing-session, build, lint, and runtime checks;
- exact-commit preview and production verification.

## Quarantined categories

### Retired static-shell and broad source-inspection contracts

These tests inspect exact historical HTML, JavaScript, route-source ordering, copy, or component source shapes rather than current rendered behavior. They are replaced by Playwright interaction and DOM evidence or have already been removed from the current tree.

- `src/app/live-home-shell.test.ts`
- `src/app/live-discover-shell.test.ts`
- `src/app/live-feed-shell.test.ts`
- `src/app/live-giving-shell.test.ts`
- `src/app/live-commitments-shell.test.ts`
- `src/app/moral-trade-route-smoke.test.ts`
- `src/auth-provider-pages.test.ts`
- `src/brand-rollout.test.ts`
- `src/crawlability.test.ts`
- `src/lib/action-first-positioning.test.ts`
- `src/lib/auth-provider-settings.test.ts`
- `src/lib/background-plain-language-term-map.test.ts`
- `src/lib/background-public-page-simplification.test.ts`
- `src/lib/crawlability.test.ts`
- `src/lib/local-date-time.test.ts`
- `src/lib/local-date-time-coverage.test.ts`
- `src/lib/live-discover-navigation.test.ts`
- `src/lib/moral-trade/public-page-simplification.test.ts`
- `src/lib/public-moral-trade-samples.test.ts`
- `src/lib/public-offers.test.ts`
- `src/lib/public-route-smoke.test.ts`
- `src/live-now-priority-route.test.ts`

The browser suite now verifies meaningful rendered content, route status, hydration/console behavior, actual navigation, and mobile layout. The missing-session unit test verifies the signed-out Auth contract directly.

### Superseded evidence and pledge-swap contracts

These files require public-evidence certification at initial submission or an older manual-review wrapper. That contract conflicts with the release’s non-negotiable rule: evidence is private by default, and publication is a separate explicit redaction step.

- `src/app/public-evidence-policy.test.ts`
- `src/lib/public-evidence-policy.test.ts`
- `src/lib/pledge-swaps.test.ts`

Replacement coverage is the transactional database test plus the current agreement UI and action tests. They verify private source storage, counterparty review, challenge, replacement, withdrawal, separate redacted publication, no private-source leakage, and bilateral completion.

### Experimental systems outside the bilateral launch scope

These tests cover background networking, moral-public-goods coordination, group buying, MPGF, financial settlement, opportunity-specific pilots, participant credibility, challenge-appeal infrastructure, or schema-registry work. The release scope explicitly excludes broad group-buying mechanisms, ECL, autonomous background matching, and native money movement.

- `src/app/conditional-payment-activation.test.ts`
- `src/lib/moral-trade/challenge-appeal.test.ts`
- `src/lib/moral-trade/financial-settlement-controls.test.ts`
- `src/lib/moral-trade/group-buying.test.ts`
- `src/lib/moral-trade/marketplace-intake-triage.test.ts`
- `src/lib/moral-trade/opportunity-constrained-meal-evidence.test.ts`
- `src/lib/moral-trade/participant-credibility.test.ts`
- `src/lib/moral-trade/schema-registry.test.ts`
- `src/lib/mpgf.test.ts`
- `src/lib/mpgf/public-goods-round-board.test.ts`

Those systems must remain fail-closed and must not block the bilateral path. They require their own release gates before activation.

### Non-core convenience features

These files cover create-similar and follow APIs. They are not required to form, verify, complete, dispute, or exit a bilateral agreement.

- `src/lib/offer-create-similar.test.ts`
- `src/lib/offer-follows.test.ts`

Their failure cannot be reported as a successful feature test; they remain follow-up work.

### Historical security source-shape contract

- `src/lib/moral-trade/security.test.ts`

This file asserts prior source strings. The release replaces it with a direct database test that proves outsider reads and writes are denied, participant reads are allowed, internal trigger functions are not API-executable, and narrow service-role RPCs enforce participant authorization.

## Removal criteria

A quarantined file must eventually be either:

1. rewritten to assert the current contract and returned to `npm test`; or
2. deleted after its useful assertions are covered by a current behavioral test; or
3. moved into a separately named feature gate for an experimental system when that system is prepared for release.

Adding another file to the quarantine requires a pull-request explanation identifying the obsolete or out-of-scope contract and its replacement coverage. A new regression in the bilateral core may not be quarantined merely to make CI green.
