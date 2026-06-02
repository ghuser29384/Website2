import { NextResponse } from "next/server";
import { createHash } from "node:crypto";

import { MPGF_PUBLIC_GOODS_API_HEADERS } from "@/lib/mpgf/public-goods-api";
import {
  buildMpgfStripeConditionalPaymentIntentPlan,
  type MpgfStripeConditionalPaymentIntentPlan,
} from "@/lib/mpgf/public-goods-stripe-commitments";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database, Json } from "@/lib/supabase/database.types";
import { createServiceClient } from "@/lib/supabase/server";
import { getStripe, hasStripeEnv } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SupabaseServiceAny = ReturnType<typeof createServiceClient> & {
  from: (table: string) => any;
};
type MpgfStripeConditionalPaymentIntentRunInsert =
  Database["public"]["Tables"]["mpgf_stripe_conditional_payment_intent_runs"]["Insert"];

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

function hasServiceRoleEnv() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function workerSecretFromRequest(request: Request) {
  return (
    request.headers.get("mpgf-stripe-conditional-worker-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    ""
  ).trim();
}

function conditionalPaymentIntentRunIdFor(plan: MpgfStripeConditionalPaymentIntentPlan) {
  return `stripe-conditional-payment-intent-run-${plan.idempotencyKeyHash.slice(7, 19)}`;
}

function toConditionalPaymentIntentRunRow(
  plan: MpgfStripeConditionalPaymentIntentPlan,
): MpgfStripeConditionalPaymentIntentRunInsert {
  return {
    id: conditionalPaymentIntentRunIdFor(plan),
    round_id: plan.roundId,
    campaign_id: plan.campaignId,
    conditional_pledge_id: plan.conditionalPledgeId,
    pledge_intent_id: plan.pledgeIntentId,
    provider_customer_id_hash: plan.providerCustomerIdHash,
    provider_payment_method_id_hash: plan.providerPaymentMethodIdHash,
    provider_setup_intent_id_hash: plan.providerSetupIntentIdHash,
    amount_cents: plan.amountCents,
    currency: plan.currency,
    gate_state: plan.gateState as unknown as Json,
    blocked_by: plan.blockedBy,
    payment_intent_creation_allowed: plan.paymentIntentCreationAllowed,
    setup_intent_first: true,
    confirm_off_session: true,
    capture_method: plan.captureMethod,
    long_lived_manual_card_hold: false,
    requires_stripe_signature_webhook_before_counting: true,
    review_required_before_counting: true,
    final_payout_authorized: false,
    idempotency_key_hash: plan.idempotencyKeyHash,
    calc_hash: plan.calcHash,
  };
}

async function persistMpgfStripeConditionalPaymentIntentRun(
  plan: MpgfStripeConditionalPaymentIntentPlan,
) {
  if (!hasSupabaseEnv() || !hasServiceRoleEnv()) {
    return {
      ok: false,
      status: "not_configured" as const,
      warning:
        "Supabase service-role persistence is required before an MPGF Stripe conditional PaymentIntent worker run can continue.",
    };
  }

  const supabase = createServiceClient() as SupabaseServiceAny;
  const row = toConditionalPaymentIntentRunRow(plan);
  const write = await supabase
    .from("mpgf_stripe_conditional_payment_intent_runs")
    .upsert(row, { onConflict: "idempotency_key_hash" });

  if (write.error) {
    return {
      ok: false,
      status: "failed" as const,
      warning: write.error.message,
    };
  }

  return {
    ok: true,
    status: "persisted" as const,
    runId: row.id,
  };
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
    const persistence = await persistMpgfStripeConditionalPaymentIntentRun(plan);

    if (!persistence.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: persistence.warning,
          plan,
          paymentIntentCreated: false,
          reviewRequiredBeforeCounting: true,
          finalPayoutAuthorized: false,
          persistence,
        },
        { status: persistence.status === "not_configured" ? 503 : 500, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
      );
    }

    if (!plan.paymentIntentCreationAllowed) {
      return NextResponse.json(
        {
          ok: true,
          plan,
          paymentIntentCreated: false,
          reviewRequiredBeforeCounting: true,
          finalPayoutAuthorized: false,
          persistence,
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
          persistence,
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
        persistence,
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
