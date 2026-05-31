import { NextResponse } from "next/server";

import { getStripe, getStripeWebhookSecret } from "@/lib/stripe";
import { handleMpgfStripeWebhookEvent, hashStripeWebhookBody } from "@/lib/mpgf/real-money";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const webhookSecret = getStripeWebhookSecret();

  if (!webhookSecret) {
    return NextResponse.json({ ok: false, error: "MPGF Stripe webhook is not configured." }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ ok: false, error: "Missing Stripe webhook signature." }, { status: 400 });
  }

  try {
    const event = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
    const result = await handleMpgfStripeWebhookEvent({
      event,
      rawBodyHash: hashStripeWebhookBody(rawBody),
      signatureVerified: true,
    });

    return NextResponse.json({
      ok: true,
      ...result,
      webhookCanAuthorizeFinalPayout: false,
      finalPayoutAuthorized: false,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not process MPGF Stripe webhook." },
      { status: 400 },
    );
  }
}
