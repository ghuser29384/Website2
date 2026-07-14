import { NextResponse } from "next/server";

import { demoMpgfPublicGoodsCampaigns } from "@/lib/mpgf/data";
import {
  MPGF_PUBLIC_GOODS_REVIEW_REASON_CODES,
  reviewMpgfPublicGoodsCampaign,
} from "@/lib/mpgf/mechanism";
import type { MpgfPublicGoodsReviewAction, MpgfPublicGoodsReviewReasonCode } from "@/lib/mpgf/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const reviewActions: readonly MpgfPublicGoodsReviewAction[] = [
  "approve",
  "needs_evidence",
  "block",
  "challenge",
  "finalize",
];

function reviewSecret() {
  return process.env.MPGF_PUBLIC_GOODS_REVIEW_SECRET ?? process.env.MPGF_ADMIN_BOOTSTRAP_SECRET ?? process.env.CRON_SECRET;
}

function isAuthorized(request: Request) {
  const secret = reviewSecret();

  if (!secret) {
    return false;
  }

  const url = new URL(request.url);
  const authorization = request.headers.get("authorization");

  return authorization === `Bearer ${secret}` || url.searchParams.get("secret") === secret;
}

function readAction(value: unknown): MpgfPublicGoodsReviewAction {
  return reviewActions.includes(value as MpgfPublicGoodsReviewAction)
    ? value as MpgfPublicGoodsReviewAction
    : "needs_evidence";
}

function readReasonCode(value: unknown): MpgfPublicGoodsReviewReasonCode {
  return MPGF_PUBLIC_GOODS_REVIEW_REASON_CODES.includes(value as MpgfPublicGoodsReviewReasonCode)
    ? value as MpgfPublicGoodsReviewReasonCode
    : "needs_destination_evidence";
}

export async function POST(request: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  if (!reviewSecret()) {
    return NextResponse.json({ ok: false, error: "MPGF public-goods review API is not configured." }, { status: 503 });
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized MPGF public-goods review request." }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const record = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
    const { campaignId } = await params;
    const campaign = demoMpgfPublicGoodsCampaigns.find(
      (candidate) => candidate.id === campaignId || candidate.slug === campaignId,
    );

    if (!campaign) {
      return NextResponse.json({ ok: false, error: "MPGF public-goods campaign not found." }, { status: 404 });
    }

    const result = reviewMpgfPublicGoodsCampaign({
      campaign,
      action: readAction(record.action),
      reasonCode: readReasonCode(record.reasonCode),
      reviewerId: typeof record.reviewerId === "string" ? record.reviewerId : "mpgf-reviewer-api",
      publicNotes: typeof record.publicNotes === "string" ? record.publicNotes : "Reviewer API eligibility decision.",
      now: new Date(),
    });

    return NextResponse.json({
      ok: true,
      campaign: result.campaign,
      reviewCase: result.reviewCase,
      createsLiveAllocation: result.createsLiveAllocation,
      createsPayoutAuthorization: result.createsPayoutAuthorization,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not review MPGF public-goods campaign." },
      { status: 400 },
    );
  }
}
