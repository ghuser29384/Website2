Prompt 3 — Write or revise the spec only after the decision

Write the implementation or experiment spec for the chosen next step.

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
- Do not hard-code moralpublicgoods131.md if a later version exists.
- Output the revised file as moralpublicgoods[v+1].md.