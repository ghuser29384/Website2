# MPGF WWW Production Health Monitor

Status: passed

Canonical URL tested: `https://www.moraltrade.org`

Profile: `config/mpgf/www-production-health-checks.json`

Evidence artifact:

`/private/tmp/mpgf-production-evidence-20260517-resolved/monitor-evidence.json`

Monitor window:

- Started: `2026-05-17T20:39:08.367Z`
- Final sample: `2026-05-17T20:44:16.620Z`
- Samples: `6`
- Interval: approximately `60s`
- Configured window: `PT5M`

Results:

- Public route monitor: passed.
- `/mpgf`: passed in every sample.
- `/mpgf/contribute`: passed in every sample.
- `/mpgf/pools`: passed in every sample.
- `/api/mpgf/health`: `ok=true` in every sample.
- `/api/mpgf/exact-pilot-dry-run`: `ok=true` in every sample.

Unresolved issues: none.
