import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getOfferReviewWorkflowContract,
  validateOfferReviewWorkflowContract,
} from "@/lib/proposal-review";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no contract payload until the window resets.",
    );
  }

  const contract = getOfferReviewWorkflowContract();
  const validation = validateOfferReviewWorkflowContract(contract);

  return buildMoralTradeApiJsonResponse({
    ok: validation.status === "pass",
    checkedAt: new Date().toISOString(),
    contractVersion: contract.version,
    purpose: contract.purpose,
    validation,
    publicContract: {
      statuses: contract.statuses,
      detailWorkflowCards: contract.detailWorkflowCards,
      marketplaceFactorPriority: contract.marketplaceFactorPriority,
      participantCopyTemplates: contract.participantCopyTemplates,
      invariants: contract.invariants,
      sampleDetailCardKeys: contract.sampleDetailCards.map((card) => card.key),
      sampleMarketplaceFactorCodes: contract.sampleMarketplaceCard.factorCodes,
      contractTests: contract.contractTests,
    },
    blockers: validation.blockers,
  });
}
