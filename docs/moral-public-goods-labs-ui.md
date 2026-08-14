# Moral Public Goods Labs UI

## Repository Inspection

- Framework and routes: Next.js App Router under `src/app`, with async dynamic route params on newer route files.
- Styling: global site classes plus small primitives. There is no shadcn/Card/Button/Dialog layer, so this page uses a route-local CSS module instead of adding a parallel design system.
- Navigation: reuses `SiteTopbar`; the page uses a focused Labs nav with Explore, Moral Public Goods, My Activity, About, and Learn.
- Footer: uses a route-local simple footer with FAQ, Rules, Terms, and Privacy, because the global footer is broader than this single-decision Labs surface.
- Existing Moral Public Goods routes: live/current MPGF routes remain under `/mpgf`, including the primary CGPP route at `/mpgf/rounds/[roundId]`.
- Existing Labs routes: mechanism-specific non-MVP routes already exist under `/labs/refund-bonus-pledge-pool` and `/labs/at-least-tier-platform-match`.
- Gating pattern: existing v137 capability evaluators are `evaluateRefundBonusCapability` and `evaluateAtLeastTierPlatformMatchCapability`.
- Feature flags: refund-bonus uses `cgpp_refund_bonus_non_mvp_v0_1`; at-least-tier uses `cgpp_at_least_tier_platform_match_non_mvp_v0_1`.
- Live-money flags: refund-bonus uses `refund_bonus_live_money_enabled`; at-least-tier uses `at_least_tier_platform_match_live_money_enabled`.
- Money formatting: the new route uses integer cents plus `Intl.NumberFormat`; platform-match math uses integer basis points and round-half-up.
- Tests: repository tests run with `node --import tsx --test src/**/*.test.ts`; lint is `npm run lint`; typecheck uses `npx tsc --noEmit`; build is `npm run build`.

## Route Implemented

`/labs/moral-public-goods/[poolSlug]`

The fixture slug is `global-biosecurity-coordination`, so the usable Labs URL is:

`/labs/moral-public-goods/global-biosecurity-coordination`

The route is intentionally absent from the current Direct Capped CGPP MVP pledge path. It does not modify `/mpgf/rounds/[roundId]`, the primary MPGF contribution routes, or global nav discovery.

## Components And Files

- `src/app/labs/moral-public-goods/[poolSlug]/page.tsx`: server route, route gating, metadata, focused nav, and unavailable state.
- `src/app/labs/moral-public-goods/[poolSlug]/moral-public-goods-labs-client.tsx`: selector, forms, dynamic sidebar, drawers, and review modals.
- `src/app/labs/moral-public-goods/[poolSlug]/moral-public-goods-labs.module.css`: route-local visual system and responsive layout.
- `src/lib/mpgf/moral-public-goods-labs-ui.ts`: typed fixture, copy constants, integer math, USD parsing/formatting, dynamic sidebar notes, and Labs access helper.
- `src/lib/mpgf/moral-public-goods-labs-ui.test.ts`: fixture, copy, gating, source-route, and accessibility/responsive invariants.

## Copy Decisions

`moralpublicgoods137.md` semantics were treated as authoritative over contradictory screenshot copy.

- Refund-Bonus Pledge sidebar does not say "No direct user payout"; it says the failure bonus is conditional and backed, with ineligible states excluded.
- At-Least-Tier Platform Match sidebar does say "No direct user payout. Platform match goes to projects."
- Exact progress, threshold gaps, supporter gaps, different-view gaps, pivotality, and success-without-me copy are not shown.
- The persistent banner says real-money use is disabled unless the feature is explicitly promoted.
- The payment-method note uses the required negative sentence: saving a payment method is not a charge, hold, escrow, custody, or authorization.

## Production Gating

In non-production, the route defaults to a labs participant role for local inspection. In production, the default role is public and both mechanism feature flags are false unless explicitly configured. Production/public access renders an unavailable Labs page with no selector, no review modal, and no save affordance.

The server page calls both existing v137 capability gates:

- `evaluateRefundBonusCapability`
- `evaluateAtLeastTierPlatformMatchCapability`

The client component receives only serializable gate reasons. It has no server action, provider call, authorization, capture, routing, platform-match execution, or bonus-payment path. Review modal save buttons are local simulation only when all acknowledgements are checked.

## Screenshot Deviations Required By v137

- The refund-bonus sidebar does not copy the screenshot's "No direct user payout" language, because v137 permits an eligible backed failure-participation bonus on qualifying support-threshold failure.
- The page uses qualitative progress only, despite a richer dashboard being possible in existing MPGF surfaces.
- The page uses one reviewed fixture pool and one selected form at a time; it does not recreate the earlier dense dashboard/table views.
- The referenced screenshot was not present in the pasted attachment folder, so fidelity is implemented from the detailed textual visual specification and verified through rendered route checks.

## Tests Added

The added tests cover:

- fixture data and exact required pool values;
- integer-cent platform-match calculation;
- dynamic mechanism sidebar copy;
- copy lint for ordinary UI strings;
- production/public gating and non-production labs access;
- server route use of existing v137 gates;
- absence from the primary CGPP MVP pledge path;
- selected mechanism UI source behavior;
- review modal acknowledgement requirements;
- drawer `aria-expanded`/dialog semantics;
- CSS desktop two-column and mobile single-column layout invariants.

## Common Failure Bonus Reserve and Success Premium

The refund-bonus Labs surface now discloses a common Failure Bonus Reserve. Successful pools replenish it through a separately stated success premium; failed pools do not owe that premium.

The example quote is generated by the versioned pricing module rather than handwritten UI copy. It uses explicit assumptions and displays:

- the net recipient threshold;
- the provisional premium rate and dollar amount;
- the gross success requirement;
- the premium payer;
- the fact that payment fees remain separate.

The success premium is outside the net recipient threshold. It is not silently deducted from the amount promised to the recipient. The Labs rate is provisional and does not enable live charging, custody, payout, or reserve posting.

For the pricing formula, multi-threshold treatment, database controls, and production gates, see `docs/failure-bonus-success-premium.md`.
