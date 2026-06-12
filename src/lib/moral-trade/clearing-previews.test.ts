import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { POST as executeClearingPreview } from "@/app/api/moral-trade/clearing-previews/execute/route";
import {
  buildDemoDonationOffsetClearingPreview,
  buildDemoPledgeSwapClearingPreview,
  buildMoralTradeClearingPreview,
  getMoralTradeClearingPreviewContract,
  validateMoralTradeClearingPreviewContract,
  type MoralTradeClearingPreviewInput,
} from "@/lib/moral-trade/clearing-previews";

const HASH_A = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const HASH_B = "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const HASH_C = "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";
const HASH_D = "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd";

function baseInput(
  overrides: Partial<MoralTradeClearingPreviewInput> = {},
): MoralTradeClearingPreviewInput {
  return {
    track: "donation_offset",
    mode: "final_lock_proposal",
    releaseStage: "donation_offset_preview_no_capture",
    matchingClearingRunRef: "matching-clearing-run:test",
    matchingClearingRunStatus: "passed",
    matchingClearingRunHash: HASH_A,
    inputBundleHash: HASH_B,
    resultHash: HASH_C,
    reproducibilityStatus: "passed",
    finalLockProposalRef: "matched-trade-lock-proposal:test",
    finalLockProposalStatus: "passed",
    clearingMode: "batch",
    directPairClearingStatus: "not_required_for_stage",
    requiredFreshConfirmations: 2,
    freshConfirmationCount: 2,
    participantConfirmationStatus: "passed",
    noTradeBaseline: "Each side would otherwise make the named opposed donation.",
    baselineVersion: "baseline-v1",
    baselineSnapshotHash: HASH_D,
    baselineConfidenceLevel: "medium",
    baselineIntegrityStatus: "passed",
    participantSurplusConfirmed: true,
    matchedCounterpartyVolumeCents: 50_000,
    clearingRatioBps: 10_000,
    participantRatioMinBps: 8_000,
    participantRatioMaxBps: 12_500,
    ratioBoundsStatus: "passed",
    unmatchedResidualCents: 0,
    residualNoTradeAction: "No residual amount remains after the matched redirect.",
    fallbackRule: "If any participant fails confirmation, the batch expires with no capture.",
    commitmentReservationStatus: "passed",
    doubleCountStatus: "passed",
    atomicSettlementStatus: "passed",
    destinationVerificationStatus: "passed",
    verifiedPaymentDestinationStatus: "passed",
    donorOfRecordTaxStatus: "passed",
    nonparticipantExternalityStatus: "passed",
    antiThreatStatus: "passed",
    evidenceAuthenticityStatus: "passed",
    financialCrimeStatus: "passed",
    sideAgreementStatus: "passed",
    tradeClassificationStatus: "passed",
    protectiveAssessmentStatus: "passed",
    userSafetyStatus: "passed",
    recipientAcceptanceStatus: "passed",
    adverseAssociationStatus: "passed",
    aiPreferenceElicitationStatus: "not_required_for_stage",
    postClearAuditSamplingStatus: "not_required_for_stage",
    nonPublicGoodsSubsidyStatus: "not_required_for_stage",
    causeBucketTaxonomyStatus: "passed",
    privacyDisclosureStatus: "passed",
    policySnapshotRef: "policy-snapshot:test",
    stateInterpretationPolicyRef: "state-policy:test",
    ...overrides,
  };
}

test("clearing-preview contract validates preview sections and non-capture samples", () => {
  const contract = getMoralTradeClearingPreviewContract();
  const validation = validateMoralTradeClearingPreviewContract(contract);

  assert.equal(validation.status, "pass");
  assert.ok(contract.tracks.includes("donation_offset"));
  assert.ok(contract.tracks.includes("pledge_swap"));
  assert.ok(contract.requiredSections.includes("ratio-and-residual"));
  assert.ok(contract.requiredSections.includes("commitment-reservation"));
  assert.ok(contract.requiredSections.includes("atomic-settlement"));
  assert.ok(contract.requiredSections.includes("direct-pair-or-batch-mode"));
  assert.ok(contract.requiredSections.includes("cause-bucket-taxonomy"));
  assert.ok(contract.requiredSections.includes("recipient-ai-boundaries"));
  assert.ok(contract.requiredSections.includes("pledge-performance-terms"));
  assert.ok(contract.requiredControlStatuses.includes("matching_clearing_run"));
  assert.ok(contract.requiredControlStatuses.includes("destination_verification"));
  assert.ok(contract.requiredControlStatuses.includes("recipient_acceptance"));
  assert.ok(contract.requiredControlStatuses.includes("adverse_association"));
  assert.ok(contract.requiredControlStatuses.includes("ai_preference_elicitation"));
  assert.ok(contract.requiredControlStatuses.includes("post_clear_audit_sampling"));
  assert.ok(contract.requiredControlStatuses.includes("non_public_goods_subsidy"));
  assert.ok(contract.requiredControlStatuses.includes("direct_pair_clearing"));
  assert.ok(contract.requiredControlStatuses.includes("cause_bucket_taxonomy"));
  assert.ok(contract.requiredControlStatuses.includes("policy_snapshot"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_clearing_preview_records"));
  assert.equal(
    contract.executionRoute.path,
    "/api/moral-trade/clearing-previews/execute",
  );
  assert.equal(contract.executionRoute.auth, "authenticated");
  assert.equal(contract.executionRoute.stateMutation, "append_only_preview_record");
  assert.match(contract.persistenceRule, /append-only moral_trade_clearing_preview_records/i);
  assert.match(contract.failClosedRule, /match candidate is not a deal/i);
  assert.ok(contract.samplePreviews.every((preview) => !preview.captureAllowed));
  assert.ok(contract.samplePreviews.every((preview) => !preview.relianceBearing));
});

test("donation-offset clearing preview can pass as non-capture final-lock preview", () => {
  const preview = buildDemoDonationOffsetClearingPreview();

  assert.equal(preview.status, "preview_ready");
  assert.equal(preview.track, "donation_offset");
  assert.equal(preview.captureAllowed, false);
  assert.equal(preview.relianceBearing, false);
  assert.equal(preview.matchCandidateCreatesDeal, false);
  assert.equal(preview.requiredFreshConfirmations, 2);
  assert.equal(preview.freshConfirmationCount, 2);
  assert.deepEqual(preview.blockerCodes, []);
  assert.equal(preview.sections.find((section) => section.key === "final-lock")?.status, "passed");
  assert.equal(
    preview.sections.find((section) => section.key === "recipient-ai-boundaries")?.status,
    "passed",
  );
  assert.equal(preview.boundaryStatuses.recipientAcceptanceStatus, "passed");
  assert.equal(preview.boundaryStatuses.directPairClearingStatus, "not_required_for_stage");
  assert.equal(preview.boundaryStatuses.aiPreferenceElicitationStatus, "not_required_for_stage");
  assert.equal(preview.boundaryStatuses.postClearAuditSamplingStatus, "not_required_for_stage");
  assert.equal(preview.boundaryStatuses.nonPublicGoodsSubsidyStatus, "not_required_for_stage");
  assert.equal(preview.boundaryStatuses.causeBucketTaxonomyStatus, "passed");
  assert.equal(
    preview.sections.find((section) => section.key === "pledge-performance-terms")?.status,
    "not_required_for_stage",
  );
  assert.equal(
    preview.sections.find((section) => section.key === "direct-pair-or-batch-mode")?.status,
    "not_required_for_stage",
  );
});

test("clearing preview fails closed when cause-bucket taxonomy review is missing", () => {
  const preview = buildMoralTradeClearingPreview(
    baseInput({
      causeBucketTaxonomyStatus: "missing",
    }),
  );

  assert.equal(preview.status, "blocked_preview_only");
  assert.equal(preview.boundaryStatuses.causeBucketTaxonomyStatus, "missing");
  assert.ok(preview.blockerCodes.includes("cause_bucket_taxonomy_not_passed"));
  assert.equal(
    preview.sections.find((section) => section.key === "cause-bucket-taxonomy")?.status,
    "blocked",
  );
  assert.ok(
    preview.userFacingBlockers.some((blocker) =>
      /versioned plural-reviewed taxonomy/i.test(blocker),
    ),
  );
});

test("direct-pair clearing mode fails closed until the direct-pair record passes", () => {
  const preview = buildMoralTradeClearingPreview(
    baseInput({
      clearingMode: "direct_pair",
      directPairClearingStatus: "missing",
    }),
  );

  assert.equal(preview.status, "blocked_preview_only");
  assert.equal(preview.matchedTerms.clearingMode, "direct_pair");
  assert.equal(preview.boundaryStatuses.directPairClearingStatus, "missing");
  assert.ok(preview.blockerCodes.includes("direct_pair_clearing_not_passed"));
  assert.equal(
    preview.sections.find((section) => section.key === "direct-pair-or-batch-mode")?.status,
    "blocked",
  );
  assert.ok(
    preview.userFacingBlockers.some((blocker) =>
      /confirmed two-party record/i.test(blocker),
    ),
  );
});

test("clearing preview fails closed when run, ratio, reservation, and confirmations are missing", () => {
  const preview = buildMoralTradeClearingPreview(
    baseInput({
      matchingClearingRunRef: "",
      matchingClearingRunStatus: "missing",
      matchingClearingRunHash: null,
      inputBundleHash: null,
      resultHash: null,
      reproducibilityStatus: "missing",
      finalLockProposalRef: "",
      finalLockProposalStatus: "missing",
      freshConfirmationCount: 0,
      participantConfirmationStatus: "missing",
      participantRatioMinBps: 9_000,
      participantRatioMaxBps: 11_000,
      clearingRatioBps: 15_000,
      ratioBoundsStatus: "out_of_bounds",
      commitmentReservationStatus: "missing",
      doubleCountStatus: "needs_review",
      atomicSettlementStatus: "missing",
      recipientAcceptanceStatus: "missing",
      adverseAssociationStatus: "needs_review",
      aiPreferenceElicitationStatus: "needs_review",
      postClearAuditSamplingStatus: "missing",
      nonPublicGoodsSubsidyStatus: "missing",
    }),
  );

  assert.equal(preview.status, "blocked_preview_only");
  assert.ok(preview.blockerCodes.includes("matching_clearing_run_missing"));
  assert.ok(preview.blockerCodes.includes("input_bundle_hash_missing"));
  assert.ok(preview.blockerCodes.includes("final_lock_proposal_missing"));
  assert.ok(preview.blockerCodes.includes("fresh_final_confirmations_missing"));
  assert.ok(preview.blockerCodes.includes("clearing_ratio_outside_participant_bounds"));
  assert.ok(preview.blockerCodes.includes("commitment_reservation_not_passed"));
  assert.ok(preview.blockerCodes.includes("atomic_settlement_not_passed"));
  assert.ok(preview.blockerCodes.includes("recipient_acceptance_not_passed"));
  assert.ok(preview.blockerCodes.includes("adverse_association_not_passed"));
  assert.ok(preview.blockerCodes.includes("ai_preference_elicitation_not_passed"));
  assert.ok(preview.blockerCodes.includes("post_clear_audit_sampling_not_passed"));
  assert.ok(preview.blockerCodes.includes("non_public_goods_subsidy_not_passed"));
  assert.ok(
    preview.userFacingBlockers.some((blocker) =>
      /reviewed deterministic clearing run/i.test(blocker),
    ),
  );
});

test("pledge-swap preview is manual-review only until lock and performance controls pass", () => {
  const preview = buildDemoPledgeSwapClearingPreview();

  assert.equal(preview.track, "pledge_swap");
  assert.equal(preview.releaseStage, "pledge_swap_preview_manual_review_only");
  assert.equal(preview.captureAllowed, false);
  assert.equal(preview.relianceBearing, false);
  assert.equal(preview.matchCandidateCreatesDeal, false);
  assert.equal(preview.status, "blocked_preview_only");
  assert.ok(preview.blockerCodes.includes("final_lock_proposal_not_current"));
  assert.ok(preview.blockerCodes.includes("final_lock_proposal_missing"));
  assert.ok(preview.blockerCodes.includes("participant_surplus_confirmation_missing"));
  assert.ok(preview.blockerCodes.includes("commitment_reservation_not_passed"));
  assert.equal(
    preview.sections.find((section) => section.key === "pledge-performance-terms")?.status,
    "passed",
  );
});

test("pledge-swap preview blocks missing reciprocal release and least-intrusive evidence terms", () => {
  const preview = buildMoralTradeClearingPreview(
    baseInput({
      track: "pledge_swap",
      releaseStage: "pledge_swap_preview_manual_review_only",
      destinationVerificationStatus: "not_required_for_stage",
      verifiedPaymentDestinationStatus: "not_required_for_stage",
      donorOfRecordTaxStatus: "not_required_for_stage",
      performanceTerms: {
        maxObligationDays: null,
        reciprocalReleaseRule: "",
        withdrawalBeforeLockRule: "",
        challengeWindowDays: null,
        neutralReviewRequired: false,
        evidencePlan: "",
        leastIntrusiveAlternative: "",
        scheduleStatus: "missing",
        performanceTermsStatus: "missing",
        compensationTermsStatus: "not_required_for_stage",
      },
    }),
  );

  assert.equal(preview.status, "blocked_preview_only");
  assert.ok(preview.blockerCodes.includes("pledge_max_obligation_missing"));
  assert.ok(preview.blockerCodes.includes("reciprocal_release_rule_missing"));
  assert.ok(preview.blockerCodes.includes("withdrawal_before_lock_rule_missing"));
  assert.ok(preview.blockerCodes.includes("challenge_window_missing"));
  assert.ok(preview.blockerCodes.includes("neutral_review_missing"));
  assert.ok(preview.blockerCodes.includes("least_intrusive_evidence_alternative_missing"));
  assert.ok(preview.blockerCodes.includes("pledge_schedule_not_passed"));
});

test("clearing preview execute route is fail-closed before persistence on invalid input", async () => {
  const response = await executeClearingPreview(
    new Request("http://localhost/api/moral-trade/clearing-previews/execute", {
      body: "not-json",
      method: "POST",
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(body.ok, false);
  assert.equal(body.captureAllowed, false);
  assert.equal(body.relianceBearing, false);
  assert.equal(body.stateMutation, false);
  assert.equal(body.persistence.status, "not_recorded");
  assert.equal(body.persistence.table, "moral_trade_clearing_preview_records");
  assert.deepEqual(body.blockers, ["invalid_json_body"]);
});

test("clearing preview execution persistence is wired through contract, route, schema, and RLS", () => {
  const routeSource = readFileSync(
    "src/app/api/moral-trade/clearing-previews/execute/route.ts",
    "utf8",
  );
  const migrationSource = readFileSync(
    "supabase/migrations/20260608_moral_trade_clearing_preview_records.sql",
    "utf8",
  );
  const schemaSource = readFileSync("supabase/schema.sql", "utf8");
  const databaseTypesSource = readFileSync(
    "src/lib/supabase/database.types.ts",
    "utf8",
  );
  const apiProfileSource = readFileSync(
    "config/moral-trade/api-contract-profile.json",
    "utf8",
  );

  assert.match(routeSource, /clearing_preview_execute/);
  assert.match(routeSource, /createClient/);
  assert.match(routeSource, /auth\.getUser/);
  assert.match(routeSource, /moral_trade_clearing_preview_records/);
  assert.match(routeSource, /stateMutation:\s*false/);
  assert.match(routeSource, /captureAllowed:\s*false/);
  assert.match(routeSource, /relianceBearing:\s*false/);
  assert.match(routeSource, /idempotency_key/);
  assert.match(routeSource, /preview_hash/);

  for (const source of [migrationSource, schemaSource]) {
    assert.match(source, /create table if not exists public\.moral_trade_clearing_preview_records/);
    assert.match(source, /capture_allowed_bool boolean not null default false/);
    assert.match(source, /reliance_bearing_bool boolean not null default false/);
    assert.match(source, /match_candidate_creates_deal_bool boolean not null default false/);
    assert.match(source, /requires_final_lock_proposal_bool boolean not null default true/);
    assert.match(source, /requires_fresh_confirmations_bool boolean not null default true/);
    assert.match(source, /unique \(owner_profile_id, idempotency_key\)/);
    assert.match(source, /enable row level security/);
    assert.match(source, /moral_trade_clearing_preview_records_select_owner/);
    assert.match(source, /moral_trade_clearing_preview_records_insert_owner/);
  }

  assert.match(databaseTypesSource, /moral_trade_clearing_preview_records/);
  assert.match(databaseTypesSource, /capture_allowed_bool: false/);
  assert.match(databaseTypesSource, /reliance_bearing_bool: false/);
  assert.match(databaseTypesSource, /preview_input_json: Json/);
  assert.match(apiProfileSource, /moral_trade_clearing_preview_execute/);
  assert.match(apiProfileSource, /clearing_preview_execute_request/);
  assert.match(apiProfileSource, /clearing_preview_execute_response/);
  assert.match(apiProfileSource, /clearing_preview_execute_route_contract/);
});

test("offer creation UI and technical spec are wired to clearing previews", () => {
  const formSource = readFileSync("src/components/offers/offer-create-form.tsx", "utf8");
  const specSource = readFileSync("src/app/moral-trade/technical-spec/page.tsx", "utf8");

  assert.match(formSource, /buildMoralTradeClearingPreview/);
  assert.match(formSource, /clearingPreview/);
  assert.match(formSource, /Match candidate is not a locked deal/);
  assert.match(specSource, /getMoralTradeClearingPreviewContract/);
  assert.match(specSource, /Clearing preview contract/);
  assert.match(specSource, /clearingPreviewContract\.executionRoute/);
  assert.match(specSource, /clearingPreviewContract\.firstClassRecordTables/);
});
