# Audit of Whether ECM Exact Is the Best Current Mechanism for moraltrade.org

## Executive summary

The current public moral-public-goods mechanism on moraltrade.org is **not exactly identical** to the mechanism specified in *Escrowed Conditional Matching for Moral Trade and Moral Public Goods*. The biggest reason is simple and public: the live site repeatedly says it does **not** provide escrow or custody, whereas ECM exact makes escrow or equivalent custody central to clearing and release. The live MPGF is instead a **non-custodial, review-heavy, thresholded assurance-plus-sponsor-match pilot** with common-ground discovery and a capped post-threshold breadth bonus. My credence that the current live mechanism is **exactly identical** to ECM exact is therefore very low, around **0.03**. citeturn4view0turn4view1turn6view3turn6view5 fileciteturn0file2

The user-supplied target PDF, *Whether ECM Exact Is the Best Current Moral-Public-Goods Mechanism for moraltrade.org*, is **broadly accurate**. On the claims I audited, the strongest descriptive claims about the live site, Toby Ord’s paper, the Forethought essays, Stripe authorization windows, FTC donor-disclosure guidance, IRS TEOS, Gitcoin’s QF attack-surface warnings, and Optimism’s retro-funding caveats are mostly true or substantially true. The weakest parts of the PDF are not its live-site description but its **subjective credence numbers** and some **recommendation-heavy “exact best” claims**, which are defensible but not directly verifiable. citeturn10view0turn12view1turn12view3turn14view0turn15view2turn15view5turn15view7turn15view9 fileciteturn0file0

The highest-confidence improvements to the current live mechanism are the same ones the target PDF foregrounds: add **real supervised custody/escrow or a true equivalent**, make **cross-view counterpart conditions explicit in donor intents**, publish a **fixed ex-ante matching schedule**, disclose **maximum donor exposure and failure-path behavior**, run a **documented batch-round cadence**, publish **sponsor-pool segregation/governance**, make the **identity-counting / anti-sybil policy public**, and add an explicit **recipient registry and disbursement rulebook**. My credence is above 0.5 for each of those changes. citeturn6view3turn5view3turn14view0turn15view2turn15view5turn15view7 fileciteturn0file2

Just as importantly, the live site has several real strengths that should **not** be overwritten in a literal “follow ECM verbatim” rewrite: no global moral ranking, anti-threat and baseline blocking, privacy-safe previews, challenge and appeal lanes, immutable provenance/state-transition records, published API/schema contracts, and a coordinatability-focused common-ground discovery layer. Those features are visible on the current public site and are well aligned with Ord’s trust analysis and Forethought’s institutional and anti-threat concerns. citeturn20view2turn20view4turn18view1turn19view1turn21view1turn22view1turn23view0turn5view0turn12view4turn12view5turn11view6

## Methods and source base

I treated the review as **as-of June 3–4, 2026**, using the public pages as they were returned during browsing and citing any explicit timestamps when available. I first inspected the user-prioritized source stack in substance: Toby Ord’s *Moral Trade* via amirrorclear, Forethought’s essays on moral public goods and convergence/compromise, and current public pages on moraltrade.org, especially the homepage, MPGF overview, candidate pools, trust page, pilot status, validation, transparency page and JSON, safety page, and technical spec. I also checked the official operational/compliance sources the target PDF relied on: Stripe, FTC, IRS, Gitcoin, and Optimism. citeturn10view0turn1view1turn3view4turn3view0turn3view1turn3view2turn4view0turn4view1turn4view2turn4view4turn18view1turn8view0turn14view0turn14view1turn14view2turn14view3turn14view4

For the sentence-level audit, I evaluated **every truth-apt prose sentence and every substantive table-row proposition** in the target PDF, but I excluded headings, page numbers, bibliography URLs, and field-name lists or sample UI copy that are not meaningfully truth-evaluable. Where the target PDF’s comparison table split one underlying proposition across adjacent ECM/live-site cells, I merged those into one auditable claim unit to keep the table readable. fileciteturn0file0

A few user-prioritized domains were **not fetchable** in this browsing session and therefore did not materially affect the conclusions: openpublicgoods.org, commonpledge.org, multipliergiving.org, publicgoodsexchange.org, mtply.org, and mplr.org all returned no usable content in the browser. Giving Multiplier was accessible, but it was not load-bearing for whether the target PDF’s claims about the current moraltrade mechanism are true. citeturn1view15turn1view16turn1view17turn1view19turn1view20turn1view21turn1view18

Some linked moraltrade subpages existed in navigation but were not fetchable by the browser during this audit, most notably the MPGF governance page, funding-metrics page, and the public-round detail page. That means some narrow live-operation details could not be rechecked directly from those specific routes. However, the accessible homepage, MPGF overview, pools page, trust page, pilot-status page, transparency JSON, safety page, validation page, and technical spec were sufficient to identify the live mechanism’s core design. citeturn7view0turn7view1turn7view2turn3view0turn3view1turn3view2turn4view0turn4view1turn4view2turn4view4turn8view0

## Current mechanism against ECM exact

| Dimension | ECM exact | Current live moraltrade mechanism | My verdict |
|---|---|---|---|
| Custody and release | Escrow or equivalent custody, released only after verification. fileciteturn0file2 | Site publicly says **no escrow, no custody**, and MPGF says provider events are evidence rather than legal escrow. citeturn4view0turn6view3turn6view5 | **Major mismatch** |
| Donor pledge structure | Donor chooses amount, acceptable counterpart buckets, minimum counterparty volume, failure path, recognition. fileciteturn0file2 | Public MPGF shows campaign, amount, visibility, and fallback rule, but not public counterpart-bucket or minimum-counterparty controls. citeturn5view3 | **Partial mismatch** |
| Cross-view clearing | A trade counts only when sufficiently distinct moral buckets clear together. fileciteturn0file2 | Live pools show cross-cluster breadth and common-ground support, but public framing is still campaign assurance rather than explicit cross-bucket clearing. citeturn5view0turn5view1turn6view3 | **Partial mismatch** |
| Match structure | Precommitted matching applied only to conditionally cleared cross-view donations. fileciteturn0file2 | Sponsor pool, 1:1 challenge match, and capped QF-style bonus are public, but donor-facing bonus amounts are still ranges, not a fully fixed donor-visible schedule keyed to explicit cross-view clears. citeturn6view0turn6view1turn6view2 | **Partial mismatch** |
| Clearing cadence | Frequent batch rounds, roughly one to two weeks. fileciteturn0file2 | Public pages show a dated demo round and deadlines, but not a clearly published regular cadence. citeturn6view3turn6view5 | **Partial mismatch** |
| Failure handling | Explicit refund/reroute logic and donor-facing failure rules. fileciteturn0file2 | Live MPGF exposes a fallback rule, but not a full public round-end failure contract or max-exposure sheet. citeturn5view3turn6view5 | **Partial mismatch** |
| Anti-threat safeguards | Hard ban on harmful/extortionary trades. fileciteturn0file2 | Live site already rejects threat creation, coercive compensation, and related classes as blocking safety conditions. citeturn18view1turn4view0turn21view0 | **Substantial match** |
| Verification stack | Recipient registry vetting, milestone release, receipts/public proof. fileciteturn0file2 | Live site already has strong evidence, challenge, review, provenance, and state-transition machinery, but no live custodial disbursement stack. citeturn19view0turn22view1turn23view0turn4view0 | **Mixed: stronger review shell, weaker payment stack** |
| Sponsor-pool and anti-sybil governance | Public rules for identity, treasury separation, auditability, and plural governance. fileciteturn0file2 | Sponsor-pool size and some parameters are public; full counted-weight policy and treasury/governance detail were not visible on fetchable pages. citeturn6view0turn5view3turn7view2 | **Partial mismatch** |

The high-level conclusion from that comparison is straightforward: the live site is **adjacent** to ECM exact, not identical to it. Its public-goods layer is currently a **verified assurance-matching pilot** with strong review and transparency machinery, not an escrowed conditional-matching exchange. citeturn6view3turn4view1turn8view0 fileciteturn0file2

## Sentence-level audit

All claim units below are drawn from the user-supplied target PDF. fileciteturn0file0

### Executive summary and source-framing claims

| ID | Claim unit from the target PDF | Credence | Assessment | Why | Primary sources |
|---|---|---:|---|---|---|
| S1 | ECM exact is stronger than the current live MPGF pilot and closer to Ord’s trust-sensitive model. | 0.80 | Mostly true | Ord emphasizes factual/counterfactual trust and suggests escrow; live MPGF is non-custodial whereas ECM exact adds that missing layer. | citeturn11view1turn11view6turn4view0turn6view3 fileciteturn0file2 |
| S2 | The right build target is not ECM verbatim but an ECM-core hybrid that keeps moraltrade’s anti-threat, privacy, challenge, provenance, common-ground discovery, and capped breadth bonus features. | 0.68 | Plausible judgment | Strongly supported as a recommendation, but not directly provable as “the” exact best target. | citeturn18view1turn19view1turn21view1turn22view1turn5view0turn6view4 |
| S3 | The live platform already uses private-by-default cross-cluster breadth signals, a capped QF-style bonus after threshold/review, and unusually detailed validation/challenge/provenance/API-schema contracts. | 0.92 | True | All are directly visible on current public pages. | citeturn5view0turn5view1turn6view4turn8view0turn9view0turn23view0 |
| S4 | The current live mechanism is still a reviewed pilot, not a liquid exchange. | 0.99 | True | Pilot Status says this verbatim. | citeturn4view1turn17view5 |
| S5 | Current public pages show 0 live proposals/offers, 0 completed agreements, no custody/escrow, and integrated checkout planned but not active. | 0.98 | True | Homepage, trust page, and MPGF overview say exactly this. | citeturn17view0turn17view1turn4view0turn5view2turn6view5 |
| S6 | Transparency JSON shows many zero counts, consistent with an early-stage pilot rather than a scaled clearing mechanism. | 0.94 | Mostly true | The zero counts are direct; the “early-stage pilot” inference is very strong when combined with Pilot Status. | citeturn7view3turn17view8turn17view7turn4view1 |
| S7 | The accessible moraltrade pages used in the PDF are enough to identify the mechanism’s core shape even though some linked subpages were not fetchable. | 0.90 | True | Enough fetchable pages were available to identify the live design; some linked pages did return cache misses. | citeturn3view0turn3view1turn3view2turn4view0turn4view1turn4view2turn4view4turn8view0turn7view0turn7view2 |
| S8 | Ord’s paper says moral trade is cooperation across differing moral views, stresses factual and counterfactual trust, suggests escrow, and recommends simple early deployment. | 0.98 | True | Directly supported by the paper. | citeturn10view0turn11view1turn11view3turn11view5turn11view6 |
| S9 | Forethought’s relevant essays say moral public goods matter a lot; voluntary assurance is brittle; social norms scale poorly; and institutions and anti-threat safeguards matter. | 0.96 | True | Directly supported by both essays. | citeturn12view0turn12view1turn12view3turn12view4turn12view5 |

### Mechanism-comparison claims from the target PDF’s line-by-line table

| ID | Claim unit from the target PDF | Credence | Assessment | Why | Primary sources |
|---|---|---:|---|---|---|
| M1 | ECM uses donor-side pledges with amount, acceptable counterpart buckets, minimum counterparty volume, refund/reroute, and recognition consent; current public MPGF does not expose the bucket/minimum-counterparty controls. | 0.94 | True | ECM includes these controls; public MPGF does not visibly expose them. | fileciteturn0file2 citeturn5view3 |
| M2 | ECM requires sufficiently distinct moral buckets for trade clearing; live MPGF shows breadth/common-ground but not explicit cross-bucket trade clearing. | 0.91 | True | Distinct-bucket clearing is core in ECM; live public framing is still assurance/campaign-oriented. | fileciteturn0file2 citeturn5view0turn5view1turn6view3 |
| M3 | ECM uses precommitted matching on conditionally cleared cross-view donations; live MPGF has sponsor match and capped bonus but not a fully fixed donor-facing ex ante schedule tied to explicit cross-view clears. | 0.89 | Mostly true | Sponsor pool, 1:1 match, and bonus ranges are public; the “not fully fixed” point is an absence-of-evidence inference. | fileciteturn0file2 citeturn6view0turn6view1turn6view2 |
| M4 | ECM requires escrow or equivalent custody; live moraltrade explicitly says no escrow/custody/payment-protection service. | 0.99 | True | This is the clearest mismatch. | fileciteturn0file2 citeturn4view0turn6view3turn6view5 |
| M5 | ECM recommends one-to-two-week batch rounds; the current public site does not clearly publish that cadence. | 0.88 | Mostly true | ECM says it; live site shows a demo round and deadlines but not a recurring cadence. | fileciteturn0file2 citeturn6view3turn6view5 |
| M6 | ECM makes donor failure handling explicit; live MPGF has a fallback rule but not a full public max-exposure/failure contract. | 0.84 | Mostly true | Fallback rule is public; fuller donor exposure/failure documentation is not visibly public. | fileciteturn0file2 citeturn5view3turn6view5 |
| M7 | ECM bans harmful/extortionary trades; current live pages already do this in substance. | 0.95 | True | Current safety rules are explicit and blocking. | fileciteturn0file2 citeturn18view1turn4view0turn21view0 |
| M8 | ECM expects recipient vetting, milestone release, and receipts/public proof; current live site already has strong evidence/review gates but not a live custodial release stack. | 0.95 | True | The distinction is accurate. | fileciteturn0file2 citeturn19view0turn22view1turn4view0 |
| M9 | ECM expects identity-weighting / anti-sybil controls proportionate to subsidy size; current public pages show identity before counting but not a full public counted-weight policy. | 0.83 | Mostly true | Identity-before-counting is explicit; the rest is not public on accessible pages. | fileciteturn0file2 citeturn5view3turn6view5 |
| M10 | ECM expects donors to see counterpart conditions, minimum counterparty volume, maximum exposure, and subsidy schedule in advance; live pages show thresholds/base match/bonus ranges/fallback but not the full disclosure set. | 0.90 | True | Current disclosure is partial, not full ECM-style. | fileciteturn0file2 citeturn6view0turn6view1turn5view3 |
| M11 | ECM wants bridge-donor-pool governance and treasury separation; current public pages show sponsor-pool parameters but not comparable public treasury/governance detail. | 0.82 | Mostly true | Sponsor parameters are visible; governance detail existed in navigation but its page was not fetchable here. | fileciteturn0file2 citeturn6view0turn7view2 |
| M12 | Live moraltrade already publishes unusually strong validation rules, schema/API docs, and immutable provenance/state-transition records, but the visible public round still reports external payouts at $0. | 0.92 | True | Both halves are directly supported. | citeturn8view0turn22view1turn23view0turn6view3 |
| M13 | Live moraltrade is cautious about legal/tax claims and external handoff/manual evidence, but that is not the same as an ECM-style compliant disbursement stack. | 0.95 | True | This is a fair and accurate distinction. | citeturn4view0turn4view1turn6view5 fileciteturn0file2 |

### Synthesis and “features worth keeping” claims

| ID | Claim unit from the target PDF | Credence | Assessment | Why | Primary sources |
|---|---|---:|---|---|---|
| K1 | The biggest mismatch between live moraltrade and ECM exact is still custody/escrow. | 0.94 | True | That is the starkest public difference between the two designs. | citeturn4view0turn6view3turn11view1 |
| K2 | The second-biggest mismatch is that live MPGF is still closer to thresholded assurance with common-ground discovery than explicit cross-view trade clearing. | 0.91 | True | The site itself frames MPGF as verified assurance matching. | citeturn6view3turn5view0turn5view1 |
| K3 | The live site already meets or exceeds ECM on review/safety/audit machinery, and those features should be preserved under any upgrade. | 0.80 | Plausible judgment | The live technical spec is indeed unusually explicit; “meets or exceeds” is comparative, but well supported. | citeturn8view0turn19view0turn19view1turn21view1turn22view1turn23view0 |
| K4 | The candidate-pools page really does rank “coordinatability, not moral truth,” using breadth, threshold progress, reviewability, and private-by-default signals. | 0.98 | True | The page states this nearly verbatim. | citeturn5view0 |
| K5 | Preserving that common-ground discovery layer is well supported by Forethought’s view that many people may value some moral public goods “somewhat.” | 0.77 | Reasonable recommendation | It is more an interpretation than a direct quote, but it fits Forethought’s framework well. | citeturn1view1turn12view0turn5view0 |
| K6 | The site’s small, capped, post-threshold breadth bonus is materially safer than launch-stage pure QF. | 0.79 | Mostly true | Gitcoin’s own materials explain why ungated QF is sybil/collusion-prone; moraltrade’s version is visibly gated and capped. | citeturn6view4turn15view6turn15view7 |
| K7 | Replacing current anti-threat/privacy/provenance contracts with a simpler ECM-only implementation would reduce trustworthiness. | 0.83 | Strong recommendation | These are genuine strengths of the current live stack. | citeturn18view1turn21view1turn22view1turn23view0 |

### Change-list and implementation/compliance claims

| ID | Claim unit from the target PDF | Credence | Assessment | Why | Primary sources |
|---|---|---:|---|---|---|
| C1 | Add supervised escrow or equivalent custody for cleared funds; this is the single biggest ECM delta. | 0.76 | Recommended and well supported | This most directly closes the main trust-model gap. | citeturn11view1turn4view0turn6view3turn14view0 |
| C2 | Make pledge intents explicitly cross-view by adding acceptable counterpart buckets and minimum counterparty volume. | 0.69 | Recommended and well supported | This is central to ECM exact and absent from the current public donor flow. | fileciteturn0file2 citeturn5view3turn5view0 |
| C3 | Publish a fixed ex ante sponsor-match schedule rather than relying on estimated bonus ranges as the primary donor-facing incentive. | 0.64 | Recommended | Current donor-facing incentive disclosure is less explicit than ECM exact. | citeturn6view0turn6view3 fileciteturn0file2 |
| C4 | Add maximum-exposure and failure-path disclosures on the pledge screen. | 0.80 | Recommended and strongly supported | FTC guidance makes this especially important. | citeturn15view2turn14view0 |
| C5 | Move to a documented batch-round cadence, ideally around one to two weeks at pilot scale. | 0.63 | Reasonable recommendation | Supported by ECM and Ord’s “keep it simple / market-clearing site” logic, but the exact cadence is not uniquely determined. | fileciteturn0file2 citeturn11view5 |
| C6 | Formalize sponsor-pool segregation and governance. | 0.71 | Recommended | ECM recommends treasury separation; current public evidence for that on moraltrade is thin. | fileciteturn0file2 citeturn7view2 |
| C7 | Make the identity-counting / anti-sybil policy public, including the rule that moral reputation cannot increase allocation power. | 0.74 | Recommended | Strongly supported by both current live design principles and Gitcoin’s QF lessons. | citeturn9view4turn15view6turn15view7turn5view3 |
| C8 | Add explicit recipient-registry and disbursement-handling rules, including legal status, payout rail, allowed uses, and milestone/receipt requirements. | 0.72 | Recommended | Supported by ECM, FTC, and IRS. | fileciteturn0file2 citeturn15view2turn15view5 |
| C9 | Use just-in-time authorization rather than early round-start holds because manual-capture authorizations commonly expire after roughly 5–7 days for online cards. | 0.99 | True | Stripe states this directly. | citeturn14view0 |
| C10 | Capture must happen before expiry or the authorization is canceled and the funds are released. | 0.99 | True | Stripe states this directly. | citeturn14view0 |
| C11 | The platform should not market a flow as “escrow” unless there is an actual escrow/custody arrangement. | 0.96 | Strongly supported | This matches both legal reality and current live-site warnings. | citeturn4view0turn6view5 |
| C12 | The target PDF is right that its proposed donor-disclosure copy tracks FTC guidance on where money goes, fees, timing, and what happens if donation routing fails. | 0.97 | True | FTC guidance names exactly these categories. | citeturn15view2turn15view0 |
| C13 | The IRS TEOS page is the authoritative U.S. public starting point for checking tax-exempt status and deductibility eligibility. | 0.97 | True | IRS says the tool lets users check both. | citeturn15view4turn15view5 |

### Preserved invariants and closing claims

| ID | Claim unit from the target PDF | Credence | Assessment | Why | Primary sources |
|---|---|---:|---|---|---|
| P1 | No global moral ranking and participant-relative scoring are real public invariants of the current site. | 0.98 | True | Explicitly stated in the technical spec and pools page. | citeturn20view2turn20view4turn9view4 |
| P2 | Anti-threat and baseline integrity are blocking gates, not soft warnings. | 0.98 | True | Safety and technical spec both say this. | citeturn18view1turn9view6 |
| P3 | Privacy-safe previews and redaction-first public defaults are real current invariants. | 0.98 | True | Broad reasons first, exact details only after consent; privacy/redaction blocks matchability. | citeturn21view1turn21view0turn21view2turn21view5 |
| P4 | Immutable provenance and state-transition records are required for reliance-bearing changes. | 0.98 | True | The technical spec states this explicitly. | citeturn22view1turn22view0turn22view3 |
| P5 | Public API/schema contracts remain published. | 0.99 | True | The technical spec exposes both an API contract and public schema registry. | citeturn23view0turn23view4 |
| P6 | The document’s own bottom-line estimate is that ECM exact is below 0.5 likely to be the exact best current mechanism, and below-0.5 because the live site has strengths worth preserving. | 0.75 | Plausible judgment | This is the document’s argued conclusion; it is subjective but coherent with the evidence. | fileciteturn0file0 citeturn18view1turn21view1turn22view1turn5view0turn6view4 |
| P7 | The specific self-reported numbers in the PDF—0.39 for the main credence and 0.72 for confidence in that estimate—are not independently verifiable. | 0.50 | Not externally checkable | These are internal judgments, not public facts. | fileciteturn0file0 |
| P8 | The draft is right that the live mechanism should move materially toward ECM on core payment-and-clearing dimensions while keeping current safety/privacy/provenance strengths. | 0.78 | Well-supported recommendation | This is the strongest practical conclusion from the evidence reviewed. | citeturn4view0turn6view3turn5view3turn14view0turn18view1turn21view1turn22view1 fileciteturn0file2 |

## Recommended changes with improvement credence above 0.5

I do recommend changes. In priority order, the live mechanism should be revised as follows.

First, add **real supervised custody/escrow or a true functional equivalent** for cleared funds. Today the public site says “no escrow, no custody,” which is the single clearest gap from ECM exact and the clearest trust gap against Ord’s factual-trust concern. If this is not available immediately, the site should keep saying it is non-custodial rather than implying otherwise. citeturn4view0turn6view3turn6view5turn11view1

Second, turn public-goods intents into **explicit cross-view trade intents**. Donors should be able to say which distinct moral buckets they will clear against, and what minimum counterparty volume is needed. Right now the site does common-ground discovery, but not public donor-side distinct-bucket execution conditions. citeturn5view0turn5view1turn5view3 fileciteturn0file2

Third, publish a **fixed ex-ante donor-visible matching schedule**. A donor should know the base match ratio, cap structure, bonus rule, and when those rules apply before authorizing the pledge. The current “estimated bonus range” is better than nothing, but it is not the same as ex-ante precommitment. citeturn6view0turn6view1turn6view2

Fourth, expose **maximum donor exposure and explicit failure handling**. Pledge screens should clearly say the maximum amount that can be captured, what conditions are required for clearance, what happens if verification fails, what happens if the round fails to clear, and when any authorization expires. FTC guidance strongly supports this approach, and Stripe’s validity windows make it operationally important. citeturn15view2turn14view0

Fifth, move to a **documented batch-round cadence**. The precise interval can be tuned, but a short recurring cadence such as one to two weeks is the natural ECM-aligned pilot posture because it improves auditability and reduces ambiguity about when authorization, review, challenge, and release occur. citeturn11view5 fileciteturn0file2

Sixth, make **sponsor-pool segregation and governance public**. Operating funds, matching funds, and recipient-disbursement funds should be visibly separated in the public model, and the sponsor-pool rulebook should explain who can change budgets, who can approve recipients, how exceptions are logged, and what gets published after a round. fileciteturn0file2

Seventh, make the **identity-counting / anti-sybil subsidy policy public**. The current site already emphasizes identity verification and no global ranking, but the live public pages do not yet expose a full counted-weight or anomaly-review policy. Gitcoin’s real-world QF experience shows why that policy is part of the mechanism, not an implementation footnote. citeturn5view3turn9view4turn15view6turn15view7

Eighth, build an explicit **recipient registry and disbursement ruleset**. Before a cleared trade becomes payable, the site should publish the recipient legal entity or fiscal host, payout rail, allowed uses, milestone/receipt rules, and registry-based verification checks. citeturn15view4turn15view5turn15view2 fileciteturn0file2

## Instruction set for Codex GPT-5.5-xhigh

Revise moraltrade.org’s current MPGF mechanism toward **ECM-core plus preserved live-site safeguards**, not toward a stripped-down ECM-only rewrite.

Build the following mechanism changes:

1. **Add real custody for cleared funds**
   - Introduce a post-clear, pre-release custodial state for cleared donor funds.
   - Do not present anything as escrow unless there is a legally real escrow/custody arrangement.
   - Support release only after recipient verification and challenge-window completion.
   - Support donor-configured failure handling when verification fails.

2. **Make public-goods intents explicitly cross-view**
   - Extend pledge-intent creation so the donor must be able to specify:
     - acceptable counterpart moral buckets,
     - minimum counterparty-cleared volume,
     - fallback rule,
     - recognition/visibility choice.
   - Count a trade as “moral trade” only if a sufficiently distinct bucket clears.

3. **Publish a fixed round rulebook**
   - Before a round opens, publish:
     - round open/close times,
     - clearing time,
     - base match ratio,
     - bonus rule and caps,
     - recipient-eligibility rules,
     - identity-counting / anti-sybil rules,
     - sponsor-pool size and audit policy.

4. **Switch to a documented batch-round engine**
   - Use a recurring cadence.
   - Support round-close -> batch-clear -> just-in-time authorization/custody -> recipient verification/challenge -> capture/release/cancel -> audit publication.

5. **Use just-in-time authorization**
   - Do not place long-lived holds at round open.
   - Save the donor payment method early, but authorize only near clearing so that the authorization window does not expire before capture. citeturn14view0

6. **Expose donor-facing maximum exposure and failure states**
   - On every pledge screen, display:
     - max exposure,
     - exact clearance conditions,
     - current threshold position,
     - fallback behavior if the round does not clear,
     - behavior if recipient verification fails,
     - when an authorization expires or converts to capture. citeturn15view2turn14view0

7. **Add a public recipient registry**
   - For every payable public-good destination, publish:
     - legal entity / fiscal host,
     - registry status,
     - payout rail,
     - allowed uses,
     - receipt or milestone rules,
     - review state,
     - challenge state.

8. **Publish the anti-sybil subsidy policy**
   - State clearly how unique-human verification, payment-method checks, and anomaly review affect subsidy eligibility.
   - Keep the invariant that moral reputation cannot increase allocation power. citeturn9view4turn15view6turn15view7

Preserve these current live invariants unchanged:

- no global moral ranking; participant-relative scores only, citeturn20view4turn20view2
- anti-threat and baseline integrity as blocking gates, citeturn18view1turn9view6
- privacy-safe previews and redaction-first public defaults, citeturn21view1turn21view0
- challenge and appeal lanes with human review, citeturn19view1
- immutable provenance and state-transition records for reliance-bearing changes, citeturn22view1turn22view3
- published API/schema contracts and auditable public health surfaces. citeturn23view0turn23view4

Success criteria for the revised mechanism should be:

- live public rounds that actually clear and release funds,
- donor-visible cross-view conditions,
- donor-visible failure-path clarity,
- clear published sponsors/match rules,
- public recipient registry, and
- preserved safety/privacy/provenance guarantees. citeturn4view1turn6view3turn8view0

## Open questions and limitations

Some linked moraltrade pages visible in navigation were not fetchable in the browser during this audit, including the MPGF governance page, round-detail page, and funding-metrics page. That means some narrow claims about governance detail or operator workflows could not be checked on those exact routes, though the accessible pages were enough to establish the live mechanism’s core architecture. citeturn7view0turn7view1turn7view2turn3view1turn8view0

A few user-prioritized comparator domains were unavailable in the browsing session, so they provided no additional evidence either way. citeturn1view15turn1view16turn1view17turn1view19turn1view20turn1view21

The most uncertain claims in the target PDF are the ones that are **inherently subjective** rather than factual: its exact numerical credence assignments, its exact confidence number, and its strongest “best current target” judgments. I did not find strong evidence that those judgments are wrong; I found that they are **plausible but not directly verifiable**. By contrast, I did find strong evidence that its core descriptive claim is right: the live mechanism is **not** ECM exact, but it **is** in the same family and should be revised materially toward ECM on the payment-and-clearing side while preserving current live-site safety, privacy, and provenance strengths. citeturn4view0turn4view1turn6view3turn8view0turn18view1turn21view1turn22view1