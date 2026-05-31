import { NextResponse } from "next/server";

import { getViewer } from "@/lib/app-data";
import {
  createMpgfPublicGoodsPledgeIntent,
  verifyMpgfPublicGoodsPledgeIntentIdentity,
} from "@/lib/mpgf/public-goods-contribution-intents";
import { MPGF_PUBLIC_GOODS_API_HEADERS } from "@/lib/mpgf/public-goods-api";
import { demoMpgfAssuranceRound, demoMpgfPublicGoodsCampaigns } from "@/lib/mpgf/data";
import type { MpgfPublicGoodsIdentityAttestation } from "@/lib/mpgf/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function stringField(record: Record<string, unknown>, key: string, fallback = "") {
  const value = record[key];

  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function centsField(record: Record<string, unknown>) {
  const cents = Number(record.amountCents);

  return Number.isInteger(cents) && cents > 0 ? cents : 100;
}

function provider(value: unknown): MpgfPublicGoodsIdentityAttestation["provider"] {
  return value === "demo_self_attestation" || value === "external_proof_of_personhood"
    ? value
    : "repository_profile";
}

export async function POST(request: Request, { params }: { params: Promise<{ intentId: string }> }) {
  const viewer = await getViewer();

  if (!viewer) {
    return NextResponse.json({ ok: false, error: "Sign in to verify an MPGF pledge intent identity." }, { status: 401 });
  }

  try {
    const { intentId } = await params;
    const payload = await request.json().catch(() => ({}));
    const record = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
    const pledgeIntent = createMpgfPublicGoodsPledgeIntent({
      roundId: stringField(record, "roundId", demoMpgfAssuranceRound.id),
      campaignId: stringField(record, "campaignId", demoMpgfPublicGoodsCampaigns[0]?.id ?? ""),
      userId: viewer.authUser.id,
      amountCents: centsField(record),
      idempotencyKey: stringField(record, "idempotencyKey", intentId),
    });
    const result = verifyMpgfPublicGoodsPledgeIntentIdentity(
      {
        ...pledgeIntent,
        id: intentId,
      },
      {
        userId: viewer.authUser.id,
        provider: provider(record.provider),
        humanScoreBps: Number(record.humanScoreBps),
        providerPayload: typeof record.providerPayload === "object" && record.providerPayload
          ? record.providerPayload as Record<string, unknown>
          : undefined,
      },
    );

    return NextResponse.json(
      {
        ok: true,
        ...result,
        reviewRequiredBeforeCounting: true,
        finalPayoutAuthorized: false,
      },
      { status: result.nextAction === "authorize_payment" ? 200 : 202, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not verify MPGF pledge intent identity." },
      { status: 400, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }
}
