import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradeAiPreferenceElicitationContract,
  validateMoralTradeAiPreferenceElicitationContract,
} from "@/lib/moral-trade/ai-preference-elicitation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no AI preference-elicitation payload until the window resets.",
    );
  }

  const contract = getMoralTradeAiPreferenceElicitationContract();
  const validation = validateMoralTradeAiPreferenceElicitationContract(contract);
  const aiPreferenceElicitationSampleEvaluationStatuses = Object.fromEntries(
    contract.sampleEvaluations.map((evaluation) => [
      evaluation.transition,
      {
        status: evaluation.status,
        blockers: evaluation.blockers,
        aiPreferenceElicitationUsed: evaluation.aiPreferenceElicitationUsed,
        convertedStructuredInputCount:
          evaluation.convertedStructuredInputCount,
        confirmationOrReviewerDecisionCount:
          evaluation.confirmationOrReviewerDecisionCount,
      },
    ]),
  );

  return buildMoralTradeApiJsonResponse({
    ok: validation.status === "pass",
    checkedAt: new Date().toISOString(),
    contractVersion: contract.version,
    purpose: contract.purpose,
    validation,
    publicContract: {
      failClosedRule: contract.failClosedRule,
      privacyBoundary: contract.privacyBoundary,
      firstClassRecordTables: contract.firstClassRecordTables,
      policySnapshotSubjects: contract.policySnapshotSubjects,
      subjectTypes: contract.subjectTypes,
      scopes: contract.scopes,
      elicitationStates: contract.elicitationStates,
      policyStatuses: contract.policyStatuses,
      prohibitedUseBlockers: contract.prohibitedUseBlockers,
      transitions: contract.transitionDefinitions.map((transition) => ({
        key: transition.key,
        allowsAiAssistedDrafting: transition.allowsAiAssistedDrafting,
        requiresImmutablePolicyWhenUsed:
          transition.requiresImmutablePolicyWhenUsed,
        requiresRecordWhenUsed: transition.requiresRecordWhenUsed,
        requiresConvertedStructuredInput:
          transition.requiresConvertedStructuredInput,
        requiresParticipantConfirmationOrReviewerDecision:
          transition.requiresParticipantConfirmationOrReviewerDecision,
        prohibitsStateChangeFromAiOutput:
          transition.prohibitsStateChangeFromAiOutput,
        userFacingBlockerCategory: transition.userFacingBlockerCategory,
      })),
      aiPreferenceElicitationSampleEvaluationStatuses,
      contractTests: contract.contractTests,
    },
    blockers: validation.blockers,
  });
}
