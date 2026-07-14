import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradeAntiEnumerationContract,
  validateMoralTradeAntiEnumerationContract,
} from "@/lib/moral-trade/anti-enumeration";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no anti-enumeration payload until the window resets.",
    );
  }

  const contract = getMoralTradeAntiEnumerationContract();
  const validation = validateMoralTradeAntiEnumerationContract(contract);

  return buildMoralTradeApiJsonResponse({
    ok: validation.status === "pass",
    checkedAt: new Date().toISOString(),
    contractVersion: contract.version,
    purpose: contract.purpose,
    validation,
    publicContract: {
      privacyRule: contract.privacyRule,
      failClosedRule: contract.failClosedRule,
      firstClassRecordTables: contract.firstClassRecordTables,
      policySnapshotSubjects: contract.policySnapshotSubjects,
      surfaces: contract.surfaces,
      countBuckets: contract.countBuckets,
      failClosedStatuses: contract.failClosedStatuses,
      surfaceDefinitions: contract.surfaceDefinitions.map((surface) => ({
        key: surface.key,
        protectedInference: surface.protectedInference,
        requiredControls: surface.requiredControls,
        blocksTransitions: surface.blocksTransitions,
      })),
      antiEnumerationSampleEvaluationStatuses: Object.fromEntries(
        contract.sampleEvaluations.map((evaluation) => [
          evaluation.surface,
          evaluation.status,
        ]),
      ),
      contractTests: contract.contractTests,
    },
    blockers: validation.blockers,
  });
}
