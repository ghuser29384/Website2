Use this skill to control [@Computer](plugin://computer-use@openai-bundled) [@Chrome](plugin://chrome@openai-bundled) to use ChatGPT Web Pro Extended do this workflow for doing R&D and finding real (potentially out-of-distribution) improvement to the moral goods group-buying feature in Moral Trade.

a. Use Chrome to open chatgpt.com.
b. Go to the pinned project "MT" and go to the chat "MPGF 1”
c. Use the latest model’s Pro Extended mode. Enter the prompt: “Do a blind, frontier-seeking R&D pass on mechanisms for funding moral public goods through Moral Trade.

Goal:
Find candidate mechanisms, products, experiments, or non-product interventions that could help users fund moral public goods through voluntary moral trade or adjacent coordination mechanisms.

Critical anti-anchoring rule:
Do not read or use the current moralpublicgoods*.md spec, current live page, CRECM, Common Ground Budget, or Common Ground Pledge Pools until explicitly told to in a later prompt. Do not mention them in the first-pass candidate generation.

Use only:
- first-principles reasoning,
- the uploaded background sources on moral trade, moral public goods, convergence/compromise, and defense-favoured coordination tech,
- and relevant external research if useful.

Hard constraints:
- Participation must be voluntary.
- No threats, coercion, fraud, extortion, or compensation for newly created harmful behavior.
- Any binding pledge, payment, match, reward, credit, certificate, public recognition, or audit state requires explicit consent and final review.
- Any money-routing mechanism must preserve review, challenge, identity, payment, sponsor-backing, and audit gates.
- Privacy must be protected where disclosure would enable free-riding, harassment, strategic waiting, or collusion.
- Do not claim escrow, custody, tax treatment, legal compliance, guaranteed matching, neutrality, or impact certainty unless the mechanism has a recorded state that makes the claim true.

Task:
1. Decompose the problem from first principles:
   - moral public-good discovery,
   - preference elicitation,
   - credible commitment,
   - free-riding,
   - pivotality,
   - trust,
   - verification,
   - payment credibility,
   - sponsor liquidity,
   - review burden,
   - privacy,
   - anti-threat controls,
   - auditability,
   - and real-user comprehension.

2. Generate at least 20 candidate mechanisms or interventions.
   Include at least:
   - 5 that are natural descendants of assurance contracts, matching, or pledge pools,
   - 5 that are moral-trade-specific,
   - 5 imported from distant domains,
   - 3 that are not user-facing funding products,
   - 2 that are intentionally weird or speculative.

3. For each candidate, provide:
   - one-sentence mechanism,
   - why it might work,
   - why it likely fails,
   - closest adjacent-domain analogue,
   - what would make it safe,
   - what would make it dangerous,
   - smallest experiment that would test it.

4. Do not choose a winner yet.
5. Do not revise any spec file yet.

Output:
- Problem decomposition.
- Candidate catalogue.
- Adjacent-domain analogy table.
- Top 10 cruxes.
- Top 10 experiment ideas.
- Explicit list of assumptions you avoided importing from the current product.”

Send prompt. Wait for the response.

c. After getting the response, upload the latest moralpublicgoods[v].md, where [v] is the version number. A version is latest if v is largest. (For example, if moralpublicgoods132.md is the newest version, then upload moralpublicgoods132.md.) Enter the prompt: “Now review the inherited artifacts and choose the best next direction.

Inputs:
1. Review the current live page:
   https://www.moraltrade.org/offers?search=moral%20public%20goods
2. Review the latest available moralpublicgoods*.md file, not a hard-coded older version.
3. Review the candidate catalogue from the blind R&D pass.
4. Use the uploaded background sources again where relevant.

Anti-path-dependence rule:
Treat every inherited feature as a candidate, not a requirement. Ignore sunk cost. The fact that a feature exists in the current spec is weak evidence at most.

Task:
1. Diagnose the live page:
   - user goal clarity,
   - stale labels,
   - implementation-history leakage,
   - false zero states,
   - confusing CTAs,
   - hidden consent/payment implications,
   - privacy and sealed-progress risks.

2. Diagnose the current spec:
   - essential mechanisms,
   - accidental complexity,
   - overfit safeguards,
   - missing safeguards,
   - dead concepts,
   - user-comprehension bottlenecks,
   - legal/payment/admin burden,
   - audit burden,
   - parts that solve theoretical problems users may not actually have.

3. Compare:
   - at least 10 blind-generated candidates,
   - the current inherited mechanism,
   - one minimal version of the inherited mechanism,
   - and a “do not build a funding product yet” option.

Criteria:
   - moral-trade fidelity,
   - ability to overcome free-riding and pivotality,
   - user comprehensibility,
   - trust and verification burden,
   - sponsor/liquidity needs,
   - privacy risk,
   - anti-threat robustness,
   - abuse/collusion/fraud risk,
   - legal/payment/admin burden,
   - implementation cost,
   - speed to pilot,
   - scalability,
   - scientific learning value,
   - reversibility,
   - option value.

4. For the top 3 candidates, run red-team scenarios:
   - strategic waiting,
   - fake cross-view support,
   - sybil accounts,
   - same-payment-method clusters,
   - sponsor match not backed,
   - review-blocked project,
   - threat-like proposal,
   - conflicted proposer/recipient/fiscal host,
   - low-liquidity round,
   - exact-progress leak,
   - payment authorization failure,
   - user misunderstanding of charge timing,
   - minority moral-view user,
   - adversarial press interpretation.

5. Build a rough toy model for the top 3:
   - participants needed,
   - average pledge,
   - sponsor funds needed,
   - probability of clearing,
   - expected net-recipient dollars,
   - non-pivotal user cost,
   - sensitivity to strategic waiting,
   - main failure parameter.

6. Pick the best next step.
   It may be:
   - a mechanism,
   - a simplified product,
   - a sponsor-side tool,
   - a wish registry,
   - a manual concierge pilot,
   - a shadow experiment,
   - or no user-facing funding product yet.

Output:
- Decision memo.
- Candidate comparison table.
- Top-3 red-team table.
- Toy model.
- Keep/delete/defer/merge table.
- Chosen next step.
- Credence.
- Main ways you might be wrong.
- Smallest experiment that would change your mind.
- Do not revise the spec yet.”

Send prompt. Wait for the response.

d. After the response to prompt 2, enter the prompt: “Write the implementation or experiment spec for the chosen next step.

Inputs:
- Use the decision memo and candidate comparison from the previous step.
- Use the latest available moralpublicgoods*.md only as reference, not as a constraint unless the chosen design explicitly preserves a feature.
- Use the current live page only for migration and UX-entry requirements.

Task:
1. If the chosen next step is a funding mechanism, write a build spec.
2. If it is a shadow experiment, write an experiment spec.
3. If it is a sponsor-side, reviewer-side, or wish-registry product, write that product spec.
4. If the right answer is no user-facing product yet, write a research plan and kill/build criteria.

Required sections:
1. One-page decision memo.
2. Build or experiment target.
3. User flow.
4. Data model.
5. Consent boundaries.
6. Payment / no-payment semantics.
7. Review and anti-threat gates.
8. Privacy and sealed-disclosure rules.
9. Accounting rules, if money is involved.
10. Sponsor-backing rules, if sponsors are involved.
11. Abuse and failure-mode red-team.
12. Metrics.
13. Experiment plan.
14. Kill criteria.
15. Migration from current live page and current spec.
16. Do-not-build constraints.
17. Open questions and cruxes.

Versioning:
- Use the next version number after the latest uploaded moralpublicgoods*.md.
- Output the revised file as moralpublicgoods[v+1].md.”

e. If there is a spec change, download moralpublicgoods[v+1].md.

f. Repeat a to e with moralpublicgoods[v+1].md.
