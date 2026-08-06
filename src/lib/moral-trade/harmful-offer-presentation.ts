import type {
  HarmfulOfferAssessment,
  HarmfulOfferDimension,
} from "./harmful-offer-contract";

const LABELS: Record<HarmfulOfferDimension, string> = {
  coercion_threats_extortion: "Coercion, threats, or extortion",
  deception_concealment_epistemic_manipulation: "Deception or concealment",
  exploitation_benefit_burden_asymmetry: "Exploitation or unfair burden-shifting",
  severe_or_irreversible_harm: "Severe or irreversible harm",
  third_party_or_public_goods_externalities: "Third-party or public-goods effects",
  discrimination_or_protected_class_targeting: "Discriminatory targeting",
  destabilization_or_conflict_escalation: "Conflict or destabilization",
  dangerous_illegal_or_abuse_enabling_conduct: "Dangerous or abuse-enabling conduct",
  sexual_or_romantic_relationship_exchange: "Sexual or romantic relationship exchange",
  religious_conversion_exchange: "Religious conversion exchange",
  consent_authorization_mandate_enforceability: "Consent, authority, or enforceability",
  uncertainty_evidence_quality_assumption_sensitivity: "Material uncertainty or weak evidence",
  mitigation_feasibility_verifiability_reversibility: "Safeguards, verification, or reversibility",
  funding_public_goods_free_rider_effects: "Public-goods or free-rider effects",
  counterfactual_deadweight_leakage_displacement_moral_licensing: "Counterfactual, leakage, or perverse-incentive effects",
};

export interface HarmfulOfferUserFacingResult {
  route: HarmfulOfferAssessment["route"];
  title: string;
  message: string;
  statusLabel: string;
  categories: string[];
  requiresHumanReview: boolean;
  automatedBlock: boolean;
  modelStatus: HarmfulOfferAssessment["modelAssessment"]["status"];
  policyVersion: string;
  assessmentId: string | null;
}

export function presentHarmfulOfferAssessment(
  assessment: HarmfulOfferAssessment,
  assessmentId: string | null = null,
): HarmfulOfferUserFacingResult {
  const categories = [...new Set(
    assessment.findings
      .filter((finding) => finding.severity !== "low")
      .map((finding) => LABELS[finding.dimension]),
  )].slice(0, 8);

  if (assessment.route === "block") {
    return {
      route: assessment.route,
      title: "This proposal cannot be submitted as written.",
      message:
        "A categorical safety rule applies to the current exchange terms. Edit or remove the restricted term. A human reviewer, not the model, decides any contested reconsideration.",
      statusLabel: "Blocked by hard policy",
      categories,
      requiresHumanReview: true,
      automatedBlock: true,
      modelStatus: assessment.modelAssessment.status,
      policyVersion: assessment.policyVersion,
      assessmentId,
    };
  }

  if (assessment.route === "human_review") {
    return {
      route: assessment.route,
      title: "This proposal requires human review.",
      message:
        "The proposal will remain private and non-binding while a reviewer examines the flagged or unresolved effects. The automated model has not rejected the proposal.",
      statusLabel: "Human review required",
      categories,
      requiresHumanReview: true,
      automatedBlock: false,
      modelStatus: assessment.modelAssessment.status,
      policyVersion: assessment.policyVersion,
      assessmentId,
    };
  }

  return {
    route: assessment.route,
    title: "Automatic assessment found no material harm signal.",
    message:
      "The proposal passed this automated screen. Other review, evidence, payment, recipient, and confirmation gates still apply; this is not a guarantee of legality, safety, or moral value.",
    statusLabel: "Automatically permitted for the next review stage",
    categories,
    requiresHumanReview: false,
    automatedBlock: false,
    modelStatus: assessment.modelAssessment.status,
    policyVersion: assessment.policyVersion,
    assessmentId,
  };
}
