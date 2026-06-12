import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import {
  evaluateMoralTradeReleaseGate,
  getMoralTradeReleaseGateContract,
  validateMoralTradeReleaseGateContract,
  type MoralTradeReleaseGateEvaluationInput,
  type MoralTradeReleaseGateRequirementResult,
} from "./release-gates";

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
    privilegedActionStatus: "not_required",
    recordedAt: new Date().toISOString(),
    ...overrides,
  };
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
    results: [
      result("route_health_output"),
      result("privacy_review"),
      result("anti_threat_review"),
      result("provider_event_replay_tests", "not_required_for_stage"),
      result("evidence_challenge_tests", "not_required_for_stage"),
      result("reviewer_conflict_tests", "not_required_for_stage"),
      result("emergency_pause_tests", "not_required_for_stage"),
      result("participant_confirmation_records", "not_required_for_stage"),
      result("participant_eligibility_records", "not_required_for_stage"),
      result("recipient_destination_verification", "not_required_for_stage", {
        privilegedActionStatus: "not_required",
      }),
      result("financial_reconciliation", "not_required_for_stage"),
      result("audit_integrity_checkpoint", "not_required_for_stage"),
      result("public_metric_suppression", "not_required_for_stage"),
      result("cause_bucket_taxonomy_review_test", "not_required_for_stage"),
      result("resource_compatibility_assessment_test", "not_required_for_stage"),
      result("net_offset_accounting_test", "not_required_for_stage"),
      result("offer_validity_record_test", "not_required_for_stage"),
      result("private_exchange_rate_quote_test", "not_required_for_stage"),
      result("noncompensable_safety_blocker_test", "not_required_for_stage"),
      result("batch_clearing_objective_result_test", "not_required_for_stage"),
      result("sensitive_evidence_privacy_preserving_attestation_test", "not_required_for_stage"),
    ],
    ...overrides,
  };
}

test("release-gate contract validates stage, policy, record, and privileged-action coverage", () => {
  const contract = getMoralTradeReleaseGateContract();
  const validation = validateMoralTradeReleaseGateContract(contract);

  assert.equal(validation.status, "pass");
  assert.equal(validation.blockers.length, 0);
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_policy_snapshots"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_release_gate_requirement_results"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_privileged_action_records"));
  assert.ok(contract.immutablePolicySnapshotSubjects.includes("state_interpretation"));
  assert.ok(contract.immutablePolicySnapshotSubjects.includes("refund_cancellation"));
  assert.ok(contract.immutablePolicySnapshotSubjects.includes("noncompensable_blocker"));
  assert.ok(contract.immutablePolicySnapshotSubjects.includes("batch_clearing_objective"));
  assert.ok(contract.immutablePolicySnapshotSubjects.includes("sensitive_evidence_attestation"));
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
  assert.ok(contract.privilegedActionKeys.includes("manual_capture"));
  assert.ok(contract.privilegedActionKeys.includes("emergency_unpause"));
});

test("public-goods preview can pass only with explicit not-required inactive controls", () => {
  const evaluation = evaluateMoralTradeReleaseGate(previewInput());

  assert.equal(evaluation.status, "pass");
  assert.equal(evaluation.payable, false);
  assert.equal(evaluation.relianceBearing, false);
  assert.equal(evaluation.inactiveRequirementCount, 18);
  assert.equal(evaluation.notRequiredRequirementCount, 18);
});

test("missing required and inactive-control results fail closed", () => {
  const evaluation = evaluateMoralTradeReleaseGate(
    previewInput({
      results: [
        result("route_health_output"),
        result("privacy_review"),
        result("provider_event_replay_tests", "not_required_for_stage"),
      ],
    }),
  );

  assert.equal(evaluation.status, "blocked");
  assert.ok(evaluation.blockers.includes("missing_required_result:anti_threat_review"));
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
    results: [
      result("dry_run_calculation"),
      result("route_health_output"),
      result("privacy_review"),
      result("anti_threat_review"),
      result("provider_event_replay_tests", "unknown"),
      result("evidence_challenge_tests", "under_review"),
      result("reviewer_conflict_tests"),
      result("emergency_pause_tests"),
      result("participant_confirmation_records"),
      result("participant_eligibility_records", "passed", {
        policySnapshotStatus: "stale",
      }),
      result("recipient_destination_verification", "passed", {
        privilegedActionStatus: "missing",
      }),
      result("financial_reconciliation"),
      result("audit_integrity_checkpoint"),
      result("cause_bucket_taxonomy_review_test"),
      result("resource_compatibility_assessment_test"),
      result("net_offset_accounting_test"),
      result("offer_validity_record_test"),
      result("private_exchange_rate_quote_test"),
      result("noncompensable_safety_blocker_test"),
      result("batch_clearing_objective_result_test"),
      result("sensitive_evidence_privacy_preserving_attestation_test"),
      result("public_metric_suppression", "not_required_for_stage"),
    ],
  });

  assert.equal(payable.status, "blocked");
  assert.ok(payable.blockers.includes("policy_snapshot_bundle_not_immutable:mutable"));
  assert.ok(payable.blockers.includes("state_interpretation_policy_not_immutable:stale"));
  assert.ok(
    payable.blockers.includes(
      "required_result_not_passed:provider_event_replay_tests:unknown",
    ),
  );
  assert.ok(
    payable.blockers.includes(
      "required_result_not_passed:evidence_challenge_tests:under_review",
    ),
  );
  assert.ok(
    payable.blockers.includes(
      "requirement_policy_snapshot_not_immutable:participant_eligibility_records:stale",
    ),
  );
  assert.ok(
    payable.blockers.includes(
      "privileged_action_not_approved:recipient_destination_verification:missing",
    ),
  );
});

test("neutral waivers require a privileged neutral-review approval", () => {
  const blocked = evaluateMoralTradeReleaseGate(
    previewInput({
      results: [
        result("route_health_output"),
        result("privacy_review", "waived_by_neutral_review", {
          privilegedActionStatus: "missing",
        }),
        result("anti_threat_review"),
        result("provider_event_replay_tests", "not_required_for_stage"),
        result("evidence_challenge_tests", "not_required_for_stage"),
        result("reviewer_conflict_tests", "not_required_for_stage"),
        result("emergency_pause_tests", "not_required_for_stage"),
        result("participant_confirmation_records", "not_required_for_stage"),
        result("participant_eligibility_records", "not_required_for_stage"),
        result("recipient_destination_verification", "not_required_for_stage"),
        result("financial_reconciliation", "not_required_for_stage"),
        result("audit_integrity_checkpoint", "not_required_for_stage"),
        result("public_metric_suppression", "not_required_for_stage"),
        result("cause_bucket_taxonomy_review_test", "not_required_for_stage"),
        result("resource_compatibility_assessment_test", "not_required_for_stage"),
        result("net_offset_accounting_test", "not_required_for_stage"),
        result("offer_validity_record_test", "not_required_for_stage"),
        result("private_exchange_rate_quote_test", "not_required_for_stage"),
        result("noncompensable_safety_blocker_test", "not_required_for_stage"),
        result("batch_clearing_objective_result_test", "not_required_for_stage"),
        result("sensitive_evidence_privacy_preserving_attestation_test", "not_required_for_stage"),
      ],
    }),
  );

  assert.equal(blocked.status, "blocked");
  assert.ok(blocked.blockers.includes("waiver_without_neutral_review:privacy_review"));

  const approved = evaluateMoralTradeReleaseGate(
    previewInput({
      results: [
        result("route_health_output"),
        result("privacy_review", "waived_by_neutral_review", {
          privilegedActionStatus: "neutral_review_approved",
        }),
        result("anti_threat_review"),
        result("provider_event_replay_tests", "not_required_for_stage"),
        result("evidence_challenge_tests", "not_required_for_stage"),
        result("reviewer_conflict_tests", "not_required_for_stage"),
        result("emergency_pause_tests", "not_required_for_stage"),
        result("participant_confirmation_records", "not_required_for_stage"),
        result("participant_eligibility_records", "not_required_for_stage"),
        result("recipient_destination_verification", "not_required_for_stage"),
        result("financial_reconciliation", "not_required_for_stage"),
        result("audit_integrity_checkpoint", "not_required_for_stage"),
        result("public_metric_suppression", "not_required_for_stage"),
        result("cause_bucket_taxonomy_review_test", "not_required_for_stage"),
        result("resource_compatibility_assessment_test", "not_required_for_stage"),
        result("net_offset_accounting_test", "not_required_for_stage"),
        result("offer_validity_record_test", "not_required_for_stage"),
        result("private_exchange_rate_quote_test", "not_required_for_stage"),
        result("noncompensable_safety_blocker_test", "not_required_for_stage"),
        result("batch_clearing_objective_result_test", "not_required_for_stage"),
        result("sensitive_evidence_privacy_preserving_attestation_test", "not_required_for_stage"),
      ],
    }),
  );

  assert.equal(approved.status, "pass");
});

test("release-gate route, health, technical spec, and migration are wired", () => {
  const route = readFileSync("src/app/api/moral-trade/release-gates/contract/route.ts", "utf8");
  const health = readFileSync("src/app/api/moral-trade/health/route.ts", "utf8");
  const technicalSpec = readFileSync("src/app/moral-trade/technical-spec/page.tsx", "utf8");
  const migration = readFileSync(
    "supabase/migrations/20260607_moral_trade_release_gate_policy_snapshots.sql",
    "utf8",
  );

  assert.match(route, /validateMoralTradeReleaseGateContract/);
  assert.match(health, /releaseGateValidation/);
  assert.match(health, /releaseGateStageKeys/);
  assert.match(technicalSpec, /Release gate contract/);
  assert.match(technicalSpec, /releaseGateContract\.firstClassRecordTables/);
  assert.match(migration, /moral_trade_policy_snapshots/);
  assert.match(migration, /moral_trade_release_gate_requirement_results/);
  assert.match(migration, /moral_trade_privileged_action_records/);
});
