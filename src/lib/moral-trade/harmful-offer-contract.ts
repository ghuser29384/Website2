import { createHash } from "node:crypto";

export const HARMFUL_OFFER_ASSESSMENT_SCHEMA_VERSION =
  "moral-trade-harmful-offer-assessment-v2" as const;
export const HARMFUL_OFFER_POLICY_VERSION =
  "pluralist-harm-policy-2026-08-06-v2" as const;

export const HARMFUL_OFFER_DIMENSIONS = [
  "coercion_threats_extortion",
  "deception_concealment_epistemic_manipulation",
  "exploitation_benefit_burden_asymmetry",
  "severe_or_irreversible_harm",
  "third_party_or_public_goods_externalities",
  "discrimination_or_protected_class_targeting",
  "destabilization_or_conflict_escalation",
  "dangerous_illegal_or_abuse_enabling_conduct",
  "sexual_or_romantic_relationship_exchange",
  "religious_conversion_exchange",
  "consent_authorization_mandate_enforceability",
  "uncertainty_evidence_quality_assumption_sensitivity",
  "mitigation_feasibility_verifiability_reversibility",
  "funding_public_goods_free_rider_effects",
  "counterfactual_deadweight_leakage_displacement_moral_licensing",
] as const;

export const HARMFUL_OFFER_REASON_CODES = [
  "HARD_EXTORTION_OR_VALUE_DESTROYING_THREAT",
  "HARD_DIRECT_VIOLENCE_TRAFFICKING_OR_FORCED_LABOR",
  "HARD_SEXUAL_ABUSE_OR_MINOR_SEXUAL_CONTENT",
  "HARD_SELF_HARM_FACILITATION",
  "HARD_FRAUD_THEFT_OR_DECEPTIVE_FUNDRAISING",
  "HARD_STALKING_DOXXING_OR_NONCONSENSUAL_SURVEILLANCE",
  "HARD_DESTRUCTIVE_CYBER_ABUSE",
  "HARD_ILLEGAL_WEAPONS_DRUGS_OR_CONTRABAND",
  "HARD_UNLAWFUL_DISCRIMINATION_OR_RIGHTS_DENIAL",
  "HARD_UNAMBIGUOUSLY_ILLEGAL_CONDUCT",
  "REVIEW_AMBIGUOUS_PROTECTIVE_OR_NON_OPERATIONAL_CONTEXT",
  "REVIEW_SEXUAL_OR_ROMANTIC_EXCHANGE",
  "REVIEW_RELIGIOUS_CONVERSION_EXCHANGE",
  "REVIEW_DECEPTION_OR_CONCEALMENT",
  "REVIEW_EXPLOITATION_OR_DEPENDENCY",
  "REVIEW_SEVERE_OR_IRREVERSIBLE_HARM",
  "REVIEW_THIRD_PARTY_OR_PUBLIC_GOODS_EXTERNALITY",
  "REVIEW_DISCRIMINATION_OR_RIGHTS",
  "REVIEW_DESTABILIZATION_OR_CONFLICT_ESCALATION",
  "REVIEW_CONSENT_AUTHORITY_OR_ENFORCEABILITY",
  "REVIEW_UNCERTAINTY_OR_THIN_EVIDENCE",
  "REVIEW_WEAK_MITIGATION_VERIFICATION_OR_REVERSIBILITY",
  "REVIEW_FREE_RIDER_OR_COORDINATION_RISK",
  "REVIEW_COUNTERFACTUAL_LEAKAGE_DISPLACEMENT_OR_PERVERSE_INCENTIVE",
  "REVIEW_MODEL_UNRESOLVED",
] as const;

export const HARMFUL_OFFER_MODEL_REASON_CODES = HARMFUL_OFFER_REASON_CODES.filter(
  (code) => code.startsWith("REVIEW_"),
);

export type HarmfulOfferDimension = (typeof HARMFUL_OFFER_DIMENSIONS)[number];
export type HarmfulOfferReasonCode = (typeof HARMFUL_OFFER_REASON_CODES)[number];
export type HarmfulOfferTrigger =
  | "live_draft"
  | "publication"
  | "material_edit"
  | "amendment"
  | "pre_activation"
  | "participant_or_obligation_change"
  | "dispute"
  | "report"
  | "moderation";
export type HarmfulOfferRoute = "allow" | "human_review" | "block";
export type HarmfulOfferSeverity = "low" | "medium" | "high" | "critical";
export type HarmfulOfferEvidenceQuality = "strong" | "mixed" | "thin";
export type HarmfulOfferReversibilityConcern = "low" | "moderate" | "high";
export type HarmfulOfferThirdPartySeverity =
  | "none"
  | "low"
  | "moderate"
  | "high"
  | "critical";
export type HarmfulOfferBaselineComparison =
  | "better_or_equal"
  | "uncertain"
  | "worse";

export interface HarmfulOfferFinding {
  id: string;
  reasonCode: HarmfulOfferReasonCode;
  dimension: HarmfulOfferDimension;
  severity: HarmfulOfferSeverity;
  confidence: number;
  title: string;
  explanation: string;
  evidence: string[];
  affectedFields: string[];
  policyBasis: string;
  recommendedControls: string[];
  source: "rule" | "model";
  hardPolicyBlock: boolean;
}

export interface HarmfulOfferLowRiskAssessment {
  overallConfidence: number;
  evidenceQuality: HarmfulOfferEvidenceQuality;
  reversibilityConcern: HarmfulOfferReversibilityConcern;
  contestedMoralFrame: boolean;
  thirdPartyEffectSeverity: HarmfulOfferThirdPartySeverity;
  legitimateVetoHolderIdentified: boolean;
  humanOnlySensitiveDomain: boolean;
  baselineComparison: HarmfulOfferBaselineComparison;
  plausibleSevereHarm: boolean;
  dependentPartyRisk: boolean;
  opaqueCoercionIncentives: boolean;
}

export interface HarmfulOfferModelResult {
  findings: Array<Omit<HarmfulOfferFinding, "id" | "source" | "hardPolicyBlock">>;
  unresolvedQuestions: string[];
  lowRiskAssessment: HarmfulOfferLowRiskAssessment;
}

export interface HarmfulOfferAssessment {
  schemaVersion: typeof HARMFUL_OFFER_ASSESSMENT_SCHEMA_VERSION;
  policyVersion: typeof HARMFUL_OFFER_POLICY_VERSION;
  trigger: HarmfulOfferTrigger;
  route: HarmfulOfferRoute;
  enforcementBasis:
    | "deterministic_hard_policy"
    | "human_review_required"
    | "completed_low_risk_assessment";
  summary: string;
  sourceHash: string;
  assessedAt: string;
  findings: HarmfulOfferFinding[];
  unresolvedQuestions: string[];
  recommendedControls: string[];
  lowRiskAssessment: HarmfulOfferLowRiskAssessment;
  automaticPermitCriteria: {
    passed: boolean;
    failedCriteria: string[];
  };
  ruleAssessment: {
    status: "completed";
    findingCount: number;
    hardPolicyBlockCount: number;
  };
  modelAssessment: {
    status: "not_requested" | "completed" | "unavailable" | "invalid";
    model: string | null;
    findingCount: number;
    note: string | null;
  };
}

export interface HarmfulOfferAssessmentOptions {
  trigger: HarmfulOfferTrigger;
  includeModel?: boolean;
  now?: () => Date;
  modelEvaluator?: (input: {
    draft: unknown;
    trigger: HarmfulOfferTrigger;
    sourceHash: string;
  }) => Promise<HarmfulOfferModelResult>;
}

export function stableHarmfulOfferValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableHarmfulOfferValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, stableHarmfulOfferValue(nested)]),
    );
  }
  return value;
}

export function stableHarmfulOfferJson(value: unknown) {
  return JSON.stringify(stableHarmfulOfferValue(value));
}

export function hashHarmfulOfferSource(value: unknown) {
  return createHash("sha256").update(stableHarmfulOfferJson(value)).digest("hex");
}
