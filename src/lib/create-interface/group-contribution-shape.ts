import type { GroupContributionMode, ValidationIssue } from "./group-contribution";

interface Shape {
  readonly [key: string]: Shape | "value" | "record" | "array-value" | "array-record";
}

const COMMON_SHAPE: Shape = {
  schemaVersion: "value",
  execution: "value",
  mode: "value",
  participantLimit: "value",
  creatorParticipation: "value",
  participants: "array-record",
  visibility: "value",
  eligibility: "array-record",
  groupReference: {
    mode: "value",
    groupId: "value",
  },
  combination: "value",
  recruitmentDeadline: "value",
  agreementVersion: "value",
};

const CO_ACT_SHAPE: Shape = {
  ...COMMON_SHAPE,
  structure: "value",
  action: "value",
  roles: "array-record",
  activation: {
    mode: "value",
    creatorCounts: "value",
    minimumParticipants: "value",
    confirmationHours: "value",
  },
  performanceStart: {
    mode: "value",
    startsAt: "value",
  },
  lateJoining: "value",
  timing: "value",
  coordination: "value",
  duration: "value",
  frequency: "value",
  reward: {
    mode: "value",
    description: "value",
    allocationRule: "value",
    unit: "value",
  },
  additionality: {
    baselineSource: "value",
    baselineQuantity: "value",
    unit: "value",
    confidence: "value",
  },
  evidence: {
    verification: "value",
    allowedMisses: "value",
    gracePeriodHours: "value",
    makeUpAllowed: "value",
  },
  withdrawal: {
    preActivation: "value",
    postActivation: "value",
  },
  redistribution: {
    enabled: "value",
    formula: "value",
    participantMaximumQuantity: "value",
    replacementRecruitmentHours: "value",
    fallback: "value",
  },
  identity: {
    membersSeeAfterJoining: "value",
    publicAfterTerminalState: "value",
    terminalStateDisclosureConsentRequired: "value",
  },
  counterpartyParticipation: "value",
};

const CO_FUND_SHAPE: Shape = {
  ...COMMON_SHAPE,
  allocationMode: "value",
  project: {
    title: "value",
    description: "value",
    destinationId: "value",
    milestoneBasedPayout: "value",
  },
  settlementCurrency: "value",
  targetMinor: "value",
  allocation: {
    status: "value",
    shares: "array-record",
  },
  participantTerms: {
    maximumBudgetMinor: "value",
    noPoolDefault: "value",
    participationBeatsDefault: "value",
    preauthorizeExecutableFallback: "value",
  },
  confirmationHours: "value",
  paymentMethods: "array-value",
  paymentFailure: {
    repairWindowHours: "value",
    useWaitlistFirst: "value",
  },
  overfunding: "value",
  recurring: {
    mode: "value",
    frequency: "value",
    maximumPerCycleMinor: "value",
  },
  foreignExchange: {
    lockAt: "value",
    restartConfirmationOnMaterialChange: "value",
  },
  failure: {
    deadlineOutcome: "value",
    extensionHours: "value",
    underThresholdFallback: "value",
  },
};


const ACCOUNT_PARTICIPANT_SHAPE: Shape = {
  rowId: "value",
  kind: "value",
  profileId: "value",
  usernameSnapshot: "value",
  displayNameSnapshot: "value",
  accountType: "value",
  verification: "value",
  publicMention: "value",
  invitationState: "value",
  isCreator: "value",
};

const EXTERNAL_PARTICIPANT_SHAPE: Shape = {
  rowId: "value",
  kind: "value",
  displayNameSnapshot: "value",
  deliveryChannel: "value",
  publicMention: "value",
  invitationState: "value",
  isCreator: "value",
};

const ELIGIBILITY_SHAPE: Shape = {
  type: "value",
  minimum: "value",
  verification: "value",
  location: "value",
  skill: "value",
};

const ROLE_SHAPE: Shape = {
  id: "value",
  title: "value",
  obligation: "value",
  quantity: "value",
  unit: "value",
  transferable: "value",
  requiredSkills: "array-value",
  requiredLocations: "array-value",
};

const SHARE_SHAPE: Shape = {
  participantId: "value",
  amountMinor: "value",
};

export function validateGroupContributionNestedShape(input: unknown): ValidationIssue[] {
  if (!isRecord(input)) return [];
  const mode = input.mode as GroupContributionMode | undefined;
  const shape = mode === "co-act" ? CO_ACT_SHAPE : mode === "co-fund" ? CO_FUND_SHAPE : undefined;
  if (!shape) return [];

  const issues: ValidationIssue[] = [];
  inspectRecord(input, shape, "", issues);

  if (Array.isArray(input.participants)) {
    input.participants.forEach((participant, index) => {
      if (!isRecord(participant)) return;
      const participantShape = participant.kind === "external-claim"
        ? EXTERNAL_PARTICIPANT_SHAPE
        : ACCOUNT_PARTICIPANT_SHAPE;
      inspectRecord(participant, participantShape, `participants[${index}]`, issues);
    });
  }

  if (Array.isArray(input.eligibility)) {
    input.eligibility.forEach((criterion, index) => {
      if (isRecord(criterion)) inspectRecord(criterion, ELIGIBILITY_SHAPE, `eligibility[${index}]`, issues);
    });
  }

  if (mode === "co-act" && Array.isArray(input.roles)) {
    input.roles.forEach((role, index) => {
      if (isRecord(role)) inspectRecord(role, ROLE_SHAPE, `roles[${index}]`, issues);
    });
  }

  if (mode === "co-fund" && isRecord(input.allocation) && Array.isArray(input.allocation.shares)) {
    input.allocation.shares.forEach((share, index) => {
      if (isRecord(share)) {
        inspectRecord(share, SHARE_SHAPE, `allocation.shares[${index}]`, issues);
      }
    });
  }

  return issues;
}

function inspectRecord(
  value: Record<string, unknown>,
  shape: Shape,
  path: string,
  issues: ValidationIssue[],
): void {
  for (const [key, nested] of Object.entries(value)) {
    const nextPath = path ? `${path}.${key}` : key;
    const expected = shape[key];
    if (!expected) {
      issues.push({
        path: nextPath,
        code: "unknown-field",
        message: `Unsupported group-contribution field: ${nextPath}`,
      });
      continue;
    }

    if (typeof expected === "object" && isRecord(nested)) {
      inspectRecord(nested, expected, nextPath, issues);
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
