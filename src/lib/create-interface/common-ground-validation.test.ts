import assert from "node:assert/strict";
import test from "node:test";

import { CREATE_INTERFACE_VERSION, type MoralTradeCreatePayload } from "./types";
import { validateCreatePayload } from "./validation";

function futureDeadline() {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
}

function profileId(index: number) {
  return `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

function accountTarget(index: number, options: { isCreator?: boolean } = {}) {
  return {
    rowId: `cg-account-${index}`,
    kind: "account",
    profileId: profileId(index),
    usernameSnapshot: `participant-${index}`,
    displayNameSnapshot: `Participant ${index}`,
    accountType: "individual",
    verification: "none",
    publicMention: "username",
    invitationState: "draft",
    isCreator: options.isCreator === true,
  } as const;
}

function externalTarget(index: number) {
  return {
    rowId: `cg-external-${index}`,
    kind: "external-claim",
    displayNameSnapshot: `External participant ${index}`,
    deliveryChannel: "claim-link",
    publicMention: "unclaimed-invitee",
    invitationState: "draft",
    isCreator: false,
  } as const;
}

function creatorTerms() {
  return {
    maximumBudgetMinor: 1_000_000,
    noPoolDefault: "Animal-welfare project",
    participationBeatsDefault: true,
    preauthorizeExecutableFallback: false,
  } as const;
}

function commonGroundPayload(): MoralTradeCreatePayload {
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
        allocationStatus: "open",
        creatorParticipation: "participating",
        privateValueEstimatesStored: false,
        participants: [
          {
            target: accountTarget(1, { isCreator: true }),
            participantTerms: creatorTerms(),
          },
          {
            target: accountTarget(2),
            participantTerms: null,
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
      activationRule:
        "Every selected participant must accept, enter their own private terms, and unanimously confirm the final allocation before the Co-Fund can open.",
    },
    groupContributionTerms: null,
  };
}

test("validates a participant-bound proposal with an open allocation", () => {
  const result = validateCreatePayload(commonGroundPayload());
  const terms = result.poolTerms?.commonGround;
  const serializedTerms = JSON.stringify(terms);

  assert.equal(result.kind, "pool_create");
  assert.equal(terms?.targetAmountCents, 1_000_000);
  assert.equal(terms?.allocationStatus, "open");
  assert.equal(terms?.creatorParticipation, "participating");
  assert.equal(terms?.participants.length, 2);
  assert.equal(terms?.participants[0]?.target.kind, "account");
  assert.equal(terms?.participants[0]?.target.isCreator, true);
  assert.equal(terms?.participants[1]?.participantTerms, null);
  assert.equal(terms?.privateValueEstimatesStored, false);
  assert.equal(serializedTerms.includes("contributionCents"), false);
  assert.equal(serializedTerms.includes("privateValueBps"), false);
  assert.equal(serializedTerms.includes("email"), false);
  assert.equal(serializedTerms.includes("phone"), false);
});

test("accepts an organizer-only creator who is not counted as a participant", () => {
  const input = commonGroundPayload();
  input.pool!.commonGround!.creatorParticipation = "organizer-only";
  input.pool!.commonGround!.participants = [
    { target: accountTarget(2), participantTerms: null },
    { target: externalTarget(3), participantTerms: null },
  ];

  const result = validateCreatePayload(input);
  assert.equal(result.poolTerms?.commonGround?.creatorParticipation, "organizer-only");
  assert.equal(
    result.poolTerms?.commonGround?.participants.some((participant) => participant.target.isCreator),
    false,
  );
});

test("rejects free-text identity and creator-entered terms for another participant", () => {
  const freeText = commonGroundPayload();
  Object.assign(freeText.pool!.commonGround!.participants[1]!, {
    name: "Typed but not selected",
  });
  assert.throws(() => validateCreatePayload(freeText), /unsupported or private field/i);

  const impersonatedTerms = commonGroundPayload();
  impersonatedTerms.pool!.commonGround!.participants[1]!.participantTerms = creatorTerms();
  assert.throws(
    () => validateCreatePayload(impersonatedTerms),
    /cannot enter another participant's private or financial terms/i,
  );
});

test("rejects duplicate account identities and creator-state mismatches", () => {
  const duplicate = commonGroundPayload();
  duplicate.pool!.commonGround!.participants[1]!.target = {
    ...accountTarget(1),
    rowId: "cg-account-duplicate",
  };
  assert.throws(() => validateCreatePayload(duplicate), /same account cannot be added twice/i);

  const missingCreator = commonGroundPayload();
  missingCreator.pool!.commonGround!.participants[0]!.target = accountTarget(1);
  missingCreator.pool!.commonGround!.participants[0]!.participantTerms = null;
  assert.throws(() => validateCreatePayload(missingCreator), /participating creator/i);
});

test("requires the Co-Fund target to match the single public threshold", () => {
  const input = commonGroundPayload();
  input.pool!.thresholds[0]!.amount = "9000";

  assert.throws(
    () => validateCreatePayload(input),
    /one threshold equal to its shared target/i,
  );
});

test("accepts the universal Co-Fund participant ceiling of 100", () => {
  const input = commonGroundPayload();
  input.pool!.commonGround!.creatorParticipation = "organizer-only";
  input.pool!.commonGround!.participants = Array.from({ length: 100 }, (_, index) => ({
    target: externalTarget(index + 1),
    participantTerms: null,
  }));

  const result = validateCreatePayload(input);
  assert.equal(result.poolTerms?.commonGround?.participants.length, 100);
});

test("rejects a Co-Fund with more than 100 participants", () => {
  const input = commonGroundPayload();
  input.pool!.commonGround!.creatorParticipation = "organizer-only";
  input.pool!.commonGround!.participants = Array.from({ length: 101 }, (_, index) => ({
    target: externalTarget(index + 1),
    participantTerms: null,
  }));

  assert.throws(
    () => validateCreatePayload(input),
    /between 2 and 100 participants|between two and 100 participants/i,
  );
});
