import type Stripe from "stripe";

import { getStripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";
import {
  markConditionalMandateReadyFromSetupIntent,
  markConditionalMandateSetupFailed,
} from "@/lib/payments/conditional-mandates";
import {
  attemptDonationOffsetSettlement,
  reconcileConditionalDispute,
  reconcileConditionalPaymentIntent,
  reconcileConditionalRefund,
} from "@/lib/payments/donation-offset-settlement";

function getDb() {
  return createServiceClient() as any;
}

function objectId(object: unknown) {
  if (object && typeof object === "object" && "id" in object) {
    return String((object as { id?: unknown }).id ?? "") || null;
  }
  return null;
}

function objectMetadata(object: unknown) {
  if (object && typeof object === "object" && "metadata" in object) {
    const metadata = (object as { metadata?: unknown }).metadata;
    return metadata && typeof metadata === "object"
      ? (metadata as Record<string, string>)
      : null;
  }
  return null;
}

function isConditionalMetadata(metadata: Record<string, string> | null) {
  return metadata?.system === "conditional_payments";
}

async function beginWebhookEvent(input: {
  event: Stripe.Event;
  rawBodyHash: string;
  signatureVerified: boolean;
}) {
  const { event, rawBodyHash, signatureVerified } = input;
  const supabase = getDb();
  const { error } = await supabase.from("conditional_payment_webhook_events").insert({
    stripe_event_id: event.id,
    event_type: event.type,
    object_id: objectId(event.data.object),
    livemode: event.livemode,
    signature_verified: signatureVerified,
    payload_sha256: rawBodyHash,
    status: "processing",
  });

  if (!error) {
    return { duplicate: false };
  }
  if (error.code === "23505") {
    const { data: existing } = await supabase
      .from("conditional_payment_webhook_events")
      .select("status")
      .eq("stripe_event_id", event.id)
      .maybeSingle();
    return { duplicate: true, status: existing?.status ?? "processed" };
  }
  throw new Error(`Unable to record the Stripe webhook event: ${error.message}`);
}

async function finishWebhookEvent(
  eventId: string,
  status: "processed" | "ignored" | "failed",
  errorMessage?: string,
) {
  const { error } = await getDb()
    .from("conditional_payment_webhook_events")
    .update({
      status,
      error_message: errorMessage ?? null,
      processed_at: new Date().toISOString(),
    })
    .eq("stripe_event_id", eventId);
  if (error) {
    throw new Error(`Unable to finalize the Stripe webhook ledger: ${error.message}`);
  }
}

async function markSignedWebhookGatePassed(livemode: boolean) {
  const environment = livemode ? "live" : "test";
  await getDb()
    .from("conditional_payment_gate_status")
    .upsert(
      {
        environment,
        gate_key: "webhook_signature",
        status: "passed",
        notes: `A signed ${environment} Stripe webhook was processed successfully.`,
        reviewed_at: new Date().toISOString(),
      },
      { onConflict: "environment,gate_key" },
    );
}

async function reconcileChargeRefunded(charge: Stripe.Charge) {
  const paymentIntentId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id ?? null;
  if (!paymentIntentId) {
    return { handled: false as const };
  }

  const supabase = getDb();
  const { data: attempt } = await supabase
    .from("conditional_payment_attempts")
    .select("*")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();
  if (!attempt) {
    return { handled: false as const };
  }

  await supabase
    .from("conditional_payment_attempts")
    .update({
      status: charge.refunded ? "refunded" : attempt.status,
      refunded_amount_cents: Number(charge.amount_refunded ?? 0),
    })
    .eq("id", attempt.id);
  if (charge.refunded) {
    await supabase
      .from("conditional_payment_mandates")
      .update({ status: "refunded" })
      .eq("id", attempt.mandate_id)
      .neq("status", "disputed");
  }
  return { handled: true as const };
}

async function reconcileTransfer(transfer: Stripe.Transfer, eventType: string) {
  const metadata = transfer.metadata ?? {};
  if (!isConditionalMetadata(metadata)) {
    return { handled: false as const };
  }

  const settlementTransferId = metadata.settlement_transfer_id;
  if (!settlementTransferId) {
    return { handled: true as const };
  }

  const update: Record<string, unknown> = {
    stripe_transfer_id: transfer.id,
  };
  if (eventType === "transfer.reversed" || transfer.reversed) {
    update.status = "reversed";
  } else if (eventType === "transfer.failed") {
    update.status = "failed";
    update.failure_code = "stripe_transfer_failed";
  } else {
    update.status = "transferred";
  }

  await getDb()
    .from("conditional_settlement_transfers")
    .update(update)
    .eq("id", settlementTransferId);
  return { handled: true as const };
}

async function reconcileDestinationAccount(account: Stripe.Account) {
  const supabase = getDb();
  const { data: destination } = await supabase
    .from("conditional_payment_destinations")
    .select("*")
    .eq("stripe_connected_account_id", account.id)
    .eq("livemode", account.livemode)
    .maybeSingle();
  if (!destination) {
    return { handled: false as const };
  }

  const capabilities = account.capabilities ?? {};
  const ready = account.charges_enabled === true && account.payouts_enabled === true;
  await supabase
    .from("conditional_payment_destinations")
    .update({
      status: ready ? "active" : "pending",
      capabilities_snapshot: {
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        capabilities,
        requirements: account.requirements
          ? {
              currentlyDue: account.requirements.currently_due,
              eventuallyDue: account.requirements.eventually_due,
              disabledReason: account.requirements.disabled_reason,
            }
          : null,
        updatedFromStripeAt: new Date().toISOString(),
      },
    })
    .eq("id", destination.id);
  return { handled: true as const };
}

async function processConditionalEvent(event: Stripe.Event) {
  const object = event.data.object;
  const metadata = objectMetadata(object);

  if (event.type === "checkout.session.completed") {
    const session = object as Stripe.Checkout.Session;
    if (!isConditionalMetadata(session.metadata)) {
      return { handled: false as const };
    }
    const setupIntentId =
      typeof session.setup_intent === "string"
        ? session.setup_intent
        : session.setup_intent?.id ?? null;
    if (!setupIntentId) {
      throw new Error("Conditional-payment Checkout completed without a SetupIntent.");
    }
    const setupIntent = await getStripe().setupIntents.retrieve(setupIntentId);
    const result = await markConditionalMandateReadyFromSetupIntent(setupIntent);
    if (
      result.handled &&
      result.ready &&
      result.subjectType === "donation_offset_match"
    ) {
      await attemptDonationOffsetSettlement(result.subjectId);
    }
    return { handled: true as const };
  }

  if (event.type === "setup_intent.succeeded") {
    const setupIntent = object as Stripe.SetupIntent;
    if (!isConditionalMetadata(setupIntent.metadata)) {
      return { handled: false as const };
    }
    const result = await markConditionalMandateReadyFromSetupIntent(setupIntent);
    if (
      result.handled &&
      result.ready &&
      result.subjectType === "donation_offset_match"
    ) {
      await attemptDonationOffsetSettlement(result.subjectId);
    }
    return { handled: true as const };
  }

  if (event.type === "setup_intent.setup_failed") {
    const setupIntent = object as Stripe.SetupIntent;
    if (!isConditionalMetadata(setupIntent.metadata)) {
      return { handled: false as const };
    }
    await markConditionalMandateSetupFailed(setupIntent);
    return { handled: true as const };
  }

  if (
    event.type === "payment_intent.succeeded" ||
    event.type === "payment_intent.payment_failed" ||
    event.type === "payment_intent.processing" ||
    event.type === "payment_intent.requires_action"
  ) {
    const paymentIntent = object as Stripe.PaymentIntent;
    if (!isConditionalMetadata(paymentIntent.metadata)) {
      return { handled: false as const };
    }
    await reconcileConditionalPaymentIntent(paymentIntent);
    return { handled: true as const };
  }

  if (event.type === "charge.refunded") {
    return reconcileChargeRefunded(object as Stripe.Charge);
  }

  if (event.type === "refund.created" || event.type === "refund.updated" || event.type === "refund.failed") {
    const refund = object as Stripe.Refund;
    if (!isConditionalMetadata(refund.metadata)) {
      const result = await reconcileConditionalRefund(refund);
      return result;
    }
    await reconcileConditionalRefund(refund);
    return { handled: true as const };
  }

  if (
    event.type === "charge.dispute.created" ||
    event.type === "charge.dispute.updated" ||
    event.type === "charge.dispute.closed"
  ) {
    return reconcileConditionalDispute(object as Stripe.Dispute);
  }

  if (
    event.type === "transfer.created" ||
    event.type === "transfer.updated" ||
    event.type === "transfer.reversed" ||
    event.type === "transfer.failed"
  ) {
    return reconcileTransfer(object as Stripe.Transfer, event.type);
  }

  if (event.type === "account.updated") {
    return reconcileDestinationAccount(object as Stripe.Account);
  }

  if (isConditionalMetadata(metadata)) {
    return { handled: true as const };
  }

  return { handled: false as const };
}

export async function handleConditionalStripeWebhookEvent(input: {
  event: Stripe.Event;
  rawBodyHash: string;
  signatureVerified: boolean;
}) {
  if (!input.signatureVerified) {
    throw new Error("Conditional-payment webhooks require a verified Stripe signature.");
  }

  const begun = await beginWebhookEvent(input);
  if (begun.duplicate) {
    return {
      handled: true,
      duplicate: true,
      status: begun.status ?? "processed",
    };
  }

  try {
    const result = await processConditionalEvent(input.event);
    await finishWebhookEvent(input.event.id, result.handled ? "processed" : "ignored");
    if (result.handled) {
      await markSignedWebhookGatePassed(input.event.livemode);
    }
    return {
      handled: result.handled,
      duplicate: false,
      status: result.handled ? "processed" : "ignored",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown conditional-payment webhook error";
    await finishWebhookEvent(input.event.id, "failed", message);
    throw error;
  }
}
