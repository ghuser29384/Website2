# MoralTrade60 PR Evidence Package

Branch: `codex/hide-offset-compromise-field`

Compare URL: `https://github.com/ghuser29384/Website2/compare/main...codex/hide-offset-compromise-field?expand=1`

Local PR tooling note: `gh` is not installed in this environment, and no GitHub PR creation tool was exposed in the current connector tool list. This document is the PR-ready body and evidence package for item 15 of `moraltrade60.md`.

## Draft PR Title

Improve MoralTrade public-goods and marketplace release posture

## Draft PR Body

### Summary

This branch implements the next MoralTrade60 release slice for a trust-first marketplace:

- reviewer console extensions for conflict state, neutral reviewer assignment, and panel assignment gates
- payment authorization stubs that keep no-capture behavior explicit until real provider gates pass
- public marketplace tab separation for live offers, rounds, worked examples, and demo records
- reviewed seed templates for donation offsets and pledge swaps so the marketplace has safe starting points without fabricating live liquidity
- privacy-safe marketplace measurement events and aggregate KPI definitions
- route-baseline verification for the public routes listed in `moraltrade60.md`

### Migration Summary

- `supabase/migrations/20260607_agreement_reviewer_console_extensions.sql`
  - Adds reviewer conflict-of-interest state and neutral/panel assignment support for review-gated agreement workflows.
- `supabase/migrations/20260607_agreement_payment_authorization_stubs.sql`
  - Adds no-capture payment authorization records and state needed for controlled preview paths.
- `supabase/migrations/20260607_marketplace_measurement_events.sql`
  - Extends the `funnel_events` event-type constraint with marketplace tab, filter, seed-template, template-start, and performance metric events.

### Route Screenshots

- Offers marketplace tabs: `docs/moral-trade/pr-evidence/moraltrade60-offers.png`
- Measurement plan and marketplace KPI section: `docs/moral-trade/pr-evidence/moraltrade60-measurement.png`
- Moral Trade health contract JSON: `docs/moral-trade/pr-evidence/moraltrade60-health-json.png`

### Tests And Commands

```bash
node --import tsx --test src/lib/marketplace-measurement.test.ts src/lib/growth.test.ts src/lib/public-offers.test.ts src/lib/public-route-smoke.test.ts
npm run lint -- src/lib/marketplace-measurement.ts src/lib/marketplace-measurement.test.ts src/lib/growth.ts src/lib/growth.test.ts src/components/analytics/funnel-tracker.tsx src/lib/measurement-plan.ts src/app/measurement/page.tsx src/app/api/moral-trade/health/route.ts src/lib/public-route-smoke.test.ts scripts/check-public-route-baseline.mjs
git diff --check
npm run build
MORALTRADE_BASE_URL=http://127.0.0.1:3000 npm run measure:routes
```

Observed results:

- focused test bundle: `71` tests passed
- lint: passed
- whitespace check: passed
- production build: passed
- route baseline: passed `22` route/device checks

Build note: Next.js still reports the existing middleware-to-proxy deprecation warning.

Git note: local commit sometimes reports the existing broken-ref gc warning for `refs/heads/main 2`; commit and push still succeed.

### Validator Output

Marketplace measurement contract:

```json
{
  "blockers": [],
  "status": "pass",
  "validatorName": "marketplace-measurement",
  "validatorVersion": "marketplace-measurement-validator-v0.1"
}
```

Measurement plan validator summary:

```json
{
  "baselineCommandErrors": [],
  "duplicateEvents": [],
  "duplicateBaselineRoutes": [],
  "invalidBaselineBudgets": [],
  "invalidBaselineDevices": [],
  "invalidEvents": [],
  "missingBaselineChecks": [],
  "missingBaselineRoutes": [],
  "sensitiveMetadata": []
}
```

Public offers contract sample:

```json
{
  "validation": "pass",
  "blockers": [],
  "tab": "worked_examples",
  "liveOfferCount": 0,
  "workedExampleCount": 8,
  "reviewedSeedTemplateCount": 4
}
```

Route baseline summary:

```json
{
  "status": "pass",
  "resultCount": 22,
  "failedCount": 0,
  "budgets": {
    "maxDomContentLoadedMs": 10000,
    "maxLoadMs": 15000,
    "minBodyTextCharacters": 400,
    "maxScriptTags": 90
  }
}
```

### Privacy Review Notes

- Marketplace analytics record only approved event types and sanitized metadata.
- Query strings and hashes are not stored as route paths.
- Raw search text is converted to `queryPresent`, `queryLengthBucket`, and safe parameter-key metadata.
- Sensitive metadata keys such as raw wishes, source notes, private evidence, contact details, receipts, prompts, and counterparty-specific messages are rejected by the sanitizer or validator.
- Seed templates, worked examples, demo records, and rounds are explicitly excluded from live offer, completed-agreement, sponsor-leverage, and moral-trade volume metrics.
- Public KPI snapshots use small-cell suppression with a minimum public count of `3`.
- The health and measurement surfaces publish validator status and aggregate contract metadata, not private participant records.

### Remaining Blockers And Non-Claims

- There are still `0` live public offers and `0` completed agreements in the local public-offer sample; reviewed examples and seed templates are scaffolding, not evidence of real liquidity.
- Real-money capture and payout remain blocked until capped-real-money release gates, provider reconciliation, privileged-action controls, and reviewer approvals are complete.
- Donation offsets and pledge swaps remain preview/manual-review oriented unless later release gates explicitly promote them.
- `moraltrade60.md` includes broader long-tail requirements beyond this PR slice, including full release-gate requirement-result records, audit-integrity checkpoints, backup recovery policy, account-security policy, and production configuration provenance.
- Local `gh` is unavailable, so this package provides a PR-ready body and artifacts but does not prove that a GitHub PR object was created.
