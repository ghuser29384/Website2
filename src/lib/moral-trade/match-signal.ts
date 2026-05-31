export const MORAL_TRADE_MATCH_SIGNAL_VERSION = "moral-trade-match-signal-v0.2";
export const MORAL_TRADE_MATCH_SIGNAL_CONTRACT_VERSION =
  "moral-trade-match-signal-contract-v0.2-2026-05";
export const MORAL_TRADE_MATCH_SIGNAL_CONTRACT_VALIDATOR_VERSION =
  "moral-trade-match-signal-contract-validator-v0.1";

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
  participantExplanation: MoralTradeMatchParticipantExplanation;
  counts: {
    sharedCauseAreas: number;
    causeAreaComplementarity: number;
    compatibleTradeModes: number;
    compatibleVerificationPreferences: number;
  };
  blockers: string[];
}

export interface MoralTradeMatchParticipantExplanation {
  headline: "Why you are seeing this match" | "Why this match is paused";
  summary: string;
  visibleFactorCodes: MoralTradeMatchFactorCode[];
  redactionNotice: string;
  humanReviewNotice: string;
}

export interface MoralTradeMatchParticipantExplanationTemplate {
  matchableHeadline: MoralTradeMatchParticipantExplanation["headline"];
  notMatchableHeadline: MoralTradeMatchParticipantExplanation["headline"];
  matchableSummary: string;
  notMatchableSummary: string;
  redactionNotice: string;
  humanReviewNotice: string;
}

export interface MoralTradeMatchSignalContract {
  version: string;
  purpose: string;
  decisioningMode: "redacted_profile_match_preview_only";
  stateMutation: false;
  requiredInputFields: Array<keyof MoralTradeRedactedProfile>;
  optionalInputFields: Array<keyof MoralTradeRedactedProfile>;
  approvedFactorCodes: MoralTradeMatchFactorCode[];
  redactedFields: string[];
  participantExplanationTemplate: MoralTradeMatchParticipantExplanationTemplate;
  invariants: string[];
  sampleInput: MoralTradeRedactedProfileMatchInput;
  sampleSignal: MoralTradeMatchSignal;
  contractTests: string[];
}

export interface MoralTradeMatchSignalContractCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradeMatchSignalContractValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-match-signal-contract";
  validatorVersion: string;
  contractVersion: string;
  checks: MoralTradeMatchSignalContractCheck[];
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

const MATCH_SIGNAL_REQUIRED_INPUT_FIELDS = [
  "profileId",
  "causeAreas",
  "tradeModes",
  "verificationPreferences",
  "locationSensitivity",
  "privacyStage",
  "privacyConstraints",
  "statedExclusions",
] as const satisfies ReadonlyArray<keyof MoralTradeRedactedProfile>;

const MATCH_SIGNAL_OPTIONAL_INPUT_FIELDS = [
  "offeredCauseAreas",
  "requestedCauseAreas",
  "locationRegion",
  "locationCity",
] as const satisfies ReadonlyArray<keyof MoralTradeRedactedProfile>;

const MATCH_SIGNAL_CONTRACT_TESTS = [
  "match_signal_contract_validator",
  "redacted_profile_match_signal_smoke",
  "participant_explanation_copy_smoke",
  "match_signal_evaluate_route_contract",
  "technical_spec_match_signal_smoke",
] as const;

const PARTICIPANT_EXPLANATION_TEMPLATE: MoralTradeMatchParticipantExplanationTemplate = {
  matchableHeadline: "Why you are seeing this match",
  notMatchableHeadline: "Why this match is paused",
  matchableSummary:
    "You are seeing this suggestion because public cause areas, trade mode, and verification preferences are compatible. Exact wishes and contact details are still hidden.",
  notMatchableSummary:
    "This profile pair is not matchable yet because one or more public compatibility checks are unresolved. Exact wishes and contact details are still hidden.",
  redactionNotice:
    "Exact wishes, contact details, sensitive constraints, raw profile notes, protected traits, and ideology or psychology inferences stay hidden until a valid consent stage.",
  humanReviewNotice:
    "Human review is mandatory before disclosure, contact, reliance, or state changes.",
};

const MATCH_SIGNAL_SAMPLE_INPUT: MoralTradeRedactedProfileMatchInput = {
  left: {
    profileId: "sample-left",
    causeAreas: ["Animal welfare", "Global health"],
    offeredCauseAreas: ["Animal welfare"],
    requestedCauseAreas: ["Global health"],
    tradeModes: ["pledge_swap", "donation_offset"],
    verificationPreferences: ["receipt", "public_log"],
    locationSensitivity: "region",
    locationRegion: "New York",
    locationCity: null,
    privacyStage: "broad_preview",
    privacyConstraints: ["broad previews only"],
    statedExclusions: ["no political campaign offsets"],
  },
  right: {
    profileId: "sample-right",
    causeAreas: ["Animal welfare", "Climate"],
    offeredCauseAreas: ["Global health"],
    requestedCauseAreas: ["Animal welfare"],
    tradeModes: ["pledge_swap"],
    verificationPreferences: ["receipt", "attestation"],
    locationSensitivity: "region",
    locationRegion: "New York",
    locationCity: null,
    privacyStage: "broad_preview",
    privacyConstraints: ["keep contact private"],
    statedExclusions: ["no anonymous paid action"],
  },
};

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function normalizedTokens(value: string) {
  return normalize(value)
    .split(" ")
    .map((token) => token.replace(/[^a-z0-9]/g, ""))
    .map((token) => (token.length > 3 ? token.replace(/s$/, "") : token))
    .filter(Boolean);
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
  const counterpartyPublicFields = [
    ...counterparty.causeAreas,
    ...counterparty.tradeModes,
    ...counterparty.verificationPreferences,
  ]
    .map(normalize)
    .filter(Boolean);

  return profile.statedExclusions.some((exclusion) => {
    const normalizedExclusion = normalize(exclusion);
    const exclusionTokens = new Set(normalizedTokens(exclusion));

    if (!normalizedExclusion || !exclusionTokens.size) {
      return false;
    }

    return counterpartyPublicFields.some((field) => {
      const fieldTokens = normalizedTokens(field);

      return (
        normalizedExclusion === field ||
        normalizedExclusion.includes(field) ||
        (fieldTokens.length > 0 && fieldTokens.every((token) => exclusionTokens.has(token)))
      );
    });
  });
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

function buildParticipantExplanation({
  blockers,
  factorCodes,
  redactedFields,
  status,
}: {
  blockers: readonly string[];
  factorCodes: readonly MoralTradeMatchFactorCode[];
  redactedFields: readonly string[];
  status: MoralTradeMatchStatus;
}): MoralTradeMatchParticipantExplanation {
  const visibleFactorCodes = factorCodes.filter(
    (code) =>
      code !== "human_review_required" &&
      (code === "cause_area_overlap" ||
        code === "cause_area_complementarity" ||
        code === "trade_mode_compatible" ||
        code === "verification_preference_compatible" ||
        code === "location_constraint_satisfied" ||
        code === "privacy_stage_compatible" ||
        code === "privacy_safe_preview" ||
        code === "stated_exclusions_clear"),
  );
  const unresolved = blockers.length
    ? ` Unresolved checks: ${blockers.join(", ")}.`
    : "";

  return {
    headline:
      status === "matchable"
        ? PARTICIPANT_EXPLANATION_TEMPLATE.matchableHeadline
        : PARTICIPANT_EXPLANATION_TEMPLATE.notMatchableHeadline,
    summary:
      status === "matchable"
        ? PARTICIPANT_EXPLANATION_TEMPLATE.matchableSummary
        : `${PARTICIPANT_EXPLANATION_TEMPLATE.notMatchableSummary}${unresolved}`,
    visibleFactorCodes,
    redactionNotice: `${PARTICIPANT_EXPLANATION_TEMPLATE.redactionNotice} Redacted fields: ${redactedFields.join(", ")}.`,
    humanReviewNotice: PARTICIPANT_EXPLANATION_TEMPLATE.humanReviewNotice,
  };
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
  const redactedFields = [...MORAL_TRADE_MATCH_SIGNAL_REDACTED_FIELDS];

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
    redactedFields,
    humanReviewRequired,
    participantExplanation: buildParticipantExplanation({
      blockers,
      factorCodes,
      redactedFields,
      status,
    }),
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

  const explanation = signal.participantExplanation;

  if (!explanation) {
    blockers.push("participant_explanation: required for match-signal display");
  } else {
    if (
      signal.status === "matchable" &&
      !/public cause areas/i.test(explanation.summary)
    ) {
      blockers.push("participant_explanation: matchable summary must name public cause-area basis");
    }

    if (
      !/Exact wishes/i.test(explanation.redactionNotice) ||
      !/contact details/i.test(explanation.redactionNotice)
    ) {
      blockers.push("participant_explanation: redaction copy must name exact wishes and contact details");
    }

    if (!/Human review/i.test(explanation.humanReviewNotice) || !/state changes/i.test(explanation.humanReviewNotice)) {
      blockers.push("participant_explanation: human-review copy must block autonomous state changes");
    }

    for (const code of explanation.visibleFactorCodes) {
      if (!signal.factorCodes.includes(code)) {
        blockers.push(`participant_explanation: visible factor not present on signal ${code}`);
      }
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

function matchSignalContractCheck(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeMatchSignalContractCheck {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

function hasAll(values: readonly string[], required: readonly string[]) {
  return required.every((value) => values.includes(value));
}

export function getMoralTradeMatchSignalContract(): MoralTradeMatchSignalContract {
  const sampleSignal = evaluateMoralTradeRedactedProfileMatch(MATCH_SIGNAL_SAMPLE_INPUT);

  return {
    version: MORAL_TRADE_MATCH_SIGNAL_CONTRACT_VERSION,
    purpose:
      "Public contract for redacted profile match previews: determine potential matchability from explicit cause, mode, verification, location, privacy, and exclusion factors without private inference or autonomous disclosure.",
    decisioningMode: "redacted_profile_match_preview_only",
    stateMutation: false,
    requiredInputFields: [...MATCH_SIGNAL_REQUIRED_INPUT_FIELDS],
    optionalInputFields: [...MATCH_SIGNAL_OPTIONAL_INPUT_FIELDS],
    approvedFactorCodes: Array.from(MATCH_SIGNAL_FACTOR_CODES),
    redactedFields: [...MORAL_TRADE_MATCH_SIGNAL_REDACTED_FIELDS],
    participantExplanationTemplate: PARTICIPANT_EXPLANATION_TEMPLATE,
    invariants: [
      "Use only redacted profile fields: cause areas, trade modes, verification preferences, location sensitivity, privacy constraints, and stated exclusions.",
      "Do not infer protected traits, ideology, psychology, hidden preferences, exact private wishes, raw notes, or contact details.",
      "A matchable signal is only a preview and always requires human review before disclosure, contact, reliance, or state changes.",
      "Factor codes must include cause overlap or complementarity, trade-mode compatibility, and verification compatibility before matchable status.",
      "Privacy-safe preview requires compatible privacy stages and named redacted fields.",
    ],
    sampleInput: MATCH_SIGNAL_SAMPLE_INPUT,
    sampleSignal,
    contractTests: [...MATCH_SIGNAL_CONTRACT_TESTS],
  };
}

export function validateMoralTradeMatchSignalContract(
  contract: MoralTradeMatchSignalContract = getMoralTradeMatchSignalContract(),
): MoralTradeMatchSignalContractValidation {
  const sampleValidation = validateMoralTradeMatchSignal(contract.sampleSignal);
  const approvedFactorCodes = contract.approvedFactorCodes.map(String);
  const redactedFields = contract.redactedFields.map(String);
  const checks = [
    matchSignalContractCheck(
      "input-field-boundary",
      "Contract names only redacted profile input fields",
      hasAll(contract.requiredInputFields, MATCH_SIGNAL_REQUIRED_INPUT_FIELDS) &&
        hasAll(contract.optionalInputFields, MATCH_SIGNAL_OPTIONAL_INPUT_FIELDS) &&
        !contract.requiredInputFields.includes("contactDetails" as keyof MoralTradeRedactedProfile) &&
        !contract.optionalInputFields.includes("rawPrivateNotes" as keyof MoralTradeRedactedProfile),
      [...contract.requiredInputFields, ...contract.optionalInputFields].join(", "),
    ),
    matchSignalContractCheck(
      "approved-factor-codes",
      "Contract publishes the approved match explanation factor codes",
      hasAll(approvedFactorCodes, Array.from(MATCH_SIGNAL_FACTOR_CODES)) &&
        contract.sampleSignal.factorCodes.every((code) =>
          contract.approvedFactorCodes.includes(code),
        ),
      approvedFactorCodes.join(", "),
    ),
    matchSignalContractCheck(
      "redaction-boundary",
      "Contract preserves exact wish, contact, source-note, and inference redactions",
      hasAll(redactedFields, MORAL_TRADE_MATCH_SIGNAL_REDACTED_FIELDS) &&
        contract.sampleSignal.redactedFields.every((field) =>
          contract.redactedFields.includes(field),
        ),
      redactedFields.join(", "),
    ),
    matchSignalContractCheck(
      "sample-signal-validation",
      "Synthetic redacted-profile pair produces a valid match signal",
      sampleValidation.status === "pass" &&
        contract.sampleSignal.status === "matchable" &&
        contract.sampleSignal.humanReviewRequired &&
        contract.sampleSignal.factorCodes.includes("privacy_safe_preview"),
      `${contract.sampleSignal.status}; blockers ${sampleValidation.blockers.length}`,
    ),
    matchSignalContractCheck(
      "nonmutating-human-review",
      "Match previews cannot disclose, contact, rely, or mutate state",
      contract.stateMutation === false &&
        contract.decisioningMode === "redacted_profile_match_preview_only" &&
        contract.invariants.some((invariant) => /human review/i.test(invariant)) &&
        contract.invariants.some((invariant) => /state changes/i.test(invariant)),
      `${contract.decisioningMode}; stateMutation ${contract.stateMutation}`,
    ),
    matchSignalContractCheck(
      "no-private-inference",
      "Contract forbids private inference and hidden preference fields",
      contract.invariants.some((invariant) => /protected traits/i.test(invariant)) &&
        contract.invariants.some((invariant) => /ideology/i.test(invariant)) &&
        contract.invariants.some((invariant) => /hidden preferences/i.test(invariant)) &&
        contract.redactedFields.includes("ideology_or_psychology_inferences"),
      contract.invariants.join(" | "),
    ),
    matchSignalContractCheck(
      "participant-explanation-template",
      "Contract publishes participant copy that names match basis, redactions, and human review",
      /public cause areas/i.test(contract.participantExplanationTemplate.matchableSummary) &&
        /trade mode/i.test(contract.participantExplanationTemplate.matchableSummary) &&
        /verification preferences/i.test(contract.participantExplanationTemplate.matchableSummary) &&
        /Exact wishes/i.test(contract.participantExplanationTemplate.redactionNotice) &&
        /contact details/i.test(contract.participantExplanationTemplate.redactionNotice) &&
        /Human review/i.test(contract.participantExplanationTemplate.humanReviewNotice) &&
        /state changes/i.test(contract.participantExplanationTemplate.humanReviewNotice) &&
        /Exact wishes/i.test(contract.sampleSignal.participantExplanation.redactionNotice),
      `${contract.participantExplanationTemplate.matchableHeadline}; ${contract.participantExplanationTemplate.redactionNotice}`,
    ),
    matchSignalContractCheck(
      "contract-tests",
      "Match signal contract test hooks are named",
      MATCH_SIGNAL_CONTRACT_TESTS.every((hook) => contract.contractTests.includes(hook)),
      contract.contractTests.join(", "),
    ),
  ];
  const blockers = checks
    .filter((check) => check.status === "fail")
    .map((check) => `${check.id}: ${check.label}`);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-match-signal-contract",
    validatorVersion: MORAL_TRADE_MATCH_SIGNAL_CONTRACT_VALIDATOR_VERSION,
    contractVersion: contract.version,
    checks,
    blockers,
  };
}
