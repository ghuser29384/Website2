# MPGF Data Retention Policy

Status: retention framework for MPGF public-goods launch.

## Payment and Provider Data

- Raw card data is never stored by Moral Trade.
- Provider identifiers hashed in MPGF tables should be used for Stripe, Every.org, fiscal-host, and manual evidence references wherever practical.
- Receipt URLs private by default and excluded from public reports.
- Provider payload bodies are retained only as hashes or redacted review records unless a restricted operator workflow requires temporary access.

## Evidence and Audit Records

- Public evidence summaries retain reason codes, status, amount buckets, and aggregate timing.
- Private evidence artifacts retain access controls and do not appear in public allocation reports.
- Audit log retention covers allocation hashes, webhook idempotency records, reviewer decisions, challenge status, and milestone release decisions.

## Participant Rights

- Deletion or revocation requests can remove or disable non-required profile, saved payment, and support-signal records where compatible with fraud prevention, audit, tax, refund, and dispute obligations.
- Public aggregate metrics are not rewritten when individual private rows are deleted unless required by policy or law.
- Saved payment methods can be revoked without changing historical aggregate allocation reports.
