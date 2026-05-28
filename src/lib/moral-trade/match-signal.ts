export const MORAL_TRADE_MATCH_SIGNAL_VERSION = "moral-trade-match-signal-v0.1";

export type MoralTradeMatchStatus = "matchable" | "not_matchable";
export type MoralTradeMatchConfidenceBand = "low" | "medium" | "high";
export type MoralTradeMatchTradeMode =
  | "pledge_swap"
  | "donation_offset"
  | "paid_action"
  | "public_good_commitment";
export type MoralTradeMatchPrivacyStage = "broad_preview" | "detail_request" | "mutual_consent";
export type MoralTradeLocationSensitivity = "none" | "region" | "city";

export type MoralTradeMatchFactorCode =
  | "cause_area_overlap"
  | "cause_area_complementarity"
  | "trade_mode_compatible"
  | "verification_preference_compatible"
  | "location_constraint_satisfied"
  | "privacy_safe_preview"
  | "privacy_stage_compatible"
  | "stated_exclusions_clear"
  | "human_review_required";

export interface MoralTradeRedactedProfile {
  profileId: string;
  causeAreas: string[];
  offeredCauseAreas?: string[];
  requestedCauseAreas?: string[];
  tradeModes: MoralTradeMatchTradeMode[];
  verificationPreferences: string[];
  locationSensitivity: MoralTradeLocationSensitivity;
  locationRegion?: string | null;
  locationCity?: string | null;
  privacyStage: MoralTradeMatchPrivacyStage;
  privacyConstraints: string[];
  statedExclusions: string[];
}

export interface MoralTradeRedactedProfileMatchInput {
  left: MoralTradeRedactedProfile;
  right: MoralTradeRedactedProfile;
}

export interface MoralTradeMatchSignal {
  signalVersion: string;
  status: MoralTradeMatchStatus;
  confidenceBand: MoralTradeMatchConfidenceBand;
  factorCodes: MoralTradeMatchFactorCode[];
  redactedFields: string[];
  humanReviewRequired: boolean;
  counts: {
    sharedCauseAreas: number;
    causeAreaComplementarity: number;
    compatibleTradeModes: number;
    compatibleVerificationPreferences: number;
  };
  blockers: string[];
}

export const MORAL_TRADE_MATCH_SIGNAL_REDACTED_FIELDS = [
  "exact_private_wishes",
  "contact_details",
  "sensitive_constraints",
  "raw_profile_notes",
  "protected_traits",
  "ideology_or_psychology_inferences",
] as const;

const MATCH_SIGNAL_FACTOR_CODES = new Set<MoralTradeMatchFactorCode>([
  "cause_area_overlap",
  "cause_area_complementarity",
  "trade_mode_compatible",
  "verification_preference_compatible",
  "location_constraint_satisfied",
  "privacy_safe_preview",
  "privacy_stage_compatible",
  "stated_exclusions_clear",
  "human_review_required",
]);

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function normalizedSet(values: readonly string[]) {
  return new Set(values.map(normalize).filter(Boolean));
}

function countOverlap(leftValues: readonly string[], rightValues: readonly string[]) {
  const right = normalizedSet(rightValues);
  return [...normalizedSet(leftValues)].filter((value) => right.has(value)).length;
}

function countCauseAreaComplementarity(
  left: MoralTradeRedactedProfile,
  right: MoralTradeRedactedProfile,
) {
  return (
    countOverlap(left.offeredCauseAreas ?? [], right.requestedCauseAreas ?? []) +
    countOverlap(right.offeredCauseAreas ?? [], left.requestedCauseAreas ?? [])
  );
}

function hasPrivacyStop(profile: MoralTradeRedactedProfile) {
  const text = profile.privacyConstraints.map(normalize).join(" ");
  return /\b(no match|no matching|private only|do not match|manual only)\b/.test(text);
}

function hasStatedExclusionConflict(profile: MoralTradeRedactedProfile, counterparty: MoralTradeRedactedProfile) {
  const exclusions = normalizedSet(profile.statedExclusions);
  const counterpartyPublicFields = [
    ...counterparty.causeAreas,
    ...counterparty.tradeModes,
    ...counterparty.verificationPreferences,
  ].map(normalize);

  return counterpartyPublicFields.some((field) => exclusions.has(field));
}

function locationConstraintSatisfied(left: MoralTradeRedactedProfile, right: MoralTradeRedactedProfile) {
  const strongestSensitivity =
    left.locationSensitivity === "city" || right.locationSensitivity === "city"
      ? "city"
      : left.locationSensitivity === "region" || right.locationSensitivity === "region"
        ? "region"
        : "none";

  if (strongestSensitivity === "none") {
    return true;
  }

  if (strongestSensitivity === "city") {
    return Boolean(
      left.locationCity &&
        right.locationCity &&
        normalize(left.locationCity) === normalize(right.locationCity),
    );
  }

  return Boolean(
    left.locationRegion &&
      right.locationRegion &&
      normalize(left.locationRegion) === normalize(right.locationRegion),
  );
}

function getConfidenceBand({
  blockers,
  compatibleTradeModes,
  compatibleVerificationPreferences,
  causeAreaComplementarity,
  locationOk,
  privacyOk,
  sharedCauseAreas,
}: {
  blockers: readonly string[];
  compatibleTradeModes: number;
  compatibleVerificationPreferences: number;
  causeAreaComplementarity: number;
  locationOk: boolean;
  privacyOk: boolean;
  sharedCauseAreas: number;
}): MoralTradeMatchConfidenceBand {
  if (blockers.length) {
    return "low";
  }

  const score =
    Math.min(sharedCauseAreas + causeAreaComplementarity, 2) * 2 +
    Math.min(compatibleTradeModes, 2) * 2 +
    Math.min(compatibleVerificationPreferences, 2) +
    (locationOk ? 1 : 0) +
    (privacyOk ? 1 : 0);

  if (score >= 7) {
    return "high";
  }

  if (score >= 4) {
    return "medium";
  }

  return "low";
}

function uniqueFactorCodes(values: MoralTradeMatchFactorCode[]) {
  return [...new Set(values)];
}

export function evaluateMoralTradeRedactedProfileMatch({
  left,
  right,
}: MoralTradeRedactedProfileMatchInput): MoralTradeMatchSignal {
  const sharedCauseAreas = countOverlap(left.causeAreas, right.causeAreas);
  const causeAreaComplementarity = countCauseAreaComplementarity(left, right);
  const causeCompatible = sharedCauseAreas > 0 || causeAreaComplementarity > 0;
  const compatibleTradeModes = countOverlap(left.tradeModes, right.tradeModes);
  const compatibleVerificationPreferences = countOverlap(
    left.verificationPreferences,
    right.verificationPreferences,
  );
  const locationOk = locationConstraintSatisfied(left, right);
  const privacyOk = left.privacyStage === right.privacyStage && !hasPrivacyStop(left) && !hasPrivacyStop(right);
  const exclusionConflict =
    hasStatedExclusionConflict(left, right) || hasStatedExclusionConflict(right, left);
  const blockers = [
    causeCompatible ? "" : "cause_area_overlap_or_complementarity_required",
    compatibleTradeModes ? "" : "trade_mode_compatibility_required",
    compatibleVerificationPreferences ? "" : "verification_preference_compatibility_required",
    locationOk ? "" : "location_constraint_unresolved",
    privacyOk ? "" : "privacy_stage_or_constraint_unresolved",
    exclusionConflict ? "stated_exclusion_conflict" : "",
  ].filter(Boolean);
  const status: MoralTradeMatchStatus = blockers.length ? "not_matchable" : "matchable";
  const humanReviewRequired = status === "matchable" || blockers.some((blocker) => /privacy|location|exclusion/.test(blocker));
  const factorCodes = uniqueFactorCodes([
    sharedCauseAreas ? "cause_area_overlap" : "",
    causeAreaComplementarity ? "cause_area_complementarity" : "",
    compatibleTradeModes ? "trade_mode_compatible" : "",
    compatibleVerificationPreferences ? "verification_preference_compatible" : "",
    locationOk ? "location_constraint_satisfied" : "",
    privacyOk ? "privacy_stage_compatible" : "",
    privacyOk ? "privacy_safe_preview" : "",
    !exclusionConflict ? "stated_exclusions_clear" : "",
    humanReviewRequired ? "human_review_required" : "",
  ].filter(Boolean) as MoralTradeMatchFactorCode[]);

  return {
    signalVersion: MORAL_TRADE_MATCH_SIGNAL_VERSION,
    status,
    confidenceBand: getConfidenceBand({
      blockers,
      compatibleTradeModes,
      compatibleVerificationPreferences,
      causeAreaComplementarity,
      locationOk,
      privacyOk,
      sharedCauseAreas,
    }),
    factorCodes,
    redactedFields: [...MORAL_TRADE_MATCH_SIGNAL_REDACTED_FIELDS],
    humanReviewRequired,
    counts: {
      sharedCauseAreas,
      causeAreaComplementarity,
      compatibleTradeModes,
      compatibleVerificationPreferences,
    },
    blockers,
  };
}

export function validateMoralTradeMatchSignal(signal: MoralTradeMatchSignal) {
  const blockers: string[] = [];

  if (signal.signalVersion !== MORAL_TRADE_MATCH_SIGNAL_VERSION) {
    blockers.push("signal_version: unrecognized match-signal version");
  }

  if (signal.status === "matchable" && !signal.humanReviewRequired) {
    blockers.push("human_review_required: matchable signals cannot authorize disclosure automatically");
  }

  if (!signal.redactedFields.length) {
    blockers.push("redacted_fields: match signals must name fields kept redacted");
  }

  for (const required of MORAL_TRADE_MATCH_SIGNAL_REDACTED_FIELDS) {
    if (!signal.redactedFields.includes(required)) {
      blockers.push(`redacted_fields: missing ${required}`);
    }
  }

  for (const code of signal.factorCodes) {
    if (!MATCH_SIGNAL_FACTOR_CODES.has(code)) {
      blockers.push(`factor_codes: unapproved ${code}`);
    }
  }

  if (
    signal.factorCodes.includes("privacy_safe_preview") &&
    !signal.factorCodes.includes("privacy_stage_compatible")
  ) {
    blockers.push("privacy_safe_preview: requires compatible privacy stage and constraints");
  }

  if (
    signal.status === "matchable" &&
    ((!signal.factorCodes.includes("cause_area_overlap") &&
      !signal.factorCodes.includes("cause_area_complementarity")) ||
      !signal.factorCodes.includes("trade_mode_compatible") ||
      !signal.factorCodes.includes("verification_preference_compatible"))
  ) {
    blockers.push("factor_codes: matchable signals need cause overlap or complementarity, mode, and verification factors");
  }

  if (signal.status === "matchable" && signal.blockers.length) {
    blockers.push("blockers: matchable signals cannot carry unresolved blockers");
  }

  return {
    status: blockers.length ? "fail" : "pass",
    blockers,
  };
}
