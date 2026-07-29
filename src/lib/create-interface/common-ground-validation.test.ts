import assert from "node:assert/strict";
import test from "node:test";

import { CREATE_INTERFACE_VERSION } from "./types";
import { validateCreatePayload } from "./validation";

function futureDeadline() {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
}

function commonGroundPayload() {
  return {
    interfaceVersion: CREATE_INTERFACE_VERSION,
    submissionKey: "create-unit-common-ground",
    cause: "Future flourishing",
    requestKind: "fund",
    fundMode: "dac",
    dacPath: "create",
    requestAction: "Shared research and coordination",
    existingPoolAmount: "",
    existingPoolCurrency: "USD",
    offers: [],
    pool: {
      commonGround: {
        targetAmountCents: 1_000_000,
        calculationPolicy: "balanced_surplus_v1",
        privateValueEstimatesStored: false,
        participantGainChecked: true,
        baselineConfirmed: true,
        participants: [
          {
            id: "cg-a",
            name: "Participant A",
            defaultProject: "Animal-welfare project",
            budgetCents: 1_000_000,
            contributionCents: 500_000,
          },
          {
            id: "cg-b",
            name: "Participant B",
            defaultProject: "Long-term-future project",
            budgetCents: 1_000_000,
            contributionCents: 500_000,
          },
        ],
      },
      thresholds: [{ amount: "10000" }],
      deadline: futureDeadline(),
      failureBonusType: "none",
      failureBonusAmount: "",
      failureBonusPercent: "",
      failureBonusFunction: "",
      failureTimingMode: "all",
      timingCutoffMethod: "period",
      timingCutoffPercent: "50",
      timingCutoffDate: "",
      timingContributorPercent: "20",
      timingPreset: "linear",
      timingPiecewiseBands: [{ end: "100", multiplier: "100" }],
      timingFormula: "1 - t",
      timingFormulaAcknowledged: false,
      continuation: "stop",
      thresholdVisibility: "public_exact",
      progressVisibility: "exact",
      moralTradeBonusShare: "0",
      activationRule: "Every named participant confirms the frozen split.",
    },
  };
}

test("validates a compact Common Ground Pool without private value estimates", () => {
  const result = validateCreatePayload(commonGroundPayload());
  const serializedTerms = JSON.stringify(result.poolTerms?.commonGround);

  assert.equal(result.kind, "pool_create");
  assert.equal(result.poolTerms?.commonGround?.targetAmountCents, 1_000_000);
  assert.equal(result.poolTerms?.commonGround?.participants.length, 2);
  assert.equal(result.poolTerms?.commonGround?.privateValueEstimatesStored, false);
  assert.equal(serializedTerms.includes("privateValueBps"), false);
  assert.equal(serializedTerms.includes("sharedValueBps"), false);
});

test("rejects Common Ground contribution totals that miss the target", () => {
  const input = commonGroundPayload();
  input.pool.commonGround.participants[0].contributionCents = 400_000;

  assert.throws(
    () => validateCreatePayload(input),
    /contributions must equal the target/i,
  );
});

test("rejects private Common Ground values in the submitted participant record", () => {
  const input = commonGroundPayload();
  Object.assign(input.pool.commonGround.participants[0], { privateValueBps: 6000 });

  assert.throws(
    () => validateCreatePayload(input),
    /unsupported or private field/i,
  );
});

test("requires the Common Ground target to match the single public threshold", () => {
  const input = commonGroundPayload();
  input.pool.thresholds[0].amount = "9000";

  assert.throws(
    () => validateCreatePayload(input),
    /one threshold equal to its shared target/i,
  );
});
