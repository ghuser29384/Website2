import type Stripe from "stripe";

import { getStripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";
import {
  assertPositiveCurrencyAmount,
  getConditionalPaymentsEnvironment,
  makeConditionalIdempotencyKey,
  participantAmountForDonationOffset,
} from "@/lib/payments/conditional-state";
import { getConditionalPaymentReadiness } from "@/lib/payments/conditional-readiness";
import {
  getDonationOffsetParticipantRole,
  loadDonationOffsetPaymentContext,
} from "@/lib/payments/donation-offset-context";

export const CONDITIONAL_PAYMENT_TERMS_VERSION = "conditional-payments-v1-2026-07-14";

export interface ConditionalMandateCheckoutResult {
  mandateId: string;
  checkoutSessionId: string | null;
  checkoutUrl: string | null;
  status: string;
  alreadyReady: boolean;
}

function getDb() {
  return createServiceClient() as any;
}

async function recordAuditEvent(input: {
  actorProfileId?: string | null;
  actorKind: "participant" | "operator" | "system" | "stripe";
  eventType: string;
  objectType: string;
  objectId: string;
  details?: Record<string, unknown>;
}) {
  const { error } = await getDb().from("conditional_payment_audit_events").insert({
    actor_profile_id: input.actorProfileId ?? null,
    actor_kind: input.actorKind,
    event_type: input.eventType,
    object_type: input.objectType,
    object_id: input.objectId,
    details: input.details ?? {},
  });

  if (error) {
    console.error("[conditional-payments] audit event insert failed", {
      eventType: input.eventType,
      objectId: input.objectId,
      message: error.message,
    });
  }
}

async function ensureStripeCustomer(profileId: string, livemode: boolean) {
  const supabase = getDb();
  const { data: existing, error: existingError } = await supabase
    .from("conditional_payment_customers")
    .select("*")
    .eq("profile_id", profileId)
    .eq("livemode", livemode)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Unable to read the Stripe customer record: ${existingError.message}`);
  }
  if (existing?.stripe_customer_id) {
    return String(existing.stripe_customer_id);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, display_name")
    .eq("id", profileId)
    .maybeSingle();

  if (profileError || !profile) {
    throw new Error(
      `Unable to read the payment profile: ${profileError?.message ?? "profile not found"}`,
    );
  }

  const stripe = getStripe();
  const idempotencyKey = makeConditionalIdempotencyKey([
    "customer",
    profileId,
    livemode,
  ]);
  const customer = await stripe.customers.create(
    {
      email: profile.email,
      name: profile.display_name || undefined,
      metadata: {
        moral_trade_profile_id: profileId,
        system: "conditional_payments",
      },
    },
    { idempotencyKey },
  );

  if (customer.livemode !== livemode) {
    throw new Error("Stripe created the customer in the wrong environment.");
  }

  const { error: upsertError } = await supabase
    .from("conditional_payment_customers")
    .upsert(
      {
        profile_id: profileId,
        stripe_customer_id: customer.id,
        livemode,
      },
      { onConflict: "profile_id,livemode" },
    );

  if (upsertError) {
    throw new Error(`Unable to store the Stripe customer record: ${upsertError.message}`);
  }

  return customer.id;
}

function buildMandateMetadata(input: {
  mandateId: string;
  matchId: string;
  participantRole: "owner" | "counterparty";
  conditionHash: string;
  consentedAt: string;
}) {
  return {
    system: "conditional_payments",
    purpose: "conditional_payment_mandate",
    mandate_id: input.mandateId,
    subject_type: "donation_offset_match",
    subject_id: input.matchId,
    participant_role: input.participantRole,
    condition_hash: input.conditionHash,
    consented_at: input.consentedAt,
  };
}

function setupIntentMatchesCurrentMandate(
  setupIntent: Stripe.SetupIntent,
  mandate: Record<string, any>,
) {
  return (
    setupIntent.metadata?.mandate_id === String(mandate.id) &&
    setupIntent.metadata?.condition_hash === String(mandate.condition_hash) &&
    setupIntent.metadata?.consented_at === String(mandate.consented_at) &&
    setupIntent.metadata?.participant_role === String(mandate.participant_role) &&
    setupIntent.metadata?.subject_id === String(mandate.subject_id)
  );
}

export async function createDonationOffsetMandateCheckout(input: {
  matchId: string;
  profileId: string;
  origin: string;
  consentTermsVersion?: string;
}): Promise<ConditionalMandateCheckoutResult> {
  const readiness = await getConditionalPaymentReadiness();
  if (!readiness.canCreateMandates) {
    throw new Error(
      `Conditional payment authorization is not ready: ${
        readiness.blockers.join(" ") || "readiness gates did not pass"
      }`,
    );
  }

  const context = await loadDonationOffsetPaymentContext(input.matchId);
  const participantRole = getDonationOffsetParticipantRole(context, input.profileId);
  const amountCents = participantAmountForDonationOffset(context.snapshot, participantRole);
  const currency = context.snapshot.currency;
  assertPositiveCurrencyAmount(amountCents, currency);

  const environment = getConditionalPaymentsEnvironment();
  const stripeCustomerId = await ensureStripeCustomer(input.profileId, environment.livemode);
  const consentTermsVersion =
    input.consentTermsVersion?.trim() || CONDITIONAL_PAYMENT_TERMS_VERSION;
  const supabase = getDb();

  const { error: staleMandateError } = await supabase
    .from("conditional_payment_mandates")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      failure_code: "terms_changed",
      failure_message: "The frozen donation-offset terms changed before capture.",
    })
    .eq("profile_id", input.profileId)
    .eq("purpose", "donation_offset")
    .eq("subject_type", "donation_offset_match")
    .eq("subject_id", context.snapshot.matchId)
    .eq("participant_role", participantRole)
    .eq("livemode", environment.livemode)
    .neq("condition_hash", context.conditionHash)
    .in("status", ["setup_pending", "ready", "requires_action", "failed"]);

  if (staleMandateError) {
    throw new Error(`Unable to invalidate stale payment terms: ${staleMandateError.message}`);
  }

  const { data: existing, error: existingError } = await supabase
    .from("conditional_payment_mandates")
    .select("*")
    .eq("profile_id", input.profileId)
    .eq("purpose", "donation_offset")
    .eq("subject_type", "donation_offset_match")
    .eq("subject_id", context.snapshot.matchId)
    .eq("participant_role", participantRole)
    .eq("condition_hash", context.conditionHash)
    .eq("livemode", environment.livemode)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Unable to read the payment mandate: ${existingError.message}`);
  }

  if (existing?.status === "ready" || existing?.status === "charged") {
    return {
      mandateId: String(existing.id),
      checkoutSessionId: existing.stripe_checkout_session_id
        ? String(existing.stripe_checkout_session_id)
        : null,
      checkoutUrl: null,
      status: String(existing.status),
      alreadyReady: true,
    };
  }

  if (existing?.status === "charge_pending") {
    throw new Error("This mandate is currently being captured and cannot be replaced.");
  }
  if (existing?.status === "disputed") {
    throw new Error("This mandate is attached to a disputed charge and requires operator review.");
  }

  if (existing?.stripe_checkout_session_id && existing.status === "setup_pending") {
    try {
      const session = await getStripe().checkout.sessions.retrieve(
        String(existing.stripe_checkout_session_id),
      );
      if (session.status === "open" && session.url) {
        return {
          mandateId: String(existing.id),
          checkoutSessionId: session.id,
          checkoutUrl: session.url,
          status: String(existing.status),
          alreadyReady: false,
        };
      }
    } catch {
      // Create a replacement Checkout Session below. Stripe IDs remain in the audit trail.
    }
  }

  const consentedAt = new Date().toISOString();
  let mandate = existing;
  if (mandate) {
    const { data: updated, error: updateError } = await supabase
      .from("conditional_payment_mandates")
      .update({
        amount_cents: amountCents,
        currency,
        condition_snapshot: context.snapshot,
        stripe_customer_id: stripeCustomerId,
        stripe_checkout_session_id: null,
        stripe_setup_intent_id: null,
        stripe_payment_method_id: null,
        status: "setup_pending",
        consent_terms_version: consentTermsVersion,
        consented_at: consentedAt,
        ready_at: null,
        cancelled_at: null,
        failure_code: null,
        failure_message: null,
      })
      .eq("id", mandate.id)
      .in("status", ["setup_pending", "failed", "requires_action", "cancelled", "refunded"])
      .select("*")
      .single();

    if (updateError || !updated) {
      throw new Error(
        `Unable to reset the payment mandate: ${updateError?.message ?? "unknown error"}`,
      );
    }
    mandate = updated;
  } else {
    const { data: inserted, error: insertError } = await supabase
      .from("conditional_payment_mandates")
      .insert({
        profile_id: input.profileId,
        purpose: "donation_offset",
        subject_type: "donation_offset_match",
        subject_id: context.snapshot.matchId,
        participant_role: participantRole,
        amount_cents: amountCents,
        currency,
        condition_snapshot: context.snapshot,
        condition_hash: context.conditionHash,
        livemode: environment.livemode,
        status: "setup_pending",
        stripe_customer_id: stripeCustomerId,
        consent_terms_version: consentTermsVersion,
        consented_at: consentedAt,
      })
      .select("*")
      .single();

    if (insertError || !inserted) {
      throw new Error(
        `Unable to create the payment mandate: ${insertError?.message ?? "unknown error"}`,
      );
    }
    mandate = inserted;
  }

  const normalizedOrigin = input.origin.replace(/\/$/, "");
  const expiresAt = Math.floor(Date.now() / 1000) + 23 * 60 * 60;
  const metadata = buildMandateMetadata({
    mandateId: String(mandate.id),
    matchId: context.snapshot.matchId,
    participantRole,
    conditionHash: context.conditionHash,
    consentedAt: String(mandate.consented_at),
  });
  const sessionIdempotencyKey = makeConditionalIdempotencyKey([
    "setup-session",
    mandate.id,
    context.conditionHash,
    consentTermsVersion,
    mandate.consented_at,
  ]);
  const session = await getStripe().checkout.sessions.create(
    {
      mode: "setup",
      customer: stripeCustomerId,
      client_reference_id: String(mandate.id),
      // Stripe dynamically selects eligible Dashboard-enabled methods for this setup flow.
      // Card wallets, Link, and PayPal appear only when supported for the account and flow.
      success_url: `${normalizedOrigin}/donation-offsets/payments?setup=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${normalizedOrigin}/donation-offsets/payments?setup=cancelled`,
      expires_at: expiresAt,
      metadata,
      setup_intent_data: {
        metadata,
      },
      custom_text: {
        submit: {
          message:
            environment.livemode
              ? `Your selected payment method will not be charged now. Moral Trade may later charge exactly ${(amountCents / 100).toFixed(2)} ${currency.toUpperCase()} off-session only if the frozen offset condition clears. If paired settlement cannot complete, successful charges are reversed or refunded.`
              : `TEST MODE — no real money moves. This saves a test payment method for a ${(amountCents / 100).toFixed(2)} ${currency.toUpperCase()} conditional offset authorization.`,
        },
      },
    },
    { idempotencyKey: sessionIdempotencyKey },
  );

  const setupIntentId =
    typeof session.setup_intent === "string"
      ? session.setup_intent
      : session.setup_intent?.id ?? null;
  const { error: sessionStoreError } = await supabase
    .from("conditional_payment_mandates")
    .update({
      stripe_checkout_session_id: session.id,
      stripe_setup_intent_id: setupIntentId,
      expires_at: new Date(expiresAt * 1000).toISOString(),
    })
    .eq("id", mandate.id)
    .eq("status", "setup_pending")
    .eq("consented_at", mandate.consented_at);

  if (sessionStoreError) {
    throw new Error(`Unable to store the Checkout Session: ${sessionStoreError.message}`);
  }

  await recordAuditEvent({
    actorProfileId: input.profileId,
    actorKind: "participant",
    eventType: "mandate_checkout_created",
    objectType: "conditional_payment_mandate",
    objectId: String(mandate.id),
    details: {
      matchId: context.snapshot.matchId,
      participantRole,
      amountCents,
      currency,
      conditionHash: context.conditionHash,
      livemode: environment.livemode,
      checkoutSessionId: session.id,
      consentTermsVersion,
      consentedAt: mandate.consented_at,
    },
  });

  return {
    mandateId: String(mandate.id),
    checkoutSessionId: session.id,
    checkoutUrl: session.url,
    status: "setup_pending",
    alreadyReady: false,
  };
}

export async function markConditionalMandateReadyFromSetupIntent(
  setupIntent: Stripe.SetupIntent,
) {
  const mandateId = setupIntent.metadata?.mandate_id;
  if (
    setupIntent.metadata?.system !== "conditional_payments" ||
    setupIntent.metadata?.purpose !== "conditional_payment_mandate" ||
    !mandateId
  ) {
    return { handled: false as const };
  }

  const paymentMethodId =
    typeof setupIntent.payment_method === "string"
      ? setupIntent.payment_method
      : setupIntent.payment_method?.id ?? null;
  const customerId =
    typeof setupIntent.customer === "string"
      ? setupIntent.customer
      : setupIntent.customer?.id ?? null;

  if (setupIntent.status !== "succeeded" || !paymentMethodId || !customerId) {
    return { handled: true as const, ready: false as const };
  }

  const supabase = getDb();
  const { data: mandate, error: mandateError } = await supabase
    .from("conditional_payment_mandates")
    .select("*")
    .eq("id", mandateId)
    .maybeSingle();

  if (mandateError || !mandate) {
    throw new Error(
      `SetupIntent references an unknown payment mandate: ${mandateError?.message ?? mandateId}`,
    );
  }
  if (Boolean(mandate.livemode) !== setupIntent.livemode) {
    throw new Error("SetupIntent environment does not match the payment mandate.");
  }
  if (mandate.stripe_customer_id && mandate.stripe_customer_id !== customerId) {
    throw new Error("SetupIntent customer does not match the payment mandate.");
  }
  if (!setupIntentMatchesCurrentMandate(setupIntent, mandate)) {
    await recordAuditEvent({
      actorProfileId: mandate.profile_id,
      actorKind: "stripe",
      eventType: "stale_setup_intent_ignored",
      objectType: "conditional_payment_mandate",
      objectId: String(mandate.id),
      details: {
        setupIntentId: setupIntent.id,
        setupConsentedAt: setupIntent.metadata?.consented_at ?? null,
        currentConsentedAt: mandate.consented_at,
      },
    });
    return { handled: true as const, ready: false as const };
  }
  if (mandate.status === "cancelled") {
    return { handled: true as const, ready: false as const };
  }

  const readyAt = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("conditional_payment_mandates")
    .update({
      stripe_customer_id: customerId,
      stripe_setup_intent_id: setupIntent.id,
      stripe_payment_method_id: paymentMethodId,
      status: "ready",
      ready_at: readyAt,
      failure_code: null,
      failure_message: null,
    })
    .eq("id", mandate.id)
    .eq("consented_at", mandate.consented_at)
    .in("status", ["setup_pending", "ready", "failed", "requires_action"]);

  if (updateError) {
    throw new Error(`Unable to mark the payment mandate ready: ${updateError.message}`);
  }

  await supabase
    .from("conditional_payment_customers")
    .update({ stripe_default_payment_method_id: paymentMethodId })
    .eq("profile_id", mandate.profile_id)
    .eq("livemode", mandate.livemode);

  try {
    await getStripe().customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });
  } catch (error) {
    console.error("[conditional-payments] unable to set customer default payment method", {
      customerId,
      paymentMethodId,
      message: error instanceof Error ? error.message : "unknown Stripe error",
    });
  }

  await recordAuditEvent({
    actorProfileId: mandate.profile_id,
    actorKind: "stripe",
    eventType: "mandate_ready",
    objectType: "conditional_payment_mandate",
    objectId: String(mandate.id),
    details: {
      setupIntentId: setupIntent.id,
      paymentMethodId,
      subjectType: mandate.subject_type,
      subjectId: mandate.subject_id,
      participantRole: mandate.participant_role,
      conditionHash: mandate.condition_hash,
      consentedAt: mandate.consented_at,
      readyAt,
    },
  });

  return {
    handled: true as const,
    ready: true as const,
    mandateId: String(mandate.id),
    subjectType: String(mandate.subject_type),
    subjectId: String(mandate.subject_id),
  };
}

export async function markConditionalMandateSetupFailed(
  setupIntent: Stripe.SetupIntent,
) {
  const mandateId = setupIntent.metadata?.mandate_id;
  if (setupIntent.metadata?.system !== "conditional_payments" || !mandateId) {
    return { handled: false as const };
  }

  const supabase = getDb();
  const { data: mandate, error: mandateError } = await supabase
    .from("conditional_payment_mandates")
    .select("*")
    .eq("id", mandateId)
    .maybeSingle();
  if (mandateError || !mandate) {
    throw new Error(
      `Failed SetupIntent references an unknown mandate: ${mandateError?.message ?? mandateId}`,
    );
  }
  if (!setupIntentMatchesCurrentMandate(setupIntent, mandate)) {
    return { handled: true as const };
  }

  const lastError = setupIntent.last_setup_error;
  const { error } = await supabase
    .from("conditional_payment_mandates")
    .update({
      status: "failed",
      stripe_setup_intent_id: setupIntent.id,
      failure_code: lastError?.code ?? "setup_failed",
      failure_message: lastError?.message ?? "Stripe could not save the payment method.",
    })
    .eq("id", mandateId)
    .eq("consented_at", mandate.consented_at)
    .in("status", ["setup_pending", "failed"]);

  if (error) {
    throw new Error(`Unable to record payment-method setup failure: ${error.message}`);
  }

  return { handled: true as const };
}

export async function cancelConditionalMandate(input: {
  mandateId: string;
  profileId: string;
}) {
  const supabase = getDb();
  const { data: mandate, error } = await supabase
    .from("conditional_payment_mandates")
    .select("*")
    .eq("id", input.mandateId)
    .eq("profile_id", input.profileId)
    .maybeSingle();

  if (error || !mandate) {
    throw new Error(`Payment mandate not found: ${error?.message ?? input.mandateId}`);
  }
  if (["charge_pending", "charged", "refunded", "disputed"].includes(mandate.status)) {
    throw new Error("This payment mandate can no longer be cancelled from the participant page.");
  }

  const { error: updateError } = await supabase
    .from("conditional_payment_mandates")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      failure_code: "participant_cancelled",
      failure_message: "The participant revoked the conditional payment mandate.",
    })
    .eq("id", input.mandateId)
    .eq("profile_id", input.profileId);

  if (updateError) {
    throw new Error(`Unable to cancel the payment mandate: ${updateError.message}`);
  }

  await recordAuditEvent({
    actorProfileId: input.profileId,
    actorKind: "participant",
    eventType: "mandate_cancelled",
    objectType: "conditional_payment_mandate",
    objectId: input.mandateId,
  });
}
