import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradeImpactClaimContract,
  validateMoralTradeImpactClaimContract,
} from "@/lib/moral-trade/impact-claims";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no impact-claim payload until the window resets.",
    );
  }

  const contract = getMoralTradeImpactClaimContract();
  const validation = validateMoralTradeImpactClaimContract(contract);

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
      claimTypes: contract.claimTypes,
      evidenceClaimTypes: contract.evidenceClaimTypes,
      failClosedStatuses: contract.failClosedStatuses,
      surfaceDefinitions: contract.surfaceDefinitions.map((surface) => ({
        key: surface.key,
        protectedClaimBoundary: surface.protectedClaimBoundary,
        requiredControls: surface.requiredControls,
        blocksTransitions: surface.blocksTransitions,
      })),
      impactClaimSampleEvaluationStatuses: Object.fromEntries(
        contract.sampleEvaluations.map((evaluation) => [
          evaluation.claimType,
          evaluation.status,
        ]),
      ),
      contractTests: contract.contractTests,
    },
    blockers: validation.blockers,
  });
}
