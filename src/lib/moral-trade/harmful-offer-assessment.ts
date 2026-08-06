import {
  HARMFUL_OFFER_ASSESSMENT_SCHEMA_VERSION,
  HARMFUL_OFFER_POLICY_VERSION,
  hashHarmfulOfferSource,
  type HarmfulOfferAssessment,
  type HarmfulOfferAssessmentOptions,
  type HarmfulOfferFinding,
  type HarmfulOfferModelResult,
  type HarmfulOfferRoute,
  type HarmfulOfferSeverity,
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

const unique = (items: string[]) =>
  [...new Set(items.map((item) => item.trim()).filter(Boolean))];

export async function assessHarmfulOffer(
  draft: unknown,
  options: HarmfulOfferAssessmentOptions,
): Promise<HarmfulOfferAssessment> {
  const sourceHash = hashHarmfulOfferSource(draft);
  const rules = evaluateHarmfulOfferRules(draft);
  const hardBlock = rules.some((finding) => finding.hardPolicyBlock);
  const modelRequested = options.includeModel === true;
  let modelResult: HarmfulOfferModelResult = { findings: [], unresolvedQuestions: [] };
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
      const normalized = normalizeHarmfulOfferModelResult(await evaluator({
        draft,
        trigger: options.trigger,
        sourceHash,
      }));
      if (!normalized) throw new Error("The advisory model output could not be validated.");
      modelResult = normalized;
      modelAssessment = {
        status: "completed",
        model: options.modelEvaluator
          ? "injected-test-evaluator"
          : process.env.MORAL_TRADE_HARM_ASSESSMENT_MODEL ?? "gpt-5-mini",
        findingCount: normalized.findings.length,
        note: "Model findings are advisory and cannot create an automatic block.",
      };
    } catch (error) {
      modelAssessment = {
        status: "unavailable",
        model: options.modelEvaluator
          ? "injected-test-evaluator"
          : process.env.MORAL_TRADE_HARM_ASSESSMENT_MODEL ?? "gpt-5-mini",
        findingCount: 0,
        note: error instanceof Error
          ? error.message.slice(0, 300)
          : "The advisory model was unavailable.",
      };
    }
  }

  const modelFindings: HarmfulOfferFinding[] = modelResult.findings.map((finding, index) => ({
    ...finding,
    id: `model:${index + 1}:${finding.dimension}`,
    source: "model",
    hardPolicyBlock: false,
  }));
  const findings = [...rules, ...modelFindings].sort(
    (left, right) => WEIGHT[right.severity] - WEIGHT[left.severity],
  );
  const unresolvedQuestions = unique(modelResult.unresolvedQuestions).slice(0, 12);
  const materialRuleOrModelFinding = findings.some(
    (finding) => WEIGHT[finding.severity] >= WEIGHT.medium,
  );
  const modelUnavailable = modelRequested && !hardBlock && modelAssessment.status !== "completed";
  const route: HarmfulOfferRoute = hardBlock
    ? "block"
    : materialRuleOrModelFinding || unresolvedQuestions.length > 0 || modelUnavailable
      ? "human_review"
      : "allow";
  const summary = route === "block"
    ? "Submission is blocked by a deterministic hard-policy rule pending any human reconsideration."
    : route === "human_review"
      ? findings.length
        ? `${findings.length} risk finding${findings.length === 1 ? "" : "s"}; substantive enforcement remains a human decision.`
        : "The nuanced-risk assessment was unresolved or unavailable, so human review is required."
      : "No material harmful-offer signal was detected. This automated screen is not a guarantee of safety, legality, or moral value.";

  return {
    schemaVersion: HARMFUL_OFFER_ASSESSMENT_SCHEMA_VERSION,
    policyVersion: HARMFUL_OFFER_POLICY_VERSION,
    trigger: options.trigger,
    route,
    summary,
    sourceHash,
    assessedAt: (options.now ?? (() => new Date()))().toISOString(),
    findings,
    unresolvedQuestions,
    recommendedControls: unique(
      findings.flatMap((finding) => finding.recommendedControls),
    ).slice(0, 20),
    ruleAssessment: {
      status: "completed",
      findingCount: rules.length,
      hardPolicyBlockCount: rules.filter((finding) => finding.hardPolicyBlock).length,
    },
    modelAssessment,
  };
}
