# Donation Upgrade live operator intake

Complete this intake without including Stripe secret keys, webhook signing secrets, bank details, card data, Social Security numbers, identity-document images, or other authentication credentials. Complete Stripe identity, bank, and Terms acceptance only in Stripe-hosted interfaces.

## Canonical live Stripe account

- Stripe live account display name:
- Stripe live account ID (`acct_…`):
- Authorized representative who completed Stripe onboarding:
- Business/legal entity name:
- Support phone shown to payers:
- Account activation complete: yes / no
- `details_submitted=true`: yes / no
- `charges_enabled=true`: yes / no
- `payouts_enabled=true`: yes / no
- Currently due requirements: none / list without sensitive values
- Past-due requirements: none / list without sensitive values
- Stripe product-review or support case reference:
- Account-readiness evidence URL:
- Evidence SHA-256:

## Local fallback charity

- Legal name:
- Every.org nonprofit ID:
- Every.org slug:
- EIN or authoritative registration identifier:
- Jurisdiction/country:
- Official website:
- Authorized settlement or development contact:
- Why this is the user's intended no-match destination:
- Identity evidence URL:
- Evidence SHA-256:

## Matched destination

- Legal/display name: GiveWell Top Charities Fund
- Every.org nonprofit ID:
- Every.org slug:
- EIN or authoritative registration identifier:
- Identity evidence URL:
- Evidence SHA-256:
- Reverification date:

## Institutional approvals

For every row, name the accountable owner and attach an immutable evidence URL and SHA-256.

| Approval | Accountable owner | Role/authority | Monitored email | Evidence URL | SHA-256 | UTC approval time |
| --- | --- | --- | --- | --- | --- | --- |
| Every.org consolidated platform-paid gift approval |  |  |  |  |  |  |
| Participant custody, donor-of-record, tax, fee, refund, abandonment, dispute, and chargeback terms |  |  |  |  |  |  |
| Platform funding account, reserve, and shortfall policy |  |  |  |  |  |  |
| Operator, monitoring, reconciliation, incident, and disable runbook |  |  |  |  |  |  |
| Controlled live launch |  |  |  |  |  |  |

## Operators

- Primary operator legal name:
- Primary operator email:
- Backup operator legal name:
- Backup operator email:
- Monitoring channel:
- Coverage window:
- Incident-disable authority:
- Reserve/shortfall owner:

## Controlled-launch limits

- Maximum number of participants:
- Maximum aggregate participant funding:
- Maximum amount per pooled obligation:
- Maximum number of simultaneously open bundles:
- Launch start and end time:
- Allowed recipient pair:
- Stop-loss threshold:
- Automatic-disable conditions:

## Human mandate completion

- Donor email for the Stripe-hosted setup-mode session:
- Donor confirms they will personally complete Stripe-hosted authorization: yes / no
- Donor consents to the exact versioned future-payment terms: yes / no
- No live charge is authorized by this intake: acknowledged / not acknowledged

A separate explicit instruction naming the amount and destination is required before any live charge or charitable settlement.
