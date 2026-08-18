# Moral Trade Commitments Pro Sprint — Source of Truth v1.1

## Status

- **Issue:** #755.
- **Release class:** repository-only specification and validation package.
- **Materialization source base:** `main@7e993158363710e5fe2c3eaa1cbccdb5cd56c235`, tree `e5283317d448e35106ca0179a267b20087ce0492`.
- **Implementation base rule:** the source base above is historical evidence, not a permitted stale base for Q or R. Q and initial R must be created from the same freshly revalidated live `main` selected at implementation start.
- **Runtime, database, provider, payment, deployment, recruitment, consent, or study effect:** none.
- **Merge authorization:** none; keep the pull request draft and unmerged.

This document consolidates the governing decisions from the Commitments Pro Sprint. It supersedes dated handoffs, stale assistant summaries, and branch bodies where they conflict with current GitHub state or the closed contracts below.

## Authority and precedence

1. Latest explicit owner decision.
2. Current live GitHub state and exact immutable evidence.
3. This source-of-truth document and the machine contracts in this package.
4. Reviewed normative content from relevant issues and draft pull requests.
5. Conceptual and external empirical sources, labeled by evidence class.
6. Older handoffs, dated audits, local logs, simulations, and assistant summaries.

Current source disposition at materialization:

- PR #733 is merged and supplies run-owned namespace isolation, two-writer Auth/database non-interference, exact ownership cleanup, and artifact-secrecy boundaries.
- PR #747 supplies the fail-closed learned-ranking readiness boundary; later `main` advances do not activate learned ranking.
- PR #722 is preserved as the reviewed bilateral-core-loop source with final disposition `split before merge`; it must not be extended or merged as one mixed candidate.
- PR #718 remains stale and substantively unaccepted; it is not the founding-pilot critical path.
- PR #635 is a broad private-shadow source of evidence-decision semantics, not a current-main merge candidate.
- PR #534 is an impact-accounting and methodology-governance source, not an active methodology.
- PR #691 remains a fail-closed research-eligibility blocker register.
- PR #705 is prior-driven research and not empirical calibration.

## Global invariants

1. Factual fulfillment is not causal additionality.
2. Evidence that an action occurred does not establish that Moral Trade caused it.
3. Decision confidence, evidence provenance, completion fraction, and payout factor are separate quantities.
4. Weak or incomplete evidence is not misconduct.
5. Deliberate fabrication or impersonation requires explicit evidence, a higher standard, and independent second review.
6. Contextual reliability is role-, action-, evidence-, duration-, and deal-context specific.
7. Contextual reliability has no public numerical score, default-ranking, minimum-score eligibility, payment, restriction, safeguard, or exposure-suppression effect before separate empirical activation.
8. Safety and eligibility are non-compensatory; positive history cannot cancel a threat, coercion, identity, privacy, or severe-integrity restriction.
9. Additionality is an offer-, trade-, policy-, or subgroup-level causal question by default, not a permanent property of a participant.
10. Participant-specific causal credit remains disabled.
11. Raw evidence remains private and purpose-limited.
12. Appeals and permissible exits do not themselves lower reliability.
13. Product exit and research withdrawal are distinct.
14. Platform or sponsor money is not participant-caused impact.
15. Baseline-redirected resources are not new money.
16. Direct causal attribution and cooperative allocation are alternative lenses and are never summed.
17. Public copy distinguishes known, inferred, and unknown claims.
18. Synthetic tests, protected owner UAT, prior-driven models, and conceptual papers are not real-user calibration or causal evidence.
19. The project does not self-classify the founding pilot as exempt human-subjects research.
20. No recruitment occurs before a qualified written determination and every launch gate passes.

# Part I — Trust Resolution v3

One universal “credit score” is replaced by four mechanically separate objects.

## Factual Outcome Record

Target question:

> Under the exact frozen terms, what occurred, in what native quantity, and how was the decision reached?

Required concepts include agreement/version/claim identity, obligated role, exact terms and evidence-rule hashes, native target and completion quantity, completion fraction, provenance, coverage, missingness, contradiction, adjudication, confidence, finality, lineage, integrity, settlement, privacy, retention, and deletion.

Pending or unresolved cases do not create numerical reliability observations. Permissible exits and force majeure are excluded from fulfillment rates.

## Contextual Reliability Record

Target question:

> Given comparable, independently resolved past factual outcomes, what can be said about future acceptable completion in this context?

The five dimensions are fulfillment, evidence integrity, settlement, dispute conduct, and responsiveness. Existing runtime/database identifiers use the legacy key `fulfilment`; implementation must preserve an explicit alias between the prose term `fulfillment` and legacy key `fulfilment` until a separately reviewed migration changes the stored identifier.

Absence of history means `Unproven`, not bad. No numerical output becomes active until real, independent, out-of-time evidence passes the separate calibration protocol. A 200-case sample may support an internal candidate; at least 300 independently resolved decisions plus per-band labels, calibration, subgroup, Brier, reproduction, privacy, and activation gates are required before activation review.

## Additionality Assessment

Target question:

> What changed because of the offer, trade, or policy relative to a defined no-offer state?

Closed statuses include `not_assessed`, `baseline_attested_only`, `baseline_supported_observational`, `experiment_supported_policy_effect`, `participant_specific_effect_not_identified`, `marketplace_created_or_escalated_baseline`, and `excluded_or_blocked`.

A prospective baseline should be frozen before exact offer exposure where feasible. Post-exposure worsening cannot increase credit. Provider receipts, witnesses, and reviews establish occurrence only. Numerical estimates require an exact estimand, unit, population, treatment, comparison, time window, outcome, design class, uncertainty, missingness, interference, positivity, and transportability limits.

## Safety and Eligibility Status

This is a separate veto/review plane for threats, extortion, coercion, retaliation, account compromise, identity duplication, impersonation, forged evidence, harmful baseline escalation, third-party harm, unlawful conduct, privacy disclosure, payment abuse, vulnerability, and serious process-integrity failure.

Closed states are `eligible`, `review_required`, `temporarily_paused`, `restricted`, and `ineligible`. Restrictions are source-bound, scoped, time-aware, appealable, and non-compensatory.

# Part II — Zero-dollar bilateral founding pilot

## Purpose and cohorts

The first real-user program asks only whether a small number of adults can understand, voluntarily enter, complete, evidence, review, challenge, appeal, and exit one bounded bilateral reciprocal pledge, and whether the product and operations are feasible.

- Cohort A: 4 dyads / 8 adults, moderated usability.
- Cohort B: 8–12 additional dyads / 16–24 adults, operational feasibility.
- The A→B decision occurs only after all four Cohort A dyads have a terminal or explicitly unresolved closeout and every hard safety/privacy criterion is reviewed.
- A quantitative post-B progression judgment requires at least 8 terminal dyad records across the program. This floor does not block the earlier qualitative A→B decision.

The pilot does not estimate adoption at scale, product-market fit, reliability calibration, causal additionality, impact, Payment readiness, DAC effectiveness, or free-rider mitigation.

## Scope

Adults only; targeted private recruitment; digital non-sensitive public-interest tasks; 30–90 minutes normally and never over 120 minutes; maximum 14 days; zero spending; zero payment/provider object; exact terms; separate product/research consent; at least 15 minutes cooling-off; seven-item comprehension; private raw evidence; day-7/day-30 follow-up.

Health, treatment, diet, medication, sleep, exercise, political voting/donations, religious conversion, sexual/romantic conduct, illegal/harassing action, violence/self-harm, credentials, high-stakes professional advice, employment, grades, housing, immigration, healthcare, caregiving, essential-support leverage, private third-party data, money-dependent actions, and nested mechanisms are excluded.

The v1 obligation library is limited to nine reviewed digital templates. No ad hoc task enters Cohorts A or B.

# Part III — Q / initial R / proof-only I reconstruction

The mixed PR #722 must be split. The materialization source SHA is not the implementation base. At implementation start, revalidate live `main`, inspect overlap on every Q/R path, choose one exact fresh base, and create Q and initial R from that identical base.

## Q — repository-only evaluator harness

Exact paths:

```text
.github/workflows/evidence-payment-release-qa.yml
scripts/evidence-payment-qa-namespace.mjs
scripts/evidence-payment-qa-namespace.test.mjs
scripts/evaluator-core-loop-qa-run-ownership.test.mjs
supabase/tests/evaluator_core_loop_browser_preflight.sql
supabase/tests/evaluator_core_loop_browser_fixture.sql
supabase/tests/evaluator_core_loop_browser_cleanup.sql
supabase/tests/evaluator_core_loop_evidence_authorization.sql
tests/evaluator-core-loop-authenticated.spec.ts
docs/evaluator-core-loop-audit.md
```

Q uses merged PR #733 run-owned namespace primitives and distinct owner, responder, initial-reviewer, appeal-reviewer, outsider, and administrator identities. It contains no application runtime, production migration, provider, payment, or deployment behavior. Preflight detects exact residue and never deletes it. Cleanup is exact, ownership-aware, idempotent, failure-safe, and proves zero residue twice. Fixed cross-run IDs/emails, first-N/global-order discovery, and prefix cleanup are prohibited.

## Initial R — runtime extraction

Exact paths:

```text
src/app/actions.ts
src/app/api/live-now/feedback/route.ts
src/app/api/live-now/feedback/route.test.ts
src/app/trade-review/[milestoneId]/page.tsx
src/components/core-trade/full-navigation-action-form.tsx
src/components/core-trade/trade-agreement-stage-base.tsx
src/components/core-trade/trade-milestone-workflow.tsx
src/components/marketplace/participant-offer-group.tsx
src/lib/evidence-weighted-payment-lifecycle.test.ts
src/lib/marketplace-delta-contract.test.ts
src/lib/trade-evidence-reviewer-rls-contract.test.ts
supabase/migrations/20260814050000_trade_evidence_assigned_reviewer_rls.sql
supabase/migrations/20260815010000_trade_evidence_reviewer_role_aal2.sql
```

Initial R preserves canonical atomic acceptance using the RPC-returned agreement ID; write-free anonymous passive telemetry; locked Next redirect compatibility; distinct initial and appeal reviewers; retained read-only audit; participant AAL1; assigned reviewer and administrator AAL2; bilateral frozen terms; prospective unilateral exit; and zero-dollar noncustodial behavior.

## I — proof-only integration

I conventionally combines exact Q and initial R only to run source, database, Auth/RLS, browser, rendered, no-money, cleanup, and artifact-secrecy gates. Q and R path sets are disjoint; I's intended union is exactly 23 paths. I is never a merge candidate.

After independent review, a separate owner decision is required before Q can merge. Final R is reconstructed from the new Q-containing `main`; proof-only I and initial R do not become merge-ready automatically.

# Part IV — Protected owner UAT and release

The machine contract `zero-dollar-owner-uat-release-contract.v1.json` governs exact acceptance.

Owner UAT uses operator, Participant A, Participant B, initial reviewer, appeal reviewer, outsider, and administrator; four exact viewport classes; thirteen stages; seven comprehension items for each participant; exact lifecycle counts; zero financial/provider objects; private evidence; distinct appeal review; immediate revocation; prospective exit; two-pass zero residue; and secret-scanned artifacts.

A passing UAT yields only `uat_pass_not_pilot_authorized`. The release state machine runs from specification through Q, initial R, I, Q decision, final R, UAT, expected-head merge, production preflight/release/postflight, recruitment readiness, and pilot launch. No state may be skipped. Migrations are additive/forward-only; rollback redeploys the previous compatible application rather than rewriting migration history.

# Part V — Pilot operations and oversight

A qualified written determination must address authority, human-subjects status, review category, consent, identity, recruitment, compensation, privacy, retention, incidents, amendments, cross-border conditions, and training. The project does not self-designate exemption.

Required functions include Pilot Director, Safety Officer, Privacy/Data Steward, Facilitator Lead, facilitators, Reviewer Lead, initial reviewer, appeal reviewer, Technical Operator, Recruitment Coordinator, Methods Reviewer, and an independent ethics/human-subjects reviewer.

Initial reviewer differs from appeal reviewer; the facilitator is not sole reviewer of their dyad; the founder cannot override a hard stop; the Pilot Director cannot be sole safety/progression authority; the Technical Operator has no ordinary raw-evidence access.

A dyad activates only when primary and backup support, Safety, and Technical pause contacts are available and no deadline expires during uncovered hours. Recruitment is targeted/private, with independent power/coercion screens. Government ID is not the default.

Any research compensation is fixed, disclosed, sponsor-funded, outside the Moral Trade ledger, and independent of matching, acceptance, completion, evidence, challenge, appeal, or continued enrollment. Trade consideration remains zero.

Product and research consent are separate, versioned records. Incidents use P0–P3. P0 pauses the cohort; P1 holds enrollment; restart requires independent review. Raw evidence, rationale, safety records, linkage, and research events remain separate data classes. Retention schedules are provisional until independent approval.

The A→B decision uses closed Cohort A records and hard criteria. Post-B GO requires all hard criteria, at least six of eight soft criteria, at least eight terminal dyads across the program, no unresolved trend, and concurrence by Pilot Director plus independent Safety/Privacy and Methods reviewers. The founder cannot override a hard stop. GO means only that the next approved feasibility stage is justified.

# Part VI — Moral-public-goods free-rider portfolio

No single voluntary online mechanism is treated as a robust solution.

- M0: unconditional voluntary contribution, used as a plain-donation comparator rather than a free-rider solution.
- M1: provision point with full refund, the experimental base.
- M2: real locked seed.
- M3: capped fixed 1:1 matching when pre-funded.
- M4: general refund-bonus/DAC, research-only and not default.
- M5: early-contributor refund bonus.
- M6: repeated coalition without peer punishment.
- M7: truthful, privacy-safe, opt-in social information.
- M8: peer punishment/negative reputation, rejected.
- M9: narrow legitimate nonessential club benefits.
- M10: quadratic funding, later allocation experiment for a pre-funded pool.
- M11: prize-linked lottery, research/legal deferred.
- M12: legitimate institution-backed collective budget, a high-value integration path.

Mechanisms are evaluated on net delivered public-good provision after seed, match, bonus, provider, and platform costs—not campaign success alone. Participant contribution, sponsor seed, sponsor match, bonus reserve, bonus paid, refund, fees, baseline redirect, and delivered public good are separate resource classes.

The conceptual sources support the possibility of moral trade and the importance of preventing threats, concentration, and poor collective decision procedures; they do not empirically validate any platform mechanism. Voluntary assurance and DAC remain hypotheses, with core free-riding and outside-funding limitations.

# Governing implementation sequence

1. Independently review this repository-only materialization.
2. Revalidate live `main` and all 23 Q/R paths.
3. Select one exact fresh implementation base and create Q and initial R from it.
4. Create proof-only I by conventional merge.
5. Run immutable-head proof and independently review Q, R, and I.
6. Obtain a separate owner decision before merging Q.
7. Reconstruct final R from Q-containing `main` and rerun exact-head gates.
8. Execute protected owner UAT.
9. Obtain separate runtime merge, migration, deployment, ethics, staffing, privacy, and recruitment authorizations.
10. Launch Cohort A only after every gate passes.

## Non-authorization boundary

This package does not authorize or perform runtime implementation, ready transition, merge, migration, deployment, database access, provider activity, money movement, real-user screening, recruitment, consent collection, participant contact, research execution, credibility activation, learned ranking, participant causal credit, DAC activation, or public impact claims.
