import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";

import {
  hasMpgfContributionPersistence,
  loadMpgfPaymentAuthorization,
  mpgfContributionPersistenceUnavailable,
  persistMpgfProviderPaymentEventState,
} from "@/lib/mpgf/public-goods-contribution-persistence";
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

function webhookSecret() {
  return process.env.MPGF_PROVIDER_WEBHOOK_SECRET?.trim() ?? "";
}

function normalizedSignature(signature: string) {
  return signature.trim().replace(/^sha256=/i, "");
}

function signatureMatches(rawPayload: string, signature: string, secret: string) {
  const expected = createHmac("sha256", secret).update(rawPayload).digest("hex");
  const provided = normalizedSignature(signature);

  if (!/^[0-9a-f]{64}$/i.test(provided)) {
    return false;
  }

  const expectedBuffer = Buffer.from(expected, "hex");
  const providedBuffer = Buffer.from(provided, "hex");

  return expectedBuffer.length === providedBuffer.length && timingSafeEqual(expectedBuffer, providedBuffer);
}

export async function POST(request: Request) {
  const signature = request.headers.get("mpgf-provider-signature");

  if (!signature) {
    return NextResponse.json(
      { ok: false, error: "Missing MPGF provider event signature." },
      { status: 400, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }

  if (!hasMpgfContributionPersistence()) {
    return NextResponse.json(
      { ok: false, error: mpgfContributionPersistenceUnavailable().warning },
      { status: 503, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }

  const secret = webhookSecret();

  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "MPGF provider event webhook secret is not configured." },
      { status: 503, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }

  try {
    const rawPayload = await request.text();

    if (!signatureMatches(rawPayload, signature, secret)) {
      return NextResponse.json(
        { ok: false, error: "Invalid MPGF provider event signature." },
        { status: 401, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
      );
    }

    const payload = JSON.parse(rawPayload);

    if (!payload || typeof payload !== "object") {
      throw new Error("MPGF provider payment events expect a JSON object.");
    }

    const record = payload as Record<string, unknown>;
    const amountCents = Number(record.amountCents);
    const paymentAuthorization = await loadMpgfPaymentAuthorization(
      stringField(record, "paymentAuthorizationId", "payment-authorization-unresolved"),
    );

    if (
      stringField(record, "pledgeIntentId") &&
      stringField(record, "pledgeIntentId") !== paymentAuthorization.pledge_intent_id
    ) {
      throw new Error("MPGF provider event pledge intent does not match the stored payment authorization.");
    }

    const event = recordMpgfPublicGoodsProviderPaymentEvent(
      {
        id: paymentAuthorization.id,
        pledgeIntentId: paymentAuthorization.pledge_intent_id,
        provider: paymentAuthorization.provider,
        providerRefHash: paymentAuthorization.provider_ref_hash ?? undefined,
        amountCents: Number.isInteger(amountCents) && amountCents > 0
          ? amountCents
          : Number(paymentAuthorization.amount_cents),
        status: paymentAuthorization.status,
        capturePolicy: "capture_only_after_threshold_review_and_challenge_window",
        authorizationMode: paymentAuthorization.provider === "manual_evidence"
          ? "manual_evidence_fallback_after_provider_unavailable"
          : "provider_managed_conditional_authorization",
        requiresProviderWebhook: paymentAuthorization.provider !== "manual_evidence",
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
        signatureVerified: true,
        receivedAt: new Date().toISOString(),
      },
    );
    const persistence = await persistMpgfProviderPaymentEventState({
      paymentAuthorization,
      providerPaymentEvent: event,
      rawPayload,
    });

    return NextResponse.json(
      {
        ok: true,
        providerPaymentEvent: event,
        persistence,
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
