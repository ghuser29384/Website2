import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getBackgroundAiShadowContract,
  validateBackgroundAiShadowContract,
} from "@/lib/background-ai-shadow";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited AI shadow contract read returns no contract payload until the window resets.",
    );
  }

  const contract = getBackgroundAiShadowContract();
  const validation = validateBackgroundAiShadowContract(contract);

  return buildMoralTradeApiJsonResponse({
    ok: validation.status === "pass",
    checkedAt: new Date().toISOString(),
    contractVersion: contract.version,
    purpose: contract.purpose,
    validation,
    publicContract: {
      allowedUse: contract.allowedUse,
      decisioningMode: contract.decisioningMode,
      stateMutation: contract.stateMutation,
      requiredSourceFields: contract.requiredSourceFields,
      prohibitedEffects: contract.prohibitedEffects,
      invariants: contract.invariants,
      sampleReadyEvaluation: contract.sampleReadyEvaluation,
      sampleBlockedEvaluation: contract.sampleBlockedEvaluation,
      contractTests: contract.contractTests,
    },
    blockers: validation.blockers,
  });
}
