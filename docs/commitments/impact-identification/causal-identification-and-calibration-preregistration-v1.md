# Commitments causal-identification and empirical-calibration master protocol v1

**Status:** draft internal preregistration; design specified but not validated; execution is not authorized; all modeled causal components remain withheld

**Prepared against:** current `main` `067ed16110e3031b47935534f8cfba4633b5a04e` and the six `under_review` v2 methodology candidates in PR #534 at `101ffbf45571a0e7b1a50e41a55a27d699abaf83`

## Decision

The next substantive Commitments impact-accounting gate is not production deployment and not model approval. It is a defensible, prospectively frozen causal-identification and empirical-calibration design.

This Git-committed document fixes the master protocol for that work without pretending that the design is already validated. It does not:

- approve any methodology hash;
- authorize any experiment, production randomization, payment, bonus, or user-facing study;
- register empirical calibration evidence;
- convert reviewed outcome evidence into additionality;
- permit a participant-specific causal-impact total;
- permit a high-confidence label;
- change PR #534, its six methodology objects, or their hashes.

Each actual study must create a separate immutable study-instance record satisfying the requirements below. Until then, the product may show deterministic terms and reviewed outcomes while withholding every modeled causal component.

## Source boundary

### Conceptual foundations

The three Moral Trade sources identify the substantive problems the studies must respect:

- Toby Ord, *Moral Trade* (2015): moral trade is evaluated relative to a no-trade default; factual trust and counterfactual trust are distinct; receipts can establish occurrence without settling what would have happened otherwise; moral trade can create externalities and perverse incentives.
- William MacAskill and Fin Moorhouse, *Convergence and Compromise* (2025): gains from trade may be large, but threats, bargaining power, concentration of power, and defective collective-decision procedures can destroy value.
- Tom Davidson, William MacAskill, and Mia Taylor, *Moral public goods are a big deal for whether we get a good future* (2026): moral public goods face severe free-riding; assurance contracts can fail despite large gains from trade; dominant-assurance bonuses only modestly alter incentives in the authors' theoretical discussion.

These are conceptual inputs. They are not outcome datasets, assignment logs, fitted-model evaluations, or calibration reports.

### Statistical-method foundations

The master protocol uses established design principles rather than treating predictive models as causal evidence:

- Hudgens and Halloran (2008), “Toward Causal Inference With Interference,” DOI `10.1198/016214508000000292`: two-stage randomization and direct, indirect, total, and overall effects under partial interference.
- Aronow and Samii (2017), “Estimating Average Causal Effects Under General Interference,” DOI `10.1214/16-AOAS1005`: randomization design, exposure mapping, and estimands must be specified together under interference.
- Kang and Imbens (2016), “Peer Encouragement Designs in Causal Inference with Partial Interference,” arXiv `1609.04464`: encouragement designs with network noncompliance require explicit assumptions and identify local rather than universal effects.
- Jiang, Imai, and Malani (2023), “Statistical Inference and Power Analysis for Direct and Spillover Effects in Two-Stage Randomized Experiments,” DOI `10.1111/biom.13782`: design-based inference and power analysis for two-stage experiments.
- Steyerberg et al. (2010), “Assessing the Performance of Prediction Models,” DOI `10.1097/EDE.0b013e3181c30fb2`: calibration, discrimination, Brier score, and decision-relevant performance are distinct.
- Van Calster et al. (2016), “A Calibration Hierarchy for Risk Models,” DOI `10.1016/j.jclinepi.2015.12.005`: calibration-in-the-large, calibration slope, and stronger forms of calibration should not be conflated.

These methods are methodological bases, not empirical evidence about Moral Trade users or mechanisms.

## Cross-cutting study contract

### 1. Primary estimand

The primary causal estimand is the **intent-to-treat effect of a randomized assignment policy**.

Examples include assignment to receive an invitation, reminder, upgrade offer, redirect offer, or a project-level invitation-saturation policy. The primary analysis follows assignment regardless of whether the user accepts, pledges, signs, pays, or completes the action.

A treatment-on-treated, complier-average, local-average, or participant-specific direct effect is secondary. It is prohibited unless the exact study separately defends:

- the instrument or encouragement;
- monotonicity;
- exclusion restrictions;
- the interference exposure mapping;
- overlap or positivity;
- contamination;
- sensitivity to violations.

No local effect may be presented as a universal participant effect.

### 2. Randomization integrity

Before assignment, every study instance must freeze:

1. the eligible population and exclusions;
2. the unit of randomization;
3. the interference cluster;
4. the exposure mapping;
5. treatment arms and assignment probabilities;
6. a state snapshot and its hash;
7. the assignment algorithm version;
8. a cryptographic commitment to the randomization seed;
9. one primary estimand and one primary outcome;
10. the outcome window and adjudication rules;
11. the estimator and analysis-code hash;
12. the stopping or fixed-horizon rule.

After assignment, the study must record the assignment-manifest hash, arm balance, contamination, deviations, missingness, exclusions, and adverse events.

### 3. Interference

No-interference analysis is prohibited when one participant's assignment can affect another participant's behavior or outcome.

The study must define an exposure mapping before outcomes are examined. Depending on the mechanism, the mapping may include:

- own assignment;
- counterparty assignment;
- invitation saturation within a pool or campaign;
- realized fraction of assigned peers;
- pre-assignment progress;
- repeated-counterparty history;
- reveal, withdrawal, shortfall, substitution, or automatic-obligation rules.

The analysis must use the actual randomization design. When the number of independent clusters is small, exact or randomization-based inference is preferred over asymptotic unit-level standard errors.

### 4. Outcomes and multiplicity

Each study instance freezes exactly one primary outcome.

Mechanism-specific secondary outcomes may still be reported, but they must remain labeled secondary or exploratory. A failed primary outcome cannot silently be replaced with a favorable secondary outcome.

Reviewed evidence establishes outcome occurrence and quantity. It does not by itself establish additionality.

### 5. Missingness, attrition, and unresolved evidence

The primary report must:

- report missingness and unresolved evidence by assignment arm;
- treat resolution failure as an outcome rather than silently dropping it;
- provide prespecified worst-case or bounded sensitivity analysis;
- treat model-based imputation as sensitivity-only unless separately justified;
- report exclusions and deviations from the frozen eligible population.

### 6. Precision and stopping

The inherited numerical sample floors in the v2 methodologies remain provisional. They are not study sample sizes.

Before launch, the study team must run design-specific simulation across plausible ranges of:

- control outcome rates;
- effect sizes;
- intracluster correlation;
- spillover magnitude;
- noncompliance;
- contamination;
- attrition;
- cluster-size imbalance.

The study horizon is chosen from decision-relevant interval width and operational feasibility, then frozen. No optional stopping on nominal statistical significance is permitted.

Scientific study reports use 95% uncertainty intervals. The product's separate 80% predictive interval is considered only after exact methodology approval, eligible calibration, and current passing model health.

### 7. Harm, threats, and strategic manipulation

No study arm may:

- introduce a threat, coercion, deception, harassment, or harmful offer;
- switch off harmful-offer enforcement;
- reward a participant for manufacturing a worse baseline;
- encourage an actor to create harm so that someone will pay to stop it;
- suppress required safety information;
- expose private identities contrary to the frozen mechanism terms.

A study that cannot satisfy these conditions is out of domain.

## Mechanism-specific designs

| Mechanism | Master design | Primary policy effect | Why participant-specific credit remains blocked |
|---|---|---|---|
| Reciprocal Trade | Graph-cluster randomized peer encouragement | Effect of encouragement on the counterparty's reviewed native-unit outcome | Bilateral dependence, repeated counterparties, noncompliance, and cross-dyad spillovers |
| Co-Fund | Two-stage randomized invitation saturation | Effect of the invitation-saturation policy on the frozen coalition outcome | A participant can change others' contributions, exits, and obligations; the indivisible project cannot be assigned wholesale to each participant |
| Threshold Funding / DAC | Two-stage randomized invitation saturation; any bonus-rate trial is separate | Effect on threshold success or captured other eligible funding | Pledge arrivals, withdrawals, payment capture, and bonuses interfere; focal-pledge pivotality is not an experimentally assigned treatment |
| Donation Upgrade | Donor-cluster randomized offer versus no offer | Effect of offer exposure on new money absent from both frozen baselines | Acceptance is post-assignment; repeat donors and matcher leakage must be clustered |
| Threshold Sign-On | Two-stage randomized invitation saturation by campaign | Effect on the campaign's frozen objective | Signatures and completed acts are different outcomes; invitation saturation and progress create spillovers |
| Donation Redirect | Connected-user-cluster randomized redirect offer | Effect on the pair-level resource-allocation outcome vector | Pair outcomes are joint; acceptance is post-assignment; the same user can contaminate multiple pairs |

### Reciprocal Trade

- **Analysis unit:** frozen eligible unordered dyad opportunity.
- **Randomization:** graph clusters are fixed before assignment so repeated counterparties and connected dyads do not cross arms.
- **Treatment:** a personalized invitation or reminder concerning the exact frozen opportunity.
- **Primary outcome:** one reviewed native-unit counterparty outcome selected before assignment.
- **Baseline use:** both no-agreement plans are frozen as covariates and integrity checks, not treated as proof of the counterfactual.
- **Primary effect:** cluster-level ITT of encouragement.
- **Blocked claim:** the dyad-level ITT does not justify participant-specific direct credit without a separately approved peer-encouragement analysis.

### Co-Fund

- **Analysis units:** project and eligible participant.
- **Randomization:** projects are assigned to invitation-saturation levels; eligible participants are randomized within project.
- **Primary outcome:** either delivery by the frozen deadline or one reviewed native-unit deliverable quantity, selected in the study instance.
- **Primary effect:** policy effect of invitation saturation on the coalition outcome.
- **Spillovers:** own invitation, project saturation, realized invited fraction, shortfall rules, exits, and automatic obligation increases.
- **Blocked claim:** participant marginal effects remain non-additive; the project deliverable cannot be credited in full to each participant.

### Threshold Funding / Dominant Assurance

This requires two separate study families.

1. **Pledge-invitation study:** two-stage randomized invitation or reminder saturation, with threshold success or captured other eligible funding as the frozen primary outcome.
2. **Bonus-design study:** a separate pool-level randomized trial of dominant-assurance bonus terms, only after the bonus budget, payment legality, and study execution are independently authorized.

Platform-funded bonuses remain separate outcomes. No beneficial bonus-response sign is assumed.

Deterministic pivotality and Shapley allocations may be shown as descriptive or allocative views. They are not substitutes for a randomized participant-level causal effect.

### Donation Upgrade

- **Analysis unit:** frozen eligible donation intent.
- **Randomization:** donor account cluster, with simultaneous eligible intents kept in one arm.
- **Treatment:** show the exact frozen upgrade or matching offer.
- **Primary outcome:** reviewed new money absent from both the donor's and matcher's frozen no-offer baselines.
- **Separate reporting:** donor amount, matcher amount, baseline-redirected money, refunds, reversals, and settlement.
- **Blocked claim:** acceptance cannot replace assignment in the primary analysis.

### Threshold Sign-On

Every study instance is exactly one of two types:

- **Public-signal study:** activated valid signatures are the primary outcome because the frozen objective is the signal itself.
- **Action study:** reviewed completed acts are the primary outcome; signatures are intermediate behavior.

No study may use signature count as a proxy for completed acts. Randomization uses campaign-level invitation saturation and participant-level invitation assignment.

### Donation Redirect

- **Analysis unit:** frozen eligible pair of opposed plans.
- **Randomization:** connected user component, keeping every pair involving one user in one arm.
- **Treatment:** show the exact frozen shared-destination redirect offer.
- **Primary outcome:** a prospectively frozen pair-level resource-allocation outcome vector.
- **Separate components:** shared-destination payment, cancellation or nonpayment of each original plan, baseline-redirected amount, and new top-up.
- **No value collapse:** heterogeneous destinations remain separate unless an independently approved conversion methodology exists.
- **Evidence rule:** a shared-destination receipt is insufficient without cancellation or nonpayment evidence for both original plans.

## Quasi-experimental fallback

Randomization is preferred. A quasi-experimental design is secondary and admissible only when it is prospectively registered before exposure.

Potentially admissible designs:

- an externally fixed or nonmanipulable regression discontinuity;
- a capacity or timing lottery;
- a prospectively frozen staggered rollout;
- an encouragement design with separately defended instrument assumptions.

Prohibited causal claims:

- matching-only causal attribution;
- post-hoc cutoff selection;
- before-after attribution without a credible control;
- participant-specific direct credit derived from predictive completion probabilities.

Required diagnostics include overlap, manipulation or sorting, placebo or pretrend checks where applicable, alternative bandwidths or specifications, sensitivity to unmeasured confounding, and interference or contamination.

## Predictive calibration protocol

Predictive calibration and causal identification remain separate.

### Eligible observations

Calibration may use only real, resolved, deduplicated observations with:

- immutable terms and state hash;
- known eligibility;
- complete mechanism version;
- reviewed outcome evidence;
- complete provenance;
- no unresolved duplication or resource-claim overlap.

Synthetic fixtures, conceptual papers, and software tests are ineligible.

### Development and holdout

1. Develop with time-respecting rolling-origin evaluation on earlier cohorts.
2. Freeze features, outcomes, transformations, model code, and hyperparameters.
3. Open one untouched later-time or otherwise independent holdout only after the model is frozen.
4. Any tuning on the holdout invalidates it and requires a new future cohort.
5. High confidence remains disabled until an untouched validation and a later replication both pass exact founder-approved criteria.

### Required metrics

For binary probabilities:

- calibration-in-the-large or intercept, with uncertainty;
- calibration slope, with uncertainty;
- flexible calibration curve, with uncertainty;
- Brier score;
- log score;
- discrimination as descriptive context only.

For continuous or count outcomes:

- 80% predictive-interval coverage, with uncertainty;
- interval width or weighted interval score;
- a proper scoring rule appropriate to the outcome;
- residual and probability-integral-transform diagnostics;
- absolute error in native units.

For every model:

- out-of-domain rate;
- required-field missingness;
- evidence-resolution rate;
- state-hash and assignment integrity;
- mechanism-version and subgroup calibration;
- temporal drift;
- duplicate or overlapping claim rate.

No numeric pass bands are approved in this protocol. Bands must be justified using holdout uncertainty and decision costs and then receive exact founder approval. `highConfidenceAllowed` remains `false`.

## Study-instance activation gate

A study may not assign a real user until all of the following exist:

1. exact founder approval of the master protocol version;
2. an immutable study-instance registry;
3. a frozen eligible-population snapshot;
4. a harm and privacy review;
5. a simulation-based precision report;
6. frozen assignment code and seed commitment;
7. frozen outcome-adjudication rules;
8. an analysis-code hash;
9. an environment-specific rollback and incident plan;
10. separate authorization for any production experiment, payment, matching fund, or failure bonus.

A completed study may not support modeled causal output until:

1. assignment integrity and contamination checks pass;
2. the outcome evidence and exclusion flow are complete;
3. the exact prespecified analysis is run;
4. deviations and sensitivity analyses are reported;
5. evidence artifacts are immutable and registered;
6. the resulting methodology hash receives substantive founder review;
7. model health passes on the approved evidence.

## Immediate engineering consequence

The next engineering tranche should be **QA-only assignment and outcome instrumentation**, not a live experiment:

- immutable eligible-population snapshots;
- study-instance registry records;
- seed commitments and assignment manifests;
- exposure mappings;
- reviewed outcome links;
- contamination, deviation, and missingness events;
- calibration-dataset manifests.

That tranche must remain fail-closed and must not assign production users until separately authorized.

## Current blockers

- The master protocol is not approved.
- No executable study instance is registered.
- No assignment or outcome instrumentation is deployed.
- No real empirical calibration evidence exists.
- No confidence-label pass bands are validated.
- No production study is authorized.
- PR #534's six v2 methodologies remain `under_review` and inactive.
- PR #534 is currently diverged from newer `main`; this protocol does not resolve or merge that PR.

## Verification boundary

This is a repository-only research specification. It does not alter production source, public assets, migrations, dependencies, deployment configuration, databases, payments, or user-visible behavior.

The exact Git commit containing this document is the internal preregistration artifact. Any substantive change to the estimand, assignment design, exposure mapping, outcome, analysis, calibration policy, or activation gate requires a new commit and a new review.

No product build, database migration, QA experiment, production experiment, or deployment is claimed by this document.
