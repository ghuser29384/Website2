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

## Environment controls

```text
DIRECT_DONATION_UPGRADES_ENABLED=false
DIRECT_DONATION_UPGRADE_MODE=disabled
DIRECT_DONATION_UPGRADE_QA_FIXTURES=false
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
