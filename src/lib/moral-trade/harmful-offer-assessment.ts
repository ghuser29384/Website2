import {
  HARMFUL_OFFER_ASSESSMENT_SCHEMA_VERSION,
  HARMFUL_OFFER_POLICY_VERSION,
  hashHarmfulOfferSource,
  type HarmfulOfferAssessment,
  type HarmfulOfferAssessmentOptions,
  type HarmfulOfferFinding,
  type HarmfulOfferLowRiskAssessment,
  type HarmfulOfferModelResult,
  type HarmfulOfferSeverity,
  type HarmfulOfferThirdPartySeverity,
} from "./harmful-offer-contract";
import {
  evaluateHarmfulOfferWithConfiguredModel,
  normalizeHarmfulOfferModelResult,
} from "./harmful-offer-model";
import { evaluateHarmfulOfferRules } from "./harmful-offer-rules";

export * from "./harmful-offer-contract";

const WEIGHT: Record<HarmfulOfferSeverity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

const THIRD_PARTY_WEIGHT: Record<HarmfulOfferThirdPartySeverity, number> = {
  none: 0,
  low: 1,
  moderate: 2,
  high: 3,
  critical: 4,
};

const CONSERVATIVE_LOW_RISK_ASSESSMENT: HarmfulOfferLowRiskAssessment = {
  overallConfidence: 0,
  evidenceQuality: "thin",
  reversibilityConcern: "high",
  contestedMoralFrame: true,
  thirdPartyEffectSeverity: "high",
  legitimateVetoHolderIdentified: true,
  humanOnlySensitiveDomain: false,
  baselineComparison: "uncertain",
  plausibleSevereHarm: true,
  dependentPartyRisk: true,
  opaqueCoercionIncentives: true,
};

const unique = (items: string[]) =>
  [...new Set(items.map((item) => item.trim()).filter(Boolean))];

function failedAutomaticPermitCriteria(input: {
  findings: HarmfulOfferFinding[];
  unresolvedQuestions: string[];
  modelStatus: HarmfulOfferAssessment["modelAssessment"]["status"];
  lowRiskAssessment: HarmfulOfferLowRiskAssessment;
  hardPolicyBlockCount: number;
}) {
  const failed: string[] = [];
  const risk = input.lowRiskAssessment;

  if (input.hardPolicyBlockCount > 0) failed.push("DETERMINISTIC_HARD_POLICY_FINDING");
  if (input.modelStatus !== "completed") failed.push("MODEL_ASSESSMENT_NOT_COMPLETED");
  if (input.findings.length > 0) failed.push("MATERIAL_OR_UNRESOLVED_FINDING_PRESENT");
  if (input.unresolvedQuestions.length > 0) failed.push("UNRESOLVED_QUESTION_PRESENT");
  if (risk.overallConfidence < 0.9) failed.push("ASSESSMENT_CONFIDENCE_INSUFFICIENT");
  if (risk.evidenceQuality !== "strong") failed.push("EVIDENCE_NOT_STRONG");
  if (risk.reversibilityConcern !== "low") failed.push("REVERSIBILITY_CONCERN_NOT_LOW");
  if (risk.contestedMoralFrame) failed.push("CONTESTED_MORAL_FRAME");
  if (THIRD_PARTY_WEIGHT[risk.thirdPartyEffectSeverity] > THIRD_PARTY_WEIGHT.moderate) {
    failed.push("THIRD_PARTY_EFFECTS_ABOVE_MODERATE");
  }
  if (risk.legitimateVetoHolderIdentified) failed.push("LEGITIMATE_VETO_HOLDER_IDENTIFIED");
  if (risk.humanOnlySensitiveDomain) failed.push("HUMAN_ONLY_SENSITIVE_DOMAIN");
  if (risk.baselineComparison !== "better_or_equal") {
    failed.push("NO_OFFER_BASELINE_NOT_CLEARED");
  }
  if (risk.plausibleSevereHarm) failed.push("PLAUSIBLE_SEVERE_HARM");
  if (risk.dependentPartyRisk) failed.push("DEPENDENT_PARTY_RISK");
  if (risk.opaqueCoercionIncentives) failed.push("OPAQUE_COERCION_INCENTIVES");

  return unique(failed);
}

export async function assessHarmfulOffer(
  draft: unknown,
  options: HarmfulOfferAssessmentOptions,
): Promise<HarmfulOfferAssessment> {
  const sourceHash = hashHarmfulOfferSource(draft);
  const rules = evaluateHarmfulOfferRules(draft);
  const hardPolicyBlockCount = rules.filter((finding) => finding.hardPolicyBlock).length;
  const hardBlock = hardPolicyBlockCount > 0;
  const modelRequested = options.includeModel === true;
  let modelResult: HarmfulOfferModelResult | null = null;
  let modelAssessment: HarmfulOfferAssessment["modelAssessment"] = {
    status: "not_requested",
    model: null,
    findingCount: 0,
    note: modelRequested && hardBlock
      ? "The model was not called because a deterministic hard-policy rule already applied."
      : null,
  };

  if (modelRequested && !hardBlock) {
    const evaluator = options.modelEvaluator ?? evaluateHarmfulOfferWithConfiguredModel;
    try {
      const rawResult = await evaluator({
        draft,
        trigger: options.trigger,
        sourceHash,
      });
      const normalized = normalizeHarmfulOfferModelResult(rawResult);
      if (!normalized) {
        modelAssessment = {
          status: "invalid",
          model: options.modelEvaluator
            ? "injected-test-evaluator"
            : process.env.MORAL_TRADE_HARM_ASSESSMENT_MODEL?.trim() || "gpt-5-mini",
          findingCount: 0,
          note: "The advisory model output could not be validated.",
        };
      } else {
        modelResult = normalized;
        modelAssessment = {
          status: "completed",
          model: options.modelEvaluator
            ? "injected-test-evaluator"
            : process.env.MORAL_TRADE_HARM_ASSESSMENT_MODEL?.trim() || "gpt-5-mini",
          findingCount: normalized.findings.length,
          note: "Model findings are advisory and cannot create an automatic block.",
        };
      }
    } catch (error) {
      modelAssessment = {
        status: "unavailable",
        model: options.modelEvaluator
          ? "injected-test-evaluator"
          : process.env.MORAL_TRADE_HARM_ASSESSMENT_MODEL?.trim() || "gpt-5-mini",
        findingCount: 0,
        note: error instanceof Error
          ? error.message.slice(0, 300)
          : "The advisory model was unavailable.",
      };
    }
  }

  const modelFindings: HarmfulOfferFinding[] = (modelResult?.findings ?? []).map(
    (finding, index) => ({
      ...finding,
      id: `model:${index + 1}:${finding.reasonCode}`,
      source: "model",
      hardPolicyBlock: false,
    }),
  );
  const findings = [...rules, ...modelFindings].sort(
    (left, right) => WEIGHT[right.severity] - WEIGHT[left.severity],
  );
  const unresolvedQuestions = unique(modelResult?.unresolvedQuestions ?? []).slice(0, 12);
  const lowRiskAssessment = modelResult?.lowRiskAssessment ?? {
    ...CONSERVATIVE_LOW_RISK_ASSESSMENT,
    humanOnlySensitiveDomain: findings.some(
      (finding) =>
        finding.dimension === "sexual_or_romantic_relationship_exchange" ||
        finding.dimension === "religious_conversion_exchange",
    ),
  };
  const failedCriteria = failedAutomaticPermitCriteria({
    findings,
    unresolvedQuestions,
    modelStatus: modelAssessment.status,
    lowRiskAssessment,
    hardPolicyBlockCount,
  });
  const automaticallyPermissible = failedCriteria.length === 0;
  const route = hardBlock
    ? "block" as const
    : automaticallyPermissible
      ? "allow" as const
      : "human_review" as const;
  const enforcementBasis = hardBlock
    ? "deterministic_hard_policy" as const
    : automaticallyPermissible
      ? "completed_low_risk_assessment" as const
      : "human_review_required" as const;
  const summary = route === "block"
    ? "Submission is blocked by a deterministic categorical rule. A human may reconsider a contested classification, but the model did not make the blocking decision."
    : route === "human_review"
      ? findings.length
        ? `${findings.length} material or sensitive finding${findings.length === 1 ? "" : "s"}; substantive enforcement remains a human decision.`
        : "The complete low-risk criteria were not established, so the proposal remains private for human review."
      : "The completed assessment established every automatic-permission criterion. Other legal, evidence, recipient, payment, and confirmation gates still apply.";
  const recommendedControls = unique([
    ...findings.flatMap((finding) => finding.recommendedControls),
    ...(modelAssessment.status === "completed" || hardBlock
      ? []
      : ["Keep the proposal private and complete human review before publication, pairing, obligation, or money movement."]),
  ]).slice(0, 20);

  return {
    schemaVersion: HARMFUL_OFFER_ASSESSMENT_SCHEMA_VERSION,
    policyVersion: HARMFUL_OFFER_POLICY_VERSION,
    trigger: options.trigger,
    route,
    enforcementBasis,
    summary,
    sourceHash,
    assessedAt: (options.now ?? (() => new Date()))().toISOString(),
    findings,
    unresolvedQuestions,
    recommendedControls,
    lowRiskAssessment,
    automaticPermitCriteria: {
      passed: automaticallyPermissible,
      failedCriteria,
    },
    ruleAssessment: {
      status: "completed",
      findingCount: rules.length,
      hardPolicyBlockCount,
    },
    modelAssessment,
  };
}
