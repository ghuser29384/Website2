import { NextResponse } from "next/server";

import { getViewer } from "@/lib/app-data";
import { createMpgfPublicGoodsPledgeIntent } from "@/lib/mpgf/public-goods-contribution-intents";
import { MPGF_PUBLIC_GOODS_API_HEADERS } from "@/lib/mpgf/public-goods-api";
import type { MpgfPublicGoodsVisibilityMode } from "@/lib/mpgf/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function stringField(record: Record<string, unknown>, key: string, fallback = "") {
  const value = record[key];

  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function centsField(record: Record<string, unknown>) {
  const cents = Number(record.amountCents);

  if (Number.isInteger(cents) && cents > 0) {
    return cents;
  }

  const dollars = Number(record.amountDollars);

  return Number.isFinite(dollars) ? Math.round(dollars * 100) : 0;
}

function visibilityMode(value: unknown): MpgfPublicGoodsVisibilityMode {
  return value === "public_supporter" || value === "public_reason" ? value : "private_amount";
}

export async function POST(request: Request, { params }: { params: Promise<{ roundId: string }> }) {
  const viewer = await getViewer();

  if (!viewer) {
    return NextResponse.json({ ok: false, error: "Sign in to create an MPGF pledge intent." }, { status: 401 });
  }

  try {
    const { roundId } = await params;
    const payload = await request.json();

    if (!payload || typeof payload !== "object") {
      throw new Error("MPGF pledge intents expect a JSON object.");
    }

    const record = payload as Record<string, unknown>;
    const pledgeIntent = createMpgfPublicGoodsPledgeIntent({
      roundId,
      campaignId: stringField(record, "campaignId"),
      userId: viewer.authUser.id,
      amountCents: centsField(record),
      visibilityMode: visibilityMode(record.visibilityMode),
      idempotencyKey: stringField(record, "idempotencyKey"),
    });

    return NextResponse.json(
      {
        ok: true,
        pledgeIntent,
        primaryFlow: pledgeIntent.primaryFlow,
        nextAction: "verify_identity",
        identityVerificationPath: `/api/mpgf/pledge-intents/${pledgeIntent.id}/verify-identity`,
        paymentAuthorizationPath: `/api/mpgf/pledge-intents/${pledgeIntent.id}/authorize-payment`,
        manualEvidenceFallbackPath: pledgeIntent.fallbackRule.manualEvidencePath,
        reviewRequiredBeforeCounting: true,
        finalPayoutAuthorized: false,
      },
      { status: 202, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not create MPGF pledge intent." },
      { status: 400, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }
}
