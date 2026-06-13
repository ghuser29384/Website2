import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { GET as getBatchClearingObjectiveContract } from "@/app/api/moral-trade/batch-clearing-objective/contract/route";
import { POST as enforceBatchClearingObjective } from "@/app/api/moral-trade/batch-clearing-objective/enforce/route";
import {
  evaluateMoralTradeBatchClearingObjective,
  getMoralTradeBatchClearingObjectiveContract,
  validateMoralTradeBatchClearingObjectiveContract,
  type MoralTradeBatchClearingObjectiveRecord,
} from "@/lib/moral-trade/batch-clearing-objective";

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function record(
  overrides: Partial<MoralTradeBatchClearingObjectiveRecord> = {},
): MoralTradeBatchClearingObjectiveRecord {
  return {
    recordId: "batch-clearing-objective:donation-offset",
    subjectType: "donation_offset_batch",
    subjectId: "donation-offset-batch:2026-06-12",
    batchClearingObjectivePolicyRef: "policy-snapshot:batch-objective-v1",
    policyStatus: "resolved_immutable",
    objectiveType: "maximize_safe_matched_volume",
    objectiveFrozenAt: "2026-06-01T00:00:00.000Z",
    deterministicAlgorithmVersion:
      "moral-trade-batch-clearing-objective-v0.1-2026-06:deterministic-v1",
    tieBreakFairnessRuleType: "seeded_deterministic_hash",
    tieBreakFairnessPolicyRef: "policy-snapshot:batch-fairness-v1",
    scarceCapacity: true,
    inputBundleHash:
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    excludedRecordsHash:
      "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    objectiveResultHash:
      "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    reproducibilityCheckRef: "reproducibility-check:batch-objective-v1",
    allocationDriversUsed: [
      "objective_score",
      "frozen_capacity",
      "participant_confirmed_bounds",
      "seeded_hash",
    ],
    resultState: "reproducible",
    reviewerDecisionRef: "review-decision:batch-objective",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-12T00:00:00.000Z",
    ...overrides,
  };
}

test("batch-clearing objective contract validates frozen objective and fairness rules", () => {
  const contract = getMoralTradeBatchClearingObjectiveContract();
  const validation = validateMoralTradeBatchClearingObjectiveContract(contract);

  assert.equal(validation.status, "pass");
  assert.ok(
    contract.firstClassRecordTables.includes(
      "moral_trade_batch_clearing_objective_records",
    ),
  );
  assert.ok(contract.policySnapshotSubjects.includes("batch_clearing_objective"));
  assert.ok(contract.objectiveTypes.includes("maximize_safe_matched_volume"));
  assert.ok(contract.objectiveTypes.includes("minimize_unmatched_residual"));
  assert.ok(
    contract.tieBreakFairnessRuleTypes.includes("seeded_deterministic_hash"),
  );
  assert.ok(contract.prohibitedAllocationDrivers.includes("moral_score"));
  assert.ok(contract.prohibitedAllocationDrivers.includes("operator_preference"));
  assert.ok(contract.prohibitedAllocationDrivers.includes("timestamp_race"));
  assert.ok(contract.prohibitedAllocationDrivers.includes("private_cap_leakage"));
  assert.ok(contract.prohibitedAllocationDrivers.includes("database_order"));
  assert.ok(contract.contractTests.includes("batch_clearing_objective_result_test"));
  assert.match(contract.prohibitedAllocationRule, /matched volume alone/i);
});

test("missing objective result fails closed for donation-offset batch clearing", () => {
  const evaluation = evaluateMoralTradeBatchClearingObjective({
    transition: "clearing_run",
    batchObjectiveRequired: true,
    checkedAt: "2026-06-12T00:00:00.000Z",
    records: [],
  });

  assert.equal(evaluation.status, "blocked");
  assert.ok(evaluation.blockers.includes("batch_clearing_objective_result_missing"));
});

test("prohibited allocation drivers and manual tie-breaks block scarce matches", () => {
  const evaluation = evaluateMoralTradeBatchClearingObjective({
    transition: "matched_trade_lock",
    batchObjectiveRequired: true,
    checkedAt: "2026-06-12T00:00:00.000Z",
    records: [
      record({
        policyStatus: "mutable",
        objectiveType: "manual_review",
        objectiveFrozenAt: null,
        deterministicAlgorithmVersion: "",
        tieBreakFairnessRuleType: "reviewer_approved_manual",
        tieBreakFairnessPolicyRef: "",
        inputBundleHash: "not-a-hash",
        excludedRecordsHash: null,
        objectiveResultHash: null,
        reproducibilityCheckRef: null,
        allocationDriversUsed: [
          "operator_preference",
          "public_pressure",
          "timestamp_race",
          "private_cap_leakage",
          "database_order",
        ],
        resultState: "under_review",
        reviewerDecisionRef: null,
        updatedAt: "2026-01-01T00:00:00.000Z",
      }),
    ],
  });

  assert.equal(evaluation.status, "blocked");
  assert.equal(evaluation.prohibitedAllocationDriverCount, 5);
  assert.ok(
    evaluation.blockers.includes(
      "batch_clearing_objective_policy_not_immutable:batch-clearing-objective:donation-offset:mutable",
    ),
  );
  assert.ok(
    evaluation.blockers.includes(
      "batch_clearing_objective_manual_objective:batch-clearing-objective:donation-offset",
    ),
  );
  assert.ok(
    evaluation.blockers.includes(
      "batch_clearing_objective_tie_break_not_deterministic:batch-clearing-objective:donation-offset:reviewer_approved_manual",
    ),
  );
  assert.ok(
    evaluation.blockers.includes(
      "batch_clearing_objective_prohibited_allocation_driver:batch-clearing-objective:donation-offset:operator_preference",
    ),
  );
  assert.ok(
    evaluation.blockers.includes(
      "batch_clearing_objective_prohibited_allocation_driver:batch-clearing-objective:donation-offset:database_order",
    ),
  );
  assert.ok(
    evaluation.blockers.includes(
      "batch_clearing_objective_reproducible_result_missing",
    ),
  );
});

test("reproducible objective result passes when deterministic allocation evidence is present", () => {
  const evaluation = evaluateMoralTradeBatchClearingObjective({
    transition: "clearing_run",
    batchObjectiveRequired: true,
    checkedAt: "2026-06-12T00:00:00.000Z",
    records: [record()],
  });

  assert.equal(evaluation.status, "pass");
  assert.equal(evaluation.reproducibleResultCount, 1);
  assert.equal(evaluation.prohibitedAllocationDriverCount, 0);
  assert.deepEqual(evaluation.blockers, []);
});

test("batch-clearing objective route exposes only public contract metadata", async () => {
  const response = await getBatchClearingObjectiveContract(
    new Request("http://localhost/api/moral-trade/batch-clearing-objective/contract"),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.publicContract.firstClassRecordTables.length, 1);
  assert.ok(
    body.publicContract.prohibitedAllocationDrivers.includes("private_cap_leakage"),
  );
  assert.equal(
    body.publicContract.batchClearingObjectiveSampleEvaluationStatuses.clearing_run,
    "pass",
  );
  assert.ok(!JSON.stringify(body).includes("participant-specific"));
});

test("batch-clearing objective enforcement rejects invalid JSON without state mutation", async () => {
  const response = await enforceBatchClearingObjective(
    new Request("http://localhost/api/moral-trade/batch-clearing-objective/enforce", {
      method: "POST",
      body: "{",
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(body.ok, false);
  assert.equal(body.batchClearingObjectiveGateStatus, "blocked");
  assert.equal(body.draftPreviewAllowed, false);
  assert.equal(body.matchCandidateGenerationAllowed, false);
  assert.equal(body.matchedTradeLockAllowed, false);
  assert.equal(body.clearingRunAllowed, false);
  assert.equal(body.paymentCaptureAllowed, false);
  assert.equal(body.relianceAllowed, false);
  assert.equal(body.publicMetricPublicationAllowed, false);
  assert.equal(body.releaseGatePromotionAllowed, false);
  assert.equal(body.stateMutation, false);
  assert.deepEqual(body.blockers, ["invalid_json_body"]);
  assert.deepEqual(body.persistence, {
    requested: true,
    status: "not_recorded",
    recordId: null,
    table: "moral_trade_batch_clearing_objective_enforcement_records",
  });
  assert.equal(body.contractValidation.status, "pass");
});

test("batch-clearing objective contract is wired through API, health, spec, schema, and smoke tests", () => {
  const source = readRepoFile("src/lib/moral-trade/batch-clearing-objective.ts");
  const route = readRepoFile(
    "src/app/api/moral-trade/batch-clearing-objective/contract/route.ts",
  );
  const enforceRoute = readRepoFile(
    "src/app/api/moral-trade/batch-clearing-objective/enforce/route.ts",
  );
  const healthRoute = readRepoFile("src/app/api/moral-trade/health/route.ts");
  const technicalSpec = readRepoFile("src/app/moral-trade/technical-spec/page.tsx");
  const apiContractSource = readRepoFile("src/lib/moral-trade/api-contract.ts");
  const apiRateLimit = readRepoFile("src/lib/moral-trade/api-rate-limit.ts");
  const operations = readRepoFile("src/lib/moral-trade/operations.ts");
  const operationsProfile = readRepoFile("config/moral-trade/operations-profile.json");
  const apiContractProfile = readRepoFile("config/moral-trade/api-contract-profile.json");
  const releaseGates = readRepoFile("src/lib/moral-trade/release-gates.ts");
  const clearingPreviews = readRepoFile("src/lib/moral-trade/clearing-previews.ts");
  const migration = readRepoFile(
    "supabase/migrations/20260612_zz_moral_trade_batch_clearing_objective_records.sql",
  );
  const enforcementMigration = readRepoFile(
    "supabase/migrations/20260613_moral_trade_batch_clearing_objective_enforcement_records.sql",
  );
  const schema = readRepoFile("supabase/schema.sql");
  const databaseTypes = readRepoFile("src/lib/supabase/database.types.ts");
  const smokeTest = readRepoFile("src/lib/public-route-smoke.test.ts");

  assert.match(source, /getMoralTradeBatchClearingObjectiveContract/);
  assert.match(source, /batch_clearing_objective_prohibited_allocation_driver/);
  assert.match(route, /validateMoralTradeBatchClearingObjectiveContract/);
  assert.match(route, /prohibitedAllocationDrivers/);
  assert.match(enforceRoute, /batch_clearing_objective_enforce/);
  assert.match(enforceRoute, /moral_trade_batch_clearing_objective_enforcement_records/);
  assert.match(enforceRoute, /draftPreviewAllowed: false/);
  assert.match(enforceRoute, /supabase_unconfigured:batch_clearing_objective_enforce/);
  assert.match(enforceRoute, /authentication_required:batch_clearing_objective_enforce/);
  assert.match(healthRoute, /batchClearingObjectiveValidation/);
  assert.match(healthRoute, /batchClearingObjectiveFirstClassRecordTables/);
  assert.match(technicalSpec, /Batch-clearing objective/);
  assert.match(technicalSpec, /batch-clearing-objective\/contract/);
  assert.match(apiContractSource, /moral_trade_batch_clearing_objective_contract/);
  assert.match(apiContractSource, /moral_trade_batch_clearing_objective_enforce/);
  assert.match(apiRateLimit, /batch_clearing_objective_enforce/);
  assert.match(operations, /batch_clearing_objective_enforce/);
  assert.match(operationsProfile, /batch_clearing_objective_enforce/);
  assert.match(apiContractProfile, /batch_clearing_objective_contract_response/);
  assert.match(apiContractProfile, /batch_clearing_objective_enforce_request/);
  assert.match(apiContractProfile, /batch_clearing_objective_enforce_response/);
  assert.match(apiContractProfile, /moral_trade_batch_clearing_objective_enforce/);
  assert.match(releaseGates, /batch_clearing_objective_result_test/);
  assert.match(clearingPreviews, /batchClearingObjectiveStatus/);
  assert.match(migration, /moral_trade_batch_clearing_objective_records/);
  assert.match(migration, /batch_clearing_objective/);
  assert.match(migration, /prohibited allocation drivers/i);
  assert.match(enforcementMigration, /moral_trade_batch_clearing_objective_enforcement_records/);
  assert.match(enforcementMigration, /owner_profile_id = auth\.uid\(\)/);
  assert.match(enforcementMigration, /clearing_run_allowed_bool = false/);
  assert.match(enforcementMigration, /payment_capture_allowed_bool = false/);
  assert.match(enforcementMigration, /public_metric_publication_allowed_bool = false/);
  assert.match(schema, /moral_trade_batch_clearing_objective_records/);
  assert.match(schema, /moral_trade_batch_clearing_objective_enforcement_records/);
  assert.match(databaseTypes, /moral_trade_batch_clearing_objective_records/);
  assert.match(databaseTypes, /moral_trade_batch_clearing_objective_enforcement_records/);
  assert.match(smokeTest, /batchClearingObjectiveSource/);
});
