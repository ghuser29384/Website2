import { createServiceClient } from "@/lib/supabase/server";

import {
  MPGF_PUBLIC_GOODS_REVIEW_REASON_CODES,
  reconcileMpgfPublicGoodsExternalHandoff,
} from "./mechanism";
import type {
  MpgfPublicGoodsCampaign,
  MpgfPublicGoodsCaptureMode,
  MpgfPublicGoodsPaymentProof,
  MpgfPublicGoodsPledge,
  MpgfPublicGoodsReviewCase,
  MpgfPublicGoodsReviewReasonCode,
  MpgfPublicGoodsVisibilityMode,
} from "./types";

type SupabaseServiceAny = ReturnType<typeof createServiceClient> & {
  from: (table: string) => any;
};

export interface ReconcileMpgfPublicGoodsPaymentProofInput {
  pledgeId: string;
  amountVerifiedCents: number;
  verified: boolean;
  sourceEventRef: string;
  reconciliationSource?: MpgfPublicGoodsPaymentProof["reconciliationSource"];
  externalReceiptRef?: string;
  charityReceiptRef?: string;
  reviewerId?: string;
}

export interface MpgfPublicGoodsPaymentProofRows {
  paymentProofRow: Record<string, unknown>;
  reviewCaseRow: Record<string, unknown>;
  pledgeStatus: MpgfPublicGoodsPledge["status"];
}

export interface MpgfPublicGoodsReconciliationResult {
  ok: true;
  status: "processed" | "already_processed";
  paymentProof: MpgfPublicGoodsPaymentProof;
  reviewCase: MpgfPublicGoodsReviewCase;
}

function requiredTrimmed(value: string | undefined, label: string) {
  const trimmed = value?.trim();

  if (!trimmed) {
    throw new Error(`${label} is required for MPGF public-goods reconciliation.`);
  }

  return trimmed;
}

function optionalTrimmed(value: string | undefined) {
  const trimmed = value?.trim();

  return trimmed ? trimmed : undefined;
}

function isUuid(value: string | undefined): value is string {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value),
  );
}

function normalizeCaptureMode(value: unknown): MpgfPublicGoodsCaptureMode {
  if (value === "stored_payment_method" || value === "signed_intent") {
    return value;
  }

  return "external_handoff";
}

function normalizeVisibilityMode(value: unknown): MpgfPublicGoodsVisibilityMode {
  if (value === "public_supporter" || value === "public_reason") {
    return value;
  }

  return "private_amount";
}

function normalizeReasonCode(value: unknown): MpgfPublicGoodsReviewReasonCode {
  return typeof value === "string" &&
    MPGF_PUBLIC_GOODS_REVIEW_REASON_CODES.includes(value as MpgfPublicGoodsReviewReasonCode)
    ? (value as MpgfPublicGoodsReviewReasonCode)
    : "needs_destination_evidence";
}

function mapCampaignRow(row: Record<string, unknown>): MpgfPublicGoodsCampaign {
  return {
    id: String(row.id),
    slug: String(row.slug),
    poolAlternativeId: typeof row.pool_alternative_id === "string" ? row.pool_alternative_id : undefined,
    title: String(row.title),
    destinationType:
      row.destination_type === "fiscal_host" ||
      row.destination_type === "internal_demo_pool" ||
      row.destination_type === "signed_sponsor_route"
        ? row.destination_type
        : "external_charity",
    destinationRef: String(row.destination_ref ?? ""),
    causeTags: Array.isArray(row.cause_tags) ? row.cause_tags.map(String) : [],
    publicSummary: String(row.public_summary ?? ""),
    thresholdAmountCents: Number(row.threshold_amount_cents ?? 0),
    thresholdSupporters: Number(row.threshold_supporters ?? 0),
    deadlineAt: String(row.deadline_at),
    verificationMethod: String(row.verification_method ?? ""),
    baselineRule: String(row.baseline_rule ?? ""),
    exitRule: String(row.exit_rule ?? ""),
    reviewStatus:
      row.review_status === "approved" ||
      row.review_status === "blocked" ||
      row.review_status === "challenge_window" ||
      row.review_status === "finalized" ||
      row.review_status === "needs_evidence"
        ? row.review_status
        : "submitted",
    challengeWindowEndsAt:
      typeof row.challenge_window_ends_at === "string" ? row.challenge_window_ends_at : undefined,
  };
}

function mapPledgeRow(row: Record<string, unknown>): MpgfPublicGoodsPledge {
  return {
    id: String(row.id),
    campaignId: String(row.campaign_id),
    userId: String(row.user_ref ?? row.profile_id),
    amountCents: Number(row.amount_cents ?? 0),
    visibilityMode: normalizeVisibilityMode(row.visibility_mode),
    isRecurring: Boolean(row.is_recurring),
    captureMode: normalizeCaptureMode(row.capture_mode),
    paymentIntentRef: typeof row.payment_intent_ref === "string" ? row.payment_intent_ref : undefined,
    eligibilityState:
      row.eligibility_state === "pending_review" ||
      row.eligibility_state === "duplicate_identity" ||
      row.eligibility_state === "below_minimum" ||
      row.eligibility_state === "blocked"
        ? row.eligibility_state
        : "eligible",
    humanScoreBps: Number(row.human_score_bps ?? 0),
    status:
      row.status === "captured" || row.status === "voided" || row.status === "expired" ? row.status : "pledged",
    supporterReason: typeof row.supporter_reason === "string" ? row.supporter_reason : undefined,
    createdAt: String(row.created_at),
  };
}

export function buildMpgfPublicGoodsReconciliationRows(input: {
  paymentProof: MpgfPublicGoodsPaymentProof;
  reviewCase: MpgfPublicGoodsReviewCase;
  sourceEventRef: string;
}) {
  const sourceEventRef = requiredTrimmed(input.sourceEventRef, "Source event reference");
  const paymentProofRow = {
    pledge_id: input.paymentProof.pledgeId ?? null,
    campaign_id: input.paymentProof.campaignId,
    external_receipt_ref: input.paymentProof.externalReceiptRef ?? null,
    charity_receipt_ref: input.paymentProof.charityReceiptRef ?? null,
    amount_verified_cents: input.paymentProof.amountVerifiedCents,
    status: input.paymentProof.status,
    reason_code: input.paymentProof.reasonCode,
    reconciliation_source: input.paymentProof.reconciliationSource,
    source_event_ref: sourceEventRef,
    verified_at: input.paymentProof.verifiedAt ?? null,
    created_at: input.paymentProof.createdAt,
  };
  const reviewCaseRow = {
    campaign_id: input.reviewCase.campaignId,
    state: input.reviewCase.state,
    action: input.reviewCase.action,
    reason_code: input.reviewCase.reasonCode,
    reviewer_id: isUuid(input.reviewCase.reviewerId) ? input.reviewCase.reviewerId : null,
    opened_at: input.reviewCase.openedAt,
    closed_at: input.reviewCase.closedAt ?? null,
    appeal_status: input.reviewCase.appealStatus,
    challenge_window_ends_at: input.reviewCase.challengeWindowEndsAt ?? null,
    public_notes: input.reviewCase.publicNotes,
    allowed_next_actions: input.reviewCase.allowedNextActions,
  };

  return {
    paymentProofRow,
    reviewCaseRow,
    pledgeStatus: input.paymentProof.status === "verified" ? "captured" : "pledged",
  } satisfies MpgfPublicGoodsPaymentProofRows;
}

export async function reconcileMpgfPublicGoodsPaymentProof(
  input: ReconcileMpgfPublicGoodsPaymentProofInput,
): Promise<MpgfPublicGoodsReconciliationResult> {
  const pledgeId = requiredTrimmed(input.pledgeId, "Pledge id");
  const sourceEventRef = requiredTrimmed(input.sourceEventRef, "Source event reference");
  const supabase = createServiceClient() as SupabaseServiceAny;
  const source = input.reconciliationSource ?? "external_receipt";
  const existing = await supabase
    .from("mpgf_public_goods_payment_proofs")
    .select("id, pledge_id, campaign_id, source_event_ref, external_receipt_ref, charity_receipt_ref, amount_verified_cents, status, reason_code, reconciliation_source, verified_at, created_at")
    .eq("reconciliation_source", source)
    .eq("source_event_ref", sourceEventRef)
    .maybeSingle();

  if (existing.error) {
    throw new Error(`Could not check MPGF public-goods payment proof idempotency: ${existing.error.message}`);
  }

  if (existing.data) {
    const row = existing.data as Record<string, unknown>;
    return {
      ok: true,
      status: "already_processed",
      paymentProof: {
        id: String(row.id),
        pledgeId: typeof row.pledge_id === "string" ? row.pledge_id : undefined,
        campaignId: String(row.campaign_id),
        sourceEventRef: typeof row.source_event_ref === "string" ? row.source_event_ref : undefined,
        externalReceiptRef: typeof row.external_receipt_ref === "string" ? row.external_receipt_ref : undefined,
        charityReceiptRef: typeof row.charity_receipt_ref === "string" ? row.charity_receipt_ref : undefined,
        amountVerifiedCents: Number(row.amount_verified_cents ?? 0),
        status:
          row.status === "verified" ||
          row.status === "rejected" ||
          row.status === "superseded"
            ? row.status
            : "pending_review",
        reasonCode: normalizeReasonCode(row.reason_code),
        reconciliationSource:
          row.reconciliation_source === "fiscal_host_webhook" ||
          row.reconciliation_source === "sponsor_signed_intent" ||
          row.reconciliation_source === "every_org_partner_webhook"
            ? row.reconciliation_source
            : "external_receipt",
        verifiedAt: typeof row.verified_at === "string" ? row.verified_at : undefined,
        createdAt: String(row.created_at),
      },
      reviewCase: {
        id: `review-case-${String(row.id)}`,
        campaignId: String(row.campaign_id),
        state: row.status === "verified" ? "approved" : "needs_evidence",
        action: row.status === "verified" ? "approve" : "needs_evidence",
        reasonCode: normalizeReasonCode(row.reason_code),
        reviewerId: "mpgf-reconciliation-worker",
        openedAt: String(row.created_at),
        closedAt: typeof row.verified_at === "string" ? row.verified_at : undefined,
        appealStatus: "none",
        publicNotes: "Existing reconciliation proof returned by idempotency key.",
        allowedNextActions: row.status === "verified" ? ["challenge", "finalize"] : ["needs_evidence", "block"],
      },
    };
  }

  const pledgeLoad = await supabase
    .from("mpgf_public_goods_pledges")
    .select("id, campaign_id, profile_id, user_ref, amount_cents, visibility_mode, is_recurring, capture_mode, payment_intent_ref, eligibility_state, human_score_bps, status, supporter_reason, created_at")
    .eq("id", pledgeId)
    .maybeSingle();

  if (pledgeLoad.error || !pledgeLoad.data) {
    throw new Error(`Could not load MPGF public-goods pledge for reconciliation: ${pledgeLoad.error?.message ?? pledgeId}`);
  }

  const pledge = mapPledgeRow(pledgeLoad.data as Record<string, unknown>);
  const campaignLoad = await supabase
    .from("mpgf_public_goods_campaigns")
    .select("id, slug, pool_alternative_id, title, destination_type, destination_ref, cause_tags, public_summary, threshold_amount_cents, threshold_supporters, deadline_at, verification_method, baseline_rule, exit_rule, review_status, challenge_window_ends_at")
    .eq("id", pledge.campaignId)
    .maybeSingle();

  if (campaignLoad.error || !campaignLoad.data) {
    throw new Error(
      `Could not load MPGF public-goods campaign for reconciliation: ${campaignLoad.error?.message ?? pledge.campaignId}`,
    );
  }

  const campaign = mapCampaignRow(campaignLoad.data as Record<string, unknown>);
  const reconciled = reconcileMpgfPublicGoodsExternalHandoff({
    campaign,
    pledge,
    amountVerifiedCents: input.amountVerifiedCents,
    reconciliationSource: source,
    externalReceiptRef: optionalTrimmed(input.externalReceiptRef),
    charityReceiptRef: optionalTrimmed(input.charityReceiptRef),
    verified: input.verified,
    reviewerId: input.reviewerId ?? "mpgf-reconciliation-worker",
  });
  const rows = buildMpgfPublicGoodsReconciliationRows({
    paymentProof: reconciled.paymentProof,
    reviewCase: reconciled.reviewCase,
    sourceEventRef,
  });
  const proofInsert = await supabase
    .from("mpgf_public_goods_payment_proofs")
    .insert(rows.paymentProofRow)
    .select("id")
    .single();

  if (proofInsert.error) {
    throw new Error(`Could not write MPGF public-goods payment proof: ${proofInsert.error.message}`);
  }

  const reviewCaseInsert = await supabase.from("mpgf_public_goods_review_cases").insert(rows.reviewCaseRow);

  if (reviewCaseInsert.error) {
    throw new Error(`Could not write MPGF public-goods recovery review case: ${reviewCaseInsert.error.message}`);
  }

  const pledgeUpdate = await supabase
    .from("mpgf_public_goods_pledges")
    .update({ status: rows.pledgeStatus })
    .eq("id", pledgeId);

  if (pledgeUpdate.error) {
    throw new Error(`Could not update MPGF public-goods pledge after reconciliation: ${pledgeUpdate.error.message}`);
  }

  return {
    ok: true,
    status: "processed",
    paymentProof: {
      ...reconciled.paymentProof,
      id: String((proofInsert.data as Record<string, unknown>).id),
      sourceEventRef,
    },
    reviewCase: reconciled.reviewCase,
  };
}
