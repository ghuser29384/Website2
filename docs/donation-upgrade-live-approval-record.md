# Donation Upgrade live approval record

This record is the human-accountability counterpart to the technical pooled-settlement gates. It does not itself authorize live money. Each approval becomes valid only when an accountable owner completes the fields below, the cited evidence is immutable and independently retrievable, its SHA-256 matches, the corresponding production database gate is updated through the service-role-only gate function, and the technical verification named for that gate has passed on the exact production release.

## Release identity

- Candidate pull request: `#350`
- Candidate commit: `5bdb14d62eee8ec60c12037f9dc64e976f12e067`
- Production deployment commit: _not yet approved_
- Production Supabase project: `jnpoxvalyjtdghnperyu`
- Canonical Vercel project: `moraltrade-site`
- Canonical Stripe live account ID: _not yet connected_
- Controlled-launch window: _not yet approved_

## Evidence requirements

Every passed gate must record all of the following:

- accountable owner's legal name;
- accountable owner's role and authority;
- accountable owner's monitored email address;
- HTTPS evidence URL controlled by, or independently attributable to, the approving institution;
- exact SHA-256 of the approved evidence bytes;
- approval timestamp in UTC;
- exact release commit and environment covered by the approval;
- a narrowly scoped statement of what is and is not approved.

A draft, unsigned document, internal discussion, passing test, provider capability, or code deployment is not institutional approval.

## Gate 1 — Every.org written approval

Database key: `every_org_written_approval`

Required decision: Every.org, or an authorized fiscal/settlement partner accepted by Every.org, has expressly approved Moral Trade's consolidated platform-paid pooled-gift workflow, including the provider-facing donor-of-record treatment, metadata, webhook, refund limitations, and supported recipient classes.

- Status: `blocked`
- Accountable owner: _not supplied_
- Role/authority: _not supplied_
- Email: _not supplied_
- Evidence URL: _not supplied_
- Evidence SHA-256: _not supplied_
- Approval scope: _not supplied_
- Approval timestamp: _not supplied_

Do not pass this gate based only on a public Every.org donation URL or general API documentation.

## Gate 2 — Stripe account and product review

Database key: `stripe_account_and_product_review`

Required decision: the canonical live Stripe account has completed business onboarding and product review for the exact pooled-settlement flow. The exact account must report `details_submitted=true`, `charges_enabled=true`, `payouts_enabled=true`, no currently due or past-due requirements, and a live-mode product classification compatible with participant funding, refunds, disputes, and the intended charitable settlement rail.

- Status: `blocked`
- Canonical live account ID: _not supplied_
- Accountable owner: _not supplied_
- Role/authority: _not supplied_
- Email: _not supplied_
- Evidence URL: _not supplied_
- Evidence SHA-256: _not supplied_
- Stripe review/case reference: _not supplied_
- Approval timestamp: _not supplied_

The currently connected `Moral Trade sandbox` account and any `sk_test_` credential do not satisfy this gate.

## Gate 3 — Signed live Stripe webhook

Database key: `stripe_signed_webhook`

Required verification: the canonical production webhook endpoint processes a signed live-mode event through the exact production handler; exact metadata, amount, account, environment, and object identity match; replay is idempotent; an altered replay fails closed; no charge or settlement is created merely to prove signature handling unless separately authorized.

- Status: `blocked`
- Webhook endpoint ID: _not supplied_
- Verified live event ID: _not supplied_
- Event type: _not supplied_
- Production deployment commit: _not supplied_
- Accountable owner: _not supplied_
- Role/authority: _not supplied_
- Email: _not supplied_
- Evidence URL: _not supplied_
- Evidence SHA-256: _not supplied_
- Verification timestamp: _not supplied_

The webhook signing secret must remain only in the canonical Vercel production environment and must not be committed or pasted into this record.

## Gate 4 — Participant terms approved

Database key: `participant_terms_approved`

Required decision: the live participant agreement clearly and accurately covers temporary control of participant funds, Moral Trade's role, provider-facing donor-of-record treatment, tax-receipt limitations, processing costs, exact allocation, abandonment, match failure, pre-freeze refund, post-freeze cancellation limits, provider irreversibility, disputes, chargebacks, privacy, evidence, complaints, and governing law. Consent must be affirmative, versioned, and bound to the immutable obligation.

- Status: `pending`
- Terms version: _not supplied_
- Accountable owner: _not supplied_
- Role/authority: _not supplied_
- Email: _not supplied_
- Evidence URL: _not supplied_
- Evidence SHA-256: _not supplied_
- Approval timestamp: _not supplied_

## Gate 5 — Platform reserve approved

Database key: `platform_reserve_approved`

Required decision: an approved funding account and reserve policy covers Stripe fees, refunds, disputes, post-settlement chargebacks, reconciliation differences, provider failures, and abandoned balances without reducing frozen charitable allocations or using another participant's funds. The policy must name the shortfall owner, minimum reserve, replenishment trigger, stop-loss threshold, escalation path, and reconciliation cadence.

- Status: `pending`
- Funding account owner: _not supplied_
- Minimum reserve: _not supplied_
- Shortfall owner: _not supplied_
- Stop-loss threshold: _not supplied_
- Accountable owner: _not supplied_
- Role/authority: _not supplied_
- Email: _not supplied_
- Evidence URL: _not supplied_
- Evidence SHA-256: _not supplied_
- Approval timestamp: _not supplied_

## Gate 6 — Operator runbook approved

Database key: `operator_runbook_approved`

Required decision: named operators own queue review, MFA-protected Every.org checkout, webhook monitoring, daily reconciliation, refund and dispute response, incident disablement, evidence retention, and escalation. At least one primary and one backup operator must acknowledge the exact runbook and monitored coverage window.

- Status: `pending`
- Primary operator: _not supplied_
- Backup operator: _not supplied_
- Monitoring channel: _not supplied_
- Coverage window: _not supplied_
- Accountable owner: _not supplied_
- Role/authority: _not supplied_
- Email: _not supplied_
- Evidence URL: _not supplied_
- Evidence SHA-256: _not supplied_
- Approval timestamp: _not supplied_

## Gate 7 — Controlled launch approved

Database key: `controlled_launch_approved`

Required decision: every preceding live gate has passed with valid evidence; the exact production migrations and deployment have passed release QA; the selected local-charity and GiveWell destinations are approved live recipients; rollback and disable procedures are verified; the launch limits are fixed in advance.

- Status: `pending`
- Approved local charity: _not supplied_
- Provider recipient identity: _not supplied_
- Launch participant cap: _not supplied_
- Launch aggregate-dollar cap: _not supplied_
- Per-obligation cap: _not supplied_
- Launch duration: _not supplied_
- Accountable owner: _not supplied_
- Role/authority: _not supplied_
- Email: _not supplied_
- Evidence URL: _not supplied_
- Evidence SHA-256: _not supplied_
- Approval timestamp: _not supplied_

## Final activation checklist

All entries below must be complete before any production live flag changes:

- [ ] exact local charity named and approved through the destination-review workflow;
- [ ] GiveWell Top Charities Fund live identity reverified;
- [ ] canonical live Stripe account connected and operational;
- [ ] canonical live webhook created and its secret installed only in Vercel production;
- [ ] production migrations `20260725152000` and `20260731084000` applied and read back;
- [ ] exact release merged and deployed while all money modes remain disabled;
- [ ] production database, webhook, refund, dispute, replay, recipient, and reconciliation gates pass;
- [ ] every institutional gate above has named ownership and immutable evidence;
- [ ] `CONDITIONAL_PAYMENTS_MODE=live` is enabled only for mandate creation after all relevant conditional-payment gates pass;
- [ ] `TRADE_DONATION_POOL_MODE=live` and `TRADE_DONATION_POOL_ENABLED=true` are enabled only after every pooled-settlement live gate passes;
- [ ] a human donor completes Stripe-hosted setup-mode authorization;
- [ ] no live charge is created without a separate explicit amount-and-destination authorization;
- [ ] post-deployment desktop/mobile smoke, runtime logs, ledger checks, and rollback readiness are verified.
