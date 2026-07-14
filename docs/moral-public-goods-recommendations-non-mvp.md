# Moral Public Goods Recommendations Non-MVP

## Repository Inspection

- Existing project and pool models: MPGF demo campaigns, rounds, pledges, review cases, identity attestations, match pools, and public API serializers live under `src/lib/mpgf/data.ts`, `src/lib/mpgf/types.ts`, `src/lib/mpgf/mechanism.ts`, and `src/lib/mpgf/public-goods-api.ts`.
- Existing v137 non-MVP routes: refund-bonus and at-least-tier branches live under `/labs/refund-bonus-pledge-pool`, `/labs/at-least-tier-platform-match`, and the combined `/labs/moral-public-goods/[poolSlug]` page.
- Existing labs UI: `src/app/labs/moral-public-goods/[poolSlug]/moral-public-goods-labs-client.tsx` already owns the simplified funding-rule selector and project detail drawer.
- Project detail drawers: the combined labs route has a `project_details` drawer; the recommendation section is added there and not near the primary funding-rule CTA.
- Review and challenge models: campaign review API uses `/api/mpgf/campaigns/[campaignId]/review`; challenges use `createMpgfPublicGoodsChallenge` and `/api/mpgf/challenges`. Serious concerns are routed toward that review/challenge pattern rather than a separate challenge architecture.
- Admin/reviewer permissions: existing non-MVP admin surfaces are read-only route-safe pages under `/admin/moral-public-goods/...`; this feature follows that pattern with `/admin/moral-public-goods/recommendations`.
- Moderation queues: existing reviewer-console and admin-console modules are typed contract surfaces rather than broad client-only state. This feature adds a typed moderation queue and fail-closed moderation API.
- User profile, trust, role, identity, and Sybil models: identity and Sybil controls live in `public-goods-identity-integrity.ts`, contribution-intent flows, and existing admin console rows. Recommendation trust tiers do not create public reputation power and do not feed those eligibility weights.
- Public/private serializer pattern: public API serializers seal or omit private fields. Recommendation serializers never expose `privateEvidenceRef`, recommender user IDs, donor-level viewpoint tags, pledge state, payment state, or anti-abuse thresholds.
- Feature flag registry style: existing non-MVP branches declare feature metadata and capability gates in typed modules. This feature uses `moral_public_goods_project_recommendations_non_mvp_v0_1`.
- Copy preflight pattern: refund-bonus and at-least-tier modules validate ordinary copy. This feature adds copy checks that block social-proof, moral-score, and threshold-counting language while allowing the required negative disclaimer.
- Audit/reporting system: existing MPGF reports are aggregate-only and hash-bearing. This feature adds an aggregate public report with source-type and conflict-disclosure breakdowns after privacy thresholds.
- Commands: tests run with `npm test`; lint with `npm run lint`; typecheck with `npx tsc --noEmit --pretty false --incremental false`; build with `npm run build`.

## Route And Components Added

- `src/lib/mpgf/public-goods-project-recommendations-non-mvp.ts`: feature metadata, capability gate, data model types, validation, public/private serializers, aggregate report, moderation queue, moderation events, private-evidence access logging, abuse flags, dev/test seed data, and non-effect helper.
- `src/lib/mpgf/public-goods-project-recommendations-non-mvp.test.ts`: tests for feature classification, gating, model validation, non-effects, UI placement, submission, moderation, privacy, copy, and abuse controls.
- `src/app/api/mpgf/project-recommendations/route.ts`: fail-closed labs submission endpoint. It validates source type, conflict disclosure, target status, copy, and capability before returning pending moderation metadata.
- `src/app/api/mpgf/project-recommendations/moderation/route.ts`: fail-closed moderation endpoint for reviewer/admin action simulation against dev/test seed rows.
- `src/app/admin/moral-public-goods/recommendations/page.tsx`: read-only reviewer queue for pending recommendations, concerns, source verification, conflict review, redaction, and escalation.
- Updated `src/app/labs/moral-public-goods/[poolSlug]/page.tsx`: evaluates the recommendation gate server-side and passes serialized public views into the labs client.
- Updated `src/app/labs/moral-public-goods/[poolSlug]/moral-public-goods-labs-client.tsx`: adds compact project-level aggregate lines, a project-drawer `Recommendations and concerns` section, and moderated `Recommend funding` / `Record a concern` forms.

## Feature Flags And Classification

- Feature key: `moral_public_goods_project_recommendations_non_mvp_v0_1`
- Public label: `Recommendations and concerns`
- Primary action label: `Recommend funding`
- Secondary action label: `Record a concern`
- Internal label: `Source-Backed Project Recommendations Non-MVP`
- Classification: `non_mvp`
- Deployment stage: `labs_research_non_mvp`
- Default enabled: false
- Production public enabled: false
- MVP surface enabled: false
- CGPP MVP pledge path enabled: false
- Requires admin or labs access by default.
- Requires an explicit promotion record before production public display.
- There is no live-money flag because this feature must not move money.

## Public And Private Display Rules

Public or aggregate display requires stance, source type, public summary, conflict disclosure, approved moderation state, reviewed and unblocked target, public or aggregate-only visibility, and copy preflight passing.

Low-trust submissions default to `aggregate_only` and `pending`. Individual low-trust display names are not serialized. Reviewer/admin summaries can be displayed only after approval and redaction.

The public serializer omits private evidence refs, recommender user IDs, donor-level viewpoint tags, pledge/payment state, anti-abuse details, private review details, and sensitive personal information.

## Moderation Rules

Recommendations and concerns are moderated before public display. Reviewer/admin actions include approve public, approve aggregate-only, request evidence, mark source verified, mark conflict nonblocking, mark conflict blocking, reject, redact, withdraw on user request, and escalate to project review/challenge.

Serious concerns can be escalated to the existing MPGF project review/challenge pattern. Rejected or redacted rows do not appear publicly.

Private evidence access is gated to reviewer/admin/service roles and produces an audit event hash.

## Source And Conflict Requirements

Every entry requires source type and conflict disclosure. Linked public sources require a source URL. Private evidence reviewed entries require reviewer-only evidence handling; the labs UI does not upload private evidence directly.

Conflict states are explicit: none disclosed, disclosed nonblocking, disclosed blocking, undisclosed review, and blocked. Blocking or unresolved conflicts prevent public display.

## Explicit Non-Effects

Recommendations and concerns have no effect on clearing, threshold, payment, refund-bonus, at-least-tier, allocation, or review-state logic.

They do not determine whether a project is reviewed, replace project review, count toward clearing thresholds, count toward verified supporter counts, count toward different-view clusters, affect refund-bonus eligibility, affect at-least-tier platform-match resolution, affect payment authorization/capture/routing, affect sponsor match, affect project allocation weights, create tax/legal claims, imply objective impact, imply moral ranking, imply donor-level public reputation power, expose donor-level viewpoint tags, expose private pledge/payment state, or expose private moral preferences.

## Production Gating Behavior

Production defaults hide public summaries and block public submissions unless the feature is explicitly enabled and promoted. Client-side hiding is not relied on: the server route, API handlers, serializers, admin actions, and report generation all evaluate the capability gate.

Development/labs can display dev/test seed aggregates for reviewed projects. Production seed generation returns no rows.

## Tests Added

Tests cover:

- feature classification and absence of a live-money flag;
- disabled-by-default production gating;
- absence from the Direct Capped CGPP MVP pledge path;
- source type, conflict disclosure, public summary, moderation, reviewed target, and blocked target validation;
- low-trust aggregate-only pending defaults;
- recommendation and concern public serializers;
- non-effects on threshold, supporters, different-view clusters, refund-bonus eligibility, at-least-tier support, allocation, payment, capture, settlement, audit money totals, sponsor match, and review state;
- submission and moderation flows;
- private evidence access logging;
- rejected/redacted public suppression;
- small-cell suppression and private data omission;
- abuse flags;
- prohibited copy and required disclaimer copy;
- labs UI placement and admin/API route wiring.
