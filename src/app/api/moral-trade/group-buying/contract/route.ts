import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralGoodsGroupBuyingContract,
  validateMoralGoodsGroupBuyingContract,
} from "@/lib/moral-trade/group-buying";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");
  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited group-buying contract read returns no contract payload until the window resets.",
    );
  }

  const contract = getMoralGoodsGroupBuyingContract();
  const validation = validateMoralGoodsGroupBuyingContract(contract);

  return buildMoralTradeApiJsonResponse({
    blockers: validation.blockers,
    checkedAt: new Date().toISOString(),
    contractVersion: contract.version,
    ok: validation.status === "pass",
    publicContract: {
      contractTests: contract.contractTests,
      envelopeTypes: contract.envelopeTypes,
      failureMessageTemplateKeys: contract.failureMessageTemplates.map((template) => template.key),
      featureModules: contract.featureModules,
      featureName: contract.featureName,
      firstClassRecordTables: contract.firstClassRecordTables,
      ordinaryUiBannedTerms: contract.ordinaryUiBannedTerms,
      sampleDealCards: contract.sampleDealCards,
      sampleSettlementPlan: {
        adjustedUnitsTotalMilli: contract.sampleSettlementPlan.adjustedUnitsTotalMilli,
        blockers: contract.sampleSettlementPlan.blockers,
        calculationInputHash: contract.sampleSettlementPlan.calculationInputHash,
        calculationOutputHash: contract.sampleSettlementPlan.calculationOutputHash,
        fixedConsiderationEarnedMinor: contract.sampleSettlementPlan.fixedConsiderationEarnedMinor,
        fundingSourceSetHash: contract.sampleSettlementPlan.fundingSourceSetHash,
        participantPayoutTotalMinor: contract.sampleSettlementPlan.participantPayoutTotalMinor,
        status: contract.sampleSettlementPlan.planStatus,
      },
      seedEnvelopeSlugs: contract.seedEnvelopeSlugs,
      sharedPrimitiveTables: contract.sharedPrimitiveTables,
      statusSentenceTemplates: contract.statusSentenceTemplates,
      userFacingStateLabels: contract.userFacingStateLabels,
    },
    purpose: contract.purpose,
    validation,
  });
}
