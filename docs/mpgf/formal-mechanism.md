# MPGF Formal Mechanism v0.3

MPGF-SRC-FORMAL-001: MPGF is implemented as a feature-flagged, non-real-money direct-working pilot until the required completion profile gates pass. {#mpgf-src-formal-001}

MPGF-SRC-FORMAL-002: Direct-working contributions are pledge-only commitments and cannot create payment-provider objects, live ledger effects, external payouts, or tax/receipt claims. {#mpgf-src-formal-002}

MPGF-SRC-FORMAL-003: Approved demo ordinary-pool alternatives are scored by bounded ballot weights in integer basis points. {#mpgf-src-formal-003}

MPGF-SRC-FORMAL-004: Certified demo allocation uses exact integer arithmetic. Each alternative receives `floor(budget_cents * score_bps / total_score_bps)`, then any remaining cents are distributed by descending remainder with `alternative_id` ascending as the deterministic tie-break. {#mpgf-src-formal-004}

MPGF-SRC-FORMAL-005: A public summary may display non-real-money pledge and allocation state, but must keep `releasedInternalCents`, `payoutAuthorizedCents`, and `externallyPaidCents` at zero in direct-working mode. {#mpgf-src-formal-005}

MPGF-SRC-FORMAL-006: Real-money operation is blocked until legal, payment, privacy, receipt, retention, launch, deployment, emergency shutdown, exact-pilot, and production-enablement gates pass. {#mpgf-src-formal-006}
