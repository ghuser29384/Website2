import {
  getBackgroundPrivateOverlapContract,
  validateBackgroundPrivateOverlapContract,
} from "@/lib/background-private-overlap";
import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited private-overlap contract read returns no contract payload until the window resets.",
    );
  }

  const contract = getBackgroundPrivateOverlapContract();
  const validation = validateBackgroundPrivateOverlapContract(contract);

  return buildMoralTradeApiJsonResponse({
    ok: validation.status === "pass",
    checkedAt: new Date().toISOString(),
    contractVersion: contract.version,
    purpose: contract.purpose,
    validation,
    publicContract: {
      releaseState: contract.releaseState,
      liveEndpointEnabled: contract.liveEndpointEnabled,
      storageState: contract.storageState,
      namespaceRules: contract.namespaceRules,
      forbiddenInputs: contract.forbiddenInputs,
      forbiddenStoredFields: contract.forbiddenStoredFields,
      futureStoredFields: contract.futureStoredFields,
      participantOutput: contract.participantOutput,
      plannedEndpoints: contract.plannedEndpoints,
      blockedUntil: contract.blockedUntil,
      requiredReviews: contract.requiredReviews,
      fallbackBehavior: contract.fallbackBehavior,
      contractTests: contract.contractTests,
      liveReady: validation.liveReady,
    },
    publicNonClaim:
      "Private overlap checks are governance-gated; the pilot route must not use free text and must not reveal raw tags.",
    blockers: validation.blockers,
  });
}
