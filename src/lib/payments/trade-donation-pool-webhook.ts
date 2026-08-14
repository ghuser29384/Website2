import type Stripe from "stripe";

import { createServiceClient } from "@/lib/supabase/server";
import { hashStripeProviderObjectId } from "@/lib/trade-donation-pool";

interface PoolWebhookResult {
  handled: boolean;
  status: string;
  duplicate: boolean;
}

function objectMetadata(object: unknown) {
  if (!object || typeof object !== "object") return {} as Record<string, string>;
  const metadata = (object as { metadata?: unknown }).metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {} as Record<string, string>;
  }
  return metadata as Record<string, string>;
}

function pooledObligationId(object: unknown) {
  const metadata = objectMetadata(object);
  return metadata.purpose === "trade_donation_pool_contribution"
    ? String(metadata.pooled_obligation_id ?? "")
    : "";
}

function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

async function obligationIdFromPaymentIntent(paymentIntentId: string) {
  if (!paymentIntentId) return "";
  const supabase = createServiceClient() as any;
  const { data } = await supabase
    .from("trade_donation_pool_obligations")
    .select("id")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();
  return String(data?.id ?? "");
}

async function passSignedWebhookGate(livemode: boolean) {
  const supabase = createServiceClient() as any;
  await supabase
    .from("trade_donation_pool_gate_status")
    .update({
      status: "passed",
      notes: `A signed ${livemode ? "live" : "test"} Stripe webhook was processed by the pooled-settlement handler.`,
      approved_at: new Date().toISOString(),
    })
    .eq("environment", livemode ? "live" : "test")
    .eq("gate_key", "stripe_signed_webhook");
}

function paymentIntentIdFromSession(session: Stripe.Checkout.Session) {
  return typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id ?? "";
}

async function recordSuccess(input: {
  event: Stripe.Event;
  session: Stripe.Checkout.Session;
  rawBodyHash: string;
  signatureVerified: boolean;
}) {
  const metadata = objectMetadata(input.session);
  const obligationId = pooledObligationId(input.session);
  if (!validUuid(obligationId)) return { status: "invalid_metadata", duplicate: false };
  const paymentIntentId = paymentIntentIdFromSession(input.session);
  if (!paymentIntentId) return { status: "payment_intent_missing", duplicate: false };
  const amountCents = Number(input.session.amount_total ?? -1);
  const currency = String(input.session.currency ?? "").toUpperCase();
  const conditionHash = String(metadata.condition_hash ?? "");
  const chargeIdHash = hashStripeProviderObjectId("payment_intent", paymentIntentId);
  const supabase = createServiceClient() as any;
  const { data, error } = await supabase.rpc("record_trade_donation_pool_stripe_success", {
    p_stripe_event_id: input.event.id,
    p_event_type: input.event.type,
    p_livemode: input.event.livemode,
    p_payload_hash: input.rawBodyHash,
    p_signature_verified: input.signatureVerified,
    p_obligation_id: obligationId,
    p_checkout_session_id: input.session.id,
    p_payment_intent_id: paymentIntentId,
    p_charge_id_hash: chargeIdHash,
    p_amount_cents: amountCents,
    p_currency: currency,
    p_condition_hash: conditionHash,
  });
  if (error) throw new Error(error.message);
  const result = Array.isArray(data) ? data[0] : data;
  const status = String(result?.status ?? "processed");
  if (["funded", "bundled", "already_funded"].includes(status)) {
    await passSignedWebhookGate(input.event.livemode);
  }
  return {
    status,
    duplicate: status === "duplicate",
  };
}

async function recordFailure(input: {
  event: Stripe.Event;
  object: unknown;
  rawBodyHash: string;
  signatureVerified: boolean;
  code: string;
  message: string;
}) {
  const obligationId = pooledObligationId(input.object);
  if (!validUuid(obligationId)) return { status: "invalid_metadata", duplicate: false };
  const supabase = createServiceClient() as any;
  const { data, error } = await supabase.rpc("record_trade_donation_pool_stripe_failure", {
    p_stripe_event_id: input.event.id,
    p_event_type: input.event.type,
    p_livemode: input.event.livemode,
    p_payload_hash: input.rawBodyHash,
    p_signature_verified: input.signatureVerified,
    p_obligation_id: obligationId,
    p_failure_code: input.code,
    p_failure_message: input.message,
  });
  if (error) throw new Error(error.message);
  const result = Array.isArray(data) ? data[0] : data;
  const status = String(result?.status ?? "processed");
  if (["checkout_abandoned", "payment_failed"].includes(status)) {
    await passSignedWebhookGate(input.event.livemode);
  }
  return {
    status,
    duplicate: status === "duplicate",
  };
}

async function recordRefundOrDispute(input: {
  event: Stripe.Event;
  paymentIntentId: string;
  amountCents: number;
  rawBodyHash: string;
  signatureVerified: boolean;
  isDispute: boolean;
  message: string;
}) {
  const obligationId = await obligationIdFromPaymentIntent(input.paymentIntentId);
  if (!validUuid(obligationId)) return { status: "unmatched_payment_intent", duplicate: false };
  const supabase = createServiceClient() as any;
  const { data, error } = await supabase.rpc("record_trade_donation_pool_refund_or_dispute", {
    p_stripe_event_id: input.event.id,
    p_event_type: input.event.type,
    p_livemode: input.event.livemode,
    p_payload_hash: input.rawBodyHash,
    p_signature_verified: input.signatureVerified,
    p_obligation_id: obligationId,
    p_is_dispute: input.isDispute,
    p_amount_cents: input.amountCents,
    p_failure_message: input.message,
  });
  if (error) throw new Error(error.message);
  const result = Array.isArray(data) ? data[0] : data;
  const status = String(result?.status ?? "processed");
  if (["refunded", "disputed", "needs_review"].includes(status)) {
    await passSignedWebhookGate(input.event.livemode);
  }
  return {
    status,
    duplicate: status === "duplicate",
  };
}

export async function handleTradeDonationPoolStripeWebhookEvent(input: {
  event: Stripe.Event;
  rawBodyHash: string;
  signatureVerified: boolean;
}): Promise<PoolWebhookResult> {
  const { event } = input;
  const object = event.data.object;
  const directObligationId = pooledObligationId(object);

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = object as Stripe.Checkout.Session;
    if (!directObligationId) return { handled: false, status: "not_pooled", duplicate: false };
    if (session.payment_status !== "paid") {
      return { handled: true, status: "awaiting_async_payment", duplicate: false };
    }
    const result = await recordSuccess({
      event,
      session,
      rawBodyHash: input.rawBodyHash,
      signatureVerified: input.signatureVerified,
    });
    return { handled: true, ...result };
  }

  if (event.type === "checkout.session.expired") {
    if (!directObligationId) return { handled: false, status: "not_pooled", duplicate: false };
    const result = await recordFailure({
      event,
      object,
      rawBodyHash: input.rawBodyHash,
      signatureVerified: input.signatureVerified,
      code: "checkout_abandoned",
      message: "The Stripe Checkout Session expired before funding was verified.",
    });
    return { handled: true, ...result };
  }

  if (event.type === "checkout.session.async_payment_failed") {
    if (!directObligationId) return { handled: false, status: "not_pooled", duplicate: false };
    const result = await recordFailure({
      event,
      object,
      rawBodyHash: input.rawBodyHash,
      signatureVerified: input.signatureVerified,
      code: "async_payment_failed",
      message: "Stripe reported that the asynchronous participant payment failed.",
    });
    return { handled: true, ...result };
  }

  if (event.type === "payment_intent.payment_failed") {
    const paymentIntent = object as Stripe.PaymentIntent;
    const obligationId = pooledObligationId(paymentIntent);
    if (!obligationId) return { handled: false, status: "not_pooled", duplicate: false };
    const result = await recordFailure({
      event,
      object,
      rawBodyHash: input.rawBodyHash,
      signatureVerified: input.signatureVerified,
      code: String(paymentIntent.last_payment_error?.code ?? "payment_failed"),
      message: String(
        paymentIntent.last_payment_error?.message ??
          "Stripe reported that the participant payment failed.",
      ),
    });
    return { handled: true, ...result };
  }

  if (event.type === "charge.refunded") {
    const charge = object as Record<string, any>;
    const paymentIntent = charge.payment_intent;
    const paymentIntentId =
      typeof paymentIntent === "string" ? paymentIntent : String(paymentIntent?.id ?? "");
    if (!paymentIntentId) return { handled: false, status: "not_pooled", duplicate: false };
    const obligationId = await obligationIdFromPaymentIntent(paymentIntentId);
    if (!obligationId) return { handled: false, status: "not_pooled", duplicate: false };
    const result = await recordRefundOrDispute({
      event,
      paymentIntentId,
      amountCents: Number(charge.amount_refunded ?? 0),
      rawBodyHash: input.rawBodyHash,
      signatureVerified: input.signatureVerified,
      isDispute: false,
      message: "Stripe confirmed a participant refund.",
    });
    return { handled: true, ...result };
  }

  if (event.type === "charge.dispute.created") {
    const dispute = object as Record<string, any>;
    const paymentIntent = dispute.payment_intent;
    const paymentIntentId =
      typeof paymentIntent === "string" ? paymentIntent : String(paymentIntent?.id ?? "");
    if (!paymentIntentId) return { handled: false, status: "not_pooled", duplicate: false };
    const obligationId = await obligationIdFromPaymentIntent(paymentIntentId);
    if (!obligationId) return { handled: false, status: "not_pooled", duplicate: false };
    const result = await recordRefundOrDispute({
      event,
      paymentIntentId,
      amountCents: Number(dispute.amount ?? 0),
      rawBodyHash: input.rawBodyHash,
      signatureVerified: input.signatureVerified,
      isDispute: true,
      message: `Stripe dispute opened: ${String(dispute.reason ?? "unknown")}.`,
    });
    return { handled: true, ...result };
  }

  return { handled: false, status: "not_pooled", duplicate: false };
}
