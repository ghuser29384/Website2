import { NextResponse } from "next/server";

import { getViewer } from "@/lib/app-data";
import {
  authorizeMpgfPublicGoodsPledgeIntentPayment,
  createMpgfPublicGoodsPledgeIntent,
} from "@/lib/mpgf/public-goods-contribution-intents";
import {
  hasMpgfContributionPersistence,
  loadMpgfPledgeIntentForProfile,
  mpgfContributionPersistenceUnavailable,
  persistMpgfPaymentAuthorizationState,
} from "@/lib/mpgf/public-goods-contribution-persistence";
import { MPGF_PUBLIC_GOODS_API_HEADERS } from "@/lib/mpgf/public-goods-api";
import { demoMpgfAssuranceRound, demoMpgfPublicGoodsCampaigns } from "@/lib/mpgf/data";
import { hasSupabaseEnv } from "@/lib/supabase/config";

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

export async function POST(request: Request, { params }: { params: Promise<{ intentId: string }> }) {
  const viewer = await getViewer();

  if (!viewer) {
    return NextResponse.json({ ok: false, error: "Sign in to authorize an MPGF pledge intent payment." }, { status: 401 });
  }

  try {
    const { intentId } = await params;
    const payload = await request.json().catch(() => ({}));
    const record = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};

    if (hasSupabaseEnv() && !hasMpgfContributionPersistence()) {
      return NextResponse.json(
        { ok: false, error: mpgfContributionPersistenceUnavailable().warning },
        { status: 503, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
      );
    }

    const fallbackPledgeIntent = createMpgfPublicGoodsPledgeIntent({
      roundId: stringField(record, "roundId", demoMpgfAssuranceRound.id),
      campaignId: stringField(record, "campaignId", demoMpgfPublicGoodsCampaigns[0]?.id ?? ""),
      userId: viewer.authUser.id,
      amountCents: centsField(record),
      idempotencyKey: stringField(record, "idempotencyKey", intentId),
    });
    const pledgeIntent = hasMpgfContributionPersistence()
      ? await loadMpgfPledgeIntentForProfile(intentId, viewer.authUser.id)
      : {
          ...fallbackPledgeIntent,
          id: intentId,
          paymentState:
            record.identityVerified === true || record.identityVerificationStatus === "verified"
              ? "identity_verified" as const
              : "identity_pending_review" as const,
          countingState:
            record.identityVerified === true || record.identityVerificationStatus === "verified"
              ? "eligible_pending_thresholds" as const
              : "not_counted" as const,
        };
    const campaign = demoMpgfPublicGoodsCampaigns.find((candidate) => candidate.id === pledgeIntent.campaignId);
    const result = authorizeMpgfPublicGoodsPledgeIntentPayment(
      pledgeIntent,
      {
        campaign,
        providerPaymentRef: stringField(record, "providerPaymentRef", stringField(record, "paymentIntentRef")),
        providerAvailable: record.providerAvailable !== false,
      },
    );
    const persistence = await persistMpgfPaymentAuthorizationState({
      paymentAuthorization: result.paymentAuthorization,
      pledgeIntent: result.pledgeIntent,
    });

    return NextResponse.json(
      {
        ok: true,
        ...result,
        pledgeIntentSource: hasMpgfContributionPersistence() ? "persisted_row" : "request_fallback",
        persistence,
        providerWebhookPath: "/api/mpgf/provider-events/webhook",
        manualEvidenceFallbackPath: result.paymentAuthorization.manualEvidencePath ?? "/api/mpgf/evidence/manual",
        reviewRequiredBeforeCounting: true,
        finalPayoutAuthorized: false,
      },
      { status: result.paymentAuthorization.status === "authorized" ? 200 : 202, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not authorize MPGF pledge intent payment." },
      { status: 400, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }
}
