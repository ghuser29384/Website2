import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getOpportunityMealEvidenceContract,
  validateOpportunityMealEvidenceContract,
} from "@/lib/moral-trade/opportunity-constrained-meal-evidence";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");
  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited opportunity-constrained meal evidence contract read returns no contract payload until the window resets.",
    );
  }

  const contract = getOpportunityMealEvidenceContract();
  const validation = validateOpportunityMealEvidenceContract(contract);

  return buildMoralTradeApiJsonResponse({
    blockers: validation.blockers,
    checkedAt: new Date().toISOString(),
    contractVersion: contract.version,
    ok: validation.status === "pass",
    publicContract: {
      baselineWitnessQuestions: contract.baselineWitnessQuestions,
      coDinerTestimonialQuestions: contract.coDinerTestimonialQuestions,
      contractTests: contract.contractTests,
      firstClassRecordTables: contract.firstClassRecordTables,
      integrationRules: contract.integrationRules,
      modelNames: contract.modelNames,
      participantEvidenceFlowPrompts: contract.participantEvidenceFlowPrompts,
      privacyWarnings: contract.privacyWarnings,
      publicReportingRule: contract.publicReportingRule,
      reviewerPanelFields: contract.reviewerPanelFields,
      scoringPolicy: {
        baseSelfAttestationCompletionConfidenceDecimal:
          contract.scoringPolicy.baseSelfAttestationCompletionConfidenceDecimal,
        fixedConsiderationAdjustmentAllowed:
          contract.scoringPolicy.fixedConsiderationAdjustmentAllowed,
        maxAdditionalityAdjustmentDecimal:
          contract.scoringPolicy.maxAdditionalityAdjustmentDecimal,
        maxCompletionConfidenceDecimal:
          contract.scoringPolicy.maxCompletionConfidenceDecimal,
        maxCompletionConfidenceWithContraryEvidenceDecimal:
          contract.scoringPolicy.maxCompletionConfidenceWithContraryEvidenceDecimal,
        maxCompletionConfidenceWithoutDirectObserverDecimal:
          contract.scoringPolicy.maxCompletionConfidenceWithoutDirectObserverDecimal,
        policyHash: contract.scoringPolicy.policyHash,
        policyVersion: contract.scoringPolicy.policyVersion,
        privacyInvasiveEvidenceOverrewardCapDecimal:
          contract.scoringPolicy.privacyInvasiveEvidenceOverrewardCapDecimal,
        seedPosteriorCompletionConfidenceDecimal:
          contract.scoringPolicy.seedPosteriorCompletionConfidenceDecimal,
        weights: contract.scoringPolicy.weights,
      },
      seedDemo: {
        bundleId: contract.seedDemo.bundle.id,
        consideration: contract.seedDemo.consideration,
        publicReport: contract.seedDemo.publicReport,
        reviewerDecision: contract.seedDemo.reviewerDecision,
      },
      witnessRoles: contract.witnessRoles,
    },
    purpose: contract.purpose,
    validation,
  });
}
