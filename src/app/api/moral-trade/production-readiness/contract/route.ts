import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradeProductionReadinessContract,
  validateMoralTradeProductionReadinessContract,
} from "@/lib/moral-trade/production-readiness";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no production-readiness payload until the window resets.",
    );
  }

  const contract = getMoralTradeProductionReadinessContract();
  const validation = validateMoralTradeProductionReadinessContract(contract);

  return buildMoralTradeApiJsonResponse({
    ok: validation.status === "pass",
    checkedAt: new Date().toISOString(),
    contractVersion: contract.version,
    purpose: contract.purpose,
    validation,
    publicContract: {
      failClosedRule: contract.failClosedRule,
      firstClassRecordTables: contract.firstClassRecordTables,
      policySnapshotSubjects: contract.policySnapshotSubjects,
      failClosedStatuses: contract.failClosedStatuses,
      controls: contract.controlDefinitions.map((control) => ({
        key: control.key,
        firstClassRecordTables: control.firstClassRecordTables,
        blocks: control.blocks,
      })),
      gates: contract.gateDefinitions.map((gate) => ({
        key: gate.key,
        requiredControls: gate.requiredControls,
        userFacingBlockerCategory: gate.userFacingBlockerCategory,
      })),
      productionReadinessSampleEvaluationStatuses: Object.fromEntries(
        contract.sampleEvaluations.map((evaluation) => [
          evaluation.gate,
          evaluation.status,
        ]),
      ),
      contractTests: contract.contractTests,
    },
    blockers: validation.blockers,
  });
}
