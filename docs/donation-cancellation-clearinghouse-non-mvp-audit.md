# Donation Cancellation Clearinghouse Non-MVP Audit

## Files Inspected

- `src/lib/moral-trade/donation-cancellation-clearinghouse.ts`
- `src/lib/moral-trade/donation-cancellation-clearinghouse.test.ts`
- `src/app/donation-cancellation/page.tsx`
- `src/app/donation-cancellation/[roundSlug]/page.tsx`
- `src/app/donation-cancellation/[roundSlug]/register/page.tsx`
- `src/app/account/donation-cancellations/page.tsx`
- `src/app/admin/donation-cancellation/page.tsx`
- `src/lib/marketplace-deals.ts`
- `src/lib/site.ts`
- `src/lib/site-search.ts`
- `src/lib/public-route-smoke.test.ts`
- `src/lib/marketplace-deals.test.ts`
- `tests/public-routes.spec.ts`
- `config/measurement/public-route-baseline.json`
- `scripts/verify-crawlability.mjs`
- `supabase/migrations/20260706_donation_cancellation_clearinghouse.sql`
- `docs/donation-cancellation-clearinghouse.md`

## Exposure Points Found

- Public route family under `/donation-cancellation`.
- Account route `/account/donation-cancellations`.
- Admin route family under `/admin/donation-cancellation`.
- Primary nav and footer links.
- Site search item.
- Marketplace deal injection through `buildMarketplaceDeals`.
- Public route baseline, crawlability sitemap check, and Playwright public-route list.
- Supabase scaffold with public read policies for rounds, recipients, and markets.

## Routes Hidden or Gated

- `/donation-cancellation`, `/donation-cancellation/[roundSlug]`, `/donation-cancellation/[roundSlug]/register`, and `/account/donation-cancellations` now render a non-MVP unavailable notice by default.
- Static params for public round/register routes do not publish active seed rounds in production.
- Admin route remains available as a non-mutating labs console and displays the persistent non-MVP warning.
- Primary nav, footer, site search, public route baseline, crawlability, and public route smoke inputs no longer treat Donation Cancellation as an ordinary public MVP route.

## Payment Paths Blocked

- Central gate: `assertDonationCancellationCapability(action, actor, environment)`.
- Future-only flag: `donation_cancellation_live_money_enabled`, default false.
- Production real-money authorization, capture, routing, and settlement require an approved promotion record plus live-money/readiness gates, and are still blocked while classification remains `non_mvp`.
- Migration keeps provider operation refs null and creates no public read policies while non-MVP.

## Production Gaps

- No approved `FeaturePromotionRecord` exists.
- No production payment provider path is enabled for this feature.
- No live donation routing or settlement worker is enabled.
- No public report publication job is enabled.
- Supabase schema is scaffolded only and must be regenerated/applied in a controlled migration workflow before any future promotion.

## Tests Added

- Feature classification and default-disabled checks.
- Production public route and real-money gate checks.
- Explicit dev/test simulation enablement checks.
- Promotion-record and live-money flag checks.
- Public route unavailable/admin banner source checks.
- Marketplace default exclusion and labs-only inclusion checks.
- Production seed suppression checks.
- Background job gate checks.
- Copy preflight checks for misleading public product/payment phrases.

## Remaining Risks

- This patch preserves labs simulation helpers; future API/server-action additions must call the same central gate before validation or provider calls.
- Admin route authorization is represented by the labs permission contract in code; wiring it to real operator auth remains future work.
- Existing production/staging data, if any exists outside this repo, must be migrated with the non-MVP status/audit event path before public access is enabled.
