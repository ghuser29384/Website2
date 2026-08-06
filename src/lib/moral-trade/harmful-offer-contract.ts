import { createHash } from "node:crypto";

export const HARMFUL_OFFER_ASSESSMENT_SCHEMA_VERSION =
  "moral-trade-harmful-offer-assessment-v1" as const;
export const HARMFUL_OFFER_POLICY_VERSION =
  "pluralist-harm-policy-2026-08-06" as const;

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

export type HarmfulOfferDimension = (typeof HARMFUL_OFFER_DIMENSIONS)[number];
export type HarmfulOfferTrigger =
  | "live_draft"
  | "publication"
  | "material_edit"
  | "amendment"
  | "dispute"
  | "report"
  | "moderation";
export type HarmfulOfferRoute = "allow" | "human_review" | "block";
export type HarmfulOfferSeverity = "low" | "medium" | "high" | "critical";

export interface HarmfulOfferFinding {
  id: string;
  dimension: HarmfulOfferDimension;
  severity: HarmfulOfferSeverity;
  confidence: number;
  title: string;
  explanation: string;
  evidence: string[];
  recommendedControls: string[];
  source: "rule" | "model";
  hardPolicyBlock: boolean;
}

export interface HarmfulOfferModelResult {
  findings: Array<Omit<HarmfulOfferFinding, "id" | "source" | "hardPolicyBlock">>;
  unresolvedQuestions: string[];
}

export interface HarmfulOfferAssessment {
  schemaVersion: typeof HARMFUL_OFFER_ASSESSMENT_SCHEMA_VERSION;
  policyVersion: typeof HARMFUL_OFFER_POLICY_VERSION;
  trigger: HarmfulOfferTrigger;
  route: HarmfulOfferRoute;
  summary: string;
  sourceHash: string;
  assessedAt: string;
  findings: HarmfulOfferFinding[];
  unresolvedQuestions: string[];
  recommendedControls: string[];
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
