import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradeDirectPairClearingContract,
  validateMoralTradeDirectPairClearingContract,
} from "@/lib/moral-trade/direct-pair-clearing";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no direct-pair clearing payload until the window resets.",
    );
  }

  const contract = getMoralTradeDirectPairClearingContract();
  const validation = validateMoralTradeDirectPairClearingContract(contract);
  const directPairSampleEvaluationStatuses = Object.fromEntries(
    contract.sampleEvaluations.map((evaluation) => [
      evaluation.transition,
      {
        status: evaluation.status,
        blockers: evaluation.blockers,
        directPairRequired: evaluation.directPairRequired,
        eligibleRecordCount: evaluation.eligibleRecordCount,
        confirmedRecordCount: evaluation.confirmedRecordCount,
        noBackgroundNetworkingCount: evaluation.noBackgroundNetworkingCount,
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
      noAutonomousOutreachRule: contract.noAutonomousOutreachRule,
      privacyBoundary: contract.privacyBoundary,
      firstClassRecordTables: contract.firstClassRecordTables,
      policySnapshotSubjects: contract.policySnapshotSubjects,
      tradeTypes: contract.tradeTypes,
      allowedLaunchTradeTypes: contract.allowedLaunchTradeTypes,
      directPairStates: contract.directPairStates,
      reviewStates: contract.reviewStates,
      policyStatuses: contract.policyStatuses,
      transitions: contract.transitionDefinitions.map((transition) => ({
        key: transition.key,
        requiresFrozenRecordWhenApplicable:
          transition.requiresFrozenRecordWhenApplicable,
        requiresBothPartyConfirmation: transition.requiresBothPartyConfirmation,
        requiresOrdinaryGates: transition.requiresOrdinaryGates,
        userFacingBlockerCategory: transition.userFacingBlockerCategory,
      })),
      directPairSampleEvaluationStatuses,
      contractTests: contract.contractTests,
    },
    blockers: validation.blockers,
  });
}
