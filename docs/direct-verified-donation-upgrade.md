# Direct verified Donation Upgrade

## Product boundary

Donation Upgrade lets a creator publish an existing donation plan and ask another person to add a fixed amount. The direct rail is non-custodial:

1. Moral Trade records the creator's immutable full no-match baseline, the original Every.org recipient, the upgraded Every.org recipient, amounts, redirect percentage, exact derived cents, deadline, and privacy mode.
2. The first eligible person who accepts the published terms becomes primary; later eligible accepters become backups under the same immutable terms.
3. A partial match creates a creator-retained obligation to the original recipient when the retained amount is nonzero, a creator-redirected obligation to the upgraded recipient, and a separate matcher-incremental obligation to the upgraded recipient.
4. A 100% redirect creates no retained obligation. The redirected creator obligation and separate matcher obligation remain.
5. If the matching deadline passes without a matcher, the fallback branch creates one obligation for the creator's full original baseline amount.
6. Each participant completes each of their own obligations through a separate Every.org checkout. Moral Trade never receives, holds, combines, redirects, or re-donates participant funds.
7. Only an exact Every.org partner webhook can verify fulfillment and create impact credit.

The managed Stripe rail is a separate mechanism. Existing direct commitments cannot be converted to automatic charges without new participant consent.

### Spending Upgrade subtype boundary

`Spending Upgrade` is an additive subtype inside the same Donation Upgrade product family. It is not a new top-level Create mechanism and it does not reinterpret any planned-donation row, recipient, hash, obligation, or impact record.

The create flow first asks which statement was already true:

- the creator already planned to donate the money; or
- the creator already planned an optional, nonessential expense.

The second answer uses versioned sibling storage because a prospective expense has no original nonprofit. A Spending Upgrade therefore never invents an “original recipient.” Before matching, the creator freezes private prospective evidence, the allowed expense category, intended cancellation or reduction action, exact prospective spend, exact amount that would become a donation, matcher amount, upgraded Every.org recipient, deadline, privacy mode, and subtype-specific terms hash.

An unmatched Spending Upgrade creates no donation obligation, no checkout, no purchase or spending obligation, and no impact credit. The creator is not required to complete the original purchase. After an accepted prospective-baseline review and a match, it creates exactly two direct Every.org donation obligations:

1. the creator donates the amount released from the optional expense directly to the upgraded nonprofit; and
2. the matcher makes an independent direct donation to that same nonprofit.

Moral Trade does not receive, hold, combine, split, transfer, re-donate, or disburse either donation and does not pay the creator.

## Environment controls

```text
DIRECT_DONATION_UPGRADES_ENABLED=false
DIRECT_DONATION_UPGRADE_MODE=disabled
DIRECT_DONATION_UPGRADE_QA_FIXTURES=false
DIRECT_SPENDING_UPGRADES_ENABLED=false
DIRECT_SPENDING_UPGRADE_FINGERPRINT_SECRET=
EVERY_ORG_PUBLIC_API_KEY=
EVERY_ORG_WEBHOOK_TOKEN=
EVERY_ORG_WEBHOOK_PATH_SECRET=
EVERY_ORG_PARTNER_METADATA_SECRET=
```

Permitted modes:

- `disabled`: nonprofit search, publication, matching, and checkout are fail-closed.
- `staging`: available only outside canonical production. The public API may be replaced by deterministic Homeward Pet and GiveWell fixtures when `DIRECT_DONATION_UPGRADE_QA_FIXTURES=true`.
- `live`: available only on the canonical production deployment with all Every.org values configured.

Internal, database, or rendered QA does not substitute for provider staging approval or a real hosted-checkout and authoritative-webhook exercise.

The webhook path and metadata secrets must each contain at least 32 characters.

Enabling the parent direct Donation Upgrade rail does not enable Spending Upgrade. `DIRECT_SPENDING_UPGRADES_ENABLED` defaults to `false`, and new prospective baselines additionally require a private HMAC fingerprint secret of at least 32 characters. The fingerprint supports duplicate-baseline exclusion without placing raw merchant or order details in a unique index. Existing matched obligations may still reconcile through the provider webhook if the fingerprint secret later becomes unavailable.

## Spending Upgrade evidence and additionality

Three facts are intentionally separate:

1. **Donation fulfillment:** only the exact Every.org partner webhook can verify either direct donation.
2. **Spending cancellation or reduction:** only the private scoped evidence process can decide whether the prospective expense was actually cancelled, reduced, or downgraded.
3. **Converted-spending credit:** the creator receives one append-only converted-spending credit only after both the creator donation is provider-verified and the spending-change evidence decision is accepted.

A provider-verified creator donation without accepted spending-change evidence remains a real donation, but it is not described or counted as converted spending. The matcher's provider-verified independent donation remains factual incremental giving even if creator evidence is later rejected, disputed, or unavailable. The whole offer cannot be `completed` unless both donations are verified and creator spending-change evidence is accepted.

Prospective-baseline review and post-match spending-change review require an explicit, narrow assignment. The assignment confers evidence-only authority, not donation-verification authority. The creator, matcher, and a counteroffer participant for the same baseline cannot serve as reviewer. Ordinary admin access does not confer this authority and the admin console has no accept or reject controls. If compatible reviewer authority is unavailable, the record stays `review_required` or `unavailable`; the system does not invent automated verification or label an ordinary administrator independent.

Decisions, credits, and audit events are append-only. Accepted decisions, webhook completions, and exact replays are idempotent. Concurrent match and counteroffer-acceptance paths lock the offer and can produce at most one winning matcher and one immutable successor.

### Allowed and excluded spending

The first candidate allows only:

- an optional subscription or automatic renewal;
- a cancellable optional reservation or service; or
- a pending optional order, product upgrade, or service upgrade.

Client choices, server validation, and database constraints reject food, meals, nutrition or hydration; medication, medical, mental-health, dental, reproductive-health or disability support; housing, utilities, insurance, essential household goods or transport; required education or work costs; debt, taxes, fines, legal or support obligations; child, elder, dependent or pet care; safety-related spending; substantial harm risk; and any donation financed through BNPL, a cash advance, payday lending, or new credit-card debt.

The interface must not introduce sacrifice leaderboards, streaks, shame prompts, deprivation comparisons, or “skip a meal” framing. It must never publish merchant names, account or order identifiers, bills, baseline evidence, cancellation records, fingerprints, review notes, partner donation IDs, provider charge hashes, or webhook payload hashes.

## Recipient identity

Search results are suggestions, not trusted payment instructions. On publication the server re-fetches each selected nonprofit from Every.org and freezes:

- provider nonprofit ID;
- legal/display name;
- primary slug;
- EIN when supplied;
- disbursability;
- Every.org profile URL;
- website, location, description, and logo metadata;
- canonical identity SHA-256.

The two branches are rejected as identical if the provider ID, primary slug, non-empty EIN, or identity hash matches. This prevents alternate slugs for the same nonprofit from being used as a nominal "upgrade."

## Baseline and terms

The creator confirms that the original donation was independently planned before publication and provides a short explanation. The frozen terms hash binds:

- creator profile;
- full creator-baseline amount;
- redirect basis points and the deterministically derived redirected and retained cent amounts;
- matcher amount;
- original and upgraded recipient hashes;
- matching deadline;
- privacy mode;
- environment;
- baseline version and attestation hash;
- matcher commitment version;
- proposal commitment version;
- seven-day fulfillment period;
- 24-hour webhook reconciliation grace period.

Changing any bound term creates a different terms hash. Accepted counteroffers therefore create a new immutable offer revision instead of rewriting the old hash or terms.

## Partial redirection and exact cents

The creator freezes a redirect percentage from `0.01%` through `100%`. The application and database represent it as an integer from 1 through 10,000 basis points. Derived monetary values are integer cents; floating-point values are not stored as monetary truth.

The redirected cents are the creator baseline multiplied by the basis points and rounded deterministically to the nearest cent, with half cents rounded up. Retained cents are the exact remainder, so:

```text
redirected cents + retained cents = full creator baseline cents
```

For a planned `$10.00` donation and a 20% redirect:

```text
No match:
$10.00 creator fallback donation to the original recipient.

Match:
$8.00 creator-retained donation to the original recipient;
$2.00 creator-redirected donation to the upgraded recipient;
the matcher's separate added donation to the upgraded recipient.
```

The redirected leg and matcher leg must each be at least `$1.00`. The retained leg must be either exactly `$0.00` or at least `$1.00`. At 100%, retained cents are `$0.00` and no retained obligation is created.

The creator's full original amount remains the genuine no-match baseline and is never incremental. In a matched branch, only the verified creator-redirected net amount is redirected impact. The verified retained leg receives neither incremental nor redirected credit. The matcher's verified net amount is incremental.

## Accepting current terms and negotiation

An eligible counterparty may accept the exact published terms. The first eligible accepter becomes primary and immediately opens the exact matched obligations; later eligible accepters become backups. Accepting the published terms supersedes any still-pending counteroffers on that offer.

Instead, an eligible counterparty may submit a counteroffer containing a proposed redirect percentage, proposed matcher amount, optional explanation, and binding advance matcher commitment. Submission freezes the proposal's base-terms hash, exact derived cents, commitment version, and commitment timestamp. Only one counteroffer may be pending per proposer and offer. A proposer may withdraw a pending proposal, and the creator may reject it with an optional response.

The creator may accept a proposal only while the original offer and proposal are still open and pending, the matching deadline has not passed, the proposal still names the original frozen terms hash, and the proposer remains eligible and unrestricted. Acceptance is atomic and does not mutate the old terms. It:

- creates one new immutable matched offer revision;
- links the old and new offers in both directions;
- preserves the proposal's original commitment version and timestamp on the primary matcher;
- creates the exact retained obligation only when retained cents are nonzero, plus the redirected and matcher obligations;
- marks the chosen proposal accepted and all other pending proposals superseded;
- cancels the old offer as superseded;
- writes append-only audit events and deduplicated participant notifications.

Concurrent acceptance attempts may produce at most one accepted successor revision.

## Matching and backup lifecycle

- `open`: accepts either the first exact-terms matcher or a creator-accepted counteroffer until the match deadline.
- `matched`: freezes the matched branch, creates the applicable retained, redirected, and primary-matcher obligations, and can accept backups under those same terms.
- `fallback_selected`: creates the creator's direct obligation after an unmatched deadline.
- `completed`: all required obligations for the selected branch were verified.
- `defaulted`: a required participant did not fulfill by the deadline plus webhook grace.
- `needs_review`: exact webhook, replay, state, recipient, or amount invariants failed.

When a matcher defaults after the creator is already verified, the first backup is promoted and receives a fresh seven-day obligation. The creator's verified donation remains recorded. If a matcher verifies first and the creator later defaults, the matcher remains `fulfilled`; the offer becomes `defaulted` rather than entering an impossible-state review.

## Every.org checkout and webhook

The checkout fixes:

- recipient slug;
- exact gross amount and minimum value;
- one-time frequency;
- partner donation ID;
- base64 partner metadata containing the obligation, offer, participant, role, branch, terms hash, and HMAC;
- success and exit URLs;
- webhook token.

A browser return is not fulfillment. The webhook must match:

- unique provider charge ID;
- partner donation ID;
- HMAC-bound metadata;
- obligation environment;
- exact gross amount;
- valid net amount no greater than gross;
- USD currency;
- one-time frequency;
- recipient slug and EIN when present;
- donation date no later than the frozen due time (with a small timestamp tolerance).

Identical replays are idempotent. An altered replay, duplicate provider charge, recipient mismatch, amount mismatch, invalid net amount, or impossible lifecycle state sends the whole offer to `needs_review` and awards no additional impact.

Verification is obligation-specific. A browser return, checkout-start event, screenshot, or participant self-attestation cannot verify any leg or create impact credit. One provider charge cannot satisfy two obligations, and a partial matched offer cannot complete while any required retained, redirected, or matcher leg remains unverified.

## Privacy

The default is public identity. In `private_until_completed` mode:

- creator and matcher identities are hidden from the public while open and during fulfillment;
- identities become public only after successful completion;
- identities remain hidden publicly after expiry, cancellation, default, or review failure;
- participants and authorized operators retain private access needed for fulfillment, support, and abuse prevention.

Counteroffers are never public records. The creator may review proposals for their offer, and a proposer may review their own negotiation history; anonymous and ordinary authenticated database roles cannot read proposal rows or invoke Donation Upgrade mutation RPCs directly.

Moral Trade's privacy mode does not control Every.org's separate donor-profile settings.

## Reliability and default handling

At 72 hours and 24 hours before the due time, the lifecycle job creates deduplicated reminders. After the 24-hour webhook grace period:

- an unfulfilled participant receives a credibility default event;
- a seven-day Donation Upgrade restriction is created;
- no impact credit is awarded;
- backups are closed or promoted according to the selected branch and verified state.

The lifecycle job runs every 15 minutes at `/api/jobs/donation-upgrades` and requires the ordinary cron authorization.

## Operator controls

`/admin/donation-upgrades` requires an allow-listed admin email and an active authenticator MFA session. It exposes read-only operational state for:

- offers and selected branches;
- open and verified obligations;
- webhook mismatches and review cases;
- defaults;
- impact-credit records;
- immutable audit events.

Operators must not manually mark an obligation verified. Provider confirmation remains the only completion authority.

## Release gates

Before staging or production activation:

1. the original `20260801050000_direct_verified_donation_upgrades.sql` migration remains unchanged and the partial-redirection schema and lifecycle changes remain additive later migrations;
2. focused split, hash, proposal-state, revision-link, lifecycle, privacy, privilege, unit, and source-contract tests pass;
3. full repository tests, TypeScript, ESLint, and production build pass with both payment rails disabled;
4. the migrations compile and the rollback-only database matrix passes in MoralTrade QA, including 20%, 100%, exact-terms acceptance, proposal acceptance, concurrency, lifecycle, webhook accounting, and privilege cases;
5. matcher-first verification followed by creator default is proven to retain the matcher as fulfilled;
6. exact replay, altered replay, recipient, amount, currency, frequency, net-amount, late-donation, and provider-charge-reuse cases are tested;
7. authenticated `1440 × 1000` and `390 × 844` rendered QA exercises the slider, direct percentage entry, exact retained/redirected previews, 100%, invalid sub-`$1.00` legs, both recipient fixtures, responsive controls, and no-charge copy without submitting the form;
8. the rendered browser gate blocks and records every mutation request, Stripe or Every.org provider request, payment endpoint, Donation Upgrade webhook, and lifecycle-job request;
9. the always-run residue proof shows zero synthetic offers, proposals, candidates, obligations, credits, notifications, restrictions, credibility events, audit events, mandates, payment attempts, and pooled obligations before cleanup; cleanup then proves the synthetic identity and all listed records are absent;
10. a real Every.org staging checkout and authenticated partner-webhook verification pass before live mode. Internal fixtures and no-charge rendered QA do not satisfy this provider gate.

The Spending Upgrade subtype adds these candidate-only gates before its separate flag may be enabled:

1. the new migration compiles twice and its state-machine regression runs inside one rollback-only transaction; no QA or production migration is persistently applied by the candidate workflow;
2. SQL proves unmatched cancellation and expiry produce zero obligations and credits, matching produces exactly two same-recipient direct donations, self-match and counterparty review fail, provider and evidence states are independent, and each credit is minted at most once;
3. source tests prove the old planned-donation migration, field meanings, hashes, routes, and default-off behavior are unchanged;
4. public and admin-safe projections are checked for forbidden private fields and ordinary roles retain no direct table or RPC access;
5. authenticated rendered QA covers the baseline-source question, optional-spending form, exact-cent preview, exclusion copy, public-safe card, participant detail, and review-required accounting at `1440 × 900`, `1024 × 768`, and `390 × 844` without submitting a form or contacting a donation provider; and
6. live Every.org configuration, real checkout, production migration, merge, and deployment remain outside this candidate.
