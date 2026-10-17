import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateIncrementalQuantity,
  GROUP_CONTRIBUTION_SCHEMA_VERSION,
  summarizeGroupContribution,
  validateGroupContributionTerms,
  type CoActTerms,
  type CoFundTerms,
} from "./group-contribution";
import type { AccountParticipantTarget } from "./participant-target";

function creatorTarget(): AccountParticipantTarget {
  return {
    rowId: "creator-row",
    kind: "account",
    profileId: "11111111-1111-4111-8111-111111111111",
    usernameSnapshot: "creator-example",
    displayNameSnapshot: "Creator Example",
    accountType: "individual",
    verification: "identity-verified",
    publicMention: "username",
    invitationState: "draft",
    isCreator: true,
  };
}

function validCoAct(): CoActTerms {
  return {
    schemaVersion: GROUP_CONTRIBUTION_SCHEMA_VERSION,
    execution: "proposal-only",
    mode: "co-act",
    participantLimit: 10,
    creatorParticipation: "participating",
    participants: [creatorTarget()],
    visibility: "public",
    eligibility: [
      {
        type: "minimum-reliability",
        minimum: 60,
        verification: "profile-verified",
      },
    ],
    groupReference: { mode: "create-new" },
    combination: "alternative",
    recruitmentDeadline: "2026-09-01T12:00:00.000Z",
    agreementVersion: 1,
    structure: "same-action",
    action: "Avoid meat for one meal per week",
    roles: [
      {
        id: "same-action",
        title: "Participant",
        obligation: "Avoid meat for one meal per week",
        quantity: 1,
        unit: "meal per week",
        transferable: true,
        requiredSkills: [],
        requiredLocations: [],
      },
    ],
    activation: {
      mode: "minimum-participants",
      minimumParticipants: 10,
      creatorCounts: true,
      confirmationHours: 24,
    },
    performanceStart: { mode: "on-activation" },
    lateJoining: "closed-after-activation",
    timing: "same-period",
    coordination: "announcements",
    duration: "12 weeks",
    frequency: "once per week",
    reward: {
      mode: "fixed-group",
      description: "The linked trade reward",
      allocationRule: "Pro rata by verified incremental meals",
    },
    additionality: {
      baselineSource: "self-report",
      baselineQuantity: 0,
      unit: "meat-free meals per week",
      confidence: "medium",
    },
    evidence: {
      verification: "self-declared",
      allowedMisses: 1,
      gracePeriodHours: 48,
      makeUpAllowed: true,
    },
    withdrawal: {
      preActivation: "allowed",
      postActivation: "recorded-nonperformance",
    },
    redistribution: {
      enabled: true,
      formula: "equal",
      participantMaximumQuantity: 3,
      replacementRecruitmentHours: 72,
      fallback: "reduced-output-and-reward",
    },
    identity: {
      membersSeeAfterJoining: true,
      publicAfterTerminalState: true,
      terminalStateDisclosureConsentRequired: true,
    },
    counterpartyParticipation: "explicitly-excluded",
  };
}

function validCoFund(): CoFundTerms {
  return {
    schemaVersion: GROUP_CONTRIBUTION_SCHEMA_VERSION,
    execution: "proposal-only",
    mode: "co-fund",
    participantLimit: 10,
    creatorParticipation: "participating",
    participants: [creatorTarget()],
    visibility: "unlisted",
    eligibility: [],
    groupReference: { mode: "create-new" },
    combination: "alternative",
    recruitmentDeadline: "2026-09-01T12:00:00.000Z",
    agreementVersion: 1,
    allocationMode: "equal-share",
    project: {
      title: "Existential-risk research brief",
      description: "Commission one fixed research brief.",
      destinationId: "project-xr-brief",
      milestoneBasedPayout: true,
    },
    settlementCurrency: "USD",
    targetMinor: 5_000,
    allocation: {
      status: "frozen",
      shares: Array.from({ length: 10 }, (_, index) => ({
        participantId: `participant-${index + 1}`,
        amountMinor: 500,
      })),
    },
    participantTerms: {
      maximumBudgetMinor: 1_000,
      noPoolDefault: "Donate the same budget to another approved project",
      participationBeatsDefault: true,
      preauthorizeExecutableFallback: false,
    },
    confirmationHours: 24,
    paymentMethods: ["wallet", "card-or-ach"],
    paymentFailure: {
      repairWindowHours: 24,
      useWaitlistFirst: true,
    },
    overfunding: "proportional-reduction",
    recurring: { mode: "none" },
    foreignExchange: {
      lockAt: "final-confirmation",
      restartConfirmationOnMaterialChange: true,
    },
    failure: {
      deadlineOutcome: "release-reservations",
      underThresholdFallback: "expire-trade",
    },
  };
}

test("accepts a valid same-action Co-Act proposal", () => {
  const result = validateGroupContributionTerms(validCoAct(), "nonfinancial");
  assert.equal(result.ok, true);
});

test("rejects Co-Act on a financial contribution", () => {
  const result = validateGroupContributionTerms(validCoAct(), "financial");
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert(result.issues.some((issue) => issue.code === "incompatible-contribution"));
  }
});

test("enforces the universal participant ceiling", () => {
  const proposal = { ...validCoAct(), participantLimit: 101 };
  const result = validateGroupContributionTerms(proposal, "nonfinancial");
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert(result.issues.some((issue) => issue.code === "participant-limit"));
  }
});

test("requires at least two roles for a complementary-role Co-Act", () => {
  const proposal = { ...validCoAct(), structure: "complementary-roles" as const };
  const result = validateGroupContributionTerms(proposal, "nonfinancial");
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert(result.issues.some((issue) => issue.path === "roles"));
  }
});

test("requires invitation-only members to see one another after joining", () => {
  const base = validCoAct();
  const proposal = {
    ...base,
    visibility: "invitation-only" as const,
    identity: { ...base.identity, membersSeeAfterJoining: false },
  };
  const result = validateGroupContributionTerms(proposal, "nonfinancial");
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert(result.issues.some((issue) => issue.path === "identity.membersSeeAfterJoining"));
  }
});

test("rejects client-supplied executable authority at any depth", () => {
  const proposal = {
    ...validCoAct(),
    evidence: {
      ...validCoAct().evidence,
      evidenceVerified: true,
    },
  };
  const result = validateGroupContributionTerms(proposal, "nonfinancial");
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert(result.issues.some((issue) => issue.code === "private-or-executable-field"));
  }
});

test("accepts a frozen Co-Fund whose integer shares exactly cover the target", () => {
  const result = validateGroupContributionTerms(validCoFund(), "financial");
  assert.equal(result.ok, true);
});

test("rejects a frozen Co-Fund with an uncovered target", () => {
  const base = validCoFund();
  const proposal = {
    ...base,
    allocation: {
      ...base.allocation,
      shares: base.allocation.shares.slice(0, 9),
    },
  };
  const result = validateGroupContributionTerms(proposal, "financial");
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert(result.issues.some((issue) => issue.code === "allocation-mismatch"));
  }
});

test("rejects duplicate participants in a Co-Fund allocation", () => {
  const base = validCoFund();
  const shares = base.allocation.shares.map((share) => ({ ...share }));
  shares[1] = { ...shares[1], participantId: shares[0].participantId };
  const proposal = { ...base, allocation: { ...base.allocation, shares } };
  const result = validateGroupContributionTerms(proposal, "financial");
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert(result.issues.some((issue) => issue.code === "duplicate-participant"));
  }
});

test("requires the selected 24-hour unanimous final-confirmation period", () => {
  const proposal = { ...validCoFund(), confirmationHours: 12 };
  const result = validateGroupContributionTerms(proposal, "financial");
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert(result.issues.some((issue) => issue.path === "confirmationHours"));
  }
});

test("rejects private custom-split values from the ordinary proposal payload", () => {
  const proposal = {
    ...validCoFund(),
    allocationMode: "custom-split" as const,
    participantTerms: {
      ...validCoFund().participantTerms,
      privateValue: 9_000,
    },
  };
  const result = validateGroupContributionTerms(proposal, "financial");
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert(result.issues.some((issue) => issue.code === "private-or-executable-field"));
  }
});

test("rejects unknown top-level terms instead of silently accepting them", () => {
  const proposal = { ...validCoFund(), automaticCapture: true };
  const result = validateGroupContributionTerms(proposal, "financial");
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert(result.issues.some((issue) => issue.code === "unknown-field"));
  }
});

test("requires the creator participation decision to match the participant list", () => {
  const proposal = {
    ...validCoAct(),
    creatorParticipation: "organizer-only" as const,
  };
  const result = validateGroupContributionTerms(proposal, "nonfinancial");
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert(result.issues.some((issue) => issue.path === "participants"));
  }
});

test("rejects duplicate account participants", () => {
  const target = creatorTarget();
  const proposal = {
    ...validCoAct(),
    participants: [target, { ...target, rowId: "duplicate-row", isCreator: false }],
  };
  const result = validateGroupContributionTerms(proposal, "nonfinancial");
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert(result.issues.some((issue) => issue.path === "participants"));
  }
});

test("calculates impact credit only for verified performance above baseline", () => {
  assert.equal(calculateIncrementalQuantity(3, 2), 1);
  assert.equal(calculateIncrementalQuantity(1, 2), 0);
  assert.throws(() => calculateIncrementalQuantity(-1, 0), RangeError);
});

test("generates deterministic compact summaries", () => {
  assert.equal(
    summarizeGroupContribution(validCoAct()),
    "I will avoid meat for one meal per week if 9 other people join.",
  );
  assert.equal(
    summarizeGroupContribution(validCoFund()),
    "$50 target · $5 each · 10 funded slots.",
  );
});

test("requires invitation-only identities to become public after any terminal state", () => {
  const base = validCoAct();
  const proposal = {
    ...base,
    visibility: "invitation-only" as const,
    identity: {
      ...base.identity,
      publicAfterTerminalState: false,
    },
  };
  const result = validateGroupContributionTerms(proposal, "nonfinancial");
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert(
      result.issues.some(
        (issue) => issue.path === "identity.publicAfterTerminalState",
      ),
    );
  }
});
