import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  evaluateMoralTradeParticipantTermSheet,
  getMoralTradeParticipantTermSheetContract,
  validateMoralTradeParticipantTermSheetContract,
  type MoralTradeCounterpartyBlindingPolicyRecord,
  type MoralTradeParticipantTermSheetRecord,
  type MoralTradeStagedCounterpartyDisclosureRecord,
} from "./participant-term-sheet";

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function hashFor(seed: string) {
  return `sha256:${createHash("sha256").update(seed).digest("hex")}`;
}

function policyRecord(
  overrides: Partial<MoralTradeCounterpartyBlindingPolicyRecord> = {},
): MoralTradeCounterpartyBlindingPolicyRecord {
  return {
    policyId: "counterparty-blinding-policy:tier-1-donation-offset",
    releaseStage: "tier_1_money_only_donation_offset",
    subjectType: "donation_offset",
    policyStatus: "resolved_immutable",
    policyHash: hashFor("counterparty-blinding-policy"),
    allowedDisclosureStages: ["cohort_count", "redacted_counterparty", "mutual_consent"],
    reviewedAt: "2026-06-11T12:00:00.000Z",
    expiresAt: "2026-09-11T12:00:00.000Z",
    supersededBy: null,
    rawCounterpartyIdentityPublic: false,
    rawContactPublic: false,
    privateWishPublic: false,
    exactPrivateConstraintPublic: false,
    hiddenMatchReasoningPublic: false,
    ...overrides,
  };
}

function termSheetRecord(
  overrides: Partial<MoralTradeParticipantTermSheetRecord> = {},
): MoralTradeParticipantTermSheetRecord {
  return {
    termSheetId: "participant-term-sheet:offset-offer-demo",
    blindingPolicyRef: "counterparty-blinding-policy:tier-1-donation-offset",
    subjectType: "donation_offset",
    subjectRef: "offset-offer:demo",
    termSheetState: "mutually_confirmed",
    participantTermHash: hashFor("participant-term-sheet"),
    counterpartyTermHash: hashFor("participant-term-sheet"),
    normalizedTermHash: hashFor("participant-term-sheet"),
    participantFacingRenderHash: hashFor("participant-facing-render"),
    participantTermSourceKind: "plain_language_render",
    participantConfirmationRef: "participant-confirmation:offset-offer-demo",
    counterpartyConfirmationRef: "participant-confirmation:counterparty-demo",
    mutualConfirmationHash: hashFor("mutual-confirmation"),
    participantFacingPlainLanguage: true,
    participantFacingPrivacySafe: true,
    scopedToExactMatchedProposal: true,
    internalHashHasParticipantFacingEquivalent: true,
    freeTextCreatesNewObligations: false,
    freeTextCreatesSidePayments: false,
    freeTextCreatesNewCounterparties: false,
    rawPrivateTermsPublic: false,
    reviewerNotesPublic: false,
    reviewedAt: "2026-06-11T12:00:00.000Z",
    expiresAt: "2026-07-11T12:00:00.000Z",
    supersededBy: null,
    ...overrides,
  };
}

function disclosureRecord(
  overrides: Partial<MoralTradeStagedCounterpartyDisclosureRecord> = {},
): MoralTradeStagedCounterpartyDisclosureRecord {
  return {
    disclosureId: "staged-counterparty-disclosure:offset-offer-demo",
    participantTermSheetRef: "participant-term-sheet:offset-offer-demo",
    blindingPolicyRef: "counterparty-blinding-policy:tier-1-donation-offset",
    disclosureState: "mutually_consented",
    visibleUserDisclosureStatus: "mutually_disclosed",
    disclosureStage: "mutual_consent",
    counterpartyVolumeBucket: "5_to_9",
    redactionHash: hashFor("counterparty-redaction"),
    mutualConsentHash: hashFor("mutual-disclosure-consent"),
    rawCounterpartyIdentityPublic: false,
    rawContactPublic: false,
    privateWishPublic: false,
    exactPrivateConstraintPublic: false,
    hiddenMatchReasoningPublic: false,
    reviewerNotesPublic: false,
    reviewedAt: "2026-06-11T12:00:00.000Z",
    expiresAt: "2026-07-11T12:00:00.000Z",
    supersededBy: null,
    ...overrides,
  };
}

test("participant-term-sheet contract validates first-class blinding and disclosure records", () => {
  const contract = getMoralTradeParticipantTermSheetContract();
  const validation = validateMoralTradeParticipantTermSheetContract(contract);

  assert.equal(validation.status, "pass");
  assert.deepEqual(validation.blockers, []);
  assert.ok(
    contract.firstClassRecordTables.includes(
      "moral_trade_participant_term_sheet_records",
    ),
  );
  assert.ok(
    contract.firstClassRecordTables.includes(
      "moral_trade_counterparty_blinding_policies",
    ),
  );
  assert.ok(
    contract.firstClassRecordTables.includes(
      "moral_trade_staged_counterparty_disclosure_records",
    ),
  );
  assert.ok(contract.policySnapshotSubjects.includes("participant_term_sheet"));
  assert.ok(contract.policySnapshotSubjects.includes("counterparty_blinding"));
  assert.ok(contract.policySnapshotSubjects.includes("staged_counterparty_disclosure"));
  assert.ok(contract.termSheetSourceKinds.includes("plain_language_render"));
  assert.ok(contract.prohibitedTermSheetSourceKinds.includes("raw_json"));
  assert.ok(contract.prohibitedTermSheetSourceKinds.includes("hidden_policy_state"));
  assert.ok(contract.prohibitedTermSheetSourceKinds.includes("reviewer_shorthand"));
  assert.ok(contract.prohibitedTermSheetSourceKinds.includes("internal_terms_hash_only"));
  assert.ok(
    contract.canonicalTermSheetRules.includes(
      "plain_language_participant_facing_render_required",
    ),
  );
  assert.ok(
    contract.canonicalTermSheetRules.includes(
      "final_confirmation_scoped_to_exact_matched_proposal",
    ),
  );
  assert.ok(contract.termSheetStates.includes("mismatch"));
  assert.ok(contract.disclosureStates.includes("over_disclosed"));
  assert.ok(contract.visibleDisclosureStatuses.includes("blocked_needs_review"));
  assert.match(contract.failClosedRule, /mismatches/i);
  assert.match(contract.failClosedRule, /raw JSON, hidden policy state, reviewer shorthand/i);
  assert.match(contract.privacyBoundary, /raw counterparty identities/i);
});

test("draft preview can pass without records, but live publication cannot", () => {
  const preview = evaluateMoralTradeParticipantTermSheet({
    transition: "draft_preview",
    checkedAt: "2026-06-11T12:00:00.000Z",
    policies: [],
    termSheets: [],
    disclosures: [],
  });

  assert.equal(preview.status, "pass");
  assert.equal(preview.requiredPolicyCount, 0);

  const live = evaluateMoralTradeParticipantTermSheet({
    transition: "live_offer_publication",
    checkedAt: "2026-06-11T12:00:00.000Z",
    policies: [],
    termSheets: [],
    disclosures: [],
  });

  assert.equal(live.status, "blocked");
  assert.ok(live.blockers.includes("counterparty_blinding_policy_required"));
  assert.ok(live.blockers.includes("participant_term_sheet_record_required"));
  assert.ok(live.blockers.includes("staged_counterparty_disclosure_record_required"));
});

test("participant-term-sheet mismatch blocks matched trade lock", () => {
  const result = evaluateMoralTradeParticipantTermSheet({
    transition: "matched_trade_lock",
    checkedAt: "2026-06-11T12:00:00.000Z",
    policies: [policyRecord()],
    termSheets: [
      termSheetRecord({
        termSheetState: "mismatch",
        participantTermHash: hashFor("participant-a"),
        counterpartyTermHash: hashFor("counterparty-b"),
        normalizedTermHash: hashFor("participant-a"),
      }),
    ],
    disclosures: [disclosureRecord()],
  });

  assert.equal(result.status, "blocked");
  assert.ok(result.blockers.includes("term_sheet_mismatch:participant-term-sheet:offset-offer-demo"));
});

test("counterparty blinding policy must be immutable and privacy-safe", () => {
  const result = evaluateMoralTradeParticipantTermSheet({
    transition: "live_offer_publication",
    checkedAt: "2026-06-11T12:00:00.000Z",
    policies: [
      policyRecord({
        policyStatus: "mutable",
        rawCounterpartyIdentityPublic: true,
        rawContactPublic: true,
        exactPrivateConstraintPublic: true,
      }),
    ],
    termSheets: [
      termSheetRecord({
        termSheetState: "participant_confirmed",
        counterpartyConfirmationRef: null,
        mutualConfirmationHash: null,
      }),
    ],
    disclosures: [
      disclosureRecord({
        disclosureState: "redacted_disclosed",
        visibleUserDisclosureStatus: "redacted_counterparty",
        disclosureStage: "redacted_counterparty",
        mutualConsentHash: null,
      }),
    ],
  });

  assert.equal(result.status, "blocked");
  assert.ok(
    result.blockers.includes(
      "counterparty_blinding_policy_not_immutable:counterparty-blinding-policy:tier-1-donation-offset:mutable",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "raw_counterparty_identity_public:counterparty-blinding-policy:tier-1-donation-offset",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "raw_contact_public:counterparty-blinding-policy:tier-1-donation-offset",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "exact_private_constraint_public:counterparty-blinding-policy:tier-1-donation-offset",
    ),
  );
});

test("staged counterparty disclosure blocks over-disclosure and private fields", () => {
  const result = evaluateMoralTradeParticipantTermSheet({
    transition: "matchable_publication",
    checkedAt: "2026-06-11T12:00:00.000Z",
    policies: [policyRecord()],
    termSheets: [
      termSheetRecord({
        termSheetState: "participant_confirmed",
        counterpartyConfirmationRef: null,
        mutualConfirmationHash: null,
      }),
    ],
    disclosures: [
      disclosureRecord({
        disclosureState: "over_disclosed",
        visibleUserDisclosureStatus: "blocked_needs_review",
        rawCounterpartyIdentityPublic: true,
        privateWishPublic: true,
      }),
    ],
  });

  assert.equal(result.status, "blocked");
  assert.ok(
    result.blockers.includes(
      "counterparty_disclosure_policy_blocking:staged-counterparty-disclosure:offset-offer-demo:over_disclosed",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "counterparty_disclosure_over_disclosed:staged-counterparty-disclosure:offset-offer-demo",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "raw_counterparty_identity_public:staged-counterparty-disclosure:offset-offer-demo",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "private_wish_public:staged-counterparty-disclosure:offset-offer-demo",
    ),
  );
});

test("mutual confirmation and staged disclosure consent are required before lock", () => {
  const result = evaluateMoralTradeParticipantTermSheet({
    transition: "matched_trade_lock",
    checkedAt: "2026-06-11T12:00:00.000Z",
    policies: [policyRecord()],
    termSheets: [
      termSheetRecord({
        termSheetState: "participant_confirmed",
        counterpartyConfirmationRef: null,
        mutualConfirmationHash: null,
      }),
    ],
    disclosures: [
      disclosureRecord({
        disclosureState: "redacted_disclosed",
        visibleUserDisclosureStatus: "redacted_counterparty",
        disclosureStage: "redacted_counterparty",
        mutualConsentHash: null,
      }),
    ],
  });

  assert.equal(result.status, "blocked");
  assert.ok(
    result.blockers.includes(
      "mutual_confirmation_missing:participant-term-sheet:offset-offer-demo",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "staged_disclosure_consent_missing:staged-counterparty-disclosure:offset-offer-demo",
    ),
  );
});

test("raw or internal-only term sheet sources cannot bind final lock confirmation", () => {
  const result = evaluateMoralTradeParticipantTermSheet({
    transition: "matched_trade_lock",
    checkedAt: "2026-06-11T12:00:00.000Z",
    policies: [policyRecord()],
    termSheets: [
      termSheetRecord({
        participantFacingRenderHash: null,
        participantFacingPlainLanguage: false,
        participantFacingPrivacySafe: false,
        participantTermSourceKind: "internal_terms_hash_only",
        internalHashHasParticipantFacingEquivalent: false,
        scopedToExactMatchedProposal: false,
      }),
    ],
    disclosures: [disclosureRecord()],
  });

  assert.equal(result.status, "blocked");
  assert.ok(
    result.blockers.includes(
      "participant_facing_render_hash_missing:participant-term-sheet:offset-offer-demo",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "participant_term_sheet_source_not_participant_facing:participant-term-sheet:offset-offer-demo:internal_terms_hash_only",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "participant_term_sheet_prohibited_source:participant-term-sheet:offset-offer-demo:internal_terms_hash_only",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "participant_facing_plain_language_missing:participant-term-sheet:offset-offer-demo",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "participant_facing_privacy_safe_render_missing:participant-term-sheet:offset-offer-demo",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "internal_hash_without_participant_facing_equivalent:participant-term-sheet:offset-offer-demo",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "final_confirmation_not_scoped_to_exact_matched_proposal:participant-term-sheet:offset-offer-demo",
    ),
  );
});

test("participant-term-sheet contract is wired through route, health, spec, API profile, and migrations", () => {
  const route = readRepoFile(
    "src/app/api/moral-trade/participant-term-sheet/contract/route.ts",
  );
  const enforceRoute = readRepoFile(
    "src/app/api/moral-trade/participant-term-sheet/enforce/route.ts",
  );
  const health = readRepoFile("src/app/api/moral-trade/health/route.ts");
  const spec = readRepoFile("src/app/moral-trade/technical-spec/page.tsx");
  const apiContract = readRepoFile("src/lib/moral-trade/api-contract.ts");
  const apiRateLimit = readRepoFile("src/lib/moral-trade/api-rate-limit.ts");
  const operations = readRepoFile("src/lib/moral-trade/operations.ts");
  const operationsProfile = readRepoFile(
    "config/moral-trade/operations-profile.json",
  );
  const apiProfile = readRepoFile("config/moral-trade/api-contract-profile.json");
  const migration = readRepoFile(
    "supabase/migrations/20260611_moral_trade_participant_term_sheet_records.sql",
  );
  const schema = readRepoFile("supabase/schema.sql");
  const databaseTypes = readRepoFile("src/lib/supabase/database.types.ts");
  const forbiddenAllowColumns = [
    "counterparty_disclosure_allowed_bool",
    "live_publication_allowed_bool",
    "matchable_publication_allowed_bool",
    "lock_transition_allowed_bool",
    "payment_authorization_allowed_bool",
    "payment_capture_allowed_bool",
    "reliance_bearing_transition_allowed_bool",
    "public_metric_publication_allowed_bool",
    "release_gate_promotion_allowed_bool",
  ];

  assert.match(route, /getMoralTradeParticipantTermSheetContract/);
  assert.match(route, /participantTermSheetSampleEvaluationStatuses/);
  assert.match(route, /canonicalTermSheetRules/);
  assert.match(enforceRoute, /participantTermSourceKind/);
  assert.match(enforceRoute, /participantFacingRenderHash/);
  assert.match(enforceRoute, /participant_term_sheet_enforce/);
  assert.match(
    enforceRoute,
    /moral_trade_participant_term_sheet_enforcement_records/,
  );
  assert.match(enforceRoute, /authentication_required:participant_term_sheet_enforce/);
  assert.match(enforceRoute, /database_insert_failed:participant_term_sheet_enforce/);
  assert.match(enforceRoute, /counterpartyDisclosureAllowed: false/);
  assert.match(enforceRoute, /livePublicationAllowed: false/);
  assert.match(enforceRoute, /matchablePublicationAllowed: false/);
  assert.match(enforceRoute, /lockTransitionAllowed: false/);
  assert.match(enforceRoute, /paymentAuthorizationAllowed: false/);
  assert.match(enforceRoute, /paymentCaptureAllowed: false/);
  assert.match(enforceRoute, /relianceBearingTransitionAllowed: false/);
  assert.match(enforceRoute, /publicMetricPublicationAllowed: false/);
  assert.match(enforceRoute, /releaseGatePromotionAllowed: false/);
  assert.match(health, /participantTermSheetValidation/);
  assert.match(health, /participantTermSheetFirstClassRecordTables/);
  assert.match(spec, /participantTermSheetContract\.firstClassRecordTables/);
  assert.match(spec, /\/api\/moral-trade\/participant-term-sheet\/contract/);
  assert.match(apiContract, /moral_trade_participant_term_sheet_contract/);
  assert.match(apiContract, /moral_trade_participant_term_sheet_enforce/);
  assert.match(apiRateLimit, /participant_term_sheet_enforce/);
  assert.match(operations, /participant_term_sheet_enforce/);
  assert.match(operationsProfile, /participant_term_sheet_enforce/);
  assert.match(apiProfile, /participant_term_sheet_contract_response/);
  assert.match(apiProfile, /participant_term_sheet_enforce_request/);
  assert.match(apiProfile, /participant_term_sheet_enforce_response/);
  assert.match(apiProfile, /participant_term_sheet_enforce_route_contract/);
  assert.match(migration, /moral_trade_participant_term_sheet_records/);
  assert.match(migration, /participant_term_source_kind/);
  assert.match(migration, /participant_facing_render_hash/);
  assert.match(migration, /participant_facing_plain_language_bool/);
  assert.match(migration, /internal_hash_has_participant_facing_equivalent_bool/);
  assert.match(migration, /scoped_to_exact_matched_proposal_bool/);
  assert.match(migration, /moral_trade_counterparty_blinding_policies/);
  assert.match(migration, /moral_trade_staged_counterparty_disclosure_records/);
  assert.match(
    migration,
    /moral_trade_participant_term_sheet_enforcement_records/,
  );
  assert.match(migration, /owner_profile_id = auth\.uid\(\)/);
  assert.match(migration, /counterparty_blinding/);
  assert.match(schema, /moral_trade_participant_term_sheet_records/);
  assert.match(schema, /staged_counterparty_disclosure/);
  assert.match(
    schema,
    /moral_trade_participant_term_sheet_enforcement_records/,
  );
  assert.match(databaseTypes, /moral_trade_participant_term_sheet_enforcement_records/);

  for (const column of forbiddenAllowColumns) {
    assert.match(migration, new RegExp(`check \\(${column} = false\\)`));
    assert.match(schema, new RegExp(`check \\(${column} = false\\)`));
  }
});
