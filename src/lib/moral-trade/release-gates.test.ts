import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import { POST as enforceReleaseGate } from "@/app/api/moral-trade/release-gates/enforce/route";

import {
  MORALTRADE82_FEATURE_FLAGS,
  MORALTRADE82_RELEASE_GATE_REQUIREMENT_KEYS,
  MORALTRADE82_RELEASE_STAGES,
  evaluateMoralTradeReleaseGate,
  getMoralTradeReleaseGateContract,
  validateMoralTradeReleaseGateContract,
  type MoralTradeReleaseStage,
  type MoralTradeReleaseGateEvaluationInput,
  type MoralTradeReleaseGateRequirementResult,
} from "./release-gates";

const PRIVILEGED_REQUIREMENT_KEYS = new Set([
  "neutral_reviewer_approval",
  "recipient_acceptance_association_test",
  "representative_authority_verification_test",
  "pledge_performance_bond_neutral_forfeiture_test",
]);

function result(
  key: string,
  status: MoralTradeReleaseGateRequirementResult["status"] = "passed",
  overrides: Partial<MoralTradeReleaseGateRequirementResult> = {},
): MoralTradeReleaseGateRequirementResult {
  return {
    key,
    status,
    evidenceRef: `test://${key}`,
    policySnapshotStatus: "resolved_immutable",
    privilegedActionStatus: PRIVILEGED_REQUIREMENT_KEYS.has(key)
      ? "neutral_review_approved"
      : "not_required",
    recordedAt: new Date().toISOString(),
    ...overrides,
  };
}

function stageResults(stageKey: MoralTradeReleaseStage) {
  const stage = getMoralTradeReleaseGateContract().stages.find((entry) => entry.key === stageKey);

  assert.ok(stage, `missing stage ${stageKey}`);

  return [
    ...stage.requiredRequirementKeys.map((key) => result(key)),
    ...stage.inactiveRequirementKeys.map((key) => result(key, "not_required_for_stage")),
  ];
}

function previewInput(
  overrides: Partial<MoralTradeReleaseGateEvaluationInput> = {},
): MoralTradeReleaseGateEvaluationInput {
  return {
    stage: "public_goods_preview",
    gateId: "test-preview-gate",
    policySnapshotBundleStatus: "resolved_immutable",
    stateInterpretationPolicyStatus: "resolved_immutable",
    featureFlagEnabled: true,
    emergencyPaused: false,
    results: stageResults("public_goods_preview"),
    ...overrides,
  };
}

test("release-gate contract validates stage, policy, record, and privileged-action coverage", () => {
  const contract = getMoralTradeReleaseGateContract();
  const validation = validateMoralTradeReleaseGateContract(contract);

  assert.equal(validation.status, "pass");
  assert.equal(validation.blockers.length, 0);
  assert.equal(MORALTRADE82_RELEASE_GATE_REQUIREMENT_KEYS.length, 94);
  assert.deepEqual(contract.documentedReleaseStages, [...MORALTRADE82_RELEASE_STAGES]);
  assert.deepEqual(contract.documentedFeatureFlags, [...MORALTRADE82_FEATURE_FLAGS]);
  assert.ok(contract.documentedReleaseStages.includes("capped_real_money_external_crecm_module"));
  assert.ok(contract.documentedFeatureFlags.includes("external_crecm_module"));
  assert.ok(
    contract.stages.some(
      (stage) =>
        stage.key === "capped_real_money_external_crecm_module" &&
        stage.label === "Capped real-money Public Goods Fund handoff" &&
        /Public Goods Fund handoff/.test(stage.hardBlockerSummary),
    ),
  );
  assert.equal(contract.stages.some((stage) => /external CRECM module/i.test(stage.label)), false);
  assert.ok(contract.stages.some((stage) => stage.key === "demo" && !stage.payable));
  assert.ok(
    contract.stages.some(
      (stage) =>
        stage.key === "pledge_swap_preview_only" &&
        stage.requiredRequirementKeys.includes("micro_pledge_preperformance_lock_test") &&
        stage.requiredRequirementKeys.includes("food_abstention_health_safety_boundary_test"),
    ),
  );
  assert.ok(
    contract.stages.some(
      (stage) =>
        stage.key === "donation_offset_pilot" &&
        stage.requiredRequirementKeys.includes("public_receipt_card_publication_test") &&
        stage.requiredRequirementKeys.includes("offset_creation_route_happy_path_test"),
    ),
  );
  assert.ok(
    MORALTRADE82_RELEASE_GATE_REQUIREMENT_KEYS.every((key) =>
      contract.requirementDefinitions.some((requirement) => requirement.key === key),
    ),
  );
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_policy_snapshots"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_release_gate_requirement_results"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_privileged_action_records"));
  assert.ok(contract.immutablePolicySnapshotSubjects.includes("state_interpretation"));
  assert.ok(contract.immutablePolicySnapshotSubjects.includes("refund_cancellation"));
  assert.ok(contract.immutablePolicySnapshotSubjects.includes("noncompensable_blocker"));
  assert.ok(contract.immutablePolicySnapshotSubjects.includes("batch_clearing_objective"));
  assert.ok(contract.immutablePolicySnapshotSubjects.includes("sensitive_evidence_attestation"));
  assert.ok(contract.immutablePolicySnapshotSubjects.includes("pilot_evidence"));
  assert.equal(
    contract.requirementDefinitions.filter((requirement) =>
      [
        "dry_run_calculation_bundle",
        "route_health_baseline",
        "payment_replay_tests",
        "emergency_pause_test",
        "control_applicability_matrix_test",
      ].includes(requirement.key),
    ).length,
    5,
  );
  assert.ok(
    contract.requirementDefinitions.some(
      (requirement) => requirement.key === "cause_bucket_taxonomy_review_test",
    ),
  );
  assert.ok(
    contract.requirementDefinitions.some(
      (requirement) => requirement.key === "resource_compatibility_assessment_test",
    ),
  );
  assert.ok(
    contract.requirementDefinitions.some(
      (requirement) => requirement.key === "net_offset_accounting_test",
    ),
  );
  assert.ok(
    contract.requirementDefinitions.some(
      (requirement) => requirement.key === "offer_validity_record_test",
    ),
  );
  assert.ok(
    contract.requirementDefinitions.some(
      (requirement) => requirement.key === "private_exchange_rate_quote_test",
    ),
  );
  assert.ok(
    contract.requirementDefinitions.some(
      (requirement) => requirement.key === "noncompensable_safety_blocker_test",
    ),
  );
  assert.ok(
    contract.requirementDefinitions.some(
      (requirement) => requirement.key === "batch_clearing_objective_result_test",
    ),
  );
  assert.ok(
    contract.requirementDefinitions.some(
      (requirement) =>
        requirement.key === "sensitive_evidence_privacy_preserving_attestation_test" &&
        /claim-typed attestation/i.test(requirement.description),
    ),
  );
  assert.ok(
    contract.requirementDefinitions.some(
      (requirement) =>
        requirement.key === "market_simulation_red_team_test" &&
        /market simulation/i.test(requirement.description),
    ),
  );
  assert.ok(
    contract.requirementDefinitions.some(
      (requirement) =>
        requirement.key === "pilot_exit_criteria_test" &&
        /matched volume alone/i.test(requirement.description),
    ),
  );
  assert.ok(
    contract.requirementDefinitions.some(
      (requirement) =>
        requirement.key === "marketplace_intake_triage_routing_test" &&
        /routes ordinary donations/i.test(requirement.description),
    ),
  );
  assert.ok(
    contract.requirementDefinitions.some(
      (requirement) =>
        requirement.key === "participant_ui_render_snapshot_accessibility_test" &&
        /hash-backed render snapshots/i.test(requirement.description),
    ),
  );
  assert.ok(
    contract.requirementDefinitions.some(
      (requirement) =>
        requirement.key === "public_receipt_anti_gamification_test" &&
        /leaderboards/i.test(requirement.description),
    ),
  );
  assert.ok(
    contract.requirementDefinitions.some(
      (requirement) =>
        requirement.key === "micro_pledge_preperformance_lock_test" &&
        /pre-performance locks/i.test(requirement.description),
    ),
  );
  assert.ok(
    contract.requirementDefinitions.some(
      (requirement) =>
        requirement.key === "marketplace_state_event_append_only_test" &&
        /append-only marketplace_state_event/i.test(requirement.description) &&
        /terminal states cannot be silently reopened/i.test(requirement.description),
    ),
  );
  assert.ok(contract.privilegedActionKeys.includes("manual_capture"));
  assert.ok(contract.privilegedActionKeys.includes("emergency_unpause"));
});

test("public-goods preview can pass only with explicit not-required inactive controls", () => {
  const evaluation = evaluateMoralTradeReleaseGate(previewInput());

  assert.equal(evaluation.status, "pass");
  assert.equal(evaluation.payable, false);
  assert.equal(evaluation.relianceBearing, false);
  assert.equal(evaluation.requiredRequirementCount, 5);
  assert.equal(evaluation.inactiveRequirementCount, 89);
  assert.equal(evaluation.notRequiredRequirementCount, 89);
});

test("moraltrade82 documented preview stages use the same fail-closed evaluator", () => {
  const pledgePreview = evaluateMoralTradeReleaseGate({
    stage: "pledge_swap_preview_only",
    gateId: "pledge-preview-test-gate",
    policySnapshotBundleStatus: "resolved_immutable",
    stateInterpretationPolicyStatus: "resolved_immutable",
    featureFlagEnabled: true,
    emergencyPaused: false,
    results: stageResults("pledge_swap_preview_only"),
  });

  assert.equal(pledgePreview.status, "pass");
  assert.equal(pledgePreview.payable, false);
  assert.equal(pledgePreview.relianceBearing, false);
  assert.ok(pledgePreview.requiredRequirementCount > 20);
  assert.ok(pledgePreview.inactiveRequirementCount > 0);

  const blocked = evaluateMoralTradeReleaseGate({
    stage: "pledge_swap_manual_pilot",
    gateId: "manual-pilot-test-gate",
    policySnapshotBundleStatus: "resolved_immutable",
    stateInterpretationPolicyStatus: "resolved_immutable",
    featureFlagEnabled: false,
    emergencyPaused: false,
    results: stageResults("pledge_swap_manual_pilot").filter(
      (entry) => entry.key !== "participant_ui_render_snapshot_accessibility_test",
    ),
  });

  assert.equal(blocked.status, "blocked");
  assert.ok(blocked.relianceBearing);
  assert.ok(blocked.blockers.includes("feature_flag_disabled:moral_trade_pledge_swap_manual_pilot"));
  assert.ok(
    blocked.blockers.includes(
      "missing_required_result:participant_ui_render_snapshot_accessibility_test",
    ),
  );
});

test("missing required and inactive-control results fail closed", () => {
  const evaluation = evaluateMoralTradeReleaseGate(
    previewInput({
      results: [
        result("dry_run_calculation_bundle"),
        result("route_health_baseline"),
        result("privacy_review"),
        result("payment_replay_tests", "not_required_for_stage"),
      ],
    }),
  );

  assert.equal(evaluation.status, "blocked");
  assert.ok(evaluation.blockers.includes("missing_required_result:anti_threat_review"));
  assert.ok(
    evaluation.blockers.includes("missing_required_result:environment_data_isolation_check"),
  );
  assert.ok(
    evaluation.blockers.includes(
      "missing_inactive_control_representation:evidence_challenge_tests",
    ),
  );
});

test("required gates block stale, unknown, mutable, and under-review states", () => {
  const payable = evaluateMoralTradeReleaseGate({
    stage: "donation_offset_payable",
    gateId: "payable-test-gate",
    policySnapshotBundleStatus: "mutable",
    stateInterpretationPolicyStatus: "stale",
    featureFlagEnabled: true,
    emergencyPaused: false,
    results: stageResults("donation_offset_payable").map((entry) => {
      if (entry.key === "payment_replay_tests") {
        return result(entry.key, "unknown");
      }

      if (entry.key === "marketplace_state_event_append_only_test") {
        return result(entry.key, "failed");
      }

      if (entry.key === "evidence_challenge_tests") {
        return result(entry.key, "under_review");
      }

      if (entry.key === "review_capacity_admission_queue_test") {
        return result(entry.key, "passed", { policySnapshotStatus: "stale" });
      }

      if (entry.key === "recipient_acceptance_association_test") {
        return result(entry.key, "passed", { privilegedActionStatus: "missing" });
      }

      return entry;
    }),
  });

  assert.equal(payable.status, "blocked");
  assert.ok(payable.blockers.includes("policy_snapshot_bundle_not_immutable:mutable"));
  assert.ok(payable.blockers.includes("state_interpretation_policy_not_immutable:stale"));
  assert.ok(
    payable.blockers.includes(
      "required_result_not_passed:payment_replay_tests:unknown",
    ),
  );
  assert.ok(
    payable.blockers.includes(
      "required_result_not_passed:marketplace_state_event_append_only_test:failed",
    ),
  );
  assert.ok(
    payable.blockers.includes(
      "required_result_not_passed:evidence_challenge_tests:under_review",
    ),
  );
  assert.ok(
    payable.blockers.includes(
      "requirement_policy_snapshot_not_immutable:review_capacity_admission_queue_test:stale",
    ),
  );
  assert.ok(
    payable.blockers.includes(
      "privileged_action_not_approved:recipient_acceptance_association_test:missing",
    ),
  );
});

test("neutral waivers require a privileged neutral-review approval", () => {
  const blocked = evaluateMoralTradeReleaseGate(
    previewInput({
      results: stageResults("public_goods_preview").map((entry) =>
        entry.key === "privacy_review"
          ? result("privacy_review", "waived_by_neutral_review", {
              privilegedActionStatus: "missing",
            })
          : entry,
      ),
    }),
  );

  assert.equal(blocked.status, "blocked");
  assert.ok(blocked.blockers.includes("waiver_without_neutral_review:privacy_review"));

  const approved = evaluateMoralTradeReleaseGate(
    previewInput({
      results: stageResults("public_goods_preview").map((entry) =>
        entry.key === "privacy_review"
          ? result("privacy_review", "waived_by_neutral_review", {
              privilegedActionStatus: "neutral_review_approved",
            })
          : entry,
      ),
    }),
  );

  assert.equal(approved.status, "pass");
});

test("release-gate enforcement rejects invalid JSON without state mutation", async () => {
  const response = await enforceReleaseGate(
    new Request("http://localhost/api/moral-trade/release-gates/enforce", {
      method: "POST",
      body: "{",
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(body.ok, false);
  assert.equal(body.releaseGateStatus, "blocked");
  assert.equal(body.payableAllowed, false);
  assert.equal(body.relianceBearingAllowed, false);
  assert.equal(body.publicMetricPublicationAllowed, false);
  assert.equal(body.releaseGatePromotionAllowed, false);
  assert.equal(body.stateMutation, false);
  assert.deepEqual(body.blockers, ["invalid_json_body"]);
  assert.deepEqual(body.persistence, {
    requested: true,
    status: "not_recorded",
    recordId: null,
    table: "moral_trade_release_gate_enforcement_records",
  });
  assert.equal(body.contractValidation.status, "pass");
});

test("release-gate route, health, technical spec, and migration are wired", () => {
  const route = readFileSync("src/app/api/moral-trade/release-gates/contract/route.ts", "utf8");
  const enforceRoute = readFileSync("src/app/api/moral-trade/release-gates/enforce/route.ts", "utf8");
  const health = readFileSync("src/app/api/moral-trade/health/route.ts", "utf8");
  const technicalSpec = readFileSync("src/app/moral-trade/technical-spec/page.tsx", "utf8");
  const migration = readFileSync(
    "supabase/migrations/20260607_moral_trade_release_gate_policy_snapshots.sql",
    "utf8",
  );
  const enforcementMigration = readFileSync(
    "supabase/migrations/20260613_moral_trade_release_gate_enforcement_records.sql",
    "utf8",
  );
  const schema = readFileSync("supabase/schema.sql", "utf8");
  const databaseTypes = readFileSync("src/lib/supabase/database.types.ts", "utf8");
  const apiContract = readFileSync("src/lib/moral-trade/api-contract.ts", "utf8");
  const apiRateLimit = readFileSync("src/lib/moral-trade/api-rate-limit.ts", "utf8");
  const operations = readFileSync("src/lib/moral-trade/operations.ts", "utf8");
  const operationsProfile = readFileSync("config/moral-trade/operations-profile.json", "utf8");
  const apiContractProfile = readFileSync(
    "config/moral-trade/api-contract-profile.json",
    "utf8",
  );

  assert.match(route, /validateMoralTradeReleaseGateContract/);
  assert.match(route, /documentedReleaseStages/);
  assert.match(route, /documentedFeatureFlags/);
  assert.match(enforceRoute, /release_gate_enforce/);
  assert.match(enforceRoute, /pledge_swap_preview_only/);
  assert.match(enforceRoute, /donation_offset_pilot/);
  assert.match(enforceRoute, /moral_trade_release_gate_enforcement_records/);
  assert.match(enforceRoute, /payableAllowed: false/);
  assert.match(enforceRoute, /relianceBearingAllowed: false/);
  assert.match(enforceRoute, /supabase_unconfigured:release_gate_enforce/);
  assert.match(enforceRoute, /authentication_required:release_gate_enforce/);
  assert.match(health, /releaseGateValidation/);
  assert.match(health, /releaseGateStageKeys/);
  assert.match(technicalSpec, /Release gate contract/);
  assert.match(technicalSpec, /releaseGateContract\.firstClassRecordTables/);
  assert.match(migration, /moral_trade_policy_snapshots/);
  assert.match(migration, /moral_trade_release_gate_requirement_results/);
  assert.match(migration, /moral_trade_privileged_action_records/);
  assert.match(enforcementMigration, /moral_trade_release_gate_enforcement_records/);
  assert.match(enforcementMigration, /owner_profile_id = auth\.uid\(\)/);
  assert.match(enforcementMigration, /payable_allowed_bool = false/);
  assert.match(enforcementMigration, /reliance_bearing_allowed_bool = false/);
  assert.match(enforcementMigration, /public_metric_publication_allowed_bool = false/);
  assert.match(enforcementMigration, /release_gate_promotion_allowed_bool = false/);
  assert.match(schema, /moral_trade_release_gate_enforcement_records/);
  assert.match(schema, /payable_allowed_bool = false/);
  assert.match(databaseTypes, /moral_trade_release_gate_enforcement_records/);
  assert.match(apiContract, /moral_trade_release_gate_enforce/);
  assert.match(apiRateLimit, /release_gate_enforce/);
  assert.match(operations, /release_gate_enforce/);
  assert.match(operationsProfile, /release_gate_enforce/);
  assert.match(apiContractProfile, /moral_trade_release_gate_enforce/);
  assert.match(apiContractProfile, /release_gate_enforce_request/);
  assert.match(apiContractProfile, /release_gate_enforce_response/);
  assert.match(apiContractProfile, /release_gate_enforce_route_contract/);
});
