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
      policyEnforcedWorkflow: contract.policyEnforcedWorkflow,
      reviewStateOutcomes: contract.reviewStateOutcomes,
      marketplaceFactorPriority: contract.marketplaceFactorPriority,
      participantCopyTemplates: contract.participantCopyTemplates,
      invariants: contract.invariants,
      sampleDetailCardKeys: contract.sampleDetailCards.map((card) => card.key),
      sampleDetailCardStatusReasons: contract.sampleDetailCards.map((card) => ({
        key: card.key,
        status: card.status,
        statusReasonCode: card.statusReasonCode,
        statusReason: card.statusReason,
      })),
      sampleMarketplaceFactorCodes: contract.sampleMarketplaceCard.factorCodes,
      sampleMarketplaceStatusReason: {
        status: contract.sampleMarketplaceCard.status,
        statusReasonCode: contract.sampleMarketplaceCard.statusReasonCode,
        statusReason: contract.sampleMarketplaceCard.statusReason,
      },
      contractTests: contract.contractTests,
    },
    blockers: validation.blockers,
  });
}
