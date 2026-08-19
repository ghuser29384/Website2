# Model v2 versus Model v1

Issue #695 records Model v1's latest conditional five-year median as approximately $0.58M nominal new-or-rescued cash. No Model v1 artifact was found on the inspected current-main tree, so this package does not reconstruct, edit, or overwrite it. The comparison uses only the owner-provided historical figure.

Model v2 is not tuned to reproduce $0.58M. Differences are attributable to specific structures:

- sixty monthly cohorts with archetype retention, activation, support-only, churn, and repeat use rather than a single group-average user count;
- ten joint archetypes that reconcile fixed EA/non-EA cash means and carry dependent budgets, profiles, propensities, WTP/WTA, trust, reliability, and time;
- disjoint individual/archetype cash and time budgets before mechanisms rather than an aggregate overlap haircut after outputs;
- structured many-to-many exact-cent Redirect clearing constraints and separate principal/add-on/rescue/reallocation/fallback/loss accounts rather than one match-rate/transaction-size product;
- nonlinear direct supply-demand-price-evidence matching and explicit same-action/complementary Co-Act attrition and role bottlenecks;
- behavior-generated, reserve-covered DAC pools with surcharge/bonus trade-offs and exact internal-transfer exclusions rather than an exogenous success rate;
- prospective-counterfactual causal credit, 12-month displacement, and timing shifts rather than one broad mechanism additionality discount;
- cash operating costs and nonlinear adoption/operational failure as separate forecast bases;
- resource-specific profile inheritance and draw-level field choice rather than a fixed mechanism-by-field table.

`outputs/model_v1_comparison.json` records the frozen-run numerical delta without treating either median as an additive statistic or forcing agreement. Model v1 remains a superseded preliminary scenario until the owner explicitly approves cutover.

In the final corrected 200,000-draw run, Model v2's conditional five-year median net causal cash is $105,603.03, or 0.1821 times the owner-reported $580,000 Model v1 figure, with a nominal difference of -$474,396.97. The preserved first complete Model v2 run was $121,522.19; the post-run structural correction changed that median by -$15,919.16. These are transparent comparisons between different estimands and structures, not evidence that either forecast is calibrated.
