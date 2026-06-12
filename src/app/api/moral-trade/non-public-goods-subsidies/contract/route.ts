import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradeNonPublicGoodsSubsidyContract,
  validateMoralTradeNonPublicGoodsSubsidyContract,
} from "@/lib/moral-trade/non-public-goods-subsidies";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no non-public-goods subsidy payload until the window resets.",
    );
  }

  const contract = getMoralTradeNonPublicGoodsSubsidyContract();
  const validation = validateMoralTradeNonPublicGoodsSubsidyContract(contract);
  const subsidySampleEvaluationStatuses = Object.fromEntries(
    contract.sampleEvaluations.map((evaluation) => [
      evaluation.transition,
      {
        status: evaluation.status,
        blockers: evaluation.blockers,
        subsidyRequired: evaluation.subsidyRequired,
        activePoolCount: evaluation.activePoolCount,
        eligibleScheduleCount: evaluation.eligibleScheduleCount,
        metricExcludedScheduleCount: evaluation.metricExcludedScheduleCount,
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
      metricExclusionRule: contract.metricExclusionRule,
      firstClassRecordTables: contract.firstClassRecordTables,
      policySnapshotSubjects: contract.policySnapshotSubjects,
      tradeTypes: contract.tradeTypes,
      allowedLaunchTiers: contract.allowedLaunchTiers,
      sourceReviewStates: contract.sourceReviewStates,
      conflictStates: contract.conflictStates,
      disclosureLevels: contract.disclosureLevels,
      refundPolicies: contract.refundPolicies,
      poolStates: contract.poolStates,
      subsidyTypes: contract.subsidyTypes,
      scheduleStates: contract.scheduleStates,
      policyStatuses: contract.policyStatuses,
      transitions: contract.transitionDefinitions.map((transition) => ({
        key: transition.key,
        requiresActiveFrozenPoolWhenRequired:
          transition.requiresActiveFrozenPoolWhenRequired,
        requiresScheduleRecordWhenRequired:
          transition.requiresScheduleRecordWhenRequired,
        requiresCapAndEligibilityChecks:
          transition.requiresCapAndEligibilityChecks,
        requiresMetricExclusion: transition.requiresMetricExclusion,
        userFacingBlockerCategory: transition.userFacingBlockerCategory,
      })),
      subsidySampleEvaluationStatuses,
      contractTests: contract.contractTests,
    },
    blockers: validation.blockers,
  });
}
