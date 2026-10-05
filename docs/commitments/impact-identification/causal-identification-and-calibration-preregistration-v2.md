# Commitments causal-identification and calibration protocol v2

**Status:** under review; design contract specified but not validated; execution unauthorized; all modeled causal components withheld

**Exact machine-readable master:** `master-protocol.v2.json`

**Exact schema:** `protocol.schema.json`

**Exact evidence mapping:** `evidence-to-product-mapping.v2.json`

**Exact templates:** six files under `study-templates/`

## Decision

This version remediates substantive review `4905684444`. It converts the earlier prose-only design family descriptions into a fail-closed, machine-readable evidence contract.

It does not approve a PR #534 methodology, authorize a study, create empirical calibration evidence, permit a participant-level impact score, apply a migration, merge a runtime change, or deploy anything. A production experiment is not authorized.

The governing distinction is:

> An assignment-policy ITT may support a policy-level claim. It does not authorize participant-level causal credit.

A participant's acceptance, pledge, signature, payment, trade, or completed commitment is generally post-assignment behavior. Noncompliance, interference, strategic timing, and selection separate the effect of assignment from the effect of the participant action. A local complier or peer effect is secondary, applies only to its exact study population and assignment policy, and is non-additive. It cannot be generalized into universal participant credit.

## Source boundary

The protocol is conceptually informed by three Moral Trade sources:

- Toby Ord, *Moral Trade* (2015), which distinguishes factual trust from counterfactual trust, treats the no-trade default as central to gains from trade, and warns about negative moral externalities and perverse incentives.
- William MacAskill and Fin Moorhouse, *Convergence and Compromise* (2025), which emphasizes that trade may create large gains while threats, bargaining power, concentrated control, and poor collective-decision procedures can destroy value.
- Tom Davidson, William MacAskill, and Mia Taylor, *Moral public goods are a big deal for whether we get a good future* (2026), which emphasizes free-riding and argues that assurance and dominant-assurance mechanisms do not automatically solve the public-goods problem.

These sources motivate the baseline, threat, free-riding, externality, and manipulation safeguards. They are not empirical evidence about Moral Trade users or model calibration.

The protocol also uses statistical-method principles from interference-aware experiments and prediction-model validation. Those papers define design principles; they are likewise not Moral Trade outcome evidence.

## Evidence-to-product boundary

The exact mapping is machine-readable in `evidence-to-product-mapping.v2.json`.

### Evidence that does not require a causal study

- **Deterministic terms:** frozen thresholds, pledges, contribution caps, deadlines, invitation terms, and other product state may be shown when current and valid.
- **Reviewed outcome evidence:** receipts, provider events, settlement records, manifests, and adjudicated evidence may establish occurrence and native-unit quantity. They do not establish the counterfactual.
- **Baseline redirected:** may be shown only when the pre-exposure baseline and cancellation or nonpayment evidence are adequate. It is not new money.
- **Platform-funded bonus:** may be shown from the platform or sponsor ledger and must remain outside participant-caused totals.
- **Cooperative allocation:** may be shown as a separate allocation lens when its characteristic function and error rules are approved. It is never summed with direct causal attribution.

### Evidence a policy-level randomized study may support

A validated exact study may support a claim such as:

> Assignment to this invitation, offer, reminder, saturation, or bonus policy changed the prespecified reviewed outcome by the estimated amount in this study population and period.

The claim must name the assignment policy, target population, outcome, time window, estimator, uncertainty, interference assumptions, and transportability limits.

### Evidence a policy study may not support

A policy ITT does not support:

- PR #534 `expected_additional` for a particular participant;
- PR #534 `direct_causal_attribution` for a particular participant;
- “verified additionality” or “verified impact”;
- additive summation of local peer or complier effects;
- high-confidence participant impact.

Those components remain withheld unless a separate exact study identifies the exact participant-action estimand and the causal, predictive, and transportability evidence streams each pass their own gates.

## Reproducible study-instance contract

Every real study must instantiate one of the six machine-readable templates. A study instance is invalid unless it binds all fields listed in `master-protocol.v2.json`, including:

1. **Identity and population**
   - study key and version;
   - mechanism and study variant;
   - eligible-population snapshot hash;
   - eligibility and exclusion rules;
   - target population and period.

2. **Units**
   - unit of assignment;
   - unit of exposure;
   - unit of outcome;
   - unit of analysis;
   - interference-cluster definition.

3. **Assignment**
   - exact randomization design;
   - assignment probabilities;
   - blocking and stratification variables;
   - constrained-randomization admissible set and selection rule.

4. **Exposure**
   - deterministic exposure mapping;
   - supported exposure cells;
   - action when a cell is empty or structurally unsupported.

5. **Estimand**
   - primary estimand;
   - potential-outcome contrast or exact mathematical expression;
   - target population;
   - exactly one primary outcome.

6. **Estimator and inference**
   - estimator, such as Horvitz–Thompson, Hájek, or a justified randomization test;
   - design-based variance procedure;
   - finite-sample inference;
   - unequal-cluster-size handling;
   - covariate adjustment, frozen and precision-only unless separately justified.

7. **Missingness**
   - missingness and attrition estimand;
   - worst-case or bounded sensitivity analysis;
   - differential evidence-resolution audit by arm;
   - no silent removal of unresolved outcomes.

8. **Sensitivity**
   - interference and contamination;
   - unmeasured confounding where relevant;
   - overlap or positivity;
   - baseline misclassification;
   - attrition and post-assignment exclusions;
   - alternative exposure mappings where prespecified.

Naming a design family is not enough. The schema and validator reject a template that omits the estimand, exposure mapping, estimator, variance procedure, ethics, precision, concealment, safety, or provenance contract.

## Network and graph feasibility

Partial interference is not assumed merely because the product labels observations as separate trades, pools, projects, campaigns, or pairs.

Before assignment, every networked study must report:

- connected-component and cluster-size distributions;
- largest-component share;
- number of independent randomized clusters;
- effective sample size;
- supported exposure probabilities;
- expected exposure-cell counts;
- cut-edge contamination;
- prespecified multi-hop spillovers;
- cluster-size imbalance.

A study is not launched when one or a few components dominate effective sample size, when exposure probabilities are too small for the precision target, or when graph partitioning and contamination cannot be specified defensibly.

Graph partitioning, exposure probabilities, and the no-launch threshold are frozen before assignment. Connected users are never silently treated as independent.

Co-Fund, Threshold Funding, and Threshold Sign-On use participant-project, participant-pool, or participant-campaign graphs that include every unit sharing a participant during the outcome window.

## Human-participant ethics

Before any real-user assignment, the study requires a documented independent ethics determination appropriate to the governing institution and jurisdictions.

That determination must identify:

- who counts as a research participant;
- whether informed consent is required;
- whether a waiver or alteration is independently permissible, minimal-risk, and necessary;
- whether the control condition removes an entitlement or expected service;
- protections for minors and vulnerable users;
- risks from hierarchical, relational, social, or economic pressure;
- debriefing requirements;
- adverse-event monitoring and stop rules;
- privacy, retention, access, deletion, and incident response.

Gatekeeper permission does not substitute for participant consent when consent is required. Platform ownership does not by itself authorize experimentation on users.

No study arm may introduce threats, coercion, deception, harassment, harmful offers, unsafe identity disclosure, or a reward for manufacturing a worse baseline.

## Allocation concealment and adjudication

A seed commitment is necessary but insufficient. Every study instance must:

1. freeze the eligible-population hash before seed generation;
2. freeze the entropy source and seed-generation procedure;
3. prohibit seed shopping and undisclosed rerandomization;
4. if constrained randomization is used, freeze the admissible set and selection rule;
5. conceal assignment until eligibility is irreversible;
6. blind outcome adjudicators to assignment where feasible;
7. log every unblinding;
8. log every post-assignment eligibility change;
9. compare evidence resolution, exclusions, and missingness by arm.

The assignment manifest, analysis code, and outcome-adjudication rules are content-hashed before outcomes are examined.

## Precision, horizon, and no-launch rules

The inherited 40, 50, and 60 observation floors in PR #534 are provisional model-governance placeholders. They are not study sample sizes.

Before launch, design-specific simulation must use the actual:

- independent cluster count;
- cluster-size distribution;
- assignment and saturation probabilities;
- intracluster correlation;
- spillover strength;
- supported exposure probabilities;
- noncompliance;
- contamination;
- attrition;
- cluster-size imbalance.

The report must include:

- effective sample size;
- expected exposure-cell counts;
- interval-width or decision-loss target;
- simulation code hash and seed;
- sensitivity grid;
- no-launch determination.

The study uses a fixed horizon or a separately validated sequential design. Optional stopping on nominal significance is prohibited.

Scientific study reports use 95% uncertainty intervals. The product's 80% predictive interval remains a separate display convention and is not activated by this protocol.

## Separate predictive, causal, and transportability evidence

### Outcome prediction

Outcome-prediction evidence asks:

> How well does the model predict the outcome or quantity?

It requires time-respecting development, an untouched later-time or otherwise independent holdout, proper scoring rules, calibration, predictive-interval coverage, missingness, drift, and out-of-domain diagnostics.

A well-calibrated outcome model does not clear a causal-model blocker.

### Causal identification

Causal evidence asks:

> What exact contrast is identified by the assignment design and estimator?

It requires the randomization design, exposure mapping, and estimand to be specified together. It also requires supported exposure cells, design-based inference, interference handling, sensitivity analysis, and assignment integrity.

An invitation-policy effect is not the effect of actual acceptance.

### Transportability

Transportability evidence asks:

> To which users, mechanisms, policies, and future periods may the study result be generalized?

It requires a named target population and period, effect-modifier support, population overlap, temporal stability, and replication or prospective external validation.

No numerical confidence pass bands are approved here. High confidence remains disabled until an untouched validation and a later replication satisfy separately approved uncertainty-aware criteria.

## Safety vetoes and third-party effects

Every study instance specifies blocking safety outcomes for:

- harmful-offer and threat indicators;
- baseline manufacture or worsening after eligibility becomes salient;
- harm shifted to nonparticipants;
- coercion, harassment, identity exposure, or retaliation;
- concentration or exclusion effects;
- off-platform substitution;
- duplicate or overlapping resource claims.

These are vetoes. A favorable primary outcome cannot compensate for a safety veto unless a separate exact moral aggregation rule has been approved. This protocol contains no such rule.

## Immutability and amendment control

Every artifact has a canonical payload hash. Before approval or assignment, the protocol and study instance also require:

- a signed protected tag or equivalent append-only external record;
- an immutable registry record;
- binding of protocol, template, and study-instance payload hashes;
- founder approval reference;
- eligible-population snapshot hash;
- assignment-code and analysis-code hashes;
- seed commitment;
- ethics determination reference;
- amendment log.

Pre-assignment amendments and post-assignment deviations are separate. A material pre-assignment change creates a new payload hash and requires new review. A post-assignment change is a deviation and cannot silently rewrite the preregistration.

## Mechanism-specific templates

### Reciprocal Trade

The initial template uses a role-specific 2×2 encouragement policy at pre-randomization graph-cluster level:

- neither role encouraged;
- role A encouraged;
- role B encouraged;
- both roles encouraged.

It identifies policy effects in the exact graph and study population. It does not identify universal own and peer effects or the causal effect of an actual accepted trade.

The graph contains repeated counterparties and overlapping agreements. The study is withheld if a giant component or unsupported exposures make inference uninformative.

### Co-Fund

The template uses two-stage invitation saturation across independent participant-project interference clusters.

Each study instance chooses exactly one primary study variant:

- binary project delivery by the frozen deadline; or
- one scalar native-unit quantity of other resources unlocked.

The indivisible project outcome is not assigned wholesale to each participant. Participant marginal effects and Shapley allocation remain separate and non-additive.

### Threshold Funding / DAC

Pledge-invitation and bonus-design studies are separate immutable registrations.

- The invitation study estimates an invitation-saturation policy effect.
- The bonus study randomizes bonus terms at pool level and separately reports platform bonus cost.

No beneficial bonus-response sign is assumed. Neither study identifies focal-pledge pivotality.

### Donation Upgrade

The assignment cluster is defined on the donor–matcher–campaign interference graph, not donor identity alone.

Both the donor's planned donation and the matcher's no-offer plan are frozen before exposure. The primary outcome is reviewed new money absent from both baselines.

Acceptance is post-assignment and cannot replace assignment in the primary analysis.

### Threshold Sign-On

Public-signal and completed-action objectives require separate registrations.

- A public-signal study uses activated valid signatures as its primary outcome only when the signal itself is the frozen objective.
- A completed-action study uses reviewed completed acts; signatures are intermediate behavior.

Invitation, signature, withdrawal, threshold activation, identity reveal, and completion are distinct exposure or outcome states.

### Donation Redirect

The assignment cluster is a connected-user graph cluster. A giant-component fallback is mandatory.

An unranked outcome vector is prohibited. The study instance must use:

- one scalar native-unit primary outcome;
- one fully prespecified multivariate global test; or
- separate studies.

A shared-destination receipt is insufficient. The outcome record separately represents shared-destination payment, cancellation or nonpayment of each original plan, baseline-redirected amount, and new top-up.

Heterogeneous destinations remain separate without an independently approved conversion methodology.

## Validator and negative tests

Run:

```bash
node scripts/validate-commitments-impact-identification.mjs
node scripts/validate-commitments-impact-identification.mjs --self-test
```

The validator recomputes canonical hashes, checks the master manifest and all six templates, enforces the evidence-to-product mapping, verifies the required prose sections, and runs negative tests.

The negative tests prove rejection of at least:

- a missing primary-estimand binding;
- a missing ethics determination;
- execution authorization;
- participant credit authorization;
- missing safety vetoes;
- policy ITT relabeled as direct attribution;
- conceptual material inserted as calibration evidence;
- high confidence enabled;
- Donation Redirect's prohibited unranked vector;
- a tampered payload hash.

## Current authorization boundary

The master protocol, evidence mapping, and six templates remain under review.

The following remain blocked:

- real-user assignment;
- QA or production treatment instrumentation;
- any payment, match, or failure-bonus experiment;
- participant-specific `expected_additional`;
- participant-specific `direct_causal_attribution`;
- high-confidence impact labels;
- PR #534 methodology approval or activation;
- production migration, merge, or deployment.

The next engineering tranche, after substantive approval of the exact artifacts, is an immutable QA-only study-instance registry and assignment/outcome instrumentation. It is not a live experiment.
