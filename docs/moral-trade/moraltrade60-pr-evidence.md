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
- fail-closed release-gate contract, public route, and first-class policy-snapshot / requirement-result records for payable, reliance-bearing, and public-metric stages
- first-class participant-confirmation and consent-quality contracts/records for routing, clearing, capture, payout release, privacy disclosure, exposure increases, and material-term changes
- first-class participant-eligibility contract/records for identity verification, human-uniqueness/Sybil review, legal capacity, sanctions screening, payment-rail eligibility, jurisdictional eligibility, source authentication, and private artifact handling
- first-class account-security policy/event contract and typed records for high-risk participant actions, step-up, notice, cooldown, trusted-device, manual-review, and account-recovery blockers
- first-class reviewer-quality contract/records for review-type authorization, conflict checks, calibration, second review, audit sampling, stale/superseded decision blocking, and default-approval prohibition
- first-class anti-enumeration contract/records for frozen discovery policies, query fingerprints, bucketed counts, sparse suppression, timing-equalized responses, access-event logs, and repeated-probe audits
- fail-closed production-readiness contract and records for account security, backup recovery, deployment/config provenance, schema migration safety, environment isolation, financial reconciliation, audit integrity, and data-security/key-management controls
- first-class recipient-registry and payment-destination contract/records that prevent free-text names, copied donation links, wallet addresses, bank details, or fiscal-host notes from authorizing lock, capture, payout, reuse, or public money claims
- route-baseline verification for the public routes listed in `moraltrade60.md`

### Migration Summary

- `supabase/migrations/20260607_agreement_reviewer_console_extensions.sql`
  - Adds reviewer conflict-of-interest state and neutral/panel assignment support for review-gated agreement workflows.
- `supabase/migrations/20260607_agreement_payment_authorization_stubs.sql`
  - Adds no-capture payment authorization records and state needed for controlled preview paths.
- `supabase/migrations/20260607_marketplace_measurement_events.sql`
  - Extends the `funnel_events` event-type constraint with marketplace tab, filter, seed-template, template-start, and performance metric events.
- `supabase/migrations/20260607_moral_trade_release_gate_policy_snapshots.sql`
  - Adds first-class `moral_trade_policy_snapshots`, `moral_trade_state_interpretation_policies`, `moral_trade_release_gates`, `moral_trade_release_gate_requirement_results`, and `moral_trade_privileged_action_records` tables.
  - Keeps missing, stale, unknown, under-review, mutable, or unreviewed gate evidence fail-closed before payable, reliance-bearing, public-metric, manual-capture, manual-payout, private-grant, or emergency-unpause behavior.
- `supabase/migrations/20260607_zz_moral_trade_participant_confirmation_records.sql`
  - Adds first-class `moral_trade_participant_confirmation_records` and `moral_trade_consent_quality_records` tables.
  - Binds confirmations to frozen baseline, terms snapshot, policy snapshot bundle, maximum exposure, notice state, consent-quality state, eligible-set/fallback hashes where relevant, expiry, supersession, and exact confirmation scope.
- `supabase/migrations/20260607_zzzzz_moral_trade_participant_eligibility_records.sql`
  - Adds first-class `moral_trade_participant_eligibility_records`, `moral_trade_participant_eligibility_reviews`, and `moral_trade_identity_artifact_references` tables.
  - Requires reviewed identity, human-uniqueness/Sybil, legal-capacity, sanctions, payment-rail, jurisdiction, source-authentication, and raw-identity-artifact handling states before real-money, reliance-bearing, clearing, counted-support, public-support-metric, or release-promotion transitions.
  - Keeps raw identity artifacts hash-referenced and private; eligibility and Sybil signals cannot become public moral reputation or moral-worth scores.
- `supabase/migrations/20260607_zzz_moral_trade_production_readiness_records.sql`
  - Adds first-class records for account-security events, backup/restore checkpoints, deployment-release records, configuration snapshots/changes, schema-migration runs, environment-data-isolation records, financial-reconciliation runs, audit-integrity checkpoints, data-security policies, and key-version records.
  - Extends policy-snapshot subject support for account security, backup recovery, deployment release, configuration snapshot, schema migration, environment data isolation, financial reconciliation, audit integrity, and data security.
  - Keeps missing, stale, drifted, unverified, restore-failed, high-risk-account, variance-unresolved, invalid-hash, or mutable-policy operational evidence fail-closed before money movement, payout release, public money metrics, privacy disclosure, release-gate promotion, or non-emergency privileged changes.
- `supabase/migrations/20260607_zzzzzz_moral_trade_account_security_policy_events.sql`
  - Augments `moral_trade_account_security_policies` with typed policy version, high-risk action, step-up, trusted-device, cooldown, risk-signal, high-risk behavior, account-recovery behavior, reviewer-decision, and update fields.
  - Augments `moral_trade_account_security_events` with participant hash, policy reference, risk state, action subject, notice reference, trusted-device status, reviewer-decision reference, expanded event taxonomy, and subject/risk indexes.
  - Keeps browser-session-only trust, stale events, high-risk events, unresolved account recovery, missing step-up, missing notice, active cooldown, and missing manual review fail-closed before high-risk participant actions.
- `supabase/migrations/20260607_zzzzzzz_moral_trade_reviewer_quality_records.sql`
  - Adds first-class `moral_trade_reviewer_quality_policies` and `moral_trade_review_quality_audits` tables, and augments `moral_trade_review_decisions` with reviewer identity hashes, role, conflict state, neutral panel reference, reviewer-quality policy reference, audit references, and quality timestamps.
  - Extends policy-snapshot subject support for `reviewer_quality`.
  - Keeps missing, mutable, stale, superseded, conflicted, out-of-scope, suspended, calibration-failed, missing-second-review, audit-failed, default-approved, speed-overridden, or invalid-hash reviewer decisions fail-closed before clearing, release-gate approval, recipient verification, privacy grants, evidence acceptance, impact claims, appeals, incident closure, payout release, or blocker overrides.
- `supabase/migrations/20260607_zzzzzzzz_moral_trade_anti_enumeration_records.sql`
  - Adds first-class `moral_trade_anti_enumeration_policies`, `moral_trade_discovery_access_events`, and `moral_trade_discovery_probe_audits` tables.
  - Extends policy-snapshot subject support for `anti_enumeration`.
  - Keeps missing, mutable, stale, superseded, raw-query-logging, exact-count, sparse-suppression, timing-equalization, rate-limit, repeated-probe, missing-audit, failed-audit, missing-escalation, or invalid-hash discovery evidence fail-closed before search, browse, preview, invite-link, match-candidate, or transparency surfaces can reveal sensitive slices.
- `supabase/migrations/20260607_zzzz_moral_trade_recipient_destination_records.sql`
  - Adds first-class `moral_trade_recipient_registry_entries`, `moral_trade_payment_destinations`, and `moral_trade_recipient_destination_reviews` tables.
  - Requires immutable recipient/destination policy snapshots, privileged-action approval, hash-backed evidence, anti-impersonation review, jurisdiction review, prohibited-use review, payment-rail review, authority review, and source-authentication review before verified records can support money movement.
  - Keeps missing, under-review, failed, stale, impersonation-risk, jurisdiction-blocked, prohibited-use-blocked, superseded, expired, mutable-policy, invalid-hash, or unapproved-dual-control records fail-closed before matched-trade lock, capture, payout release, recipient reuse, public money metrics, or release-gate promotion.

### Route Screenshots

- Offers marketplace tabs: `docs/moral-trade/pr-evidence/moraltrade60-offers.png`
- Measurement plan and marketplace KPI section: `docs/moral-trade/pr-evidence/moraltrade60-measurement.png`
- Moral Trade health contract JSON: `docs/moral-trade/pr-evidence/moraltrade60-health-json.png`

### Tests And Commands

```bash
node --import tsx --test src/lib/marketplace-measurement.test.ts src/lib/growth.test.ts src/lib/public-offers.test.ts src/lib/public-route-smoke.test.ts
node --import tsx --test src/lib/moral-trade/release-gates.test.ts src/lib/moral-trade/api-contract.test.ts src/lib/public-route-smoke.test.ts
node --import tsx --test src/lib/moral-trade/participant-confirmations.test.ts src/lib/moral-trade/release-gates.test.ts src/lib/moral-trade/api-contract.test.ts src/lib/public-route-smoke.test.ts
node --import tsx --test src/lib/moral-trade/participant-eligibility.test.ts src/lib/moral-trade/participant-confirmations.test.ts src/lib/moral-trade/release-gates.test.ts src/lib/moral-trade/api-contract.test.ts src/lib/public-route-smoke.test.ts
node --import tsx --test src/lib/moral-trade/account-security.test.ts src/lib/moral-trade/participant-eligibility.test.ts src/lib/moral-trade/recipient-destination.test.ts src/lib/moral-trade/production-readiness.test.ts src/lib/moral-trade/participant-confirmations.test.ts src/lib/moral-trade/release-gates.test.ts src/lib/moral-trade/api-contract.test.ts src/lib/public-route-smoke.test.ts
node --import tsx --test src/lib/moral-trade/production-readiness.test.ts src/lib/moral-trade/participant-confirmations.test.ts src/lib/moral-trade/release-gates.test.ts src/lib/moral-trade/api-contract.test.ts src/lib/public-route-smoke.test.ts
node --import tsx --test src/lib/moral-trade/recipient-destination.test.ts src/lib/moral-trade/production-readiness.test.ts src/lib/moral-trade/participant-confirmations.test.ts src/lib/moral-trade/release-gates.test.ts src/lib/moral-trade/api-contract.test.ts src/lib/public-route-smoke.test.ts
node --import tsx --test src/lib/moral-trade/reviewer-quality.test.ts src/lib/moral-trade/account-security.test.ts src/lib/moral-trade/participant-eligibility.test.ts src/lib/moral-trade/recipient-destination.test.ts src/lib/moral-trade/production-readiness.test.ts src/lib/moral-trade/participant-confirmations.test.ts src/lib/moral-trade/release-gates.test.ts src/lib/moral-trade/api-contract.test.ts src/lib/public-route-smoke.test.ts
node --import tsx --test src/lib/moral-trade/anti-enumeration.test.ts src/lib/moral-trade/reviewer-quality.test.ts src/lib/moral-trade/account-security.test.ts src/lib/moral-trade/participant-eligibility.test.ts src/lib/moral-trade/recipient-destination.test.ts src/lib/moral-trade/production-readiness.test.ts src/lib/moral-trade/participant-confirmations.test.ts src/lib/moral-trade/release-gates.test.ts src/lib/moral-trade/api-contract.test.ts src/lib/public-route-smoke.test.ts
npm run lint -- src/lib/marketplace-measurement.ts src/lib/marketplace-measurement.test.ts src/lib/growth.ts src/lib/growth.test.ts src/components/analytics/funnel-tracker.tsx src/lib/measurement-plan.ts src/app/measurement/page.tsx src/app/api/moral-trade/health/route.ts src/lib/public-route-smoke.test.ts scripts/check-public-route-baseline.mjs
npm run lint -- src/lib/moral-trade/release-gates.ts src/lib/moral-trade/release-gates.test.ts src/app/api/moral-trade/release-gates/contract/route.ts src/app/api/moral-trade/health/route.ts src/app/moral-trade/technical-spec/page.tsx src/lib/moral-trade/api-contract.ts src/lib/moral-trade/api-contract.test.ts src/lib/public-route-smoke.test.ts src/lib/supabase/database.types.ts
npm run lint -- src/lib/moral-trade/participant-confirmations.ts src/lib/moral-trade/participant-confirmations.test.ts src/app/api/moral-trade/participant-confirmations/contract/route.ts src/app/api/moral-trade/health/route.ts src/app/moral-trade/technical-spec/page.tsx src/lib/moral-trade/api-contract.ts src/lib/moral-trade/api-contract.test.ts src/lib/public-route-smoke.test.ts src/lib/supabase/database.types.ts
npm run lint -- src/lib/moral-trade/participant-eligibility.ts src/lib/moral-trade/participant-eligibility.test.ts src/app/api/moral-trade/participant-eligibility/contract/route.ts src/app/api/moral-trade/health/route.ts src/app/moral-trade/technical-spec/page.tsx src/lib/moral-trade/api-contract.ts src/lib/moral-trade/api-contract.test.ts src/lib/public-route-smoke.test.ts src/lib/supabase/database.types.ts
npm run lint -- src/lib/moral-trade/account-security.ts src/lib/moral-trade/account-security.test.ts src/app/api/moral-trade/account-security/contract/route.ts src/app/api/moral-trade/health/route.ts src/app/moral-trade/technical-spec/page.tsx src/lib/moral-trade/api-contract.ts src/lib/moral-trade/api-contract.test.ts src/lib/public-route-smoke.test.ts src/lib/supabase/database.types.ts
npm run lint -- src/lib/moral-trade/production-readiness.ts src/lib/moral-trade/production-readiness.test.ts src/app/api/moral-trade/production-readiness/contract/route.ts src/app/api/moral-trade/health/route.ts src/app/moral-trade/technical-spec/page.tsx src/lib/moral-trade/api-contract.ts src/lib/moral-trade/api-contract.test.ts src/lib/public-route-smoke.test.ts src/lib/supabase/database.types.ts
npm run lint -- src/lib/moral-trade/recipient-destination.ts src/lib/moral-trade/recipient-destination.test.ts src/app/api/moral-trade/recipient-destinations/contract/route.ts src/app/api/moral-trade/health/route.ts src/app/moral-trade/technical-spec/page.tsx src/lib/moral-trade/api-contract.ts src/lib/moral-trade/api-contract.test.ts src/lib/public-route-smoke.test.ts src/lib/supabase/database.types.ts
npm run lint -- src/lib/moral-trade/reviewer-quality.ts src/lib/moral-trade/reviewer-quality.test.ts src/app/api/moral-trade/reviewer-quality/contract/route.ts src/app/api/moral-trade/health/route.ts src/app/moral-trade/technical-spec/page.tsx src/lib/moral-trade/api-contract.ts src/lib/moral-trade/api-contract.test.ts src/lib/public-route-smoke.test.ts src/lib/supabase/database.types.ts
npm run lint -- src/lib/moral-trade/anti-enumeration.ts src/lib/moral-trade/anti-enumeration.test.ts src/app/api/moral-trade/anti-enumeration/contract/route.ts src/app/api/moral-trade/health/route.ts src/app/moral-trade/technical-spec/page.tsx src/lib/moral-trade/api-contract.ts src/lib/moral-trade/api-contract.test.ts src/lib/public-route-smoke.test.ts src/lib/supabase/database.types.ts
git diff --check
npm run build
MORALTRADE_BASE_URL=http://127.0.0.1:3000 npm run measure:routes
```

Observed results:

- focused test bundle: `71` tests passed
- release-gate/API/source-smoke bundle: `60` tests passed
- participant-confirmation/release-gate/API/source-smoke bundle: `67` tests passed
- participant-eligibility/recipient-destination/production-readiness/participant-confirmation/release-gate/API/source-smoke bundle: `82` tests passed
- account-security/participant-eligibility/recipient-destination/production-readiness/participant-confirmation/release-gate/API/source-smoke bundle: `89` tests passed
- production-readiness/participant-confirmation/release-gate/API/source-smoke bundle: `72` tests passed
- recipient-destination/production-readiness/participant-confirmation/release-gate/API/source-smoke bundle: `77` tests passed
- reviewer-quality/account-security/participant-eligibility/recipient-destination/production-readiness/participant-confirmation/release-gate/API/source-smoke bundle: `95` tests passed
- anti-enumeration/reviewer-quality/account-security/participant-eligibility/recipient-destination/production-readiness/participant-confirmation/release-gate/API/source-smoke bundle: `101` tests passed
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

Release-gate contract sample:

```json
{
  "status": "pass",
  "validatorName": "moral-trade-release-gate-contract",
  "validatorVersion": "moral-trade-release-gate-validator-v0.1",
  "sampleEvaluations": {
    "public_goods_preview": "pass",
    "donation_offset_payable": "blocked"
  }
}
```

Participant-confirmation contract sample:

```json
{
  "status": "pass",
  "validatorName": "moral-trade-participant-confirmation-contract",
  "validatorVersion": "moral-trade-participant-confirmation-validator-v0.1",
  "sampleEvaluations": {
    "final_lock": "pass",
    "payment_capture": "blocked"
  }
}
```

Participant-eligibility contract sample:

```json
{
  "status": "pass",
  "validatorName": "moral-trade-participant-eligibility-contract",
  "validatorVersion": "moral-trade-participant-eligibility-validator-v0.1",
  "sampleEvaluations": {
    "non_money_preview": "pass",
    "payment_capture": "pass",
    "matching_clearing": "blocked"
  }
}
```

Account-security contract sample:

```json
{
  "status": "pass",
  "validatorName": "moral-trade-account-security-contract",
  "validatorVersion": "moral-trade-account-security-validator-v0.1",
  "sampleEvaluations": {
    "participant_confirmation": "pass",
    "payment_capture": "blocked",
    "privacy_grant": "pass"
  }
}
```

Production-readiness contract sample:

```json
{
  "status": "pass",
  "validatorName": "moral-trade-production-readiness-contract",
  "validatorVersion": "moral-trade-production-readiness-validator-v0.1",
  "sampleEvaluations": {
    "sandbox_calculation_preview": "pass",
    "payout_release": "blocked"
  }
}
```

Recipient/destination contract sample:

```json
{
  "status": "pass",
  "validatorName": "moral-trade-recipient-destination-contract",
  "validatorVersion": "moral-trade-recipient-destination-validator-v0.1",
  "sampleEvaluations": {
    "non_money_preview": "pass",
    "payment_capture": "pass",
    "payout_release": "blocked"
  }
}
```

Reviewer-quality contract sample:

```json
{
  "status": "pass",
  "validatorName": "moral-trade-reviewer-quality-contract",
  "validatorVersion": "moral-trade-reviewer-quality-validator-v0.1",
  "sampleEvaluations": {
    "release_gate_approval": "pass",
    "evidence_acceptance": "blocked",
    "payout_release": "blocked"
  }
}
```

Anti-enumeration contract sample:

```json
{
  "status": "pass",
  "validatorName": "moral-trade-anti-enumeration-contract",
  "validatorVersion": "moral-trade-anti-enumeration-validator-v0.1",
  "sampleEvaluations": {
    "public_search": "pass",
    "invite_link_creation": "blocked"
  }
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
- The release-gate route publishes static stage, requirement, policy-snapshot, and privileged-action contract metadata; it does not expose private gate records, participant confirmations, payment records, or reviewer notes.
- The participant-confirmation route publishes static subject/scope/status/hash-field contract metadata; it does not expose private participant confirmation rows, notice records, baselines, payment records, or reviewer notes.
- The participant-eligibility route publishes static transition/dimension/table/status contract metadata; it does not expose raw identity artifacts, linkage signals, provider identity payloads, sanctions payloads, reviewer notes, or moral-worth/reputation scores.
- The account-security route publishes static action/event/table/status contract metadata; it does not expose device fingerprints, session anomalies, account-recovery details, provider security payloads, raw risk signals, or contact-introduction security evidence.
- The reviewer-quality route publishes static review-type/table/status/sample-status contract metadata; it does not expose reviewer identities, private reviewer notes, conflict facts, calibration details, audit evidence, or participant-specific subject records.
- The anti-enumeration route publishes static surface/table/status/bucket/sample-status contract metadata; it does not expose raw query text, exact hidden counts, private wishes, rare clusters, exact constraints, contact details, reviewer notes, or participant-specific discovery records.
- The production-readiness route publishes static control/gate/table/status contract metadata; it does not expose account-security event details, backup contents, configuration values, provider payloads, reconciliation line items, audit rows, private access logs, or key material.
- The health, measurement, release-gate, participant-confirmation, participant-eligibility, account-security, reviewer-quality, anti-enumeration, and production-readiness surfaces publish validator status and aggregate contract metadata, not private participant records, participant-specific discovery records, or private operational evidence.

### Remaining Blockers And Non-Claims

- There are still `0` live public offers and `0` completed agreements in the local public-offer sample; reviewed examples and seed templates are scaffolding, not evidence of real liquidity.
- Real-money capture and payout remain blocked until capped-real-money release gates, live provider reconciliation runs, privileged-action approvals, current backup/restore checkpoints, deployment/configuration snapshots, audit-integrity checkpoints, and reviewer approvals are complete.
- Donation offsets and pledge swaps remain preview/manual-review oriented unless later release gates explicitly promote them.
- `moraltrade60.md` includes broader long-tail requirements beyond this PR slice, including live operational execution for the new production-readiness, participant-eligibility, account-security, reviewer-quality, anti-enumeration, and recipient/destination records, matching-clearing run reproducibility, privacy-grant/access-log enforcement, impact-claim review, live endpoint enforcement for anti-enumeration logs/probe audits, reviewer audit sampling execution, appeal records, and full donation-offset/pledge-swap clearing previews.
- Local `gh` is unavailable, so this package provides a PR-ready body and artifacts but does not prove that a GitHub PR object was created.
