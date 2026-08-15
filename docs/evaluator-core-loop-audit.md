# Evaluator-facing Moral Trade core-loop audit

This ledger covers the bounded isolated-QA assignment in issue #660. It is not
production acceptance and does not authorize a merge, deployment, participant
communication, public evidence, reputation effects, payment, custody, escrow,
payout, or money movement. Parent issue #154 remains a separate production
release gate.

## Exact-state boundary

- Authoritative base: `main` at
  `cafd13166f5537519d1ae3b8a440d7504df0294b`.
- Candidate branch: `codex/evaluator-core-loop-authenticated-20260813`.
- Draft PR: #687, which must remain open, draft, unmerged, and undeployed while
  this bounded proof is reviewed.
- Execution target: isolated Supabase QA project `hvmxfjjbdcgjjudmthdz` only.
- The live draft-PR body is authoritative for the latest exact head, workflow
  run, job, artifact ID, ZIP digest, local check counts, screenshot inspection,
  no-money counts, and zero-residue counts. A checked-in document cannot name
  the workflow run that is created only after that document's own commit.

The immediately preceding complete-loop proof ran at
`3e75fa7b62a76d493ef18bd6477b093f01e4826f`: workflow run `31865684640`
attempt 2, evaluator job `94968519493`, artifact `9242247979`, and artifact
SHA-256
`9dc4b3595ecf9ed2123cd7e4143fe16b49da3d500b9453ec59294da6cbc2bd67`.
That artifact proved the entire product loop, the authorization matrix, zero
money, and zero cleanup residue. The synchronized candidate based on
`cafd13166f5537519d1ae3b8a440d7504df0294b` is accepted only through the newer
exact-head run recorded in the live PR body.

## Final contract and coverage

| Stage | Final status | Executable proof |
| --- | --- | --- |
| Anonymous live discovery | Covered | Opens `/offers?mode=pledge&view=live`, scopes the exact QA owner card, asserts the combined terms heading, scrolls that card into the desktop viewport, and captures it |
| Exact offer and sign-in return | Covered | Opens the persisted QA offer, checks its unique safety disclaimer, exact URL, and encoded `/login` return target |
| Private response | Covered | A different signed-in participant submits the exact private response, sees the pending receipt, and captures that receipt in the mobile viewport; the outsider cannot see it |
| Atomic acceptance | Covered | One response becomes accepted, its competitor becomes declined, the offer closes, duplicate acceptance creates no second agreement, and the owner lands on the canonical agreement route |
| Frozen agreement | Covered | Exactly one version is retained; the terms hash and complete manifest hash are fixed; a stale version and direct mutation fail closed |
| Bilateral confirmation | Covered | Both participants confirm the same version; one confirmation remains proposed and the second activates the agreement |
| Private evidence | Covered | The responder submits one private attestation with no file or public URL; the exact bundle and item remain durable |
| Evidence authorization | Covered | SQL and direct Data API checks prove participant AAL1 access; assigned reviewer AAL1 denial; active assigned reviewer AAL2 access before and after review; active appeal-reviewer AAL2 access; revoked reviewer AAL2 denial; outsider denial; and active administrator AAL2 access |
| Neutral review | Covered | Both participants select the same eligible independent reviewer; the AAL2 route records one fixed-band review and one zero-dollar payout-basis row |
| Prospective exit | Covered | One participant ends future obligations under the frozen rule while version, confirmation, evidence, review, and system-message audit rows remain |
| Rendering and console | Covered | Seven route-specific screenshots cover desktop and mobile; every page checks overflow, framework overlays, document health, and captured console/page errors |
| No-money boundary | Covered | Maximum amount, payout due, performance-bond rows, and external-payment receipts are all exactly zero; no payment action is invoked |
| Cleanup | Covered | In-spec `finally` cleanup plus the workflow safety-net remove every exact application, Auth, MFA, private-account, review-role, notification, event, and email-outbox row; machine-readable counts must all be zero |

## Minimal repairs demonstrated by the evaluator

1. Acceptance now redirects to the created canonical agreement instead of the
   matched source offer.
2. Next.js actions whose successful state removes their own form use React
   action semantics and validated full-page redirect handling, avoiding both
   stale client state and the CSP-blocked manual-submit sentinel.
3. Route readiness uses exact URL and route-specific visible state rather than
   `networkidle`; the eight-minute cap and all downstream assertions remain.
4. Anonymous passive `open` and `dwell` recommendation signals return a
   non-storing `204`; preference mutations and authenticated-only operations
   remain protected.
5. The assigned reviewer keeps read-only private audit access after recording a
   decision, while the decision form remains actionable only in the proper
   state.
6. `can_read_trade_evidence_v1` keeps participant reads identity-bound at AAL1,
   but both initial and appeal assignment branches additionally require
   `current_actor_has_trade_role('reviewer')`. That predicate checks an active,
   non-revoked grant and JWT `aal2`. The administrator branch continues through
   the same active-AAL2 role helper.

## Deterministic authorization matrix

The rollback-only SQL test creates one private submitted bundle and item, runs
each RLS query as the `authenticated` Postgres role with explicit JWT claims,
records a review, exercises the appeal-assignment branch, revokes the reviewer
grant, asserts the matrix, and rolls the whole transaction back.

The Playwright test independently uses real isolated-QA Auth sessions and the
Supabase Data API:

| Actor/session | Bundle rows | Item rows |
| --- | ---: | ---: |
| Agreement participant, AAL1 | 1 | 1 |
| Assigned reviewer, AAL1 | 0 | 0 |
| Active assigned reviewer, AAL2, before decision | 1 | 1 |
| Active assigned reviewer, AAL2, after decision | 1 | 1 |
| Revoked assigned reviewer, still holding AAL2 token | 0 | 0 |
| Outsider | 0 | 0 |
| Active administrator, AAL2 | 1 | 1 |

Only counts and role/AAL labels enter the machine-readable summary; private
attestation text is not copied into the summary.

## Synthetic fixture and visual evidence

The fixture contains five short-lived QA identities: owner, responder,
outsider/competing respondent, independent reviewer, and administrator. The
reviewer and administrator receive only their required active role grants. The
offer and evidence say explicitly that they are synthetic, isolated, private,
non-production, and zero-dollar.

The artifact contains these viewport screenshots:

1. anonymous live-directory proposal card, desktop 1440×1000;
2. anonymous exact offer, desktop 1440×1000;
3. responder pending private-response receipt, mobile 390×844;
4. outsider agreement denial, mobile 390×844;
5. owner frozen zero-dollar milestone, desktop 1440×1000;
6. assigned reviewer private evidence and review receipt, desktop 1440×1000;
7. owner prospective-exit receipt with retained audit state, desktop 1440×1000.

Screenshots 1 and 3 explicitly scroll their asserted card/receipt into the
viewport and assert `toBeInViewport()` before capture, so the human-review
artifact directly shows the state attributed to each filename.

Screenshot 7 has a small cosmetic top-edge overlap between the green success
notice and the tan eyebrow text. The stage-critical exit receipt, cancelled
state, reason, retained-evidence count, and no-payment/custody boundary remain
fully legible; the overlap does not downgrade the core-loop proof.

## Durable workflow behavior

- The evaluator is no longer restricted to one PR head branch. It runs for any
  same-repository pull request that triggers the scoped workflow, or a manual
  dispatch that supplies the exact QA project confirmation.
- The database URL, TLS pooler host, port, database, project ref, publishable
  URL, required secrets, checkout SHA, and same-repository boundary remain
  fail-closed.
- Every run of the current workflow revision shares one repository-wide
  concurrency group with `cancel-in-progress: false`. The evaluator also waits
  for the broader exact-head release job, so the two writers inside one run are
  sequential.
- Stale pull-request heads can still execute an older workflow revision whose
  PR-scoped concurrency group does not join the repository-wide group. That
  demonstrated cross-revision shared-QA collision is tracked separately and
  must be operationally drained until every active writer inherits the current
  workflow revision.
- The complete evaluator retains its eight-minute Playwright timeout, strong
  locator assertions, clean-console requirement, in-test cleanup, external
  cleanup safety net, and artifact upload on failure.

## Remaining boundaries

Issue #660 may close only after the live PR body points to a successful
exact-head evaluator artifact that contains the complete authorization matrix,
seven inspected screenshots, zero-money counts, and machine-readable all-zero
cleanup. PR #687 remains draft and unmerged. No result here closes parent issue
#154 or authorizes production acceptance, a deployment, or any money behavior.
