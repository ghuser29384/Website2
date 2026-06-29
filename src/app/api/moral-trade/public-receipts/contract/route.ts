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
      claimReviewKeys: contract.claimReviewKeys,
      publicationGateKeys: contract.publicationGateKeys,
      publicationGateStates: contract.publicationGateStates,
      personalContributionStates: contract.personalContributionStates,
      netPersonalAttributionStates: contract.netPersonalAttributionStates,
      sensitiveActionDisplayModes: contract.sensitiveActionDisplayModes,
      publicityAsTradeTermBlockStates: contract.publicityAsTradeTermBlockStates,
      publicationDefaultPlacements: contract.publicationDefaultPlacements,
      claimHygieneRules: contract.claimHygieneRules,
      defaultPublicationControls: contract.defaultPublicationControls,
      defaultDirectDonationParityControls:
        contract.defaultDirectDonationParityControls,
      netAttributionExclusionControls: contract.netAttributionExclusionControls,
      requiredPublicFields: contract.requiredPublicFields,
      prohibitedPublicSignals: contract.prohibitedPublicSignals,
      sampleEvaluationStatuses: Object.fromEntries(
        contract.samplePreviews.map((preview) => [
          preview.receiptId,
          {
            status: preview.validation.status,
            blockers: preview.validation.blockers,
            claimKind: preview.claimKind,
            claimReviewStates: preview.claimReviewStates,
            correctionStatus: preview.correctionStatus,
            currentStatus: preview.publicationControls.currentStatus,
            defaultPlacement: preview.publicationControls.defaultPlacement,
            directDonationParityControls: preview.directDonationParityControls,
            issuedAt: preview.publicationControls.issuedAt,
            netAttributionState: preview.netAttributionControls.attributionState,
            publicationPressureReportingRequired:
              preview.publicationControls.publicationPressureReportingRequired,
            publicationPressureReportCount:
              preview.publicationControls.publicationPressureReportRefs.length,
            publicityAsTradeTermBlockState:
              preview.publicationControls.publicityAsTradeTermBlockState,
            sensitiveActionDisplayMode:
              preview.sensitiveActionDisclosure.displayMode,
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
