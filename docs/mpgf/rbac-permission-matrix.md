# MPGF RBAC Permission Matrix

Status: direct-working matrix specified; real-money and production approval paths remain fail-closed.

The operative matrix is `config/mpgf/rbac-permission-matrix.json`.

| Permission | Allowed roles | Approval rule | Current mode |
| --- | --- | --- | --- |
| `mpgf.public.read` | public and all authenticated roles | none | enabled |
| `mpgf.pledge.create` | participant | none | pledge-only |
| `mpgf.pool_proposal.draft` | participant | none | non-real-money demo |
| `mpgf.admin.read` | admin, cycle_admin, payout_admin, auditor, super_admin | none | gated route inspection |
| `mpgf.cycle.approve` | cycle_admin, super_admin | cycle_admin_or_super_admin_plus_auditor | blocked for production |
| `mpgf.payout_authorization.approve` | payout_admin, super_admin | (payout_admin or super_admin) + auditor | blocked for production |
| `mpgf.real_money.enable` | super_admin | super_admin + auditor + deployment_admin + legal_approval | blocked |

Default behavior is deny unless a permission row explicitly allows the action.

Conformance rows: AC-RBAC-001, AC-DISBURSEMENT-016, AC-COMPLETION-008.
