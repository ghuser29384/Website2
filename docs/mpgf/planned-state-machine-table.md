# MPGF Planned State-Machine Table

Status: direct-working coverage specified; production/exact-pilot coverage remains blocked by formal source lock and production evidence.

The operative machine-readable registry is `config/mpgf/state-machines.json`. This table maps every lifecycle object required by AC-STATE-001 to its repository object, emergency handling, terminal-status location, coverage status, and conformance rows.

| Object type | Repository object | Statuses | Emergency transitions | Terminal statuses | Coverage status | Conformance rows |
| --- | --- | --- | --- | --- | --- | --- |
| genesis | direct-working bootstrap records | see `config/mpgf/state-machines.json` | active records may move to `emergency_suspended` | see config | configured | AC-STATE-001 |
| cycle | `mpgf_cycles` | see config | active pre-summary states may move to `emergency_suspended` | see config | configured | AC-STATE-001, AC-STATE-010 |
| ledger_transaction | posted accounting transaction records | see config | correction/void path only | see config | configured | AC-STATE-001, AC-LEDGER-011 |
| payment_intent | payment intent workflow records | see config | cancellation path only | see config | configured fail-closed for live payments | AC-PAYMENT-019, AC-STATE-001 |
| contribution | settled contribution records | see config | void/refund path only | see config | configured fail-closed for real money | AC-STATE-001 |
| pledge | pledge-only contribution records | see config | cancellation path only | see config | configured | AC-PAYMENT-019, AC-STATE-001 |
| recurring_contribution_commitment | standing monthly contribution-commitment records | see config | pause/cancel/expire path only | see config | configured pledge-only | AC-PAYMENT-021, AC-PAYMENT-022, AC-STATE-001 |
| eligibility_snapshot | eligible-voter snapshot records | see config | void path only | see config | configured | AC-STATE-001 |
| candidate_set_snapshot | candidate-set snapshot records | see config | void path only | see config | configured | AC-STATE-001 |
| sybil_review | duplicate/sybil review records | see config | appeal/void path only | see config | configured | AC-STATE-001 |
| safe_fallback | safe-fallback registry | see config | retire path only | see config | configured | AC-STATE-001 |
| pool_risk_assessment | pool risk assessment records | see config | supersede/void path only | see config | configured | AC-STATE-001 |
| pool | pool-proposal and candidate-alternative pool records | see config | review/approved states may move to `emergency_suspended` | see config | configured | AC-STATE-001, AC-STATE-010 |
| ballot | `mpgf_ballots` | see config | invalidation/void path only | see config | configured | AC-BALLOT-009, AC-STATE-001 |
| allocation_plan | `mpgf_allocation_plans` | see config | void/supersede path only | see config | configured fail-closed for live exact-pilot | AC-STATE-001 |
| authorization | `mpgf_authorizations` | see config | void path only | see config | configured | AC-STATE-001 |
| tranche | `mpgf_tranches` | see config | void path only | see config | configured | AC-STATE-001 |
| payout_authorization | `mpgf_payout_authorizations` | see config | approved/pending records may move to `voided` through recovery workflow | see config | configured disabled for non-real-money public flow | AC-DISBURSEMENT-016, AC-STATE-001, AC-STATE-010 |
| refund | `mpgf_refunds` | see config | fail/reject path only | see config | configured | AC-PAYMENT-016, AC-STATE-001 |
| receipt | receipt issuance records | see config | void path only | see config | configured non-real-money acknowledgement only | AC-COPY-011, AC-STATE-001 |
| public_cycle_summary | public summary publication records | see config | supersede path only | see config | configured | AC-PRIVACY-007, AC-STATE-001 |
| production_enablement | production enablement records | see config | revoke path only | see config | configured fail-closed | AC-COMPLETION-008, AC-STATE-001 |
| idempotency_key | mutation-idempotency records | see config | expire/fail path only | see config | configured | AC-STATE-001 |
| admin_approval_record | independent approval records | see config | revoke/expire path only | see config | configured | AC-RBAC-013, AC-RBAC-014, AC-STATE-001 |
| governance_judgment | governance judgment records | see config | supersede/reject path only | see config | configured | AC-GOVERNANCE-005, AC-STATE-001 |
| appeal | appeal workflow records | see config | withdraw path only | see config | configured | AC-STATE-001 |
| conflict_disclosure | conflict disclosure records | see config | void/unresolved path only | see config | configured | AC-STATE-001 |
| emergency_shutdown | emergency shutdown control records | see config | inactive -> active -> recovery_review -> resolved | see config | configured | AC-STATE-001 |

Every status-bearing implementation object must either map to one of these rows or appear in `docs/mpgf/status-bearing-object-discovery-report.md` with a blocker before the relevant phase passes.
