# Every.org Donation Upgrade refund and brand-review packet

Status: **draft, unsent, and not approved for publication**
Issue: #709
Stacked base: `566bb18db56848b40a3a1ab58979a6be88ba45a8`
Base tree: `86c70b442272f5cff4cf29e63d030c949b4323cb`
Base branch: `integration/direct-donation-upgrade-current-main-20260807`

## Purpose

This packet governs the refund-safe Donation Upgrade tranche and the exact Every.org brand review that must occur before public release. It is deliberately text-first and adds no Every.org logo, icon, wordmark, branded color treatment, partnership claim, co-marketing claim, or endorsement claim.

The final packet must be regenerated from the final immutable candidate head. Until the exact strings, routes, desktop screenshots, mobile screenshots, and source identities below are complete, this file is not ready to send to Every.org.

## Provider statements on which this tranche relies

Every.org has supplied the following written integration facts:

1. Moral Trade's described direct, non-custodial use case is permitted.
2. Every.org may share the Partner Webhook payload with Moral Trade and Moral Trade may retain the returned payload.
3. Rare fraud-related refunds may occur after an initially confirmed donation.
4. Every.org does not yet provide a refund webhook notification.
5. Moral Trade may feature Every.org, but every use of Every.org's brand must be reviewed before publication.
6. Every.org does not currently offer commercial co-branding or co-marketing.

These statements do not establish an automatic refund-detection API, a known refund window, irreversible payment finality, legal approval, sponsorship, endorsement, or independent audit of every donor-consent surface.

## Locked funds-flow and truthfulness boundary

- Each participant donates separately on an Every.org-hosted flow.
- Moral Trade never receives, holds, combines, splits, redirects, re-donates, settles, or refunds the charitable payment.
- An authenticated Every.org Partner Webhook may establish that the frozen donation was confirmed at a point in time.
- Confirmation must not be presented as irrevocable finality.
- A later authoritative provider refund must preserve the original confirmation, reverse only current impact credit attributable to the refunded obligation, and move any completed multi-obligation agreement into an explicit post-completion exception state.
- Participant self-report or an unverified screenshot is not sufficient authority for a refund reversal.

## Required user-visible wording

The final implementation should use restrained text equivalent to the following, subject to exact rendered review:

- `Confirmed by Every.org`
- `Every.org confirmed this donation, but rare fraud-related refunds can later occur.`
- `Moral Trade does not process or refund this payment.`
- `Provider refund recorded`
- `The original donation confirmation remains in the audit history. Current credited impact excludes the refunded amount.`
- `This agreement entered a post-completion exception because a required donation was later refunded by the provider.`

Prohibited wording includes:

- `final`, `irreversible`, or `guaranteed` when referring to provider settlement;
- `partnered with`, `in partnership with`, `sponsored by`, `endorsed by`, or `co-branded with Every.org`;
- any statement that Moral Trade issued, controlled, guaranteed, executed, or reversed the refund;
- any automatic-refund or refund-window claim not supplied by Every.org.

## Material route inventory

The final candidate must inventory and capture every material Every.org reference on these Donation Upgrade surfaces:

1. `/trades/new?structure=conditional-donation&rail=direct`
2. `/donation-upgrades`
3. `/donation-upgrades/[offerId]`
4. `/connectors`
5. `/admin/donation-upgrades`
6. any Donation Upgrade receipt, notification, error, empty state, or completion state reachable from those routes

For every surface, the final packet must record:

- exact source path and immutable source blob;
- exact rendered string;
- audience and state in which the string appears;
- desktop screenshot at `1440x1000`;
- mobile screenshot at `390x844`;
- whether the use is provider attribution, processing description, verification claim, refund notice, data-sharing notice, or brand asset;
- requested approval scope and any requested edit.

## Asset inventory

Current intended treatment for this tranche: **text-only neutral attribution**.

No Every.org visual asset may be added or published by this tranche before written review. If a later candidate proposes an asset, the final packet must identify:

- the exact Every.org asset source;
- file name and cryptographic hash;
- whether the asset is byte-for-byte unmodified;
- rendered dimensions and placement;
- accessibility text;
- written approval covering that exact use.

## Refund-state design contract

The implementation must use additive, append-only records and preserve historical provider evidence.

Required state concepts:

- obligation current state: `provider_reversed` or equivalently precise provider-refund terminology;
- offer current state: `post_completion_exception` when a completed branch loses a required donation;
- immutable original confirmation evidence;
- immutable provider-refund evidence record;
- append-only impact adjustment or reversal record;
- gross confirmed totals distinct from current unreversed/net credited totals;
- identical refund-report idempotency;
- altered, partial, cross-obligation, cross-environment, charge-mismatched, donation-ID-mismatched, recipient-mismatched, currency-mismatched, or amount-mismatched reports fail closed to review;
- a replay of the original completion webhook after refund cannot restore the obligation or recreate impact credit.

The operator path must require the existing administrator allowlist and active AAL2/MFA session. It must accept only authoritative Every.org dashboard or support evidence whose exact provider identity, environment, obligation, charge/donation identifiers, recipient, currency, and amount can be matched. It must not treat participant screenshots or participant self-report as sole authority.

## Data-minimization boundary

The refund tranche must not newly persist donor name, donor email, payment credentials, card or bank data, or a full raw webhook body. Prefer exact hashes, provider identifiers already required for reconciliation, normalized amounts/currency/recipient identity, an evidence-source reference, and a private operator note bounded to the minimum necessary content.

## Approval checklist

Before this packet is sent:

- [ ] final exact commit and tree recorded;
- [ ] changed-file inventory recorded;
- [ ] every material text string and route inventoried;
- [ ] desktop and mobile screenshots captured from the exact candidate;
- [ ] no logo or other visual asset is present, or every exact asset is inventoried;
- [ ] no partnership, endorsement, sponsorship, or co-marketing claim appears;
- [ ] refund and data-sharing wording is technically accurate;
- [ ] provider authentication from Issue #708 remains green;
- [ ] staging checkout/webhook/replay/cross-charge evidence is recorded separately;
- [ ] exact first local-charity recipient is frozen;
- [ ] independent legal/charitable-solicitation classification is recorded;
- [ ] Every.org written approval and any requested edits are attached to the final exact version;
- [ ] all provider-staging identities and synthetic records are cleaned before production release.

## Release boundary

This packet does not authorize sending email, submitting materials, publishing Every.org branding, merging to `main`, deploying, applying a remote migration, registering or invoking a webhook, starting a checkout, making a donation, issuing a refund, changing credentials, enabling a money rail, or changing production state.
