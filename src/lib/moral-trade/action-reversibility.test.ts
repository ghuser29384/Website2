import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { POST as enforceActionReversibility } from "@/app/api/moral-trade/action-reversibility/enforce/route";

import {
  evaluateMoralTradeActionReversibility,
  getMoralTradeActionReversibilityContract,
  validateMoralTradeActionReversibilityContract,
  type MoralTradeActionReversibilityEvaluationInput,
} from "./action-reversibility";

const CHECKED_AT = "2026-06-13T12:00:00.000Z";

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function hashFor(seed: string) {
  return `sha256:${createHash("sha256").update(seed).digest("hex")}`;
}

function passingInput(
  overrides: Partial<MoralTradeActionReversibilityEvaluationInput> = {},
): MoralTradeActionReversibilityEvaluationInput {
  return {
    actionReversibilityRequired: true,
    checkedAt: CHECKED_AT,
    records: [
      {
        actionDescriptionHash: hashFor("high-stakes-pledge-swap-action"),
        actionReversibilityPolicyRef: "policy:action-reversibility:v1",
        assessmentState: "approved",
        createdAt: CHECKED_AT,
        exactFlowApproved: true,
        expiresAt: "2026-12-13T12:00:00.000Z",
        externalityReviewState: "passed",
        highStakes: true,
        highStakesDomainRefs: ["domain:employment", "domain:family-obligation"],
        irreversiblePerformanceBeforeLockBlocked: true,
        launchMode: "approved_reliance",
        legalReviewState: "passed",
        neutralReviewState: "passed",
        recordId: "action-reversibility:test",
        reviewerDecisionRef: "review:action-reversibility",
        reversibilityLevel: "effectively_irreversible",
        subjectRef: "pledge-swap:test",
        subjectType: "pledge_swap",
        supersededBy: null,
        updatedAt: CHECKED_AT,
        vulnerabilityReviewState: "passed",
      },
    ],
    transition: "reliance_bearing_transition",
    ...overrides,
  };
}

test("action-reversibility contract validates high-stakes and irreversible-action gates", () => {
  const contract = getMoralTradeActionReversibilityContract();
  const validation = validateMoralTradeActionReversibilityContract(contract);

  assert.equal(validation.status, "pass");
  assert.deepEqual(validation.blockers, []);
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_action_reversibility_assessments"));
  assert.ok(
    contract.firstClassRecordTables.includes(
      "moral_trade_action_reversibility_enforcement_records",
    ),
  );
  assert.ok(contract.policySnapshotSubjects.includes("action_reversibility_assessment"));
  assert.ok(contract.policySnapshotSubjects.includes("coercion_undue_influence"));
  assert.ok(contract.releaseGateTestHooks.includes("irreversible_action_gate_test"));
  assert.match(contract.highStakesRule, /exact flow passes legal/i);
  assert.match(contract.noIrreversibleBeforeLockRule, /must not induce irreversible performance/i);
  assert.ok(contract.sampleEvaluations.some((sample) => sample.status === "pass"));
  assert.ok(contract.sampleEvaluations.some((sample) => sample.status === "blocked"));
});

test("approved high-stakes irreversible action passes reliance-bearing transition", () => {
  const result = evaluateMoralTradeActionReversibility(passingInput());

  assert.equal(result.status, "pass");
  assert.equal(result.recordCount, 1);
  assert.equal(result.nonBlockingRecordCount, 1);
  assert.equal(result.highStakesOrIrreversibleRecordCount, 1);
  assert.equal(result.approvedHighStakesRecordCount, 1);
  assert.deepEqual(result.blockers, []);
});

test("unapproved high-stakes irreversible action blocks lock and reliance", () => {
  const result = evaluateMoralTradeActionReversibility(
    passingInput({
      records: [
        {
          ...passingInput().records[0],
          exactFlowApproved: false,
          externalityReviewState: "under_review",
          irreversiblePerformanceBeforeLockBlocked: false,
          launchMode: "preview_only",
          legalReviewState: "blocked",
          neutralReviewState: "under_review",
          vulnerabilityReviewState: "stale",
        },
      ],
      transition: "matched_trade_lock",
    }),
  );

  assert.equal(result.status, "blocked");
  assert.ok(
    result.blockers.includes(
      "irreversible_performance_before_lock_not_blocked:action-reversibility:test",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "action_reversibility_legal_review_not_passed:action-reversibility:test:blocked",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "action_reversibility_externality_review_not_passed:action-reversibility:test:under_review",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "action_reversibility_vulnerability_review_not_passed:action-reversibility:test:stale",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "action_reversibility_neutral_review_not_passed:action-reversibility:test:under_review",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "action_reversibility_exact_flow_not_approved:action-reversibility:test",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "action_reversibility_launch_mode_not_approved:action-reversibility:test:preview_only",
    ),
  );
});

test("action-reversibility enforcement route fails closed on invalid JSON", async () => {
  const response = await enforceActionReversibility(
    new Request("http://localhost/api/moral-trade/action-reversibility/enforce", {
      body: "{",
      headers: { "content-type": "application/json" },
      method: "POST",
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.ok, false);
  assert.equal(body.actionReversibilityGateStatus, "blocked");
  assert.equal(body.matchedTradeLockAllowed, false);
  assert.equal(body.paymentCaptureAllowed, false);
  assert.equal(body.performanceStartAllowed, false);
  assert.equal(body.relianceBearingTransitionAllowed, false);
  assert.equal(body.publicMetricPublicationAllowed, false);
  assert.equal(body.releaseGatePromotionAllowed, false);
  assert.equal(body.stateMutation, false);
  assert.deepEqual(body.blockers, ["invalid_json_body"]);
});

test("action-reversibility wiring covers API profile, rate limits, database tables, and schema", () => {
  const apiContractSource = readRepoFile("src/lib/moral-trade/api-contract.ts");
  const apiProfile = readRepoFile("config/moral-trade/api-contract-profile.json");
  const rateLimitSource = readRepoFile("src/lib/moral-trade/api-rate-limit.ts");
  const operationsSource = readRepoFile("src/lib/moral-trade/operations.ts");
  const operationsProfile = readRepoFile("config/moral-trade/operations-profile.json");
  const databaseTypes = readRepoFile("src/lib/supabase/database.types.ts");
  const migration = readRepoFile(
    "supabase/migrations/20260613_moral_trade_action_reversibility_enforcement_records.sql",
  );
  const schema = readRepoFile("supabase/schema.sql");
  const releaseGates = readRepoFile("src/lib/moral-trade/release-gates.ts");

  assert.match(apiContractSource, /moral_trade_action_reversibility_contract/);
  assert.match(apiContractSource, /moral_trade_action_reversibility_enforce/);
  assert.match(apiProfile, /action_reversibility_contract_response/);
  assert.match(apiProfile, /action_reversibility_enforce_request/);
  assert.match(apiProfile, /action_reversibility_enforce_response/);
  assert.match(apiProfile, /action_reversibility_enforce_route_contract/);
  assert.match(rateLimitSource, /action_reversibility_enforce/);
  assert.match(operationsSource, /action_reversibility_enforce/);
  assert.match(operationsProfile, /"key": "action_reversibility_enforce"/);
  assert.match(databaseTypes, /moral_trade_action_reversibility_assessments/);
  assert.match(databaseTypes, /moral_trade_action_reversibility_enforcement_records/);
  assert.match(migration, /create table if not exists public\.moral_trade_action_reversibility_enforcement_records/);
  assert.match(migration, /check \(matched_trade_lock_allowed_bool = false\)/);
  assert.match(migration, /check \(performance_start_allowed_bool = false\)/);
  assert.match(schema, /moral_trade_action_reversibility_assessments/);
  assert.match(schema, /moral_trade_action_reversibility_enforcement_records/);
  assert.match(releaseGates, /irreversible_action_gate_test/);
});
