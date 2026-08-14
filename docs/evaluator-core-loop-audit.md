# Evaluator-facing Moral Trade core-loop audit

This ledger covers the bounded execution assignment for issue #660. It is not
production acceptance and does not authorize a merge, deployment, participant
communication, public evidence, or money movement.

## Exact-state boundary

- Original pinned base: `ec6f1ecc12df5db74e3e2f8acb87c3f04aedae5b`.
- The initial drift gate stopped because current `main` had advanced.
- Issue #660 then authorized branch
  `codex/evaluator-core-loop-authenticated-20260813` at merge commit
  `013b9f0fa17438cf3a240e96db759d87b0cbe53c`, whose application tree includes
  then-current `main` `ec58787fb04211fc74b9419d063b2aa63fab944f`.
- `main` later advanced by three pooled-settlement privilege-hardening commits.
  The user explicitly authorized merging exact `origin/main`
  `04fd14fc9e86b79d82619bea97997da0b7a2deca`; the task branch now contains it
  through merge commit `5ede5c7b74301c7f098c2704cc7730e87c9e18ee`.
- Work is performed in an isolated worktree. The noisy iCloud checkout is not
  modified.

## Contract inventory

| Stage | Current classification | Authoritative contract | Evidence boundary |
| --- | --- | --- | --- |
| Public live discovery | Executable but uncovered | `src/app/offers/page.tsx` selects `offers.status = open`, applies `mode=pledge`, and renders exact live rows | The dedicated authenticated browser spec is written but has not run against isolated QA yet |
| Exact public terms | Executable but uncovered | `src/app/offers/[offerId]/page.tsx` loads the exact persisted offer and renders its terms | Runtime screenshot pending |
| Anonymous response gate | Executable but uncovered | The offer page links to `/login?returnTo=/offers/<id>#respond`; signed-out users do not receive a response form | Runtime URL and rendered-state assertion pending |
| Signed-in member response | Executable but uncovered | `expressInterestAction` requires a viewer, blocks self-response, upserts `(offer_id,user_id)`, and redirects with `Interest recorded.` | Runtime write/success assertion pending |
| Response privacy | Executable but uncovered | Offer-owner-only `listOfferResponses`; interests RLS limits selection to the respondent or offer owner | Three-role browser/RLS assertion pending |
| Response bridge and audit | Executable but uncovered | `bridge_core_interest_to_thread` creates a private thread/counterproposal/system message, `response_sent` event, owner notification, and email-outbox row | Domain/event query pending |
| Atomic acceptance | Executable and source/SQL covered | `accept_marketplace_interest_v1` locks the offer and response, checks actor/binding/state, creates at most one proposed agreement, declines competing responses, and closes the offer | Existing source test passes; live database assertion pending |
| Acceptance next action | Ambiguous pending rendered reproduction | `acceptInterestAction` receives `agreement.id` but currently redirects to the source offer; database notifications link to `/trade-agreements/<id>` | The new browser spec deliberately requires the canonical agreement URL and should reproduce the defect before repair |
| Claimed-guest acceptance | Executable for eligible legacy records, unavailable for new signed-out writes | `accept_marketplace_guest_interest_v1` is atomic; new public contact writes require sign-in | If member acceptance proves the redirect defect, the same minimal canonical redirect invariant must cover eligible claimed guests |
| Frozen agreement creation | Executable but uncovered end to end | `bridge_core_agreement_version` creates one immutable version, sets `current_version_id`, retains proposed status, and records private system messages/notifications | Runtime exact ID/hash assertion pending |
| Canonical participant route | Executable and downstream covered | `/trade-agreements/[agreementId]` requires authentication and `getCoreAgreementForUser` restricts data to proposer/responder | Existing downstream authenticated test covers denial; full-loop assertion pending |
| Version immutability | Executable but uncovered in this loop | Version RLS is participant-read-only; confirmation RPC rejects a non-current version | Runtime stale-confirmation and direct-update denial pending |
| Milestone manifest | Executable and downstream covered | Additive milestone RPC validates participant roles and zero-or-positive maximum amount; finalization hashes the ordered manifest into the complete version | Existing evidence tests cover downstream behavior; zero-dollar full-loop assertion pending |
| Bilateral confirmation | Executable but uncovered in this loop | `confirm_agreement_version_v2` binds `auth.uid()`, current version, complete manifest, and idempotent per-user confirmation; second confirmation activates | Runtime two-role assertion pending |
| Private evidence bundle | Executable and downstream covered | Performer-only open/add/submit RPCs keep bundle/items private and immutable after submission | Existing evidence tests cover the subsystem; attestation-only full-loop assertion pending |
| Neutral review | Executable and downstream covered | Both participants must nominate the same eligible non-participant reviewer; review route requires active reviewer role and AAL2; grade uses fixed confidence bands | Full-loop AAL2 browser assertion pending |
| Reviewer post-decision receipt | Ambiguous pending rendered reproduction | The review action redirects back to `/trade-review/<milestoneId>`, while that route currently treats an assigned initial reviewer as authorized only while the milestone is `under_review`; grading changes that status | The browser spec requires the truthful success receipt. Repair only if the live run reproduces a post-submit denial/dead end |
| Resulting commitment state | Executable but uncovered in this loop | Confirmation activates the agreement; review persists milestone, bundle, review, and zero-dollar payout-basis rows | Runtime state ledger pending |
| Exit and immutable receipt | Executable but uncovered in this loop | Unilateral exit records `trade_exit_requests`, cancels future obligations immediately, and leaves prior version/evidence/review rows | Runtime preservation assertion pending |
| Notifications/system history | Executable but uncovered in this loop | Response, agreement, confirmation, review, and exit paths use database-backed messages or notifications | Runtime counts and canonical href checks pending |
| Funnel event completeness | Ambiguous | `core_loop_events` records `response_sent`; the enum also names bilateral confirmation and evidence events, while the durable confirmation/evidence tables remain authoritative | Runtime event inventory must be reported literally; no new event write is authorized without a reproduced requirement gap |
| Non-financial boundary | Executable but uncovered in this loop | Fixture has no performance bond and milestone maximum is exactly zero; evidence is attestation-only; no external-payment action is invoked | Runtime rows and server-log scan pending |
| Desktop/mobile usability | Executable but uncovered | Dedicated spec uses 1440×1000 and 390×844, checks overflow/framework overlays/console, and captures stage screenshots | Manual artifact inspection pending |
| Zero-residue cleanup | Harness covered, environment unverified | Playwright `finally` invokes the exact cleanup SQL through a TLS/host/ref-guarded connection; external cleanup is intended as a second idempotent safety net | SQL execution and post-cleanup zero counts pending |

## Current deterministic QA fixture

The fixture uses four synthetic accounts: the three required roles (owner,
responder, outsider) plus a separate neutral reviewer because the reviewer
cannot legally be either agreement participant. All IDs are fixed and scoped to
this test:

- owner: `81000000-0000-4000-8000-000000000001`;
- responder: `81000000-0000-4000-8000-000000000002`;
- outsider/competing respondent: `81000000-0000-4000-8000-000000000003`;
- independent reviewer: `81000000-0000-4000-8000-000000000004`;
- QA-only offer: `82000000-0000-4000-8000-000000000001`.

The offer says explicitly that it is synthetic isolated QA, creates no real
obligation, uses no production data, and has a maximum financial amount of
zero. The evidence path uses a private synthetic attestation with no file or
external URL.

## Pre-runtime verification completed

At the pre-reconciliation candidate base
`013b9f0fa17438cf3a240e96db759d87b0cbe53c`, with only the
new uncommitted QA artifacts present:

- tracked-diff and explicit no-index whitespace checks for every new artifact:
  passed;
- `npm test`: 894 passed, 0 failed;
- `npm run lint`: passed with 0 errors and 3 unrelated existing warnings;
- `npm run lint -- --quiet`: passed;
- `npx tsc --noEmit --pretty false`: passed;
- `npm run build`: passed;
- `npx playwright test tests/evaluator-core-loop-authenticated.spec.ts --list`:
  one test discovered and compiled;
- `node --import tsx --test src/lib/marketplace-delta-contract.test.ts`: 7
  passed, 0 failed.

These checks prove only source/build integrity. They do not substitute for the
required isolated-QA browser, database, authorization, screenshot, no-money,
and cleanup evidence.

These checks must be rerun at the final candidate after the authorized
current-main merge and any demonstrated repair.

## Authorized protected boundary

The remaining executable proof needs a same-repository, manually approved QA
run with `QA_SUPABASE_DB_URL` and `QA_SUPABASE_SERVICE_ROLE_KEY` scoped only to
Supabase project `hvmxfjjbdcgjjudmthdz`. The user explicitly authorized adding
or minimally extending and running that draft-PR workflow. The workflow must
retain its exact project-ref, TLS pooler-host, same-repository, cleanup, and
artifact guards. No production or Vercel credential is needed or authorized.
