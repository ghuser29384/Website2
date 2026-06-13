import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradeCommitmentSettlementContract,
  validateMoralTradeCommitmentSettlementContract,
} from "@/lib/moral-trade/commitment-settlement";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no commitment-settlement payload until the window resets.",
    );
  }

  const contract = getMoralTradeCommitmentSettlementContract();
  const validation = validateMoralTradeCommitmentSettlementContract(contract);

  return buildMoralTradeApiJsonResponse({
    ok: validation.status === "pass",
    checkedAt: new Date().toISOString(),
    contractVersion: contract.version,
    purpose: contract.purpose,
    validation,
    publicContract: {
      failClosedRule: contract.failClosedRule,
      doubleCountRule: contract.doubleCountRule,
      atomicSettlementRule: contract.atomicSettlementRule,
      firstClassRecordTables: contract.firstClassRecordTables,
      policySnapshotSubjects: contract.policySnapshotSubjects,
      releaseGateTestHooks: contract.releaseGateTestHooks,
      transitions: contract.transitionDefinitions.map((transition) => ({
        key: transition.key,
        requiresCommitmentSettlementRecords:
          transition.requiresCommitmentSettlementRecords,
        requiresLockedReservations: transition.requiresLockedReservations,
        requiresAtomicAllOrNone: transition.requiresAtomicAllOrNone,
        userFacingBlockerCategory: transition.userFacingBlockerCategory,
      })),
      commitmentSettlementSampleEvaluationStatuses: Object.fromEntries(
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
