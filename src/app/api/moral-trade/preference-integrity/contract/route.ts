import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradePreferenceIntegrityContract,
  validateMoralTradePreferenceIntegrityContract,
} from "@/lib/moral-trade/preference-integrity";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no preference-integrity payload until the window resets.",
    );
  }

  const contract = getMoralTradePreferenceIntegrityContract();
  const validation = validateMoralTradePreferenceIntegrityContract(contract);

  return buildMoralTradeApiJsonResponse({
    ok: validation.status === "pass",
    checkedAt: new Date().toISOString(),
    contractVersion: contract.version,
    purpose: contract.purpose,
    validation,
    publicContract: {
      failClosedRule: contract.failClosedRule,
      publicNonCardinalityRule: contract.publicNonCardinalityRule,
      selfOffsetMetricRule: contract.selfOffsetMetricRule,
      firstClassRecordTables: contract.firstClassRecordTables,
      policySnapshotSubjects: contract.policySnapshotSubjects,
      subjectTypes: contract.subjectTypes,
      releaseGateTestHooks: contract.releaseGateTestHooks,
      transitions: contract.transitionDefinitions.map((transition) => ({
        key: transition.key,
        requiresIntegrityRecords: transition.requiresIntegrityRecords,
        userFacingBlockerCategory: transition.userFacingBlockerCategory,
      })),
      preferenceIntegritySampleEvaluationStatuses: Object.fromEntries(
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
