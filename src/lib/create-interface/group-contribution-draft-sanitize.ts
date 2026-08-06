import type { UnderlyingContributionKind } from "./group-contribution";
import { validateParticipantTarget, type ParticipantTarget } from "./participant-target";
import {
  defaultGroupContributionDraft,
  normalizeDraft,
  type GroupContributionDraftState,
} from "./group-contribution-draft";

const MODES = new Set(["solo", "co-act", "co-fund"]);
const CREATOR_PARTICIPATION = new Set(["participating", "organizer-only"]);
const VISIBILITIES = new Set(["public", "unlisted", "invitation-only"]);
const COMBINATIONS = new Set(["alternative", "cumulative"]);
const CO_ACT_STRUCTURES = new Set(["same-action", "complementary-roles"]);
const ACTIVATION_MODES = new Set(["independent", "minimum-participants"]);
const PERFORMANCE_START_MODES = new Set(["on-activation", "scheduled"]);
const LATE_JOINING = new Set(["closed-after-activation", "original-end-date", "full-duration"]);
const CO_ACT_TIMING = new Set(["same-period", "same-time"]);
const COORDINATION = new Set(["notifications-only", "announcements", "discussion-thread"]);
const REWARD_MODES = new Set(["fixed-group", "per-participant-or-unit"]);
const BASELINE_SOURCES = new Set(["verified-history", "self-report", "mixed"]);
const CONFIDENCE = new Set(["low", "medium", "high"]);
const VERIFICATION = new Set([
  "self-declared",
  "profile-verified",
  "document-verified",
  "independently-verified",
]);
const WITHDRAWAL = new Set(["recorded-nonperformance", "authorized-by-terms"]);
const REDISTRIBUTION_FORMULAS = new Set(["equal", "proportional-to-base", "role-specific"]);
const REDISTRIBUTION_FALLBACKS = new Set([
  "reduced-output-and-reward",
  "end-future-performance",
  "withdraw-without-penalty",
  "terminate",
  "new-version",
]);
const COUNTERPARTY = new Set(["not-applicable", "explicitly-included", "explicitly-excluded"]);
const ALLOCATION_MODES = new Set([
  "equal-share",
  "flexible-contribution",
  "custom-split",
  "matching-pledge",
]);
const RECURRING_MODES = new Set(["none", "standing-authorization", "confirm-each-cycle"]);
const PAYMENT_METHODS = new Set(["wallet", "card-or-ach", "escrow"]);
const COFUND_DEADLINE_OUTCOMES = new Set([
  "release-reservations",
  "one-extension",
  "new-round",
  "participant-vote",
]);
const COFUND_FAILURE_FALLBACKS = new Set([
  "expire-trade",
  "alternative-offer",
  "renegotiate",
]);

export function sanitizeGroupContributionDraft(
  input: unknown,
  optionKey: string,
  underlyingContribution: UnderlyingContributionKind,
): GroupContributionDraftState {
  const defaults = defaultGroupContributionDraft(optionKey, underlyingContribution);
  if (!isRecord(input)) return defaults;

  const candidate: GroupContributionDraftState = {
    ...defaults,
    optionKey,
    underlyingContribution,
  };

  assignEnum(candidate, "mode", input.mode, MODES);
  assignNumber(candidate, "participantLimit", input.participantLimit);
  assignEnum(candidate, "creatorParticipation", input.creatorParticipation, CREATOR_PARTICIPATION);
  candidate.participants = sanitizeParticipantTargets(input.participants);
  assignEnum(candidate, "visibility", input.visibility, VISIBILITIES);
  assignEnum(candidate, "combination", input.combination, COMBINATIONS);
  assignString(candidate, "recruitmentDeadline", input.recruitmentDeadline);
  assignString(candidate, "existingGroupId", input.existingGroupId);
  assignNullableNumber(candidate, "minimumReliability", input.minimumReliability);
  assignString(candidate, "geography", input.geography);
  assignString(candidate, "skill", input.skill);
  assignString(candidate, "primaryText", input.primaryText);
  assignEnum(candidate, "counterpartyParticipation", input.counterpartyParticipation, COUNTERPARTY);

  assignEnum(candidate, "coActStructure", input.coActStructure, CO_ACT_STRUCTURES);
  assignString(candidate, "complementaryRoles", input.complementaryRoles);
  assignEnum(candidate, "activationMode", input.activationMode, ACTIVATION_MODES);
  assignNumber(candidate, "minimumParticipants", input.minimumParticipants);
  assignBoolean(candidate, "creatorCounts", input.creatorCounts);
  assignNumber(candidate, "activationConfirmationHours", input.activationConfirmationHours);
  assignEnum(candidate, "performanceStartMode", input.performanceStartMode, PERFORMANCE_START_MODES);
  assignString(candidate, "performanceStartsAt", input.performanceStartsAt);
  assignEnum(candidate, "lateJoining", input.lateJoining, LATE_JOINING);
  assignEnum(candidate, "coActTiming", input.coActTiming, CO_ACT_TIMING);
  assignEnum(candidate, "coordination", input.coordination, COORDINATION);
  assignString(candidate, "duration", input.duration);
  assignString(candidate, "frequency", input.frequency);
  assignEnum(candidate, "rewardMode", input.rewardMode, REWARD_MODES);
  assignString(candidate, "rewardDescription", input.rewardDescription);
  assignString(candidate, "rewardRuleOrUnit", input.rewardRuleOrUnit);
  assignEnum(candidate, "baselineSource", input.baselineSource, BASELINE_SOURCES);
  assignNumber(candidate, "baselineQuantity", input.baselineQuantity);
  assignString(candidate, "baselineUnit", input.baselineUnit);
  assignEnum(candidate, "baselineConfidence", input.baselineConfidence, CONFIDENCE);
  assignEnum(candidate, "evidenceVerification", input.evidenceVerification, VERIFICATION);
  assignNumber(candidate, "allowedMisses", input.allowedMisses);
  assignNumber(candidate, "gracePeriodHours", input.gracePeriodHours);
  assignBoolean(candidate, "makeUpAllowed", input.makeUpAllowed);
  assignEnum(candidate, "postActivationWithdrawal", input.postActivationWithdrawal, WITHDRAWAL);
  assignBoolean(candidate, "redistributionEnabled", input.redistributionEnabled);
  assignEnum(candidate, "redistributionFormula", input.redistributionFormula, REDISTRIBUTION_FORMULAS);
  assignNumber(candidate, "redistributionMaximumQuantity", input.redistributionMaximumQuantity);
  assignNumber(candidate, "replacementRecruitmentHours", input.replacementRecruitmentHours);
  assignEnum(candidate, "redistributionFallback", input.redistributionFallback, REDISTRIBUTION_FALLBACKS);

  assignString(candidate, "projectDescription", input.projectDescription);
  assignEnum(candidate, "allocationMode", input.allocationMode, ALLOCATION_MODES);
  assignString(candidate, "settlementCurrency", input.settlementCurrency);
  assignNumber(candidate, "targetMinor", input.targetMinor);
  assignNumber(candidate, "maximumBudgetMinor", input.maximumBudgetMinor);
  assignString(candidate, "noPoolDefault", input.noPoolDefault);
  assignBoolean(candidate, "participationBeatsDefault", input.participationBeatsDefault);
  assignBoolean(candidate, "preauthorizeExecutableFallback", input.preauthorizeExecutableFallback);
  assignNumber(candidate, "paymentRepairWindowHours", input.paymentRepairWindowHours);
  assignEnum(candidate, "recurringMode", input.recurringMode, RECURRING_MODES);
  assignString(candidate, "recurringFrequency", input.recurringFrequency);
  assignNumber(candidate, "recurringMaximumMinor", input.recurringMaximumMinor);
  assignBoolean(candidate, "milestoneBasedPayout", input.milestoneBasedPayout);
  assignEnum(
    candidate,
    "coFundDeadlineOutcome",
    input.coFundDeadlineOutcome,
    COFUND_DEADLINE_OUTCOMES,
  );
  assignNumber(candidate, "coFundExtensionHours", input.coFundExtensionHours);
  assignEnum(
    candidate,
    "coFundFailureFallback",
    input.coFundFailureFallback,
    COFUND_FAILURE_FALLBACKS,
  );

  if (Array.isArray(input.paymentMethods)) {
    const methods = input.paymentMethods.filter(
      (value): value is GroupContributionDraftState["paymentMethods"][number] =>
        typeof value === "string" && PAYMENT_METHODS.has(value),
    );
    candidate.paymentMethods = [...new Set(methods)];
  }

  if (underlyingContribution === "financial" && candidate.mode === "co-act") candidate.mode = "solo";
  if (underlyingContribution === "nonfinancial" && candidate.mode === "co-fund") candidate.mode = "solo";

  return normalizeDraft(candidate);
}

function sanitizeParticipantTargets(value: unknown): ParticipantTarget[] {
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
      // Do not infer account identity from an old free-text draft.
    }
  }
  return targets;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assignString<K extends keyof GroupContributionDraftState>(
  target: GroupContributionDraftState,
  key: K,
  value: unknown,
): void {
  if (typeof value === "string") target[key] = value as GroupContributionDraftState[K];
}

function assignNumber<K extends keyof GroupContributionDraftState>(
  target: GroupContributionDraftState,
  key: K,
  value: unknown,
): void {
  if (typeof value === "number" && Number.isFinite(value)) {
    target[key] = value as GroupContributionDraftState[K];
  }
}

function assignNullableNumber<K extends keyof GroupContributionDraftState>(
  target: GroupContributionDraftState,
  key: K,
  value: unknown,
): void {
  if (value === null || (typeof value === "number" && Number.isFinite(value))) {
    target[key] = value as GroupContributionDraftState[K];
  }
}

function assignBoolean<K extends keyof GroupContributionDraftState>(
  target: GroupContributionDraftState,
  key: K,
  value: unknown,
): void {
  if (typeof value === "boolean") target[key] = value as GroupContributionDraftState[K];
}

function assignEnum<K extends keyof GroupContributionDraftState>(
  target: GroupContributionDraftState,
  key: K,
  value: unknown,
  allowed: ReadonlySet<string>,
): void {
  if (typeof value === "string" && allowed.has(value)) {
    target[key] = value as GroupContributionDraftState[K];
  }
}
