import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getPublicReceiptCardContract,
  validatePublicReceiptCardContract,
} from "@/lib/moral-trade/public-receipt-cards";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no public-receipt-card payload until the window resets.",
    );
  }

  const contract = getPublicReceiptCardContract();
  const validation = validatePublicReceiptCardContract(contract);

  return buildMoralTradeApiJsonResponse({
    ok: validation.status === "pass",
    checkedAt: new Date().toISOString(),
    contractVersion: contract.version,
    policyVersion: contract.policyVersion,
    purpose: contract.purpose,
    validation,
    publicContract: {
      firstClassRecordTables: contract.firstClassRecordTables,
      claimKinds: contract.claimKinds,
      visibilityStates: contract.visibilityStates,
      correctionStatuses: contract.correctionStatuses,
      causalWordingStates: contract.causalWordingStates,
      reviewStates: contract.reviewStates,
      personalContributionStates: contract.personalContributionStates,
      claimHygieneRules: contract.claimHygieneRules,
      defaultPublicationControls: contract.defaultPublicationControls,
      requiredPublicFields: contract.requiredPublicFields,
      prohibitedPublicSignals: contract.prohibitedPublicSignals,
      sampleEvaluationStatuses: Object.fromEntries(
        contract.samplePreviews.map((preview) => [
          preview.receiptId,
          {
            status: preview.validation.status,
            blockers: preview.validation.blockers,
            claimKind: preview.claimKind,
            visibility: preview.visibility,
            causalWording: preview.contributionSummary.causalWording,
          },
        ]),
      ),
      contractTests: contract.contractTests,
    },
    blockers: validation.blockers,
  });
}
