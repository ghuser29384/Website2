import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getBackgroundCapabilityGateContract,
  validateBackgroundCapabilityGateContract,
} from "@/lib/background-capability-gates";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited background capability-gate contract read returns no contract payload until the window resets.",
    );
  }

  const contract = getBackgroundCapabilityGateContract();
  const validation = validateBackgroundCapabilityGateContract(contract);

  return buildMoralTradeApiJsonResponse({
    ok: validation.status === "pass",
    checkedAt: new Date().toISOString(),
    contractVersion: contract.version,
    purpose: contract.purpose,
    validation,
    publicContract: {
      gates: contract.gates.map((gate) => ({
        key: gate.key,
        label: gate.label,
        releaseState: gate.releaseState,
        purpose: gate.purpose,
        allowedUse: gate.allowedUse,
        lawfulBasis: gate.lawfulBasis,
        retentionRule: gate.retentionRule,
        dataInputs: gate.dataInputs,
        prohibitedEffects: gate.prohibitedEffects,
        requiredBeforeExpansion: gate.requiredBeforeExpansion,
        currentBlockers: gate.currentBlockers,
        publicEvidence: gate.publicEvidence,
      })),
      invariants: contract.invariants,
      contractTests: contract.contractTests,
      expansionReady: validation.expansionReady,
    },
    blockers: validation.blockers,
  });
}
