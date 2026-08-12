# Reciprocal Trade bilateral-encouragement study planning package v1

**Status:** design-specific precision simulation completed; synthetic planning only; no launch; no real eligible population; no independent ethics determination; no assignment generated; no participant-level causal credit

This package performs the next safe step after merging the QA-only study-instrumentation foundation: it freezes proposed assignment and analysis code for the first mechanism-specific study family and runs a deterministic precision simulation. It does not authorize a study.

## Exact bindings

- Master protocol: `sha256:cd663ae722ee028ddfe3e1b866acab9ef79b5fcf5b5418d053bd3687eca3881a`
- Reciprocal Trade template: `sha256:cf0a7a96294b431dcd79879fa01b7d1031ea50a842cebca6986e13351bcbb1e1`
- Evidence-to-product mapping: `sha256:eb4aadae8491c1a6924fca03acdeb9157b07a1439098e736c88e549db16b59b8`
- Study-instance payload: `sha256:1e31b1db59899fbf07fbf8b6219c8699f0c6b0ddbeb6e8717f989487660aaba2`
- Precision report payload: `sha256:3ff2613f93d166e5e06a5bf8cfcaf029cd49d4e56690e345f676a51f982f6b4f`
- Assignment code: `sha256:0f12661ba6f959299cd85da38646477c70899aca0a9b25d23b35c056fd97911e`
- Analysis code: `sha256:7106516340686b7f93df9f19dcdd1c82bde8134e693be65690ab0925644bf45f`

The study instance remains `executionAuthorized=false`, `realUserAssignmentAllowed=false`, `subjectMode=synthetic_only`, and `instrumentationEnvironment=qa`.

## Proposed design

The proposed design is a stratified, blocked, graph-cluster 2×2 encouragement policy with four equal-probability arms:

1. neither role encouraged;
2. role A only;
3. role B only;
4. both roles encouraged.

The primary estimand is the policy-level assignment-policy intent-to-treat contrast between `both_roles` and `neither_role`. It is not the effect of an actual participant's decision to accept, pledge, trade, or complete an action.

The assignment implementation requires the eligible graph-cluster snapshot to be frozen before seed generation. Within every stratum, the cluster count must be divisible by four. Each complete block receives one cluster in each arm. A snapshot mismatch or incomplete block fails closed.

The analysis implementation uses a dyad-weighted cluster-level Hájek ratio contrast, a design-based residual variance estimate with a small-sample critical value, and a cluster-label randomization test. It explicitly disables participant-specific credit and additive participant attribution.

## Precision simulation

The deterministic simulation uses 400 Monte Carlo replicates for each of 60 scenarios. The planning grid varies:

- 50, 100, 200, 400, and 800 independent clusters per arm;
- intended absolute policy effects of 0, 2, 3, and 5 percentage points;
- intracluster correlations of 0.01, 0.05, and 0.15.

The frozen planning assumptions are:

- 5% control completion probability;
- mean 8 eligible dyads per cluster;
- cluster-size coefficient of variation 0.75;
- maximum 40 eligible dyads per cluster;
- 75% compliance;
- 5% contamination;
- 10% attrition.

Under those assumptions, a nominal 3-percentage-point policy effect is diluted to a 2.1375-percentage-point ITT effect. Requiring the lower endpoint of the Monte Carlo 95% interval for power to exceed 80% across ICC values through 0.05 yields a planning envelope of **800 clusters per arm, 3,200 total clusters**. In the worst covered scenario, simulated power is 96.25% with Monte Carlo interval 93.91%–97.71%, and the median 95% confidence-interval half-width is about 1.07 percentage points.

At 400 clusters per arm, worst-case simulated power is 78.75%; its Monte Carlo lower bound is about 74.48%, so that size does not satisfy the proposed planning target.

The point-estimate type-I error diagnostic remains below the planning ceiling across the grid. With only 400 replicates, some Monte Carlo upper confidence bounds exceed that ceiling; the report preserves this warning rather than presenting the simulator as fully calibrated.

These numbers are a planning envelope, not a validated sample size. An actual graph can have a giant component, unsupported exposure cells, worse contamination, different cluster sizes, or too few independent clusters.

## Why the decision is `no_launch`

The exact precision report returns `no_launch` because:

- no real eligible-population graph snapshot exists;
- graph partition and exposure-probability diagnostics are incomplete;
- no independent ethics determination exists;
- consent or waiver requirements are undetermined;
- the numerical planning target has not been substantively approved;
- the assignment seed has not been generated;
- no real-user execution authorization exists.

## Evidence boundary

This package can support design planning and later graph-feasibility review. It cannot support:

- a claim that invitations cause outcomes among Moral Trade users;
- `expected_additional` for any participant;
- `direct_causal_attribution` for any participant;
- verified counterfactual additionality;
- empirical calibration or activation of any PR #534 methodology.

Reviewed outcome evidence would establish occurrence and native-unit quantity only. The counterfactual remains a separate causal question.

## Conceptual source boundary

Toby Ord's *Moral Trade* motivates the distinction between factual and counterfactual trust and warns about negative externalities and incentives to manufacture bad baselines. *Convergence and Compromise* motivates treating threats, concentrated power, and poor collective decision procedures as blocking risks. *Moral public goods are a big deal for whether we get a good future* motivates skepticism that assurance or dominant-assurance mechanisms automatically solve free-riding. These sources shape the safety and interpretation rules; they are not empirical calibration data for this study.

## Reproduction

```bash
node scripts/commitments-trade-study/validate-planning-package.mjs
node scripts/commitments-trade-study/precision.mjs --check
```

Changing the study payload, assignment code, analysis code, simulation specification, report, or execution boundary requires a new exact review. No file in this package should be interpreted as permission to enroll or assign a real user.
