# MPGF Solver Implementation Plan

Status: local direct-working subset implemented; full exact-pilot solver blocked by formal source lock.

## Scope

The current implementation uses deterministic exact-integer proportional allocation for the visible non-real-money demo cycle. It is sufficient for local direct-working smoke tests and public demo behavior, but it is not evidence for `exact_pilot_complete`.

## Required Full Solver Path

1. Source-lock the complete formal mechanism in `docs/mpgf/formal-mechanism.raw.md`.
2. Derive `docs/mpgf/formal-kernel-spec.md` and `config/mpgf/formal-kernel-spec.json` from that source.
3. Implement solver functions against the kernel spec with integer and rational arithmetic only.
4. Generate certificates for every allocation run.
5. Verify certificates independently.
6. Run the benchmark suite and update `docs/mpgf/solver-benchmark-report.md`.
7. Approve an active solver support profile only when benchmark evidence supports it.

## Direct-Working Guard

Until the formal source lock and benchmark evidence pass, full exact-pilot completion remains blocked and the production site may expose only the non-real-money direct-working mechanism.

Conformance rows: AC-SOLVER-010, AC-COMPLETION-008, AC-GOVERNANCE-013.
