# MPGF RBAC Coverage Audit

Status: direct-working routes covered.

| Surface | Required access | Current implementation |
| --- | --- | --- |
| `/mpgf`, `/mpgf/about`, `/mpgf/pools`, `/mpgf/technical-spec` | public read | public pages render safe non-real-money copy |
| `/mpgf/contribute` | participant-capable pledge-only flow | pledge-only UI creates no provider object |
| `/mpgf/pools/new` | participant-capable draft proposal flow | draft-only route, no authorization or payout |
| `/mpgf/account/contributions` | participant account state | demo contribution-state view with pause/resume/cancel labels disabled |
| `/mpgf/admin/*` | admin inspection | route requires admin session shape before listing admin content |

Production approval, payout authorization, and real-money enablement remain blocked until production RBAC evidence and approvals are recorded.

Conformance rows: AC-RBAC-001, AC-COMPLETION-008.
