import { createHash, randomUUID } from "node:crypto";
import type Stripe from "stripe";

import { createServiceClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import {
  arbitrationClosesAt,
  CONDITIONAL_REDIRECT_TERMS_VERSION,
  conditionalRedirectKind,
  type ConditionalRedirectTerms,
  validateConditionalRedirectTerms,
} from "@/lib/payments/conditional-redirect";
import { ensureStripeCustomer } from "@/lib/payments/conditional-mandates";
import {
  getConditionalPaymentsEnvironment,
  makeConditionalIdempotencyKey,
} from "@/lib/payments/conditional-state";
import { getConditionalPaymentReadiness } from "@/lib/payments/conditional-readiness";

function db() {
  return createServiceClient() as any;
}

function conditionHash(terms: ConditionalRedirectTerms) {
  return createHash("sha256").update(JSON.stringify(terms)).digest("hex");
}

function termsFromOffer(offer: Record<string, any>): ConditionalRedirectTerms {
  return {
    creatorAmountCents: Number(offer.creator_amount_cents),
    matcherAmountCents: Number(offer.matcher_amount_cents),
    fallbackDestinationId: String(offer.fallback_destination_id),
    matchedDestinationId: String(offer.matched_destination_id),
    deadlineAt: String(offer.deadline_at),
    currency: "usd",
  };
}

async function recordAudit(input: {
  actorProfileId?: string | null;
  actorKind?: "participant" | "operator" | "system" | "stripe";
  eventType: string;
  objectType: string;
  objectId: string;
  details?: Record<string, unknown>;
}) {
  const { error } = await db().from("conditional_payment_audit_events").insert({
    actor_profile_id: input.actorProfileId ?? null,
    actor_kind: input.actorKind ?? "system",
    event_type: input.eventType,
    object_type: input.objectType,
    object_id: input.objectId,
    details: input.details ?? {},
  });
  if (error) {
    console.error("[conditional-redirect] audit write failed", {
      eventType: input.eventType,
      objectId: input.objectId,
      message: error.message,
    });
  }
}

async function assertActiveDestination(destinationId: string, livemode: boolean) {
  const { data, error } = await db()
    .from("conditional_payment_destinations")
    .select("id, registered_charity_id, display_name, status, livemode")
    .eq("id", destinationId)
    .eq("livemode", livemode)
    .eq("status", "active")
    .maybeSingle();
  if (error || !data) {
    throw new Error(
      error?.message ?? "The selected charity is not an approved payment destination.",
    );
  }
  return data as Record<string, any>;
}

async function createSetupSession(input: {
  amountCents: number;
  conditionHash: string;
  conditionSnapshot: Record<string, unknown>;
  offerId: string;
  origin: string;
  participantRole: "creator" | "matcher";
  profileId: string;
  candidateId?: string;
  existingMandateId?: string;
}) {
  const environment = getConditionalPaymentsEnvironment();
  const customerId = await ensureStripeCustomer(input.profileId, environment.livemode);
  const consentedAt = new Date().toISOString();
  const mandateId = input.existingMandateId ?? randomUUID();
  const supabase = db();

  if (input.existingMandateId) {
    const { data: existing, error: existingError } = await supabase
      .from("conditional_payment_mandates")
      .select("*")
      .eq("id", input.existingMandateId)
      .eq("profile_id", input.profileId)
      .eq("purpose", "conditional_redirect")
      .eq("subject_type", "conditional_redirect_offer")
      .eq("subject_id", input.offerId)
      .eq("participant_role", input.participantRole)
      .eq("condition_hash", input.conditionHash)
      .eq("livemode", environment.livemode)
      .maybeSingle();
    if (existingError || !existing) {
      throw new Error(
        `Unable to read the prior authorization: ${
          existingError?.message ?? "authorization not found"
        }`,
      );
    }

    const { data: reset, error: resetError } = await supabase
      .from("conditional_payment_mandates")
      .update({
        amount_cents: input.amountCents,
        currency: "usd",
        condition_snapshot: input.conditionSnapshot,
        status: "setup_pending",
        stripe_customer_id: customerId,
        stripe_checkout_session_id: null,
        stripe_setup_intent_id: null,
        stripe_payment_method_id: null,
        consent_terms_version: CONDITIONAL_REDIRECT_TERMS_VERSION,
        consented_at: consentedAt,
        ready_at: null,
        expires_at: null,
        cancelled_at: null,
        failure_code: null,
        failure_message: null,
      })
      .eq("id", input.existingMandateId)
      .in("status", [
        "setup_pending",
        "ready",
        "requires_action",
        "failed",
        "refunded",
        "cancelled",
      ])
      .select("id")
      .maybeSingle();
    if (resetError || !reset) {
      throw new Error(
        `Unable to reset the payment authorization: ${
          resetError?.message ?? "authorization is no longer replaceable"
        }`,
      );
    }
  } else {
    const { error: mandateError } = await supabase
      .from("conditional_payment_mandates")
      .insert({
        id: mandateId,
        profile_id: input.profileId,
        purpose: "conditional_redirect",
        subject_type: "conditional_redirect_offer",
        subject_id: input.offerId,
        participant_role: input.participantRole,
        amount_cents: input.amountCents,
        currency: "usd",
        condition_snapshot: input.conditionSnapshot,
        condition_hash: input.conditionHash,
        livemode: environment.livemode,
        status: "setup_pending",
        stripe_customer_id: customerId,
        consent_terms_version: CONDITIONAL_REDIRECT_TERMS_VERSION,
        consented_at: consentedAt,
      });
    if (mandateError) {
      throw new Error(`Unable to create payment authorization: ${mandateError.message}`);
    }
  }

  const metadata: Record<string, string> = {
    system: "conditional_payments",
    purpose: "conditional_redirect",
    subject_type: "conditional_redirect_offer",
    subject_id: input.offerId,
    mandate_id: mandateId,
    participant_role: input.participantRole,
    condition_hash: input.conditionHash,
    consented_at: consentedAt,
  };
  if (input.candidateId) metadata.candidate_id = input.candidateId;

  const normalizedOrigin = input.origin.replace(/\/$/, "");
  const expiresAt = Math.floor(Date.now() / 1000) + 23 * 60 * 60;
  const session = await getStripe().checkout.sessions.create(
    {
      mode: "setup",
      customer: customerId,
      client_reference_id: mandateId,
      success_url: `${normalizedOrigin}/trades/new?structure=conditional-donation&setup=success&offer=${input.offerId}`,
      cancel_url: `${normalizedOrigin}/trades/new?structure=conditional-donation&setup=cancelled&offer=${input.offerId}`,
      expires_at: expiresAt,
      metadata,
      setup_intent_data: { metadata },
      custom_text: {
        submit: {
          message: `Your payment method is saved but not charged now. If the published condition resolves in your favor, Moral Trade may later charge exactly $${(
            input.amountCents / 100
          ).toFixed(
            2,
          )} off-session. Definitive declines are not retried automatically.`,
        },
      },
    },
    {
      idempotencyKey: makeConditionalIdempotencyKey([
        "conditional-redirect-setup",
        mandateId,
        input.conditionHash,
        consentedAt,
      ]),
    },
  );

  const setupIntentId =
    typeof session.setup_intent === "string"
      ? session.setup_intent
      : session.setup_intent?.id ?? null;
  const { data: stored, error: updateError } = await supabase
    .from("conditional_payment_mandates")
    .update({
      stripe_checkout_session_id: session.id,
      stripe_setup_intent_id: setupIntentId,
      expires_at: new Date(expiresAt * 1000).toISOString(),
    })
    .eq("id", mandateId)
    .eq("status", "setup_pending")
    .eq("consented_at", consentedAt)
    .select("id")
    .maybeSingle();
  if (updateError || !stored) {
    throw new Error(
      `Unable to save Stripe Checkout state: ${
        updateError?.message ?? "authorization changed during setup"
      }`,
    );
  }

  await recordAudit({
    actorProfileId: input.profileId,
    actorKind: "participant",
    eventType: input.existingMandateId
      ? "conditional_redirect_reauthorization_started"
      : "conditional_redirect_authorization_started",
    objectType: "conditional_payment_mandate",
    objectId: mandateId,
    details: {
      offerId: input.offerId,
      candidateId: input.candidateId ?? null,
      participantRole: input.participantRole,
      amountCents: input.amountCents,
      consentedAt,
    },
  });

  return { checkoutUrl: session.url, mandateId };
}

export async function createConditionalRedirectOffer(input: {
  creatorProfileId: string;
  creatorAmountCents: number;
  matcherAmountCents: number;
  fallbackDestinationId: string;
  matchedDestinationId: string;
  deadlineAt: string;
  origin: string;
}) {
  const readiness = await getConditionalPaymentReadiness();
  if (!readiness.canCreateMandates) {
    throw new Error(`Payment authorization is gated: ${readiness.blockers.join(" ")}`);
  }
  const terms: ConditionalRedirectTerms = {
    creatorAmountCents: input.creatorAmountCents,
    matcherAmountCents: input.matcherAmountCents,
    fallbackDestinationId: input.fallbackDestinationId,
    matchedDestinationId: input.matchedDestinationId,
    deadlineAt: input.deadlineAt,
    currency: "usd",
  };
  const errors = validateConditionalRedirectTerms(terms);
  if (errors.length) throw new Error(errors.join(" "));
  await Promise.all([
    assertActiveDestination(input.fallbackDestinationId, readiness.livemode),
    assertActiveDestination(input.matchedDestinationId, readiness.livemode),
  ]);

  const offerId = randomUUID();
  const hash = conditionHash(terms);
  const { error } = await db().from("conditional_redirect_offers").insert({
    id: offerId,
    creator_profile_id: input.creatorProfileId,
    creator_amount_cents: input.creatorAmountCents,
    matcher_amount_cents: input.matcherAmountCents,
    currency: "usd",
    fallback_destination_id: input.fallbackDestinationId,
    matched_destination_id: input.matchedDestinationId,
    deadline_at: input.deadlineAt,
    arbitration_closes_at: arbitrationClosesAt(input.deadlineAt),
    status: "pending_creator_authorization",
    terms_version: CONDITIONAL_REDIRECT_TERMS_VERSION,
    condition_hash: hash,
    livemode: readiness.livemode,
  });
  if (error) throw new Error(`Unable to create conditional redirect: ${error.message}`);

  const setup = await createSetupSession({
    amountCents: input.creatorAmountCents,
    conditionHash: hash,
    conditionSnapshot: {
      schemaVersion: "conditional-redirect-condition-v1",
      offerId,
      participantRole: "creator",
      terms,
    },
    offerId,
    origin: input.origin,
    participantRole: "creator",
    profileId: input.creatorProfileId,
  });
  const { data: linked, error: linkError } = await db()
    .from("conditional_redirect_offers")
    .update({ creator_mandate_id: setup.mandateId })
    .eq("id", offerId)
    .eq("creator_profile_id", input.creatorProfileId)
    .eq("status", "pending_creator_authorization")
    .select("id")
    .maybeSingle();
  if (linkError || !linked) {
    throw new Error(
      `Unable to link creator authorization: ${
        linkError?.message ?? "offer changed during setup"
      }`,
    );
  }

  return {
    offerId,
    checkoutUrl: setup.checkoutUrl,
    kind: conditionalRedirectKind(
      input.fallbackDestinationId,
      input.matchedDestinationId,
    ),
  };
}

export async function joinConditionalRedirectOffer(input: {
  offerId: string;
  matcherProfileId: string;
  origin: string;
}) {
  const supabase = db();
  const { data: offer, error } = await supabase
    .from("conditional_redirect_offers")
    .select("*")
    .eq("id", input.offerId)
    .eq("status", "open")
    .maybeSingle();
  if (error || !offer) throw new Error(error?.message ?? "This offer is not open.");
  if (String(offer.creator_profile_id) === input.matcherProfileId) {
    throw new Error("The creator cannot match their own offer.");
  }
  if (Date.now() > Date.parse(String(offer.deadline_at))) {
    throw new Error("The matching deadline has passed.");
  }

  const { data: existingCandidate, error: existingCandidateError } = await supabase
    .from("conditional_redirect_candidates")
    .select("id, status")
    .eq("offer_id", input.offerId)
    .eq("matcher_profile_id", input.matcherProfileId)
    .maybeSingle();
  if (existingCandidateError) {
    throw new Error(`Unable to inspect your prior authorization: ${existingCandidateError.message}`);
  }
  if (existingCandidate) {
    throw new Error(
      existingCandidate.status === "cancelled"
        ? "You withdrew this authorization and cannot rejoin the same frozen offer."
        : "You already authorized this offer.",
    );
  }

  const candidateId = randomUUID();
  const terms = termsFromOffer(offer as Record<string, any>);
  const setup = await createSetupSession({
    amountCents: Number(offer.matcher_amount_cents),
    conditionHash: String(offer.condition_hash),
    conditionSnapshot: {
      schemaVersion: "conditional-redirect-condition-v1",
      offerId: String(offer.id),
      participantRole: "matcher",
      candidateId,
      terms,
      backupConsent: true,
    },
    offerId: String(offer.id),
    origin: input.origin,
    participantRole: "matcher",
    profileId: input.matcherProfileId,
    candidateId,
  });
  const { error: candidateError } = await supabase
    .from("conditional_redirect_candidates")
    .insert({
      id: candidateId,
      offer_id: offer.id,
      matcher_profile_id: input.matcherProfileId,
      mandate_id: setup.mandateId,
      status: "setup_pending",
    });
  if (candidateError) {
    await supabase
      .from("conditional_payment_mandates")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        failure_code: "candidate_creation_failed",
      })
      .eq("id", setup.mandateId);
    throw new Error(`Unable to join this offer: ${candidateError.message}`);
  }
  return { candidateId, checkoutUrl: setup.checkoutUrl };
}

export async function reauthorizeConditionalRedirect(input: {
  offerId: string;
  profileId: string;
  origin: string;
}) {
  const supabase = db();
  const { data: offer, error: offerError } = await supabase
    .from("conditional_redirect_offers")
    .select("*")
    .eq("id", input.offerId)
    .in("status", ["creator_recovery", "matcher_recovery"])
    .maybeSingle();
  if (offerError || !offer) {
    throw new Error(offerError?.message ?? "This recovery window is no longer open.");
  }
  if (
    !offer.recovery_ends_at ||
    Date.now() > Date.parse(String(offer.recovery_ends_at))
  ) {
    throw new Error("The 15-minute recovery window has ended.");
  }

  const terms = termsFromOffer(offer as Record<string, any>);
  if (
    offer.status === "creator_recovery" &&
    String(offer.creator_profile_id) === input.profileId
  ) {
    return createSetupSession({
      amountCents: Number(offer.creator_amount_cents),
      conditionHash: String(offer.condition_hash),
      conditionSnapshot: {
        schemaVersion: "conditional-redirect-condition-v1",
        offerId: String(offer.id),
        participantRole: "creator",
        terms,
        recovery: true,
      },
      offerId: String(offer.id),
      origin: input.origin,
      participantRole: "creator",
      profileId: input.profileId,
      existingMandateId: String(offer.creator_mandate_id),
    });
  }

  if (offer.status === "matcher_recovery" && offer.winning_candidate_id) {
    const { data: candidate, error: candidateError } = await supabase
      .from("conditional_redirect_candidates")
      .select("*")
      .eq("id", offer.winning_candidate_id)
      .eq("offer_id", offer.id)
      .eq("matcher_profile_id", input.profileId)
      .eq("status", "recovery")
      .maybeSingle();
    if (candidateError || !candidate) {
      throw new Error(
        candidateError?.message ?? "Only the current winning matcher can reauthorize.",
      );
    }
    return createSetupSession({
      amountCents: Number(offer.matcher_amount_cents),
      conditionHash: String(offer.condition_hash),
      conditionSnapshot: {
        schemaVersion: "conditional-redirect-condition-v1",
        offerId: String(offer.id),
        participantRole: "matcher",
        candidateId: String(candidate.id),
        terms,
        backupConsent: true,
        recovery: true,
      },
      offerId: String(offer.id),
      origin: input.origin,
      participantRole: "matcher",
      profileId: input.profileId,
      candidateId: String(candidate.id),
      existingMandateId: String(candidate.mandate_id),
    });
  }

  throw new Error("You are not the participant who must restore authorization.");
}

export async function cancelConditionalRedirectOffer(input: {
  offerId: string;
  creatorProfileId: string;
}) {
  const supabase = db();
  const { data: cancelled, error } = await supabase
    .from("conditional_redirect_offers")
    .update({
      status: "cancelled",
      cancellation_reason: "Creator revoked authorization before arbitration.",
      completed_at: new Date().toISOString(),
    })
    .eq("id", input.offerId)
    .eq("creator_profile_id", input.creatorProfileId)
    .in("status", ["pending_creator_authorization", "open", "arbitrating"])
    .select("id")
    .maybeSingle();
  if (error || !cancelled) {
    throw new Error(
      error?.message ?? "This offer has already entered settlement and cannot be cancelled here.",
    );
  }

  await Promise.all([
    supabase
      .from("conditional_redirect_candidates")
      .update({ status: "cancelled" })
      .eq("offer_id", input.offerId)
      .in("status", ["setup_pending", "eligible", "backup"]),
    supabase
      .from("conditional_payment_mandates")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        failure_code: "offer_cancelled",
      })
      .eq("purpose", "conditional_redirect")
      .eq("subject_type", "conditional_redirect_offer")
      .eq("subject_id", input.offerId)
      .in("status", ["setup_pending", "ready", "failed", "requires_action"]),
  ]);
  await recordAudit({
    actorProfileId: input.creatorProfileId,
    actorKind: "participant",
    eventType: "conditional_redirect_cancelled",
    objectType: "conditional_redirect_offer",
    objectId: input.offerId,
  });
}

export async function withdrawConditionalRedirectCandidate(input: {
  offerId: string;
  matcherProfileId: string;
}) {
  const supabase = db();
  const { data: offer } = await supabase
    .from("conditional_redirect_offers")
    .select("id, status")
    .eq("id", input.offerId)
    .in("status", ["open", "arbitrating"])
    .maybeSingle();
  if (!offer) throw new Error("This offer has already entered settlement.");

  const { data: candidate, error } = await supabase
    .from("conditional_redirect_candidates")
    .update({ status: "cancelled" })
    .eq("offer_id", input.offerId)
    .eq("matcher_profile_id", input.matcherProfileId)
    .in("status", ["setup_pending", "eligible", "backup"])
    .select("id, mandate_id")
    .maybeSingle();
  if (error || !candidate) {
    throw new Error(error?.message ?? "This authorization is no longer withdrawable.");
  }
  await supabase
    .from("conditional_payment_mandates")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      failure_code: "matcher_withdrew",
    })
    .eq("id", candidate.mandate_id)
    .in("status", ["setup_pending", "ready", "failed", "requires_action"]);
  await recordAudit({
    actorProfileId: input.matcherProfileId,
    actorKind: "participant",
    eventType: "conditional_redirect_candidate_withdrew",
    objectType: "conditional_redirect_candidate",
    objectId: String(candidate.id),
    details: { offerId: input.offerId },
  });
}

function setupIntentCustomerId(setupIntent: Stripe.SetupIntent) {
  return typeof setupIntent.customer === "string"
    ? setupIntent.customer
    : setupIntent.customer?.id ?? null;
}

export async function handleConditionalRedirectSetupSucceeded(input: {
  event: Stripe.Event;
  setupIntent: Stripe.SetupIntent;
}) {
  const metadata = input.setupIntent.metadata;
  if (metadata?.purpose !== "conditional_redirect") return { handled: false as const };
  const mandateId = metadata.mandate_id;
  const offerId = metadata.subject_id;
  const paymentMethodId =
    typeof input.setupIntent.payment_method === "string"
      ? input.setupIntent.payment_method
      : input.setupIntent.payment_method?.id;
  const customerId = setupIntentCustomerId(input.setupIntent);
  if (!mandateId || !offerId || !paymentMethodId || !customerId) {
    throw new Error("Conditional redirect SetupIntent metadata is incomplete.");
  }
  if (input.setupIntent.status !== "succeeded") {
    return { handled: true as const, offerId, ready: false as const };
  }

  const supabase = db();
  const { data: mandate, error: mandateError } = await supabase
    .from("conditional_payment_mandates")
    .select("*")
    .eq("id", mandateId)
    .eq("purpose", "conditional_redirect")
    .eq("subject_type", "conditional_redirect_offer")
    .eq("subject_id", offerId)
    .maybeSingle();
  if (mandateError || !mandate) {
    throw new Error(
      `SetupIntent references an unknown conditional redirect authorization: ${
        mandateError?.message ?? mandateId
      }`,
    );
  }
  if (
    Boolean(mandate.livemode) !== input.event.livemode ||
    Boolean(mandate.livemode) !== input.setupIntent.livemode ||
    mandate.stripe_customer_id !== customerId
  ) {
    throw new Error("Stripe authorization environment or customer does not match the mandate.");
  }
  if (
    metadata.condition_hash !== String(mandate.condition_hash) ||
    metadata.participant_role !== String(mandate.participant_role) ||
    metadata.consented_at !== String(mandate.consented_at)
  ) {
    await recordAudit({
      actorProfileId: mandate.profile_id,
      actorKind: "stripe",
      eventType: "conditional_redirect_stale_setup_ignored",
      objectType: "conditional_payment_mandate",
      objectId: String(mandate.id),
      details: {
        setupIntentId: input.setupIntent.id,
        setupConsentedAt: metadata.consented_at ?? null,
        currentConsentedAt: mandate.consented_at,
      },
    });
    return { handled: true as const, offerId, ready: false as const };
  }
  if (mandate.status !== "setup_pending") {
    return { handled: true as const, offerId, ready: mandate.status === "ready" };
  }

  const { data: offer, error: offerError } = await supabase
    .from("conditional_redirect_offers")
    .select("*")
    .eq("id", offerId)
    .eq("condition_hash", mandate.condition_hash)
    .eq("livemode", mandate.livemode)
    .maybeSingle();
  if (offerError || !offer) {
    throw new Error(offerError?.message ?? "Conditional redirect offer is missing.");
  }

  const eventAt = new Date(input.event.created * 1000).toISOString();
  const eventTime = Date.parse(eventAt);
  let candidate: Record<string, any> | null = null;
  if (mandate.participant_role === "matcher") {
    const { data, error } = await supabase
      .from("conditional_redirect_candidates")
      .select("*")
      .eq("id", metadata.candidate_id)
      .eq("offer_id", offerId)
      .eq("mandate_id", mandateId)
      .eq("matcher_profile_id", mandate.profile_id)
      .maybeSingle();
    if (error || !data) {
      throw new Error(error?.message ?? "Matcher authorization is not linked to a candidate.");
    }
    candidate = data as Record<string, any>;
  }

  const creatorInitial =
    mandate.participant_role === "creator" &&
    offer.status === "pending_creator_authorization" &&
    eventTime <= Date.parse(String(offer.deadline_at));
  const creatorRecovery =
    mandate.participant_role === "creator" &&
    offer.status === "creator_recovery" &&
    offer.recovery_ends_at &&
    eventTime <= Date.parse(String(offer.recovery_ends_at));
  const matcherInitial =
    mandate.participant_role === "matcher" &&
    offer.status === "open" &&
    candidate?.status === "setup_pending" &&
    eventTime <= Date.parse(String(offer.deadline_at));
  const matcherRecovery =
    mandate.participant_role === "matcher" &&
    offer.status === "matcher_recovery" &&
    String(offer.winning_candidate_id) === String(candidate?.id) &&
    candidate?.status === "recovery" &&
    offer.recovery_ends_at &&
    eventTime <= Date.parse(String(offer.recovery_ends_at));

  if (!creatorInitial && !creatorRecovery && !matcherInitial && !matcherRecovery) {
    await supabase
      .from("conditional_payment_mandates")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        failure_code: "authorization_window_closed",
      })
      .eq("id", mandateId)
      .eq("status", "setup_pending");
    if (candidate?.status === "setup_pending") {
      await supabase
        .from("conditional_redirect_candidates")
        .update({ status: "expired" })
        .eq("id", candidate.id)
        .eq("status", "setup_pending");
    }
    if (
      mandate.participant_role === "creator" &&
      offer.status === "pending_creator_authorization"
    ) {
      await supabase
        .from("conditional_redirect_offers")
        .update({
          status: "cancelled",
          cancellation_reason: "Creator authorization completed after the selected deadline.",
          completed_at: new Date().toISOString(),
        })
        .eq("id", offerId)
        .eq("status", "pending_creator_authorization");
    }
    return { handled: true as const, offerId, ready: false as const };
  }

  const paymentMethod = await getStripe().paymentMethods.retrieve(paymentMethodId);
  if (
    !["card", "link"].includes(paymentMethod.type) ||
    Boolean(paymentMethod.livemode) !== Boolean(mandate.livemode)
  ) {
    await supabase
      .from("conditional_payment_mandates")
      .update({
        status: "failed",
        failure_code: "unsupported_off_session_method",
        failure_message:
          "Conditional redirects currently require a reusable card, eligible card wallet, or Link.",
      })
      .eq("id", mandateId)
      .eq("status", "setup_pending");
    return {
      handled: true as const,
      offerId,
      ready: false as const,
      status: "unsupported_payment_method" as const,
    };
  }

  const { data: readyMandate, error: readyError } = await supabase
    .from("conditional_payment_mandates")
    .update({
      stripe_setup_intent_id: input.setupIntent.id,
      stripe_payment_method_id: paymentMethodId,
      status: "ready",
      ready_at: eventAt,
      failure_code: null,
      failure_message: null,
    })
    .eq("id", mandateId)
    .eq("consented_at", mandate.consented_at)
    .eq("status", "setup_pending")
    .select("id")
    .maybeSingle();
  if (readyError || !readyMandate) {
    throw new Error(
      `Unable to confirm payment authorization: ${
        readyError?.message ?? "authorization changed during confirmation"
      }`,
    );
  }

  await supabase
    .from("conditional_payment_customers")
    .update({ stripe_default_payment_method_id: paymentMethodId })
    .eq("profile_id", mandate.profile_id)
    .eq("livemode", mandate.livemode);

  let transitionAccepted = false;
  if (creatorInitial) {
    const { data } = await supabase
      .from("conditional_redirect_offers")
      .update({ status: "open" })
      .eq("id", offerId)
      .eq("creator_mandate_id", mandateId)
      .eq("status", "pending_creator_authorization")
      .select("id")
      .maybeSingle();
    transitionAccepted = Boolean(data);
  } else if (matcherInitial && candidate) {
    const { data } = await supabase
      .from("conditional_redirect_candidates")
      .update({
        status: "eligible",
        setup_succeeded_at: eventAt,
        stripe_event_created_at: eventAt,
        stripe_event_id: input.event.id,
      })
      .eq("id", candidate.id)
      .eq("offer_id", offerId)
      .eq("mandate_id", mandateId)
      .eq("status", "setup_pending")
      .select("id")
      .maybeSingle();
    transitionAccepted = Boolean(data);
  } else if (creatorRecovery) {
    const nextStatus = offer.winning_candidate_id
      ? "matched_settling"
      : "fallback_settling";
    const { data } = await supabase
      .from("conditional_redirect_offers")
      .update({
        status: nextStatus,
        recovery_ends_at: null,
        settlement_started_at: new Date().toISOString(),
      })
      .eq("id", offerId)
      .eq("creator_mandate_id", mandateId)
      .eq("status", "creator_recovery")
      .select("id")
      .maybeSingle();
    transitionAccepted = Boolean(data);
  } else if (matcherRecovery && candidate) {
    const { data: restoredCandidate } = await supabase
      .from("conditional_redirect_candidates")
      .update({
        status: "winner",
        recovery_ends_at: null,
        setup_succeeded_at: eventAt,
        stripe_event_created_at: eventAt,
        stripe_event_id: input.event.id,
      })
      .eq("id", candidate.id)
      .eq("status", "recovery")
      .select("id")
      .maybeSingle();
    if (restoredCandidate) {
      const { data: restoredOffer } = await supabase
        .from("conditional_redirect_offers")
        .update({
          status: "matched_settling",
          recovery_ends_at: null,
          settlement_started_at: new Date().toISOString(),
        })
        .eq("id", offerId)
        .eq("winning_candidate_id", candidate.id)
        .eq("status", "matcher_recovery")
        .select("id")
        .maybeSingle();
      transitionAccepted = Boolean(restoredOffer);
    }
  }

  if (!transitionAccepted) {
    await supabase
      .from("conditional_payment_mandates")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        failure_code: "authorization_transition_lost",
      })
      .eq("id", mandateId)
      .eq("status", "ready");
    return { handled: true as const, offerId, ready: false as const };
  }

  await recordAudit({
    actorProfileId: mandate.profile_id,
    actorKind: "stripe",
    eventType: "conditional_redirect_authorization_ready",
    objectType: "conditional_payment_mandate",
    objectId: String(mandate.id),
    details: {
      offerId,
      candidateId: candidate?.id ?? null,
      participantRole: mandate.participant_role,
      setupIntentId: input.setupIntent.id,
      stripeEventId: input.event.id,
      readyAt: eventAt,
      recovery: creatorRecovery || matcherRecovery,
    },
  });

  if (creatorRecovery || matcherRecovery) {
    const { settleConditionalRedirectOffer } = await import(
      "@/lib/payments/conditional-redirect-settlement"
    );
    await settleConditionalRedirectOffer(offerId);
  }

  return { handled: true as const, offerId, ready: true as const };
}
