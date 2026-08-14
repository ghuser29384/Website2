# Frozen Model Specification

Status: pre-results specification for issue #695. Owner-selected values are fixed; other numeric choices are AI-proposed modeling priors. Parameters are not chosen to reproduce Model v1.

## Population and cohorts

The model has 60 monthly states. Meaningful-active stocks interpolate linearly between `(month 0, 0)` and the fixed EOY points `(12, 50,000)`, `(24, 100,000)`, `(36, 150,000)`, `(48, 200,000)`, `(60, 250,000)`. Archetype shares allocate each stock. For archetype `a` in month `m`:

`retained[a,m] = active[a,m-1] * monthly_retention[a]`

`new_active[a,m] = active[a,m] - retained[a,m]`

`acquisition_prospects[a,m] = new_active[a,m] / activation_rate[a]`

The central shares reconcile to 40% EA-identifying/sympathetic, 60% non-EA, and 15% support-only. Support-only users create review/coordination hours but no automatic cash or underlying action impact. Transaction-active, repeat, retained, and churned quantities are reported separately.

## Joint heterogeneity and budgets

The ten archetypes carry joint cash/time budgets, resource profiles, mechanism propensities, WTP/WTA, action cost, trust/evidence tolerance, reliability, retention, and repeat priors. Archetype identity and correlated latent factors preserve dependence. The model does not draw every variable independently.

Annual cash budgets average exactly $100 within EA actives and $50 within non-EA actives, including modeled zero-spend users. Cash and time capacity is allocated once across mechanisms before matching. Every mechanism receives a disjoint slice; unused capacity remains unused. Participant time is never monetized in the central net result.

## Resource-specific cause profiles

Each archetype has one general 100-Sparks profile. `money`, `ordinary_action`, and `skilled_work` inherit general unless `RESOURCE_PROFILES.json` supplies an override. `career` is represented for inheritance completeness but excluded from central mechanisms. The nine fixed fields are factory-farming reduction, wild-animal suffering, residual existential-risk prevention, preventing extreme power concentration, biorisk prevention, space governance, global health, strategic reasoning, and environmental protection. Transaction-specific compatibility perturbs inherited profiles and can leave a field at zero.

## Donation Redirects

Two order families are modeled: structured opposed-spending redirects and credible lower-impact planned-donation redirects with matcher add-ons. The hand-fixture implementation constructs cent-denominated creator authorizations and matcher orders with structured source sides, accepted destinations, amount, minimum fill, full/partial preference, deadline, and add-on requirement. Deterministic sorting and partial fills enforce conservation and forbid double clearing.

The aggregate forecast separately reports planned principal, additional matcher cash, rescued cash, within-high-impact reallocation, unmatched fallback, payment/settlement loss, and donation displacement. Compatibility comes from structured terms and cause profiles, never labels alone.

## Direct reciprocal trades and Co-Acts

The five action categories are dietary/animal-product commitments, consumption changes, transport/carbon behavior, skilled work, and learning/forecasting/strategic-reasoning practice. Donation transfers are not a direct-action category.

Compatible quantity is a nonlinear function of supply, demand, cause fit, category fit, timing, WTP/WTA price overlap, evidence burden, and trust. Price lies between accepted WTA and WTP. Supply/demand, payment, and hours are conserved. Cause-directed payment reaches a frozen project/charity; personal-income payment goes to the actor and is not field cash.

Same-action and complementary-role Co-Acts are distinct. Group sizes use a fixed mixture: mostly 2-20, some 20-100, and rare standardized groups above 100. Completion includes attrition, coordination cost, evidence, and role bottlenecks; complementary completion is zero if any required role fails.

## Open voluntary DAC pools

Central DACs are open, voluntary, and single-threshold. For project target `T` and frozen pool surcharge `r`, gross threshold `G = T*(1+r)`. Success sends exactly `T` to the project and `r*T` to the segregated reserve. Reserve inflows and failure-bonus outflows are internal transfers, not high-impact output.

The initial $2,500 is centrally zero-interest, subordinated, conditionally recoverable founder reserve capital with no five-year withdrawal. A separate sensitivity treats it as permanent cost. Each authorization freezes its own time-decreasing rate. Central is linear 10% to 2%; sensitivities are 5% to 1%, 15% to 2%, and front-loaded nonlinear. Locked maximum liability must be at most reserve cash exactly. Otherwise the pledge waits/rejects and cannot count as funded. No accepted promise is prorated.

Pool success is generated from potential contributors, target, pledge size, arrival, valuation, strategic delay/free-riding, bonus response, social proof, trust/evidence, and the surcharge-raised gross threshold. It is not an inserted success-rate parameter. The central published-rate policy is a transparent controller bounded at 2%-15% and frozen per pool. Fixed-rate and stress-percentile policies are separate sensitivities.

## Additionality and displacement

Latent states distinguish would-do-anyway, might-act, Moral-Trade-caused, and duration/amount-increased behavior. Cash and labor receive probability-weighted causal credit. Donation displacement is bounded by gross caused giving; 12 months is central and 90 days is a sensitivity. Timing-only shifts are separate. Exact individual counterfactuals are not claimed.

## Forecasts and uncertainty

The deterministic reference uses all central values. Monte Carlo uses fixed seeds, correlated platform factors, archetype hierarchy, and a mixture of fixed, logistic-normal, truncated-normal, triangular, lognormal, and Bernoulli priors. Parameter uncertainty is summarized within each structural scenario; structural scenarios are not probability-averaged.

Conditional results hold the owner trajectory fixed. Probability-weighted results first draw adoption and operational state; active scale changes matching thickness, trust, repeat, and completion nonlinearly before outputs are generated. It is not a linear haircut on conditional results.

## Pre-registered outputs

For Year 1, Year 5 annual, five-year cumulative, and EOY5 annualized run rate, the model reports planned principal, genuinely additional cash, rescued cash, within-high-impact reallocation, cause-directed cash, personal-income transfers, displacement, timing shifts, categorized cash costs, net causal cash, ordinary/skilled/support hours, completed direct/same-action/complementary commitments, successful/lapsed DAC projects, project funding, surcharge, liabilities, reserve cash/free reserve, and capacity-waiting pledges.

`net_causal_cash = new_cash + rescued_cash - donation_displacement - cash_operating_costs`

The portfolio summary reports mean, median, p5/p10/p25/p75/p90/p95, zero/negligible probability, and threshold-exceedance probabilities. Means and medians are never added across uncertain distributions. Exact field numbers are appendix-only and explicitly weak.

## Exclusions

Donation Upgrades, career/salary-gap pools, institutional trades, and Threshold Sign-Ons are excluded from central totals. Compulsory 5% governance is noncentral. There are no runtime imports, migrations, payments, production data, or deployments.

