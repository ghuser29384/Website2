# Donation Cancellation Clearinghouse

> Status: NON-MVP. This mechanism is not part of the current Direct Capped CGPP MVP. Production public registration, real-money authorization, capture, donation routing, and settlement are disabled. This feature may be used only in development, tests, or admin/labs review unless explicitly promoted through a later approval process.

Internal label: Donation Cancellation Clearinghouse v0.1
Labs label: Donation Cancellation Clearinghouse
Feature flag: `donation_cancellation_clearinghouse_v0_1`
Future-only live-money flag: `donation_cancellation_live_money_enabled`

## Current Product Classification

Donation Cancellation Clearinghouse is ordinary Toby-Ord-style moral trade. It is not CGPP, not Moral Goods Group Buying, and not part of the current Direct Capped Common Ground Pledge Pool MVP from `moralpublicgoods135.md`.

Central classification in `src/lib/moral-trade/donation-cancellation-clearinghouse.ts`:

- `feature_classification`: `non_mvp`
- `deployment_stage`: `labs_research_non_mvp`
- `default_enabled`: `false`
- `production_public_enabled`: `false`
- `production_real_money_enabled`: `false`
- `primary_nav_enabled`: `false`
- `mvp_surface_enabled`: `false`
- `cgpp_surface_enabled`: `false`
- `requires_admin_or_labs_access`: `true`
- `requires_explicit_promotion_record`: `true`

The service gate is `assertDonationCancellationCapability(action, actor, environment)`. It returns explicit reasons such as `feature_non_mvp`, `feature_disabled`, `public_surface_disabled`, `production_real_money_disabled`, `missing_promotion_record`, `insufficient_role`, `payment_mode_not_allowed_for_non_mvp`, and `route_not_available_in_current_deployment`.

## Repository Patterns Reused

- Framework and routing: Next.js App Router with TypeScript in `src/app/`.
- Domain logic: typed, source-adjacent modules in `src/lib/moral-trade/` with `node:test` coverage.
- Database pattern: additive Supabase migrations under `supabase/migrations/`.
- Auth/session: existing Supabase viewer helpers in `src/lib/app-data.ts` and server Supabase clients in `src/lib/supabase/`.
- Admin/reviewer model: existing admin and reviewer contract modules under `src/lib/moral-trade/`, plus `/admin` route conventions.
- Moral-trade models: pledge swaps, direct pair clearing, group buying, payment authorization, settlement controls, public receipts, and review gates already exist.
- Payment pattern: fail-closed payment authorization contracts in `payment-authorizations.ts`; MPGF payment support exists but is not automatically reusable for this donation clearinghouse.
- Ledger/receipt pattern: settlement controls and public receipt cards separate fees, gross amounts, routed totals, and public/private fields.
- Feature flags and pauses: existing modules model feature-gated rollout and pause/freeze behavior; this feature adds a dedicated non-MVP flag, future-only live-money flag, service-level capability gate, promotion guard, and emergency pause lanes.
- Audit/outbox pattern: existing migrations use append-only marketplace state events, review rows, and outbox-style records.
- Privacy/redaction pattern: aggregate-only public surfaces, redacted evidence, and no public private scores or identifiers.
- Idempotency pattern: existing payment/background actions use idempotency keys; routing operations here generate deterministic idempotency keys.
- CSRF/rate-limit/abuse controls: server mutations elsewhere rely on repository-equivalent server actions/API checks. This release is non-mutating route-safe UI plus domain tests.
- Commands: `npm test`, `npm run lint`, `npm run build`, and `npm run test:e2e`.

## Models Added

The TypeScript model is in `src/lib/moral-trade/donation-cancellation-clearinghouse.ts`.
The Supabase migration scaffold is `supabase/migrations/20260706_donation_cancellation_clearinghouse.sql`.

Core records:

- `DonationCancellationRound`
- `DonationRecipient`
- `OppositionMarket`
- `MoralPrioritySnapshot`
- `IntendedDonationRegistration`
- `DonationCancellationMatchGroup`
- `DonationCancellationAllocationRow`
- `RedirectSuggestion`
- `DonationRoutingOperation`
- `DonationCancellationAuditReport`
- `DonationCancellationCopyPreflightReport`
- `FeaturePromotionRecord`

## Payment Modes

- `dev_simulated_capture`: development-only simulated payment confirmation.
- `provider_authorization_then_capture`: blocked while the feature remains non-MVP.
- `provider_capture_to_compliant_clearing_account`: blocked while the feature remains non-MVP.

Production fail-closed behavior is the default. In production there is no capture at registration, no provider authorization, no capture, no donation routing, no settlement execution that moves money, and no real provider operation refs. Enabling `donation_cancellation_clearinghouse_v0_1` alone does not enable real money. Real-money actions require a future approved `FeaturePromotionRecord`, `donation_cancellation_live_money_enabled = true`, provider readiness, legal/compliance readiness, trust-and-safety readiness, passed copy preflight, configured caps, and no emergency pause. Because the current classification is `non_mvp`, these actions remain blocked.

## Matching Algorithm

Version: `donation-cancellation-gross-largest-remainder-v0.1`

The research mechanism matches gross minor units at a frozen 1:1 ratio because the dev fee policy is uniform and separately disclosed. Eligible simulated registrations must have explicit currency and a dev/test-allowed payment state. Payment failures, blocked recipients, blocked markets, identity blocks, review blocks, and route blocks are excluded.

For each active market:

1. Collect eligible side A and side B registrations.
2. Compute side totals.
3. Match `min(side_a_total, side_b_total)`.
4. If one side has surplus, allocate matched cents pro-rata using deterministic largest-remainder rounding by stable registration id.
5. Route unmatched portions to the original intended recipient.

## Suggestion Algorithm

Version: `donation-cancellation-min-common-ground-score-v0.1`

For each approved redirect candidate:

1. Require market approval, verified route, sanctions/AML clear state, and no prohibited-recipient hit.
2. Require compatibility with every involved user’s frozen accepted/unacceptable recipient lists.
3. Score each user by priority-weight fit against recipient cause tags.
4. Pick highest `min(user_scores)`.
5. Tie-break by summed scores, lower fees, then stable recipient id.

Ordinary users see only safe explanations. Private scores, priority weights, payment references, and counterparty identities are not public.

## Settlement and Idempotency

`buildDonationCancellationSettlementPlan` creates a deterministic plan before routing. It binds registrations, payment states, match groups, redirect suggestions, allocation rows, routing operations, idempotency keys, and calculation hashes. `validateDonationCancellationSettlementFreshness` blocks stale approved plans if inputs or outputs change.

Routing operations are idempotent by deterministic idempotency key. Retrying a failed job must not double-charge, double-donate, double-release, or double-publish. While non-MVP, production job gates block matching reports that imply live public availability, payment retries, provider calls, real donation routing, and settlement execution that moves money.

## Privacy and Reporting

Default visibility is `aggregate_only`.

Admin/labs reports may show aggregate registered, matched, redirected, routed-to-intended, fee, participant, recipient-total, market-count, final-status, and limitation fields where thresholds permit. They must not expose counterparty identity, priority weights, exact private scores, payment references, private review notes, exact pre-close gaps, or user-level redirect accept/reject decisions.

Public report copy uses “opposed donation volume redirected,” not “objective impact.”

## Unsupported Cases

No political campaign contributions. No election spending. No vote buying. No lobbying trades. No user-generated opposition markets. No free-form opposition claims without admin review. No threat-like proposals. No public counterparty identities. No production custody or captured platform funds unless legal/compliance-reviewed support exists.

Blocked dev placeholders for gun-rights and gun-control advocacy are present only to ensure production seed and route logic hard-block political/lobbying examples.

## Route Availability and Discovery

Ordinary public discovery is disabled by default:

- Primary nav and footer do not link to Donation Cancellation Clearinghouse.
- Site search does not return Donation Cancellation Clearinghouse.
- Marketplace deals exclude Donation Cancellation Clearinghouse unless `includeNonMvpLabs` is explicitly true.
- Public route baseline and crawlability verification do not include `/donation-cancellation`.
- CGPP pages and pledge paths do not route through Donation Cancellation Clearinghouse.

Route behavior:

- `/donation-cancellation`
- `/donation-cancellation/[roundSlug]`
- `/donation-cancellation/[roundSlug]/register`
- `/account/donation-cancellations`

These routes render a “not currently available” non-MVP notice by default and do not show production registration, authorization, capture, routing, settlement, or report-publishing CTAs. Admin/labs routes may remain available for draft review and simulated operations, and must display the persistent non-MVP banner:

> Non-MVP mechanism. Not part of the current CGPP MVP. Simulated or admin-review use only. Production real-money registration, authorization, capture, routing, and settlement are disabled.

Admin can view draft rounds, draft markets, draft recipient metadata, simulated matching, copy preflight, simulated audit reports, pause/kill-switch controls, and non-sensitive test exports. Admin cannot open a public real-money round, accept payment-backed intended donations, authorize real payment, capture real payment, route real donations, execute live settlement, or publish a public report implying active product availability while the feature is non-MVP.

## Promotion Requirements

There is intentionally no approved promotion record for Donation Cancellation Clearinghouse. A future promotion must create a durable `FeaturePromotionRecord` with product, payments, legal, trust-and-safety, and governance approvals before any public or real-money enablement can be considered. A rejected or revoked record blocks real-money actions. An approved record alone is insufficient without the separate live-money flag and readiness gates.

## Seed and Status Handling

Demo seeds are development/test fixtures only. Production seed helpers suppress registrations, mark rounds blocked/non-MVP disabled, block payment routes, and prevent active opposition markets. Political/lobbying placeholders remain blocked and dev-only.

The migration scaffold adds `non_mvp_disabled` status handling and `donation_cancellation_marked_non_mvp_disabled` audit events for any existing records that must be preserved but suppressed from public use.

## How To Run Locally

```bash
npm install
npm run dev
```

Useful local/admin routes:

- `/donation-cancellation`
- `/donation-cancellation/dev-donation-clearinghouse`
- `/donation-cancellation/dev-donation-clearinghouse/register`
- `/account/donation-cancellations`
- `/admin/donation-cancellation`

## How To Run Tests

```bash
node --import tsx --test src/lib/moral-trade/donation-cancellation-clearinghouse.test.ts
npm test
npm run lint
npm run build
```

## Environment Variables

No new secret is required for the development simulation. `donation_cancellation_live_money_enabled` is documented as future-only and defaults false everywhere. Production enablement requires a future approved promotion record, the live-money flag, provider authorization or compliant captured-funds configuration, legal/compliance readiness, trust-and-safety readiness, copy preflight, configured caps, and an inactive emergency pause.

## Production Gaps

- Durable Supabase read/write flows are migration-scaffolded but not wired to live mutations.
- RLS currently creates no public Donation Cancellation read policy while non-MVP.
- Payment provider authorization/capture is blocked for this feature.
- Real donation routing and recipient payout execution are blocked.
- Domain event outbox jobs and scheduled settlement workers are not wired.
- Admin mutation screens are route-safe previews, not live state mutation consoles.
- Public report publication is computed in code but not persisted or published through a live job.
- CGPP separation must remain enforced until a later explicit product promotion changes the feature classification.

## Tests Added or Updated

- Classification and default-disabled checks.
- Public-route guard and admin non-MVP banner checks.
- Marketplace exclusion unless `includeNonMvpLabs` is explicit.
- CGPP separation through marketplace/default discovery tests.
- Production provider authorization, capture, routing, settlement, and job-gate blocking checks.
- Promotion-record checks for absent, approved-but-insufficient, and live-money flag behavior.
- Seed suppression for production and explicit dev/test fixtures.
- Copy preflight blocks for misleading public product/payment claims.
