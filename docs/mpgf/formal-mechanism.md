# MPGF Formal Mechanism v0.3

MPGF-SRC-FORMAL-001: MPGF is implemented as a feature-flagged, non-real-money direct-working pilot until the required completion profile gates pass.

MPGF-SRC-FORMAL-002: Direct-working contributions are pledge-only commitments and cannot create payment-provider objects, live ledger effects, external payouts, or tax/receipt claims.

MPGF-SRC-FORMAL-003: Approved demo ordinary-pool alternatives are scored by bounded ballot weights in integer basis points.

MPGF-SRC-FORMAL-004: Certified demo allocation uses exact integer arithmetic. Each alternative receives `floor(budget_cents * score_bps / total_score_bps)`, then any remaining cents are distributed by descending remainder with `alternative_id` ascending as the deterministic tie-break.

MPGF-SRC-FORMAL-005: A public summary may display non-real-money pledge and allocation state, but must keep `releasedInternalCents`, `payoutAuthorizedCents`, and `externallyPaidCents` at zero in direct-working mode.

MPGF-SRC-FORMAL-006: Real-money operation is blocked until legal, payment, privacy, receipt, retention, launch, deployment, emergency shutdown, exact-pilot, and production-enablement gates pass.
