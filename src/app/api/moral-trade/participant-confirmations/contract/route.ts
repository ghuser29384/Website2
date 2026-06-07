import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradeParticipantConfirmationContract,
  validateMoralTradeParticipantConfirmationContract,
} from "@/lib/moral-trade/participant-confirmations";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no participant-confirmation payload until the window resets.",
    );
  }

  const contract = getMoralTradeParticipantConfirmationContract();
  const validation = validateMoralTradeParticipantConfirmationContract(contract);

  return buildMoralTradeApiJsonResponse({
    ok: validation.status === "pass",
    checkedAt: new Date().toISOString(),
    contractVersion: contract.version,
    purpose: contract.purpose,
    validation,
    publicContract: {
      firstClassRecordTables: contract.firstClassRecordTables,
      subjectTypes: contract.subjectTypes,
      confirmationScopes: contract.confirmationScopes,
      failClosedStatuses: contract.failClosedStatuses,
      consentQualityStatuses: contract.consentQualityStatuses,
      noticeRecordStatuses: contract.noticeRecordStatuses,
      requiredHashFields: contract.requiredHashFields,
      highRiskScopesRequiringConsentQuality:
        contract.highRiskScopesRequiringConsentQuality,
      eligibleSetScopes: contract.eligibleSetScopes,
      sampleEvaluations: contract.sampleEvaluations.map((evaluation) => ({
        subjectType: evaluation.subjectType,
        confirmationScope: evaluation.confirmationScope,
        status: evaluation.status,
        blockers: evaluation.blockers,
      })),
      contractTests: contract.contractTests,
    },
    blockers: validation.blockers,
  });
}
