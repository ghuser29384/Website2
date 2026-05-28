import externalityProfileJson from "../../../config/moral-trade/externality-profile.json";

export const MORAL_TRADE_EXTERNALITY_VALIDATOR_VERSION =
  "moral-trade-externality-validator-v0.1";

type ExternalityRuleEntry = {
  key: string;
  label: string;
  rule: string;
};

type ExternalityStandardEntry = {
  key: string;
  label: string;
  scope: string;
};

export type MoralTradeExternalityProfile = {
  version: string;
  purpose: string;
  dueDiligenceSteps: ExternalityRuleEntry[];
  triggerCodes: ExternalityRuleEntry[];
  reviewStandards: ExternalityStandardEntry[];
  remedyControls: ExternalityRuleEntry[];
  allowedOutcomes: MoralTradeExternalityOutcome[];
  externalityTests: string[];
};

export type MoralTradeExternalityOutcome =
  | "no_externality_review_required"
  | "needs_human_review"
  | "challenge_window"
  | "blocked"
  | "disputed_unresolved";

export interface MoralTradeExternalityValidationCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradeExternalityProfileValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-externality-profile";
  validatorVersion: string;
  profileVersion: string;
  checks: MoralTradeExternalityValidationCheck[];
  blockers: string[];
}

export interface MoralTradeExternalityReviewInput {
  triggerCodes: string[];
  affectedPartyStandingDocumented?: boolean;
  remediationPlanDocumented?: boolean;
  privacySafeReportingPlanned?: boolean;
  humanReviewApproved?: boolean;
  sourceStandards?: string[];
}

export interface MoralTradeExternalityReviewDecision {
  status: "pass" | "fail";
  outcome: MoralTradeExternalityOutcome;
  requiredStandards: string[];
  blockers: string[];
  reasonCodes: string[];
}

const externalityProfile = externalityProfileJson as MoralTradeExternalityProfile;

const REQUIRED_DUE_DILIGENCE_STEPS = [
  "embed_policy",
  "identify_impacts",
  "prevent_or_mitigate",
  "track_results",
  "communicate",
  "remediate",
] as const;

const REQUIRED_TRIGGER_CODES = [
  "unrepresented_third_party",
  "vulnerable_party_pressure",
  "political_or_campaign_adjacent",
  "paid_action_pressure",
  "labor_or_supply_chain",
  "recipient_or_destination_risk",
  "environment_or_community_impact",
  "perverse_incentive",
] as const;

const REQUIRED_REVIEW_STANDARDS = [
  "oecd_due_diligence",
  "un_guiding_principles",
  "ilo_fundamental_principles",
  "eti_base_code",
  "fairtrade_standards",
  "open_supply_hub",
] as const;

const REQUIRED_REMEDY_CONTROLS = [
  "affected_party_standing",
  "remediation_plan",
  "challenge_window_required",
  "privacy_safe_reporting",
] as const;

const REQUIRED_OUTCOMES = [
  "no_externality_review_required",
  "needs_human_review",
  "challenge_window",
  "blocked",
  "disputed_unresolved",
] as const;

const REQUIRED_TESTS = [
  "externality_profile_validator",
  "due_diligence_steps_contract",
  "affected_party_remedy_gate",
  "labor_supply_chain_standard_gate",
  "health_route_contract_smoke",
] as const;

function hasAll(values: readonly string[], required: readonly string[]) {
  return required.every((entry) => values.includes(entry));
}

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeExternalityValidationCheck {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

export function getMoralTradeExternalityProfile() {
  return externalityProfile;
}

function getRequiredExternalityStandards(triggerCodes: readonly string[]) {
  const required = new Set<string>(["oecd_due_diligence", "un_guiding_principles"]);

  if (triggerCodes.includes("labor_or_supply_chain")) {
    required.add("ilo_fundamental_principles");
    required.add("eti_base_code");
    required.add("open_supply_hub");
  }

  if (triggerCodes.includes("recipient_or_destination_risk")) {
    required.add("fairtrade_standards");
  }

  return [...required];
}

export function evaluateMoralTradeExternalityReview(
  input: MoralTradeExternalityReviewInput,
  profile: MoralTradeExternalityProfile = externalityProfile,
): MoralTradeExternalityReviewDecision {
  const triggerSet = new Set(input.triggerCodes);
  const knownTriggers = new Set(profile.triggerCodes.map((entry) => entry.key));
  const sourceStandards = new Set(input.sourceStandards ?? []);
  const unknownTriggers = [...triggerSet].filter((trigger) => !knownTriggers.has(trigger));
  const requiredStandards = getRequiredExternalityStandards([...triggerSet]);
  const blockers: string[] = [];
  const reasonCodes = [...triggerSet];

  if (!triggerSet.size) {
    return {
      status: "pass",
      outcome: "no_externality_review_required",
      requiredStandards: [],
      blockers: [],
      reasonCodes: ["no_externality_triggers"],
    };
  }

  if (unknownTriggers.length) {
    blockers.push(`unknown_externality_trigger:${unknownTriggers.join(",")}`);
  }

  if (!input.affectedPartyStandingDocumented) {
    blockers.push("affected_party_standing_required");
  }

  if (!input.remediationPlanDocumented) {
    blockers.push("remediation_plan_required");
  }

  if (!input.privacySafeReportingPlanned) {
    blockers.push("privacy_safe_reporting_required");
  }

  if (!input.humanReviewApproved) {
    blockers.push("human_review_required_before_externality_clearance");
  }

  for (const standard of requiredStandards) {
    if (!sourceStandards.has(standard)) {
      blockers.push(`source_standard_required:${standard}`);
    }
  }

  if (triggerSet.has("perverse_incentive")) {
    reasonCodes.push("challenge_window_required");
  }

  return {
    status: blockers.length ? "fail" : "pass",
    outcome: blockers.length ? "needs_human_review" : "challenge_window",
    requiredStandards,
    blockers,
    reasonCodes,
  };
}

export function validateMoralTradeExternalityProfile(
  profile: MoralTradeExternalityProfile = externalityProfile,
): MoralTradeExternalityProfileValidation {
  const stepKeys = profile.dueDiligenceSteps.map((entry) => entry.key);
  const triggerKeys = profile.triggerCodes.map((entry) => entry.key);
  const standardKeys = profile.reviewStandards.map((entry) => entry.key);
  const remedyKeys = profile.remedyControls.map((entry) => entry.key);
  const checks = [
    check(
      "due-diligence-steps",
      "OECD-style due-diligence steps",
      hasAll(stepKeys, REQUIRED_DUE_DILIGENCE_STEPS) &&
        profile.dueDiligenceSteps.every((entry) => entry.rule),
      stepKeys.join(", "),
    ),
    check(
      "externality-triggers",
      "Material externality trigger codes",
      hasAll(triggerKeys, REQUIRED_TRIGGER_CODES),
      triggerKeys.join(", "),
    ),
    check(
      "review-standards",
      "External review standards",
      hasAll(standardKeys, REQUIRED_REVIEW_STANDARDS) &&
        profile.reviewStandards.every((entry) => entry.scope),
      standardKeys.join(", "),
    ),
    check(
      "remedy-controls",
      "Affected-party standing and remedy controls",
      hasAll(remedyKeys, REQUIRED_REMEDY_CONTROLS) &&
        profile.remedyControls.some(
          (entry) => entry.key === "challenge_window_required" && /challenge_window/i.test(entry.rule),
        ),
      remedyKeys.join(", "),
    ),
    check(
      "allowed-outcomes",
      "Externality review outcomes",
      hasAll(profile.allowedOutcomes, REQUIRED_OUTCOMES),
      profile.allowedOutcomes.join(", "),
    ),
    check(
      "externality-tests",
      "Externality test hooks",
      hasAll(profile.externalityTests, REQUIRED_TESTS),
      profile.externalityTests.join(", "),
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => `${entry.id}: ${entry.label}`);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-externality-profile",
    validatorVersion: MORAL_TRADE_EXTERNALITY_VALIDATOR_VERSION,
    profileVersion: profile.version,
    checks,
    blockers,
  };
}
