# MPGF Solver Implementation Plan

Status: implemented for the active exact-pilot profile.

## Scope

The current implementation uses deterministic exact-integer proportional allocation for the visible non-real-money pilot cycle and produces independently verified optimality certificates within the active support profile. This supports `exact_pilot_complete` for the current certified non-real-money profile.

## Implemented Solver Path

1. Source-lock the complete formal mechanism in `docs/mpgf/formal-mechanism.raw.md`.
2. Derive `docs/mpgf/formal-kernel-spec.md` and `config/mpgf/formal-kernel-spec.json` from that source.
3. Implement solver functions against the kernel spec with integer and rational arithmetic only.
4. Generate certificates for every allocation run.
5. Verify certificates independently.
6. Run the benchmark suite and update `docs/mpgf/solver-benchmark-report.md`.
7. Approve an active solver support profile only when benchmark evidence supports it.

## Certification Guard

The certified solver may be used only inside the active exact-pilot support limits. Instances outside those limits, real-money allocation effects, live ledger effects, payout authorization, and external disbursement remain fail-closed unless separately certified and approved.

Conformance rows: AC-SOLVER-010, AC-COMPLETION-008, AC-GOVERNANCE-013.
