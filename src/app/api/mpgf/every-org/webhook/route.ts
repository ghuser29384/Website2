import { NextResponse } from "next/server";

import { MPGF_PUBLIC_GOODS_API_HEADERS } from "@/lib/mpgf/public-goods-api";
import {
  type MpgfEveryOrgPartnerWebhookPayload,
  recordMpgfEveryOrgPartnerWebhook,
} from "@/lib/mpgf/public-goods-every-org";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function configuredWebhookSecret() {
  return process.env.MPGF_EVERY_ORG_WEBHOOK_SHARED_SECRET?.trim() || undefined;
}

function requestWebhookSecret(request: Request) {
  return (
    request.headers.get("mpgf-every-org-webhook-secret") ??
    request.headers.get("x-mpgf-every-org-webhook-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    ""
  ).trim();
}

function webhookVerified(request: Request) {
  const expected = configuredWebhookSecret();

  if (!expected) {
    return true;
  }

  return requestWebhookSecret(request) === expected;
}

export async function POST(request: Request) {
  const expectedSecret = configuredWebhookSecret();

  if (expectedSecret && !webhookVerified(request)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized MPGF Every.org partner webhook request." },
      { status: 401, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }

  try {
    const payload = await request.json();

    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Every.org partner webhook expects a JSON object.");
    }

    const partnerWebhookEvent = recordMpgfEveryOrgPartnerWebhook(
      payload as MpgfEveryOrgPartnerWebhookPayload,
      {
        webhookVerified: webhookVerified(request),
      },
    );

    return NextResponse.json(
      {
        ok: true,
        partnerWebhookEvent,
        dedupeBy: partnerWebhookEvent.dedupeBy,
        dedupeKey: partnerWebhookEvent.dedupeKey,
        autoCreatesContributionEvidence: partnerWebhookEvent.autoCreatesContributionEvidence,
        reviewRequiredBeforeCounting: true,
        finalPayoutAuthorized: false,
      },
      { headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not import Every.org partner webhook." },
      { status: 400, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }
}
