import { randomUUID } from "node:crypto";
import type Stripe from "stripe";

import { getStripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";
import {
  getConditionalPaymentsEnvironment,
  makeConditionalIdempotencyKey,
  participantAmountForDonationOffset,
} from "@/lib/payments/conditional-state";
import { getConditionalPaymentReadiness } from "@/lib/payments/conditional-readiness";
import { loadDonationOffsetPaymentContext } from "@/lib/payments/donation-offset-context";

interface ChargeResult {
  ok: boolean;
  captured: boolean;
  mandate: Record<string, any>;
  attempt: Record<string, any>;
  paymentIntentId: string | null;
  chargeId: string | null;
  status: string;
  failureCode?: string;
  failureMessage?: string;
}

export interface DonationOffsetSettlementResult {
  status:
    | "blocked"
    | "waiting_for_authorizations"
    | "already_processing"
    | "requires_action"
    | "failed"
    | "refunded"
    | "transferred";
  matchId: string;
  batchId?: string;
  message: string;
  blockers?: string[];
}

function getDb() {
  return createServiceClient() as any;
}

async function recordAudit(input: {
  eventType: string;
  objectType: string;
  objectId: string;
  details?: Record<string, unknown>;
  actorProfileId?: string | null;
  actorKind?: "participant" | "operator" | "system" | "stripe";
}) {
  const { error } = await getDb().from("conditional_payment_audit_events").insert({
    actor_profile_id: input.actorProfileId ?? null,
    actor_kind: input.actorKind ?? "system",
    event_type: input.eventType,
    object_type: input.objectType,
    object_id: input.objectId,
    details: input.details ?? {},
  });
  if (error) {
    console.error("[conditional-payments] audit write failed", {
      eventType: input.eventType,
      objectId: input.objectId,
      message: error.message,
    });
  }
}

function transferGroupFor(matchId: string, conditionHash: string) {
  return `mt_offset_${matchId.replaceAll("-", "").slice(0, 24)}_${conditionHash.slice(0, 16)}`;
}

async function getOrCreateSettlementBatch(input: {
  matchId: string;
  conditionHash: string;
  conditionSnapshot: Record<string, unknown>;
  destinationId: string;
  livemode: boolean;
  totalAmountCents: number;
}) {
  const supabase = getDb();
  const transferGroup = transferGroupFor(input.matchId, input.conditionHash);
  const { error: upsertError } = await supabase
    .from("conditional_settlement_batches")
    .upsert(
      {
        purpose: "donation_offset",
        subject_type: "donation_offset_match",
        subject_id: input.matchId,
        condition_hash: input.conditionHash,
        condition_snapshot: input.conditionSnapshot,
        destination_id: input.destinationId,
        livemode: input.livemode,
        currency: "usd",
        total_amount_cents: input.totalAmountCents,
        expected_mandate_count: 2,
        transfer_group: transferGroup,
        status: "pending_authorizations",
      },
      {
        onConflict: "purpose,subject_type,subject_id,condition_hash,livemode",
        ignoreDuplicates: true,
      },
    );

  if (upsertError) {
    throw new Error(`Unable to create the settlement batch: ${upsertError.message}`);
  }

  const { data: batch, error: batchError } = await supabase
    .from("conditional_settlement_batches")
    .select("*")
    .eq("purpose", "donation_offset")
    .eq("subject_type", "donation_offset_match")
    .eq("subject_id", input.matchId)
    .eq("condition_hash", input.conditionHash)
    .eq("livemode", input.livemode)
    .single();

  if (batchError || !batch) {
    throw new Error(
      `Unable to read the settlement batch: ${batchError?.message ?? "not found"}`,
    );
  }

  if (
    String(batch.destination_id) !== input.destinationId ||
    Number(batch.total_amount_cents) !== input.totalAmountCents ||
    String(batch.transfer_group) !== transferGroup
  ) {
    throw new Error("The existing settlement batch does not match the frozen condition.");
  }

  return batch as Record<string, any>;
}

async function loadReadyMandates(input: {
  matchId: string;
  conditionHash: string;
  livemode: boolean;
}) {
  const { data, error } = await getDb()
    .from("conditional_payment_mandates")
    .select("*")
    .eq("purpose", "donation_offset")
    .eq("subject_type", "donation_offset_match")
    .eq("subject_id", input.matchId)
    .eq("condition_hash", input.conditionHash)
    .eq("livemode", input.livemode)
    .in("participant_role", ["owner", "counterparty"])
    .in("status", ["ready", "charge_pending", "charged"])
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Unable to read payment mandates: ${error.message}`);
  }

  const rows = (data ?? []) as Array<Record<string, any>>;
  const byRole = new Map(rows.map((row) => [String(row.participant_role), row]));
  return {
    owner: byRole.get("owner") ?? null,
    counterparty: byRole.get("counterparty") ?? null,
  };
}

async function nextAttemptNumber(mandateId: string) {
  const { data, error } = await getDb()
    .from("conditional_payment_attempts")
    .select("attempt_number")
    .eq("mandate_id", mandateId)
    .order("attempt_number", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(`Unable to number the payment attempt: ${error.message}`);
  }
  return Number(data?.[0]?.attempt_number ?? 0) + 1;
}

function paymentIntentIdentifiers(paymentIntent: Stripe.PaymentIntent | null | undefined) {
  if (!paymentIntent) {
    return { paymentIntentId: null, chargeId: null };
  }
  const latestCharge = paymentIntent.latest_charge;
  return {
    paymentIntentId: paymentIntent.id,
    chargeId:
      typeof latestCharge === "string" ? latestCharge : latestCharge?.id ?? null,
  };
}

function paymentIntentFailure(paymentIntent: Stripe.PaymentIntent) {
  const lastError = paymentIntent.last_payment_error;
  return {
    failureCode: String(lastError?.code ?? paymentIntent.status),
    declineCode: lastError?.decline_code ?? null,
    failureMessage: lastError?.message ?? `PaymentIntent ended in ${paymentIntent.status}.`,
  };
}

function stripeRequestFailure(error: unknown) {
  const stripeError = error as any;
  return {
    paymentIntent: (stripeError?.payment_intent as Stripe.PaymentIntent | undefined) ?? null,
    failureCode: String(stripeError?.code ?? "stripe_request_uncertain"),
    declineCode: stripeError?.decline_code ? String(stripeError.decline_code) : null,
    failureMessage: String(
      stripeError?.message ?? "Stripe did not return a conclusive payment result.",
    ),
  };
}

async function getOrCreateChargeAttempt(input: {
  mandate: Record<string, any>;
  batch: Record<string, any>;
}) {
  const supabase = getDb();
  const idempotencyKey = makeConditionalIdempotencyKey([
    "offset-charge",
    input.batch.id,
    input.mandate.id,
    input.mandate.stripe_payment_method_id,
  ]);
  const { data: existing, error: existingError } = await supabase
    .from("conditional_payment_attempts")
    .select("*")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Unable to read the previous charge attempt: ${existingError.message}`);
  }
  if (existing) {
    if (
      String(existing.mandate_id) !== String(input.mandate.id) ||
      String(existing.settlement_batch_id) !== String(input.batch.id) ||
      Number(existing.amount_cents) !== Number(input.mandate.amount_cents) ||
      String(existing.currency) !== String(input.mandate.currency)
    ) {
      throw new Error("The replay-safe charge attempt does not match the current mandate.");
    }
    return existing as Record<string, any>;
  }

  const attemptNumber = await nextAttemptNumber(String(input.mandate.id));
  const { data: inserted, error: insertError } = await supabase
    .from("conditional_payment_attempts")
    .insert({
      mandate_id: input.mandate.id,
      settlement_batch_id: input.batch.id,
      attempt_number: attemptNumber,
      idempotency_key: idempotencyKey,
      amount_cents: input.mandate.amount_cents,
      currency: input.mandate.currency,
      status: "created",
    })
    .select("*")
    .single();

  if (!insertError && inserted) {
    return inserted as Record<string, any>;
  }
  if (insertError?.code === "23505") {
    const { data: raced, error: racedError } = await supabase
      .from("conditional_payment_attempts")
      .select("*")
      .eq("idempotency_key", idempotencyKey)
      .single();
    if (!racedError && raced) {
      return raced as Record<string, any>;
    }
  }

  throw new Error(
    `Unable to create the charge attempt: ${insertError?.message ?? "unknown error"}`,
  );
}

async function updateAttemptAndMandateForPaymentIntent(input: {
  paymentIntent: Stripe.PaymentIntent;
  attempt: Record<string, any>;
  mandate: Record<string, any>;
}): Promise<ChargeResult> {
  const { paymentIntent, attempt, mandate } = input;
  const identifiers = paymentIntentIdentifiers(paymentIntent);
  const supabase = getDb();

  if (paymentIntent.status === "succeeded" && identifiers.chargeId) {
    let receiptUrl: string | null = null;
    try {
      const charge = await getStripe().charges.retrieve(identifiers.chargeId);
      receiptUrl = charge.receipt_url ?? null;
    } catch {
      // Receipt retrieval is non-critical; the charge and signed webhook remain authoritative.
    }

    const { data: updatedAttempt, error: attemptError } = await supabase
      .from("conditional_payment_attempts")
      .update({
        stripe_payment_intent_id: paymentIntent.id,
        stripe_charge_id: identifiers.chargeId,
        status: "succeeded",
        receipt_url: receiptUrl,
        failure_code: null,
        decline_code: null,
        failure_message: null,
      })
      .eq("id", attempt.id)
      .select("*")
      .single();
    const { error: mandateError } = await supabase
      .from("conditional_payment_mandates")
      .update({ status: "charged", failure_code: null, failure_message: null })
      .eq("id", mandate.id)
      .in("status", ["ready", "charge_pending", "charged"]);

    if (attemptError || !updatedAttempt || mandateError) {
      return {
        ok: false,
        captured: true,
        mandate,
        attempt,
        ...identifiers,
        status: "ledger_error",
        failureCode: "captured_ledger_update_failed",
        failureMessage: `Stripe captured the charge but the local ledger update failed: ${
          attemptError?.message ?? mandateError?.message ?? "unknown database error"
        }`,
      };
    }

    await recordAudit({
      eventType: "offset_participant_charged",
      objectType: "conditional_payment_attempt",
      objectId: String(updatedAttempt.id),
      actorProfileId: mandate.profile_id,
      actorKind: "system",
      details: {
        batchId: attempt.settlement_batch_id,
        mandateId: mandate.id,
        participantRole: mandate.participant_role,
        amountCents: mandate.amount_cents,
        paymentIntentId: paymentIntent.id,
        chargeId: identifiers.chargeId,
      },
    });

    return {
      ok: true,
      captured: true,
      mandate,
      attempt: updatedAttempt,
      ...identifiers,
      status: "succeeded",
    };
  }

  const failure = paymentIntentFailure(paymentIntent);
  const status =
    paymentIntent.status === "requires_action"
      ? "requires_action"
      : paymentIntent.status === "processing"
        ? "processing"
        : "failed";
  const { error: attemptError } = await supabase
    .from("conditional_payment_attempts")
    .update({
      stripe_payment_intent_id: paymentIntent.id,
      stripe_charge_id: identifiers.chargeId,
      status,
      failure_code: failure.failureCode,
      decline_code: failure.declineCode,
      failure_message: failure.failureMessage,
    })
    .eq("id", attempt.id);
  const { error: mandateError } = await supabase
    .from("conditional_payment_mandates")
    .update({
      status: status === "processing" ? "charge_pending" : status,
      failure_code: failure.failureCode,
      failure_message: failure.failureMessage,
    })
    .eq("id", mandate.id)
    .neq("status", "refunded")
    .neq("status", "disputed");

  if (attemptError || mandateError) {
    throw new Error(
      `Unable to record the Stripe payment result: ${
        attemptError?.message ?? mandateError?.message ?? "unknown database error"
      }`,
    );
  }

  return {
    ok: false,
    captured: false,
    mandate,
    attempt,
    ...identifiers,
    status,
    failureCode: failure.failureCode,
    failureMessage: failure.failureMessage,
  };
}

async function createOffSessionCharge(input: {
  mandate: Record<string, any>;
  batch: Record<string, any>;
  matchId: string;
}): Promise<ChargeResult> {
  if (!input.mandate.stripe_customer_id || !input.mandate.stripe_payment_method_id) {
    throw new Error("The payment mandate is missing its Stripe customer or payment method.");
  }

  const supabase = getDb();
  const attempt = await getOrCreateChargeAttempt(input);

  if (
    attempt.status === "succeeded" &&
    attempt.stripe_payment_intent_id &&
    attempt.stripe_charge_id
  ) {
    return {
      ok: true,
      captured: true,
      mandate: input.mandate,
      attempt,
      paymentIntentId: String(attempt.stripe_payment_intent_id),
      chargeId: String(attempt.stripe_charge_id),
      status: "succeeded",
    };
  }
  if (["refunded", "disputed"].includes(String(attempt.status))) {
    return {
      ok: false,
      captured: false,
      mandate: input.mandate,
      attempt,
      paymentIntentId: attempt.stripe_payment_intent_id
        ? String(attempt.stripe_payment_intent_id)
        : null,
      chargeId: attempt.stripe_charge_id ? String(attempt.stripe_charge_id) : null,
      status: String(attempt.status),
      failureCode: String(attempt.failure_code ?? attempt.status),
      failureMessage: String(
        attempt.failure_message ?? "This charge attempt is already final.",
      ),
    };
  }

  await supabase
    .from("conditional_payment_mandates")
    .update({ status: "charge_pending", failure_code: null, failure_message: null })
    .eq("id", input.mandate.id)
    .in("status", ["ready", "charge_pending", "charged"]);
  await supabase
    .from("conditional_payment_attempts")
    .update({ status: "processing" })
    .eq("id", attempt.id)
    .in("status", ["created", "processing", "failed", "requires_action"]);

  if (attempt.stripe_payment_intent_id) {
    try {
      const existingPaymentIntent = await getStripe().paymentIntents.retrieve(
        String(attempt.stripe_payment_intent_id),
      );
      return updateAttemptAndMandateForPaymentIntent({
        paymentIntent: existingPaymentIntent,
        attempt,
        mandate: input.mandate,
      });
    } catch (error) {
      const failure = stripeRequestFailure(error);
      if (failure.paymentIntent) {
        return updateAttemptAndMandateForPaymentIntent({
          paymentIntent: failure.paymentIntent,
          attempt,
          mandate: input.mandate,
        });
      }
      throw error;
    }
  }

  try {
    const paymentIntent = await getStripe().paymentIntents.create(
      {
        amount: Number(input.mandate.amount_cents),
        currency: String(input.mandate.currency),
        customer: String(input.mandate.stripe_customer_id),
        payment_method: String(input.mandate.stripe_payment_method_id),
        payment_method_types: ["card"],
        confirm: true,
        off_session: true,
        capture_method: "automatic",
        transfer_group: String(input.batch.transfer_group),
        description: `Moral Trade donation offset ${input.matchId.slice(0, 8)} — ${String(
          input.mandate.participant_role,
        )}`,
        metadata: {
          system: "conditional_payments",
          purpose: "donation_offset_charge",
          settlement_batch_id: String(input.batch.id),
          payment_attempt_id: String(attempt.id),
          mandate_id: String(input.mandate.id),
          subject_id: input.matchId,
          participant_role: String(input.mandate.participant_role),
          condition_hash: String(input.mandate.condition_hash),
        },
      },
      { idempotencyKey: String(attempt.idempotency_key) },
    );

    return updateAttemptAndMandateForPaymentIntent({
      paymentIntent,
      attempt,
      mandate: input.mandate,
    });
  } catch (error) {
    const failure = stripeRequestFailure(error);
    if (failure.paymentIntent) {
      return updateAttemptAndMandateForPaymentIntent({
        paymentIntent: failure.paymentIntent,
        attempt,
        mandate: input.mandate,
      });
    }

    await supabase
      .from("conditional_payment_attempts")
      .update({
        status: "processing",
        failure_code: failure.failureCode,
        decline_code: failure.declineCode,
        failure_message: failure.failureMessage,
      })
      .eq("id", attempt.id);
    await supabase
      .from("conditional_payment_mandates")
      .update({
        status: "charge_pending",
        failure_code: failure.failureCode,
        failure_message:
          "Stripe returned an uncertain network result. The same idempotency key will be reused before any new charge is attempted.",
      })
      .eq("id", input.mandate.id);

    await recordAudit({
      eventType: "offset_participant_charge_uncertain",
      objectType: "conditional_payment_attempt",
      objectId: String(attempt.id),
      actorProfileId: input.mandate.profile_id,
      details: {
        batchId: input.batch.id,
        mandateId: input.mandate.id,
        participantRole: input.mandate.participant_role,
        failureCode: failure.failureCode,
      },
    });

    return {
      ok: false,
      captured: false,
      mandate: input.mandate,
      attempt,
      paymentIntentId: null,
      chargeId: null,
      status: "processing",
      failureCode: failure.failureCode,
      failureMessage: failure.failureMessage,
    };
  }
}

async function reverseTransferForAttempt(attemptId: string, reasonCode: string) {
  const supabase = getDb();
  const { data: transferRow, error } = await supabase
    .from("conditional_settlement_transfers")
    .select("*")
    .eq("payment_attempt_id", attemptId)
    .maybeSingle();
  if (error) {
    throw new Error(`Unable to read a compensating transfer: ${error.message}`);
  }
  if (!transferRow || transferRow.status === "reversed") {
    return;
  }
  if (!transferRow.stripe_transfer_id) {
    return;
  }

  await supabase
    .from("conditional_settlement_transfers")
    .update({ status: "reversing" })
    .eq("id", transferRow.id);
  const reversal = await getStripe().transfers.createReversal(
    String(transferRow.stripe_transfer_id),
    {
      amount: Number(transferRow.amount_cents),
      metadata: {
        system: "conditional_payments",
        purpose: "donation_offset_compensation",
        reason_code: reasonCode,
        settlement_transfer_id: String(transferRow.id),
      },
    },
    {
      idempotencyKey: makeConditionalIdempotencyKey([
        "transfer-reversal",
        transferRow.id,
      ]),
    },
  );
  const { error: updateError } = await supabase
    .from("conditional_settlement_transfers")
    .update({
      status: "reversed",
      stripe_transfer_reversal_id: reversal.id,
      failure_code: reasonCode,
      failure_message: null,
    })
    .eq("id", transferRow.id);
  if (updateError) {
    throw new Error(
      `Stripe reversed transfer ${transferRow.stripe_transfer_id}, but the ledger update failed: ${updateError.message}`,
    );
  }
}

async function refundChargeResult(charge: ChargeResult, reasonCode: string) {
  if (!charge.captured || !charge.paymentIntentId) {
    return;
  }
  const supabase = getDb();
  const { data: currentAttempt } = await supabase
    .from("conditional_payment_attempts")
    .select("*")
    .eq("id", charge.attempt.id)
    .maybeSingle();
  if (
    currentAttempt?.status === "refunded" &&
    Number(currentAttempt.refunded_amount_cents ?? 0) >= Number(charge.mandate.amount_cents)
  ) {
    return;
  }

  let reversalError: string | null = null;
  try {
    await reverseTransferForAttempt(String(charge.attempt.id), reasonCode);
  } catch (error) {
    reversalError = error instanceof Error ? error.message : "Unknown transfer-reversal error";
  }

  const refund = await getStripe().refunds.create(
    {
      payment_intent: charge.paymentIntentId,
      reason: "requested_by_customer",
      metadata: {
        system: "conditional_payments",
        purpose: "donation_offset_compensation",
        reason_code: reasonCode,
        mandate_id: String(charge.mandate.id),
        payment_attempt_id: String(charge.attempt.id),
      },
    },
    {
      idempotencyKey: makeConditionalIdempotencyKey(["refund", charge.attempt.id]),
    },
  );

  if (refund.status !== "succeeded") {
    throw new Error(
      `Stripe accepted compensating refund ${refund.id}, but its status is ${refund.status}.`,
    );
  }

  const { error: attemptError } = await supabase
    .from("conditional_payment_attempts")
    .update({
      status: "refunded",
      refunded_amount_cents: charge.mandate.amount_cents,
      failure_code: reasonCode,
      failure_message: reversalError
        ? `Refund ${refund.id} succeeded; transfer reversal needs attention: ${reversalError}`
        : `Compensating refund ${refund.id} succeeded.`,
    })
    .eq("id", charge.attempt.id);
  const { error: mandateError } = await supabase
    .from("conditional_payment_mandates")
    .update({
      status: "refunded",
      failure_code: reasonCode,
      failure_message:
        "The paired donation-offset settlement did not complete, so this charge was refunded.",
    })
    .eq("id", charge.mandate.id)
    .neq("status", "disputed");

  if (attemptError || mandateError || reversalError) {
    throw new Error(
      [
        reversalError,
        attemptError?.message,
        mandateError?.message,
      ]
        .filter(Boolean)
        .join(" ") || "Compensation completed with an unknown ledger error.",
    );
  }
}

async function compensateSuccessfulCharges(
  batch: Record<string, any>,
  charges: ChargeResult[],
  reasonCode: string,
) {
  const captured = charges.filter(
    (charge) => charge.captured && Boolean(charge.paymentIntentId),
  );
  if (!captured.length) {
    return { complete: true, failures: [] as string[] };
  }

  const supabase = getDb();
  await supabase
    .from("conditional_settlement_batches")
    .update({ status: "refunding", failure_code: reasonCode })
    .eq("id", batch.id);

  const failures: string[] = [];
  for (const charge of captured) {
    try {
      await refundChargeResult(charge, reasonCode);
    } catch (error) {
      failures.push(error instanceof Error ? error.message : "Unknown compensating refund error");
    }
  }

  await supabase
    .from("conditional_settlement_batches")
    .update({
      status: failures.length ? "refunding" : "refunded",
      failure_code: reasonCode,
      failure_message: failures.length
        ? `Compensation requires operator attention: ${failures.join(" ")}`
        : "Every captured participant charge was refunded after paired settlement failed.",
      completed_at: failures.length ? null : new Date().toISOString(),
      processing_token: null,
      processing_started_at: null,
    })
    .eq("id", batch.id);

  await recordAudit({
    eventType: failures.length
      ? "offset_compensation_incomplete"
      : "offset_compensation_completed",
    objectType: "conditional_settlement_batch",
    objectId: String(batch.id),
    details: { reasonCode, refundedChargeCount: captured.length, failures },
  });

  return { complete: failures.length === 0, failures };
}

async function transferCharge(input: {
  batch: Record<string, any>;
  charge: ChargeResult;
  destination: Record<string, any>;
}) {
  if (!input.charge.ok || !input.charge.captured || !input.charge.chargeId) {
    throw new Error("Only a recorded, succeeded platform charge can be transferred.");
  }

  const supabase = getDb();
  const idempotencyKey = makeConditionalIdempotencyKey([
    "offset-transfer",
    input.batch.id,
    input.charge.attempt.id,
  ]);
  const { data: existing, error: existingError } = await supabase
    .from("conditional_settlement_transfers")
    .select("*")
    .eq("settlement_batch_id", input.batch.id)
    .eq("payment_attempt_id", input.charge.attempt.id)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Unable to read the settlement transfer: ${existingError.message}`);
  }
  if (existing?.status === "transferred" && existing.stripe_transfer_id) {
    return existing;
  }
  if (existing?.status === "reversed") {
    throw new Error("This payment attempt was already transferred and reversed.");
  }

  let transferRow = existing;
  if (!transferRow) {
    const { data: inserted, error: insertError } = await supabase
      .from("conditional_settlement_transfers")
      .insert({
        settlement_batch_id: input.batch.id,
        mandate_id: input.charge.mandate.id,
        payment_attempt_id: input.charge.attempt.id,
        destination_id: input.destination.id,
        amount_cents: input.charge.mandate.amount_cents,
        currency: input.charge.mandate.currency,
        idempotency_key: idempotencyKey,
        status: "created",
      })
      .select("*")
      .single();
    if (insertError || !inserted) {
      throw new Error(
        `Unable to create the settlement transfer: ${insertError?.message ?? "unknown error"}`,
      );
    }
    transferRow = inserted;
  }

  if (
    Number(transferRow.amount_cents) !== Number(input.charge.mandate.amount_cents) ||
    String(transferRow.destination_id) !== String(input.destination.id)
  ) {
    throw new Error("The replay-safe transfer row does not match the captured charge.");
  }

  let transfer: Stripe.Transfer;
  try {
    transfer = transferRow.stripe_transfer_id
      ? await getStripe().transfers.retrieve(String(transferRow.stripe_transfer_id))
      : await getStripe().transfers.create(
          {
            amount: Number(input.charge.mandate.amount_cents),
            currency: String(input.charge.mandate.currency),
            destination: String(input.destination.stripe_connected_account_id),
            source_transaction: input.charge.chargeId,
            transfer_group: String(input.batch.transfer_group),
            metadata: {
              system: "conditional_payments",
              purpose: "donation_offset_settlement",
              settlement_batch_id: String(input.batch.id),
              settlement_transfer_id: String(transferRow.id),
              payment_attempt_id: String(input.charge.attempt.id),
              mandate_id: String(input.charge.mandate.id),
              participant_role: String(input.charge.mandate.participant_role),
              condition_hash: String(input.charge.mandate.condition_hash),
            },
          },
          { idempotencyKey },
        );
  } catch (error) {
    await supabase
      .from("conditional_settlement_transfers")
      .update({
        status: "failed",
        failure_code: "transfer_request_failed",
        failure_message:
          error instanceof Error ? error.message : "Unknown Stripe transfer error",
      })
      .eq("id", transferRow.id);
    throw error;
  }

  if (transfer.reversed) {
    await supabase
      .from("conditional_settlement_transfers")
      .update({ stripe_transfer_id: transfer.id, status: "reversed" })
      .eq("id", transferRow.id);
    throw new Error("Stripe reports that the settlement transfer is already reversed.");
  }

  const { data: updated, error: updateError } = await supabase
    .from("conditional_settlement_transfers")
    .update({
      stripe_transfer_id: transfer.id,
      status: "transferred",
      failure_code: null,
      failure_message: null,
    })
    .eq("id", transferRow.id)
    .select("*")
    .single();

  if (updateError || !updated) {
    let reversalMessage = "";
    try {
      const reversal = await getStripe().transfers.createReversal(
        transfer.id,
        {
          amount: Number(input.charge.mandate.amount_cents),
          metadata: {
            system: "conditional_payments",
            purpose: "donation_offset_ledger_failure_compensation",
            settlement_transfer_id: String(transferRow.id),
          },
        },
        {
          idempotencyKey: makeConditionalIdempotencyKey([
            "transfer-reversal",
            transferRow.id,
          ]),
        },
      );
      reversalMessage = ` Stripe reversal ${reversal.id} was created.`;
      await supabase
        .from("conditional_settlement_transfers")
        .update({
          stripe_transfer_id: transfer.id,
          stripe_transfer_reversal_id: reversal.id,
          status: "reversed",
          failure_code: "transfer_ledger_update_failed",
        })
        .eq("id", transferRow.id);
    } catch (reversalError) {
      reversalMessage = ` Immediate transfer reversal failed: ${
        reversalError instanceof Error ? reversalError.message : "unknown reversal error"
      }`;
    }
    throw new Error(
      `Stripe transferred funds but the ledger update failed: ${
        updateError?.message ?? "unknown database error"
      }.${reversalMessage}`,
    );
  }

  return updated;
}

function settlementFailureStatus(charge: ChargeResult) {
  if (charge.status === "requires_action") {
    return "requires_action" as const;
  }
  if (charge.status === "processing") {
    return "failed" as const;
  }
  return "failed" as const;
}

async function findTerminalSettlementBatch(matchId: string, livemode: boolean) {
  const { data, error } = await getDb()
    .from("conditional_settlement_batches")
    .select("id, status, created_at")
    .eq("purpose", "donation_offset")
    .eq("subject_type", "donation_offset_match")
    .eq("subject_id", matchId)
    .eq("livemode", livemode)
    .in("status", ["transferred", "refunding", "disputed", "cancelled"])
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    throw new Error(`Unable to inspect prior settlement batches: ${error.message}`);
  }

  const rows = (data ?? []) as Array<Record<string, any>>;
  return rows.find((row) => row.status === "transferred") ?? rows[0] ?? null;
}

export async function attemptDonationOffsetSettlement(
  matchId: string,
): Promise<DonationOffsetSettlementResult> {
  const readiness = await getConditionalPaymentReadiness();
  if (!readiness.canSettle) {
    return {
      status: "blocked",
      matchId,
      message: "Conditional settlement is blocked by payment readiness gates.",
      blockers: readiness.blockers,
    };
  }

  const environment = getConditionalPaymentsEnvironment();
  const terminalBatch = await findTerminalSettlementBatch(matchId, environment.livemode);
  if (terminalBatch?.status === "transferred") {
    return {
      status: "transferred",
      matchId,
      batchId: String(terminalBatch.id),
      message: "The donation offset has already settled to the approved destination.",
    };
  }
  if (terminalBatch) {
    return {
      status: "failed",
      matchId,
      batchId: String(terminalBatch.id),
      message: `The settlement batch is ${terminalBatch.status} and requires operator resolution.`,
    };
  }

  const context = await loadDonationOffsetPaymentContext(matchId);
  const batch = await getOrCreateSettlementBatch({
    matchId: context.snapshot.matchId,
    conditionHash: context.conditionHash,
    conditionSnapshot: context.snapshot as unknown as Record<string, unknown>,
    destinationId: context.snapshot.destinationId,
    livemode: environment.livemode,
    totalAmountCents: context.snapshot.compromiseTotalCents,
  });

  if (batch.status === "transferred") {
    return {
      status: "transferred",
      matchId,
      batchId: String(batch.id),
      message: "The donation offset has already settled to the approved destination.",
    };
  }
  if (["cancelled", "disputed"].includes(String(batch.status))) {
    return {
      status: "failed",
      matchId,
      batchId: String(batch.id),
      message: `The settlement batch is ${batch.status} and cannot be captured again.`,
    };
  }
  if (batch.status === "refunding") {
    return {
      status: "failed",
      matchId,
      batchId: String(batch.id),
      message: "A compensating refund or transfer reversal still requires operator attention.",
    };
  }

  const mandates = await loadReadyMandates({
    matchId: context.snapshot.matchId,
    conditionHash: context.conditionHash,
    livemode: environment.livemode,
  });
  if (!mandates.owner || !mandates.counterparty) {
    await getDb()
      .from("conditional_settlement_batches")
      .update({
        status: "pending_authorizations",
        processing_token: null,
        processing_started_at: null,
      })
      .eq("id", batch.id)
      .not("status", "in", "(transferred,disputed,refunding)");
    return {
      status: "waiting_for_authorizations",
      matchId,
      batchId: String(batch.id),
      message: "Both participants must save valid conditional payment mandates before capture.",
    };
  }
  if (
    batch.status === "refunded" &&
    (mandates.owner.status !== "ready" || mandates.counterparty.status !== "ready")
  ) {
    return {
      status: "waiting_for_authorizations",
      matchId,
      batchId: String(batch.id),
      message:
        "The previous attempt was fully compensated. Both participants must authorize fresh payment methods before retrying.",
    };
  }

  const expected = [
    [mandates.owner, "owner"],
    [mandates.counterparty, "counterparty"],
  ] as const;
  for (const [mandate, role] of expected) {
    if (
      mandate.profile_id !==
      context.snapshot[role === "owner" ? "ownerProfileId" : "counterpartyProfileId"]
    ) {
      throw new Error(`The ${role} payment mandate belongs to the wrong profile.`);
    }
    const expectedAmount = participantAmountForDonationOffset(context.snapshot, role);
    if (
      Number(mandate.amount_cents) !== expectedAmount ||
      String(mandate.currency) !== context.snapshot.currency ||
      String(mandate.condition_hash) !== context.conditionHash
    ) {
      throw new Error(
        `The ${role} payment mandate does not match the frozen settlement condition.`,
      );
    }
  }

  const processingToken = randomUUID();
  const { data: claimed, error: claimError } = await getDb().rpc(
    "claim_conditional_settlement_batch",
    {
      p_batch_id: batch.id,
      p_processing_token: processingToken,
    },
  );
  if (claimError) {
    throw new Error(`Unable to claim the settlement batch: ${claimError.message}`);
  }
  if (!claimed) {
    return {
      status: "already_processing",
      matchId,
      batchId: String(batch.id),
      message: "Another worker is already settling this donation offset.",
    };
  }

  const charges: ChargeResult[] = [];
  try {
    const ownerCharge = await createOffSessionCharge({
      mandate: mandates.owner,
      batch,
      matchId: context.snapshot.matchId,
    });
    charges.push(ownerCharge);
    if (!ownerCharge.ok) {
      if (ownerCharge.captured) {
        await compensateSuccessfulCharges(batch, charges, "owner_charge_ledger_failure");
        return {
          status: "refunded",
          matchId,
          batchId: String(batch.id),
          message:
            "The owner charge could not be recorded safely and was reversed or refunded.",
        };
      }
      const failureStatus = settlementFailureStatus(ownerCharge);
      await getDb()
        .from("conditional_settlement_batches")
        .update({
          status: failureStatus,
          failure_code: ownerCharge.failureCode ?? "owner_charge_failed",
          failure_message: ownerCharge.failureMessage ?? "The owner charge did not succeed.",
          processing_token: null,
          processing_started_at: null,
        })
        .eq("id", batch.id);
      return {
        status: ownerCharge.status === "requires_action" ? "requires_action" : "failed",
        matchId,
        batchId: String(batch.id),
        message:
          ownerCharge.status === "processing"
            ? "Stripe returned an uncertain result. The same charge key will be retried; no new charge key will be created."
            : ownerCharge.failureMessage ??
              "The owner payment method must be updated before the offset can settle.",
      };
    }

    const conditionBeforeSecondCharge = await loadDonationOffsetPaymentContext(matchId);
    if (conditionBeforeSecondCharge.conditionHash !== context.conditionHash) {
      await compensateSuccessfulCharges(batch, charges, "condition_changed_between_charges");
      return {
        status: "refunded",
        matchId,
        batchId: String(batch.id),
        message: "The offset terms changed during capture, so the first charge was refunded.",
      };
    }

    const counterpartyCharge = await createOffSessionCharge({
      mandate: mandates.counterparty,
      batch,
      matchId: context.snapshot.matchId,
    });
    charges.push(counterpartyCharge);
    if (!counterpartyCharge.ok) {
      await compensateSuccessfulCharges(
        batch,
        charges,
        counterpartyCharge.status === "requires_action"
          ? "counterparty_requires_action"
          : counterpartyCharge.status === "processing"
            ? "counterparty_charge_uncertain"
            : "counterparty_charge_failed",
      );
      return {
        status: "refunded",
        matchId,
        batchId: String(batch.id),
        message:
          "The paired charge did not complete. Every captured participant charge was reversed or refunded.",
      };
    }

    const conditionBeforeTransfer = await loadDonationOffsetPaymentContext(matchId);
    if (conditionBeforeTransfer.conditionHash !== context.conditionHash) {
      await compensateSuccessfulCharges(batch, charges, "condition_changed_before_transfer");
      return {
        status: "refunded",
        matchId,
        batchId: String(batch.id),
        message: "The offset terms changed after capture, so both charges were refunded.",
      };
    }

    await getDb()
      .from("conditional_settlement_batches")
      .update({ status: "transferring" })
      .eq("id", batch.id)
      .eq("processing_token", processingToken);

    const completedTransfers: Record<string, any>[] = [];
    try {
      for (const charge of charges) {
        const transfer = await transferCharge({
          batch,
          charge,
          destination: context.destination,
        });
        completedTransfers.push(transfer);
      }
    } catch {
      await compensateSuccessfulCharges(batch, charges, "destination_transfer_failed");
      return {
        status: "refunded",
        matchId,
        batchId: String(batch.id),
        message:
          "Destination settlement failed. Successful transfers were reversed and participant charges were refunded.",
      };
    }

    const { data: finalized, error: completeError } = await getDb().rpc(
    "finalize_donation_offset_settlement",
    {
      p_batch_id: batch.id,
      p_processing_token: processingToken,
      p_match_id: context.snapshot.matchId,
      p_offer_id: context.snapshot.offerId,
    },
  );
  if (completeError || !finalized) {
    throw new Error(
      `Funds transferred but the settlement ledger could not be finalized atomically: ${
        completeError?.message ?? "the settlement claim no longer matched"
      }`,
    );
  }

    await recordAudit({
      eventType: "donation_offset_settled",
      objectType: "conditional_settlement_batch",
      objectId: String(batch.id),
      details: {
        matchId: context.snapshot.matchId,
        conditionHash: context.conditionHash,
        destinationId: context.snapshot.destinationId,
        destinationConnectedAccountId: context.snapshot.destinationConnectedAccountId,
        totalAmountCents: context.snapshot.compromiseTotalCents,
        paymentIntentIds: charges.map((charge) => charge.paymentIntentId),
        transferIds: completedTransfers.map((transfer) => transfer.stripe_transfer_id),
        livemode: environment.livemode,
      },
    });

    return {
      status: "transferred",
      matchId,
      batchId: String(batch.id),
      message: environment.livemode
        ? "Both charges succeeded and were transferred to the approved compromise destination."
        : "TEST MODE: both test charges succeeded and were transferred to the mapped test account.",
    };
  } catch (error) {
    if (charges.some((charge) => charge.captured)) {
      await compensateSuccessfulCharges(batch, charges, "unexpected_settlement_error");
    } else {
      await getDb()
        .from("conditional_settlement_batches")
        .update({
          status: "failed",
          failure_code: "unexpected_settlement_error",
          failure_message:
            error instanceof Error ? error.message : "Unknown settlement error",
          processing_token: null,
          processing_started_at: null,
        })
        .eq("id", batch.id);
    }
    throw error;
  }
}

export async function reconcileConditionalPaymentIntent(paymentIntent: Stripe.PaymentIntent) {
  if (paymentIntent.metadata?.system !== "conditional_payments") {
    return { handled: false as const };
  }

  const mandateId = paymentIntent.metadata?.mandate_id;
  const batchId = paymentIntent.metadata?.settlement_batch_id;
  const paymentAttemptId = paymentIntent.metadata?.payment_attempt_id;
  if (!mandateId || !batchId) {
    return { handled: true as const };
  }

  const supabase = getDb();
  const attemptQuery = supabase.from("conditional_payment_attempts").select("*");
  const { data: attempt } = paymentAttemptId
    ? await attemptQuery.eq("id", paymentAttemptId).maybeSingle()
    : await attemptQuery.eq("stripe_payment_intent_id", paymentIntent.id).maybeSingle();
  if (!attempt) {
    return { handled: true as const };
  }

  const identifiers = paymentIntentIdentifiers(paymentIntent);
  const status =
    paymentIntent.status === "succeeded"
      ? "succeeded"
      : paymentIntent.status === "requires_action"
        ? "requires_action"
        : paymentIntent.status === "processing"
          ? "processing"
          : "failed";
  const failure = paymentIntentFailure(paymentIntent);
  await supabase
    .from("conditional_payment_attempts")
    .update({
      stripe_payment_intent_id: paymentIntent.id,
      stripe_charge_id: identifiers.chargeId,
      status,
      failure_code: status === "succeeded" ? null : failure.failureCode,
      decline_code: status === "succeeded" ? null : failure.declineCode,
      failure_message: status === "succeeded" ? null : failure.failureMessage,
    })
    .eq("id", attempt.id);

  const { data: mandate } = await supabase
    .from("conditional_payment_mandates")
    .select("*")
    .eq("id", mandateId)
    .maybeSingle();
  const { data: batch } = await supabase
    .from("conditional_settlement_batches")
    .select("*")
    .eq("id", batchId)
    .maybeSingle();

  if (
    status === "succeeded" &&
    identifiers.chargeId &&
    mandate &&
    batch &&
    ["refunding", "refunded", "cancelled", "disputed"].includes(String(batch.status))
  ) {
    await refundChargeResult(
      {
        ok: true,
        captured: true,
        mandate,
        attempt: {
          ...attempt,
          stripe_payment_intent_id: paymentIntent.id,
          stripe_charge_id: identifiers.chargeId,
          status: "succeeded",
        },
        paymentIntentId: paymentIntent.id,
        chargeId: identifiers.chargeId,
        status: "succeeded",
      },
      "late_success_after_compensation",
    );
    return {
      handled: true as const,
      subjectId: paymentIntent.metadata?.subject_id ?? null,
      batchId,
      status: "refunded",
    };
  }

  await supabase
    .from("conditional_payment_mandates")
    .update({
      status:
        status === "succeeded"
          ? "charged"
          : status === "processing"
            ? "charge_pending"
            : status,
      failure_code: status === "succeeded" ? null : failure.failureCode,
      failure_message: status === "succeeded" ? null : failure.failureMessage,
    })
    .eq("id", mandateId)
    .neq("status", "refunded")
    .neq("status", "disputed");

  return {
    handled: true as const,
    subjectId: paymentIntent.metadata?.subject_id ?? null,
    batchId,
    status,
  };
}

export async function reconcileConditionalRefund(refund: Stripe.Refund) {
  const paymentIntentId =
    typeof refund.payment_intent === "string"
      ? refund.payment_intent
      : refund.payment_intent?.id ?? null;
  const paymentAttemptId = refund.metadata?.payment_attempt_id;
  if (!paymentIntentId && !paymentAttemptId) {
    return { handled: false as const };
  }

  const supabase = getDb();
  const attemptQuery = supabase.from("conditional_payment_attempts").select("*");
  const { data: attempt } = paymentAttemptId
    ? await attemptQuery.eq("id", paymentAttemptId).maybeSingle()
    : await attemptQuery.eq("stripe_payment_intent_id", paymentIntentId).maybeSingle();
  if (!attempt) {
    return { handled: false as const };
  }

  await supabase
    .from("conditional_payment_attempts")
    .update({
      status: refund.status === "succeeded" ? "refunded" : attempt.status,
      refunded_amount_cents: Math.max(
        Number(attempt.refunded_amount_cents ?? 0),
        Number(refund.amount),
      ),
    })
    .eq("id", attempt.id);
  if (refund.status === "succeeded") {
    await supabase
      .from("conditional_payment_mandates")
      .update({ status: "refunded" })
      .eq("id", attempt.mandate_id)
      .neq("status", "disputed");
  }
  return { handled: true as const };
}

export async function reconcileConditionalDispute(dispute: Stripe.Dispute) {
  const chargeId =
    typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id ?? null;
  if (!chargeId) {
    return { handled: false as const };
  }
  const supabase = getDb();
  const { data: attempt } = await supabase
    .from("conditional_payment_attempts")
    .select("*")
    .eq("stripe_charge_id", chargeId)
    .maybeSingle();
  if (!attempt) {
    return { handled: false as const };
  }

  await supabase
    .from("conditional_payment_attempts")
    .update({ status: "disputed", failure_code: dispute.reason })
    .eq("id", attempt.id);
  await supabase
    .from("conditional_payment_mandates")
    .update({ status: "disputed", failure_code: dispute.reason })
    .eq("id", attempt.mandate_id);
  if (attempt.settlement_batch_id) {
    await supabase
      .from("conditional_settlement_batches")
      .update({
        status: "disputed",
        failure_code: dispute.reason,
        failure_message: `Stripe dispute ${dispute.id} is ${dispute.status}.`,
      })
      .eq("id", attempt.settlement_batch_id);
  }
  return { handled: true as const };
}
