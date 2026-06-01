import { NextResponse } from "next/server";
import { createHash } from "node:crypto";

import { MPGF_PUBLIC_GOODS_API_HEADERS } from "@/lib/mpgf/public-goods-api";
import { buildMpgfStripeConditionalPaymentIntentPlan } from "@/lib/mpgf/public-goods-stripe-commitments";
import { getStripe, hasStripeEnv } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function stringField(record: Record<string, unknown>, key: string, fallback = "") {
  const value = record[key];

  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function centsField(record: Record<string, unknown>) {
  const cents = Number(record.amountCents);

  return Number.isInteger(cents) && cents > 0 ? cents : 0;
}

function booleanField(record: Record<string, unknown>, key: string) {
  return record[key] === true;
}

function hashProviderRef(scope: string, value: string) {
  return `sha256:${createHash("sha256").update(`mpgf-stripe-provider-ref:${scope}:${value}`).digest("hex")}`;
}

function workerSecretConfigured() {
  return process.env.MPGF_STRIPE_CONDITIONAL_WORKER_SECRET?.trim() || "";
}

function workerSecretFromRequest(request: Request) {
  return (
    request.headers.get("mpgf-stripe-conditional-worker-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    ""
  ).trim();
}

export async function POST(request: Request) {
  const expectedSecret = workerSecretConfigured();

  if (!expectedSecret) {
    return NextResponse.json(
      { ok: false, error: "MPGF Stripe conditional PaymentIntent worker secret is not configured." },
      { status: 503, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }

  if (workerSecretFromRequest(request) !== expectedSecret) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized MPGF Stripe conditional PaymentIntent worker request." },
      { status: 401, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }

  try {
    const payload = await request.json().catch(() => ({}));
    const record = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
    const plan = buildMpgfStripeConditionalPaymentIntentPlan({
      amountCents: centsField(record),
      campaignId: stringField(record, "campaignId"),
      conditionalPledgeId: stringField(record, "conditionalPledgeId"),
      gateState: {
        roundParametersLocked: booleanField(record, "roundParametersLocked"),
        thresholdAmountCleared: booleanField(record, "thresholdAmountCleared"),
        supporterCountCleared: booleanField(record, "supporterCountCleared"),
        reviewApproved: booleanField(record, "reviewApproved"),
        challengeWindowClosed: booleanField(record, "challengeWindowClosed"),
      },
      pledgeIntentId: stringField(record, "pledgeIntentId"),
      providerCustomerRef: stringField(record, "providerCustomerRef"),
      providerPaymentMethodRef: stringField(record, "providerPaymentMethodRef"),
      providerSetupIntentRef: stringField(record, "providerSetupIntentRef"),
      roundId: stringField(record, "roundId") || undefined,
    });

    if (!plan.paymentIntentCreationAllowed) {
      return NextResponse.json(
        {
          ok: true,
          plan,
          paymentIntentCreated: false,
          reviewRequiredBeforeCounting: true,
          finalPayoutAuthorized: false,
        },
        { status: 202, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
      );
    }

    if (!hasStripeEnv()) {
      return NextResponse.json(
        {
          ok: false,
          error: "Stripe is not configured for MPGF conditional PaymentIntent creation.",
          plan,
          paymentIntentCreated: false,
          finalPayoutAuthorized: false,
        },
        { status: 503, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
      );
    }

    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: plan.amountCents,
        currency: plan.currency,
        customer: stringField(record, "providerCustomerRef"),
        payment_method: stringField(record, "providerPaymentMethodRef"),
        confirm: true,
        off_session: true,
        metadata: { ...plan.metadata },
      },
      {
        idempotencyKey: plan.idempotencyKeyHash,
      },
    );

    return NextResponse.json(
      {
        ok: true,
        plan,
        paymentIntentCreated: true,
        providerPaymentIntentIdHash: paymentIntent.id ? hashProviderRef("payment-intent", paymentIntent.id) : undefined,
        stripeWebhookPath: "/api/mpgf/providers/stripe/webhook",
        requiresStripeSignatureWebhookBeforeCounting: true,
        reviewRequiredBeforeCounting: true,
        finalPayoutAuthorized: false,
      },
      { status: 201, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not create conditional MPGF PaymentIntent." },
      { status: 400, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }
}
