import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradeMatchSignalContract,
  validateMoralTradeMatchSignalContract,
} from "@/lib/moral-trade/match-signal";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no contract payload until the window resets.",
    );
  }

  const contract = getMoralTradeMatchSignalContract();
  const validation = validateMoralTradeMatchSignalContract(contract);

  return buildMoralTradeApiJsonResponse({
    ok: validation.status === "pass",
    checkedAt: new Date().toISOString(),
    contractVersion: contract.version,
    purpose: contract.purpose,
    validation,
    publicContract: {
      decisioningMode: contract.decisioningMode,
      stateMutation: contract.stateMutation,
      requiredInputFields: contract.requiredInputFields,
      optionalInputFields: contract.optionalInputFields,
      privacyPolicyId: contract.privacyPolicyId,
      disclosureStages: contract.disclosureStages,
      approvedFactorCodes: contract.approvedFactorCodes,
      redactedFields: contract.redactedFields,
      participantExplanationTemplate: contract.participantExplanationTemplate,
      invariants: contract.invariants,
      sampleSignal: contract.sampleSignal,
      contractTests: contract.contractTests,
    },
    blockers: validation.blockers,
  });
}
