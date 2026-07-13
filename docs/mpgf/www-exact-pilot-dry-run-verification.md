# MPGF WWW Exact Pilot Dry-Run Verification

Status: passed

Canonical URL tested: `https://www.moraltrade.org`

Evidence artifacts:

- `/private/tmp/mpgf-production-evidence-20260517-resolved/exact-pilot-dry-run.json`
- `/private/tmp/mpgf-production-evidence-20260517-resolved/browser-evidence.json`
- `/private/tmp/mpgf-production-evidence-20260517-resolved/monitor-evidence.json`

Production endpoint:

`https://www.moraltrade.org/api/mpgf/exact-pilot-dry-run`

Observed result:

- HTTP status: 200
- `ok`: true
- solver gate: passed
- exact dry run: passed
- certified solver result: `verified_optimal`
- certificate verification: passed
- benchmark run: passed
- support-profile validation: passed
- benchmark-support validation: passed
- prohibited mutation checks: passed

Deployment/build identity reported by endpoint:

`d2947081f6a845a8b2fd8e95baa68c3466a215db`

Mutation policy:

`read_only_no_payment_no_payout_no_live_disbursement_mutation`

Unresolved issues: none.
