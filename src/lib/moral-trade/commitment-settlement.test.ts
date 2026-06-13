import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { POST as enforceCommitmentSettlement } from "@/app/api/moral-trade/commitment-settlement/enforce/route";

import {
  evaluateMoralTradeCommitmentSettlement,
  getMoralTradeCommitmentSettlementContract,
  validateMoralTradeCommitmentSettlementContract,
  type MoralTradeCommitmentSettlementEvaluationInput,
} from "./commitment-settlement";

const CHECKED_AT = "2026-06-13T12:00:00.000Z";

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function hashFor(seed: string) {
  return `sha256:${createHash("sha256").update(seed).digest("hex")}`;
}

function passingInput(
  overrides: Partial<MoralTradeCommitmentSettlementEvaluationInput> = {},
): MoralTradeCommitmentSettlementEvaluationInput {
  return {
    atomicSettlementGroups: [
      {
        allOrNoneState: "locked",
        atomicSettlementPolicyRef: "policy:atomic-settlement:v1",
        commitmentReservationRefs: ["commitment-reservation:lock"],
        createdAt: CHECKED_AT,
        failedMemberBehavior: "expire_group",
        matchedTradeLockProposalRefs: ["matched-lock:demo"],
        noIrreversiblePerformanceBeforeLock: true,
        noPartialCapture: true,
        noPartialDisclosure: true,
        recordId: "atomic-settlement:lock",
        requiredFinalConfirmationRefs: ["confirmation:a", "confirmation:b"],
        requiredParticipantCount: 2,
        requiredPaymentAuthorizationRefs: ["payment-authorization:lock"],
        reviewerDecisionRef: "review:atomic-settlement",
        tradeType: "pledge_swap",
        updatedAt: CHECKED_AT,
      },
    ],
    checkedAt: CHECKED_AT,
    commitmentInventories: [
      {
        actionUnit: "pledge-action",
        amountCents: 10000,
        commitmentInventoryPolicyRef: "policy:commitment-inventory:v1",
        commitmentType: "pledged_action",
        createdAt: CHECKED_AT,
        currency: "USD",
        fulfilledCapacityUnits: 0,
        inventoryState: "locked",
        negativeCommitmentScopeRef: null,
        noTradeBaselineSnapshotHash: hashFor("baseline"),
        participantIdHash: hashFor("participant"),
        performanceWindowEnd: "2026-07-13T00:00:00.000Z",
        performanceWindowStart: "2026-06-13T00:00:00.000Z",
        privacyGrantRefs: ["privacy-grant:lock"],
        recordId: "commitment-inventory:lock",
        reservedCapacityUnits: 1,
        reusePolicy: "exclusive",
        reviewerDecisionRef: "review:commitment-inventory",
        subjectId: "matched-lock:demo",
        subjectType: "matched_trade_lock_proposal",
        totalCapacityUnits: 1,
        updatedAt: CHECKED_AT,
      },
    ],
    commitmentReservations: [
      {
        clearedTradeAgreementRef: null,
        commitmentInventoryRecordRef: "commitment-inventory:lock",
        createdAt: CHECKED_AT,
        doubleCountCheckState: "passed",
        matchedTradeLockProposalRef: "matched-lock:demo",
        recordId: "commitment-reservation:lock",
        releaseReason: null,
        reservationScope: "performance_obligation",
        reservationState: "locked",
        reservedAmountCents: 10000,
        reservedUnits: 1,
        reviewerDecisionRef: "review:commitment-reservation",
        updatedAt: CHECKED_AT,
      },
    ],
    commitmentSettlementRequired: true,
    transition: "matched_trade_lock",
    ...overrides,
  };
}

test("commitment-settlement contract validates records and moraltrade68 release-gate hooks", () => {
  const contract = getMoralTradeCommitmentSettlementContract();
  const validation = validateMoralTradeCommitmentSettlementContract(contract);

  assert.equal(validation.status, "pass");
  assert.deepEqual(validation.blockers, []);
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_commitment_inventory_records"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_commitment_reservation_records"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_atomic_settlement_groups"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_commitment_settlement_enforcement_records"));
  assert.ok(contract.releaseGateTestHooks.includes("commitment_inventory_double_count_test"));
  assert.ok(contract.releaseGateTestHooks.includes("atomic_settlement_group_test"));
  assert.ok(contract.sampleEvaluations.some((sample) => sample.status === "pass"));
  assert.ok(contract.sampleEvaluations.some((sample) => sample.status === "blocked"));
});

test("locked inventory, reservation, and atomic group pass matched-trade lock", () => {
  const result = evaluateMoralTradeCommitmentSettlement(passingInput());

  assert.equal(result.status, "pass");
  assert.equal(result.reviewedRecordCount, 3);
  assert.equal(result.nonBlockingRecordCount, 3);
  assert.equal(result.reservedCommitmentCount, 1);
  assert.equal(result.atomicSettlementGroupCount, 1);
  assert.deepEqual(result.blockers, []);
});

test("over-reserved commitment inventory and failed double-count checks fail closed", () => {
  const result = evaluateMoralTradeCommitmentSettlement(
    passingInput({
      commitmentInventories: [
        {
          ...passingInput().commitmentInventories[0],
          fulfilledCapacityUnits: 1,
          reservedCapacityUnits: 1,
          totalCapacityUnits: 1,
        },
      ],
      commitmentReservations: [
        {
          ...passingInput().commitmentReservations[0],
          doubleCountCheckState: "blocked",
        },
      ],
    }),
  );

  assert.equal(result.status, "blocked");
  assert.ok(result.blockers.includes("commitment_inventory_double_count_capacity_exceeded:commitment-inventory:lock"));
  assert.ok(result.blockers.includes("commitment_reservation_double_count_blocking:commitment-reservation:lock:blocked"));
});

test("atomic settlement blocks partial capture and irreversible performance before lock", () => {
  const result = evaluateMoralTradeCommitmentSettlement(
    passingInput({
      atomicSettlementGroups: [
        {
          ...passingInput().atomicSettlementGroups[0],
          allOrNoneState: "waiting_for_authorizations",
          noIrreversiblePerformanceBeforeLock: false,
          noPartialCapture: false,
          noPartialDisclosure: false,
        },
      ],
      transition: "payment_capture",
    }),
  );

  assert.equal(result.status, "blocked");
  assert.ok(result.blockers.includes("atomic_settlement_state_not_locked:atomic-settlement:lock:waiting_for_authorizations"));
  assert.ok(result.blockers.includes("atomic_settlement_partial_capture_allowed:atomic-settlement:lock"));
  assert.ok(result.blockers.includes("atomic_settlement_partial_disclosure_allowed:atomic-settlement:lock"));
  assert.ok(result.blockers.includes("atomic_settlement_irreversible_performance_before_lock_allowed:atomic-settlement:lock"));
});

test("commitment-settlement enforcement route fails closed on invalid JSON", async () => {
  const response = await enforceCommitmentSettlement(
    new Request("http://localhost/api/moral-trade/commitment-settlement/enforce", {
      body: "{",
      headers: { "content-type": "application/json" },
      method: "POST",
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.ok, false);
  assert.equal(body.commitmentSettlementGateStatus, "blocked");
  assert.equal(body.runtimeTransitionAllowed, false);
  assert.equal(body.matchedTradeLockAllowed, false);
  assert.equal(body.paymentAuthorizationAllowed, false);
  assert.equal(body.paymentCaptureAllowed, false);
  assert.equal(body.performanceReleaseAllowed, false);
  assert.equal(body.publicMetricPublicationAllowed, false);
  assert.equal(body.releaseGatePromotionAllowed, false);
  assert.equal(body.stateMutation, false);
  assert.deepEqual(body.blockers, ["invalid_json_body"]);
});

test("commitment-settlement wiring covers API profile, rate limits, database tables, and schema", () => {
  const apiContractSource = readRepoFile("src/lib/moral-trade/api-contract.ts");
  const apiProfile = readRepoFile("config/moral-trade/api-contract-profile.json");
  const rateLimitSource = readRepoFile("src/lib/moral-trade/api-rate-limit.ts");
  const operationsSource = readRepoFile("src/lib/moral-trade/operations.ts");
  const operationsProfile = readRepoFile("config/moral-trade/operations-profile.json");
  const databaseTypes = readRepoFile("src/lib/supabase/database.types.ts");
  const migration = readRepoFile(
    "supabase/migrations/20260613_moral_trade_commitment_settlement_records.sql",
  );
  const schema = readRepoFile("supabase/schema.sql");
  const releaseGates = readRepoFile("src/lib/moral-trade/release-gates.ts");

  assert.match(apiContractSource, /moral_trade_commitment_settlement_contract/);
  assert.match(apiContractSource, /moral_trade_commitment_settlement_enforce/);
  assert.match(apiProfile, /commitment_settlement_contract_response/);
  assert.match(apiProfile, /commitment_settlement_enforce_request/);
  assert.match(apiProfile, /commitment_settlement_enforce_response/);
  assert.match(apiProfile, /commitment_settlement_enforce_route_contract/);
  assert.match(rateLimitSource, /commitment_settlement_enforce/);
  assert.match(operationsSource, /commitment_settlement_enforce/);
  assert.match(operationsProfile, /"key": "commitment_settlement_enforce"/);
  assert.match(databaseTypes, /moral_trade_commitment_inventory_records/);
  assert.match(databaseTypes, /moral_trade_atomic_settlement_groups/);
  assert.match(databaseTypes, /moral_trade_commitment_settlement_enforcement_records/);
  assert.match(migration, /create table if not exists public\.moral_trade_commitment_inventory_records/);
  assert.match(migration, /create table if not exists public\.moral_trade_commitment_reservation_records/);
  assert.match(migration, /create table if not exists public\.moral_trade_atomic_settlement_groups/);
  assert.match(migration, /reserved_capacity_units \+ fulfilled_capacity_units <= total_capacity_units/);
  assert.match(migration, /check \(no_partial_capture_bool = true\)/);
  assert.match(migration, /check \(performance_release_allowed_bool = false\)/);
  assert.match(schema, /moral_trade_commitment_settlement_enforcement_records/);
  assert.match(schema, /moral_trade_atomic_settlement_groups/);
  assert.match(releaseGates, /commitment_inventory_double_count_test/);
  assert.match(releaseGates, /atomic_settlement_group_test/);
});
