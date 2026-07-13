Prompt 2 — Confront inherited artifacts and choose

Now review the inherited artifacts and choose the best next direction.

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
- Do not revise the spec yet.