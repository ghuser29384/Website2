import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradePledgePerformanceBondContract,
  validateMoralTradePledgePerformanceBondContract,
} from "@/lib/moral-trade/pledge-performance-bonds";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");
  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no pledge-performance-bond payload until the window resets.",
    );
  }

  const contract = getMoralTradePledgePerformanceBondContract();
  const validation = validateMoralTradePledgePerformanceBondContract(contract);

  return buildMoralTradeApiJsonResponse({
    blockers: validation.blockers,
    checkedAt: new Date().toISOString(),
    contractVersion: contract.version,
    ok: validation.status === "pass",
    publicContract: {
      contractTests: contract.contractTests,
      existingInfrastructureTables: contract.existingInfrastructureTables,
      failClosedRule: contract.failClosedRule,
      firstClassRecordTables: contract.firstClassRecordTables,
      neutralForfeitureRule: contract.neutralForfeitureRule,
      noEscrowNoReputationRule: contract.noEscrowNoReputationRule,
      pledgePerformanceBondSampleEvaluationStatuses: Object.fromEntries(
        contract.sampleEvaluations.map((sample) => [
          sample.transition,
          sample.status,
        ]),
      ),
      policySnapshotSubjects: contract.policySnapshotSubjects,
      releaseGateTestHooks: contract.releaseGateTestHooks,
      transitions: contract.transitions,
    },
    purpose: contract.purpose,
    validation,
  });
}
