# Post-output Revision Log

Pre-results state: parameter, archetype, resource-profile, scenario, estimand, and sensitivity choices were frozen before any result was inspected.

No post-output substantive revision has been made. Any substantive revision must preserve the first complete run and record before/after results.

- 2026-08-14, before any result inspection and before a complete run: corrected JSON-payload Python booleans from lowercase JSON literals to `False`/`True` in `reporting.py` and `pipeline.py`. The partial fast pipeline had stopped before its dossier and first-complete marker. No parameter, archetype, resource profile, scenario, estimand, or output value was changed; frozen input hash remained `f855e4ed730f554e5a2572c21e6dc950896ce6aee2f3e9fd7729235720ada02f`.
- 2026-08-14, after the complete run: scoped byte comparison to model-generated run artifacts by excluding the post-run `fast_gate.json` evidence record alongside the independent-validation, manifest, and reproducibility-check self-records. This changes only comparison bookkeeping; it does not change or regenerate the frozen first run, any prior, scenario, estimand, or model output.
