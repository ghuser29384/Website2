import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradeNetOffsetAccountingContract,
  validateMoralTradeNetOffsetAccountingContract,
} from "@/lib/moral-trade/net-offset-accounting";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no net-offset accounting payload until the window resets.",
    );
  }

  const contract = getMoralTradeNetOffsetAccountingContract();
  const validation = validateMoralTradeNetOffsetAccountingContract(contract);

  return buildMoralTradeApiJsonResponse({
    ok: validation.status === "pass",
    checkedAt: new Date().toISOString(),
    contractVersion: contract.version,
    purpose: contract.purpose,
    validation,
    publicContract: {
      failClosedRule: contract.failClosedRule,
      privacyBoundary: contract.privacyBoundary,
      grossVolumeExclusionRule: contract.grossVolumeExclusionRule,
      firstClassRecordTables: contract.firstClassRecordTables,
      policySnapshotSubjects: contract.policySnapshotSubjects,
      subjectTypes: contract.subjectTypes,
      baselineOpposedActionTypes: contract.baselineOpposedActionTypes,
      residualActionPolicies: contract.residualActionPolicies,
      substitutionChannelReviewStates: contract.substitutionChannelReviewStates,
      netOffsetStates: contract.netOffsetStates,
      policyStatuses: contract.policyStatuses,
      transitions: contract.transitionDefinitions.map((transition) => ({
        key: transition.key,
        requiresAccounting: transition.requiresAccounting,
        requiresNetMetricEligibleState: transition.requiresNetMetricEligibleState,
        userFacingBlockerCategory: transition.userFacingBlockerCategory,
      })),
      netOffsetAccountingSampleEvaluationStatuses: Object.fromEntries(
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
