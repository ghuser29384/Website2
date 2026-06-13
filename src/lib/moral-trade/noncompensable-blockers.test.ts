import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { GET as getNoncompensableBlockerContract } from "@/app/api/moral-trade/noncompensable-blockers/contract/route";
import { POST as enforceNoncompensableBlocker } from "@/app/api/moral-trade/noncompensable-blockers/enforce/route";
import {
  evaluateMoralTradeNoncompensableBlocker,
  getMoralTradeNoncompensableBlockerContract,
  validateMoralTradeNoncompensableBlockerContract,
  type MoralTradeNoncompensableBlockerAssessment,
} from "@/lib/moral-trade/noncompensable-blockers";

const HASH_A = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

function assessment(
  overrides: Partial<MoralTradeNoncompensableBlockerAssessment> = {},
): MoralTradeNoncompensableBlockerAssessment {
  return {
    recordId: "noncompensable-blocker:test",
    subjectType: "matched_trade_lock_proposal",
    subjectId: "matched-trade-lock-proposal:test",
    participantIdHash: HASH_A,
    noncompensableBlockerPolicyRef: "policy-snapshot:noncompensable-blocker",
    policyStatus: "resolved_immutable",
    protectedInterestType: "public_safety",
    blockingControlCodes: ["public_safety", "anti_threat"],
    attemptedCompensationOrWaiverState: "none",
    personalWaiverAllowedState: "not_applicable",
    renewedConfirmationRecordRefs: [],
    reviewState: "non_blocking",
    reviewerDecisionRef: "review-decision:noncompensable-blocker",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-12T00:00:00.000Z",
    ...overrides,
  };
}

test("noncompensable blocker contract validates first-class assessments", () => {
  const contract = getMoralTradeNoncompensableBlockerContract();
  const validation = validateMoralTradeNoncompensableBlockerContract(contract);

  assert.equal(validation.status, "pass");
  assert.ok(
    contract.firstClassRecordTables.includes(
      "moral_trade_noncompensable_blocker_assessments",
    ),
  );
  assert.ok(contract.policySnapshotSubjects.includes("noncompensable_blocker"));
  assert.ok(contract.subjectTypes.includes("offset_offer"));
  assert.ok(contract.subjectTypes.includes("pledge_swap_offer"));
  assert.ok(contract.subjectTypes.includes("payment_event"));
  assert.ok(contract.protectedInterestTypes.includes("public_safety"));
  assert.ok(contract.protectedInterestTypes.includes("civil_rights"));
  assert.ok(contract.protectedInterestTypes.includes("digital_system_integrity"));
  assert.ok(contract.attemptedCompensationOrWaiverStates.includes("blocking"));
  assert.ok(
    contract.personalWaiverAllowedStates.includes(
      "allowed_with_renewed_confirmation",
    ),
  );
  assert.ok(contract.reviewStates.includes("non_blocking"));
  assert.ok(contract.contractTests.includes("noncompensable_safety_blocker_test"));
  assert.match(contract.failClosedRule, /constraints rather than prices/i);
  assert.match(contract.personalWaiverRule, /renewed confirmation/i);
  assert.match(contract.compensationAttemptRule, /performance bond/i);
});

test("non-blocking assessment passes lock and release transitions", () => {
  const evaluation = evaluateMoralTradeNoncompensableBlocker({
    transition: "matched_trade_lock",
    assessmentRequired: true,
    requiredAffectedParticipantCount: 1,
    checkedAt: "2026-06-12T00:00:00.000Z",
    records: [assessment()],
  });

  assert.equal(evaluation.status, "pass");
  assert.equal(evaluation.reviewedRecordCount, 1);
  assert.equal(evaluation.nonBlockingAssessmentCount, 1);
  assert.equal(evaluation.affectedParticipantAssessmentCount, 1);
  assert.equal(evaluation.compensationAttemptBlockerCount, 0);
  assert.deepEqual(evaluation.blockers, []);
});

test("missing affected-participant assessment fails closed", () => {
  const evaluation = evaluateMoralTradeNoncompensableBlocker({
    transition: "payment_capture",
    assessmentRequired: true,
    requiredAffectedParticipantCount: 2,
    checkedAt: "2026-06-12T00:00:00.000Z",
    records: [assessment()],
  });

  assert.equal(evaluation.status, "blocked");
  assert.equal(evaluation.affectedParticipantAssessmentCount, 1);
  assert.ok(
    evaluation.blockers.includes(
      "noncompensable_blocker_affected_participant_assessment_missing",
    ),
  );
});

test("side payments, higher donations, bonds, and waivers cannot clear nonwaivable blockers", () => {
  const evaluation = evaluateMoralTradeNoncompensableBlocker({
    transition: "public_completion_count",
    assessmentRequired: true,
    requiredAffectedParticipantCount: 1,
    checkedAt: "2026-06-12T00:00:00.000Z",
    records: [
      assessment({
        protectedInterestType: "civil_rights",
        attemptedCompensationOrWaiverState: "blocking",
        personalWaiverAllowedState: "allowed_with_renewed_confirmation",
        reviewState: "blocked",
      }),
    ],
  });

  assert.equal(evaluation.status, "blocked");
  assert.equal(evaluation.compensationAttemptBlockerCount, 1);
  assert.ok(
    evaluation.blockers.includes(
      "noncompensable_blocker_compensation_attempt_for_nonwaivable_interest:noncompensable-blocker:test",
    ),
  );
  assert.ok(
    evaluation.blockers.includes(
      "noncompensable_blocker_nonwaivable_interest_marked_waivable:noncompensable-blocker:test",
    ),
  );
  assert.ok(
    evaluation.userFacingBlockerCategories.some((category) =>
      /Side payments, higher donations, performance bonds/i.test(category),
    ),
  );
});

test("personally waivable interests require renewed confirmation and non-blocking review", () => {
  const blocked = evaluateMoralTradeNoncompensableBlocker({
    transition: "reliance",
    assessmentRequired: true,
    requiredAffectedParticipantCount: 1,
    checkedAt: "2026-06-12T00:00:00.000Z",
    records: [
      assessment({
        protectedInterestType: "participant_waivable_interest",
        attemptedCompensationOrWaiverState: "possible",
        personalWaiverAllowedState: "allowed_with_renewed_confirmation",
        renewedConfirmationRecordRefs: [],
      }),
    ],
  });

  assert.equal(blocked.status, "blocked");
  assert.ok(
    blocked.blockers.includes(
      "noncompensable_blocker_renewed_confirmation_missing:noncompensable-blocker:test",
    ),
  );

  const passed = evaluateMoralTradeNoncompensableBlocker({
    transition: "reliance",
    assessmentRequired: true,
    requiredAffectedParticipantCount: 1,
    checkedAt: "2026-06-12T00:00:00.000Z",
    records: [
      assessment({
        protectedInterestType: "participant_waivable_interest",
        attemptedCompensationOrWaiverState: "possible",
        personalWaiverAllowedState: "allowed_with_renewed_confirmation",
        renewedConfirmationRecordRefs: ["confirmation:renewed-noncompensable"],
      }),
    ],
  });

  assert.equal(passed.status, "pass");
  assert.equal(passed.personallyWaivablePassCount, 1);
});

test("mutable, stale, unresolved, and invalid assessments block", () => {
  const evaluation = evaluateMoralTradeNoncompensableBlocker({
    transition: "payout_release",
    assessmentRequired: true,
    requiredAffectedParticipantCount: 1,
    checkedAt: "2026-06-12T00:00:00.000Z",
    records: [
      assessment({
        participantIdHash: "bad-hash",
        noncompensableBlockerPolicyRef: "",
        policyStatus: "mutable",
        blockingControlCodes: [],
        attemptedCompensationOrWaiverState: "under_review",
        personalWaiverAllowedState: "manual_review",
        reviewState: "manual_review",
        reviewerDecisionRef: null,
        updatedAt: "2025-01-01T00:00:00.000Z",
      }),
    ],
  });

  assert.equal(evaluation.status, "blocked");
  assert.ok(
    evaluation.blockers.includes(
      "noncompensable_blocker_participant_hash_missing:noncompensable-blocker:test",
    ),
  );
  assert.ok(
    evaluation.blockers.includes(
      "noncompensable_blocker_policy_not_immutable:noncompensable-blocker:test:mutable",
    ),
  );
  assert.ok(
    evaluation.blockers.includes(
      "noncompensable_blocker_control_codes_missing:noncompensable-blocker:test",
    ),
  );
  assert.ok(
    evaluation.blockers.includes(
      "noncompensable_blocker_manual_review_required:noncompensable-blocker:test",
    ),
  );
  assert.ok(
    evaluation.blockers.includes(
      "noncompensable_blocker_assessment_stale:noncompensable-blocker:test",
    ),
  );
});

test("noncompensable blocker route exposes public contract metadata", async () => {
  const response = await getNoncompensableBlockerContract(
    new Request("http://localhost/api/moral-trade/noncompensable-blockers/contract"),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.validation.status, "pass");
  assert.ok(
    body.publicContract.firstClassRecordTables.includes(
      "moral_trade_noncompensable_blocker_assessments",
    ),
  );
  assert.ok(body.publicContract.protectedInterestTypes.includes("public_safety"));
  assert.ok(body.publicContract.reviewStates.includes("non_blocking"));
  assert.match(body.publicContract.failClosedRule, /constraints rather than prices/i);
  assert.match(body.publicContract.compensationAttemptRule, /side payment/i);
});

test("noncompensable blocker enforcement rejects invalid JSON without state mutation", async () => {
  const response = await enforceNoncompensableBlocker(
    new Request("http://localhost/api/moral-trade/noncompensable-blockers/enforce", {
      method: "POST",
      body: "{",
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(body.ok, false);
  assert.equal(body.noncompensableBlockerGateStatus, "blocked");
  assert.equal(body.draftPreviewAllowed, false);
  assert.equal(body.matchCandidateGenerationAllowed, false);
  assert.equal(body.matchedTradeLockAllowed, false);
  assert.equal(body.paymentCaptureAllowed, false);
  assert.equal(body.payoutReleaseAllowed, false);
  assert.equal(body.relianceAllowed, false);
  assert.equal(body.publicCompletionCountAllowed, false);
  assert.equal(body.releaseGatePromotionAllowed, false);
  assert.equal(body.stateMutation, false);
  assert.deepEqual(body.blockers, ["invalid_json_body"]);
  assert.deepEqual(body.persistence, {
    requested: true,
    status: "not_recorded",
    recordId: null,
    table: "moral_trade_noncompensable_blocker_enforcement_records",
  });
  assert.equal(body.contractValidation.status, "pass");
});

test("noncompensable blocker contract is wired through route, health, spec, API profile, preview, gates, and schema", () => {
  const route = readFileSync(
    "src/app/api/moral-trade/noncompensable-blockers/contract/route.ts",
    "utf8",
  );
  const enforceRoute = readFileSync(
    "src/app/api/moral-trade/noncompensable-blockers/enforce/route.ts",
    "utf8",
  );
  const health = readFileSync("src/app/api/moral-trade/health/route.ts", "utf8");
  const spec = readFileSync("src/app/moral-trade/technical-spec/page.tsx", "utf8");
  const apiProfile = readFileSync("config/moral-trade/api-contract-profile.json", "utf8");
  const apiContract = readFileSync("src/lib/moral-trade/api-contract.ts", "utf8");
  const apiRateLimit = readFileSync("src/lib/moral-trade/api-rate-limit.ts", "utf8");
  const operations = readFileSync("src/lib/moral-trade/operations.ts", "utf8");
  const operationsProfile = readFileSync("config/moral-trade/operations-profile.json", "utf8");
  const clearingPreview = readFileSync("src/lib/moral-trade/clearing-previews.ts", "utf8");
  const releaseGates = readFileSync("src/lib/moral-trade/release-gates.ts", "utf8");
  const migration = readFileSync(
    "supabase/migrations/20260612_z_moral_trade_noncompensable_blocker_assessments.sql",
    "utf8",
  );
  const enforcementMigration = readFileSync(
    "supabase/migrations/20260613_moral_trade_noncompensable_blocker_enforcement_records.sql",
    "utf8",
  );
  const schema = readFileSync("supabase/schema.sql", "utf8");
  const databaseTypes = readFileSync("src/lib/supabase/database.types.ts", "utf8");

  assert.match(route, /getMoralTradeNoncompensableBlockerContract/);
  assert.match(enforceRoute, /noncompensable_blocker_enforce/);
  assert.match(enforceRoute, /moral_trade_noncompensable_blocker_enforcement_records/);
  assert.match(enforceRoute, /draftPreviewAllowed: false/);
  assert.match(enforceRoute, /supabase_unconfigured:noncompensable_blocker_enforce/);
  assert.match(enforceRoute, /authentication_required:noncompensable_blocker_enforce/);
  assert.match(health, /noncompensableBlockerValidation/);
  assert.match(spec, /\/api\/moral-trade\/noncompensable-blockers\/contract/);
  assert.match(apiProfile, /noncompensable_blocker_contract_response/);
  assert.match(apiProfile, /noncompensable_blocker_enforce_request/);
  assert.match(apiProfile, /noncompensable_blocker_enforce_response/);
  assert.match(apiProfile, /moral_trade_noncompensable_blocker_contract/);
  assert.match(apiProfile, /moral_trade_noncompensable_blocker_enforce/);
  assert.match(apiContract, /moral_trade_noncompensable_blocker_enforce/);
  assert.match(apiRateLimit, /noncompensable_blocker_enforce/);
  assert.match(operations, /noncompensable_blocker_enforce/);
  assert.match(operationsProfile, /noncompensable_blocker_enforce/);
  assert.match(clearingPreview, /noncompensableBlockerStatus/);
  assert.match(releaseGates, /noncompensable_safety_blocker_test/);
  assert.match(migration, /moral_trade_noncompensable_blocker_assessments/);
  assert.match(migration, /noncompensable_blocker/);
  assert.match(enforcementMigration, /moral_trade_noncompensable_blocker_enforcement_records/);
  assert.match(enforcementMigration, /owner_profile_id = auth\.uid\(\)/);
  assert.match(enforcementMigration, /payment_capture_allowed_bool = false/);
  assert.match(enforcementMigration, /payout_release_allowed_bool = false/);
  assert.match(enforcementMigration, /reliance_allowed_bool = false/);
  assert.match(schema, /moral_trade_noncompensable_blocker_assessments/);
  assert.match(schema, /moral_trade_noncompensable_blocker_enforcement_records/);
  assert.match(schema, /noncompensable_blocker/);
  assert.match(databaseTypes, /moral_trade_noncompensable_blocker_assessments/);
  assert.match(databaseTypes, /moral_trade_noncompensable_blocker_enforcement_records/);
  assert.match(databaseTypes, /noncompensable_blocker/);
});
