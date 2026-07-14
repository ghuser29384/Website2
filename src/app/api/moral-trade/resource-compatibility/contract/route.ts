import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradeResourceCompatibilityContract,
  validateMoralTradeResourceCompatibilityContract,
} from "@/lib/moral-trade/resource-compatibility";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no resource-compatibility payload until the window resets.",
    );
  }

  const contract = getMoralTradeResourceCompatibilityContract();
  const validation = validateMoralTradeResourceCompatibilityContract(contract);

  return buildMoralTradeApiJsonResponse({
    ok: validation.status === "pass",
    checkedAt: new Date().toISOString(),
    contractVersion: contract.version,
    purpose: contract.purpose,
    validation,
    publicContract: {
      failClosedRule: contract.failClosedRule,
      privacyBoundary: contract.privacyBoundary,
      zeroSumConflictRule: contract.zeroSumConflictRule,
      firstClassRecordTables: contract.firstClassRecordTables,
      policySnapshotSubjects: contract.policySnapshotSubjects,
      subjectTypes: contract.subjectTypes,
      conflictTypes: contract.conflictTypes,
      jointFeasibilityStates: contract.jointFeasibilityStates,
      hybridOrCompromiseGoodStates: contract.hybridOrCompromiseGoodStates,
      reviewStates: contract.reviewStates,
      policyStatuses: contract.policyStatuses,
      transitions: contract.transitionDefinitions.map((transition) => ({
        key: transition.key,
        requiresAssessment: transition.requiresAssessment,
        requiresNonBlockingReview: transition.requiresNonBlockingReview,
        userFacingBlockerCategory: transition.userFacingBlockerCategory,
      })),
      resourceCompatibilitySampleEvaluationStatuses: Object.fromEntries(
        contract.sampleEvaluations.map((evaluation) => [
          evaluation.transition,
          evaluation.status,
        ]),
      ),
      contractTests: contract.contractTests,
    },
    blockers: validation.blockers,
  });
}
