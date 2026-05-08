# MPGF Payment Production Readiness

Status: not ready for production real money.

The current site supports pledge-only non-real-money MPGF behavior. It must not create live payment-provider objects, charge users, treat pledges as donations, issue payment receipts, or enable real-money ledger effects.

## Required Before Real Money

1. Approved `real_money_complete` completion profile.
2. Approved payment-provider live-mode profile.
3. Approved refund and chargeback workflows.
4. Approved receipt templates.
5. Approved privacy and retention policy.
6. Production smoke tests and health monitor passing at `https://www.moraltrade.org`.

Conformance rows: AC-PAYMENT-019, AC-COMPLETION-008.
