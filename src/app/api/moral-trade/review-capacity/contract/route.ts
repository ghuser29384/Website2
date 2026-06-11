import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradeReviewCapacityContract,
  validateMoralTradeReviewCapacityContract,
} from "@/lib/moral-trade/review-capacity";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no review-capacity payload until the window resets.",
    );
  }

  const contract = getMoralTradeReviewCapacityContract();
  const validation = validateMoralTradeReviewCapacityContract(contract);
  const reviewCapacitySampleEvaluationStatuses = Object.fromEntries(
    contract.sampleEvaluations.map((evaluation) => [
      evaluation.transition,
      {
        status: evaluation.status,
        blockers: evaluation.blockers,
        admittedQueueCount: evaluation.admittedQueueCount,
        eligiblePanelCount: evaluation.eligiblePanelCount,
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
      queueStates: contract.queueStates,
      visibleQueueStatuses: contract.visibleQueueStatuses,
      panelStates: contract.panelStates,
      policyStatuses: contract.policyStatuses,
      conflictScreeningStates: contract.conflictScreeningStates,
      reviewerQualityStates: contract.reviewerQualityStates,
      failClosedStatuses: contract.failClosedStatuses,
      transitions: contract.transitionDefinitions.map((transition) => ({
        key: transition.key,
        requiresCapacityPolicy: transition.requiresCapacityPolicy,
        requiresQueueAdmission: transition.requiresQueueAdmission,
        requiresReviewerPanel: transition.requiresReviewerPanel,
        requiresNeutralPanel: transition.requiresNeutralPanel,
        blocksPaymentAuthorizationStaleness:
          transition.blocksPaymentAuthorizationStaleness,
        userFacingBlockerCategory: transition.userFacingBlockerCategory,
      })),
      reviewCapacitySampleEvaluationStatuses,
      contractTests: contract.contractTests,
    },
    blockers: validation.blockers,
  });
}
