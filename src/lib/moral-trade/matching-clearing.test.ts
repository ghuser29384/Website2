import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { POST as executeMatchingClearing } from "@/app/api/moral-trade/matching-clearing/execute/route";
import {
  evaluateMoralTradeMatchingClearing,
  getMoralTradeMatchingClearingContract,
  validateMoralTradeMatchingClearingContract,
  type MoralTradeMatchedTradeLockProposalRecord,
  type MoralTradeMatchingClearingRunRecord,
} from "@/lib/moral-trade/matching-clearing";

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function run(
  overrides: Partial<MoralTradeMatchingClearingRunRecord> = {},
): MoralTradeMatchingClearingRunRecord {
  return {
    runId: "matching-clearing-run-donation-offset",
    flowType: "donation_offset_batch",
    runStatus: "reviewed",
    algorithmVersion: "moral-trade-matching-clearing-v0.1-2026-06:deterministic-v1",
    deterministicAlgorithm: true,
    inputBundleHash:
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    excludedRecordsHash:
      "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    privacyPolicySnapshotRef: "policy-snapshot:privacy-matching-v1",
    stateInterpretationPolicyRef: "state-policy:matching-clearing-v1",
    resultHash:
      "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    reproducibilityCheckStatus: "passed",
    manualOverrideUsed: false,
    manualOverrideApproved: false,
    databaseOrderMatching: false,
    hiddenMatchReasoning: false,
    payableTransition: true,
    relianceBearingTransition: true,
    privateCounterpartyDataPublic: false,
    runHash:
      "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    reviewedAt: "2026-06-01T00:00:00.000Z",
    expiresAt: "2026-06-25T00:00:00.000Z",
    supersededBy: null,
    ...overrides,
  };
}

function proposal(
  overrides: Partial<MoralTradeMatchedTradeLockProposalRecord> = {},
): MoralTradeMatchedTradeLockProposalRecord {
  return {
    proposalId: "matched-trade-lock-proposal-donation-offset",
    matchingClearingRunRef: "matching-clearing-run-donation-offset",
    proposalSubjectKind: "donation_offset_batch",
    proposalStatus: "confirmed",
    exactTermsHash:
      "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    counterpartyBucketHash:
      "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    matchedVolumeHash:
      "sha256:1111111111111111111111111111111111111111111111111111111111111111",
    clearingRatioBps: 5000,
    ratioBoundsStatus: "passed",
    baselineSnapshotHash:
      "sha256:2222222222222222222222222222222222222222222222222222222222222222",
    destinationVerificationRef: "recipient-destination-review:verified",
    commitmentReservationRef: "commitment-reservation:reserved",
    atomicSettlementGroupRef: "atomic-settlement-group:all-or-none",
    finalConfirmationRefs: [
      "participant-confirmation:final-lock-a",
      "participant-confirmation:final-lock-b",
    ],
    confirmationState: "passed",
    fallbackTermsHash:
      "sha256:3333333333333333333333333333333333333333333333333333333333333333",
    evidenceStandardHash:
      "sha256:4444444444444444444444444444444444444444444444444444444444444444",
    privateCounterpartyDataPublic: false,
    proposalHash:
      "sha256:5555555555555555555555555555555555555555555555555555555555555555",
    reviewedAt: "2026-06-01T00:00:00.000Z",
    expiresAt: "2026-06-15T00:00:00.000Z",
    supersededBy: null,
    ...overrides,
  };
}

test("matching-clearing contract validates frozen runs and lock proposals", () => {
  const contract = getMoralTradeMatchingClearingContract();
  const validation = validateMoralTradeMatchingClearingContract(contract);

  assert.equal(validation.status, "pass");
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_matching_clearing_runs"));
  assert.ok(
    contract.firstClassRecordTables.includes(
      "moral_trade_matched_trade_lock_proposals",
    ),
  );
  assert.ok(
    contract.firstClassRecordTables.includes(
      "moral_trade_matching_clearing_reproducibility_checks",
    ),
  );
  assert.ok(contract.policySnapshotSubjects.includes("matching_clearing"));
  assert.ok(contract.policySnapshotSubjects.includes("matched_trade_lock"));
  assert.ok(contract.flowTypes.includes("donation_offset_batch"));
  assert.ok(contract.flowTypes.includes("pledge_swap_preview"));
  assert.ok(contract.failClosedStatuses.includes("database_order_matching"));
  assert.ok(contract.failClosedStatuses.includes("lock_proposal_missing"));
  assert.ok(contract.failClosedStatuses.includes("atomic_settlement_missing"));
  assert.ok(
    contract.executionRecordTables.includes(
      "moral_trade_matching_clearing_execution_records",
    ),
  );
  assert.equal(
    contract.executionRoute.path,
    "/api/moral-trade/matching-clearing/execute",
  );
  assert.equal(contract.executionRoute.auth, "authenticated");
  assert.equal(contract.executionRoute.stateMutation, "append_only_execution_record");
  assert.match(contract.replayRule, /append-only moral_trade_matching_clearing_execution_records/i);
  assert.match(contract.failClosedRule, /Ad hoc matching is not clearing/i);
});

test("missing run and missing lock proposal fail closed for payable clearing", () => {
  const evaluation = evaluateMoralTradeMatchingClearing({
    flowType: "donation_offset_batch",
    requiresPayableTransition: true,
    requiresRelianceBearingTransition: true,
    requiresLockProposal: true,
    checkedAt: "2026-06-02T00:00:00.000Z",
    runs: [],
    lockProposals: [],
  });

  assert.equal(evaluation.status, "blocked");
  assert.ok(evaluation.blockers.includes("run_missing:donation_offset_batch"));
  assert.ok(evaluation.blockers.includes("payable_without_run:donation_offset_batch"));
  assert.ok(evaluation.blockers.includes("reliance_without_run:donation_offset_batch"));
  assert.ok(evaluation.blockers.includes("lock_proposal_missing:donation_offset_batch"));
});

test("database-order matching, hidden reasoning, and stale reproducibility block clearing", () => {
  const blocked = evaluateMoralTradeMatchingClearing({
    flowType: "donation_offset_batch",
    requiresPayableTransition: true,
    requiresRelianceBearingTransition: true,
    requiresLockProposal: true,
    checkedAt: "2026-06-02T00:00:00.000Z",
    runs: [
      run({
        runStatus: "dry_run",
        algorithmVersion: "",
        deterministicAlgorithm: false,
        inputBundleHash: "not-a-hash",
        excludedRecordsHash: null,
        privacyPolicySnapshotRef: null,
        stateInterpretationPolicyRef: null,
        resultHash: null,
        reproducibilityCheckStatus: "failed",
        manualOverrideUsed: true,
        manualOverrideApproved: false,
        databaseOrderMatching: true,
        hiddenMatchReasoning: true,
        payableTransition: false,
        relianceBearingTransition: false,
        privateCounterpartyDataPublic: true,
        runHash: "bad-hash",
      }),
    ],
    lockProposals: [],
  });

  assert.equal(blocked.status, "blocked");
  assert.ok(blocked.blockers.includes("algorithm_version_missing:matching-clearing-run-donation-offset"));
  assert.ok(blocked.blockers.includes("deterministic_algorithm_missing:matching-clearing-run-donation-offset"));
  assert.ok(blocked.blockers.includes("input_bundle_hash_invalid:matching-clearing-run-donation-offset"));
  assert.ok(blocked.blockers.includes("excluded_records_missing:matching-clearing-run-donation-offset"));
  assert.ok(blocked.blockers.includes("privacy_policy_missing:matching-clearing-run-donation-offset"));
  assert.ok(blocked.blockers.includes("state_interpretation_policy_missing:matching-clearing-run-donation-offset"));
  assert.ok(blocked.blockers.includes("result_hash_missing:matching-clearing-run-donation-offset"));
  assert.ok(blocked.blockers.includes("run_not_reviewed:matching-clearing-run-donation-offset"));
  assert.ok(blocked.blockers.includes("manual_override_unapproved:matching-clearing-run-donation-offset"));
  assert.ok(blocked.blockers.includes("database_order_matching:matching-clearing-run-donation-offset"));
  assert.ok(blocked.blockers.includes("hidden_match_reasoning:matching-clearing-run-donation-offset"));
  assert.ok(blocked.blockers.includes("payable_without_run:matching-clearing-run-donation-offset"));
  assert.ok(blocked.blockers.includes("reliance_without_run:matching-clearing-run-donation-offset"));
  assert.ok(blocked.blockers.includes("reproducibility_check_failed:matching-clearing-run-donation-offset"));
  assert.ok(blocked.blockers.includes("private_counterparty_data_public:matching-clearing-run-donation-offset"));
  assert.ok(blocked.blockers.includes("invalid_run_hash:matching-clearing-run-donation-offset"));
});

test("stale confirmations and incomplete final lock proposal block reliance", () => {
  const blocked = evaluateMoralTradeMatchingClearing({
    flowType: "donation_offset_batch",
    requiresPayableTransition: true,
    requiresRelianceBearingTransition: true,
    requiresLockProposal: true,
    checkedAt: "2026-06-02T00:00:00.000Z",
    runs: [run()],
    lockProposals: [
      proposal({
        proposalStatus: "participant_review",
        exactTermsHash: null,
        counterpartyBucketHash: null,
        matchedVolumeHash: null,
        ratioBoundsStatus: "out_of_bounds",
        baselineSnapshotHash: null,
        destinationVerificationRef: null,
        commitmentReservationRef: null,
        atomicSettlementGroupRef: null,
        finalConfirmationRefs: [],
        confirmationState: "stale",
        fallbackTermsHash: null,
        evidenceStandardHash: null,
        privateCounterpartyDataPublic: true,
        proposalHash: "bad-hash",
      }),
    ],
  });

  assert.equal(blocked.status, "blocked");
  assert.ok(blocked.blockers.includes("lock_proposal_not_current:matched-trade-lock-proposal-donation-offset"));
  assert.ok(blocked.blockers.includes("lock_terms_hash_missing:matched-trade-lock-proposal-donation-offset"));
  assert.ok(blocked.blockers.includes("counterparty_bucket_hash_missing:matched-trade-lock-proposal-donation-offset"));
  assert.ok(blocked.blockers.includes("matched_volume_hash_missing:matched-trade-lock-proposal-donation-offset"));
  assert.ok(blocked.blockers.includes("participant_confirmation_missing:matched-trade-lock-proposal-donation-offset"));
  assert.ok(blocked.blockers.includes("participant_confirmation_stale:matched-trade-lock-proposal-donation-offset"));
  assert.ok(blocked.blockers.includes("ratio_bounds_failed:matched-trade-lock-proposal-donation-offset"));
  assert.ok(blocked.blockers.includes("baseline_snapshot_missing:matched-trade-lock-proposal-donation-offset"));
  assert.ok(blocked.blockers.includes("destination_verification_missing:matched-trade-lock-proposal-donation-offset"));
  assert.ok(blocked.blockers.includes("commitment_reservation_missing:matched-trade-lock-proposal-donation-offset"));
  assert.ok(blocked.blockers.includes("atomic_settlement_missing:matched-trade-lock-proposal-donation-offset"));
  assert.ok(blocked.blockers.includes("fallback_terms_hash_missing:matched-trade-lock-proposal-donation-offset"));
  assert.ok(blocked.blockers.includes("evidence_standard_hash_missing:matched-trade-lock-proposal-donation-offset"));
  assert.ok(blocked.blockers.includes("private_counterparty_data_public:matched-trade-lock-proposal-donation-offset"));
  assert.ok(blocked.blockers.includes("invalid_proposal_hash:matched-trade-lock-proposal-donation-offset"));
});

test("reviewed reproducible run and current lock proposal can pass", () => {
  const passed = evaluateMoralTradeMatchingClearing({
    flowType: "donation_offset_batch",
    requiresPayableTransition: true,
    requiresRelianceBearingTransition: true,
    requiresLockProposal: true,
    checkedAt: "2026-06-02T00:00:00.000Z",
    runs: [run()],
    lockProposals: [proposal()],
  });

  assert.equal(passed.status, "pass");
  assert.deepEqual(passed.blockers, []);
});

test("matching-clearing execute route is fail-closed before persistence on invalid input", async () => {
  const response = await executeMatchingClearing(
    new Request("http://localhost/api/moral-trade/matching-clearing/execute", {
      body: "not-json",
      method: "POST",
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(body.ok, false);
  assert.equal(body.createsLockProposal, false);
  assert.equal(body.payableTransitionAllowed, false);
  assert.equal(body.relianceBearingTransitionAllowed, false);
  assert.equal(body.stateMutation, false);
  assert.equal(body.persistence.status, "not_recorded");
  assert.equal(body.persistence.table, "moral_trade_matching_clearing_execution_records");
  assert.deepEqual(body.blockers, ["invalid_json_body"]);
});

test("matching-clearing route, health, spec, API contract, and schema are wired", () => {
  const source = readRepoFile("src/lib/moral-trade/matching-clearing.ts");
  const route = readRepoFile(
    "src/app/api/moral-trade/matching-clearing/contract/route.ts",
  );
  const executeRoute = readRepoFile(
    "src/app/api/moral-trade/matching-clearing/execute/route.ts",
  );
  const healthRoute = readRepoFile("src/app/api/moral-trade/health/route.ts");
  const technicalSpec = readRepoFile("src/app/moral-trade/technical-spec/page.tsx");
  const apiContractSource = readRepoFile("src/lib/moral-trade/api-contract.ts");
  const apiContractProfile = readRepoFile("config/moral-trade/api-contract-profile.json");
  const migration = readRepoFile(
    "supabase/migrations/20260607_zzzzzzzzzzz_moral_trade_matching_clearing_records.sql",
  );
  const executionMigration = readRepoFile(
    "supabase/migrations/20260608_moral_trade_matching_clearing_execution_records.sql",
  );
  const schema = readRepoFile("supabase/schema.sql");
  const databaseTypes = readRepoFile("src/lib/supabase/database.types.ts");

  assert.match(source, /getMoralTradeMatchingClearingContract/);
  assert.match(source, /evaluateMoralTradeMatchingClearing/);
  assert.match(source, /Ad hoc matching is not clearing/);
  assert.match(source, /moral_trade_matching_clearing_execution_records/);
  assert.match(route, /public_contract_read/);
  assert.match(route, /matchingClearingSampleEvaluationStatuses/);
  assert.match(route, /executionRecordTables/);
  assert.match(executeRoute, /matching_clearing_execute/);
  assert.match(executeRoute, /moral_trade_matching_clearing_execution_records/);
  assert.match(executeRoute, /auth\.getUser/);
  assert.match(executeRoute, /createsLockProposal:\s*false/);
  assert.match(executeRoute, /payableTransitionAllowed:\s*false/);
  assert.match(executeRoute, /relianceBearingTransitionAllowed:\s*false/);
  assert.match(executeRoute, /stateMutation:\s*false/);
  assert.match(executeRoute, /evaluation_hash/);
  assert.match(executeRoute, /idempotency_key/);
  assert.match(healthRoute, /matchingClearingValidation/);
  assert.match(healthRoute, /matchingClearingFlowTypes/);
  assert.match(healthRoute, /matchingClearingExecutionRoute/);
  assert.match(healthRoute, /matchingClearingExecutionRecordTables/);
  assert.match(technicalSpec, /Matching-clearing contract/);
  assert.match(technicalSpec, /Open matching-clearing JSON/);
  assert.match(technicalSpec, /matchingClearingContract\.executionRoute/);
  assert.match(technicalSpec, /matchingClearingContract\.executionRecordTables/);
  assert.match(apiContractSource, /moral_trade_matching_clearing_contract/);
  assert.match(apiContractSource, /moral_trade_matching_clearing_execute/);
  assert.match(apiContractProfile, /matching_clearing_contract_response/);
  assert.match(apiContractProfile, /moral_trade_matching_clearing_contract/);
  assert.match(apiContractProfile, /moral_trade_matching_clearing_execute/);
  assert.match(apiContractProfile, /matching_clearing_execute_request/);
  assert.match(apiContractProfile, /matching_clearing_execute_response/);
  assert.match(apiContractProfile, /matching_clearing_execute_route_contract/);
  assert.match(migration, /moral_trade_matching_clearing_runs/);
  assert.match(migration, /moral_trade_matched_trade_lock_proposals/);
  assert.match(migration, /moral_trade_matching_clearing_reproducibility_checks/);
  assert.match(migration, /matched_trade_lock/);
  assert.match(executionMigration, /moral_trade_matching_clearing_execution_records/);
  assert.match(executionMigration, /creates_lock_proposal_bool = false/);
  assert.match(executionMigration, /payable_transition_allowed_bool = false/);
  assert.match(executionMigration, /reliance_bearing_transition_allowed_bool = false/);
  assert.match(executionMigration, /enable row level security/);
  assert.match(executionMigration, /moral_trade_matching_clearing_execution_records_select_owner/);
  assert.match(executionMigration, /moral_trade_matching_clearing_execution_records_insert_owner/);
  assert.match(schema, /moral_trade_matching_clearing_runs/);
  assert.match(schema, /atomic_settlement_group_ref/);
  assert.match(schema, /moral_trade_matching_clearing_execution_records/);
  assert.match(databaseTypes, /moral_trade_matching_clearing_runs/);
  assert.match(databaseTypes, /moral_trade_matched_trade_lock_proposals/);
  assert.match(databaseTypes, /moral_trade_matching_clearing_reproducibility_checks/);
  assert.match(databaseTypes, /moral_trade_matching_clearing_execution_records/);
  assert.match(databaseTypes, /creates_lock_proposal_bool: false/);
  assert.match(databaseTypes, /payable_transition_allowed_bool: false/);
  assert.match(databaseTypes, /reliance_bearing_transition_allowed_bool: false/);
});
