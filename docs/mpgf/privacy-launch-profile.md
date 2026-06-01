# MPGF Privacy Launch Profile

Status: public privacy framework for CG-VQAF.

## Data Minimization

- Support signals private by default.
- Donor rows are not public.
- Public reports use aggregate-only reporting for funding, support breadth, disputes, and experiments.
- No raw private wishes in analytics.
- No private donor reasons, receipt URLs, reviewer notes, or provider payload bodies are exposed in public API responses.

## Provider and Identity References

- Hashed provider identifiers are used for Stripe, Every.org, and partner event references where possible.
- Identity confidence can affect eligibility or weight, but donor moral reputation cannot affect allocation power.
- Compliance screening outcomes are readiness gates, not public badges or moral scores.

## Launch Controls

- Public postmortems publish aggregate outcomes and next-round parameter reset evidence only.
- Private evidence and receipt URLs remain access-controlled.
- Analytics events use safe buckets and redacted reason codes.
- Surprise counterparty exposure is prohibited.
