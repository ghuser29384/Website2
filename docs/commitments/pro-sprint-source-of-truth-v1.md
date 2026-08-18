# Moral Trade Commitments Pro Sprint — Source of Truth v1

## Status

- **Issue:** #755.
- **Release class:** repository-only specification and validation package.
- **Bound base:** `main@7e993158363710e5fe2c3eaa1cbccdb5cd56c235`.
- **Runtime, database, provider, payment, deployment, recruitment, consent, or study effect:** none.
- **Merge authorization:** none; keep the pull request draft and unmerged.

This document consolidates the governing decisions from the Commitments Pro Sprint. It supersedes dated handoffs, stale assistant summaries, and branch bodies where they conflict with current GitHub state or the closed contracts below.

## Authority and precedence

1. The latest explicit owner decision.
2. Current live GitHub state and exact immutable evidence.
3. This source-of-truth document and the machine contracts in the same package.
4. The reviewed normative content of relevant issues and draft pull requests.
5. Conceptual and external empirical sources, correctly labeled by evidence class.
6. Older handoffs, dated audits, local logs, and simulations.

Current source state at materialization:

- PR #733 is merged and supplies run-owned namespace isolation, two-writer Auth/database non-interference, exact ownership cleanup, and artifact-secrecy boundaries.
- PR #747 is merged and keeps learned ranking fail-closed; `learnedRankingMayActivate=false`.
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
5. A deliberate-fabrication or impersonation finding requires explicit evidence, a higher standard, and independent second review.
6. Contextual reliability is role-, action-, evidence-, duration-, and deal-context specific.
7. Contextual reliability has no public numerical score, default-ranking, minimum-score eligibility, payment, restriction, safeguard, or exposure-suppression effect before separate empirical activation.
8. Safety and eligibility are non-compensatory; positive history cannot cancel a threat, coercion, identity, privacy, or severe integrity restriction.
9. Additionality is an offer-, trade-, policy-, or subgroup-level causal question by default, not a permanent property of a participant.
10. Participant-specific causal credit remains disabled.
11. Raw evidence remains private and purpose-limited.
12. Appeals and permissible exits do not themselves lower reliability.
13. Product exit and research withdrawal are distinct.
14. Platform or sponsor money is not participant-caused impact.
15. Baseline-redirected resources are not new money.
16. Direct causal attribution and cooperative allocation are alternative lenses and are never summed.
17. Public copy must distinguish known, inferred, and unknown claims.
18. Synthetic tests, protected owner UAT, prior-driven models, and conceptual papers are not real-user calibration or causal evidence.
19. The project must not self-classify the founding pilot as exempt human-subjects research.
20. No recruitment occurs before a qualified written determination and every launch gate passes.

# Part I — Trust Resolution v3

The idea of one universal “credit score” is replaced by four mechanically separate objects.

## 1. Factual Outcome Record

Target question:

> Under the exact frozen terms, what occurred, in what native quantity, and how was the decision reached?

Required concepts:

- agreement, version, milestone or claim, obligated role, performer, and relying party;
- mechanism and action category;
- exact terms, obligation, and evidence-rule hashes;
- target and completed native quantity;
- completion fraction between 0 and 1;
- evidence provenance classes and opaque references;
- coverage, missingness, and contradiction state;
- adjudication pathway and decision-confidence band;
- finality, exclusion, replacement, appeal, correction, and late-cure lineage;
- integrity finding separate from factual result;
- settlement state separate from additionality;
- privacy, access, retention, and deletion state.

Terminal results may include full completion, partial completion, terminal noncompletion, permissible exit, force majeure, mutual prospective cancellation, replacement, appeal, correction, or late cure. Pending or unresolved cases do not create numerical reliability observations. Permissible exits and force majeure are excluded from fulfillment rates.

## 2. Contextual Reliability Record

Target question:

> Given comparable, independently resolved past factual outcomes, what can be said about future acceptable completion in this specific context?

The record preserves raw counts, uncertainty, abstention, independent-audit count, unique counterparties, provenance counts, and five separately inspectable dimensions:

- fulfillment;
- evidence integrity;
- settlement;
- dispute conduct;
- responsiveness.

The absence of history means `Unproven`, not bad. Newcomers remain eligible for proportionate, bounded pilots. No numerical output becomes active until real, independent, out-of-time evidence passes the separate calibration protocol; a 200-case sample can support an internal candidate, while at least 300 independently resolved decisions plus per-band labels, calibration, subgroup, Brier, reproduction, privacy, and activation gates are required before activation review.

## 3. Additionality Assessment

Target question:

> What changed because of the offer, trade, or policy relative to a defined no-offer state?

Closed statuses include:

- `not_assessed`;
- `baseline_attested_only`;
- `baseline_supported_observational`;
- `experiment_supported_policy_effect`;
- `participant_specific_effect_not_identified`;
- `marketplace_created_or_escalated_baseline`;
- `excluded_or_blocked`.

A prospective baseline should be frozen before exact offer exposure when feasible. Post-exposure worsening cannot increase credit. Harmful, marketplace-created, or marketplace-escalated baselines route to block or manual review. Numerical estimates require an exact estimand, unit, population, treatment, comparison, time window, outcome, design class, uncertainty, missingness, interference, positivity, and transportability limits.

Provider receipts, witnesses, and reviews establish occurrence only. One-off causal work uses randomized encouragement, price lotteries, waitlists, staggered access, cluster assignment, or justified quasi-experimental designs. Repeated low-stakes actions may later use a separately approved micro-randomized design. The default claim is policy-level intention-to-treat in the exact study population and period.

## 4. Safety and Eligibility Status

This is a separate veto or review plane for threats, extortion, coercion, retaliation, account compromise, identity duplication, impersonation, forged evidence, harmful baseline escalation, third-party harm, unlawful conduct, privacy disclosure, payment abuse, vulnerability, and serious process-integrity failure.

Closed states are `eligible`, `review_required`, `temporarily_paused`, `restricted`, and `ineligible`. Restrictions are source-bound, scoped, time-aware, appealable, and non-compensatory. Weak evidence is not itself a severe safety event.

# Part II — Zero-dollar bilateral founding pilot

## Purpose

The first real-user program answers only whether a small number of adults can understand, voluntarily enter, complete, evidence, review, challenge, appeal, and exit one bounded bilateral reciprocal pledge, and whether the product and operations are feasible.

It does not estimate adoption at scale, product-market fit, contextual-reliability calibration, causal additionality, impact, Payment readiness, DAC effectiveness, or free-rider mitigation.

## Cohorts

- Cohort A: 4 dyads / 8 adults, moderated usability.
- Cohort B: 8–12 additional dyads / 16–24 adults, operational feasibility.
- At least 8 terminal dyad records are required for a progression judgment.

## Scope

- Adults 18 or older only.
- Targeted, private recruitment; no public marketplace recruitment.
- Digital, non-sensitive, public-interest tasks only.
- Each obligation normally requires 30–90 minutes and never more than 120 minutes.
- Maximum active period 14 days.
- Zero out-of-pocket spending and zero platform money or provider object.
- Exact terms, evidence rule, privacy, challenge, appeal, and prospective exit.
- Separate product and research consent.
- At least 15 minutes of cooling-off.
- A seven-item comprehension gate for both parties.
- Raw evidence private to authorized participants and reviewers.
- Day-7 and day-30 follow-up.

Excluded are health, treatment, diet, medication, sleep, exercise, political voting or donations, religious conversion, sexual or romantic conduct, illegal or harassing action, violence or self-harm, credentials, high-stakes professional advice, employment, grades, housing, immigration, healthcare, caregiving, essential-support leverage, private third-party data, money-dependent actions, and nested mechanisms.

## Curated obligation library

The first version permits only reviewed templates such as public-source summarization, source-checking three factual claims, public-interest proofreading, reviewed non-sensitive translation, a public webpage accessibility checklist, a public resource map, an approved learning module and quiz, non-sensitive public annotation, and a sourced low-stakes administrative checklist.

No ad hoc task enters Cohorts A or B.

# Part III — Q / initial R / proof-only I reconstruction

The mixed PR #722 must be split.

## Q — repository-only evaluator harness

Q contains only the permanent run-owned workflow, run-owned namespace extension, preflight, fixture, cleanup, rollback-only authorization proof, authenticated Playwright evaluator, source/ownership contracts, and audit documentation. It uses the merged #733 namespace primitives and distinct owner, responder, initial-reviewer, appeal-reviewer, outsider, and administrator identities.

Q must not contain application runtime, production migration, provider, payment, or deployment behavior. Preflight detects exact residue and never deletes it. Cleanup is exact, ownership-aware, idempotent, failure-safe, and proves zero residue twice. Fixed `810…`, `820…`, `830…`, fixed `@qa.invalid`, first-N discovery, global-order discovery, and prefix cleanup are prohibited.

## Initial R — runtime extraction

Initial R contains only the accepted zero-dollar product semantics and two additive RLS migrations:

- canonical atomic acceptance using the RPC-returned agreement ID;
- bounded anonymous passive telemetry that remains write-free;
- locked Next redirect compatibility;
- distinct initial and appeal reviewer roles;
- retained read-only audit;
- participant AAL1, assigned reviewer AAL2, and administrator AAL2 access;
- bilateral frozen terms;
- prospective unilateral exit;
- zero-dollar, noncustodial behavior.

## I — proof-only integration

I conventionally combines the exact Q and initial R heads only to run complete source, database, Auth/RLS, browser, rendered, no-money, cleanup, and artifact gates. I is never a merge candidate.

After independent review, a separate owner decision is required before Q can merge. Final R is then reconstructed from the new Q-containing `main`; the proof branch does not become merge-ready automatically.

# Part IV — Protected owner UAT and release

Owner UAT runs only after final R passes exact-head gates. It uses seven distinct roles: operator, Participant A, Participant B, initial reviewer, appeal reviewer, outsider, and administrator.

The exact lifecycle is:

```text
signed-out discovery
→ exact offer
→ private response
→ atomic selection and competing decline
→ frozen terms
→ bilateral confirmation
→ private evidence
→ initial factual review
→ challenge and appeal
→ retained read-only audit and revocation
→ prospective unilateral exit
→ exact cleanup
```

Required viewports include 1440×1000, 1024×768, 390×844, and 320×568. Both participants must pass all seven comprehension items, including the fact that completion does not establish causation. Exactly one canonical agreement, selected acceptance, exit POST, 303 same-agreement redirect, and counterpart exit notification are required. Duplicate or stale mutations fail closed.

No-money means zero objects as well as zero amount: bonds, receipts, methods, mandates, charges, captures, refunds, transfers, custody balances, payouts, platform bonuses, and provider requests all equal zero.

A passing owner UAT yields only `uat_pass_not_pilot_authorized`. It is not ordinary-user comprehension, adoption, feasibility, production health, or impact evidence.

The release state machine proceeds through specification, Q, initial R, I, Q authorization, final R, final-R acceptance, owner UAT, merge-ready decision, expected-head merge, production preflight, guarded release, post-release verification, recruitment readiness, and pilot launch. No state may be skipped. Production migrations are additive and forward-only; rollback redeploys the previous compatible application rather than rewriting migration history.

# Part V — Pilot operations and oversight

## Human-subjects and ethics determination

The project must obtain a written qualified determination addressing applicable authority, human-subjects status, review category, consent, identity, recruitment, compensation, privacy, retention, incidents, amendments, cross-border conditions, and training. The project does not self-designate the 14-day dyadic pilot exempt or outside human-subjects research.

## Roles and separation

Required functions include Pilot Director, Safety Officer, Privacy/Data Steward, Facilitator Lead, facilitators, Reviewer Lead, initial reviewer, appeal reviewer, Technical Operator, Recruitment Coordinator, Methods Reviewer, and an independent ethics/human-subjects reviewer.

Initial reviewer differs from appeal reviewer; the facilitator is not sole reviewer of their dyad; the founder cannot override a hard stop; the Pilot Director cannot be the sole safety and progression authority; the Technical Operator has no ordinary raw-evidence access.

## Support

A dyad activates only when a primary facilitator is on duty, a backup is reachable, Safety and Technical pause contacts are reachable, and no evidence or challenge deadline expires during uncovered hours. The channel is not a 24/7 emergency service. Immediate danger is directed to local emergency services.

## Recruitment and screening

Recruitment is targeted and private. Each party completes a separate power, retaliation, third-party, identity, task, and voluntariness screen. Immediate family, cohabiting intimate partners, material dependents, and relationships controlling employment, grades, housing, immigration, healthcare, caregiving, or essential support are excluded from Cohorts A and B. Government ID is not the default identity method.

## Compensation

Any research compensation is fixed, disclosed, sponsor-funded, outside the Moral Trade ledger, and independent of matching, acceptance, completion, evidence, challenge, appeal, or remaining enrolled. Trade consideration remains zero. Recruitment cannot begin until the exact compensation or no-compensation decision is reviewed and frozen.

## Consent and reconsent

Product and research consent are separate, versioned records with no combined checkbox and no silence-as-consent. Participants receive a copy. Consent does not replace comprehension or power screening. Material changes to risk, data, recipients, retention, compensation, burden, evidence access, withdrawal, randomization, or mechanism require review and ordinarily reconsent. Product exit and research withdrawal remain separate.

## Incidents and privacy

Incidents use P0–P3 severity. P0 pauses the cohort; P1 holds enrollment; restart requires independent review. The workflow protects people first, then contains access, preserves minimum evidence, repairs, recovers, reports as required, and learns. Assertions are never weakened merely to obtain a green rerun.

Raw evidence, reviewer rationale, safety records, linkage, and research events are separate data classes. Raw evidence never enters public output, ranking training, or ordinary analytics. Provisional retention is 30 days for raw evidence after finality/appeal, 90 days for rationale, through day-30 follow-up for linkage, 24 months for deidentified process data and consent, and 12 months for access logs, subject to independent approval. Deletion has a secure request, identity verification, scoped retention explanation, linkage/evidence deletion, export exclusion, receipt, and rehearsal.

## Progression and closeout

Seven hard criteria include zero severe safety/privacy/identity/third-party-harm incident, zero money/provider object, exact bilateral confirmation, prospective exit, approved evidence access, no unsupported participant causal claim, and no hidden term mutation. Any hard failure stops progression.

GO requires all hard criteria, at least six of eight frozen soft criteria, no unresolved trend, and concurrence by the Pilot Director plus independent Safety/Privacy and Methods reviewers. The founder cannot override a hard stop. GO means only that the next approved feasibility stage is justified.

Every dyad receives an explicit closeout. Recruitment, screening, consent, activation, evidence, review, appeal, exit, follow-up, withdrawal, deletion, assistance, incidents, deviations, and missingness are reconciled with exact denominators. External reporting is descriptive, privacy-safe, and never calls completion “verified impact” or claims that Moral Trade caused an individual outcome.

# Part VI — Moral-public-goods free-rider portfolio

No single voluntary online mechanism is treated as a robust solution.

The experimental base is a provision point with full refund. Candidate arms include a real locked seed, capped fixed 1:1 match, and an early-contributor refund bonus. DAC is an experimental arm, not the default, because failure bonuses do not remove the central success-state incentive to let others pay and can create bonus farming, Sybil, deliberate-failure, and sponsor-reserve risks.

Repeated coalitions with transparent governance may support conditional cooperation, but public noncontributor lists, “free-rider” scores, participant-imposed punishment, retaliation, and unrelated service loss are prohibited. Social information is truthful, aggregate, privacy-safe, optional, and measured for pressure. Club benefits must be narrow, nonessential, and legitimate.

Quadratic funding allocates an already-funded matching pool; it does not create that pool and is deferred until identity, collusion, governance, and budget controls exist. Lotteries remain research- and legal-deferred. Large-scale non-excludable provision must include comparison with legitimately authorized institutional budgets, dues, or taxation; Moral Trade cannot invent compulsory authority.

Mechanisms are evaluated on net delivered public-good provision after seed, match, bonus, provider, and platform costs—not campaign success alone. Participant contribution, sponsor seed, sponsor match, bonus reserve, bonus paid, refund, fees, baseline redirect, and delivered public good are separate resource classes.

# Governing implementation sequence

1. Independently review this repository-only materialization.
2. Revalidate live `main` and the complete Q/R path overlap.
3. Create Q and initial R from the identical exact base.
4. Create proof-only I by conventional merge.
5. Run complete immutable-head proof and independently review Q, R, and I.
6. Obtain a separate owner decision before merging Q.
7. Reconstruct final R from Q-containing `main` and rerun exact-head gates.
8. Execute protected owner UAT.
9. Obtain separate runtime merge, migration, deployment, ethics, staffing, privacy, and recruitment authorizations.
10. Launch Cohort A only after every gate passes.

## Non-authorization boundary

This package does not authorize or perform runtime implementation, ready transition, merge, migration, deployment, database access, provider activity, money movement, real-user screening, recruitment, consent collection, participant contact, research execution, credibility activation, learned ranking, participant causal credit, DAC activation, or public impact claims.
