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
- first-class privacy-governance contract/records for revocable privacy grants, purpose- and role-limited access logs, disclosure reviews, redaction controls, and fail-closed private-data access
- first-class impact-claim contract/records for frozen methodology policies, claim-typed evidence, uncertainty disclosure, transfer-vs-impact separation, content moderation, reviewer quality, privileged publication approval, audit integrity, and public-metric suppression
- first-class matching-clearing contract/records for deterministic frozen runs, input-bundle hashes, reproducibility checks, matched-trade lock proposals, final confirmation state, ratio bounds, baseline snapshots, destination verification, commitment reservation, and atomic settlement blockers
- first-class baseline-integrity/manufacturing contract/records for non-blocking baseline assessments before donation offsets, pledge swaps, broad match candidates, public-goods rounds, and post-lock amendments become clearable, reliance-bearing, payable, or publicly counted
- first-class agreement-amendment contract/records for append-only post-lock amendments, before/after terms hashes, renewed confirmations, non-retroactivity checks, neutral review, notice, reviewer quality, and baseline integrity before material locked donation-offset or pledge-swap changes
- first-class appeal-case contract/records for bounded adverse-decision correction paths, notice, deadlines, neutral review, evidence scope, non-retaliation, redaction, and safety/settled-obligation non-waiver controls
- privacy-safe user-facing blocker explanations for review states, including plain-language reason categories, next actions, money effects, obligation effects, and bounded appeal/correction paths without raw reviewer signals
- fail-closed production-readiness contract and records for account security, backup recovery, deployment/config provenance, schema migration safety, environment isolation, financial reconciliation, audit integrity, and data-security/key-management controls
- first-class recipient-registry and payment-destination contract/records that prevent free-text names, copied donation links, wallet addresses, bank details, or fiscal-host notes from authorizing lock, capture, payout, reuse, or public money claims
- first-class side-agreement disclosure contract/records for off-platform compensation, reciprocal favors, reporting suppression, threats, collusion, externalities, authority claims, privacy/confidentiality, fraud, anti-corruption, and participant-autonomy review before reliance-bearing transitions
- first-class trade-classification contract/records for compensated moral-action classification, ordinary-service/procurement exclusion, frozen compensation terms, non-blocking review dimensions, metric eligibility, and no public moral-status badge claims
- first-class protective-assessment contract/records for negative commitments, action reversibility, donor/tax treatment, third-party obligations, representative authority, reporting integrity, civil rights, participant autonomy, confidentiality, evidence authenticity, financial crime, non-transferability, regulated goods, cyber abuse, anti-corruption, least-intrusive evidence, and neutral-review performance-bond controls before lock, payment, payout, public completion, or release promotion
- first-class user-safety/content-moderation contract/records for contact consent, invite-link rate limits, block/decline/withdrawal handling, abuse-report resolution, retaliation prevention, prohibited-use moderation, and viewpoint-neutral content handling before public, reviewer-actionable, reliance-bearing, payable, contact-enabling, profile-amplifying, or release-gate transitions
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
- `supabase/migrations/20260607_zzzzzzzzz_moral_trade_privacy_governance_records.sql`
  - Adds first-class `moral_trade_privacy_grant_policies`, `moral_trade_privacy_access_logs`, and `moral_trade_privacy_disclosure_reviews` tables, and augments `privacy_grants` with policy reference, purpose code, grant hash, revocation, and supersession fields.
  - Extends policy-snapshot subject support for `privacy_disclosure`.
  - Keeps missing, revoked, expired, stale, scope-mismatched, purpose-missing, access-log-missing, role-limit-missing, raw-private-artifact, data-security, confidentiality, reviewer-quality, account-security, participant-confirmation, external-authority, or invalid-hash privacy evidence fail-closed before reviewer access, counterparty preview, contact introduction, evidence review, profile export, or redacted public publication.
- `supabase/migrations/20260607_zzzzzzzzzz_moral_trade_impact_claim_records.sql`
  - Adds first-class `moral_trade_impact_claim_methodology_policies` and `moral_trade_impact_claim_records` tables.
  - Extends policy-snapshot subject support for `impact_claim_methodology`.
  - Keeps missing, mutable, stale, or superseded methodology policies, missing claim records, unreviewed/under-review/failed/stale/superseded claims, missing methodology references, missing claim-typed evidence, missing uncertainty disclosure, missing transfer-vs-impact labels, transfer metrics used as impact, payment evidence used as impact, unresolved moderation/reviewer/privileged-action/audit/public-metric controls, public private evidence, and invalid hashes fail-closed before public impact, outcome, cost-effectiveness, moral-value, or transfer-as-impact publication.
- `supabase/migrations/20260607_zzzzzzzzzzz_moral_trade_matching_clearing_records.sql`
  - Adds first-class `moral_trade_matching_clearing_runs`, `moral_trade_matched_trade_lock_proposals`, and `moral_trade_matching_clearing_reproducibility_checks` tables.
  - Extends policy-snapshot subject support for `matching_clearing` and `matched_trade_lock`.
  - Keeps missing, ad hoc, database-order, hidden-reasoning, unreproducible, stale, superseded, unreviewed, private-data-public, missing-lock-proposal, stale-confirmation, ratio-bound, baseline, destination, reservation, atomic-settlement, fallback-term, evidence-standard, and invalid-hash evidence fail-closed before payable or reliance-bearing clearing.
- `supabase/migrations/20260607_zzzzzzzzzzzz_moral_trade_baseline_integrity_records.sql`
  - Adds first-class `moral_trade_baseline_integrity_policies` and `moral_trade_baseline_integrity_assessments` tables.
  - Extends policy-snapshot subject support for `baseline_integrity` and `baseline_manufacturing`.
  - Keeps missing, stale, under-review, blocked, superseded, non-clearable, marketplace-created, marketplace-escalated, counterparty-triggered, harmful-escalated, good-faith/confidence-conflated, additionality, externality, reviewer-quality, participant-confirmation, private-evidence, and invalid-hash baseline evidence fail-closed before clearable or reliance-bearing launch.
- `supabase/migrations/20260607_zzzzzzzzzzzzz_moral_trade_agreement_amendment_records.sql`
  - Adds first-class `moral_trade_agreement_amendment_policies` and `moral_trade_agreement_amendment_records` tables.
  - Extends policy-snapshot subject support for `agreement_amendment`.
  - Keeps parent-record edits, retroactive performance changes, evidence-claim retyping, exposure increases, fund redirects, compensation changes, narrowed cancellation rights, privacy changes, donor-of-record changes, third-party-obligation changes, missing renewed confirmations, missing neutral review, missing notice, missing reviewer-quality or baseline-integrity checks, missing before/after hashes, and invalid hashes fail-closed before material post-lock changes.
- `supabase/migrations/20260607_zzzzzzzzzzzzzz_moral_trade_appeal_case_records.sql`
  - Adds first-class `moral_trade_appeal_policies` and `moral_trade_appeal_cases` tables.
  - Extends policy-snapshot subject support for `appeal_case`.
  - Keeps missing, stale, superseded, unnotified, deadline-missing, deadline-expired, neutral-review-missing, scope-missing, unredacted, non-retaliation-missing, safety-waiver-attempted, settled-obligation-reopen-attempted, evidence-scope-missing, or invalid-hash appeal cases fail-closed before adverse-decision correction paths can be relied on.
- `supabase/migrations/20260607_zzzz_moral_trade_recipient_destination_records.sql`
  - Adds first-class `moral_trade_recipient_registry_entries`, `moral_trade_payment_destinations`, and `moral_trade_recipient_destination_reviews` tables.
  - Requires immutable recipient/destination policy snapshots, privileged-action approval, hash-backed evidence, anti-impersonation review, jurisdiction review, prohibited-use review, payment-rail review, authority review, and source-authentication review before verified records can support money movement.
  - Keeps missing, under-review, failed, stale, impersonation-risk, jurisdiction-blocked, prohibited-use-blocked, superseded, expired, mutable-policy, invalid-hash, or unapproved-dual-control records fail-closed before matched-trade lock, capture, payout release, recipient reuse, public money metrics, or release-gate promotion.
- `supabase/migrations/20260608_moral_trade_side_agreement_disclosures.sql`
  - Adds first-class `moral_trade_side_agreement_disclosures` and `moral_trade_side_agreement_reviews` tables.
  - Extends policy-snapshot subject support for `side_agreement_disclosure` and `side_agreement_review`.
  - Keeps missing, undisclosed, under-review, stale, superseded, unredacted, unnotified, invalid-hash, mutable-policy, collusion, externality, legal, anti-threat, reporting-integrity, civil-rights, participant-autonomy, privacy/confidentiality, financial-crime/fraud, anti-corruption, or representative-authority review evidence fail-closed before lock, payment capture, payout release, public completion claims, challenge decisions, or release-gate promotion.
- `supabase/migrations/20260608_moral_trade_trade_classification_records.sql`
  - Adds first-class `moral_trade_trade_classification_records`, `moral_trade_compensated_action_terms`, and `moral_trade_ordinary_service_procurement_reviews` tables.
  - Extends policy-snapshot subject support for `trade_classification`, `compensated_moral_action`, and `ordinary_service_procurement`.
  - Keeps missing, draft, blocked, stale, superseded, public-badge-exposed, invalid-hash, mutable-policy, unfrozen-compensation-term, missing-payer-moral-reason, unsupported-performer-counterfactual, ordinary-service-blocking, under-review, failed-review, or metric-inclusion evidence fail-closed before moral-trade lock, payment capture, payout release, public metric publication, or release-gate promotion.
- `supabase/migrations/20260608_moral_trade_protective_assessments.sql`
  - Adds first-class `moral_trade_protective_assessment_records`, `moral_trade_negative_commitment_scopes`, `moral_trade_action_reversibility_assessments`, `moral_trade_donor_of_record_tax_reviews`, and `moral_trade_authority_obligation_assessments` tables.
  - Extends policy-snapshot subject support for protective assessments, negative-commitment scope, action-reversibility, donor-of-record/tax receipt, third-party obligation, representative authority, reporting-integrity, civil-rights/discrimination, autonomy, confidentiality/privacy, evidence-authenticity, financial-crime/fraud, transferability, regulated-goods, cyber-abuse, anti-corruption, least-intrusive evidence, and performance-bond neutral review.
  - Keeps missing, required, under-review, blocked, stale, superseded, mutable-policy, invalid-hash, invasive-evidence, conflicted/counterparty-benefiting neutral review, out-of-scope reviewer quality, failed notice, or missing appeal evidence fail-closed before lock, payment capture, payout release, public completion, or release-gate promotion.
- `supabase/migrations/20260608_moral_trade_user_safety_content_moderation.sql`
  - Adds first-class `moral_trade_user_safety_policies`, `moral_trade_contact_interaction_records`, `moral_trade_abuse_report_records`, `moral_trade_content_moderation_policies`, and `moral_trade_content_moderation_records` tables.
  - Extends policy-snapshot subject support for user-safety, contact-interaction, abuse-report, content-moderation, and prohibited-use policy snapshots.
  - Keeps missing, under-review, blocked, stale, superseded, mutable-policy, invalid-hash, unconsented contact, rate-limit violations, ignored blocks/declines/withdrawals, unresolved serious abuse reports, retaliation risk, prohibited-use content, and viewpoint-ranking/unpopular-view blocking fail-closed before public display, reviewer actionability, reliance-bearing previews, payment capture, contact introductions, profile amplification, or release-gate promotion.

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
node --import tsx --test src/lib/moral-trade/privacy-governance.test.ts src/lib/moral-trade/anti-enumeration.test.ts src/lib/moral-trade/reviewer-quality.test.ts src/lib/moral-trade/account-security.test.ts src/lib/moral-trade/participant-eligibility.test.ts src/lib/moral-trade/recipient-destination.test.ts src/lib/moral-trade/production-readiness.test.ts src/lib/moral-trade/participant-confirmations.test.ts src/lib/moral-trade/release-gates.test.ts src/lib/moral-trade/api-contract.test.ts src/lib/public-route-smoke.test.ts
node --import tsx --test src/lib/moral-trade/impact-claims.test.ts src/lib/moral-trade/privacy-governance.test.ts src/lib/moral-trade/anti-enumeration.test.ts src/lib/moral-trade/reviewer-quality.test.ts src/lib/moral-trade/account-security.test.ts src/lib/moral-trade/participant-eligibility.test.ts src/lib/moral-trade/recipient-destination.test.ts src/lib/moral-trade/production-readiness.test.ts src/lib/moral-trade/participant-confirmations.test.ts src/lib/moral-trade/release-gates.test.ts src/lib/moral-trade/api-contract.test.ts src/lib/public-route-smoke.test.ts
node --import tsx --test src/lib/moral-trade/matching-clearing.test.ts src/lib/moral-trade/impact-claims.test.ts src/lib/moral-trade/privacy-governance.test.ts src/lib/moral-trade/anti-enumeration.test.ts src/lib/moral-trade/reviewer-quality.test.ts src/lib/moral-trade/account-security.test.ts src/lib/moral-trade/participant-eligibility.test.ts src/lib/moral-trade/recipient-destination.test.ts src/lib/moral-trade/production-readiness.test.ts src/lib/moral-trade/participant-confirmations.test.ts src/lib/moral-trade/release-gates.test.ts src/lib/moral-trade/api-contract.test.ts src/lib/public-route-smoke.test.ts
node --import tsx --test src/lib/moral-trade/baseline-integrity.test.ts src/lib/moral-trade/matching-clearing.test.ts src/lib/moral-trade/impact-claims.test.ts src/lib/moral-trade/privacy-governance.test.ts src/lib/moral-trade/anti-enumeration.test.ts src/lib/moral-trade/reviewer-quality.test.ts src/lib/moral-trade/account-security.test.ts src/lib/moral-trade/participant-eligibility.test.ts src/lib/moral-trade/recipient-destination.test.ts src/lib/moral-trade/production-readiness.test.ts src/lib/moral-trade/participant-confirmations.test.ts src/lib/moral-trade/release-gates.test.ts src/lib/moral-trade/api-contract.test.ts src/lib/public-route-smoke.test.ts
node --import tsx --test src/lib/moral-trade/agreement-amendments.test.ts
node --import tsx --test src/lib/moral-trade/agreement-amendments.test.ts src/lib/moral-trade/api-contract.test.ts src/lib/public-route-smoke.test.ts
node --import tsx --test src/lib/moral-trade/agreement-amendments.test.ts src/lib/moral-trade/baseline-integrity.test.ts src/lib/moral-trade/matching-clearing.test.ts src/lib/moral-trade/impact-claims.test.ts src/lib/moral-trade/privacy-governance.test.ts src/lib/moral-trade/anti-enumeration.test.ts src/lib/moral-trade/reviewer-quality.test.ts src/lib/moral-trade/account-security.test.ts src/lib/moral-trade/participant-eligibility.test.ts src/lib/moral-trade/recipient-destination.test.ts src/lib/moral-trade/production-readiness.test.ts src/lib/moral-trade/participant-confirmations.test.ts src/lib/moral-trade/release-gates.test.ts src/lib/moral-trade/api-contract.test.ts src/lib/public-route-smoke.test.ts
node --import tsx --test src/lib/moral-trade/challenge-appeal.test.ts
node --import tsx --test src/lib/moral-trade/challenge-appeal.test.ts src/lib/moral-trade/api-contract.test.ts src/lib/public-route-smoke.test.ts
node --import tsx --test src/lib/moral-trade/challenge-appeal.test.ts src/lib/moral-trade/agreement-amendments.test.ts src/lib/moral-trade/baseline-integrity.test.ts src/lib/moral-trade/matching-clearing.test.ts src/lib/moral-trade/impact-claims.test.ts src/lib/moral-trade/privacy-governance.test.ts src/lib/moral-trade/anti-enumeration.test.ts src/lib/moral-trade/reviewer-quality.test.ts src/lib/moral-trade/account-security.test.ts src/lib/moral-trade/participant-eligibility.test.ts src/lib/moral-trade/recipient-destination.test.ts src/lib/moral-trade/production-readiness.test.ts src/lib/moral-trade/participant-confirmations.test.ts src/lib/moral-trade/release-gates.test.ts src/lib/moral-trade/api-contract.test.ts src/lib/public-route-smoke.test.ts
node --import tsx --test src/lib/proposal-review.test.ts
node --import tsx --test src/lib/proposal-review.test.ts src/lib/moral-trade/api-contract.test.ts src/lib/public-route-smoke.test.ts
node --import tsx --test src/lib/proposal-review.test.ts src/lib/moral-trade/challenge-appeal.test.ts src/lib/moral-trade/agreement-amendments.test.ts src/lib/moral-trade/baseline-integrity.test.ts src/lib/moral-trade/matching-clearing.test.ts src/lib/moral-trade/impact-claims.test.ts src/lib/moral-trade/privacy-governance.test.ts src/lib/moral-trade/anti-enumeration.test.ts src/lib/moral-trade/reviewer-quality.test.ts src/lib/moral-trade/account-security.test.ts src/lib/moral-trade/participant-eligibility.test.ts src/lib/moral-trade/recipient-destination.test.ts src/lib/moral-trade/production-readiness.test.ts src/lib/moral-trade/participant-confirmations.test.ts src/lib/moral-trade/release-gates.test.ts src/lib/moral-trade/api-contract.test.ts src/lib/public-route-smoke.test.ts
node --import tsx --test src/lib/moral-trade/side-agreements.test.ts
node --import tsx --test src/lib/moral-trade/side-agreements.test.ts src/lib/proposal-review.test.ts src/lib/moral-trade/challenge-appeal.test.ts src/lib/moral-trade/agreement-amendments.test.ts src/lib/moral-trade/baseline-integrity.test.ts src/lib/moral-trade/matching-clearing.test.ts src/lib/moral-trade/impact-claims.test.ts src/lib/moral-trade/privacy-governance.test.ts src/lib/moral-trade/anti-enumeration.test.ts src/lib/moral-trade/reviewer-quality.test.ts src/lib/moral-trade/account-security.test.ts src/lib/moral-trade/participant-eligibility.test.ts src/lib/moral-trade/recipient-destination.test.ts src/lib/moral-trade/production-readiness.test.ts src/lib/moral-trade/participant-confirmations.test.ts src/lib/moral-trade/release-gates.test.ts src/lib/moral-trade/api-contract.test.ts src/lib/public-route-smoke.test.ts
node --import tsx --test src/lib/moral-trade/trade-classification.test.ts
node --import tsx --test src/lib/moral-trade/trade-classification.test.ts src/lib/moral-trade/api-contract.test.ts src/lib/public-route-smoke.test.ts
node --import tsx --test src/lib/moral-trade/protective-assessments.test.ts
node --import tsx --test src/lib/moral-trade/protective-assessments.test.ts src/lib/moral-trade/api-contract.test.ts src/lib/public-route-smoke.test.ts
node --import tsx --test src/lib/moral-trade/user-safety-content-moderation.test.ts
node --import tsx --test src/lib/moral-trade/user-safety-content-moderation.test.ts src/lib/moral-trade/api-contract.test.ts src/lib/public-route-smoke.test.ts
node --import tsx -e 'const { createRequire } = await import("node:module"); const require = createRequire(import.meta.url); const m = require("./src/lib/proposal-review.ts"); const contract = m.getOfferReviewWorkflowContract(); const validation = m.validateOfferReviewWorkflowContract(contract); console.log(JSON.stringify({ status: validation.status, blockers: validation.blockers, sampleUserFacingBlockerExplanations: contract.sampleUserFacingBlockerExplanations.map((entry) => ({ key: entry.key, reasonCategory: entry.reasonCategory, nextAction: entry.nextAction })) }, null, 2));'
node --import tsx -e 'const m = await import("./src/lib/moral-trade/side-agreements"); const api = m.default ?? m; const contract = api.getMoralTradeSideAgreementContract(); const validation = api.validateMoralTradeSideAgreementContract(contract); console.log(JSON.stringify({ status: validation.status, blockers: validation.blockers, sampleEvaluations: contract.sampleEvaluations.map((entry) => ({ transition: entry.transition, status: entry.status, blockers: entry.blockers.slice(0, 3) })) }, null, 2));'
node --import tsx -e 'const m = await import("./src/lib/moral-trade/trade-classification"); const api = m.default ?? m; const contract = api.getMoralTradeTradeClassificationContract(); const validation = api.validateMoralTradeTradeClassificationContract(contract); console.log(JSON.stringify({ status: validation.status, blockers: validation.blockers, sampleEvaluations: contract.sampleEvaluations.map((entry) => ({ transition: entry.transition, status: entry.status, metricEligibleRecordCount: entry.metricEligibleRecordCount, blockers: entry.blockers.slice(0, 4) })) }, null, 2));'
node --import tsx -e 'const m = await import("./src/lib/moral-trade/protective-assessments"); const api = m.default ?? m; const contract = api.getMoralTradeProtectiveAssessmentContract(); const validation = api.validateMoralTradeProtectiveAssessmentContract(contract); console.log(JSON.stringify({ status: validation.status, blockers: validation.blockers, sampleEvaluations: contract.sampleEvaluations.map((entry) => ({ transition: entry.transition, status: entry.status, requiredDimensionCount: entry.requiredDimensionCount, blockers: entry.blockers.slice(0, 5) })) }, null, 2));'
node --import tsx -e 'const m = await import("./src/lib/moral-trade/user-safety-content-moderation.ts"); const api = m.default ?? m; const contract = api.getMoralTradeUserSafetyContentModerationContract(); const validation = api.validateMoralTradeUserSafetyContentModerationContract(contract); console.log(JSON.stringify({ status: validation.status, blockers: validation.blockers, sampleEvaluations: contract.sampleEvaluations.map((entry) => ({ transition: entry.transition, status: entry.status, blockers: entry.blockers.slice(0, 5) })) }, null, 2));'
npm run lint -- src/lib/marketplace-measurement.ts src/lib/marketplace-measurement.test.ts src/lib/growth.ts src/lib/growth.test.ts src/components/analytics/funnel-tracker.tsx src/lib/measurement-plan.ts src/app/measurement/page.tsx src/app/api/moral-trade/health/route.ts src/lib/public-route-smoke.test.ts scripts/check-public-route-baseline.mjs
npm run lint -- src/lib/moral-trade/release-gates.ts src/lib/moral-trade/release-gates.test.ts src/app/api/moral-trade/release-gates/contract/route.ts src/app/api/moral-trade/health/route.ts src/app/moral-trade/technical-spec/page.tsx src/lib/moral-trade/api-contract.ts src/lib/moral-trade/api-contract.test.ts src/lib/public-route-smoke.test.ts src/lib/supabase/database.types.ts
npm run lint -- src/lib/moral-trade/participant-confirmations.ts src/lib/moral-trade/participant-confirmations.test.ts src/app/api/moral-trade/participant-confirmations/contract/route.ts src/app/api/moral-trade/health/route.ts src/app/moral-trade/technical-spec/page.tsx src/lib/moral-trade/api-contract.ts src/lib/moral-trade/api-contract.test.ts src/lib/public-route-smoke.test.ts src/lib/supabase/database.types.ts
npm run lint -- src/lib/moral-trade/participant-eligibility.ts src/lib/moral-trade/participant-eligibility.test.ts src/app/api/moral-trade/participant-eligibility/contract/route.ts src/app/api/moral-trade/health/route.ts src/app/moral-trade/technical-spec/page.tsx src/lib/moral-trade/api-contract.ts src/lib/moral-trade/api-contract.test.ts src/lib/public-route-smoke.test.ts src/lib/supabase/database.types.ts
npm run lint -- src/lib/moral-trade/account-security.ts src/lib/moral-trade/account-security.test.ts src/app/api/moral-trade/account-security/contract/route.ts src/app/api/moral-trade/health/route.ts src/app/moral-trade/technical-spec/page.tsx src/lib/moral-trade/api-contract.ts src/lib/moral-trade/api-contract.test.ts src/lib/public-route-smoke.test.ts src/lib/supabase/database.types.ts
npm run lint -- src/lib/moral-trade/production-readiness.ts src/lib/moral-trade/production-readiness.test.ts src/app/api/moral-trade/production-readiness/contract/route.ts src/app/api/moral-trade/health/route.ts src/app/moral-trade/technical-spec/page.tsx src/lib/moral-trade/api-contract.ts src/lib/moral-trade/api-contract.test.ts src/lib/public-route-smoke.test.ts src/lib/supabase/database.types.ts
npm run lint -- src/lib/moral-trade/recipient-destination.ts src/lib/moral-trade/recipient-destination.test.ts src/app/api/moral-trade/recipient-destinations/contract/route.ts src/app/api/moral-trade/health/route.ts src/app/moral-trade/technical-spec/page.tsx src/lib/moral-trade/api-contract.ts src/lib/moral-trade/api-contract.test.ts src/lib/public-route-smoke.test.ts src/lib/supabase/database.types.ts
npm run lint -- src/lib/moral-trade/reviewer-quality.ts src/lib/moral-trade/reviewer-quality.test.ts src/app/api/moral-trade/reviewer-quality/contract/route.ts src/app/api/moral-trade/health/route.ts src/app/moral-trade/technical-spec/page.tsx src/lib/moral-trade/api-contract.ts src/lib/moral-trade/api-contract.test.ts src/lib/public-route-smoke.test.ts src/lib/supabase/database.types.ts
npm run lint -- src/lib/moral-trade/matching-clearing.ts src/lib/moral-trade/matching-clearing.test.ts src/app/api/moral-trade/matching-clearing/contract/route.ts src/app/api/moral-trade/health/route.ts src/app/moral-trade/technical-spec/page.tsx src/lib/moral-trade/api-contract.ts src/lib/moral-trade/api-contract.test.ts src/lib/public-route-smoke.test.ts src/lib/supabase/database.types.ts
npm run lint -- src/lib/moral-trade/anti-enumeration.ts src/lib/moral-trade/anti-enumeration.test.ts src/app/api/moral-trade/anti-enumeration/contract/route.ts src/app/api/moral-trade/health/route.ts src/app/moral-trade/technical-spec/page.tsx src/lib/moral-trade/api-contract.ts src/lib/moral-trade/api-contract.test.ts src/lib/public-route-smoke.test.ts src/lib/supabase/database.types.ts
npm run lint -- src/lib/moral-trade/privacy-governance.ts src/lib/moral-trade/privacy-governance.test.ts src/app/api/moral-trade/privacy-governance/contract/route.ts src/app/api/moral-trade/health/route.ts src/app/moral-trade/technical-spec/page.tsx src/lib/moral-trade/api-contract.ts src/lib/moral-trade/api-contract.test.ts src/lib/public-route-smoke.test.ts src/lib/supabase/database.types.ts
npm run lint -- src/lib/moral-trade/impact-claims.ts src/lib/moral-trade/impact-claims.test.ts src/app/api/moral-trade/impact-claims/contract/route.ts src/app/api/moral-trade/health/route.ts src/app/moral-trade/technical-spec/page.tsx src/lib/moral-trade/api-contract.ts src/lib/moral-trade/api-contract.test.ts src/lib/public-route-smoke.test.ts src/lib/supabase/database.types.ts
npm run lint -- src/lib/moral-trade/baseline-integrity.ts src/lib/moral-trade/baseline-integrity.test.ts src/app/api/moral-trade/baseline-integrity/contract/route.ts src/app/api/moral-trade/health/route.ts src/app/moral-trade/technical-spec/page.tsx src/lib/moral-trade/api-contract.ts src/lib/moral-trade/api-contract.test.ts src/lib/public-route-smoke.test.ts src/lib/supabase/database.types.ts
npm run lint -- src/lib/moral-trade/agreement-amendments.ts src/lib/moral-trade/agreement-amendments.test.ts src/app/api/moral-trade/agreement-amendments/contract/route.ts src/app/api/moral-trade/health/route.ts src/app/moral-trade/technical-spec/page.tsx src/lib/moral-trade/api-contract.ts src/lib/moral-trade/api-contract.test.ts src/lib/public-route-smoke.test.ts src/lib/supabase/database.types.ts
npm run lint -- src/lib/moral-trade/challenge-appeal.ts src/lib/moral-trade/challenge-appeal.test.ts src/app/api/moral-trade/challenge-appeal/contract/route.ts src/app/api/moral-trade/health/route.ts src/app/moral-trade/technical-spec/page.tsx src/lib/moral-trade/api-contract.test.ts src/lib/public-route-smoke.test.ts src/lib/supabase/database.types.ts
npm run lint -- src/lib/proposal-review.ts src/lib/proposal-review.test.ts src/components/offers/offer-create-form.tsx src/app/api/moral-trade/review-workflow/contract/route.ts src/app/api/moral-trade/health/route.ts src/app/moral-trade/technical-spec/page.tsx src/lib/public-route-smoke.test.ts config/moral-trade/api-contract-profile.json
npm run lint -- src/lib/moral-trade/side-agreements.ts src/lib/moral-trade/side-agreements.test.ts src/app/api/moral-trade/side-agreements/contract/route.ts src/app/api/moral-trade/health/route.ts src/app/moral-trade/technical-spec/page.tsx src/lib/moral-trade/api-contract.ts src/lib/moral-trade/api-contract.test.ts src/lib/public-route-smoke.test.ts src/lib/supabase/database.types.ts config/moral-trade/api-contract-profile.json
npm run lint -- src/lib/moral-trade/trade-classification.ts src/lib/moral-trade/trade-classification.test.ts src/app/api/moral-trade/trade-classification/contract/route.ts src/app/api/moral-trade/health/route.ts src/app/moral-trade/technical-spec/page.tsx src/lib/moral-trade/api-contract.ts src/lib/moral-trade/api-contract.test.ts src/lib/public-route-smoke.test.ts src/lib/supabase/database.types.ts config/moral-trade/api-contract-profile.json
npm run lint -- src/lib/moral-trade/protective-assessments.ts src/lib/moral-trade/protective-assessments.test.ts src/app/api/moral-trade/protective-assessments/contract/route.ts src/app/api/moral-trade/health/route.ts src/app/moral-trade/technical-spec/page.tsx src/lib/moral-trade/api-contract.ts src/lib/moral-trade/api-contract.test.ts src/lib/public-route-smoke.test.ts src/lib/supabase/database.types.ts config/moral-trade/api-contract-profile.json
npm run lint -- src/lib/moral-trade/user-safety-content-moderation.ts src/lib/moral-trade/user-safety-content-moderation.test.ts src/app/api/moral-trade/user-safety-content-moderation/contract/route.ts src/app/api/moral-trade/health/route.ts src/app/moral-trade/technical-spec/page.tsx src/lib/moral-trade/api-contract.ts src/lib/moral-trade/api-contract.test.ts src/lib/public-route-smoke.test.ts src/lib/supabase/database.types.ts config/moral-trade/api-contract-profile.json
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
- privacy-governance/anti-enumeration/reviewer-quality/account-security/participant-eligibility/recipient-destination/production-readiness/participant-confirmation/release-gate/API/source-smoke bundle: `106` tests passed
- impact-claims/privacy-governance/anti-enumeration/reviewer-quality/account-security/participant-eligibility/recipient-destination/production-readiness/participant-confirmation/release-gate/API/source-smoke bundle: `112` tests passed
- focused matching-clearing contract bundle: `6` tests passed
- matching-clearing/API/source-smoke bundle: `60` tests passed
- matching-clearing/impact-claims/privacy-governance/anti-enumeration/reviewer-quality/account-security/participant-eligibility/recipient-destination/production-readiness/participant-confirmation/release-gate/API/source-smoke bundle: `118` tests passed
- direct matching-clearing validator probe: `status: pass`, `blockers: []`, sample evaluations `donation_offset_batch: pass`, `pledge_swap_preview: blocked`
- focused baseline-integrity contract bundle: `5` tests passed
- baseline-integrity/API/source-smoke bundle: `59` tests passed
- baseline-integrity/matching-clearing/impact-claims/privacy-governance/anti-enumeration/reviewer-quality/account-security/participant-eligibility/recipient-destination/production-readiness/participant-confirmation/release-gate/API/source-smoke bundle: `123` tests passed
- direct baseline-integrity validator probe: `status: pass`, `blockers: []`, sample evaluations `donation_offset_lock: pass`, `pledge_swap_lock: blocked`
- focused agreement-amendment contract bundle: `5` tests passed
- agreement-amendment/API/source-smoke bundle: `59` tests passed
- agreement-amendment/baseline-integrity/matching-clearing/impact-claims/privacy-governance/anti-enumeration/reviewer-quality/account-security/participant-eligibility/recipient-destination/production-readiness/participant-confirmation/release-gate/API/source-smoke bundle: `128` tests passed
- direct agreement-amendment validator probe: `status: pass`, `blockers: []`, sample evaluations `post_lock_correction: pass`, `pledge_swap_material_change: blocked`
- focused challenge-appeal contract bundle: `11` tests passed
- challenge-appeal/API/source-smoke bundle: `65` tests passed
- challenge-appeal/agreement-amendment/baseline-integrity/matching-clearing/impact-claims/privacy-governance/anti-enumeration/reviewer-quality/account-security/participant-eligibility/recipient-destination/production-readiness/participant-confirmation/release-gate/API/source-smoke bundle: `139` tests passed
- direct challenge-appeal validator probe: `status: pass`, `blockers: []`, sample appeal-case evaluations `evidence_row:wrong_scope_evidence:pass`, `evidence_row:wrong_scope_evidence:blocked`
- focused proposal-review/user-facing blocker bundle: `17` tests passed
- proposal-review/API/source-smoke bundle: `71` tests passed
- proposal-review/challenge-appeal/agreement-amendment/baseline-integrity/matching-clearing/impact-claims/privacy-governance/anti-enumeration/reviewer-quality/account-security/participant-eligibility/recipient-destination/production-readiness/participant-confirmation/release-gate/API/source-smoke bundle: `156` tests passed
- direct review-workflow validator probe: `status: pass`, `blockers: []`, sample blocker explanations `safety_review`, `needs_evidence`, `production_payout`
- focused side-agreement contract bundle: `6` tests passed
- side-agreement/proposal-review/challenge-appeal/agreement-amendment/baseline-integrity/matching-clearing/impact-claims/privacy-governance/anti-enumeration/reviewer-quality/account-security/participant-eligibility/recipient-destination/production-readiness/participant-confirmation/release-gate/API/source-smoke bundle: `162` tests passed
- direct side-agreement validator probe: `status: pass`, `blockers: []`, sample evaluations `draft_preview: pass`, `matched_trade_lock: pass`, `payout_release: blocked`
- focused trade-classification contract bundle: `6` tests passed
- trade-classification/API/source-smoke bundle: `60` tests passed
- direct trade-classification validator probe: `status: pass`, `blockers: []`, sample evaluations `draft_preview: pass`, `matched_trade_lock: pass`, `public_metric_publication: pass` with `0` metric-eligible records, `payment_capture: blocked`
- focused protective-assessment contract bundle: `6` tests passed
- protective-assessment/API/source-smoke bundle: `60` tests passed
- protective-assessment broad governance bundle: `174` tests passed
- direct protective-assessment validator probe: `status: pass`, `blockers: []`, sample evaluations `draft_preview: pass`, `matched_trade_lock: pass` with `17` required dimensions, `payment_capture: blocked`
- focused user-safety/content-moderation contract bundle: `6` tests passed
- user-safety/content-moderation API/source-smoke bundle: `60` tests passed
- user-safety/content-moderation broad governance bundle: `180` tests passed
- direct user-safety/content-moderation validator probe: `status: pass`, `blockers: []`, sample evaluations `draft_preview: pass`, `public_publication: pass`, `contact_introduction: blocked`
- lint: passed
- lint note: ESLint ignored `config/moral-trade/api-contract-profile.json` because no JSON lint configuration is supplied.
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

Privacy-governance contract sample:

```json
{
  "status": "pass",
  "validatorName": "moral-trade-privacy-governance-contract",
  "validatorVersion": "moral-trade-privacy-governance-validator-v0.1",
  "sampleEvaluations": {
    "contact_introduction": "pass",
    "public_redacted_publication": "blocked"
  }
}
```

Impact-claim contract sample:

```json
{
  "status": "pass",
  "validatorName": "moral-trade-impact-claims-contract",
  "validatorVersion": "moral-trade-impact-claims-validator-v0.1",
  "sampleEvaluations": {
    "transfer_metric": "pass",
    "causal_impact_claim": "blocked"
  }
}
```

Matching-clearing contract sample:

```json
{
  "status": "pass",
  "validatorName": "moral-trade-matching-clearing-contract",
  "validatorVersion": "moral-trade-matching-clearing-validator-v0.1",
  "sampleEvaluations": {
    "donation_offset_batch": "pass",
    "pledge_swap_preview": "blocked"
  }
}
```

Baseline-integrity contract sample:

```json
{
  "status": "pass",
  "validatorName": "moral-trade-baseline-integrity-contract",
  "validatorVersion": "moral-trade-baseline-integrity-validator-v0.1",
  "sampleEvaluations": {
    "donation_offset_lock": "pass",
    "pledge_swap_lock": "blocked"
  }
}
```

Agreement-amendment contract sample:

```json
{
  "status": "pass",
  "validatorName": "moral-trade-agreement-amendments-contract",
  "validatorVersion": "moral-trade-agreement-amendments-validator-v0.1",
  "sampleEvaluations": {
    "post_lock_correction": "pass",
    "pledge_swap_material_change": "blocked"
  }
}
```

Challenge-appeal contract sample:

```json
{
  "status": "pass",
  "validatorName": "moral-trade-challenge-appeal-contract",
  "validatorVersion": "moral-trade-challenge-appeal-validator-v0.1",
  "blockers": [],
  "sampleAppealCaseEvaluations": {
    "evidence_row:wrong_scope_evidence:pass": [],
    "evidence_row:wrong_scope_evidence:blocked": [
      "standing_missing:appeal-case-blocked",
      "notice_missing:appeal-case-blocked",
      "deadline_missing:appeal-case-blocked",
      "neutral_review_missing:appeal-case-blocked",
      "scope_missing:appeal-case-blocked",
      "evidence_scope_missing:appeal-case-blocked",
      "private_details_unredacted:appeal-case-blocked",
      "safety_blocker_waiver_attempted:appeal-case-blocked",
      "settled_obligation_reopen_attempted:appeal-case-blocked",
      "non_retaliation_missing:appeal-case-blocked",
      "invalid_case_hash:appeal-case-blocked"
    ]
  }
}
```

Review-workflow blocker explanation sample:

```json
{
  "status": "pass",
  "blockers": [],
  "sampleUserFacingBlockerExplanations": [
    {
      "key": "safety_review",
      "reasonCategory": "Safety or legality review is needed",
      "nextAction": "Pause publication and ask for a narrow safety review of the reviewed issue."
    },
    {
      "key": "needs_evidence",
      "reasonCategory": "Evidence is incomplete",
      "nextAction": "Attach or request one scoped artifact for the claim being reviewed."
    },
    {
      "key": "production_payout",
      "reasonCategory": "Production or payout gate is not ready",
      "nextAction": "Wait for the required operational review before publishing money or impact claims."
    }
  ]
}
```

Side-agreement disclosure contract sample:

```json
{
  "status": "pass",
  "blockers": [],
  "sampleEvaluations": [
    {
      "transition": "draft_preview",
      "status": "pass",
      "blockers": []
    },
    {
      "transition": "matched_trade_lock",
      "status": "pass",
      "blockers": []
    },
    {
      "transition": "payout_release",
      "status": "blocked",
      "blockers": [
        "side_agreement_not_non_blocking:side-agreement:demo:under_review",
        "side_agreement_notice_not_recorded:side-agreement:demo:missing",
        "side_agreement_review_not_non_blocking:collusion:under_review"
      ]
    }
  ]
}
```

Trade-classification contract sample:

```json
{
  "status": "pass",
  "blockers": [],
  "sampleEvaluations": [
    {
      "transition": "draft_preview",
      "status": "pass",
      "metricEligibleRecordCount": 0,
      "blockers": []
    },
    {
      "transition": "matched_trade_lock",
      "status": "pass",
      "metricEligibleRecordCount": 1,
      "blockers": []
    },
    {
      "transition": "public_metric_publication",
      "status": "pass",
      "metricEligibleRecordCount": 0,
      "blockers": []
    },
    {
      "transition": "payment_capture",
      "status": "blocked",
      "metricEligibleRecordCount": 0,
      "blockers": [
        "trade_classification_public_badge_exposed:trade-classification:demo",
        "performer_counterfactual_not_supporting_mixed_trade:trade-classification:demo:says_would_anyway",
        "ordinary_service_procurement_not_non_blocking:trade-classification:demo:ordinary_service_blocking",
        "compensated_action_terms_not_frozen:trade-classification:demo"
      ]
    }
  ]
}
```

Protective-assessment contract sample:

```json
{
  "status": "pass",
  "blockers": [],
  "sampleEvaluations": [
    {
      "transition": "draft_preview",
      "status": "pass",
      "requiredDimensionCount": 0,
      "blockers": []
    },
    {
      "transition": "matched_trade_lock",
      "status": "pass",
      "requiredDimensionCount": 17,
      "blockers": []
    },
    {
      "transition": "payment_capture",
      "status": "blocked",
      "requiredDimensionCount": 17,
      "blockers": [
        "protective_assessment_not_non_blocking:reporting_integrity_non_suppression:blocked",
        "confirmed_risk_not_non_blocking:reporting_integrity_non_suppression:protective-assessment:reporting_integrity_non_suppression",
        "invasive_evidence_plan_without_review:confidentiality_privacy_rights:protective-assessment:confidentiality_privacy_rights",
        "evidence_plan_not_approved:confidentiality_privacy_rights:invasive_without_review",
        "protective_assessment_policy_not_immutable:evidence_authenticity_synthetic_media:mutable"
      ]
    }
  ]
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
- The privacy-governance route publishes static surface/table/status/stage/access-level/sample-status contract metadata; it does not expose raw private artifacts, exact wishes, contact details, source notes, private evidence, access paths, reviewer notes, or participant-specific privacy access logs.
- The impact-claim route publishes static surface/table/status/claim-type/evidence-type/sample-status contract metadata; it does not expose private evidence, reviewer notes, methodology payloads, recipient-sensitive outcome details, or participant-specific impact-claim records.
- The matching-clearing route publishes static flow/table/status/sample-status contract metadata; it does not expose raw input bundles, private counterparty data, exact private constraints, private wishes, hidden match reasoning, reviewer notes, or participant-specific final confirmations.
- The baseline-integrity route publishes static transition/table/status/source-kind/launch-classification/sample-status contract metadata; it does not expose raw baseline narratives, private evidence, exact private constraints, counterparty-specific timing, reviewer notes, or participant-specific assessments.
- The agreement-amendment route publishes static transition/table/type/state/status/sample-status contract metadata; it does not expose private amendment narratives, participant identities, confirmation payloads, reviewer notes, payment details, private baselines, or counterparty-specific terms.
- The challenge-appeal route publishes static subject/standing/table/state/status/sample-status contract metadata; it does not expose private appeal narratives, appellant identities, raw evidence, reviewer notes, safety-sensitive details, or counterparty-specific dispute facts.
- The review-workflow contract route publishes safe blocker categories, next actions, money/obligation effects, and appeal/correction paths; it does not expose source hashes, provider payloads, raw reviewer notes, account-security signals, or sensitive counterparty data.
- The production-readiness route publishes static control/gate/table/status contract metadata; it does not expose account-security event details, backup contents, configuration values, provider payloads, reconciliation line items, audit rows, private access logs, or key material.
- The recipient-destination route publishes static transition/table/status/review-dimension/sample-status contract metadata; it does not expose copied donation links, wallet addresses, bank details, fiscal-host notes, provider payout payloads, reviewer notes, or participant-specific destination records.
- The side-agreement route publishes static transition/table/status/review-dimension/sample-status contract metadata; it does not expose private side-arrangement narratives, reviewer notes, raw evidence, source hashes, provider payloads, contact details, payment credentials, or exact counterparties.
- The trade-classification route publishes static transition/table/status/classification/review-dimension/sample-status contract metadata; it does not expose private moral-reason narratives, performer rationale, raw compensation terms, reviewer notes, source hashes, provider payloads, contact details, payment credentials, or participant-specific classification records.
- The protective-assessment route publishes static transition/table/status/dimension/sample-status contract metadata; it does not expose protected-trait facts, authority documents, private reports, credentials, source-of-funds evidence, reviewer notes, raw evidence, or participant-specific assessment records.
- The health, measurement, release-gate, participant-confirmation, participant-eligibility, account-security, reviewer-quality, anti-enumeration, privacy-governance, impact-claim, matching-clearing, baseline-integrity, agreement-amendment, challenge-appeal, production-readiness, recipient-destination, side-agreement, trade-classification, and protective-assessment surfaces publish validator status and aggregate contract metadata, not private participant records, participant-specific discovery records, participant-specific impact-claim records, raw matching bundles, participant-specific final confirmations, participant-specific baseline assessments, participant-specific amendment records, participant-specific appeal records, participant-specific destination records, participant-specific side-agreement records, participant-specific classification records, participant-specific assessment records, or private operational evidence.

### Remaining Blockers And Non-Claims

- There are still `0` live public offers and `0` completed agreements in the local public-offer sample; reviewed examples and seed templates are scaffolding, not evidence of real liquidity.
- Real-money capture and payout remain blocked until capped-real-money release gates, live provider reconciliation runs, privileged-action approvals, current backup/restore checkpoints, deployment/configuration snapshots, audit-integrity checkpoints, and reviewer approvals are complete.
- Donation offsets and pledge swaps remain preview/manual-review oriented unless later release gates explicitly promote them.
- `moraltrade60.md` includes broader long-tail requirements beyond this PR slice, including live operational execution for the new production-readiness, participant-eligibility, account-security, reviewer-quality, anti-enumeration, privacy-governance, impact-claim, matching-clearing, baseline-integrity, agreement-amendment, challenge-appeal, recipient/destination, side-agreement, and trade-classification records, live matching-clearing execution and replay jobs, live endpoint enforcement for baseline-integrity assessments before clearing, live endpoint enforcement for agreement-amendment records before post-lock material changes, live endpoint enforcement for challenge-appeal/correction records before adverse-decision correction reliance, live endpoint enforcement for privacy access logs, live endpoint enforcement for impact-claim publication records, live endpoint enforcement for anti-enumeration logs/probe audits, live endpoint enforcement for side-agreement disclosure/review records before reliance-bearing transitions, live endpoint enforcement for trade-classification and compensated-action-term records before moral-trade metric publication or payable/reliance-bearing transitions, reviewer audit sampling execution, and full donation-offset/pledge-swap clearing previews.
- Local `gh` is unavailable, so this package provides a PR-ready body and artifacts but does not prove that a GitHub PR object was created.
