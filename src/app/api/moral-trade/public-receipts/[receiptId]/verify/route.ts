import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  PUBLIC_RECEIPT_CARD_POLICY_VERSION,
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
    claimCopy:
      "Contract-only verification preview. No public receipt record is loaded by this route.",
    claimKind: "donation_offset",
    correctionStatus: "none",
    directDonationParityNote:
      "Direct donation remains at parity; Moral Trade has no preference for this route over giving directly.",
    evidenceLevel: "receipt_reviewed",
    netAttributionNote:
      "Net attribution is limited to reviewed redirected amounts and excludes unmatched surplus.",
    participantOptIn: true,
    publicActionSummary: "Contract-only public receipt verification preview",
    receiptId,
    reviewed: true,
    sensitiveActionRedacted: true,
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
    validation: preview.validation,
    publicContract: {
      claimKind: preview.claimKind,
      correctionStatus: preview.correctionStatus,
      directDonationParityNoteRequired: true,
      gamificationAndRankingAllowed: false,
      objectiveMoralEndorsementAllowed: false,
      participantOptInRequired: true,
      sensitiveActionRedactionRequired: true,
      visibility: preview.visibility,
    },
    blockers: preview.validation.blockers,
  });
}
