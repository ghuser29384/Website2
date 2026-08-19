# First Complete Run Preservation

The first complete frozen-parameter Model v2 run is preserved in this branch's Git history at commit `2b3a2c2d` (`Preserve frozen Moral Trade Model v2 first run`). It used base `79ca382c3bdc325dfc5a28e2cbbafc1b95640386`, 200,000 draws for each of 11 structural scenarios and two forecast bases, and frozen input-set hash `f855e4ed730f554e5a2572c21e6dc950896ce6aee2f3e9fd7729235720ada02f`.

The first run passed 20 unit tests, 462 generated invariant rows with zero failures, 1,148 independent checks, and a second 200,000-draw byte comparison across 21 intended files. Its core output hash was `03a21567fc5fde1fc6f1343a442a1c8ed44f2bd85fbd038cf0283d6207a85c88`; the independent reproduction tree hash was `d16be958748a00ab91aa38bc4436ef577fb88446e02c6740c3d697f0c69fc932`; and its final manifest package-tree hash was `634530d7d9ecb0a4c68283b98e700790e65ad30816f1fd3067e0d1020c580463`.

## First-run central results

All figures below are prior-driven synthetic forecasts, not empirical estimates or approved report headlines.

| Forecast | Mean net causal cash | Median | P10 | P90 |
|---|---:|---:|---:|---:|
| Conditional Year 1 | $17,382.87 | $5,455.78 | -$12,171.17 | $62,599.07 |
| Conditional Year 5 annual | $142,994.99 | $43,200.87 | -$103,162.40 | $520,575.50 |
| Conditional five-year cumulative | $400,696.50 | $121,522.19 | -$288,375.49 | $1,457,765.12 |
| Conditional EOY5 annualized run rate | $157,435.27 | $47,555.16 | -$113,576.98 | $573,052.08 |
| Probability-weighted five-year cumulative | $166,161.64 | -$20,287.97 | -$137,448.32 | $696,607.33 |

Conditional five-year scenario medians were: central $121,522; compulsory 5% governance $74,301; direct underperformance $110,665; high-bonus/surcharge-sensitive $125,825; near-zero additionality -$323,948; redirect-dominant $534,559; reserve-constrained DACs $127,702; strong network/repeat $491,668; thin market -$167,975; trust/evidence failure -$111,489; and voluntary pools $123,246.

The historical owner-reported Model v1 conditional five-year median was approximately $580,000. The first-run Model v2 ratio was 0.2095 and its nominal median difference was -$458,477.81; the estimands and structures differ.

## Why a revision followed

A requirement-by-requirement audit after the complete run found that the aggregate implementation used an inserted `direct_mean_price` instead of forming price from its archetype WTP/WTA states; collapsed cause/category/timing compatibility into residual match efficiency; described but did not expose every archetype/mechanism latent state; generated DAC demand without explicit contributor-set and pledge-size accounts; and interpolated a stress rate rather than choosing the lowest 2%-15% grid rate meeting a stated solvency inequality. These are specification-compliance defects, not unfavorable result findings.

The first run was committed before correcting them. New structural priors were selected and documented before generating revised outputs. The correction must remain accompanied by `REVISION_LOG.md`; neither result may be represented as empirical calibration.
