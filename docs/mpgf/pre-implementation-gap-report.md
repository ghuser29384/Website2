# MPGF Pre-Implementation Gap Report

Status: blocker recorded.

## Blocker

The complete newest formal MPGF mechanism source has not been source-locked verbatim in `docs/mpgf/formal-mechanism.raw.md`. The current file is intentionally marked blocked and must fail full Phase A validation.

## Allowed Work Despite Blocker

The implementation may maintain local direct-working, non-real-money, pledge-only demo behavior and validators that fail closed for exact-pilot and real-money completion.

## Blocked Work

- Full exact-pilot solver implementation.
- Production-domain `exact_pilot_complete`.
- Real-money collection, payment-provider live mode, real-money receipts, and external payouts.

Conformance rows: AC-PHASE-001, AC-COMPLETION-008.
