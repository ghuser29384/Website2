import { NextResponse } from "next/server";
import type Stripe from "stripe";

import type { Database } from "@/lib/supabase/database.types";
import { isAgreementPaymentCapturePermitted } from "@/lib/agreement-payment-authorization";
import { handleMpgfStripeWebhookEvent, hashStripeWebhookBody } from "@/lib/mpgf/real-money";
import { buildMoralTradeSafeEmailCopy } from "@/lib/moral-trade/email-copy";
import { handleConditionalStripeWebhookEvent } from "@/lib/payments/conditional-webhook";
import { handleTradeDonationPoolStripeWebhookEvent } from "@/lib/payments/trade-donation-pool-webhook";
import { createServiceClient } from "@/lib/supabase/server";
import { getStripe, getStripeWebhookSecret, hasStripeEnv } from "@/lib/stripe";

export const runtime = "nodejs";

type EmailOutboxInsert = Database["public"]["Tables"]["email_outbox"]["Insert"];

async function markPaymentFromSession(
  session: Stripe.Checkout.Session,
  status: "paid" | "failed",
) {
  const paymentId = session.metadata?.agreement_payment_id;

  if (!paymentId) {
    return;
  }

  const supabase = createServiceClient();
  const paymentIntent =
    typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;

  const { data: currentPayment } = await supabase
    .from("agreement_payments")
    .select("*")
    .eq("id", paymentId)
    .maybeSingle();

  if (!currentPayment) {
    return;
  }

  if (
    status === "paid" &&
    !isAgreementPaymentCapturePermitted({
      authorizationMode: currentPayment.authorization_mode,
      authorizationStatus: currentPayment.authorization_status,
      capturePolicy: currentPayment.capture_policy,
    })
  ) {
    await supabase
      .from("agreement_payments")
      .update({
        authorization_status: "capture_blocked",
        authorization_gate_snapshot: [
          currentPayment.authorization_gate_snapshot,
          `stripe_checkout_session:${session.id}:capture_blocked`,
        ]
          .filter(Boolean)
          .join(";"),
      })
      .eq("id", paymentId);
    await supabase.from("agreement_events").insert({
      agreement_id: currentPayment.agreement_id,
      actor_id: currentPayment.payer_id,
      event_type: "payment_update",
      summary: "Stripe checkout completion was blocked by the payment authorization stub.",
      details: session.id,
    });
    return;
  }

  const { data: payment } = await supabase
    .from("agreement_payments")
    .update({
      status,
      stripe_payment_intent_id: paymentIntent,
      paid_at: status === "paid" ? new Date().toISOString() : null,
    })
    .eq("id", paymentId)
    .select("*")
    .maybeSingle();

  if (!payment) {
    return;
  }

  await supabase.from("agreement_events").insert({
    agreement_id: payment.agreement_id,
    actor_id: payment.payer_id,
    event_type: "payment_update",
    summary:
      status === "paid"
        ? `Stripe confirmed payment of ${(payment.amount_cents / 100).toFixed(2)} ${payment.currency.toUpperCase()}.`
        : "Stripe reported that the payment failed.",
    details: session.id,
  });

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email")
    .in("id", [payment.payer_id, payment.payee_id]);
  const profileEmails = new Map((profiles ?? []).map((profile) => [profile.id, profile.email]));
  const outboxRows: EmailOutboxInsert[] = [payment.payer_id, payment.payee_id]
    .map((profileId) => {
      const recipientEmail = profileEmails.get(profileId) ?? "";
      const emailCopy = buildMoralTradeSafeEmailCopy(
        status === "paid" ? "payment_confirmed" : "payment_failed",
      );

      return {
        profile_id: profileId,
        recipient_email: recipientEmail,
        subject: emailCopy.subject,
        body: emailCopy.body,
        status: recipientEmail ? "queued" : "suppressed",
      } satisfies EmailOutboxInsert;
    })
    .filter((row) => row.recipient_email || row.status === "suppressed");

  if (outboxRows.length) {
    await supabase.from("email_outbox").insert(outboxRows);
  }
}

function hasMpgfMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") {
    return false;
  }

  const record = metadata as Record<string, unknown>;

  return (
    record.purpose === "mpgf_contribution" ||
    typeof record.mpgf_payment_intent_id === "string" ||
    typeof record.mpgf_recurring_commitment_id === "string"
  );
}

function isPotentialMpgfStripeEvent(event: Stripe.Event) {
  const object = event.data.object as Record<string, any>;

  if (hasMpgfMetadata(object.metadata) || hasMpgfMetadata(object.subscription_details?.metadata)) {
    return true;
  }

  if (event.type === "invoice.paid") {
    return Boolean(object.subscription);
  }

  if (event.type === "customer.subscription.deleted" || event.type === "customer.subscription.updated") {
    return Boolean(object.id);
  }

  if (event.type === "charge.refunded") {
    return Boolean(object.payment_intent);
  }

  return false;
}

export async function POST(request: Request) {
  const webhookSecret = getStripeWebhookSecret();

  if (!hasStripeEnv() || !webhookSecret) {
    return NextResponse.json(
      { error: "Stripe webhook processing is disabled until the required Stripe environment variables are configured." },
      { status: 503 },
    );
  }

  const stripe = getStripe();
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");
  const rawBodyHash = hashStripeWebhookBody(rawBody);

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe-Signature header." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid Stripe webhook.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const pooledSettlementResult = await handleTradeDonationPoolStripeWebhookEvent({
    event,
    rawBodyHash,
    signatureVerified: true,
  });
  if (pooledSettlementResult.handled) {
    return NextResponse.json({
      received: true,
      pooledSettlement: pooledSettlementResult.status,
      duplicate: pooledSettlementResult.duplicate,
    });
  }

  const conditionalResult = await handleConditionalStripeWebhookEvent({
    event,
    rawBodyHash,
    signatureVerified: true,
  });
  if (conditionalResult.handled) {
    return NextResponse.json({
      received: true,
      conditionalPayments: conditionalResult.status,
      duplicate: conditionalResult.duplicate,
    });
  }

  if (isPotentialMpgfStripeEvent(event)) {
    const mpgfResult = await handleMpgfStripeWebhookEvent({
      event,
      rawBodyHash,
      signatureVerified: true,
    });

    if (mpgfResult.handled) {
      return NextResponse.json({ received: true, mpgf: mpgfResult.status });
    }
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    await markPaymentFromSession(event.data.object as Stripe.Checkout.Session, "paid");
  }

  if (event.type === "checkout.session.async_payment_failed") {
    await markPaymentFromSession(event.data.object as Stripe.Checkout.Session, "failed");
  }

  return NextResponse.json({ received: true });
}
