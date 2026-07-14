import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradeBatchClearingObjectiveContract,
  validateMoralTradeBatchClearingObjectiveContract,
} from "@/lib/moral-trade/batch-clearing-objective";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no batch-clearing objective payload until the window resets.",
    );
  }

  const contract = getMoralTradeBatchClearingObjectiveContract();
  const validation = validateMoralTradeBatchClearingObjectiveContract(contract);

  return buildMoralTradeApiJsonResponse({
    ok: validation.status === "pass",
    checkedAt: new Date().toISOString(),
    contractVersion: contract.version,
    purpose: contract.purpose,
    validation,
    publicContract: {
      privacyRule: contract.privacyRule,
      failClosedRule: contract.failClosedRule,
      deterministicTieBreakRule: contract.deterministicTieBreakRule,
      prohibitedAllocationRule: contract.prohibitedAllocationRule,
      reproducibilityRule: contract.reproducibilityRule,
      firstClassRecordTables: contract.firstClassRecordTables,
      policySnapshotSubjects: contract.policySnapshotSubjects,
      subjectTypes: contract.subjectTypes,
      objectiveTypes: contract.objectiveTypes,
      tieBreakFairnessRuleTypes: contract.tieBreakFairnessRuleTypes,
      allocationDrivers: contract.allocationDrivers,
      prohibitedAllocationDrivers: contract.prohibitedAllocationDrivers,
      resultStates: contract.resultStates,
      policyStatuses: contract.policyStatuses,
      transitions: contract.transitionDefinitions.map((transition) => ({
        key: transition.key,
        requiresObjectiveResult: transition.requiresObjectiveResult,
        requiresDeterministicTieBreak: transition.requiresDeterministicTieBreak,
        userFacingBlockerCategory: transition.userFacingBlockerCategory,
      })),
      batchClearingObjectiveSampleEvaluationStatuses: Object.fromEntries(
        contract.sampleEvaluations.map((evaluation) => [
          evaluation.transition,
          evaluation.status,
        ]),
      ),
      prohibitedAllocationDriverCounts: Object.fromEntries(
        contract.sampleEvaluations.map((evaluation) => [
          evaluation.transition,
          evaluation.prohibitedAllocationDriverCount,
        ]),
      ),
      contractTests: contract.contractTests,
    },
    blockers: validation.blockers,
  });
}
