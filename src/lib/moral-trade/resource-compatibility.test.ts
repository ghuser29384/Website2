import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { GET as getResourceCompatibilityContract } from "@/app/api/moral-trade/resource-compatibility/contract/route";
import { POST as enforceResourceCompatibility } from "@/app/api/moral-trade/resource-compatibility/enforce/route";
import {
  evaluateMoralTradeResourceCompatibility,
  getMoralTradeResourceCompatibilityContract,
  validateMoralTradeResourceCompatibilityContract,
  type MoralTradeResourceCompatibilityAssessmentRecord,
} from "@/lib/moral-trade/resource-compatibility";

const HASH_A = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

function assessmentRecord(
  overrides: Partial<MoralTradeResourceCompatibilityAssessmentRecord> = {},
): MoralTradeResourceCompatibilityAssessmentRecord {
  return {
    assessmentId: "resource-compatibility:test",
    subjectType: "matched_trade_lock_proposal",
    subjectId: "matched-trade-lock-proposal:test",
    participantIdsHash: HASH_A,
    resourceCompatibilityPolicyRef: "policy-snapshot:resource-compatibility",
    policyStatus: "resolved_immutable",
    resourceOrActionConflictType: "none_disclosed",
    jointFeasibilityState: "feasible",
    hybridOrCompromiseGoodState: "identified",
    incompatibleDutyOrControlRefs: [],
    reviewState: "non_blocking",
    reviewerDecisionRef: "review-decision:resource-compatibility",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-12T00:00:00.000Z",
    publicParticipantIdentity: false,
    publicPrivateDutiesOrConstraints: false,
    publicPrivateResourceClaims: false,
    publicReviewerNotes: false,
    publicThirdPartyControlFacts: false,
    ...overrides,
  };
}

test("resource-compatibility contract validates first-class joint-feasibility records", () => {
  const contract = getMoralTradeResourceCompatibilityContract();
  const validation = validateMoralTradeResourceCompatibilityContract(contract);

  assert.equal(validation.status, "pass");
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_resource_compatibility_assessments"));
  assert.ok(contract.policySnapshotSubjects.includes("resource_compatibility"));
  assert.ok(contract.subjectTypes.includes("matched_trade_lock_proposal"));
  assert.ok(contract.subjectTypes.includes("negative_commitment_scope"));
  assert.ok(contract.conflictTypes.includes("zero_sum_control_claim"));
  assert.ok(contract.conflictTypes.includes("third_party_control_conflict"));
  assert.ok(contract.transitionDefinitions.some((transition) => transition.key === "clearing_run"));
  assert.ok(contract.contractTests.includes("resource_compatibility_assessment_test"));
  assert.match(contract.zeroSumConflictRule, /scarce control right/i);
  assert.match(contract.privacyBoundary, /private resource claims/i);
});

test("reviewed resource-compatibility assessment can pass clearing and lock gates", () => {
  const evaluation = evaluateMoralTradeResourceCompatibility({
    transition: "matched_trade_lock",
    assessmentRequired: true,
    checkedAt: "2026-06-12T00:00:00.000Z",
    assessments: [assessmentRecord()],
  });

  assert.equal(evaluation.status, "pass");
  assert.equal(evaluation.reviewedAssessmentCount, 1);
  assert.equal(evaluation.feasibleAssessmentCount, 1);
  assert.equal(evaluation.privacySafeAssessmentCount, 1);
  assert.deepEqual(evaluation.blockers, []);
});

test("missing resource-compatibility assessment fails closed when required", () => {
  const evaluation = evaluateMoralTradeResourceCompatibility({
    transition: "clearing_run",
    assessmentRequired: true,
    checkedAt: "2026-06-12T00:00:00.000Z",
    assessments: [],
  });

  assert.equal(evaluation.status, "blocked");
  assert.ok(evaluation.blockers.includes("resource_compatibility_assessment_record_missing"));
  assert.ok(evaluation.blockers.includes("non_blocking_resource_compatibility_assessment_missing"));
});

test("zero-sum, mutually infeasible, third-party-control, stale, and privacy-leaking assessments block", () => {
  const evaluation = evaluateMoralTradeResourceCompatibility({
    transition: "clearing_run",
    assessmentRequired: true,
    checkedAt: "2026-06-12T00:00:00.000Z",
    assessments: [
      assessmentRecord({
        policyStatus: "mutable",
        resourceOrActionConflictType: "zero_sum_control_claim",
        jointFeasibilityState: "infeasible_blocking",
        hybridOrCompromiseGoodState: "blocked",
        incompatibleDutyOrControlRefs: [],
        reviewState: "blocked",
        reviewerDecisionRef: null,
        updatedAt: "2024-01-01T00:00:00.000Z",
        publicParticipantIdentity: true,
        publicPrivateDutiesOrConstraints: true,
        publicPrivateResourceClaims: true,
        publicReviewerNotes: true,
        publicThirdPartyControlFacts: true,
      }),
    ],
  });

  assert.equal(evaluation.status, "blocked");
  assert.ok(
    evaluation.blockers.includes(
      "resource_compatibility_policy_not_immutable:resource-compatibility:test:mutable",
    ),
  );
  assert.ok(
    evaluation.blockers.includes(
      "resource_or_action_conflict_blocking:resource-compatibility:test:zero_sum_control_claim",
    ),
  );
  assert.ok(
    evaluation.blockers.includes(
      "joint_feasibility_not_non_blocking:resource-compatibility:test:infeasible_blocking",
    ),
  );
  assert.ok(
    evaluation.blockers.includes(
      "hybrid_or_compromise_good_not_clear:resource-compatibility:test:blocked",
    ),
  );
  assert.ok(
    evaluation.blockers.includes(
      "incompatible_duty_or_control_refs_missing:resource-compatibility:test",
    ),
  );
  assert.ok(
    evaluation.blockers.includes(
      "resource_compatibility_review_not_non_blocking:resource-compatibility:test:blocked",
    ),
  );
  assert.ok(
    evaluation.blockers.includes(
      "resource_compatibility_reviewer_decision_missing:resource-compatibility:test",
    ),
  );
  assert.ok(evaluation.blockers.includes("stale_resource_compatibility_assessment:resource-compatibility:test"));
  assert.ok(evaluation.blockers.includes("resource_compatibility_privacy_leak:resource-compatibility:test"));
});

test("inactive resource-compatibility stage passes only when assessments do not leak private details", () => {
  const clean = evaluateMoralTradeResourceCompatibility({
    transition: "draft_preview",
    assessmentRequired: false,
    checkedAt: "2026-06-12T00:00:00.000Z",
    assessments: [],
  });
  const leaking = evaluateMoralTradeResourceCompatibility({
    transition: "draft_preview",
    assessmentRequired: false,
    checkedAt: "2026-06-12T00:00:00.000Z",
    assessments: [
      assessmentRecord({
        publicPrivateResourceClaims: true,
      }),
    ],
  });

  assert.equal(clean.status, "pass");
  assert.equal(leaking.status, "blocked");
  assert.ok(leaking.blockers.includes("resource_compatibility_privacy_leak:resource-compatibility:test"));
});

test("resource-compatibility route exposes only public contract metadata", async () => {
  const response = await getResourceCompatibilityContract(
    new Request("http://localhost/api/moral-trade/resource-compatibility/contract"),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.validation.status, "pass");
  assert.ok(body.publicContract.firstClassRecordTables.includes("moral_trade_resource_compatibility_assessments"));
  assert.ok(body.publicContract.conflictTypes.includes("zero_sum_control_claim"));
  assert.match(body.publicContract.zeroSumConflictRule, /zero-sum conflict/i);
  assert.match(body.publicContract.privacyBoundary, /reviewer notes/i);
});

test("resource-compatibility enforcement rejects invalid JSON without state mutation", async () => {
  const response = await enforceResourceCompatibility(
    new Request("http://localhost/api/moral-trade/resource-compatibility/enforce", {
      method: "POST",
      body: "{",
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(body.ok, false);
  assert.equal(body.resourceCompatibilityGateStatus, "blocked");
  assert.equal(body.draftPreviewAllowed, false);
  assert.equal(body.matchCandidateGenerationAllowed, false);
  assert.equal(body.matchedTradeLockAllowed, false);
  assert.equal(body.clearingRunAllowed, false);
  assert.equal(body.paymentCaptureAllowed, false);
  assert.equal(body.publicMetricPublicationAllowed, false);
  assert.equal(body.releaseGatePromotionAllowed, false);
  assert.equal(body.stateMutation, false);
  assert.deepEqual(body.blockers, ["invalid_json_body"]);
  assert.deepEqual(body.persistence, {
    requested: true,
    status: "not_recorded",
    recordId: null,
    table: "moral_trade_resource_compatibility_enforcement_records",
  });
  assert.equal(body.contractValidation.status, "pass");
});

test("resource-compatibility contract is wired through route, health, spec, API profile, preview, and schema", () => {
  const route = readFileSync(
    "src/app/api/moral-trade/resource-compatibility/contract/route.ts",
    "utf8",
  );
  const enforceRoute = readFileSync(
    "src/app/api/moral-trade/resource-compatibility/enforce/route.ts",
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
  const migration = readFileSync(
    "supabase/migrations/20260612_moral_trade_resource_compatibility_records.sql",
    "utf8",
  );
  const enforcementMigration = readFileSync(
    "supabase/migrations/20260613_moral_trade_resource_compatibility_enforcement_records.sql",
    "utf8",
  );
  const schema = readFileSync("supabase/schema.sql", "utf8");
  const databaseTypes = readFileSync("src/lib/supabase/database.types.ts", "utf8");

  assert.match(route, /getMoralTradeResourceCompatibilityContract/);
  assert.match(enforceRoute, /resource_compatibility_enforce/);
  assert.match(enforceRoute, /moral_trade_resource_compatibility_enforcement_records/);
  assert.match(enforceRoute, /draftPreviewAllowed: false/);
  assert.match(enforceRoute, /supabase_unconfigured:resource_compatibility_enforce/);
  assert.match(enforceRoute, /authentication_required:resource_compatibility_enforce/);
  assert.match(health, /resourceCompatibilityValidation/);
  assert.match(spec, /\/api\/moral-trade\/resource-compatibility\/contract/);
  assert.match(apiProfile, /resource_compatibility_contract_response/);
  assert.match(apiProfile, /resource_compatibility_enforce_request/);
  assert.match(apiProfile, /resource_compatibility_enforce_response/);
  assert.match(apiProfile, /moral_trade_resource_compatibility_contract/);
  assert.match(apiProfile, /moral_trade_resource_compatibility_enforce/);
  assert.match(apiContract, /moral_trade_resource_compatibility_enforce/);
  assert.match(apiRateLimit, /resource_compatibility_enforce/);
  assert.match(operations, /resource_compatibility_enforce/);
  assert.match(operationsProfile, /resource_compatibility_enforce/);
  assert.match(clearingPreview, /resourceCompatibilityStatus/);
  assert.match(migration, /moral_trade_resource_compatibility_assessments/);
  assert.match(migration, /resource_compatibility/);
  assert.match(enforcementMigration, /moral_trade_resource_compatibility_enforcement_records/);
  assert.match(enforcementMigration, /owner_profile_id = auth\.uid\(\)/);
  assert.match(enforcementMigration, /draft_preview_allowed_bool = false/);
  assert.match(enforcementMigration, /match_candidate_generation_allowed_bool = false/);
  assert.match(enforcementMigration, /payment_capture_allowed_bool = false/);
  assert.match(schema, /moral_trade_resource_compatibility_assessments/);
  assert.match(schema, /moral_trade_resource_compatibility_enforcement_records/);
  assert.match(schema, /resource_compatibility/);
  assert.match(databaseTypes, /moral_trade_resource_compatibility_assessments/);
  assert.match(databaseTypes, /moral_trade_resource_compatibility_enforcement_records/);
  assert.match(databaseTypes, /resource_compatibility/);
});
