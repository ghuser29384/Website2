# MPGF WWW Direct-Working Verification

Status: passed

Canonical URL tested: `https://www.moraltrade.org`

Evidence artifact:

`/private/tmp/mpgf-production-evidence-20260517-resolved/browser-evidence.json`

Production checks:

- `/mpgf` returned HTTP 200 and rendered `Moral Public Goods Fund | Moral Trade`.
- `/mpgf/contribute` returned HTTP 200 and rendered manual external-payment evidence controls.
- `/mpgf/pools` returned HTTP 200 and rendered approved demo ordinary-pool alternatives.
- `/mpgf/pools/new` returned HTTP 200 and rendered the full pool-reasoning form.
- `/mpgf/account/contributions` returned HTTP 200 and rendered account-state guidance.
- `/mpgf/admin/launch` returned HTTP 200 and rendered the gated admin section.
- `/api/mpgf/health` returned HTTP 200 and `ok=true`.
- `/api/mpgf/exact-pilot-dry-run` returned HTTP 200 and `ok=true`.

Safety checks:

- Browser evidence was collected in read-only mode.
- No production submit button was clicked.
- No payment, payout, live disbursement, or real-money accounting mutation was performed.

Unresolved issues: none.
