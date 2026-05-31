import { NextResponse } from "next/server";

import {
  type MpgfPublicGoodsProviderPaymentEventType,
  recordMpgfPublicGoodsProviderPaymentEvent,
} from "@/lib/mpgf/public-goods-contribution-intents";
import { MPGF_PUBLIC_GOODS_API_HEADERS } from "@/lib/mpgf/public-goods-api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const eventTypes: readonly MpgfPublicGoodsProviderPaymentEventType[] = [
  "authorization_created",
  "authorization_failed",
  "capture_succeeded",
  "capture_failed",
  "refund_succeeded",
  "payment_expired",
];

function stringField(record: Record<string, unknown>, key: string, fallback = "") {
  const value = record[key];

  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function eventType(value: unknown): MpgfPublicGoodsProviderPaymentEventType {
  return eventTypes.includes(value as MpgfPublicGoodsProviderPaymentEventType)
    ? value as MpgfPublicGoodsProviderPaymentEventType
    : "authorization_created";
}

export async function POST(request: Request) {
  const signature = request.headers.get("mpgf-provider-signature");

  if (!signature) {
    return NextResponse.json(
      { ok: false, error: "Missing MPGF provider event signature." },
      { status: 400, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }

  try {
    const payload = await request.json();

    if (!payload || typeof payload !== "object") {
      throw new Error("MPGF provider payment events expect a JSON object.");
    }

    const record = payload as Record<string, unknown>;
    const amountCents = Number(record.amountCents);
    const provider = stringField(record, "provider", "stripe") === "fiscal_host" ? "fiscal_host" : "stripe";
    const event = recordMpgfPublicGoodsProviderPaymentEvent(
      {
        id: stringField(record, "paymentAuthorizationId", "payment-authorization-unresolved"),
        pledgeIntentId: stringField(record, "pledgeIntentId", "pledge-intent-unresolved"),
        provider,
        providerRefHash: stringField(record, "providerRefHash") || undefined,
        amountCents: Number.isInteger(amountCents) && amountCents > 0 ? amountCents : 0,
        status: "authorized",
        capturePolicy: "capture_only_after_threshold_review_and_challenge_window",
        authorizationMode: "provider_managed_conditional_authorization",
        requiresProviderWebhook: true,
        reviewRequiredBeforeCounting: true,
        finalPayoutAuthorized: false,
        calcHash: stringField(
          record,
          "paymentAuthorizationHash",
          "sha256:0000000000000000000000000000000000000000000000000000000000000000",
        ),
      },
      {
        providerEventRef: stringField(record, "providerEventRef", stringField(record, "eventId")),
        eventType: eventType(record.eventType),
        amountCents: Number.isInteger(amountCents) && amountCents > 0 ? amountCents : undefined,
        signatureVerified: Boolean(signature),
      },
    );

    return NextResponse.json(
      {
        ok: true,
        providerPaymentEvent: event,
        reviewRequiredBeforeCounting: true,
        finalPayoutAuthorized: false,
      },
      { headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not record MPGF provider payment event." },
      { status: 400, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }
}
