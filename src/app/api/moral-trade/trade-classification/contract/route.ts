import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradeTradeClassificationContract,
  validateMoralTradeTradeClassificationContract,
} from "@/lib/moral-trade/trade-classification";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no trade-classification payload until the window resets.",
    );
  }

  const contract = getMoralTradeTradeClassificationContract();
  const validation = validateMoralTradeTradeClassificationContract(contract);

  return buildMoralTradeApiJsonResponse({
    ok: validation.status === "pass",
    checkedAt: new Date().toISOString(),
    contractVersion: contract.version,
    purpose: contract.purpose,
    validation,
    publicContract: {
      failClosedRule: contract.failClosedRule,
      publicNonClaim: contract.publicNonClaim,
      firstClassRecordTables: contract.firstClassRecordTables,
      policySnapshotSubjects: contract.policySnapshotSubjects,
      classifications: contract.classifications,
      subjectTypes: contract.subjectTypes,
      reviewDimensions: contract.reviewDimensions,
      failClosedStatuses: contract.failClosedStatuses,
      transitions: contract.transitionDefinitions.map((transition) => ({
        key: transition.key,
        requiresClassificationRecord: transition.requiresClassificationRecord,
        requiresNonBlockingReview: transition.requiresNonBlockingReview,
        allowsOrdinaryOnlyWhenMetricsExcluded:
          transition.allowsOrdinaryOnlyWhenMetricsExcluded,
        userFacingBlockerCategory: transition.userFacingBlockerCategory,
      })),
      tradeClassificationSampleEvaluationStatuses: Object.fromEntries(
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
