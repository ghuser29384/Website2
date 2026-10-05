import {
  COFUND_CONFIRMATION_HOURS,
  GROUP_CONTRIBUTION_SCHEMA_VERSION,
  MAX_GROUP_PARTICIPANTS,
  type CoActRole,
  type CoActTerms,
  type CoFundTerms,
  type GroupContributionTerms,
  type GroupVisibility,
  type UnderlyingContributionKind,
} from "./group-contribution";
import {
  validateParticipantTarget,
  type CreatorParticipation,
  type ParticipantTarget,
} from "./participant-target";

export type GroupDraftMode = "solo" | "co-act" | "co-fund";

export interface GroupContributionDraftState {
  optionKey: string;
  underlyingContribution: UnderlyingContributionKind;
  mode: GroupDraftMode;
  participantLimit: number;
  creatorParticipation: "" | CreatorParticipation;
  participants: ParticipantTarget[];
  visibility: GroupVisibility;
  combination: "alternative" | "cumulative";
  recruitmentDeadline: string;
  existingGroupId: string;
  minimumReliability: number | null;
  geography: string;
  skill: string;

  primaryText: string;
  counterpartyParticipation: "not-applicable" | "explicitly-included" | "explicitly-excluded";

  coActStructure: "same-action" | "complementary-roles";
  complementaryRoles: string;
  activationMode: "independent" | "minimum-participants";
  minimumParticipants: number;
  creatorCounts: boolean;
  activationConfirmationHours: number;
  performanceStartMode: "on-activation" | "scheduled";
  performanceStartsAt: string;
  lateJoining: "closed-after-activation" | "original-end-date" | "full-duration";
  coActTiming: "same-period" | "same-time";
  coordination: "notifications-only" | "announcements" | "discussion-thread";
  duration: string;
  frequency: string;
  rewardMode: "fixed-group" | "per-participant-or-unit";
  rewardDescription: string;
  rewardRuleOrUnit: string;
  baselineSource: "verified-history" | "self-report" | "mixed";
  baselineQuantity: number;
  baselineUnit: string;
  baselineConfidence: "low" | "medium" | "high";
  evidenceVerification:
    | "self-declared"
    | "profile-verified"
    | "document-verified"
    | "independently-verified";
  allowedMisses: number;
  gracePeriodHours: number;
  makeUpAllowed: boolean;
  postActivationWithdrawal: "recorded-nonperformance" | "authorized-by-terms";
  redistributionEnabled: boolean;
  redistributionFormula: "equal" | "proportional-to-base" | "role-specific";
  redistributionMaximumQuantity: number;
  replacementRecruitmentHours: number;
  redistributionFallback:
    | "reduced-output-and-reward"
    | "end-future-performance"
    | "withdraw-without-penalty"
    | "terminate"
    | "new-version";

  projectDescription: string;
  allocationMode: "equal-share" | "flexible-contribution" | "custom-split" | "matching-pledge";
  settlementCurrency: string;
  targetMinor: number;
  maximumBudgetMinor: number;
  noPoolDefault: string;
  participationBeatsDefault: boolean;
  preauthorizeExecutableFallback: boolean;
  paymentMethods: Array<"wallet" | "card-or-ach" | "escrow">;
  paymentRepairWindowHours: number;
  recurringMode: "none" | "standing-authorization" | "confirm-each-cycle";
  recurringFrequency: string;
  recurringMaximumMinor: number;
  milestoneBasedPayout: boolean;
  coFundDeadlineOutcome:
    | "release-reservations"
    | "one-extension"
    | "new-round"
    | "participant-vote";
  coFundExtensionHours: number;
  coFundFailureFallback: "expire-trade" | "alternative-offer" | "renegotiate";
}

export function defaultGroupContributionDraft(
  optionKey: string,
  underlyingContribution: UnderlyingContributionKind,
  primaryText = "",
): GroupContributionDraftState {
  const mode: GroupDraftMode = underlyingContribution === "financial" ? "solo" : "solo";
  return {
    optionKey,
    underlyingContribution,
    mode,
    participantLimit: 10,
    creatorParticipation: "",
    participants: [],
    visibility: "public",
    combination: "alternative",
    recruitmentDeadline: "",
    existingGroupId: "",
    minimumReliability: null,
    geography: "",
    skill: "",

    primaryText,
    counterpartyParticipation: "not-applicable",

    coActStructure: "same-action",
    complementaryRoles: "",
    activationMode: "minimum-participants",
    minimumParticipants: 2,
    creatorCounts: true,
    activationConfirmationHours: 24,
    performanceStartMode: "on-activation",
    performanceStartsAt: "",
    lateJoining: "closed-after-activation",
    coActTiming: "same-period",
    coordination: "announcements",
    duration: "",
    frequency: "",
    rewardMode: "fixed-group",
    rewardDescription: "Linked trade reward",
    rewardRuleOrUnit: "Pro rata by verified incremental performance",
    baselineSource: "self-report",
    baselineQuantity: 0,
    baselineUnit: "verified units",
    baselineConfidence: "medium",
    evidenceVerification: "self-declared",
    allowedMisses: 0,
    gracePeriodHours: 24,
    makeUpAllowed: true,
    postActivationWithdrawal: "recorded-nonperformance",
    redistributionEnabled: false,
    redistributionFormula: "equal",
    redistributionMaximumQuantity: 1,
    replacementRecruitmentHours: 72,
    redistributionFallback: "reduced-output-and-reward",

    projectDescription: "",
    allocationMode: "equal-share",
    settlementCurrency: "USD",
    targetMinor: 0,
    maximumBudgetMinor: 0,
    noPoolDefault: "",
    participationBeatsDefault: false,
    preauthorizeExecutableFallback: false,
    paymentMethods: ["wallet"],
    paymentRepairWindowHours: 24,
    recurringMode: "none",
    recurringFrequency: "monthly",
    recurringMaximumMinor: 0,
    milestoneBasedPayout: false,
    coFundDeadlineOutcome: "release-reservations",
    coFundExtensionHours: 72,
    coFundFailureFallback: "expire-trade",
  };
}

export function normalizeDraft(state: GroupContributionDraftState): GroupContributionDraftState {
  const participantLimit = clampInteger(state.participantLimit, 1, MAX_GROUP_PARTICIPANTS);
  const minimumParticipants = clampInteger(state.minimumParticipants, 1, participantLimit);
  const participants = normalizeDraftParticipants(state.participants).slice(0, participantLimit);

  return {
    ...state,
    optionKey: state.optionKey.trim(),
    participantLimit,
    participants,
    minimumParticipants,
    activationConfirmationHours: clampInteger(state.activationConfirmationHours, 1, 720),
    allowedMisses: clampInteger(state.allowedMisses, 0, 10_000),
    gracePeriodHours: clampInteger(state.gracePeriodHours, 0, 24 * 365),
    redistributionMaximumQuantity: clampNumber(state.redistributionMaximumQuantity, 0, 1_000_000),
    replacementRecruitmentHours: clampInteger(state.replacementRecruitmentHours, 1, 24 * 365),
    baselineQuantity: clampNumber(state.baselineQuantity, 0, 1_000_000_000),
    targetMinor: clampInteger(state.targetMinor, 0, Number.MAX_SAFE_INTEGER),
    maximumBudgetMinor: clampInteger(state.maximumBudgetMinor, 0, Number.MAX_SAFE_INTEGER),
    recurringMaximumMinor: clampInteger(state.recurringMaximumMinor, 0, Number.MAX_SAFE_INTEGER),
    paymentRepairWindowHours: clampInteger(state.paymentRepairWindowHours, 1, 168),
    coFundExtensionHours: clampInteger(state.coFundExtensionHours, 1, 8_760),
    settlementCurrency: state.settlementCurrency.trim().toUpperCase().slice(0, 3),
    recruitmentDeadline: state.recruitmentDeadline.trim(),
    existingGroupId: state.existingGroupId.trim(),
    geography: state.geography.trim(),
    skill: state.skill.trim(),
    primaryText: state.primaryText.trim(),
    complementaryRoles: state.complementaryRoles.trim(),
    performanceStartsAt: state.performanceStartsAt.trim(),
    duration: state.duration.trim(),
    frequency: state.frequency.trim(),
    rewardDescription: state.rewardDescription.trim(),
    rewardRuleOrUnit: state.rewardRuleOrUnit.trim(),
    baselineUnit: state.baselineUnit.trim(),
    projectDescription: state.projectDescription.trim(),
    noPoolDefault: state.noPoolDefault.trim(),
    recurringFrequency: state.recurringFrequency.trim(),
    paymentMethods: [...new Set(state.paymentMethods)],
  };
}

export function buildGroupContributionTerms(
  unnormalizedState: GroupContributionDraftState,
): GroupContributionTerms | null {
  const state = normalizeDraft(unnormalizedState);
  if (state.mode === "solo") return null;
  if (state.mode === "co-act") return buildCoActTerms(state);
  return buildCoFundTerms(state);
}

function commonTerms(state: GroupContributionDraftState) {
  const eligibility: CoActTerms["eligibility"] = [];
  if (state.minimumReliability !== null) {
    eligibility.push({
      type: "minimum-reliability",
      minimum: clampNumber(state.minimumReliability, 0, 100),
      verification: "profile-verified",
    });
  }
  if (state.geography) {
    eligibility.push({
      type: "geography",
      location: state.geography,
      verification: "profile-verified",
    });
  }
  if (state.skill) {
    eligibility.push({
      type: "skill",
      skill: state.skill,
      verification: "profile-verified",
    });
  }
  if (state.visibility === "invitation-only") {
    eligibility.push({ type: "invitation", verification: "profile-verified" });
  }

  return {
    schemaVersion: GROUP_CONTRIBUTION_SCHEMA_VERSION,
    execution: "proposal-only" as const,
    participantLimit: state.participantLimit,
    creatorParticipation: state.creatorParticipation as CreatorParticipation,
    participants: state.participants,
    visibility: state.visibility,
    eligibility,
    groupReference: state.existingGroupId
      ? ({ mode: "attach-existing", groupId: state.existingGroupId } as const)
      : ({ mode: "create-new" } as const),
    combination: state.combination,
    ...(state.recruitmentDeadline ? { recruitmentDeadline: toIso(state.recruitmentDeadline) } : {}),
    agreementVersion: 1,
  };
}

function buildCoActTerms(state: GroupContributionDraftState): CoActTerms {
  const roles =
    state.coActStructure === "same-action"
      ? [sameActionRole(state)]
      : parseComplementaryRoles(state.complementaryRoles);

  return {
    ...commonTerms(state),
    mode: "co-act",
    structure: state.coActStructure,
    action: state.primaryText,
    roles,
    activation:
      state.activationMode === "independent"
        ? {
            mode: "independent",
            creatorCounts:
              state.creatorParticipation === "participating" && state.creatorCounts,
          }
        : {
            mode: "minimum-participants",
            minimumParticipants: state.minimumParticipants,
            creatorCounts:
              state.creatorParticipation === "participating" && state.creatorCounts,
            confirmationHours: state.activationConfirmationHours,
          },
    performanceStart:
      state.performanceStartMode === "scheduled" && state.performanceStartsAt
        ? { mode: "scheduled", startsAt: toIso(state.performanceStartsAt) }
        : { mode: "on-activation" },
    lateJoining: state.lateJoining,
    timing: state.coActTiming,
    coordination: state.coordination,
    ...(state.duration ? { duration: state.duration } : {}),
    ...(state.frequency ? { frequency: state.frequency } : {}),
    reward:
      state.rewardMode === "fixed-group"
        ? {
            mode: "fixed-group",
            description: state.rewardDescription,
            allocationRule: state.rewardRuleOrUnit,
          }
        : {
            mode: "per-participant-or-unit",
            description: state.rewardDescription,
            unit: state.rewardRuleOrUnit,
          },
    additionality: {
      baselineSource: state.baselineSource,
      baselineQuantity: state.baselineQuantity,
      unit: state.baselineUnit,
      confidence: state.baselineConfidence,
    },
    evidence: {
      verification: state.evidenceVerification,
      allowedMisses: state.allowedMisses,
      gracePeriodHours: state.gracePeriodHours,
      makeUpAllowed: state.makeUpAllowed,
    },
    withdrawal: {
      preActivation: "allowed",
      postActivation: state.postActivationWithdrawal,
    },
    redistribution: state.redistributionEnabled
      ? {
          enabled: true,
          formula: state.redistributionFormula,
          participantMaximumQuantity: state.redistributionMaximumQuantity,
          replacementRecruitmentHours: state.replacementRecruitmentHours,
          fallback: state.redistributionFallback,
        }
      : {
          enabled: false,
          fallback: state.redistributionFallback,
        },
    identity: {
      membersSeeAfterJoining: true,
      publicAfterTerminalState: state.visibility === "invitation-only",
      terminalStateDisclosureConsentRequired: true,
    },
    counterpartyParticipation: state.counterpartyParticipation,
  };
}

function sameActionRole(state: GroupContributionDraftState): CoActRole {
  return {
    id: "same-action",
    title: "Participant",
    obligation: state.primaryText,
    quantity: 1,
    unit: state.baselineUnit || "verified unit",
    transferable: true,
    requiredSkills: state.skill ? [state.skill] : [],
    requiredLocations: state.geography ? [state.geography] : [],
  };
}

function parseComplementaryRoles(value: string): CoActRole[] {
  return value
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const separator = line.indexOf(":");
      const title = separator >= 0 ? line.slice(0, separator).trim() : `Role ${index + 1}`;
      const obligation = separator >= 0 ? line.slice(separator + 1).trim() : line;
      return {
        id: `role-${index + 1}`,
        title,
        obligation,
        transferable: false,
        requiredSkills: [],
        requiredLocations: [],
      };
    });
}

function buildCoFundTerms(state: GroupContributionDraftState): CoFundTerms {
  return {
    ...commonTerms(state),
    mode: "co-fund",
    allocationMode: state.allocationMode,
    project: {
      title: state.primaryText,
      description: state.projectDescription || state.primaryText,
      milestoneBasedPayout: state.milestoneBasedPayout,
    },
    settlementCurrency: state.settlementCurrency,
    targetMinor: state.targetMinor,
    allocation: {
      status: "open",
      shares: [],
    },
    participantTerms:
      state.creatorParticipation === "participating"
        ? {
            maximumBudgetMinor: state.maximumBudgetMinor,
            noPoolDefault: state.noPoolDefault,
            participationBeatsDefault: true,
            preauthorizeExecutableFallback: false,
          }
        : null,
    confirmationHours: COFUND_CONFIRMATION_HOURS,
    paymentMethods: state.paymentMethods,
    paymentFailure: {
      repairWindowHours: state.paymentRepairWindowHours,
      useWaitlistFirst: true,
    },
    overfunding: "proportional-reduction",
    recurring:
      state.recurringMode === "none"
        ? { mode: "none" }
        : {
            mode: state.recurringMode,
            frequency: state.recurringFrequency,
            maximumPerCycleMinor: state.recurringMaximumMinor,
          },
    foreignExchange: {
      lockAt: "final-confirmation",
      restartConfirmationOnMaterialChange: true,
    },
    failure: {
      deadlineOutcome: state.coFundDeadlineOutcome,
      ...(state.coFundDeadlineOutcome === "one-extension"
        ? { extensionHours: state.coFundExtensionHours }
        : {}),
      underThresholdFallback: state.coFundFailureFallback,
    },
  };
}

function normalizeDraftParticipants(value: unknown): ParticipantTarget[] {
  if (!Array.isArray(value)) return [];
  const targets: ParticipantTarget[] = [];
  const rowIds = new Set<string>();
  const profileIds = new Set<string>();
  for (const candidate of value) {
    try {
      const target = validateParticipantTarget(candidate);
      if (rowIds.has(target.rowId)) continue;
      if (target.kind === "account" && profileIds.has(target.profileId)) continue;
      rowIds.add(target.rowId);
      if (target.kind === "account") profileIds.add(target.profileId);
      targets.push(target);
    } catch {
      // Old free-text or malformed local drafts remain unresolved rather than being auto-matched.
    }
  }
  return targets;
}

function clampInteger(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) return minimum;
  return Math.min(maximum, Math.max(minimum, Math.round(value)));
}

function clampNumber(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) return minimum;
  return Math.min(maximum, Math.max(minimum, value));
}

function toIso(value: string): string {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? value : new Date(parsed).toISOString();
}
