import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createServiceClient } from "@/lib/supabase/server";

import {
  demoAlternatives,
  demoMpgfMatchPool,
  demoMpgfPublicGoodsCampaigns,
  demoMpgfPublicGoodsPaymentProofs,
  demoMpgfPublicGoodsReviewCases,
  demoMpgfPublicGoodsSubscriptions,
} from "./data";
import type {
  MpgfPublicGoodsAllocationLine,
  MpgfPublicGoodsCampaign,
  MpgfPublicGoodsPaymentProof,
  MpgfPublicGoodsReviewCase,
  MpgfPublicGoodsReviewReasonCode,
  MpgfPublicGoodsSubscription,
} from "./types";

type SupabaseServiceAny = ReturnType<typeof createServiceClient> & {
  from: (table: string) => any;
};

export interface MpgfPublicGoodsRouteResolution {
  alternative?: (typeof demoAlternatives)[number];
  campaign?: MpgfPublicGoodsCampaign;
  canonicalPoolId?: string;
}

export interface MpgfPublicGoodsProofSummary {
  verifiedAmountCents: number;
  sponsorTopUpCents: number;
  verifiedProofCount: number;
  rejectedProofCount: number;
  latestReasonCode: MpgfPublicGoodsReviewReasonCode | null;
  latestProofStatus: MpgfPublicGoodsPaymentProof["status"] | null;
  latestReconciliationSource: MpgfPublicGoodsPaymentProof["reconciliationSource"] | null;
  latestVerifiedAt: string | null;
  challengeWindowEndsAt: string | null;
  latestAppealStatus: MpgfPublicGoodsReviewCase["appealStatus"];
  activeSponsorSubscriptionCents: number;
  publicEvidenceSource: "demo_fixture" | "persisted_public_aggregate";
  warnings: string[];
}

function hasServiceRoleEnv() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function toNumber(value: unknown) {
  const numeric = Number(value);

  return Number.isFinite(numeric) ? numeric : 0;
}

function normalizeProofStatus(value: unknown): MpgfPublicGoodsPaymentProof["status"] {
  if (value === "verified" || value === "rejected" || value === "superseded") {
    return value;
  }

  return "pending_review";
}

function normalizeReconciliationSource(value: unknown): MpgfPublicGoodsPaymentProof["reconciliationSource"] {
  if (value === "fiscal_host_webhook" || value === "sponsor_signed_intent") {
    return value;
  }

  return "external_receipt";
}

const publicGoodsReasonCodes = new Set<MpgfPublicGoodsReviewReasonCode>([
  "destination_verified",
  "needs_destination_evidence",
  "needs_identity_evidence",
  "blocked_threat_baseline",
  "blocked_destination_risk",
  "challenge_opened",
  "challenge_resolved",
  "external_handoff_verified",
  "external_handoff_failed",
  "duplicate_identity_blocked",
  "appeal_requested",
  "appeal_denied",
  "appeal_upheld",
]);

export function normalizeMpgfPublicGoodsReasonCode(value: unknown): MpgfPublicGoodsReviewReasonCode {
  return typeof value === "string" && publicGoodsReasonCodes.has(value as MpgfPublicGoodsReviewReasonCode)
    ? (value as MpgfPublicGoodsReviewReasonCode)
    : "needs_destination_evidence";
}

function mapPaymentProofRow(row: Record<string, unknown>): MpgfPublicGoodsPaymentProof {
  return {
    id: String(row.id),
    pledgeId: typeof row.pledge_id === "string" ? row.pledge_id : undefined,
    campaignId: String(row.campaign_id),
    sourceEventRef: typeof row.source_event_ref === "string" ? "redacted" : undefined,
    amountVerifiedCents: toNumber(row.amount_verified_cents),
    status: normalizeProofStatus(row.status),
    reasonCode: normalizeMpgfPublicGoodsReasonCode(row.reason_code),
    reconciliationSource: normalizeReconciliationSource(row.reconciliation_source),
    verifiedAt: typeof row.verified_at === "string" ? row.verified_at : undefined,
    createdAt: String(row.created_at),
  };
}

function mapReviewCaseRow(row: Record<string, unknown>): MpgfPublicGoodsReviewCase {
  return {
    id: String(row.id),
    campaignId: String(row.campaign_id),
    state:
      row.state === "approved" ||
      row.state === "blocked" ||
      row.state === "challenge_window" ||
      row.state === "finalized" ||
      row.state === "needs_evidence"
        ? row.state
        : "submitted",
    action:
      row.action === "approve" ||
      row.action === "block" ||
      row.action === "challenge" ||
      row.action === "finalize"
        ? row.action
        : "needs_evidence",
    reasonCode: normalizeMpgfPublicGoodsReasonCode(row.reason_code),
    reviewerId: "redacted-reviewer",
    openedAt: String(row.opened_at),
    closedAt: typeof row.closed_at === "string" ? row.closed_at : undefined,
    appealStatus:
      row.appeal_status === "appeal_requested" ||
      row.appeal_status === "appeal_denied" ||
      row.appeal_status === "appeal_upheld"
        ? row.appeal_status
        : "none",
    challengeWindowEndsAt:
      typeof row.challenge_window_ends_at === "string" ? row.challenge_window_ends_at : undefined,
    publicNotes: String(row.public_notes ?? ""),
    allowedNextActions: [],
  };
}

function mapSubscriptionRow(row: Record<string, unknown>): MpgfPublicGoodsSubscription {
  return {
    id: String(row.id),
    userId: "redacted-sponsor",
    poolId: String(row.pool_id),
    amountCents: toNumber(row.amount_cents),
    interval: row.interval === "annual" ? "annual" : "monthly",
    status:
      row.status === "paused" ||
      row.status === "cancelled" ||
      row.status === "past_due" ||
      row.status === "expired"
        ? row.status
        : "active",
    captureMode:
      row.capture_mode === "stored_payment_method" || row.capture_mode === "signed_intent"
        ? row.capture_mode
        : "external_handoff",
    mode: row.mode === "test_payment" || row.mode === "real_money" ? row.mode : "pledge_only",
    nextChargeAt: String(row.next_charge_at ?? row.created_at ?? ""),
    createdAt: String(row.created_at ?? ""),
  };
}

export function resolveMpgfPublicGoodsRoute(poolId: string): MpgfPublicGoodsRouteResolution {
  const alternative = demoAlternatives.find((candidate) => candidate.id === poolId);
  const campaignByAlternative = alternative
    ? demoMpgfPublicGoodsCampaigns.find((candidate) => candidate.poolAlternativeId === alternative.id)
    : undefined;
  const campaign =
    campaignByAlternative ??
    demoMpgfPublicGoodsCampaigns.find(
      (candidate) => candidate.slug === poolId || candidate.id === poolId || candidate.poolAlternativeId === poolId,
    );
  const resolvedAlternative =
    alternative ??
    (campaign?.poolAlternativeId
      ? demoAlternatives.find((candidate) => candidate.id === campaign.poolAlternativeId)
      : undefined);

  return {
    alternative: resolvedAlternative,
    campaign,
    canonicalPoolId: campaign?.slug ?? resolvedAlternative?.id,
  };
}

export function summarizeMpgfPublicGoodsProof(input: {
  campaign: MpgfPublicGoodsCampaign;
  assuranceLine?: MpgfPublicGoodsAllocationLine | null;
  paymentProofs?: MpgfPublicGoodsPaymentProof[];
  reviewCases?: MpgfPublicGoodsReviewCase[];
  subscriptions?: MpgfPublicGoodsSubscription[];
  source?: MpgfPublicGoodsProofSummary["publicEvidenceSource"];
  warnings?: string[];
}): MpgfPublicGoodsProofSummary {
  const paymentProofs = input.paymentProofs ?? demoMpgfPublicGoodsPaymentProofs;
  const reviewCases = input.reviewCases ?? demoMpgfPublicGoodsReviewCases;
  const subscriptions = input.subscriptions ?? demoMpgfPublicGoodsSubscriptions;
  const campaignProofs = paymentProofs
    .filter((proof) => proof.campaignId === input.campaign.id)
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
  const latestProof = campaignProofs[0];
  const latestReviewCase = reviewCases
    .filter((reviewCase) => reviewCase.campaignId === input.campaign.id)
    .sort((left, right) => Date.parse(right.openedAt) - Date.parse(left.openedAt))[0];

  return {
    verifiedAmountCents: campaignProofs
      .filter((proof) => proof.status === "verified")
      .reduce((sum, proof) => sum + proof.amountVerifiedCents, 0),
    sponsorTopUpCents:
      input.assuranceLine?.status === "payable"
        ? input.assuranceLine.baseMatchCents + input.assuranceLine.qfBonusCents
        : 0,
    verifiedProofCount: campaignProofs.filter((proof) => proof.status === "verified").length,
    rejectedProofCount: campaignProofs.filter((proof) => proof.status === "rejected").length,
    latestReasonCode: latestProof?.reasonCode ?? latestReviewCase?.reasonCode ?? null,
    latestProofStatus: latestProof?.status ?? null,
    latestReconciliationSource: latestProof?.reconciliationSource ?? null,
    latestVerifiedAt: latestProof?.verifiedAt ?? null,
    challengeWindowEndsAt: input.campaign.challengeWindowEndsAt ?? latestReviewCase?.challengeWindowEndsAt ?? null,
    latestAppealStatus: latestReviewCase?.appealStatus ?? "none",
    activeSponsorSubscriptionCents: subscriptions
      .filter((subscription) => subscription.poolId === demoMpgfMatchPool.id && subscription.status === "active")
      .reduce((sum, subscription) => sum + subscription.amountCents, 0),
    publicEvidenceSource: input.source ?? "demo_fixture",
    warnings: input.warnings ?? [],
  };
}

export async function loadMpgfPublicGoodsProofSummary(input: {
  campaign: MpgfPublicGoodsCampaign;
  assuranceLine?: MpgfPublicGoodsAllocationLine | null;
}) {
  if (!hasSupabaseEnv() || !hasServiceRoleEnv()) {
    return summarizeMpgfPublicGoodsProof(input);
  }

  const warnings: string[] = [];

  try {
    const supabase = createServiceClient() as SupabaseServiceAny;
    const [paymentProofs, reviewCases, subscriptions] = await Promise.all([
      supabase
        .from("mpgf_public_goods_payment_proofs")
        .select("id, pledge_id, campaign_id, source_event_ref, amount_verified_cents, status, reason_code, reconciliation_source, verified_at, created_at")
        .eq("campaign_id", input.campaign.id)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("mpgf_public_goods_review_cases")
        .select("id, campaign_id, state, action, reason_code, opened_at, closed_at, appeal_status, challenge_window_ends_at, public_notes")
        .eq("campaign_id", input.campaign.id)
        .order("opened_at", { ascending: false })
        .limit(50),
      supabase
        .from("mpgf_public_goods_subscriptions")
        .select("id, pool_id, amount_cents, interval, status, capture_mode, mode, next_charge_at, created_at")
        .eq("pool_id", demoMpgfMatchPool.id)
        .limit(100),
    ]);

    if (paymentProofs.error) {
      warnings.push(`Payment proof aggregate unavailable: ${paymentProofs.error.message}`);
    }

    if (reviewCases.error) {
      warnings.push(`Review case aggregate unavailable: ${reviewCases.error.message}`);
    }

    if (subscriptions.error) {
      warnings.push(`Sponsor subscription aggregate unavailable: ${subscriptions.error.message}`);
    }

    if (warnings.length > 0) {
      return summarizeMpgfPublicGoodsProof({ ...input, warnings });
    }

    return summarizeMpgfPublicGoodsProof({
      ...input,
      paymentProofs: (paymentProofs.data ?? []).map((row: Record<string, unknown>) => mapPaymentProofRow(row)),
      reviewCases: (reviewCases.data ?? []).map((row: Record<string, unknown>) => mapReviewCaseRow(row)),
      subscriptions: (subscriptions.data ?? []).map((row: Record<string, unknown>) => mapSubscriptionRow(row)),
      source: "persisted_public_aggregate",
    });
  } catch (error) {
    return summarizeMpgfPublicGoodsProof({
      ...input,
      warnings: [error instanceof Error ? error.message : "Public proof aggregate unavailable."],
    });
  }
}
