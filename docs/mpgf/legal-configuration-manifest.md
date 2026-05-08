# MPGF Legal Configuration Manifest

Status: direct-working non-real-money configuration only; real-money mode blocked.

## Current Legal Posture

MPGF is configured as a non-real-money, pledge-only/direct-working pilot. The public copy must not claim tax deductibility, escrow status, donation status, guaranteed effectiveness, charity-evaluator status, or real-money disbursement.

## Required Configs

| Area | Operative artifact | Current state |
| --- | --- | --- |
| Payout mode | `config/mpgf/payout-provider-profile.json` | manual evidence only, automated payouts disabled |
| Refund policy | `config/mpgf/refund-policy.json` | no real-money refund path because no real-money collection |
| Receipt templates | `config/mpgf/receipt-templates.json` | non-real-money acknowledgement only |
| Data retention | `config/mpgf/data-retention-policy.json` | demo audit retention only; real-money private data disabled |
| Copy policy | `config/mpgf/copy-library.json` | safe public copy required |

## Gate

`real_money_complete` must remain blocked until legal, tax, receipt, privacy, payment, refund, and data-retention evidence has passed production review.

Conformance rows: AC-COPY-001, AC-PAYMENT-019, AC-COMPLETION-008.
