import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradePledgeSwapPerformanceScheduleContract,
  validateMoralTradePledgeSwapPerformanceScheduleContract,
} from "@/lib/moral-trade/pledge-swap-performance-schedules";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");
  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no pledge-swap performance-schedule payload until the window resets.",
    );
  }

  const contract = getMoralTradePledgeSwapPerformanceScheduleContract();
  const validation = validateMoralTradePledgeSwapPerformanceScheduleContract(contract);

  return buildMoralTradeApiJsonResponse({
    blockers: validation.blockers,
    checkedAt: new Date().toISOString(),
    contractVersion: contract.version,
    ok: validation.status === "pass",
    publicContract: {
      contractTests: contract.contractTests,
      failClosedRule: contract.failClosedRule,
      firstClassRecordTables: contract.firstClassRecordTables,
      nonPunitiveBreachRule: contract.nonPunitiveBreachRule,
      pledgeSwapPerformanceScheduleSampleEvaluationStatuses: Object.fromEntries(
        contract.sampleEvaluations.map((sample) => [
          sample.transition,
          sample.status,
        ]),
      ),
      policySnapshotSubjects: contract.policySnapshotSubjects,
      reciprocalReleaseRule: contract.reciprocalReleaseRule,
      releaseGateTestHooks: contract.releaseGateTestHooks,
      synchronizationRule: contract.synchronizationRule,
      transitions: contract.transitions,
    },
    purpose: contract.purpose,
    validation,
  });
}
