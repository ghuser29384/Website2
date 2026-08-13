import {
  validateParticipantOwnedFundingTerms,
  validateParticipantTargets,
  type CreatorParticipation,
  type ParticipantOwnedFundingTerms,
  type ParticipantTarget,
} from "./participant-target";

export const GROUP_CONTRIBUTION_SCHEMA_VERSION = 1 as const;
export const MAX_GROUP_PARTICIPANTS = 100 as const;
export const COFUND_CONFIRMATION_HOURS = 24 as const;

export type UnderlyingContributionKind = "financial" | "nonfinancial";
export type GroupContributionMode = "co-act" | "co-fund";
export type GroupVisibility = "public" | "unlisted" | "invitation-only";
export type GroupCombination = "alternative" | "cumulative";
export type VerificationLevel =
  | "self-declared"
  | "profile-verified"
  | "document-verified"
  | "independently-verified";

export type EligibilityCriterion =
  | {
      type: "minimum-reliability";
      minimum: number;
      verification: "profile-verified" | "independently-verified";
    }
  | {
      type: "geography";
      location: string;
      verification: VerificationLevel;
    }
  | {
      type: "skill";
      skill: string;
      verification: VerificationLevel;
    }
  | {
      type: "invitation";
      verification: "profile-verified" | "independently-verified";
    };

export interface ExistingGroupReference {
  mode: "create-new" | "attach-existing";
  groupId?: string;
}

export interface GroupContributionCommon {
  schemaVersion: typeof GROUP_CONTRIBUTION_SCHEMA_VERSION;
  execution: "proposal-only";
  mode: GroupContributionMode;
  participantLimit: number;
  creatorParticipation: CreatorParticipation;
  participants: ParticipantTarget[];
  visibility: GroupVisibility;
  eligibility: EligibilityCriterion[];
  groupReference: ExistingGroupReference;
  combination: GroupCombination;
  recruitmentDeadline?: string;
  agreementVersion: number;
}

export interface CoActRole {
  id: string;
  title: string;
  obligation: string;
  quantity?: number;
  unit?: string;
  transferable: boolean;
  requiredSkills: string[];
  requiredLocations: string[];
}

export interface CoActTerms extends GroupContributionCommon {
  mode: "co-act";
  structure: "same-action" | "complementary-roles";
  action: string;
  roles: CoActRole[];
  activation:
    | {
        mode: "independent";
        creatorCounts: boolean;
      }
    | {
        mode: "minimum-participants";
        minimumParticipants: number;
        creatorCounts: boolean;
        confirmationHours?: number;
      };
  performanceStart:
    | { mode: "on-activation" }
    | { mode: "scheduled"; startsAt: string };
  lateJoining: "closed-after-activation" | "original-end-date" | "full-duration";
  timing: "same-period" | "same-time";
  coordination: "notifications-only" | "announcements" | "discussion-thread";
  duration?: string;
  frequency?: string;
  reward:
    | {
        mode: "fixed-group";
        description: string;
        allocationRule: string;
      }
    | {
        mode: "per-participant-or-unit";
        description: string;
        unit: string;
      };
  additionality: {
    baselineSource: "verified-history" | "self-report" | "mixed";
    baselineQuantity: number;
    unit: string;
    confidence: "low" | "medium" | "high";
  };
  evidence: {
    verification: VerificationLevel;
    allowedMisses: number;
    gracePeriodHours: number;
    makeUpAllowed: boolean;
  };
  withdrawal: {
    preActivation: "allowed";
    postActivation: "recorded-nonperformance" | "authorized-by-terms";
  };
  redistribution: {
    enabled: boolean;
    formula?: "equal" | "proportional-to-base" | "role-specific";
    participantMaximumQuantity?: number;
    replacementRecruitmentHours?: number;
    fallback:
      | "reduced-output-and-reward"
      | "end-future-performance"
      | "withdraw-without-penalty"
      | "terminate"
      | "new-version";
  };
  identity: {
    membersSeeAfterJoining: boolean;
    publicAfterTerminalState: boolean;
    terminalStateDisclosureConsentRequired: true;
  };
  counterpartyParticipation: "not-applicable" | "explicitly-included" | "explicitly-excluded";
}

export type CoFundAllocationMode =
  | "equal-share"
  | "flexible-contribution"
  | "custom-split"
  | "matching-pledge";

export interface CoFundShare {
  participantId: string;
  amountMinor: number;
}

export interface CoFundTerms extends GroupContributionCommon {
  mode: "co-fund";
  allocationMode: CoFundAllocationMode;
  project: {
    title: string;
    description: string;
    destinationId?: string;
    milestoneBasedPayout: boolean;
  };
  settlementCurrency: string;
  targetMinor: number;
  allocation:
    | {
        status: "open";
        shares: CoFundShare[];
      }
    | {
        status: "frozen";
        shares: CoFundShare[];
      };
  participantTerms: ParticipantOwnedFundingTerms | null;
  confirmationHours: typeof COFUND_CONFIRMATION_HOURS;
  paymentMethods: Array<"wallet" | "card-or-ach" | "escrow">;
  paymentFailure: {
    repairWindowHours: number;
    useWaitlistFirst: true;
  };
  overfunding: "proportional-reduction";
  recurring:
    | { mode: "none" }
    | {
        mode: "standing-authorization" | "confirm-each-cycle";
        frequency: string;
        maximumPerCycleMinor: number;
      };
  foreignExchange: {
    lockAt: "final-confirmation";
    restartConfirmationOnMaterialChange: true;
  };
  failure: {
    deadlineOutcome:
      | "release-reservations"
      | "one-extension"
      | "new-round"
      | "participant-vote";
    extensionHours?: number;
    underThresholdFallback: "expire-trade" | "alternative-offer" | "renegotiate";
  };
}

export type GroupContributionTerms = CoActTerms | CoFundTerms;

export interface ValidationIssue {
  path: string;
  code:
    | "invalid-type"
    | "unknown-field"
    | "missing-field"
    | "invalid-value"
    | "incompatible-contribution"
    | "participant-limit"
    | "allocation-mismatch"
    | "duplicate-participant"
    | "private-or-executable-field";
  message: string;
}

export type ValidationResult =
  | { ok: true; value: GroupContributionTerms; issues: [] }
  | { ok: false; issues: ValidationIssue[] };

const EXECUTABLE_OR_PRIVATE_KEYS = new Set([
  "activate",
  "activated",
  "activationState",
  "authorizationId",
  "bankAccount",
  "bridgeApproved",
  "bridgeAmount",
  "capture",
  "captureId",
  "cardNumber",
  "clientSecret",
  "confirmedEvidence",
  "creditScoreDelta",
  "cvv",
  "encryptedPrivateValue",
  "evidenceVerified",
  "executeFallback",
  "impactAwarded",
  "paymentIntent",
  "paymentMethodId",
  "privateValue",
  "publishIdentities",
  "reliabilityDelta",
  "repaymentMandate",
  "routingNumber",
  "subsidyAmount",
  "verifiedImpactCredit",
]);

const COMMON_KEYS = new Set([
  "schemaVersion",
  "execution",
  "mode",
  "participantLimit",
  "creatorParticipation",
  "participants",
  "visibility",
  "eligibility",
  "groupReference",
  "combination",
  "recruitmentDeadline",
  "agreementVersion",
]);

const COACT_KEYS = new Set([
  ...COMMON_KEYS,
  "structure",
  "action",
  "roles",
  "activation",
  "performanceStart",
  "lateJoining",
  "timing",
  "coordination",
  "duration",
  "frequency",
  "reward",
  "additionality",
  "evidence",
  "withdrawal",
  "redistribution",
  "identity",
  "counterpartyParticipation",
]);

const COFUND_KEYS = new Set([
  ...COMMON_KEYS,
  "allocationMode",
  "project",
  "settlementCurrency",
  "targetMinor",
  "allocation",
  "participantTerms",
  "confirmationHours",
  "paymentMethods",
  "paymentFailure",
  "overfunding",
  "recurring",
  "foreignExchange",
  "failure",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNonNegativeFinite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && typeof value === "number" && value > 0;
}

function addIssue(
  issues: ValidationIssue[],
  path: string,
  code: ValidationIssue["code"],
  message: string,
): void {
  issues.push({ path, code, message });
}

function inspectForbiddenKeys(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => inspectForbiddenKeys(item, `${path}[${index}]`, issues));
    return;
  }
  if (!isRecord(value)) return;

  for (const [key, nested] of Object.entries(value)) {
    const nextPath = path ? `${path}.${key}` : key;
    if (EXECUTABLE_OR_PRIVATE_KEYS.has(key)) {
      addIssue(
        issues,
        nextPath,
        "private-or-executable-field",
        `${key} cannot be supplied by a proposal payload`,
      );
    }
    inspectForbiddenKeys(nested, nextPath, issues);
  }
}

function rejectUnknownTopLevelFields(
  value: Record<string, unknown>,
  allowed: Set<string>,
  issues: ValidationIssue[],
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      addIssue(issues, key, "unknown-field", `Unsupported group-contribution field: ${key}`);
    }
  }
}

function validateIsoDate(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!isNonEmptyString(value) || Number.isNaN(Date.parse(value))) {
    addIssue(issues, path, "invalid-value", "Expected an ISO-compatible date-time");
  }
}

function validateCommon(
  value: Record<string, unknown>,
  expectedMode: GroupContributionMode,
  issues: ValidationIssue[],
): void {
  if (value.schemaVersion !== GROUP_CONTRIBUTION_SCHEMA_VERSION) {
    addIssue(issues, "schemaVersion", "invalid-value", "Unsupported schema version");
  }
  if (value.execution !== "proposal-only") {
    addIssue(
      issues,
      "execution",
      "private-or-executable-field",
      "The Create release accepts proposal-only group terms",
    );
  }
  if (value.mode !== expectedMode) {
    addIssue(issues, "mode", "invalid-value", `Expected ${expectedMode}`);
  }
  if (!isPositiveInteger(value.participantLimit) || value.participantLimit > MAX_GROUP_PARTICIPANTS) {
    addIssue(
      issues,
      "participantLimit",
      "participant-limit",
      `Participant limit must be an integer from 1 through ${MAX_GROUP_PARTICIPANTS}`,
    );
  }
  if (!(
    ["participating", "organizer-only"] as unknown[]
  ).includes(value.creatorParticipation)) {
    addIssue(
      issues,
      "creatorParticipation",
      "missing-field",
      "Choose whether the creator is participating or organizing only",
    );
  }

  if (!Array.isArray(value.participants)) {
    addIssue(issues, "participants", "invalid-type", "Participants must be an array");
  } else if (
    value.creatorParticipation === "participating" ||
    value.creatorParticipation === "organizer-only"
  ) {
    try {
      validateParticipantTargets(value.participants, {
        minimum: 0,
        maximum: isPositiveInteger(value.participantLimit)
          ? Math.min(value.participantLimit, MAX_GROUP_PARTICIPANTS)
          : MAX_GROUP_PARTICIPANTS,
        creatorParticipation: value.creatorParticipation,
      });
    } catch (error) {
      addIssue(
        issues,
        "participants",
        /twice|unique/iu.test(error instanceof Error ? error.message : "")
          ? "duplicate-participant"
          : "invalid-value",
        error instanceof Error ? error.message : "Participant identities are invalid",
      );
    }
  }

  if (!(["public", "unlisted", "invitation-only"] as unknown[]).includes(value.visibility)) {
    addIssue(issues, "visibility", "invalid-value", "Unsupported visibility");
  }
  if (!(["alternative", "cumulative"] as unknown[]).includes(value.combination)) {
    addIssue(issues, "combination", "invalid-value", "Unsupported combination rule");
  }
  if (!isPositiveInteger(value.agreementVersion)) {
    addIssue(issues, "agreementVersion", "invalid-value", "Agreement version must be positive");
  }
  if (value.recruitmentDeadline !== undefined) {
    validateIsoDate(value.recruitmentDeadline, "recruitmentDeadline", issues);
  }

  validateEligibility(value.eligibility, issues);
  validateGroupReference(value.groupReference, issues);
}

function validateEligibility(value: unknown, issues: ValidationIssue[]): void {
  if (!Array.isArray(value)) {
    addIssue(issues, "eligibility", "invalid-type", "Eligibility must be an array");
    return;
  }

  value.forEach((criterion, index) => {
    const path = `eligibility[${index}]`;
    if (!isRecord(criterion)) {
      addIssue(issues, path, "invalid-type", "Eligibility criterion must be an object");
      return;
    }
    const type = criterion.type;
    if (type === "minimum-reliability") {
      if (!isNonNegativeFinite(criterion.minimum) || criterion.minimum > 100) {
        addIssue(issues, `${path}.minimum`, "invalid-value", "Reliability minimum must be 0–100");
      }
      if (!["profile-verified", "independently-verified"].includes(String(criterion.verification))) {
        addIssue(issues, `${path}.verification`, "invalid-value", "Unsupported verification level");
      }
      return;
    }
    if (type === "geography") {
      if (!isNonEmptyString(criterion.location)) {
        addIssue(issues, `${path}.location`, "missing-field", "Location is required");
      }
      validateVerificationLevel(criterion.verification, `${path}.verification`, issues);
      return;
    }
    if (type === "skill") {
      if (!isNonEmptyString(criterion.skill)) {
        addIssue(issues, `${path}.skill`, "missing-field", "Skill is required");
      }
      validateVerificationLevel(criterion.verification, `${path}.verification`, issues);
      return;
    }
    if (type === "invitation") {
      if (!["profile-verified", "independently-verified"].includes(String(criterion.verification))) {
        addIssue(issues, `${path}.verification`, "invalid-value", "Unsupported verification level");
      }
      return;
    }
    addIssue(issues, `${path}.type`, "invalid-value", "Unsupported eligibility criterion");
  });
}

function validateVerificationLevel(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (
    ![
      "self-declared",
      "profile-verified",
      "document-verified",
      "independently-verified",
    ].includes(String(value))
  ) {
    addIssue(issues, path, "invalid-value", "Unsupported verification level");
  }
}

function validateGroupReference(value: unknown, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    addIssue(issues, "groupReference", "invalid-type", "Group reference must be an object");
    return;
  }
  if (!(["create-new", "attach-existing"] as unknown[]).includes(value.mode)) {
    addIssue(issues, "groupReference.mode", "invalid-value", "Unsupported group-reference mode");
    return;
  }
  if (value.mode === "attach-existing" && !isNonEmptyString(value.groupId)) {
    addIssue(issues, "groupReference.groupId", "missing-field", "Existing group ID is required");
  }
  if (value.mode === "create-new" && value.groupId !== undefined) {
    addIssue(issues, "groupReference.groupId", "invalid-value", "New groups cannot supply a group ID");
  }
}

function validateCoAct(value: Record<string, unknown>, issues: ValidationIssue[]): void {
  rejectUnknownTopLevelFields(value, COACT_KEYS, issues);
  validateCommon(value, "co-act", issues);

  if (!(["same-action", "complementary-roles"] as unknown[]).includes(value.structure)) {
    addIssue(issues, "structure", "invalid-value", "Unsupported Co-Act structure");
  }
  if (!isNonEmptyString(value.action)) {
    addIssue(issues, "action", "missing-field", "Co-Act action is required");
  }

  if (!Array.isArray(value.roles)) {
    addIssue(issues, "roles", "invalid-type", "Roles must be an array");
  } else {
    const roleIds = new Set<string>();
    value.roles.forEach((role, index) => validateRole(role, index, roleIds, issues));
    if (value.structure === "same-action" && value.roles.length > 1) {
      addIssue(issues, "roles", "invalid-value", "Same-action Co-Acts use at most one role template");
    }
    if (value.structure === "complementary-roles" && value.roles.length < 2) {
      addIssue(issues, "roles", "invalid-value", "Complementary-role Co-Acts require at least two roles");
    }
  }

  validateActivation(value.activation, value.participantLimit, issues);
  if (
    value.creatorParticipation === "organizer-only" &&
    isRecord(value.activation) &&
    value.activation.creatorCounts === true
  ) {
    addIssue(
      issues,
      "activation.creatorCounts",
      "invalid-value",
      "An organizer-only creator cannot count toward the participant minimum",
    );
  }
  validatePerformanceStart(value.performanceStart, issues);
  if (!( ["same-period", "same-time"] as unknown[]).includes(value.timing)) {
    addIssue(issues, "timing", "invalid-value", "Unsupported Co-Act timing rule");
  }
  if (!( ["notifications-only", "announcements", "discussion-thread"] as unknown[]).includes(value.coordination)) {
    addIssue(issues, "coordination", "invalid-value", "Unsupported Co-Act coordination mode");
  }

  if (
    !(["closed-after-activation", "original-end-date", "full-duration"] as unknown[]).includes(
      value.lateJoining,
    )
  ) {
    addIssue(issues, "lateJoining", "invalid-value", "Unsupported late-joining rule");
  }

  validateReward(value.reward, issues);
  validateAdditionality(value.additionality, issues);
  validateEvidence(value.evidence, issues);
  validateWithdrawal(value.withdrawal, issues);
  validateRedistribution(value.redistribution, issues);
  validateIdentity(value.identity, value.visibility, issues);

  if (
    !(["not-applicable", "explicitly-included", "explicitly-excluded"] as unknown[]).includes(
      value.counterpartyParticipation,
    )
  ) {
    addIssue(
      issues,
      "counterpartyParticipation",
      "invalid-value",
      "Counterparty participation must be an explicit choice",
    );
  }
}

function validateRole(
  value: unknown,
  index: number,
  ids: Set<string>,
  issues: ValidationIssue[],
): void {
  const path = `roles[${index}]`;
  if (!isRecord(value)) {
    addIssue(issues, path, "invalid-type", "Role must be an object");
    return;
  }
  if (!isNonEmptyString(value.id)) {
    addIssue(issues, `${path}.id`, "missing-field", "Role ID is required");
  } else if (ids.has(value.id)) {
    addIssue(issues, `${path}.id`, "invalid-value", "Role IDs must be unique");
  } else {
    ids.add(value.id);
  }
  if (!isNonEmptyString(value.title)) {
    addIssue(issues, `${path}.title`, "missing-field", "Role title is required");
  }
  if (!isNonEmptyString(value.obligation)) {
    addIssue(issues, `${path}.obligation`, "missing-field", "Role obligation is required");
  }
  if (value.quantity !== undefined && !isNonNegativeFinite(value.quantity)) {
    addIssue(issues, `${path}.quantity`, "invalid-value", "Role quantity must be non-negative");
  }
  if (typeof value.transferable !== "boolean") {
    addIssue(issues, `${path}.transferable`, "invalid-type", "Transferability must be explicit");
  }
  for (const key of ["requiredSkills", "requiredLocations"] as const) {
    if (!Array.isArray(value[key]) || value[key].some((entry) => !isNonEmptyString(entry))) {
      addIssue(issues, `${path}.${key}`, "invalid-type", `${key} must contain strings`);
    }
  }
}

function validateActivation(
  value: unknown,
  participantLimit: unknown,
  issues: ValidationIssue[],
): void {
  if (!isRecord(value)) {
    addIssue(issues, "activation", "invalid-type", "Activation must be an object");
    return;
  }
  if (typeof value.creatorCounts !== "boolean") {
    addIssue(issues, "activation.creatorCounts", "invalid-type", "Creator-counting rule is required");
  }
  if (value.mode === "independent") return;
  if (value.mode !== "minimum-participants") {
    addIssue(issues, "activation.mode", "invalid-value", "Unsupported activation mode");
    return;
  }
  if (!isPositiveInteger(value.minimumParticipants)) {
    addIssue(
      issues,
      "activation.minimumParticipants",
      "invalid-value",
      "Minimum participants must be positive",
    );
  } else if (
    isPositiveInteger(participantLimit) &&
    value.minimumParticipants > participantLimit
  ) {
    addIssue(
      issues,
      "activation.minimumParticipants",
      "participant-limit",
      "Minimum participants cannot exceed the participant limit",
    );
  }
  if (
    value.confirmationHours !== undefined &&
    (!isPositiveInteger(value.confirmationHours) || value.confirmationHours > 720)
  ) {
    addIssue(
      issues,
      "activation.confirmationHours",
      "invalid-value",
      "Confirmation hours must be from 1 through 720",
    );
  }
}

function validatePerformanceStart(value: unknown, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    addIssue(issues, "performanceStart", "invalid-type", "Performance start must be an object");
    return;
  }
  if (value.mode === "on-activation") return;
  if (value.mode !== "scheduled") {
    addIssue(issues, "performanceStart.mode", "invalid-value", "Unsupported performance-start mode");
    return;
  }
  validateIsoDate(value.startsAt, "performanceStart.startsAt", issues);
}

function validateReward(value: unknown, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    addIssue(issues, "reward", "invalid-type", "Reward must be an object");
    return;
  }
  if (!isNonEmptyString(value.description)) {
    addIssue(issues, "reward.description", "missing-field", "Reward description is required");
  }
  if (value.mode === "fixed-group") {
    if (!isNonEmptyString(value.allocationRule)) {
      addIssue(issues, "reward.allocationRule", "missing-field", "Allocation rule is required");
    }
    return;
  }
  if (value.mode === "per-participant-or-unit") {
    if (!isNonEmptyString(value.unit)) {
      addIssue(issues, "reward.unit", "missing-field", "Reward unit is required");
    }
    return;
  }
  addIssue(issues, "reward.mode", "invalid-value", "Unsupported reward mode");
}

function validateAdditionality(value: unknown, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    addIssue(issues, "additionality", "invalid-type", "Additionality must be an object");
    return;
  }
  if (!(["verified-history", "self-report", "mixed"] as unknown[]).includes(value.baselineSource)) {
    addIssue(issues, "additionality.baselineSource", "invalid-value", "Unsupported baseline source");
  }
  if (!isNonNegativeFinite(value.baselineQuantity)) {
    addIssue(
      issues,
      "additionality.baselineQuantity",
      "invalid-value",
      "Baseline quantity must be non-negative",
    );
  }
  if (!isNonEmptyString(value.unit)) {
    addIssue(issues, "additionality.unit", "missing-field", "Additionality unit is required");
  }
  if (!(["low", "medium", "high"] as unknown[]).includes(value.confidence)) {
    addIssue(issues, "additionality.confidence", "invalid-value", "Unsupported confidence level");
  }
}

function validateEvidence(value: unknown, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    addIssue(issues, "evidence", "invalid-type", "Evidence must be an object");
    return;
  }
  validateVerificationLevel(value.verification, "evidence.verification", issues);
  if (!Number.isInteger(value.allowedMisses) || Number(value.allowedMisses) < 0) {
    addIssue(issues, "evidence.allowedMisses", "invalid-value", "Allowed misses must be non-negative");
  }
  if (!Number.isInteger(value.gracePeriodHours) || Number(value.gracePeriodHours) < 0) {
    addIssue(
      issues,
      "evidence.gracePeriodHours",
      "invalid-value",
      "Grace-period hours must be non-negative",
    );
  }
  if (typeof value.makeUpAllowed !== "boolean") {
    addIssue(issues, "evidence.makeUpAllowed", "invalid-type", "Make-up policy must be explicit");
  }
}

function validateWithdrawal(value: unknown, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    addIssue(issues, "withdrawal", "invalid-type", "Withdrawal must be an object");
    return;
  }
  if (value.preActivation !== "allowed") {
    addIssue(issues, "withdrawal.preActivation", "invalid-value", "Pre-activation withdrawal is allowed");
  }
  if (!(["recorded-nonperformance", "authorized-by-terms"] as unknown[]).includes(value.postActivation)) {
    addIssue(issues, "withdrawal.postActivation", "invalid-value", "Unsupported withdrawal rule");
  }
}

function validateRedistribution(value: unknown, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    addIssue(issues, "redistribution", "invalid-type", "Redistribution must be an object");
    return;
  }
  if (typeof value.enabled !== "boolean") {
    addIssue(issues, "redistribution.enabled", "invalid-type", "Redistribution setting is required");
    return;
  }
  if (value.enabled) {
    if (!(["equal", "proportional-to-base", "role-specific"] as unknown[]).includes(value.formula)) {
      addIssue(issues, "redistribution.formula", "invalid-value", "Redistribution formula is required");
    }
    if (!isNonNegativeFinite(value.participantMaximumQuantity)) {
      addIssue(
        issues,
        "redistribution.participantMaximumQuantity",
        "invalid-value",
        "Participant maximum is required and must be non-negative",
      );
    }
    if (!isPositiveInteger(value.replacementRecruitmentHours)) {
      addIssue(
        issues,
        "redistribution.replacementRecruitmentHours",
        "invalid-value",
        "Replacement recruitment period must be positive",
      );
    }
  }
  if (
    ![
      "reduced-output-and-reward",
      "end-future-performance",
      "withdraw-without-penalty",
      "terminate",
      "new-version",
    ].includes(String(value.fallback))
  ) {
    addIssue(issues, "redistribution.fallback", "invalid-value", "Unsupported shortfall fallback");
  }
}

function validateIdentity(
  value: unknown,
  visibility: unknown,
  issues: ValidationIssue[],
): void {
  if (!isRecord(value)) {
    addIssue(issues, "identity", "invalid-type", "Identity policy must be an object");
    return;
  }
  if (typeof value.membersSeeAfterJoining !== "boolean") {
    addIssue(issues, "identity.membersSeeAfterJoining", "invalid-type", "Member visibility must be explicit");
  }
  if (typeof value.publicAfterTerminalState !== "boolean") {
    addIssue(
      issues,
      "identity.publicAfterTerminalState",
      "invalid-type",
      "Terminal-state visibility must be explicit",
    );
  }
  if (value.terminalStateDisclosureConsentRequired !== true) {
    addIssue(
      issues,
      "identity.terminalStateDisclosureConsentRequired",
      "invalid-value",
      "Terminal-state disclosure always requires advance consent",
    );
  }
  if (visibility === "invitation-only" && value.membersSeeAfterJoining !== true) {
    addIssue(
      issues,
      "identity.membersSeeAfterJoining",
      "invalid-value",
      "Invitation-only members see one another after joining",
    );
  }
  if (
    visibility === "invitation-only" &&
    value.publicAfterTerminalState !== true
  ) {
    addIssue(
      issues,
      "identity.publicAfterTerminalState",
      "invalid-value",
      "Invitation-only participant identities become public after any terminal state",
    );
  }

}

function validateCoFund(value: Record<string, unknown>, issues: ValidationIssue[]): void {
  rejectUnknownTopLevelFields(value, COFUND_KEYS, issues);
  validateCommon(value, "co-fund", issues);

  if (
    ![
      "equal-share",
      "flexible-contribution",
      "custom-split",
      "matching-pledge",
    ].includes(String(value.allocationMode))
  ) {
    addIssue(issues, "allocationMode", "invalid-value", "Unsupported Co-Fund allocation mode");
  }

  validateProject(value.project, issues);

  if (!isNonEmptyString(value.settlementCurrency) || !/^[A-Z]{3}$/.test(value.settlementCurrency)) {
    addIssue(
      issues,
      "settlementCurrency",
      "invalid-value",
      "Settlement currency must be an uppercase ISO-style code",
    );
  }
  if (!isPositiveInteger(value.targetMinor)) {
    addIssue(issues, "targetMinor", "invalid-value", "Target must be a positive integer in minor units");
  }

  validateAllocation(value.allocation, value.targetMinor, value.participantLimit, issues);
  validateParticipantTerms(value.participantTerms, value.creatorParticipation, issues);

  if (value.confirmationHours !== COFUND_CONFIRMATION_HOURS) {
    addIssue(
      issues,
      "confirmationHours",
      "invalid-value",
      `Final confirmation must be ${COFUND_CONFIRMATION_HOURS} hours`,
    );
  }

  if (
    !Array.isArray(value.paymentMethods) ||
    value.paymentMethods.length === 0 ||
    value.paymentMethods.some((method) => !["wallet", "card-or-ach", "escrow"].includes(String(method)))
  ) {
    addIssue(issues, "paymentMethods", "invalid-value", "Select at least one supported payment method");
  } else if (new Set(value.paymentMethods).size !== value.paymentMethods.length) {
    addIssue(issues, "paymentMethods", "invalid-value", "Payment methods must be unique");
  }

  validatePaymentFailure(value.paymentFailure, issues);

  if (value.overfunding !== "proportional-reduction") {
    addIssue(
      issues,
      "overfunding",
      "invalid-value",
      "Co-Fund overfunding is resolved by proportional reduction",
    );
  }

  validateRecurring(value.recurring, issues);
  validateForeignExchange(value.foreignExchange, issues);
  validateCoFundFailure(value.failure, issues);
}

function validateProject(value: unknown, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    addIssue(issues, "project", "invalid-type", "Project must be an object");
    return;
  }
  if (!isNonEmptyString(value.title)) {
    addIssue(issues, "project.title", "missing-field", "Project title is required");
  }
  if (!isNonEmptyString(value.description)) {
    addIssue(issues, "project.description", "missing-field", "Project description is required");
  }
  if (value.destinationId !== undefined && !isNonEmptyString(value.destinationId)) {
    addIssue(issues, "project.destinationId", "invalid-value", "Destination ID must be non-empty");
  }
  if (typeof value.milestoneBasedPayout !== "boolean") {
    addIssue(
      issues,
      "project.milestoneBasedPayout",
      "invalid-type",
      "Milestone-payout policy must be explicit",
    );
  }
}

function validateAllocation(
  value: unknown,
  targetMinor: unknown,
  participantLimit: unknown,
  issues: ValidationIssue[],
): void {
  if (!isRecord(value)) {
    addIssue(issues, "allocation", "invalid-type", "Allocation must be an object");
    return;
  }
  if (!(["open", "frozen"] as unknown[]).includes(value.status)) {
    addIssue(issues, "allocation.status", "invalid-value", "Unsupported allocation status");
  }
  if (!Array.isArray(value.shares)) {
    addIssue(issues, "allocation.shares", "invalid-type", "Allocation shares must be an array");
    return;
  }
  if (isPositiveInteger(participantLimit) && value.shares.length > participantLimit) {
    addIssue(
      issues,
      "allocation.shares",
      "participant-limit",
      "Allocation contains more participants than the declared limit",
    );
  }

  const seen = new Set<string>();
  let total = 0;
  value.shares.forEach((share, index) => {
    const path = `allocation.shares[${index}]`;
    if (!isRecord(share)) {
      addIssue(issues, path, "invalid-type", "Share must be an object");
      return;
    }
    if (!isNonEmptyString(share.participantId)) {
      addIssue(issues, `${path}.participantId`, "missing-field", "Participant ID is required");
    } else if (seen.has(share.participantId)) {
      addIssue(issues, `${path}.participantId`, "duplicate-participant", "Participant appears twice");
    } else {
      seen.add(share.participantId);
    }
    if (!isPositiveInteger(share.amountMinor)) {
      addIssue(issues, `${path}.amountMinor`, "invalid-value", "Share must be a positive minor-unit integer");
    } else {
      total += share.amountMinor;
    }
  });

  if (value.status === "frozen" && isPositiveInteger(targetMinor) && total !== targetMinor) {
    addIssue(
      issues,
      "allocation.shares",
      "allocation-mismatch",
      `Frozen shares total ${total}, but target is ${targetMinor}`,
    );
  }
}

function validateParticipantTerms(
  value: unknown,
  creatorParticipation: unknown,
  issues: ValidationIssue[],
): void {
  if (creatorParticipation === "organizer-only") {
    if (value !== null) {
      addIssue(
        issues,
        "participantTerms",
        "private-or-executable-field",
        "An organizer-only creator cannot submit participant-owned funding terms",
      );
    }
    return;
  }

  if (creatorParticipation !== "participating") {
    addIssue(
      issues,
      "participantTerms",
      "invalid-value",
      "Creator participation must be resolved before funding terms are validated",
    );
    return;
  }

  try {
    validateParticipantOwnedFundingTerms(value, "Creator Co-Fund terms");
  } catch (error) {
    addIssue(
      issues,
      "participantTerms",
      "invalid-value",
      error instanceof Error ? error.message : "Creator Co-Fund terms are invalid",
    );
  }
}

function validatePaymentFailure(value: unknown, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    addIssue(issues, "paymentFailure", "invalid-type", "Payment-failure terms must be an object");
    return;
  }
  if (!isPositiveInteger(value.repairWindowHours) || value.repairWindowHours > 168) {
    addIssue(
      issues,
      "paymentFailure.repairWindowHours",
      "invalid-value",
      "Repair window must be from 1 through 168 hours",
    );
  }
  if (value.useWaitlistFirst !== true) {
    addIssue(issues, "paymentFailure.useWaitlistFirst", "invalid-value", "Waitlist must be used first");
  }
}

function validateRecurring(value: unknown, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    addIssue(issues, "recurring", "invalid-type", "Recurring terms must be an object");
    return;
  }
  if (value.mode === "none") return;
  if (!(["standing-authorization", "confirm-each-cycle"] as unknown[]).includes(value.mode)) {
    addIssue(issues, "recurring.mode", "invalid-value", "Unsupported recurring mode");
    return;
  }
  if (!isNonEmptyString(value.frequency)) {
    addIssue(issues, "recurring.frequency", "missing-field", "Recurring frequency is required");
  }
  if (!isPositiveInteger(value.maximumPerCycleMinor)) {
    addIssue(
      issues,
      "recurring.maximumPerCycleMinor",
      "invalid-value",
      "Recurring maximum must be a positive minor-unit integer",
    );
  }
}

function validateCoFundFailure(value: unknown, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    addIssue(issues, "failure", "invalid-type", "Co-Fund failure terms must be an object");
    return;
  }
  if (
    !(["release-reservations", "one-extension", "new-round", "participant-vote"] as unknown[]).includes(
      value.deadlineOutcome,
    )
  ) {
    addIssue(issues, "failure.deadlineOutcome", "invalid-value", "Unsupported deadline outcome");
  }
  if (value.deadlineOutcome === "one-extension") {
    if (!isPositiveInteger(value.extensionHours) || value.extensionHours > 8_760) {
      addIssue(
        issues,
        "failure.extensionHours",
        "invalid-value",
        "Extension hours must be from 1 through 8760",
      );
    }
  } else if (value.extensionHours !== undefined) {
    addIssue(
      issues,
      "failure.extensionHours",
      "invalid-value",
      "Extension hours may be supplied only for a one-extension deadline outcome",
    );
  }
  if (!( ["expire-trade", "alternative-offer", "renegotiate"] as unknown[]).includes(value.underThresholdFallback)) {
    addIssue(
      issues,
      "failure.underThresholdFallback",
      "invalid-value",
      "Unsupported under-threshold fallback",
    );
  }
}

function validateForeignExchange(value: unknown, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    addIssue(issues, "foreignExchange", "invalid-type", "Foreign-exchange terms must be an object");
    return;
  }
  if (value.lockAt !== "final-confirmation") {
    addIssue(
      issues,
      "foreignExchange.lockAt",
      "invalid-value",
      "Exchange rate locks at final confirmation",
    );
  }
  if (value.restartConfirmationOnMaterialChange !== true) {
    addIssue(
      issues,
      "foreignExchange.restartConfirmationOnMaterialChange",
      "invalid-value",
      "Material exchange-rate changes require renewed confirmation",
    );
  }
}

export function validateGroupContributionTerms(
  input: unknown,
  underlyingContribution: UnderlyingContributionKind,
): ValidationResult {
  const issues: ValidationIssue[] = [];
  inspectForbiddenKeys(input, "", issues);

  if (!isRecord(input)) {
    addIssue(issues, "", "invalid-type", "Group contribution terms must be an object");
    return { ok: false, issues };
  }

  if (input.mode === "co-act") {
    if (underlyingContribution !== "nonfinancial") {
      addIssue(
        issues,
        "mode",
        "incompatible-contribution",
        "Co-Act can modify only a nonfinancial contribution",
      );
    }
    validateCoAct(input, issues);
  } else if (input.mode === "co-fund") {
    if (underlyingContribution !== "financial") {
      addIssue(
        issues,
        "mode",
        "incompatible-contribution",
        "Co-Fund can modify only a financial contribution",
      );
    }
    validateCoFund(input, issues);
  } else {
    addIssue(issues, "mode", "invalid-value", "Mode must be co-act or co-fund");
  }

  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, value: input as unknown as GroupContributionTerms, issues: [] };
}

export function calculateIncrementalQuantity(
  verifiedQuantity: number,
  baselineQuantity: number,
): number {
  if (!Number.isFinite(verifiedQuantity) || !Number.isFinite(baselineQuantity)) {
    throw new TypeError("Quantities must be finite numbers");
  }
  if (verifiedQuantity < 0 || baselineQuantity < 0) {
    throw new RangeError("Quantities cannot be negative");
  }
  return Math.max(0, verifiedQuantity - baselineQuantity);
}

export function sumCoFundShares(shares: readonly CoFundShare[]): number {
  return shares.reduce((total, share) => {
    if (!isPositiveInteger(share.amountMinor)) {
      throw new RangeError("Every Co-Fund share must be a positive integer in minor units");
    }
    return total + share.amountMinor;
  }, 0);
}

export function summarizeGroupContribution(terms: GroupContributionTerms): string {
  if (terms.mode === "co-act") {
    if (terms.activation.mode === "minimum-participants") {
      const others = Math.max(
        0,
        terms.activation.minimumParticipants - (terms.activation.creatorCounts ? 1 : 0),
      );
      const condition = others === 1 ? "1 other person joins" : `${others} other people join`;
      return `I will ${sentenceFragment(terms.action)} if ${condition}.`;
    }
    return `I will ${sentenceFragment(terms.action)} with other participants.`;
  }

  const target = formatMinorAmount(terms.targetMinor, terms.settlementCurrency);
  if (terms.allocationMode === "equal-share" && terms.allocation.shares.length > 0) {
    const first = terms.allocation.shares[0]?.amountMinor;
    const equal = terms.allocation.shares.every((share) => share.amountMinor === first);
    if (equal && first) {
      return `${target} target · ${formatMinorAmount(first, terms.settlementCurrency)} each · ${terms.allocation.shares.length} funded slots.`;
    }
  }
  return `${target} target · ${allocationLabel(terms.allocationMode)} · up to ${terms.participantLimit} participants.`;
}

function sentenceFragment(value: string): string {
  const trimmed = value.trim().replace(/[.!?]+$/u, "");
  if (!trimmed) return "complete the agreed action";
  return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
}

function allocationLabel(mode: CoFundAllocationMode): string {
  switch (mode) {
    case "equal-share":
      return "equal shares";
    case "flexible-contribution":
      return "flexible contributions";
    case "custom-split":
      return "custom split";
    case "matching-pledge":
      return "matching pledge";
  }
}

function formatMinorAmount(amountMinor: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amountMinor / 100);
  } catch {
    return `${currency} ${(amountMinor / 100).toFixed(2)}`;
  }
}
