# Background Networking Bg14 Rollout

This note covers the bg14 source-summary, wish-interview, and opportunity-brief lanes. These lanes keep the existing Moral Trade privacy contract: broad previews first, field-level grants for exact detail, no autonomous outreach, no raw private-feed ingestion, shadow-first AI promotion, and operator review before introduced-stage contact disclosure.

## Feature Flags

- `BACKGROUND_SOURCE_SUMMARY_ENABLED` controls consented source-summary enrichment, source-summary approval, and deterministic profile-signal promotion.
- `BACKGROUND_WISH_INTERVIEW_ENABLED` controls the structured wish-interview assistant and saved interview-answer lane.
- `BACKGROUND_OPPORTUNITY_BRIEFS_ENABLED` controls opportunity briefs, opportunity feedback, reviewed intro requests, appeals, and contact-approval workflow metadata.

All three flags default to `false`. The route files remain present so contract and smoke tests can verify privacy boundaries, but deployment should enable only the lanes selected for the current cohort.

## Deployment Sequence

1. `internal`: staff and operator test profiles only.
2. `tiny_cohort`: a tiny consenting cohort with manual operator review of source summaries, opportunity feedback, intro requests, and appeals.
3. `pilot_pack`: a bundled partner/cohort pilot after route-backed API contract evidence and operator-review metrics remain clean.
4. `public_beta`: broaden only after zero unresolved privacy incidents, documented rollback rehearsal, and review of disclosure/appeal metrics.

Set `BACKGROUND_NETWORKING_ROLLOUT_STAGE` to the current stage. The stage is surfaced in the dashboard and the existing `/api/moral-trade/background-capability-gates/contract` response.

## Rollback

Rollback is per lane:

- Set the affected `BACKGROUND_*_ENABLED` flag to `false`.
- Pause new background opportunity and source-promotion jobs while reviewing incident scope.
- Keep route handlers `private, no-store` and return safe status metadata rather than raw detail.
- Use source revocation, grant expiry, and intro-packet review states to stop further disclosure.
- Review `match_audit_events`, `risk_signals`, source-summary receipts, and intro-packet rows before re-enabling.

Disabling a flag must not delete user records. Existing source summaries, interview answers, privacy grants, and intro packets stay subject to their retention, revocation, expiry, and operator-review controls.
