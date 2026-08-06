import type {
  HarmfulOfferAssessment,
  HarmfulOfferDimension,
  HarmfulOfferReasonCode,
} from "./harmful-offer-contract";

const LABELS: Record<HarmfulOfferDimension, string> = {
  coercion_threats_extortion: "Coercion, threats, or extortion",
  deception_concealment_epistemic_manipulation: "Deception or concealment",
  exploitation_benefit_burden_asymmetry: "Exploitation or unfair burden-shifting",
  severe_or_irreversible_harm: "Severe or irreversible harm",
  third_party_or_public_goods_externalities: "Third-party or public-goods effects",
  discrimination_or_protected_class_targeting: "Discrimination or protected rights",
  destabilization_or_conflict_escalation: "Conflict or destabilization",
  dangerous_illegal_or_abuse_enabling_conduct: "Dangerous or abuse-enabling conduct",
  sexual_or_romantic_relationship_exchange: "Sexual or romantic relationship exchange",
  religious_conversion_exchange: "Religious-conversion exchange",
  consent_authorization_mandate_enforceability: "Consent, authority, or enforceability",
  uncertainty_evidence_quality_assumption_sensitivity: "Material uncertainty or weak evidence",
  mitigation_feasibility_verifiability_reversibility: "Safeguards, verification, or reversibility",
  funding_public_goods_free_rider_effects: "Public-goods or free-rider effects",
  counterfactual_deadweight_leakage_displacement_moral_licensing: "Counterfactual or perverse-incentive effects",
};

export interface HarmfulOfferUserFacingResult {
  route: HarmfulOfferAssessment["route"];
  title: string;
  message: string;
  statusLabel: string;
  categories: string[];
  reasonCodes: HarmfulOfferReasonCode[];
  affectedFields: string[];
  policyBasis: string[];
  editAndResubmit: string;
  requiresHumanReview: boolean;
  automatedBlock: boolean;
  modelStatus: HarmfulOfferAssessment["modelAssessment"]["status"];
  policyVersion: string;
  assessmentId: string | null;
  appeal: {
    eligible: boolean;
    ordinaryAppealAvailable: boolean;
    instructions: string;
    deadlineEffect: string;
    paymentEffect: string;
  };
}

const unique = (items: string[]) =>
  [...new Set(items.map((item) => item.trim()).filter(Boolean))];

export function presentHarmfulOfferAssessment(
  assessment: HarmfulOfferAssessment,
  assessmentId: string | null = null,
): HarmfulOfferUserFacingResult {
  const materialFindings = assessment.findings.filter(
    (finding) => finding.severity !== "low",
  );
  const categories = unique(
    materialFindings.map((finding) => LABELS[finding.dimension]),
  ).slice(0, 8);
  const reasonCodes = unique(
    materialFindings.map((finding) => finding.reasonCode),
  ) as HarmfulOfferReasonCode[];
  const affectedFields = unique(
    materialFindings.flatMap((finding) => finding.affectedFields),
  ).slice(0, 12);
  const policyBasis = unique(
    materialFindings.map((finding) => finding.policyBasis),
  ).slice(0, 8);
  const appealEligible = assessment.route !== "allow" && Boolean(assessmentId);
  const common = {
    categories,
    reasonCodes,
    affectedFields,
    policyBasis,
    requiresHumanReview: assessment.route !== "allow",
    modelStatus: assessment.modelAssessment.status,
    policyVersion: assessment.policyVersion,
    assessmentId,
    appeal: {
      eligible: appealEligible,
      ordinaryAppealAvailable: appealEligible,
      instructions: appealEligible
        ? "You may request one ordinary reconsideration by a different reviewer. A later request requires new evidence or a procedural-error claim."
        : "An appeal becomes available only after a private assessment receipt is created.",
      deadlineEffect: "Applicable response and activation deadlines remain paused during review.",
      paymentEffect: "No money is charged; any reversible authorization remains unreleased during review.",
    },
  };

  if (assessment.route === "block") {
    return {
      ...common,
      route: assessment.route,
      title: "This proposal cannot be submitted as written.",
      message:
        "A categorical rule applies to an operational exchange term. The block came from a deterministic rule, not an AI judgment. Edit or remove the restricted term, or request human reconsideration after the private receipt is saved.",
      statusLabel: "Blocked by categorical policy",
      editAndResubmit:
        "Revise the affected field so it no longer requests, offers, enables, or conditions the exchange on the prohibited conduct, then submit the complete terms again.",
      automatedBlock: true,
    };
  }

  if (assessment.route === "human_review") {
    return {
      ...common,
      route: assessment.route,
      title: "This proposal requires human review.",
      message:
        "The proposal remains private and non-binding while a reviewer examines the flagged or unresolved effects. The automated model has not rejected the proposal, and the proposal cannot accept participants, bind anyone, move money, pair, or be shared publicly during the hold.",
      statusLabel: "Human review required",
      editAndResubmit:
        "Clarify the affected fields, consent and authority, evidence, safeguards, reversibility, and genuine no-offer baseline, then resubmit; alternatively, await human review of the saved terms.",
      automatedBlock: false,
    };
  }

  return {
    ...common,
    route: assessment.route,
    title: "Automatic assessment found no material harm signal.",
    message:
      "The proposal satisfied every low-risk automatic-permission criterion. Other legal, evidence, recipient, payment, verification, and confirmation gates still apply; this is not a guarantee of legality, safety, or moral value.",
    statusLabel: "Automatically permitted for the next review stage",
    editAndResubmit:
      "No harmful-offer edit is required. Continue through the remaining applicable review and confirmation gates.",
    automatedBlock: false,
  };
}
