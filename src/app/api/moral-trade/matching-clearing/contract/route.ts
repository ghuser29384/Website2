import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradeMatchingClearingContract,
  validateMoralTradeMatchingClearingContract,
} from "@/lib/moral-trade/matching-clearing";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no matching-clearing payload until the window resets.",
    );
  }

  const contract = getMoralTradeMatchingClearingContract();
  const validation = validateMoralTradeMatchingClearingContract(contract);

  return buildMoralTradeApiJsonResponse({
    ok: validation.status === "pass",
    checkedAt: new Date().toISOString(),
    contractVersion: contract.version,
    purpose: contract.purpose,
    validation,
    publicContract: {
      privacyRule: contract.privacyRule,
      failClosedRule: contract.failClosedRule,
      replayRule: contract.replayRule,
      firstClassRecordTables: contract.firstClassRecordTables,
      executionRecordTables: contract.executionRecordTables,
      executionRoute: contract.executionRoute,
      policySnapshotSubjects: contract.policySnapshotSubjects,
      flowTypes: contract.flowTypes,
      runStatuses: contract.runStatuses,
      lockProposalStatuses: contract.lockProposalStatuses,
      lockProposalSubjects: contract.lockProposalSubjects,
      failClosedStatuses: contract.failClosedStatuses,
      flowDefinitions: contract.flowDefinitions.map((flow) => ({
        key: flow.key,
        protectedBoundary: flow.protectedBoundary,
        requiredRecords: flow.requiredRecords,
        blocksTransitions: flow.blocksTransitions,
      })),
      matchingClearingSampleEvaluationStatuses: Object.fromEntries(
        contract.sampleEvaluations.map((evaluation) => [
          evaluation.flowType,
          evaluation.status,
        ]),
      ),
      contractTests: contract.contractTests,
    },
    blockers: validation.blockers,
  });
}
