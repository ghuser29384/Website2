# Evidence-Credibility Blind Audit v1

## Status

This tranche is **private, append-only, and shadow-only**. It implements random audit draws, independent-reviewer assignment, and a blinded reviewer workspace for calibration of the Evidence Decision → Contextual Credibility system.

It does not authorize or perform:

- public credibility changes;
- discovery or ranking effects;
- exposure, safeguard, or eligibility changes;
- active restrictions;
- milestone cutover;
- payment movement, custody, capture, release, or refund;
- causal-additionality estimation;
- production migration or deployment;
- model fitting or parameter activation.

The stacked base is the validated private capture queue in PR #617. The evidence-decision and settlement records remain governed by the shadow-only integration in PR #601 and the calibration protocol in PR #615 / issue #616.

## Purpose

Appeals and corrections provide useful independent labels, but they are selected for disputed or suspicious cases. They cannot by themselves calibrate reviewer confidence or evidential provenance for the population of ordinary resolved trades.

This tranche creates a blinded random re-review stream. It records every eligible terminal decision’s sampling outcome, including nonselected cases, then assigns selected cases to an independent reviewer who does not see the prior judgment or avoidable participant information.

## Sampling contract

### Eligible unit

The sampling unit is the current terminal shadow decision for one milestone-role or settlement-role observation. A decision is eligible only after:

- the participant-facing evidence or payment lifecycle is final;
- the private shadow capture record exists;
- the decision is not superseded;
- the corresponding atomic fulfilment or settlement shadow event exists.

### Immutable draw

Each eligible decision receives exactly one draw containing:

- model version;
- target type, role, category, and dimension;
- frozen factual outcome or abstention status;
- decision-confidence band;
- provenance and adjudication classes;
- finality and categorical findings;
- event-level provenance, confidence, context, and stake factors;
- original decision time;
- sampling stratum;
- exact inclusion probability;
- deterministic random unit;
- selected or nonselected status;
- immutable snapshot hash.

The draw is append-only. Existing decisions are never redrawn merely because an administrator runs intake again.

### Initial selection policy

The initial policy uses:

- a 10% random-audit floor for otherwise ordinary terminal decisions;
- 100% inclusion for deliberate-fabrication findings;
- 100% inclusion for administrative corrections;
- 100% inclusion for zero-confidence or review-required decisions.

These rates are collection policy, not empirical calibration results or active model parameters.

### Randomness

The draw uses a committed 256-bit seed and a deterministic SHA-256 transform of the seed, target type, and decision identifier. The exact seed, its commitment, source key, inclusion probability, and random unit are retained privately so the sample can be reproduced and audited.

## Assignment contract

Only an AAL2 administrator with an active Moral Trade administrator grant can inspect selected draws or assign them.

The assigned reviewer must:

- have an active Moral Trade reviewer grant;
- differ from the original reviewer;
- differ from the participant whose conduct is evaluated;
- differ from the counterparty;
- complete the review before the assignment expiry;
- use an immutable request key.

Assignment creates an append-only event. It does not reopen, amend, or supersede the participant-facing evidence decision, payment decision, agreement, or payout.

## Reviewer blinding

The reviewer workspace intentionally omits:

- the original completion or payment conclusion;
- the original decision-confidence band;
- the provenance multiplier or provenance classification;
- the active or shadow aggregate;
- the original reviewer identity;
- the original private rationale;
- participant and counterparty identifiers where they are not needed;
- whether the case was selected randomly or mandatorily.

The reviewer sees only:

- a pseudonymous audit case code;
- the frozen obligation;
- units and amount at stake;
- frozen evidence rule;
- frozen no-trade baseline;
- the evidence packet available at the original decision cutoff;
- the external-payment receipt where the target is settlement;
- assignment and expiry metadata.

File access uses an authorization-first proxy. The proxy checks the current AAL2 reviewer assignment through an identity-bound RPC before a service-role client reads the private storage path. Storage paths are never returned to the browser.

The initial workspace records `procedural_partial` blinding because submitted artifacts can themselves contain identifying information. The reviewer separately records whether blinding was complete in practice.

## Independent label

The reviewer records:

- eligible, excluded, or review-required status;
- completion fraction or binary settlement outcome when eligible;
- finality reason;
- evidence-integrity, responsiveness, and dispute-conduct findings for evidence cases;
- blinding-complete status;
- a private independent rationale.

For the initial preregistered material-uphold indicator, the original decision is upheld only when:

- terminal status is unchanged;
- finality reason is unchanged;
- applicable categorical findings are unchanged; and
- the completion or settlement outcome differs by no more than 0.05.

Continuous absolute error is stored separately. The tolerance is an analysis definition, not a claim that differences smaller than 0.05 are morally or operationally unimportant.

Labels are append-only, idempotent by request key, and private. They do not update the participant-facing decision or active credibility pipeline.

## Authorization and privacy

- New tables have RLS enabled.
- Anonymous and ordinary authenticated roles have no direct table access.
- Administration requires an active AAL2 administrator grant.
- Review requires an active AAL2 reviewer grant and exact assignment ownership.
- Original evidence and payment files remain in the private `trade-evidence` bucket.
- Assigned file access expires with the assignment and ends after a terminal label.
- Direct identifiers and raw evidence are not part of any analytical export in this tranche.
- Tranche C de-identified export remains a separate future implementation.

## Isolation boundary

Every administrative and reviewer RPC checks or inherits the shadow-only boundary. Throughout this tranche:

- `mode = shadow`;
- milestone cutover is false;
- public effects are false;
- ranking effects are false;
- eligibility effects are false;
- active restrictions are unchanged;
- additionality remains outside credibility.

## Acceptance criteria

The candidate is acceptable only after exact-head source and isolated-database gates prove:

1. all eligible terminal cases receive one immutable draw;
2. mandatory and random selection rules are reproducible;
3. nonselected cases remain recorded;
4. original reviewers and parties cannot be assigned;
5. AAL1, anonymous, ordinary authenticated, and unassigned access fail closed;
6. the reviewer projection contains no forbidden original-judgment fields;
7. private file authorization precedes service-role storage access;
8. label replay is idempotent and history is append-only;
9. the independent label never mutates the underlying participant decision;
10. active credibility, aggregates, restrictions, and effect switches remain unchanged;
11. every SQL fixture rolls back with zero durable residue;
12. focused tests, full tests, lint, TypeScript, and production build pass.

## Release boundary

This branch must remain draft, stacked, unmerged, and undeployed until exact-head gates pass. Even after acceptance, any production shadow-data collection requires a separate release decision. Calibration, model fitting, cutover, and participant-facing effects require later, separate approvals.
