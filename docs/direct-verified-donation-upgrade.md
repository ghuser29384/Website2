# Direct verified Donation Upgrade

## Product boundary

Donation Upgrade lets a creator publish an existing donation plan and ask another person to add a fixed amount. The direct rail is non-custodial:

1. Moral Trade records the creator's immutable no-match baseline, the original Every.org recipient, the upgraded Every.org recipient, amounts, deadline, and privacy mode.
2. The first eligible matcher becomes primary; later eligible matchers become backups.
3. A match freezes the matched branch and creates two separate direct-donation obligations to the upgraded recipient.
4. If the matching deadline passes without a matcher, the fallback branch creates one creator obligation to the original recipient.
5. Each participant completes their own Every.org checkout. Moral Trade never receives, holds, combines, redirects, or re-donates participant funds.
6. Only an exact Every.org partner webhook can verify fulfillment and create impact credit.

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
- creator and matcher amounts;
- original and upgraded recipient hashes;
- matching deadline;
- privacy mode;
- environment;
- baseline version and attestation hash;
- matcher commitment version;
- seven-day fulfillment period;
- 24-hour webhook reconciliation grace period.

The creator's original amount is not treated as incremental. In a matched branch, its verified net amount may be recorded as redirected. The matcher's verified net amount is incremental.

## Matching and backup lifecycle

- `open`: accepts the first primary matcher until the match deadline.
- `matched`: freezes the matched branch, creates creator and primary-matcher obligations, and can accept backups.
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

## Privacy

The default is public identity. In `private_until_completed` mode:

- creator and matcher identities are hidden from the public while open and during fulfillment;
- identities become public only after successful completion;
- identities remain hidden publicly after expiry, cancellation, default, or review failure;
- participants and authorized operators retain private access needed for fulfillment, support, and abuse prevention.

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

1. focused unit and source-contract tests pass;
2. full repository tests, TypeScript, ESLint, and production build pass with both payment rails disabled;
3. the migration compiles and the rollback-only database matrix passes in MoralTrade QA;
4. matcher-first verification followed by creator default is proven to retain the matcher as fulfilled;
5. exact replay, altered replay, recipient, amount, currency, frequency, net-amount, and late-donation cases are tested;
6. authenticated desktop and mobile rendered QA proves creation, primary matching, backup matching, privacy, and no payment opening during no-charge smoke;
7. staging checkout and signed webhook verification pass before live mode;
8. QA fixtures and all synthetic users, candidates, obligations, credits, notifications, restrictions, and audits are removed or rolled back.
