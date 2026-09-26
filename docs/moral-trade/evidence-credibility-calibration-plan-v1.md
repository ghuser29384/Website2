# Evidence Decision → Contextual Credibility Calibration Plan v1

## Status

This document specifies the next tranche after the private Evidence Decision → Contextual Credibility shadow integration in PR #601.

It is a **collection and evaluation plan**, not an activation decision. It does not authorize:

- merging or deploying PR #601;
- applying any shadow migration to production;
- changing the provisional `v2-evidence-decision-shadow` parameters;
- showing shadow outputs to participants or the public;
- changing discovery, ranking, exposure, safeguards, eligibility, or active restrictions;
- treating a reviewer confidence band as empirically calibrated;
- inferring causal additionality from evidence of factual completion.

Every activation-relevant change remains subject to a separate, explicit decision and a new frozen model version.

## Why this tranche is necessary

The current QA evidence establishes software and policy-contract correctness. It demonstrates that the system:

- preserves completion fraction separately from payout factor and decision confidence;
- preserves source provenance separately from adjudication;
- handles replacement, appeal, cure, correction, exclusion, and supersession without double-counting;
- denies unauthorized access;
- remains shadow-only and leaves active public credibility unchanged;
- leaves no synthetic residue after rollback-only tests.

Those tests do **not** establish that the numerical provenance multipliers or confidence bands predict real-world review correctness. Synthetic regression cases cannot answer empirical questions such as:

- whether a `75` decision-confidence assessment is upheld about 75% of the time;
- whether bilateral confirmation should receive `0.6` rather than `0.4` or `0.8` of full evidentiary weight;
- whether self-report should receive `0.2`, be pooled with another class, or be excluded for some contexts;
- whether calibration differs by action category, role, stake, duration, reviewer, or evidence method;
- whether the resulting aggregate improves prediction beyond a simpler unweighted baseline.

The immediate goal is therefore to create a defensible stream of independently labelled, private shadow observations and a precommitted evaluation protocol. Parameter fitting comes later, after enough data exist.

## Frozen boundaries inherited from PR #601

The calibration work must preserve the following boundaries:

1. **Atomic unit:** one terminal observation per milestone and obligated role.
2. **Fulfilment target:** final completion fraction from `0` through `1`.
3. **Separate axes:** completion, payout factor, decision confidence, source provenance, and adjudication remain distinct.
4. **Finality:** only current terminal decisions enter evaluation; superseded decisions remain in the audit history but not the active calibration set.
5. **Integrity:** weak proof is not misconduct. Integrity labels require an explicit finding.
6. **Additionality:** factual completion does not certify causal impact.
7. **Privacy:** raw evidence, identities, private reasons, provider references, and payment details remain private.
8. **Shadow-only:** calibration records cannot alter active public outputs.
9. **Versioning:** parameters are never silently edited in place. Any calibrated candidate receives a new immutable model version.

## Calibration questions

The first empirical review should answer four questions separately.

### 1. Decision-confidence calibration

Does each decision-confidence band correspond to the frequency with which an independent, sufficiently informed review would leave the material decision unchanged?

For calibration purposes, a **materially upheld decision** means that a later independent determination does not change any of the following beyond a predeclared tolerance:

- eligible, excluded, or review-required status;
- finality reason;
- completion fraction;
- explicit integrity finding;
- settlement outcome.

The tolerance for fractional completion must be frozen before analysis. The initial candidate is the larger of:

- `0.05` absolute completion fraction; or
- one indivisible contractual unit expressed as a fraction of total units.

This candidate tolerance is not yet a product decision. The analysis must report sensitivity to at least one stricter and one looser tolerance.

### 2. Provenance informativeness

Conditional on the information available to the reviewer, how informative is each relied-on source class about later independent resolution?

The analysis must not interpret raw class differences as causal effects. Provenance classes will differ systematically by mechanism, stake, action type, dispute status, and case difficulty. The first review should therefore report both:

- unadjusted outcome rates; and
- adjusted estimates using a predeclared, regularized model with only operational covariates available before the original decision.

If a class is too sparse to estimate separately, it must remain provisional, be pooled, or receive no activation effect. Sparse data must not be converted into a precise multiplier.

### 3. Aggregate predictive validity

Does the complete contextual-credibility candidate improve prediction of later acceptable completion relative to simple baselines?

The minimum baselines are:

1. the global empirical completion rate;
2. completion rate by role and action category;
3. the current active credibility model without the new evidence-decision weighting;
4. an otherwise identical shadow model with provenance and decision-confidence multipliers set to `1`.

The calibration review must distinguish:

- calibration: whether predicted probabilities match observed frequencies;
- discrimination: whether higher-risk and lower-risk cases are ordered usefully;
- coverage: how often the system abstains or shows “Unproven”;
- decision utility: whether any proposed safeguard rule improves outcomes under a separately approved loss function.

No ranking or safeguard effect follows merely from a better Brier score.

### 4. Reviewer-process reliability

Are review decisions sufficiently reproducible and are appeal outcomes revealing systematic reviewer error?

The analysis must include:

- appeal rate;
- appeal-overturn rate;
- appeal-overturn rate by reviewer and case type;
- agreement on blinded duplicate reviews;
- completion-fraction disagreement;
- confidence-band disagreement;
- duplicate-proof misses;
- unresolved-dispute share;
- review turnaround time;
- abstention or `review_required` rate.

Reviewer-level results remain private unless a later governance decision authorizes publication. The purpose is process improvement and assignment safety, not a public reviewer leaderboard.

## Operational label hierarchy

Independent labels differ in quality. The analysis must preserve their origin rather than collapsing them into one binary field.

### Tier A — final independent appeal

A different eligible reviewer reaches a final appeal decision under the frozen appeal procedure.

This is the strongest routinely available label, but it is selected: appealed cases are not representative of all cases.

### Tier B — blinded random re-review

A second eligible reviewer independently evaluates the frozen terms and the evidence that was available at the original decision cutoff. The second reviewer should not see:

- the first reviewer’s completion finding;
- the first reviewer’s confidence band;
- the first reviewer’s private rationale;
- the current shadow aggregate;
- participant popularity or public credibility information not required for the decision.

The re-review record must state whether blinding was technically complete or only procedural.

### Tier C — later authenticated outcome

A later platform-observed or authenticated-provider event resolves a factual question that was previously reviewed, such as confirmed settlement or a provider-authenticated donation.

This label is useful only for the factual target it directly establishes. It cannot retroactively establish unrelated integrity, responsiveness, or additionality claims.

### Tier D — administrative correction

A documented correction resolves a clear clerical, identity-linking, provider, or data-processing error.

Administrative corrections should be analyzed separately because they measure a different failure mode from substantive reviewer disagreement.

### Excluded as independent labels

The following do not independently validate the original decision:

- the original reviewer repeating the same judgment;
- participant agreement alone;
- an unreviewed self-report;
- an automatically generated shadow event derived from the decision being evaluated;
- a synthetic QA fixture;
- a model output that used the original decision as an input.

## Sampling policy for independent re-review

Appeals alone produce severe selection bias. The collection system must therefore assign a random audit sample among unappealed terminal decisions.

### Minimum sampling design

- Sample at decision finality, before downstream outcomes are known.
- Record the exact inclusion probability for every eligible decision.
- Use a cryptographically strong random source or a reproducible seeded procedure whose seed is committed before labels are inspected.
- Keep the audit assignment private until necessary, to reduce strategic behavior.
- Use inverse-probability weighting when estimating population-level quantities.

### Initial candidate allocation

The initial engineering target is:

- a 10% simple random audit floor for unappealed terminal decisions;
- 100% audit for deliberate-fabrication signals, administrative corrections, and zero-confidence review-required decisions;
- oversampling of rare provenance classes, high-stake bands, replacement outcomes, and cases from reviewers with few independently labelled decisions.

The 10% rate is an operational candidate, not a permanent requirement. It may be changed before production collection based on expected case volume, reviewer capacity, privacy burden, and statistical power. Any change must be recorded with its effective time range and inclusion probabilities.

## Dataset construction

### Observation identity

The analysis unit is the current terminal decision for one milestone-role or settlement-role observation. The dataset must retain:

- immutable decision ID;
- supersession lineage;
- model version;
- frozen agreement and milestone identifiers;
- actor role;
- action category;
- stake band;
- duration band;
- evidence method;
- source provenance class;
- adjudication class;
- decision-confidence band;
- factual outcome;
- reviewer pseudonymous analysis identifier;
- finality reason;
- label tier;
- label cutoff time;
- audit-inclusion probability;
- whether blinding was complete;
- timestamps needed for out-of-time splitting.

The analytical export should replace direct profile, reviewer, counterparty, provider, and agreement identifiers with stable, study-specific pseudonyms. Raw private fields must not be exported unless strictly needed for a separately approved review.

### Leakage controls

At minimum:

- fit parameters only on decisions finalized before the calibration cutoff;
- evaluate on a later out-of-time holdout;
- prevent the same supersession chain from spanning train and holdout;
- report a stricter grouped analysis that prevents the same participant from appearing in both fit and holdout sets;
- report sensitivity to grouping by reviewer and counterparty;
- compute all feature values using information available at the original decision time;
- exclude post-decision evidence from predictors unless the model is explicitly framed as a retrospective estimator.

### Missingness and abstention

Missingness is an outcome to report, not a reason to silently drop cases. The analysis must show:

- the number of eligible decisions;
- the number sampled for audit;
- the number assigned;
- the number completed;
- the number unresolved;
- the number excluded and the exact exclusion reason;
- the amount and pattern of missing data by operational subgroup.

## Primary metrics

### Decision confidence

For confidence bands interpreted as probabilities of material uphold:

- weighted Brier score;
- clipped log loss;
- observed uphold rate by band with 95% interval;
- calibration intercept and slope;
- monotonicity of observed uphold rate across bands;
- expected calibration error only as a secondary descriptive statistic;
- coverage and abstention rate for the zero-confidence band.

The primary plot should show each band’s predicted probability against the independently observed uphold rate, with effective sample size and uncertainty.

### Fractional fulfilment

- mean absolute error against independent completion fraction;
- root mean squared error;
- signed error to detect systematic over- or under-crediting;
- exact or tolerance-based agreement rate;
- results separately for indivisible and divisible milestones.

### Provenance

- materially upheld rate by provenance class;
- adjusted association with material uphold;
- uncertainty interval and effective sample size for each class;
- sensitivity to excluding appeals, high-stake cases, and administrative corrections;
- performance of candidate multipliers in the full predictive model.

### Aggregate predictions

- out-of-time Brier score;
- out-of-time clipped log loss;
- calibration intercept and slope;
- reliability plot;
- AUROC or concordance as secondary discrimination measures;
- lower-bound coverage for any conservative public estimate;
- performance relative to every predeclared baseline.

## Operational subgroup checks

The first review should report results by:

- performer versus payer role;
- action category;
- initial, replacement, appeal, cure, and correction path;
- evidence method and provenance class;
- stake band;
- duration band;
- indivisible versus divisible completion;
- reviewer;
- new versus previously observed participant;
- repeated versus new counterparty;
- payment versus nonpayment decision.

Sensitive demographic traits are not required for this first calibration plan and must not be inferred. A later fairness review may add lawfully collected, consented attributes under a separate data-governance decision.

## Model-selection discipline

The calibration analysis must compare a small, predeclared candidate set. It must not search a large parameter space and then report the best holdout result.

The first candidate set should include:

1. current provisional multipliers;
2. all provenance multipliers equal to `1`;
3. two-level provenance grouping: authenticated/independent versus bilateral/self-report;
4. monotone empirically fitted provenance weights with shrinkage toward `1`;
5. current confidence-band multipliers;
6. isotonic calibration of confidence bands;
7. a regularized logistic or beta-regression calibration layer, depending on the target.

Candidate selection occurs on the fit/calibration data only. The out-of-time holdout is opened once for the predeclared comparison. If the candidate fails, the model remains shadow-only and the next analysis uses a new future holdout.

## Evidence thresholds and readiness stages

Sample counts are necessary but not sufficient. The following stages prevent sparse data from being mistaken for validation.

### Stage 0 — instrumentation only

- Fewer than 50 independently labelled terminal decisions.
- Descriptive tables and data-quality checks only.
- No numerical parameter change.

### Stage 1 — exploratory offline calibration

- At least 50 independently labelled decisions and at least 20 out-of-time cases.
- Candidate analyses may be run and documented.
- No public, ranking, eligibility, restriction, or automated safeguard effect.
- Any fitted values remain research artifacts, not product parameters.

### Stage 2 — internal shadow candidate

Initial candidate floor:

- at least 200 independently labelled decisions overall;
- at least 50 decisions in a sealed out-of-time holdout;
- at least 30 independently labelled decisions for any provenance class proposed to retain a distinct multiplier;
- at least 20 final appeals and at least 50 blinded random re-reviews;
- no unresolved data-integrity blocker;
- successful reproduction from a clean checkout and frozen export.

Meeting these floors does not authorize activation. Failing a class-specific floor requires pooling, retaining the provisional value, or removing that class’s numerical effect.

### Stage 3 — activation review eligible

A candidate may be submitted for a separate activation decision only if:

- its out-of-time performance is not materially worse than every required simple baseline;
- any claimed improvement is accompanied by uncertainty and sensitivity analysis;
- confidence-band calibration is directionally monotone or the bands are revised;
- no adequately powered operational subgroup shows a predeclared severe calibration failure;
- reviewer-process metrics meet separately approved operating standards;
- private-data handling and reproduction checks pass;
- the exact model version and parameters are frozen;
- a rollback plan and post-activation monitoring plan exist.

The activation decision may still reject the model, keep it private, or authorize only a narrow use.

## Failure and fallback policy

The correct response to weak evidence is simplification, abstention, or continued shadow operation—not a more elaborate unsupported model.

Required fallbacks:

- If provenance classes are not distinguishable, use equal weights or a coarser grouping.
- If confidence bands are not calibrated, relabel them as ordinal review-strength categories or recalibrate them before numerical use.
- If reviewer disagreement is high, improve the rubric and re-review process before changing participant credibility.
- If subgroup performance is unstable, suppress the affected transfer or context rather than borrowing confidence from unrelated cases.
- If the model does not beat simple baselines, retain the simple baseline.
- If independent labels are too selected or too sparse, continue collection without activation.

## Reviewer calibration loop

Before using reviewer outputs in any active credibility effect:

1. Publish a private reviewer handbook with worked examples and explicit distinction between payout factor and decision confidence.
2. Run blinded calibration cases before assigning live reviews.
3. Insert a continuing stream of duplicate blinded cases.
4. Review appeal-overturn and duplicate-disagreement reports at a fixed cadence.
5. Require retraining or suspend assignment when a predeclared quality threshold is breached.
6. Preserve the original decision and every correction or appeal; never rewrite history.

Exact reviewer thresholds remain to be approved after observing initial pilot volume and base rates.

## Engineering sequence

### Tranche A — private collection surface

Build a private AAL2-administrator queue for final outcomes that do not yet have a current shadow decision.

The queue should:

- list only final milestone and settlement outcomes;
- show the frozen terms and evidence needed for the narrow calibration judgment;
- capture decision confidence, relied-on provenance, provider-authentication status, contradiction/integrity finding, responsiveness, dispute conduct, finality reason, and private rationale;
- derive adjudication class where possible rather than asking the operator to restate it;
- call the existing append-only shadow RPCs;
- be idempotent;
- show supersession lineage;
- expose no public route or participant-visible output;
- leave all active effect switches disabled.

For the pilot, an AAL2 administrator should perform or approve shadow capture after finality. This deliberately separates the participant-facing payout review from the provisional credibility-calibration judgment.

### Tranche B — random audit assignment

Add a private, append-only audit-assignment table and RPCs that:

- determine audit eligibility at finality;
- record inclusion probability and sampling stratum;
- assign an eligible independent reviewer without conflicts;
- preserve blinding;
- record completion, expiration, and exclusion reason;
- never mutate the underlying participant decision.

### Tranche C — de-identified export and reproducible analysis

Add an AAL2-administrator export that returns only the approved analytical fields with study-specific pseudonyms. Create a deterministic offline analysis package that records:

- export hash;
- code commit;
- model version;
- cutoff time;
- random seed;
- inclusion/exclusion counts;
- metric definitions;
- candidate definitions;
- complete result tables and plots.

The analysis package must run without production credentials once the frozen export is present.

### Tranche D — empirical review

After sufficient data accumulate:

- freeze the analysis protocol and holdout;
- run the calibration study;
- review errors and subgroup results;
- propose either no change, a simplified model, or a new versioned candidate;
- keep the result private unless a separate disclosure decision authorizes publication.

### Tranche E — separate activation proposal

Only after Tranche D can a new proposal specify any active use. That proposal must state exactly:

- which output changes;
- who can see it;
- which decisions it affects;
- what safeguards apply;
- what monitoring and rollback thresholds apply;
- whether the effect is public, ranking, eligibility, restriction, or transaction protection.

## Security and privacy requirements

- AAL2 and an active administrator or assigned-reviewer grant are mandatory for private calibration surfaces.
- Direct access by anonymous or ordinary authenticated roles remains revoked.
- Provider references and raw evidence remain encrypted/private and are omitted from analytical exports.
- Study pseudonyms must use a study-specific keyed transform or an equivalently nonreversible mapping stored outside the export.
- Small cells must be suppressed in any published summary.
- Export generation, download, analysis, and deletion must leave an audit event.
- No calibration field may be repurposed as a moral-worth, popularity, ideology, cause, or wealth score.
- Threats, coercion, safety restrictions, externalities, and causal additionality remain separate systems.

## Decisions intentionally not frozen by this plan

The following require evidence, operational experience, or explicit product approval:

- the final material-change tolerance for fractional completion;
- the long-run random-audit rate;
- reviewer suspension and retraining thresholds;
- exact minimum sample sizes for each operational subgroup;
- the loss function for any future safeguard optimization;
- whether calibrated confidence should remain categorical or become a continuous probability;
- whether any shadow aggregate should ever become public;
- whether any parameter should influence ranking, eligibility, restrictions, or exposure.

## Immediate next implementation task

Implement **Tranche A: the private AAL2-administrator collection queue** as a stacked, shadow-only pull request based on PR #601. Do not combine it with random audit sampling, model fitting, public display, or activation. Its acceptance criteria are:

1. final outcomes missing a current shadow decision are discoverable through a private RPC;
2. non-admin, AAL1, anonymous, and direct-table access fail closed;
3. the operator can record each permitted evidence and settlement finality path through existing append-only RPCs;
4. repeat submission is idempotent;
5. superseded outcomes are represented explicitly and not double-counted;
6. active public credibility and all effect switches remain unchanged;
7. isolated-QA fixtures roll back to zero residue;
8. focused tests, repository tests, lint, TypeScript, and production build pass;
9. no production migration or deployment occurs without separate authorization.
