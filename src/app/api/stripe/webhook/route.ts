import { NextResponse } from "next/server";
import type Stripe from "stripe";

import type { Database } from "@/lib/supabase/database.types";
import { createServiceClient } from "@/lib/supabase/server";
import { getStripe, getStripeWebhookSecret } from "@/lib/stripe";

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

      return {
        profile_id: profileId,
        recipient_email: recipientEmail,
        subject: status === "paid" ? "Moral Trade payment confirmed" : "Moral Trade payment failed",
        body:
          status === "paid"
            ? `Stripe confirmed a ${payment.currency.toUpperCase()} payment for agreement ${payment.agreement_id}.`
            : `Stripe reported that payment ${payment.id} failed. Sign in to review the agreement.`,
        status: recipientEmail ? "queued" : "suppressed",
      } satisfies EmailOutboxInsert;
    })
    .filter((row) => row.recipient_email || row.status === "suppressed");

  if (outboxRows.length) {
    await supabase.from("email_outbox").insert(outboxRows);
  }
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const webhookSecret = getStripeWebhookSecret();
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  let event: Stripe.Event;

  try {
    event =
      webhookSecret && signature
        ? stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
        : JSON.parse(rawBody);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid Stripe webhook.";
    return NextResponse.json({ error: message }, { status: 400 });
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
