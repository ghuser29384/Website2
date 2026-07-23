import { createHash, randomUUID } from "node:crypto";
import type Stripe from "stripe";

import { getStripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";
import { makeConditionalIdempotencyKey } from "@/lib/payments/conditional-state";
import { getConditionalPaymentReadiness } from "@/lib/payments/conditional-readiness";

type ParticipantRole = "creator" | "matcher";
type ChargeFailureKind = "definitive" | "pending";

class ConditionalRedirectChargeError extends Error {
  constructor(
    message: string,
    readonly kind: ChargeFailureKind,
    readonly status: string,
  ) {
    super(message);
    this.name = "ConditionalRedirectChargeError";
  }
}

function db() {
  return createServiceClient() as any;
}

function settlementBranch(offer: Record<string, any>) {
  return offer.status === "matched_settling" ? "matched" : "fallback";
}

function transferGroup(offerId: string, branch: string) {
  return `mt_redirect_${offerId.replaceAll("-", "")}_${branch}`;
}

function settlementConditionHash(offerHash: string, branch: string) {
  return createHash("sha256")
    .update(`${offerHash}:${branch}`)
    .digest("hex");
}

async function recordAudit(input: {
  eventType: string;
  objectType: string;
  objectId: string;
  details?: Record<string, unknown>;
  actorProfileId?: string | null;
}) {
  const { error } = await db().from("conditional_payment_audit_events").insert({
    actor_profile_id: input.actorProfileId ?? null,
    actor_kind: "system",
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

async function getOrCreateBatch(input: {
  offer: Record<string, any>;
  destinationId: string;
  isMatched: boolean;
}) {
  const supabase = db();
  const expectedTotal =
    Number(input.offer.creator_amount_cents) +
    (input.isMatched ? Number(input.offer.matcher_amount_cents) : 0);
  const branch = input.isMatched ? "matched" : "fallback";
  const group = transferGroup(String(input.offer.id), branch);
  const batchConditionHash = settlementConditionHash(
    String(input.offer.condition_hash),
    branch,
  );
  const { error: insertError } = await supabase
    .from("conditional_settlement_batches")
    .upsert(
      {
        purpose: "conditional_redirect",
        subject_type: "conditional_redirect_offer",
        subject_id: input.offer.id,
        condition_hash: batchConditionHash,
        condition_snapshot: {
          schemaVersion: "conditional-redirect-settlement-v1",
          branch,
          offerConditionHash: input.offer.condition_hash,
          separateDonorLegs: true,
        },
        destination_id: input.destinationId,
        owner_destination_id: input.destinationId,
        counterparty_destination_id: input.destinationId,
        livemode: input.offer.livemode,
        currency: "usd",
        total_amount_cents: expectedTotal,
        expected_mandate_count: input.isMatched ? 2 : 1,
        transfer_group: group,
        status: "ready",
      },
      {
        onConflict: "purpose,subject_type,subject_id,condition_hash,livemode",
        ignoreDuplicates: true,
      },
    );
  if (insertError) {
    throw new Error(`Unable to create settlement batch: ${insertError.message}`);
  }

  const { data: batch, error } = await supabase
    .from("conditional_settlement_batches")
    .select("*")
    .eq("purpose", "conditional_redirect")
    .eq("subject_type", "conditional_redirect_offer")
    .eq("subject_id", input.offer.id)
    .eq("condition_hash", batchConditionHash)
    .eq("livemode", input.offer.livemode)
    .single();
  if (error || !batch) {
    throw new Error(`Unable to read settlement batch: ${error?.message ?? "not found"}`);
  }
  if (
    String(batch.destination_id) !== input.destinationId ||
    Number(batch.total_amount_cents) !== expectedTotal ||
    Number(batch.expected_mandate_count) !== (input.isMatched ? 2 : 1) ||
    String(batch.transfer_group) !== group
  ) {
    throw new Error("The existing settlement batch does not match the frozen outcome.");
  }
  return batch as Record<string, any>;
}

async function claimBatch(batchId: string) {
  const processingToken = randomUUID();
  const { data, error } = await db().rpc("claim_conditional_settlement_batch", {
    p_batch_id: batchId,
    p_processing_token: processingToken,
  });
  if (error) throw new Error(`Unable to claim settlement batch: ${error.message}`);
  return Boolean(data);
}

async function releaseBatch(
  batchId: string,
  update: Record<string, unknown>,
) {
  const { error } = await db()
    .from("conditional_settlement_batches")
    .update({
      ...update,
      processing_token: null,
      processing_started_at: null,
    })
    .eq("id", batchId);
  if (error) throw new Error(`Unable to release settlement batch: ${error.message}`);
}

function ensureMandateMatches(input: {
  mandate: Record<string, any> | undefined;
  offer: Record<string, any>;
  profileId: string;
  role: ParticipantRole;
  amountCents: number;
}) {
  const mandate = input.mandate;
  if (!mandate) throw new Error(`The ${input.role} authorization is missing.`);
  if (
    String(mandate.profile_id) !== input.profileId ||
    String(mandate.participant_role) !== input.role ||
    String(mandate.subject_id) !== String(input.offer.id) ||
    String(mandate.condition_hash) !== String(input.offer.condition_hash) ||
    Boolean(mandate.livemode) !== Boolean(input.offer.livemode) ||
    Number(mandate.amount_cents) !== input.amountCents ||
    String(mandate.currency) !== "usd"
  ) {
    throw new Error(`The ${input.role} authorization does not match the frozen offer.`);
  }
  if (!mandate.stripe_customer_id || !mandate.stripe_payment_method_id) {
    throw new Error(`The ${input.role} authorization is missing its saved payment method.`);
  }
  return mandate;
}

async function getOrCreateAttempt(input: {
  offer: Record<string, any>;
  mandate: Record<string, any>;
  role: ParticipantRole;
  batchId: string;
  amountCents: number;
}) {
  const supabase = db();
  const { data: rows, error } = await supabase
    .from("conditional_payment_attempts")
    .select("*")
    .eq("mandate_id", input.mandate.id)
    .order("attempt_number", { ascending: false })
    .limit(1);
  if (error) throw new Error(`Unable to inspect prior charge attempts: ${error.message}`);
  const latest = (rows?.[0] ?? null) as Record<string, any> | null;

  if (latest) {
    if (
      Number(latest.amount_cents) !== input.amountCents ||
      String(latest.currency) !== "usd"
    ) {
      throw new Error("A prior charge attempt does not match the frozen amount.");
    }
    if (latest.status === "succeeded") return latest;
    if (["created", "processing"].includes(String(latest.status))) return latest;
    if (latest.status === "disputed") {
      throw new ConditionalRedirectChargeError(
        `The ${input.role} charge is disputed and requires operator review.`,
        "definitive",
        "disputed",
      );
    }
    if (
      ["failed", "requires_action"].includes(String(latest.status)) &&
      String(latest.authorization_consented_at ?? "") ===
        String(input.mandate.consented_at)
    ) {
      throw new ConditionalRedirectChargeError(
        `The ${input.role} charge needs explicit participant action.`,
        "definitive",
        String(latest.status),
      );
    }
  }

  const attemptNumber = Number(latest?.attempt_number ?? 0) + 1;
  const idempotencyKey = makeConditionalIdempotencyKey([
    "conditional-redirect-charge",
    input.offer.id,
    input.role,
    input.mandate.id,
    attemptNumber,
    input.mandate.consented_at,
  ]);
  const { data: inserted, error: insertError } = await supabase
    .from("conditional_payment_attempts")
    .insert({
      mandate_id: input.mandate.id,
      settlement_batch_id: input.batchId,
      attempt_number: attemptNumber,
      idempotency_key: idempotencyKey,
      authorization_consented_at: input.mandate.consented_at,
      amount_cents: input.amountCents,
      currency: "usd",
      status: "created",
    })
    .select("*")
    .single();
  if (insertError || !inserted) {
    throw new Error(
      `Unable to create charge attempt: ${insertError?.message ?? "unknown error"}`,
    );
  }
  return inserted as Record<string, any>;
}

function paymentIntentChargeId(intent: Stripe.PaymentIntent) {
  return typeof intent.latest_charge === "string"
    ? intent.latest_charge
    : intent.latest_charge?.id ?? null;
}

function paymentIntentFailure(intent: Stripe.PaymentIntent) {
  const error = intent.last_payment_error;
  return {
    code: error?.code ?? `payment_intent_${intent.status}`,
    declineCode: error?.decline_code ?? null,
    message: error?.message ?? `Stripe returned ${intent.status}.`,
  };
}

async function persistPaymentIntent(input: {
  attempt: Record<string, any>;
  mandate: Record<string, any>;
  offer: Record<string, any>;
  role: ParticipantRole;
  profileId: string;
  destinationId: string;
  intent: Stripe.PaymentIntent;
}) {
  const supabase = db();
  const chargeId = paymentIntentChargeId(input.intent);
  if (input.intent.status === "succeeded" && chargeId) {
    const charge = await getStripe().charges.retrieve(chargeId);
    const { data: attempt, error } = await supabase
      .from("conditional_payment_attempts")
      .update({
        stripe_payment_intent_id: input.intent.id,
        stripe_charge_id: chargeId,
        status: "succeeded",
        receipt_url: charge.refunded ? null : charge.receipt_url,
        failure_code: null,
        decline_code: null,
        failure_message: null,
      })
      .eq("id", input.attempt.id)
      .select("*")
      .single();
    if (error || !attempt) {
      throw new Error(
        `Stripe charged the ${input.role}, but the ledger update failed: ${
          error?.message ?? "unknown error"
        }`,
      );
    }
    const { error: mandateError } = await supabase
      .from("conditional_payment_mandates")
      .update({ status: "charged", failure_code: null, failure_message: null })
      .eq("id", input.mandate.id)
      .neq("status", "disputed");
    const { error: legError } = await supabase
      .from("conditional_redirect_settlement_legs")
      .upsert(
        {
          offer_id: input.offer.id,
          participant_role: input.role,
          profile_id: input.profileId,
          mandate_id: input.mandate.id,
          destination_id: input.destinationId,
          payment_attempt_id: attempt.id,
          amount_cents: Number(attempt.amount_cents),
          status: "charged",
          receipt_url: attempt.receipt_url,
          failure_code: null,
          failure_message: null,
        },
        { onConflict: "offer_id,participant_role" },
      );
    if (mandateError || legError) {
      throw new Error(
        `Stripe charged the ${input.role}, but participant accounting failed: ${
          mandateError?.message ?? legError?.message ?? "unknown error"
        }`,
      );
    }
    return attempt as Record<string, any>;
  }

  const failure = paymentIntentFailure(input.intent);
  const definitive = [
    "requires_action",
    "requires_payment_method",
    "canceled",
  ].includes(input.intent.status);
  const attemptStatus =
    input.intent.status === "requires_action" ? "requires_action" : definitive ? "failed" : "processing";
  await Promise.all([
    supabase
      .from("conditional_payment_attempts")
      .update({
        stripe_payment_intent_id: input.intent.id,
        stripe_charge_id: chargeId,
        status: attemptStatus,
        failure_code: failure.code,
        decline_code: failure.declineCode,
        failure_message: failure.message,
      })
      .eq("id", input.attempt.id),
    supabase
      .from("conditional_payment_mandates")
      .update({
        status:
          attemptStatus === "processing"
            ? "charge_pending"
            : attemptStatus,
        failure_code: failure.code,
        failure_message: failure.message,
      })
      .eq("id", input.mandate.id)
      .neq("status", "disputed"),
    supabase
      .from("conditional_redirect_settlement_legs")
      .upsert(
        {
          offer_id: input.offer.id,
          participant_role: input.role,
          profile_id: input.profileId,
          mandate_id: input.mandate.id,
          destination_id: input.destinationId,
          payment_attempt_id: input.attempt.id,
          amount_cents: Number(input.attempt.amount_cents),
          status:
            attemptStatus === "requires_action"
              ? "requires_action"
              : attemptStatus === "failed"
                ? "failed"
                : "charging",
          failure_code: failure.code,
          failure_message: failure.message,
        },
        { onConflict: "offer_id,participant_role" },
      ),
  ]);
  throw new ConditionalRedirectChargeError(
    failure.message,
    definitive ? "definitive" : "pending",
    attemptStatus,
  );
}

function stripeErrorIsDefinitive(error: any) {
  return (
    error?.type === "StripeCardError" ||
    [
      "authentication_required",
      "card_declined",
      "expired_card",
      "incorrect_cvc",
      "incorrect_number",
    ].includes(String(error?.code ?? ""))
  );
}

async function chargeLeg(input: {
  offer: Record<string, any>;
  profileId: string;
  role: ParticipantRole;
  mandate: Record<string, any>;
  amountCents: number;
  destinationId: string;
  batchId: string;
}) {
  const attempt = await getOrCreateAttempt(input);
  if (attempt.status === "succeeded") return attempt;

  await Promise.all([
    db()
      .from("conditional_payment_attempts")
      .update({ status: "processing" })
      .eq("id", attempt.id)
      .in("status", ["created", "processing"]),
    db()
      .from("conditional_payment_mandates")
      .update({ status: "charge_pending", failure_code: null, failure_message: null })
      .eq("id", input.mandate.id)
      .in("status", ["ready", "charge_pending", "charged", "refunded"]),
  ]);

  if (attempt.stripe_payment_intent_id) {
    try {
      const existing = await getStripe().paymentIntents.retrieve(
        String(attempt.stripe_payment_intent_id),
      );
      return persistPaymentIntent({ ...input, attempt, intent: existing });
    } catch (error) {
      const paymentIntent = (error as any)?.payment_intent as
        | Stripe.PaymentIntent
        | undefined;
      if (paymentIntent) {
        return persistPaymentIntent({ ...input, attempt, intent: paymentIntent });
      }
      throw error;
    }
  }

  try {
    const intent = await getStripe().paymentIntents.create(
      {
        amount: input.amountCents,
        currency: "usd",
        customer: String(input.mandate.stripe_customer_id),
        payment_method: String(input.mandate.stripe_payment_method_id),
        confirm: true,
        off_session: true,
        transfer_group: transferGroup(
          String(input.offer.id),
          settlementBranch(input.offer),
        ),
        metadata: {
          system: "conditional_payments",
          purpose: "conditional_redirect",
          subject_id: String(input.offer.id),
          offer_id: String(input.offer.id),
          settlement_batch_id: input.batchId,
          payment_attempt_id: String(attempt.id),
          mandate_id: String(input.mandate.id),
          participant_role: input.role,
          condition_hash: String(input.offer.condition_hash),
        },
      },
      { idempotencyKey: String(attempt.idempotency_key) },
    );
    return persistPaymentIntent({ ...input, attempt, intent });
  } catch (error) {
    if (error instanceof ConditionalRedirectChargeError) throw error;
    const paymentIntent = (error as any)?.payment_intent as
      | Stripe.PaymentIntent
      | undefined;
    if (paymentIntent) {
      return persistPaymentIntent({ ...input, attempt, intent: paymentIntent });
    }

    const definitive = stripeErrorIsDefinitive(error);
    const stripeError = error as any;
    const status = definitive ? "failed" : "processing";
    const message =
      stripeError?.message ??
      (definitive
        ? `The ${input.role} charge was declined.`
        : "Stripe returned an uncertain result.");
    await Promise.all([
      db()
        .from("conditional_payment_attempts")
        .update({
          status,
          failure_code: stripeError?.code ?? (definitive ? "card_declined" : "stripe_uncertain"),
          decline_code: stripeError?.decline_code ?? null,
          failure_message: message,
        })
        .eq("id", attempt.id),
      db()
        .from("conditional_payment_mandates")
        .update({
          status: definitive ? "failed" : "charge_pending",
          failure_code: stripeError?.code ?? (definitive ? "card_declined" : "stripe_uncertain"),
          failure_message: message,
        })
        .eq("id", input.mandate.id)
        .neq("status", "disputed"),
    ]);
    throw new ConditionalRedirectChargeError(
      message,
      definitive ? "definitive" : "pending",
      status,
    );
  }
}

async function refundAttempt(
  attempt: Record<string, any>,
  offerId: string,
  role: ParticipantRole,
) {
  const supabase = db();
  const { data: current, error } = await supabase
    .from("conditional_payment_attempts")
    .select("*")
    .eq("id", attempt.id)
    .single();
  if (error || !current) {
    throw new Error(`Unable to read the charge before refund: ${error?.message ?? "not found"}`);
  }
  if (
    current.status === "refunded" &&
    Number(current.refunded_amount_cents) >= Number(current.amount_cents)
  ) {
    return;
  }
  if (!current.stripe_payment_intent_id || current.status !== "succeeded") return;

  const refund = await getStripe().refunds.create(
    {
      payment_intent: String(current.stripe_payment_intent_id),
      reason: "requested_by_customer",
      metadata: {
        system: "conditional_payments",
        purpose: "conditional_redirect_compensation",
        offer_id: offerId,
        payment_attempt_id: String(current.id),
        mandate_id: String(current.mandate_id),
        participant_role: role,
      },
    },
    {
      idempotencyKey: makeConditionalIdempotencyKey([
        "conditional-redirect-refund",
        offerId,
        role,
        current.id,
      ]),
    },
  );
  if (refund.status !== "succeeded") {
    throw new Error(`Compensating refund ${refund.id} is ${refund.status}.`);
  }
  const { error: attemptError } = await supabase
    .from("conditional_payment_attempts")
    .update({
      status: "refunded",
      refunded_amount_cents: Number(current.amount_cents),
      failure_message: `Compensating refund ${refund.id} succeeded.`,
    })
    .eq("id", current.id);
  const { error: mandateError } = await supabase
    .from("conditional_payment_mandates")
    .update({
      status: "refunded",
      failure_message: "The paired settlement did not complete, so this charge was refunded.",
    })
    .eq("id", current.mandate_id)
    .neq("status", "disputed");
  const { error: legError } = await supabase
    .from("conditional_redirect_settlement_legs")
    .update({ status: "refunded" })
    .eq("offer_id", offerId)
    .eq("participant_role", role);
  if (attemptError || mandateError || legError) {
    throw new Error(
      `Refund succeeded but its ledger update failed: ${
        attemptError?.message ?? mandateError?.message ?? legError?.message
      }`,
    );
  }
}

async function transferLeg(input: {
  offer: Record<string, any>;
  role: ParticipantRole;
  attempt: Record<string, any>;
  mandate: Record<string, any>;
  destination: Record<string, any>;
  batchId: string;
}) {
  const supabase = db();
  const { data: existing, error: existingError } = await supabase
    .from("conditional_settlement_transfers")
    .select("*")
    .eq("settlement_batch_id", input.batchId)
    .eq("payment_attempt_id", input.attempt.id)
    .maybeSingle();
  if (existingError) {
    throw new Error(`Unable to inspect charity transfer: ${existingError.message}`);
  }
  if (existing?.status === "transferred" && existing.stripe_transfer_id) {
    return existing as Record<string, any>;
  }
  if (existing?.status === "reversed") {
    throw new Error("This charge was already transferred and reversed.");
  }

  const transferId = existing?.id ?? randomUUID();
  const idempotencyKey = makeConditionalIdempotencyKey([
    "conditional-redirect-transfer",
    input.offer.id,
    input.role,
    input.attempt.id,
  ]);
  if (!existing) {
    const { error } = await supabase
      .from("conditional_settlement_transfers")
      .insert({
        id: transferId,
        settlement_batch_id: input.batchId,
        mandate_id: input.mandate.id,
        payment_attempt_id: input.attempt.id,
        destination_id: input.destination.id,
        amount_cents: Number(input.attempt.amount_cents),
        currency: "usd",
        idempotency_key: idempotencyKey,
        status: "created",
      });
    if (error) throw new Error(`Unable to create charity transfer ledger: ${error.message}`);
  }

  const transfer = await getStripe().transfers.create(
    {
      amount: Number(input.attempt.amount_cents),
      currency: "usd",
      destination: String(input.destination.stripe_connected_account_id),
      source_transaction: String(input.attempt.stripe_charge_id),
      transfer_group: transferGroup(
        String(input.offer.id),
        settlementBranch(input.offer),
      ),
      metadata: {
        system: "conditional_payments",
        purpose: "conditional_redirect",
        offer_id: String(input.offer.id),
        participant_role: input.role,
        settlement_transfer_id: transferId,
        payment_attempt_id: String(input.attempt.id),
      },
    },
    { idempotencyKey },
  );
  const { data: row, error } = await supabase
    .from("conditional_settlement_transfers")
    .update({ stripe_transfer_id: transfer.id, status: "transferred" })
    .eq("id", transferId)
    .eq("status", "created")
    .select("*")
    .maybeSingle();
  if (error || !row) {
    let reversalMessage = "";
    try {
      const reversal = await getStripe().transfers.createReversal(
        transfer.id,
        {},
        {
          idempotencyKey: makeConditionalIdempotencyKey([
            "conditional-redirect-unrecorded-transfer-reversal",
            transfer.id,
          ]),
        },
      );
      reversalMessage = ` Transfer ${transfer.id} was reversed as ${reversal.id}.`;
    } catch (reversalError) {
      reversalMessage = ` Transfer ${transfer.id} also needs operator reversal: ${
        reversalError instanceof Error ? reversalError.message : "unknown error"
      }.`;
    }
    throw new Error(
      `Stripe transferred funds but the ledger update failed: ${
        error?.message ?? "unknown error"
      }.${reversalMessage}`,
    );
  }
  const { error: legError } = await supabase
    .from("conditional_redirect_settlement_legs")
    .update({ settlement_transfer_id: row.id, status: "transferred" })
    .eq("offer_id", input.offer.id)
    .eq("participant_role", input.role);
  if (legError) {
    throw new Error(`Unable to link the charity transfer: ${legError.message}`);
  }
  return row as Record<string, any>;
}

async function reverseTransfer(
  transferRow: Record<string, any>,
  offerId: string,
  role: ParticipantRole,
) {
  if (!transferRow.stripe_transfer_id || transferRow.status !== "transferred") return;
  const reversal = await getStripe().transfers.createReversal(
    String(transferRow.stripe_transfer_id),
    {},
    {
      idempotencyKey: makeConditionalIdempotencyKey([
        "conditional-redirect-transfer-reversal",
        offerId,
        role,
        transferRow.id,
      ]),
    },
  );
  const { error } = await db()
    .from("conditional_settlement_transfers")
    .update({
      status: "reversed",
      stripe_transfer_reversal_id: reversal.id,
    })
    .eq("id", transferRow.id);
  if (error) throw new Error(`Transfer reversal ledger failed: ${error.message}`);
  await db()
    .from("conditional_redirect_settlement_legs")
    .update({ status: "refunding" })
    .eq("offer_id", offerId)
    .eq("participant_role", role);
}

export async function promoteConditionalRedirectBackupOrFallback(offerId: string) {
  const { data, error } = await db().rpc(
    "promote_conditional_redirect_backup_or_fallback",
    { p_offer_id: offerId },
  );
  if (error) throw new Error(`Unable to promote a backup matcher: ${error.message}`);
  return data ? { status: "promoted", candidateId: String(data) } : { status: "fallback" };
}

async function recordPendingCharge(
  batchId: string,
  error: ConditionalRedirectChargeError,
) {
  await releaseBatch(batchId, {
    status: "failed",
    failure_code: "stripe_charge_pending",
    failure_message: error.message,
    next_retry_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  });
}

export async function settleConditionalRedirectOffer(offerId: string) {
  const readiness = await getConditionalPaymentReadiness();
  if (!readiness.canSettle) {
    throw new Error(`Settlement is gated: ${readiness.blockers.join(" ")}`);
  }
  const supabase = db();
  const { data: offer, error } = await supabase
    .from("conditional_redirect_offers")
    .select("*")
    .eq("id", offerId)
    .maybeSingle();
  if (error || !offer) throw new Error(error?.message ?? "Conditional redirect not found.");
  if (!["matched_settling", "fallback_settling"].includes(String(offer.status))) {
    return { status: String(offer.status), offerId };
  }

  const isMatched = offer.status === "matched_settling";
  let matcherCandidate: Record<string, any> | null = null;
  if (isMatched) {
    const { data, error: candidateError } = await supabase
      .from("conditional_redirect_candidates")
      .select("*")
      .eq("id", offer.winning_candidate_id)
      .eq("offer_id", offer.id)
      .maybeSingle();
    if (candidateError || !data) {
      throw new Error(candidateError?.message ?? "Winning matcher authorization is missing.");
    }
    matcherCandidate = data as Record<string, any>;
  }

  const mandateIds = [
    String(offer.creator_mandate_id),
    ...(matcherCandidate ? [String(matcherCandidate.mandate_id)] : []),
  ];
  const { data: mandates, error: mandateError } = await supabase
    .from("conditional_payment_mandates")
    .select("*")
    .in("id", mandateIds);
  if (mandateError) throw new Error(`Unable to read payment mandates: ${mandateError.message}`);
  const mandateById = new Map<string, Record<string, any>>(
    (mandates ?? []).map(
      (row: any) =>
        [String(row.id), row as Record<string, any>] as [
          string,
          Record<string, any>,
        ],
    ),
  );
  const creatorMandate = ensureMandateMatches({
    mandate: mandateById.get(String(offer.creator_mandate_id)),
    offer,
    profileId: String(offer.creator_profile_id),
    role: "creator",
    amountCents: Number(offer.creator_amount_cents),
  });
  const matcherMandate =
    isMatched && matcherCandidate
      ? ensureMandateMatches({
          mandate: mandateById.get(String(matcherCandidate.mandate_id)),
          offer,
          profileId: String(matcherCandidate.matcher_profile_id),
          role: "matcher",
          amountCents: Number(offer.matcher_amount_cents),
        })
      : null;

  const destinationId = isMatched
    ? String(offer.matched_destination_id)
    : String(offer.fallback_destination_id);
  const { data: destination, error: destinationError } = await supabase
    .from("conditional_payment_destinations")
    .select("*")
    .eq("id", destinationId)
    .eq("status", "active")
    .eq("livemode", offer.livemode)
    .maybeSingle();
  if (destinationError || !destination) {
    throw new Error(destinationError?.message ?? "Approved charity destination is unavailable.");
  }

  const batch = await getOrCreateBatch({ offer, destinationId, isMatched });
  if (batch.status === "transferred") {
    const finalStatus = isMatched ? "matched_transferred" : "fallback_transferred";
    await supabase
      .from("conditional_redirect_offers")
      .update({ status: finalStatus, completed_at: batch.completed_at ?? new Date().toISOString() })
      .eq("id", offer.id)
      .in("status", ["matched_settling", "fallback_settling"]);
    return { status: finalStatus, offerId };
  }
  if (["refunding", "disputed", "cancelled"].includes(String(batch.status))) {
    await supabase
      .from("conditional_redirect_offers")
      .update({
        status: "operator_review",
        cancellation_reason: `Settlement batch is ${batch.status}.`,
      })
      .eq("id", offer.id)
      .in("status", ["matched_settling", "fallback_settling"]);
    return { status: "operator_review", offerId };
  }
  if (!(await claimBatch(String(batch.id)))) {
    return { status: "already_processing", offerId };
  }

  let matcherAttempt: Record<string, any> | null = null;
  if (isMatched && matcherCandidate && matcherMandate) {
    try {
      matcherAttempt = await chargeLeg({
        offer,
        role: "matcher",
        profileId: String(matcherCandidate.matcher_profile_id),
        mandate: matcherMandate,
        amountCents: Number(offer.matcher_amount_cents),
        destinationId,
        batchId: String(batch.id),
      });
    } catch (chargeError) {
      const error =
        chargeError instanceof ConditionalRedirectChargeError
          ? chargeError
          : new ConditionalRedirectChargeError(
              chargeError instanceof Error ? chargeError.message : "Matcher charge failed.",
              "pending",
              "processing",
            );
      if (error.kind === "pending") {
        await recordPendingCharge(String(batch.id), error);
        return { status: "matcher_charge_pending", offerId };
      }

      const priorRecoveries = Number(matcherCandidate.recovery_attempts ?? 0);
      if (priorRecoveries < 1) {
        const recoveryEndsAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        await Promise.all([
          supabase
            .from("conditional_redirect_candidates")
            .update({
              status: "recovery",
              recovery_ends_at: recoveryEndsAt,
              recovery_attempts: priorRecoveries + 1,
            })
            .eq("id", matcherCandidate.id),
          supabase
            .from("conditional_redirect_offers")
            .update({
              status: "matcher_recovery",
              recovery_ends_at: recoveryEndsAt,
            })
            .eq("id", offer.id)
            .eq("status", "matched_settling"),
        ]);
        await releaseBatch(String(batch.id), {
          status: error.status === "requires_action" ? "requires_action" : "failed",
          failure_code: "matcher_charge_failed",
          failure_message: error.message,
        });
        return { status: "matcher_recovery", offerId };
      }

      await Promise.all([
        supabase
          .from("conditional_redirect_candidates")
          .update({ status: "declined", recovery_ends_at: null })
          .eq("id", matcherCandidate.id),
        supabase
          .from("conditional_redirect_offers")
          .update({
            status: "matcher_recovery",
            recovery_ends_at: new Date().toISOString(),
          })
          .eq("id", offer.id)
          .eq("status", "matched_settling"),
      ]);
      await releaseBatch(String(batch.id), {
        status: "failed",
        failure_code: "matcher_recovery_failed",
        failure_message: error.message,
      });
      const promoted = await promoteConditionalRedirectBackupOrFallback(String(offer.id));
      return { status: promoted.status, offerId };
    }
  }

  let creatorAttempt: Record<string, any>;
  try {
    creatorAttempt = await chargeLeg({
      offer,
      role: "creator",
      profileId: String(offer.creator_profile_id),
      mandate: creatorMandate,
      amountCents: Number(offer.creator_amount_cents),
      destinationId,
      batchId: String(batch.id),
    });
  } catch (chargeError) {
    const error =
      chargeError instanceof ConditionalRedirectChargeError
        ? chargeError
        : new ConditionalRedirectChargeError(
            chargeError instanceof Error ? chargeError.message : "Creator charge failed.",
            "pending",
            "processing",
          );
    if (error.kind === "pending") {
      await recordPendingCharge(String(batch.id), error);
      return { status: "creator_charge_pending", offerId };
    }

    if (matcherAttempt) {
      try {
        await refundAttempt(matcherAttempt, String(offer.id), "matcher");
      } catch (refundError) {
        await Promise.all([
          releaseBatch(String(batch.id), {
            status: "refunding",
            failure_code: "matcher_refund_failed",
            failure_message:
              refundError instanceof Error ? refundError.message : "Matcher refund failed.",
          }),
          supabase
            .from("conditional_redirect_offers")
            .update({
              status: "operator_review",
              cancellation_reason: "Matcher refund failed after the creator charge failed.",
            })
            .eq("id", offer.id),
        ]);
        throw chargeError;
      }
    }

    const priorRecoveries = Number(offer.creator_recovery_attempts ?? 0);
    if (priorRecoveries < 1) {
      const recoveryEndsAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      await supabase
        .from("conditional_redirect_offers")
        .update({
          status: "creator_recovery",
          recovery_ends_at: recoveryEndsAt,
          creator_recovery_attempts: priorRecoveries + 1,
        })
        .eq("id", offer.id)
        .in("status", ["matched_settling", "fallback_settling"]);
      await releaseBatch(String(batch.id), {
        status: "refunded",
        failure_code: "creator_charge_failed",
        failure_message: error.message,
      });
      return { status: "creator_recovery", offerId };
    }

    await Promise.all([
      supabase
        .from("conditional_redirect_offers")
        .update({
          status: "cancelled",
          cancellation_reason:
            "Creator charge failed after the one explicit reauthorization attempt.",
          completed_at: new Date().toISOString(),
        })
        .eq("id", offer.id)
        .in("status", ["matched_settling", "fallback_settling"]),
      releaseBatch(String(batch.id), {
        status: "refunded",
        failure_code: "creator_recovery_failed",
        failure_message: error.message,
        completed_at: new Date().toISOString(),
      }),
    ]);
    return { status: "cancelled", offerId };
  }

  let matcherTransfer: Record<string, any> | null = null;
  let creatorTransfer: Record<string, any> | null = null;
  try {
    if (matcherAttempt && matcherMandate) {
      matcherTransfer = await transferLeg({
        offer,
        role: "matcher",
        attempt: matcherAttempt,
        mandate: matcherMandate,
        destination,
        batchId: String(batch.id),
      });
    }
    creatorTransfer = await transferLeg({
      offer,
      role: "creator",
      attempt: creatorAttempt,
      mandate: creatorMandate,
      destination,
      batchId: String(batch.id),
    });
  } catch (transferError) {
    const reversals = await Promise.allSettled([
      creatorTransfer
        ? reverseTransfer(creatorTransfer, String(offer.id), "creator")
        : Promise.resolve(),
      matcherTransfer
        ? reverseTransfer(matcherTransfer, String(offer.id), "matcher")
        : Promise.resolve(),
    ]);
    const refunds = await Promise.allSettled([
      refundAttempt(creatorAttempt, String(offer.id), "creator"),
      matcherAttempt
        ? refundAttempt(matcherAttempt, String(offer.id), "matcher")
        : Promise.resolve(),
    ]);
    const failures = [
      ...reversals.filter((result) => result.status === "rejected"),
      ...refunds.filter((result) => result.status === "rejected"),
    ];
    await Promise.all([
      releaseBatch(String(batch.id), {
        status: failures.length ? "refunding" : "refunded",
        failure_code: "destination_transfer_failed",
        failure_message:
          transferError instanceof Error ? transferError.message : "Charity transfer failed.",
      }),
      supabase
        .from("conditional_redirect_offers")
        .update({
          status: "operator_review",
          cancellation_reason: JSON.stringify({
            reason: "destination_transfer_failed",
            compensationFailures: failures.length,
          }),
        })
        .eq("id", offer.id),
    ]);
    throw transferError;
  }

  const finalStatus = isMatched ? "matched_transferred" : "fallback_transferred";
  const completedAt = new Date().toISOString();
  await Promise.all([
    releaseBatch(String(batch.id), {
      status: "transferred",
      completed_at: completedAt,
      failure_code: null,
      failure_message: null,
      next_retry_at: null,
    }),
    supabase
      .from("conditional_redirect_offers")
      .update({ status: finalStatus, completed_at: completedAt })
      .eq("id", offer.id)
      .in("status", ["matched_settling", "fallback_settling"]),
    matcherCandidate
      ? supabase
          .from("conditional_redirect_candidates")
          .update({ status: "charged" })
          .eq("id", matcherCandidate.id)
      : Promise.resolve(),
  ]);
  await recordAudit({
    eventType: "conditional_redirect_transferred",
    objectType: "conditional_redirect_offer",
    objectId: String(offer.id),
    details: {
      batchId: batch.id,
      branch: isMatched ? "matched" : "fallback",
      creatorAttemptId: creatorAttempt.id,
      matcherAttemptId: matcherAttempt?.id ?? null,
      creatorTransferId: creatorTransfer?.id ?? null,
      matcherTransferId: matcherTransfer?.id ?? null,
    },
  });
  return { status: finalStatus, offerId };
}
