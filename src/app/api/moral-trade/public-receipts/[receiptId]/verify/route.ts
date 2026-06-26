import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  PUBLIC_RECEIPT_CARD_POLICY_VERSION,
  PUBLIC_RECEIPT_REQUIRED_PUBLICATION_GATES,
  buildPublicReceiptCardPreview,
  type PublicReceiptCardDraft,
} from "@/lib/moral-trade/public-receipt-cards";

export const dynamic = "force-dynamic";

interface PublicReceiptVerifyRouteContext {
  params: Promise<{
    receiptId: string;
  }>;
}

function buildContractOnlyReceiptDraft(receiptId: string): PublicReceiptCardDraft {
  return {
    claimReviewStates: {},
    claimCopy:
      "Contract-only verification preview. No public receipt record is loaded by this route, so any contribution claim stays trade-conditioned.",
    claimKind: "donation_offset",
    contributionSummary: {
      baselineAdditionalityReview: "missing",
      causalWording: "trade_conditioned",
      counterfactualTrustReview: "missing",
      impactClaimReview: "missing",
      personalContribution: "No personal contribution is loaded by this contract-only preview.",
      personalContributionState: "suppressed_uncertain",
      totalVerifiedRecipientTransfer: "No total verified recipient transfer is loaded by this contract-only preview.",
      tradeConditionedContribution:
        "No trade-conditioned contribution is loaded by this contract-only preview.",
    },
    correctionStatus: "none",
    directDonationParityControls: {
      affectsEligibility: false,
      affectsFutureMarketplaceAccess: false,
      affectsMatchingPriority: false,
      affectsProfileProminence: false,
      affectsPublicSearchOrdering: false,
      affectsReviewPriority: false,
      framedAsMoralUpgrade: false,
      modeOffered: false,
      participantOptIn: false,
      preselected: false,
      requiredForReceiptPublication: false,
    },
    directDonationParityNote:
      "Direct donation remains at parity; Moral Trade has no preference for this route over giving directly.",
    evidenceLevel: "receipt_reviewed",
    netAttributionControls: {
      attributionState: "uncertain_qualified",
      counterpartyReimbursementsExcluded: true,
      donorAdvisedFundCreditsExcluded: true,
      employerMatchesExcluded: true,
      grossPersonalTransfer:
        "No gross personal transfer is loaded by this contract-only preview.",
      knownReimbursementOrSubsidy:
        "No reimbursement, subsidy, refund, match, credit, or side benefit is loaded by this contract-only preview.",
      netPersonalContribution:
        "No verified net personal contribution is loaded by this contract-only preview.",
      refundsExcluded: true,
      sideBenefitDisclosure:
        "No side benefit is loaded or counted by this contract-only preview.",
      sponsorSubsidiesExcluded: true,
      tradeConditionedFundsExcluded: true,
      tradeUnlockedFundsExcluded: true,
    },
    netAttributionNote:
      "Net attribution is uncertain in this contract-only preview and must be qualified before public display; reimbursements, subsidies, refunds, matches, side benefits, and counterparty funds are not counted as personal contribution.",
    participantOptIn: true,
    publicationGateStates: {
      challenge_window: "missing",
      content_moderation: "missing",
      privacy_publication: "missing",
      public_metric_release: "missing",
      reconciliation: "missing",
      recipient_acceptance_adverse_association: "missing",
    },
    publicationControls: {
      affectsMatchingOrReview: false,
      currentStatus: "current",
      issuedAt: new Date(0).toISOString(),
      profileOrSearchBoost: false,
      publicEngagementCounters: false,
      publicationPressureReportingRequired: true,
      publicationPressureReportRefs: [],
      publicationRequiredAsTradeTerm: false,
      publicityAsTradeTermBlockState: "not_required",
      recommendationOrPriorityBoost: false,
      sidecarOnly: true,
    },
    publicActionSummary: "Contract-only public receipt verification preview",
    receiptId,
    reviewed: true,
    sensitiveActionRedacted: true,
    sensitiveActionDisclosure: {
      autonomyReviewState: "not_required_for_stage",
      contentModerationReviewState: "not_required_for_stage",
      displayMode: "transfer_only",
      privacyReviewState: "not_required_for_stage",
      separatePublicActionDisclosureConsent: false,
    },
    title: "Public receipt verification",
    verificationUrl: `/api/moral-trade/public-receipts/${receiptId}/verify`,
    visibility: "private_preview",
  };
}

export async function GET(
  request: Request,
  { params }: PublicReceiptVerifyRouteContext,
) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public receipt verification returns no receipt payload until the window resets.",
    );
  }

  const { receiptId } = await params;
  const normalizedReceiptId = receiptId.trim().toLowerCase();

  if (!/^[a-z0-9-]{6,96}$/.test(normalizedReceiptId)) {
    return buildMoralTradeApiJsonResponse(
      {
        ok: false,
        blockers: ["invalid_receipt_id"],
        policyVersion: PUBLIC_RECEIPT_CARD_POLICY_VERSION,
        receiptId: normalizedReceiptId,
      },
      "no_store_dynamic",
      { status: 400 },
    );
  }

  const preview = buildPublicReceiptCardPreview(
    buildContractOnlyReceiptDraft(normalizedReceiptId),
  );

  return buildMoralTradeApiJsonResponse({
    ok: preview.validation.status === "pass",
    checkedAt: new Date().toISOString(),
    policyVersion: PUBLIC_RECEIPT_CARD_POLICY_VERSION,
    receiptId: normalizedReceiptId,
    verificationStatus: "contract_only_no_public_claim_loaded",
    verification: {
      authoritativeSource: "privacy_safe_verification_url",
      correctionOrRevocationState:
        preview.correctionStatus === "none" && preview.publicationControls.currentStatus === "current"
          ? "none"
          : `${preview.correctionStatus}:${preview.publicationControls.currentStatus}`,
      correctionStatus: preview.correctionStatus,
      currentStatus: preview.publicationControls.currentStatus,
      issuedAt: preview.publicationControls.issuedAt,
      staticImageAuthoritative: false,
    },
    validation: preview.validation,
    publicContract: {
      claimKind: preview.claimKind,
      correctionStatus: preview.correctionStatus,
      correctionRevocationStateRequired: true,
      directDonationParityControlsRequired: true,
      directDonationParityNoteRequired: true,
      gamificationAndRankingAllowed: false,
      issuedAtRequired: true,
      netAttributionControlsRequired: true,
      netPersonalAttributionStates: [
        "verified_net_personal",
        "disclosed_partial_reimbursement",
        "disclosed_subsidy_or_match",
        "uncertain_qualified",
        "disputed_blocked",
        "suppressed",
      ],
      netPersonalContributionExcludesThirdPartyFunds: true,
      objectiveMoralEndorsementAllowed: false,
      participantOptInRequired: true,
      publicationPressureReportingRequired: true,
      publicityAsTradeTermBlockStates: [
        "not_required",
        "possible",
        "blocked",
        "manual_review",
      ],
      publicityAsTradeTermBlocksPublication: true,
      publicationGateKeys: PUBLIC_RECEIPT_REQUIRED_PUBLICATION_GATES,
      publicationGatesMustBeNonBlocking: true,
      publicEngagementCountersAllowed: false,
      publicationAffectsMatchingOrReview: false,
      publicationCanBeTradeTerm: false,
      currentStatusRequired: true,
      sensitiveActionDisplayModes: [
        "generic_action_label",
        "transfer_only",
        "exact_action_details",
      ],
      sensitiveActionExactDetailsRequireSeparateConsentAndReview: true,
      sensitiveActionRedactionRequired: true,
      strongerTradeUnlockedWordingRequiresReviewedCausalSupport: true,
      tradeConditionedWordingDefault: true,
      visibility: preview.visibility,
    },
    blockers: preview.validation.blockers,
  });
}
