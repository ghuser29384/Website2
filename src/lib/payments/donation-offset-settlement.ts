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
    throw new Error(`Unable to read the settlement batch: ${batchError?.message ?? "not found"}`);
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

function stripeFailure(error: unknown) {
  const stripeError = error as any;
  const paymentIntent = stripeError?.payment_intent as Stripe.PaymentIntent | undefined;
  const requiresAction = paymentIntent?.status === "requires_action";
  return {
    paymentIntent: paymentIntent ?? null,
    status: requiresAction ? "requires_action" : "failed",
    failureCode: String(stripeError?.code ?? paymentIntent?.last_payment_error?.code ?? "payment_failed"),
    declineCode: stripeError?.decline_code
      ? String(stripeError.decline_code)
      : paymentIntent?.last_payment_error?.decline_code
        ? String(paymentIntent.last_payment_error.decline_code)
        : null,
    failureMessage: String(
      stripeError?.message ?? paymentIntent?.last_payment_error?.message ?? "Stripe could not charge the saved payment method.",
    ),
  };
}

async function createOffSessionCharge(input: {
  mandate: Record<string, any>;
  batch: Record<string, any>;
  matchId: string;
}) : Promise<ChargeResult> {
  const supabase = getDb();
  const existingAttemptResult = await supabase
    .from("conditional_payment_attempts")
    .select("*")
    .eq("mandate_id", input.mandate.id)
    .eq("settlement_batch_id", input.batch.id)
    .eq("status", "succeeded")
    .order("attempt_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingAttemptResult.error) {
    throw new Error(`Unable to read the previous charge attempt: ${existingAttemptResult.error.message}`);
  }
  if (existingAttemptResult.data) {
    return {
      ok: true,
      mandate: input.mandate,
      attempt: existingAttemptResult.data,
      paymentIntentId: existingAttemptResult.data.stripe_payment_intent_id,
      chargeId: existingAttemptResult.data.stripe_charge_id,
      status: "succeeded",
    };
  }

  if (!input.mandate.stripe_customer_id || !input.mandate.stripe_payment_method_id) {
    throw new Error("The payment mandate is missing its Stripe customer or payment method.");
  }

  const attemptNumber = await nextAttemptNumber(String(input.mandate.id));
  const idempotencyKey = makeConditionalIdempotencyKey([
    "offset-charge",
    input.batch.id,
    input.mandate.id,
    attemptNumber,
  ]);
  const { data: attempt, error: attemptError } = await supabase
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

  if (attemptError || !attempt) {
    throw new Error(`Unable to create the charge attempt: ${attemptError?.message ?? "unknown error"}`);
  }

  await supabase
    .from("conditional_payment_mandates")
    .update({ status: "charge_pending", failure_code: null, failure_message: null })
    .eq("id", input.mandate.id)
    .in("status", ["ready", "charge_pending"]);
  await supabase
    .from("conditional_payment_attempts")
    .update({ status: "processing" })
    .eq("id", attempt.id);

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
          mandate_id: String(input.mandate.id),
          subject_id: input.matchId,
          participant_role: String(input.mandate.participant_role),
          condition_hash: String(input.mandate.condition_hash),
        },
      },
      { idempotencyKey },
    );

    const identifiers = paymentIntentIdentifiers(paymentIntent);
    if (paymentIntent.status !== "succeeded" || !identifiers.chargeId) {
      const status = paymentIntent.status === "requires_action" ? "requires_action" : "failed";
      const lastError = paymentIntent.last_payment_error;
      await supabase
        .from("conditional_payment_attempts")
        .update({
          stripe_payment_intent_id: paymentIntent.id,
          stripe_charge_id: identifiers.chargeId,
          status,
          failure_code: lastError?.code ?? paymentIntent.status,
          decline_code: lastError?.decline_code ?? null,
          failure_message:
            lastError?.message ?? `PaymentIntent ended in ${paymentIntent.status}.`,
        })
        .eq("id", attempt.id);
      await supabase
        .from("conditional_payment_mandates")
        .update({
          status,
          failure_code: lastError?.code ?? paymentIntent.status,
          failure_message:
            lastError?.message ?? `PaymentIntent ended in ${paymentIntent.status}.`,
        })
        .eq("id", input.mandate.id);
      return {
        ok: false,
        mandate: input.mandate,
        attempt,
        ...identifiers,
        status,
        failureCode: lastError?.code ?? paymentIntent.status,
        failureMessage: lastError?.message ?? `PaymentIntent ended in ${paymentIntent.status}.`,
      };
    }

    let receiptUrl: string | null = null;
    try {
      const charge = await getStripe().charges.retrieve(identifiers.chargeId);
      receiptUrl = charge.receipt_url ?? null;
    } catch {
      // Receipt retrieval is non-critical; the charge and webhook remain authoritative.
    }

    const { data: updatedAttempt, error: updateAttemptError } = await supabase
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

    if (updateAttemptError || !updatedAttempt) {
      throw new Error(
        `Stripe charged the participant but the ledger update failed: ${
          updateAttemptError?.message ?? "unknown database error"
        }`,
      );
    }

    await supabase
      .from("conditional_payment_mandates")
      .update({ status: "charged", failure_code: null, failure_message: null })
      .eq("id", input.mandate.id);

    await recordAudit({
      eventType: "offset_participant_charged",
      objectType: "conditional_payment_attempt",
      objectId: String(updatedAttempt.id),
      actorProfileId: input.mandate.profile_id,
      actorKind: "system",
      details: {
        batchId: input.batch.id,
        mandateId: input.mandate.id,
        participantRole: input.mandate.participant_role,
        amountCents: input.mandate.amount_cents,
        paymentIntentId: paymentIntent.id,
        chargeId: identifiers.chargeId,
      },
    });

    return {
      ok: true,
      mandate: input.mandate,
      attempt: updatedAttempt,
      ...identifiers,
      status: "succeeded",
    };
  } catch (error) {
    const failure = stripeFailure(error);
    const identifiers = paymentIntentIdentifiers(failure.paymentIntent);
    await supabase
      .from("conditional_payment_attempts")
      .update({
        stripe_payment_intent_id: identifiers.paymentIntentId,
        stripe_charge_id: identifiers.chargeId,
        status: failure.status,
        failure_code: failure.failureCode,
        decline_code: failure.declineCode,
        failure_message: failure.failureMessage,
      })
      .eq("id", attempt.id);
    await supabase
      .from("conditional_payment_mandates")
      .update({
        status: failure.status,
        failure_code: failure.failureCode,
        failure_message: failure.failureMessage,
      })
      .eq("id", input.mandate.id);

    await recordAudit({
      eventType: "offset_participant_charge_failed",
      objectType: "conditional_payment_attempt",
      objectId: String(attempt.id),
      actorProfileId: input.mandate.profile_id,
      actorKind: "system",
      details: {
        batchId: input.batch.id,
        mandateId: input.mandate.id,
        participantRole: input.mandate.participant_role,
        status: failure.status,
        failureCode: failure.failureCode,
      },
    });

    return {
      ok: false,
      mandate: input.mandate,
      attempt,
      ...identifiers,
      status: failure.status,
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
    await supabase
      .from("conditional_settlement_transfers")
      .update({ status: "failed", failure_code: reasonCode })
      .eq("id", transferRow.id);
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
        reasonCode,
      ]),
    },
  );
  await supabase
    .from("conditional_settlement_transfers")
    .update({
      status: "reversed",
      stripe_transfer_reversal_id: reversal.id,
      failure_code: reasonCode,
    })
    .eq("id", transferRow.id);
}

async function refundChargeResult(charge: ChargeResult, reasonCode: string) {
  if (!charge.ok || !charge.paymentIntentId) {
    return;
  }
  const supabase = getDb();
  await reverseTransferForAttempt(String(charge.attempt.id), reasonCode);

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
      idempotencyKey: makeConditionalIdempotencyKey([
        "refund",
        charge.attempt.id,
        reasonCode,
      ]),
    },
  );

  await supabase
    .from("conditional_payment_attempts")
    .update({
      status: "refunded",
      refunded_amount_cents: charge.mandate.amount_cents,
      failure_code: reasonCode,
      failure_message: `Compensating refund ${refund.id} created.`,
    })
    .eq("id", charge.attempt.id);
  await supabase
    .from("conditional_payment_mandates")
    .update({
      status: "refunded",
      failure_code: reasonCode,
      failure_message: "The paired donation-offset settlement did not complete, so this charge was refunded.",
    })
    .eq("id", charge.mandate.id);
}

async function compensateSuccessfulCharges(
  batch: Record<string, any>,
  charges: ChargeResult[],
  reasonCode: string,
) {
  const successful = charges.filter((charge) => charge.ok && charge.paymentIntentId);
  if (!successful.length) {
    return;
  }

  const supabase = getDb();
  await supabase
    .from("conditional_settlement_batches")
    .update({ status: "refunding", failure_code: reasonCode })
    .eq("id", batch.id);

  const failures: string[] = [];
  for (const charge of successful) {
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
        : "Every successful participant charge was refunded after paired settlement failed.",
      completed_at: failures.length ? null : new Date().toISOString(),
      processing_token: null,
      processing_started_at: null,
    })
    .eq("id", batch.id);

  await recordAudit({
    eventType: failures.length ? "offset_compensation_incomplete" : "offset_compensation_completed",
    objectType: "conditional_settlement_batch",
    objectId: String(batch.id),
    details: { reasonCode, refundedChargeCount: successful.length, failures },
  });
}

async function transferCharge(input: {
  batch: Record<string, any>;
  charge: ChargeResult;
  destination: Record<string, any>;
}) {
  if (!input.charge.ok || !input.charge.chargeId) {
    throw new Error("Only a succeeded platform charge can be transferred.");
  }

  const supabase = getDb();
  const idempotencyKey = makeConditionalIdempotencyKey([
    "offset-transfer",
    input.batch.id,
    input.charge.mandate.id,
  ]);
  const { data: existing, error: existingError } = await supabase
    .from("conditional_settlement_transfers")
    .select("*")
    .eq("settlement_batch_id", input.batch.id)
    .eq("mandate_id", input.charge.mandate.id)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Unable to read the settlement transfer: ${existingError.message}`);
  }
  if (existing?.status === "transferred" && existing.stripe_transfer_id) {
    return existing;
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
      throw new Error(`Unable to create the settlement transfer: ${insertError?.message ?? "unknown error"}`);
    }
    transferRow = inserted;
  }

  try {
    const transfer = await getStripe().transfers.create(
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
          mandate_id: String(input.charge.mandate.id),
          participant_role: String(input.charge.mandate.participant_role),
          condition_hash: String(input.charge.mandate.condition_hash),
        },
      },
      { idempotencyKey },
    );

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
      throw new Error(`Stripe transferred funds but the ledger update failed: ${updateError?.message ?? "unknown error"}`);
    }
    return updated;
  } catch (error) {
    await supabase
      .from("conditional_settlement_transfers")
      .update({
        status: "failed",
        failure_code: "transfer_failed",
        failure_message: error instanceof Error ? error.message : "Unknown Stripe transfer error",
      })
      .eq("id", transferRow.id);
    throw error;
  }
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
  if (["refunded", "cancelled", "disputed"].includes(String(batch.status))) {
    return {
      status: batch.status === "refunded" ? "refunded" : "failed",
      matchId,
      batchId: String(batch.id),
      message: `The settlement batch is ${batch.status} and cannot be captured again.`,
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
      .update({ status: "pending_authorizations", processing_token: null, processing_started_at: null })
      .eq("id", batch.id)
      .neq("status", "transferred");
    return {
      status: "waiting_for_authorizations",
      matchId,
      batchId: String(batch.id),
      message: "Both participants must save valid conditional payment mandates before capture.",
    };
  }

  const expected = [
    [mandates.owner, "owner"],
    [mandates.counterparty, "counterparty"],
  ] as const;
  for (const [mandate, role] of expected) {
    if (mandate.profile_id !== context.snapshot[role === "owner" ? "ownerProfileId" : "counterpartyProfileId"]) {
      throw new Error(`The ${role} payment mandate belongs to the wrong profile.`);
    }
    const expectedAmount = participantAmountForDonationOffset(context.snapshot, role);
    if (
      Number(mandate.amount_cents) !== expectedAmount ||
      String(mandate.currency) !== context.snapshot.currency ||
      String(mandate.condition_hash) !== context.conditionHash
    ) {
      throw new Error(`The ${role} payment mandate does not match the frozen settlement condition.`);
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
      await getDb()
        .from("conditional_settlement_batches")
        .update({
          status: ownerCharge.status === "requires_action" ? "requires_action" : "failed",
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
          ownerCharge.failureMessage ??
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
          : "counterparty_charge_failed",
      );
      return {
        status: "refunded",
        matchId,
        batchId: String(batch.id),
        message:
          "The paired charge did not complete. Every successful participant charge was reversed or refunded.",
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
    } catch (error) {
      await compensateSuccessfulCharges(batch, charges, "destination_transfer_failed");
      return {
        status: "refunded",
        matchId,
        batchId: String(batch.id),
        message:
          "The destination transfer failed. Successful transfers were reversed and participant charges were refunded.",
      };
    }

    const { error: completeError } = await getDb()
      .from("conditional_settlement_batches")
      .update({
        status: "transferred",
        completed_at: new Date().toISOString(),
        processing_token: null,
        processing_started_at: null,
        failure_code: null,
        failure_message: null,
      })
      .eq("id", batch.id)
      .eq("processing_token", processingToken);
    if (completeError) {
      throw new Error(
        `Funds transferred but the settlement batch could not be finalized: ${completeError.message}`,
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
    if (charges.some((charge) => charge.ok)) {
      await compensateSuccessfulCharges(batch, charges, "unexpected_settlement_error");
    } else {
      await getDb()
        .from("conditional_settlement_batches")
        .update({
          status: "failed",
          failure_code: "unexpected_settlement_error",
          failure_message: error instanceof Error ? error.message : "Unknown settlement error",
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
  if (!mandateId || !batchId) {
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
  const lastError = paymentIntent.last_payment_error;
  const supabase = getDb();
  await supabase
    .from("conditional_payment_attempts")
    .update({
      stripe_charge_id: identifiers.chargeId,
      status,
      failure_code: lastError?.code ?? null,
      decline_code: lastError?.decline_code ?? null,
      failure_message: lastError?.message ?? null,
    })
    .eq("stripe_payment_intent_id", paymentIntent.id);
  await supabase
    .from("conditional_payment_mandates")
    .update({
      status: status === "succeeded" ? "charged" : status,
      failure_code: lastError?.code ?? null,
      failure_message: lastError?.message ?? null,
    })
    .eq("id", mandateId)
    .neq("status", "refunded");

  return {
    handled: true as const,
    subjectId: paymentIntent.metadata?.subject_id ?? null,
    batchId,
    status,
  };
}

export async function reconcileConditionalRefund(refund: Stripe.Refund) {
  const paymentIntentId =
    typeof refund.payment_intent === "string" ? refund.payment_intent : refund.payment_intent?.id ?? null;
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
      status: refund.status === "succeeded" ? "refunded" : attempt.status,
      refunded_amount_cents: Math.max(Number(attempt.refunded_amount_cents ?? 0), Number(refund.amount)),
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
  const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id ?? null;
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
