# MPGF Launch Readiness Report

Status: public readiness report for the CG-VQAF pilot.

## Current Launch State

- Production real money remains blocked.
- The current public-goods round is a shadow round / demo round until real-money gates pass.
- The public mechanism can publish thresholds, matching previews, allocation reports, identity-integrity summaries, threshold calibration, and public postmortem artifacts.
- Production payout and sponsor-pool release remain disabled until partner and legal approvals are recorded.

## Required Before Real-Money Expansion

- AML/KYC/sanctions screening framework must be approved by the custody, receipt, or payout partner.
- External counsel approval required before real-money enablement.
- Stripe SetupIntent and PaymentIntent webhook handling must pass signature, idempotency, replay, and ledger tests.
- Every.org partner webhook import must pass redirect-pending, dedupe, and evidence-review tests.
- Reviewer MFA, dual-control release, dispute freeze, refund, and receipt-template gates must pass.

## Post-Round Learning

- A public postmortem is required after the first real-money round.
- Parameter resets are next-round-only and cannot mutate the current round.
- Funding KPIs and experiments must remain aggregate-only and privacy-safe.
