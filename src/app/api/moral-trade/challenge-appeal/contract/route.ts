import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradeChallengeAppealContract,
  validateMoralTradeChallengeAppealContract,
} from "@/lib/moral-trade/challenge-appeal";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no contract payload until the window resets.",
    );
  }

  const contract = getMoralTradeChallengeAppealContract();
  const validation = validateMoralTradeChallengeAppealContract(contract);

  return buildMoralTradeApiJsonResponse({
    ok: validation.status === "pass",
    checkedAt: new Date().toISOString(),
    contractVersion: contract.version,
    purpose: contract.purpose,
    validation,
    publicContract: {
      decisioningMode: contract.decisioningMode,
      stateMutation: contract.stateMutation,
      subjects: contract.subjects,
      standingCategories: contract.standingCategories,
      appealTriggers: contract.appealTriggers,
      allowedOutcomes: contract.allowedOutcomes,
      approvedFactorCodes: contract.approvedFactorCodes,
      invariants: contract.invariants,
      sampleDecision: contract.sampleDecision,
      contractTests: contract.contractTests,
    },
    blockers: validation.blockers,
  });
}
