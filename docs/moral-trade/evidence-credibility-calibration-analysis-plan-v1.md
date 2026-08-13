# Evidence Decision → Contextual Credibility Analysis Plan v1.0.0

## Status and non-authorization boundary

This document is the frozen statistical analysis plan for the first offline calibration study enabled by the private, immutable export in PR #628. It specifies deterministic data verification, cohort construction, splitting, metrics, candidate models, uncertainty analysis, subgroup checks, readiness stages, and activation gates before any held-out labels are opened.

It is a research protocol, not an activation or release decision. Running it does not authorize:

- changing the provisional `v2-evidence-decision-shadow` parameters;
- merging or deploying any stacked prerequisite;
- applying migrations to production;
- public credibility, ranking, exposure, eligibility, safeguard, or restriction effects;
- payment movement, custody, settlement, release, refund, or enforcement;
- causal-additionality estimation;
- moral-value, ideology, cause, wealth, popularity, or participant-worth scoring;
- publication of row-level, reviewer-level, or participant-level research data.

Any calibrated candidate must receive a new immutable model version and a separate explicit activation and production-release decision. Safety and misconduct findings remain non-compensatory and require separate human review regardless of predictive calibration.

## Reproduction identity

The machine-readable companion is `analysis/evidence-credibility-calibration-v1/plan.json`. It records the SHA-256 digest of this exact UTF-8 Markdown document. The analysis package must reject an export unless:

1. the plan document hash equals the hash in `plan.json`;
2. the export manifest’s analysis-plan version equals `evidence-credibility-calibration-analysis-v1.0.0`;
3. the export manifest’s analysis-plan hash equals the same digest;
4. every canonical observation string reproduces its row hash;
5. the ordered row hashes reproduce the dataset digest;
6. the canonical manifest string reproduces the manifest hash;
7. all privacy flags remain fail-closed.

The package records the export-file SHA-256, export ID, source cutoff, manifest hash, rows digest, code commit, plan version, plan hash, deterministic random seed, and report generation timestamp in every output manifest. By default the timestamp is inherited from the immutable export creation time rather than the analyst’s wall clock, so identical clean runs are byte-reproducible.

## Empirical questions

The study addresses four distinct questions. Results may not be collapsed into a single claim of “credibility accuracy.”

### 1. Decision-confidence calibration

Does an original confidence band predict the probability that an independent terminal review materially upholds the original decision?

The primary material-uphold definition requires equality of:

- original and final status;
- original and final finality reason;
- original and final integrity finding;
- original and final responsiveness finding;
- original and final dispute-conduct finding;

and, where both outcomes are numerical, an absolute difference no greater than `0.05`. The analysis recomputes this label from exported fields rather than trusting only the stored Boolean. Sensitivity analyses use tolerances `0.025` and `0.10`.

### 2. Fractional-completion error

For observations with numerical original and final outcomes, how large and in what direction is the independent-review error?

Primary descriptive measures are mean absolute error, root mean squared error, signed error defined as original minus final outcome, over-estimation rate, under-estimation rate, and tolerance-based agreement rates.

### 3. Provenance informativeness and candidate predictive validity

Do provenance, confidence, or their interaction improve out-of-time prediction of independent material uphold relative to simple baselines? These are predictive associations, not causal effects of provenance. Operational case mix, mechanism, stake, dispute selection, and difficulty can confound raw provenance differences.

### 4. Categorical and reviewer-process reliability

How often do status, finality, integrity, responsiveness, and dispute-conduct labels change under independent review? Report confusion matrices, class-conditional counts, and Cohen’s kappa where defined. Deliberate-fabrication false positives are listed as a separate mandatory human-review gate and never converted into a compensatory score.

## Eligible records and cohort hierarchy

The immutable export can contain random and mandatory audit observations. Every valid, independently resolved observation is included in descriptive counts. Cohorts are separated as follows.

### Primary probability-audit cohort

A record enters primary population calibration only when reviewer blinding was complete and its pre-audit selection rule was part of the known-probability audit design:

- `selectedReason = "random_selected"`; or
- `selectedReason = "mandatory_zero_confidence_or_review_required"`.

The second reason is a census-selected audit stratum with inclusion probability 1, not a dispute-selected convenience sample. Including it is necessary to study the zero-confidence and review-required strata while preserving design-based weighting. Candidate model fitting and out-of-time comparison additionally require `originalStatus = "eligible"`, because review-required and excluded observations do not have a numerical provisional event weight and represent different decision processes.

### Supplemental descriptive cohorts

Deliberate-fabrication-triggered audits, administrative corrections, appeals, provider reconciliations, incomplete blinding, and other dispute-selected pathways remain separate. They are not pooled into primary probability-sample calibration estimates. Their counts and categorical/fractional errors may be reported descriptively.

### Missingness and exclusions

Missingness is an outcome, not a silent deletion rule. The report records:

- all exported independently resolved rows;
- random versus mandatory rows;
- complete-blinding probability-audit rows;
- eligible complete-blinding probability-audit rows;
- fit and holdout counts;
- native prediction coverage by candidate;
- unavailable metrics where a target or prediction is missing.

The export schema does not currently contain duration bands, indivisibility, payment/nonpayment flags, or consented demographic attributes. This first analysis does not infer them. Their absence is recorded as a limitation.

## Sampling weights

Primary population estimates use Hájek-normalized inverse-probability weights:

`w_i = 1 / inclusionProbability_i`.

For a weighted mean, the numerator is `Σ w_i y_i` and denominator is `Σ w_i`. No weight cap is applied in v1. Effective sample size is reported as:

`(Σ w_i)^2 / Σ w_i^2`.

Known inclusion probabilities address the designed audit sample but cannot remove bias from incomplete labels, operational exclusions, strategic behavior, or imperfect blinding.

## Deterministic out-of-time splitting

The primary split forms connected components using all three leakage boundaries simultaneously:

- agreement and supersession chain through `agreementGroupToken`;
- participant pair through `participantPairGroupToken`;
- original reviewer through `originalReviewerGroupToken`.

Thus no agreement, participant pair, or original reviewer can appear in both fit and holdout, even indirectly through a chain of shared relationships.

The algorithm is frozen:

1. Filter to the primary candidate-comparison cohort.
2. Form connected components under the selected grouping rule.
3. Assign each component its latest `decisionDateUtc`.
4. Enumerate component-level UTC cutoff dates.
5. For each cutoff, assign components with latest date on or after the cutoff to holdout and earlier components to fit.
6. Retain cutoffs with at least 200 fit rows, at least 50 holdout rows, and at most 40% of rows in holdout.
7. Choose the cutoff closest to a 25% holdout fraction; break exact ties in favor of the later cutoff.

Sensitivity analyses repeat the same deterministic procedure with: agreement only; agreement plus participant pair; and agreement plus original reviewer. These quantify the effect of progressively stricter leakage controls without substituting for the strict primary split. If no valid strict split exists, candidate comparison and activation-relevant metrics are not assessable; the package must not improvise a random split.

## Primary metrics

### Binary material-uphold prediction

For all candidates on the sealed out-of-time holdout:

- weighted Brier score;
- clipped log loss with probabilities clipped to `[0.01, 0.99]` for evaluation only;
- observed uphold rate;
- mean predicted probability;
- absolute overall calibration error;
- calibration intercept and slope from a weighted logistic calibration regression where estimable;
- fixed-bin expected calibration error and maximum calibration error using bin edges `[0, 0.2, 0.4, 0.6, 0.8, 1]`;
- raw and effective sample size;
- native prediction coverage.

A reliability diagram reports confidence-band predictions against independently observed uphold rates with raw sample size. For each confidence band, the private report also gives a deterministic 95% percentile interval for the observed uphold rate from an agreement-cluster bootstrap. These intervals are descriptive uncertainty summaries, not automatic pass/fail declarations for the high-confidence bands.

### Fractional completion

- weighted mean absolute error;
- weighted root mean squared error;
- weighted signed error, original minus final;
- weighted over-estimation and under-estimation rates;
- exact/tolerance-based agreement at `0.025`, `0.05`, and `0.10`;
- the same aggregate error summaries by each pre-registered operational subgroup, with unavailable cells retained as unavailable rather than silently omitted.

### Categorical dimensions

For status, finality reason, integrity, responsiveness, and dispute conduct:

- weighted confusion matrix;
- weighted observed agreement;
- weighted expected agreement;
- Cohen’s kappa where defined;
- raw and effective sample size.

## Pre-registered candidate models

The implementation must fit exactly the following seven candidates. Candidate fitting uses only the fit set. The holdout is used once for the frozen comparison.

1. `unweighted_global`
   - Hájek-weighted empirical material-uphold rate in the fit set.
   - This is the primary unweighted baseline.

2. `role_dimension_smoothed`
   - Empirical rate by `(dimension, role)` with shrinkage toward the global fit-set rate using prior effective sample size 20.
   - This is the operational-context baseline.

3. `confidence_direct`
   - Direct mapping `0→0`, `25→0.25`, `50→0.50`, `75→0.75`, `100→1.0`.
   - It represents the current interpretation that must not be called calibrated absent evidence.

4. `confidence_isotonic`
   - Weighted pool-adjacent-violators fit on confidence-band uphold rates.
   - It enforces monotonicity without a large parametric search.

5. `provenance_smoothed`
   - Weighted empirical uphold rate by provenance class, shrunk toward the global rate with prior effective sample size 20.
   - Sparse classes remain conservative rather than receiving unregularized precise estimates.

6. `current_heuristic_isotonic`
   - The frozen provisional product of recency, provenance, decision confidence, repeated-counterparty, context, and stake factors is used only as an ordinal score.
   - A weighted isotonic layer maps that score to material-uphold probability using fit data.

7. `confidence_provenance_interaction_ridge`
   - A fixed-feature logistic model containing centered confidence, provenance indicators, and confidence-by-provenance interactions.
   - Fixed L2 penalty `λ = 1` provides partial pooling. No hyperparameter search is allowed.

The code asserts that the implemented candidate identifiers match the frozen plan exactly.

## Candidate selection rule

Candidate selection must not inspect the sealed out-of-time holdout. Within the primary fit set, form the same strict agreement + participant-pair + reviewer connected components and assign them deterministically to up to five approximately balanced folds. Components are ordered by size and a SHA-256 key derived from the frozen seed `moral-trade-evidence-credibility-calibration-v1-selection`; each component is assigned to the currently smallest fold.

For each fold, fit every pre-registered candidate on the other folds and predict the excluded fold. Pool the out-of-fold predictions and compute Hájek-weighted Brier score. Only candidates with complete native cross-validation coverage and an estimable Brier score are eligible. Rank by lower cross-validated Brier score. When two candidates differ by no more than `0.002` Brier, choose the lower predeclared complexity rank; break any remaining tie lexicographically by candidate identifier.

After selection is frozen, refit every candidate on the full fit set and evaluate all candidates on the sealed holdout. The selected candidate’s holdout comparison is therefore independent of the selection criterion. Selection is descriptive and does not itself authorize a model version. The report retains the aggregate cross-validation metrics and every candidate’s complete holdout metrics, but not row-level predictions.

## Uncertainty

Primary uncertainty for candidate-minus-baseline loss differences uses 2,000 deterministic percentile bootstrap replicates clustered by agreement. The bootstrap seed is `moral-trade-evidence-credibility-calibration-v1-bootstrap`. Entire agreement clusters are resampled with replacement. Report 95% intervals for:

- candidate minus baseline Brier score;
- candidate minus baseline clipped log loss.

The same deterministic agreement-cluster bootstrap is used to give 95% intervals for each holdout confidence band’s observed material-uphold rate. No bootstrap interval is interpreted as a causal interval. If too few clusters or estimable replicates exist, the interval is `not assessable`.

## Subgroup checks

Holdout subgroup results are reported for:

- target type;
- dimension;
- action category;
- role;
- provenance class;
- confidence band;
- source pathway;
- label tier;
- repeated-counterparty sequence band (`first`, `2–3`, `4+`);
- bounded stake-weight band;
- pseudonymous original reviewer.

A subgroup is activation-gate-powered only when it has at least 50 raw holdout labels. Report selected-candidate Brier, baseline Brier, their difference, fixed-bin calibration error, raw sample size, and effective sample size. Fractional-error summaries use the same subgroup definitions over all independently resolved numerical observations. The bounded stake-weight bands are `standard` (`≤1.25`), `elevated` (`>1.25` and `≤1.6`), and `high` (`>1.6`). Small cells remain private and are not publication-ready.

The private report also gives descriptive source-pathway diagnostics: material-uphold and overturn rates and mean absolute error by terminal review, appeal, provider reconciliation, and administrative correction; appeal-overturn counts and rates within the appeal pathway; and the share of resolved exports involving an administrative-correction pathway. These selected-pathway diagnostics do not enter the primary probability-sample estimates.

## Readiness stages

### Stage 0 — instrumentation only

Fewer than 50 independently resolved rows or fewer than 20 out-of-time holdout rows. Only integrity, data-quality, and descriptive output is allowed. No parameter change.

### Stage 1 — exploratory offline calibration

At least 50 resolved rows and at least 20 out-of-time holdout rows. Candidate analyses may be produced as private research artifacts. No active effects.

### Stage 2 — internal shadow candidate

At least 300 independently resolved rows overall, a valid 200/50 fit/holdout split, and at least 50 complete-blinding probability-audit labels for every confidence band or provenance class proposed to retain a distinct active parameter. Sparse classes must be pooled, disabled, or kept non-numerical. Stage 2 does not authorize activation.

### Stage 3 — activation-review eligible

Not assigned automatically by this package. It requires a separate human review after every activation gate, uncertainty analysis, subgroup check, privacy review, reviewer-process review, immutable model freeze, monitoring plan, and rollback plan is complete.

## Frozen activation gates

The private report evaluates but cannot waive these gates:

1. At least 300 independently resolved real decisions overall.
2. At least 50 complete-blinding probability-audit labels for each confidence band or provenance class that would retain a distinct active numerical parameter.
3. Observed confidence-band uphold rates are monotone on the out-of-time random-audit holdout, subject to uncertainty review.
4. Selected-candidate overall fixed-bin calibration error is no more than 0.10.
5. No powered subgroup has fixed-bin calibration error above 0.15.
6. Selected Brier score is no worse than the unweighted baseline by more than 0.01.
7. No powered subgroup worsens Brier by more than 0.05 relative to the unweighted baseline.
8. At least one pre-registered primary loss has a 95% agreement-cluster bootstrap interval for candidate minus baseline entirely below zero.
9. Confidence bands 75 and 100 receive a separate uncertainty-aware overturn/correction review; the automated package does not declare this gate passed merely from point estimates.
10. Every false-positive deliberate-fabrication finding receives separate private human review and remains non-compensatory.
11. Canonical rows, ordered dataset digest, manifest, plan version, plan hash, code commit, and outputs reproduce from a clean offline run.
12. A separate explicit activation and production-release decision remains mandatory.

Failure implies simplification, abstention, pooling, continued collection, or continued shadow operation—not a more elaborate unsupported model.

## Output package

A successful offline run creates a new, previously nonexistent output directory containing:

- `report.json` — complete machine-readable private report;
- `report.md` — concise private review summary;
- `reliability.svg` — confidence reliability diagram;
- `analysis-manifest.json` — hashes for all outputs plus plan/export/code identity.

Output files never include raw evidence, direct identities, private rationales, provider references, exact payment data, or raw stake amounts. They remain private research data because pseudonymous rare combinations may still be identifying.

## Synthetic fixture policy

Deterministic synthetic fixtures test parsing, integrity failures, splitting, metrics, candidate comparison, uncertainty, output hashing, and the non-authorization boundary. Synthetic results are never empirical evidence, never satisfy real-data readiness, and never justify parameter fitting or activation.

## Held-out opening procedure

The command-line runner requires an explicit `--acknowledge-heldout-open` flag. Before a real export is generated or downloaded, an administrator must verify that this exact plan document and its SHA-256 are frozen. Opening a held-out export is irreversible for the authorized analysts. Any methodological change after opening requires a new plan version, a new future cutoff, and a new held-out set.
