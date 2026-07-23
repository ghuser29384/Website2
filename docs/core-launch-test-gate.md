# Core launch test gate

## Gate policy

`npm test` is the authoritative unit and source-contract gate for the bilateral Moral Trade release. It runs every current `src/**/*.test.ts` file except the explicit quarantine below.

The quarantined files remain in the repository for migration or deletion in follow-up work. They are not silently treated as passing. The previous main-branch baseline reported 54 failures concentrated in these files; most assert retired static-shell strings, superseded route paths, or old component source shapes rather than current user behavior.

The quarantine is acceptable only while the release has stronger replacement coverage for the affected core behavior:

- real browser tests on rendered routes rather than static source-string inspection;
- a transactional three-account PostgreSQL workflow with RLS and grants enabled;
- explicit private-evidence and public-redaction tests;
- current health, authentication, and runtime checks;
- exact-commit production build and lint gates.

## Quarantined files

| File | Reason it is excluded from the launch gate | Replacement coverage |
|---|---|---|
| `src/app/live-home-shell.test.ts` | Asserts retired encoded home-shell strings and a superseded entry-point contract. | Desktop/mobile Playwright home interaction and DOM evidence. |
| `src/app/live-discover-shell.test.ts` | Asserts historical Discover shell source text and old navigation wiring. | Rendered `/offers` and `/discover` smoke tests plus current query tests. |
| `src/app/live-feed-shell.test.ts` | Asserts an obsolete embedded feed payload and old terminology. | Current feed route/browser QA; not part of the bilateral mutation state machine. |
| `src/app/live-giving-shell.test.ts` | Asserts legacy giving-shell copy and old donation-control strings. | Every.org connector remains fail-closed; focused connector tests run elsewhere. |
| `src/app/live-commitments-shell.test.ts` | Asserts the former commitments shell source rather than current agreement records. | Transactional agreement, evidence, completion, and exit workflow. |
| `src/app/conditional-payment-activation.test.ts` | Expects a superseded donation activation wrapper and route source shape. | Conditional-payments CI plus current donation RPC tests; native money movement remains disabled. |
| `src/app/moral-trade-route-smoke.test.ts` | Static source inspection duplicates and conflicts with rendered route behavior. | Canonical-host-compatible Playwright route, console, network, and screenshot evidence. |
| `src/app/public-evidence-policy.test.ts` | Mixes valid privacy helpers with stale component-source and legacy action assertions. | Transactional private-default evidence, counterparty review, replacement, withdrawal, and public-safe projection tests. |
| `src/auth-provider-pages.test.ts` | Expects obsolete auth-provider page source strings. | Actual signup/login browser flow and missing-session regression tests. |
| `src/brand-rollout.test.ts` | Checks historical brand markup across files and is not release-critical behavior. | Rendered desktop/mobile visual QA and accessibility snapshots. |
| `src/crawlability.test.ts` | Asserts a superseded crawlability implementation and static route set. | Current build output and targeted production route/status checks. |
| `src/lib/local-date-time.test.ts` | Expects the former implementation source shape rather than rendered time behavior. | Browser hydration/console checks on evidence and agreement pages. |
| `src/lib/live-discover-navigation.test.ts` | Expects retired example URLs and legacy navigation markers. | Rendered offer search/detail navigation in Playwright. |
| `src/lib/public-moral-trade-samples.test.ts` | Expects legacy sample labels and old CTA routing. | Truthful empty/public-evidence browser states and transactional public projection test. |

## Removal criteria

A quarantined file must be either:

1. rewritten to assert the current contract and returned to `npm test`; or
2. deleted after its useful assertions are covered by a current test.

Adding another file to the quarantine requires a pull-request explanation identifying the obsolete contract and its replacement coverage. A new product regression may not be quarantined merely to make CI green.
