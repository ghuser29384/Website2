import { createHash } from "node:crypto";

import type Stripe from "stripe";

import { getViewer } from "@/lib/app-data";
import type { Database } from "@/lib/supabase/database.types";
import { getSiteUrl, hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getStripe, getStripeWebhookSecret, hasStripeEnv } from "@/lib/stripe";

import { demoCycle } from "./data";
import { normalizeMpgfManualEvidenceSecurity } from "./public-goods-evidence-security";
import {
  isMpgfStripeSavedCommitmentEvent,
  type MpgfStripeSavedCommitmentWebhookEvent,
  recordMpgfStripeSavedCommitmentWebhook,
} from "./public-goods-stripe-commitments";
import type {
  MpgfManualEvidenceActionResult,
  MpgfManualEvidenceProvider,
  MpgfManualEvidenceReadiness,
  MpgfRealMoneyAccountState,
  MpgfRealMoneyCheckoutResult,
  MpgfRealMoneyReadiness,
} from "./real-money-types";

type SupabaseServiceAny = ReturnType<typeof createServiceClient> & {
  from: (table: string) => any;
};
type MpgfPublicGoodsPaymentProofInsert =
  Database["public"]["Tables"]["mpgf_public_goods_payment_proofs"]["Insert"];
type MpgfPaymentMethodTokenInsert = Database["public"]["Tables"]["mpgf_payment_method_tokens"]["Insert"];
type MpgfPaymentEventInsert = Database["public"]["Tables"]["mpgf_payment_events"]["Insert"];
type MpgfStripeSavedCommitmentEventInsert = {
  id: string;
  saved_commitment_id: string | null;
  conditional_pledge_id: string | null;
  pledge_intent_id: string | null;
  provider_event_id_hash: string;
  provider_object_id_hash: string | null;
  provider_customer_id_hash: string | null;
  provider_payment_method_id_hash: string | null;
  event_type: string;
  event_state: string;
  status: "recorded" | "needs_review" | "rejected";
  signature_verified: boolean;
  structure_verified: boolean;
  payload_hash: string;
  append_only_hash: string;
  review_required_before_counting: true;
  final_payout_authorized: false;
  received_at: string;
};

type GateStatus = MpgfRealMoneyReadiness["requiredGates"][number]["status"];

const REQUIRED_REAL_MONEY_GATES = [
  "legal_terms_approved",
  "stripe_live_keys_configured",
  "stripe_webhook_configured",
  "refund_policy_approved",
  "recipient_compliance_policy_approved",
  "payout_profile_approved",
] as const;

function toCents(value: number, label: string) {
  const cents = Math.round(value * 100);

  if (!Number.isFinite(value) || !Number.isInteger(cents) || cents < 100) {
    throw new Error(`${label} must be at least $1.00.`);
  }

  if (cents > 100_000_00) {
    throw new Error(`${label} must be $100,000 or less.`);
  }

  return cents;
}

function optionalTrimmed(value: string | null | undefined) {
  const trimmed = value?.trim();

  return trimmed ? trimmed : undefined;
}

function checkoutMetadataText(value: string | null | undefined) {
  const trimmed = optionalTrimmed(value);

  if (!trimmed) {
    return "";
  }

  return trimmed.replace(/[^a-zA-Z0-9:._-]/g, "").slice(0, 100);
}

function checkoutMetadataCents(value: number | null | undefined) {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? String(value) : "";
}

function normalizeManualEvidenceProvider(value: string): MpgfManualEvidenceProvider {
  if (
    value === "open_collective" ||
    value === "fiscal_host" ||
    value === "bank_transfer" ||
    value === "paypal" ||
    value === "other"
  ) {
    return value;
  }

  return "other";
}

function hasServiceRoleEnv() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function realMoneyMode(): MpgfRealMoneyReadiness["mode"] {
  if (process.env.MPGF_REAL_MONEY_ENABLED === "true") {
    return "real_money";
  }

  if (process.env.MPGF_TEST_PAYMENT_ENABLED === "true") {
    return "test_payment";
  }

  return "blocked";
}

function publicBlocker(message: string) {
  return message;
}

export async function loadMpgfRealMoneyReadiness(): Promise<MpgfRealMoneyReadiness> {
  const blockers: string[] = [];
  const requiredGates: MpgfRealMoneyReadiness["requiredGates"] = REQUIRED_REAL_MONEY_GATES.map((gateKey) => ({
    gateKey,
    status: "not_found",
  }));
  const mode = realMoneyMode();

  if (mode !== "real_money") {
    blockers.push(publicBlocker("MPGF_REAL_MONEY_ENABLED is not true."));
  }

  if (!process.env.MPGF_REAL_MONEY_ACCEPTANCE_ENABLED || process.env.MPGF_REAL_MONEY_ACCEPTANCE_ENABLED !== "true") {
    blockers.push(publicBlocker("MPGF_REAL_MONEY_ACCEPTANCE_ENABLED is not true."));
  }

  if (!hasStripeEnv()) {
    blockers.push(publicBlocker("STRIPE_SECRET_KEY is missing."));
  }

  if (!process.env.STRIPE_PUBLISHABLE_KEY && !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    blockers.push(publicBlocker("Stripe publishable key is missing."));
  }

  if (!getStripeWebhookSecret()) {
    blockers.push(publicBlocker("STRIPE_WEBHOOK_SECRET is missing."));
  }

  if (!hasSupabaseEnv()) {
    blockers.push(publicBlocker("Supabase public environment variables are missing."));
  }

  if (!hasServiceRoleEnv()) {
    blockers.push(publicBlocker("SUPABASE_SERVICE_ROLE_KEY is missing."));
  }

  if (hasSupabaseEnv() && hasServiceRoleEnv()) {
    try {
      const supabase = createServiceClient() as SupabaseServiceAny;
      const { data, error } = await supabase
        .from("mpgf_real_money_gate_status")
        .select("gate_key, status")
        .in("gate_key", [...REQUIRED_REAL_MONEY_GATES]);

      if (error) {
        blockers.push(publicBlocker("MPGF real-money gate table is not available. Run the real-money migration."));
      } else {
        const statusByGate = new Map<string, GateStatus>(
          (data ?? []).map((row: { gate_key: string; status: GateStatus }) => [row.gate_key, row.status]),
        );

        for (const gate of requiredGates) {
          gate.status = statusByGate.get(gate.gateKey) ?? "not_found";

          if (gate.status !== "passed") {
            blockers.push(publicBlocker(`Required MPGF real-money gate is not passed: ${gate.gateKey}.`));
          }
        }
      }
    } catch {
      blockers.push(publicBlocker("MPGF real-money gate status could not be checked."));
    }
  }

  return {
    ready: blockers.length === 0,
    mode,
    blockers,
    requiredGates,
  };
}

export async function loadMpgfManualEvidenceReadiness(): Promise<MpgfManualEvidenceReadiness> {
  const blockers: string[] = [];
  const requiredGates: MpgfManualEvidenceReadiness["requiredGates"] = [];
  const mode: MpgfManualEvidenceReadiness["mode"] = "manual_evidence_only";

  if (!hasSupabaseEnv()) {
    blockers.push(publicBlocker("Supabase public environment variables are missing."));
  }

  return {
    ready: blockers.length === 0,
    mode,
    providerLabel: process.env.MPGF_MANUAL_EVIDENCE_PROVIDER_LABEL || "Open Collective or fiscal host",
    externalPaymentUrl: optionalTrimmed(process.env.NEXT_PUBLIC_MPGF_EXTERNAL_PAYMENT_URL),
    blockers,
    requiredGates,
  };
}

export async function assertMpgfRealMoneyReady() {
  const readiness = await loadMpgfRealMoneyReadiness();

  if (!readiness.ready) {
    throw new Error(`MPGF real-money mode is blocked: ${readiness.blockers.join(" ")}`);
  }

  return readiness;
}

export async function createMpgfRealMoneyCheckout(input: {
  userId: string;
  displayName: string;
  email?: string | null;
  amountDollars: number;
  cadence: "one_time" | "monthly";
  publicGoodsCampaignId?: string | null;
  publicGoodsRoundId?: string | null;
  publicGoodsSponsorPoolContribution?: boolean;
  publicGoodsCountForMatching?: boolean;
  publicGoodsPerDonorCapCents?: number;
}): Promise<MpgfRealMoneyCheckoutResult> {
  const readiness = await loadMpgfRealMoneyReadiness();

  if (!readiness.ready) {
    return {
      ok: false,
      message: "MPGF real-money checkout is not enabled yet.",
      readiness,
    };
  }

  const amountCents = toCents(input.amountDollars, "MPGF contribution amount");
  const supabase = createServiceClient() as SupabaseServiceAny;
  const mode = readiness.mode === "real_money" ? "real_money" : "test_payment";
  const cadence = input.cadence;
  const recurringCommitment =
    cadence === "monthly"
      ? await supabase
          .from("mpgf_recurring_contribution_commitments")
          .insert({
            user_id: input.userId,
            amount_cents: amountCents,
            currency: "usd",
            cadence: "monthly",
            mode,
            status: "provider_action_required",
            start_cycle_id: demoCycle.id,
            next_cycle_id: demoCycle.id,
          })
          .select("id")
          .single()
      : null;

  if (recurringCommitment?.error) {
    throw new Error(`Could not create MPGF recurring contribution record: ${recurringCommitment.error.message}`);
  }

  const paymentIntentRecord = await supabase
    .from("mpgf_payment_intents")
    .insert({
      intended_cycle_id: demoCycle.id,
      budget_effective_cycle_id: demoCycle.id,
      user_id: input.userId,
      amount_cents: amountCents,
      currency: "usd",
      mode,
      provider: "stripe",
      status: "created",
      cadence,
      checkout_mode: cadence === "monthly" ? "subscription" : "payment",
      idempotency_key: `mpgf-${input.userId}-${demoCycle.id}-${cadence}-${Date.now()}`,
    })
    .select("id")
    .single();

  if (paymentIntentRecord.error) {
    throw new Error(`Could not create MPGF payment record: ${paymentIntentRecord.error.message}`);
  }

  const stripe = getStripe();
  const siteUrl = getSiteUrl();
  const metadata = {
    purpose: "mpgf_contribution",
    mpgf_payment_intent_id: String(paymentIntentRecord.data.id),
    mpgf_recurring_commitment_id: recurringCommitment?.data?.id ? String(recurringCommitment.data.id) : "",
    mpgf_cycle_id: demoCycle.id,
    mpgf_user_id: input.userId,
    mpgf_cadence: cadence,
    mpgf_mode: mode,
    mpgf_public_goods_round_id: checkoutMetadataText(input.publicGoodsRoundId),
    mpgf_public_goods_campaign_id: checkoutMetadataText(input.publicGoodsCampaignId),
    mpgf_public_goods_count_for_matching: input.publicGoodsCountForMatching === false ? "false" : "true",
    mpgf_public_goods_per_donor_cap_cents: checkoutMetadataCents(input.publicGoodsPerDonorCapCents),
    mpgf_public_goods_sponsor_pool: input.publicGoodsSponsorPoolContribution ? "true" : "false",
  };
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: cadence === "monthly" ? "subscription" : "payment",
    client_reference_id: input.userId,
    customer_email: input.email ?? undefined,
    metadata,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: amountCents,
          product_data: {
            name: cadence === "monthly" ? "Monthly Moral Public Goods Fund contribution" : "Moral Public Goods Fund contribution",
            description:
              "Contribution to the Moral Public Goods Fund. Allocation and disbursement remain subject to published MPGF governance, compliance, and payout gates.",
          },
          recurring: cadence === "monthly" ? { interval: "month" } : undefined,
        },
      },
    ],
    success_url: `${siteUrl}/mpgf/contribute/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/mpgf/contribute/cancel`,
    consent_collection: {
      terms_of_service: "required",
    },
    custom_text: {
      terms_of_service_acceptance: {
        message:
          "I understand this is a real-money MPGF contribution, not tax advice or an escrow claim, and disbursements require separate MPGF compliance and payout approval.",
      },
    },
  };

  if (cadence === "monthly") {
    sessionParams.subscription_data = { metadata };
  } else {
    sessionParams.payment_intent_data = { metadata };
  }

  const session = await stripe.checkout.sessions.create(sessionParams);

  await supabase
    .from("mpgf_payment_intents")
    .update({
      status: "requires_action",
      stripe_checkout_session_id: session.id,
      stripe_customer_id: stripeObjectId(session.customer),
      metadata_json: metadata,
    })
    .eq("id", paymentIntentRecord.data.id);

  return {
    ok: true,
    message: "Stripe Checkout session created.",
    checkoutUrl: session.url ?? undefined,
    readiness,
  };
}

function stripeObjectId(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object" && "id" in value && typeof value.id === "string") {
    return value.id;
  }

  return null;
}

export function canRecordMpgfSponsorPoolInvoice(commitment: { status?: string | null }) {
  return commitment.status === "active";
}

export function buildMpgfSubscriptionCancellationUpdate(subscription: {
  id?: unknown;
  status?: unknown;
  canceled_at?: unknown;
  ended_at?: unknown;
}) {
  const providerSubscriptionId = stripeObjectId(subscription.id);
  const cancelledAtSeconds =
    typeof subscription.canceled_at === "number"
      ? subscription.canceled_at
      : typeof subscription.ended_at === "number"
        ? subscription.ended_at
        : null;

  if (!providerSubscriptionId || subscription.status !== "canceled") {
    return null;
  }

  return {
    providerSubscriptionId,
    update: {
      status: "cancelled" as const,
      cancelled_at: new Date((cancelledAtSeconds ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
      next_scheduled_at: null,
    },
  };
}

type MpgfPublicGoodsRefundRoundStatus =
  | "draft"
  | "scheduled"
  | "open"
  | "allocation_pending"
  | "published"
  | "closed"
  | "emergency_suspended";

type MpgfPublicGoodsRefundReconciliationPlan =
  | {
      action: "back_out_counted_contribution_before_round_close";
      roundId: string;
      campaignId: string;
      sourceEventRef: string;
      pledgeUpdate: {
        status: "voided" | "pledged";
        eligibilityState: "blocked" | "pending_review";
      };
      paymentProofRow: MpgfPublicGoodsPaymentProofInsert;
    }
  | {
      action: "create_post_close_reconciliation_task";
      roundId: string;
      campaignId: string;
      sourceEventRef: string;
      reviewCaseRow: Record<string, unknown>;
    };

function readRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function metadataText(metadata: Record<string, unknown> | null, key: string) {
  const value = metadata?.[key];

  return typeof value === "string" && value.trim() ? value : null;
}

function isPreCloseRoundStatus(status: MpgfPublicGoodsRefundRoundStatus) {
  return status === "draft" || status === "scheduled" || status === "open";
}

export function buildMpgfPublicGoodsRefundReconciliationPlan(input: {
  paymentIntentId: string;
  metadata?: Record<string, unknown> | null;
  roundStatus?: MpgfPublicGoodsRefundRoundStatus | string | null;
  fullyRefunded: boolean;
  amountRefundedCents: number;
  providerRefundId?: string | null;
  providerChargeId?: string | null;
  refundedAt: string;
}): MpgfPublicGoodsRefundReconciliationPlan | null {
  const metadata = input.metadata ?? null;
  const roundId = metadataText(metadata, "mpgf_public_goods_round_id");
  const campaignId = metadataText(metadata, "mpgf_public_goods_campaign_id");

  if (!roundId || !campaignId) {
    return null;
  }

  const roundStatus =
    input.roundStatus === "draft" ||
    input.roundStatus === "scheduled" ||
    input.roundStatus === "open" ||
    input.roundStatus === "allocation_pending" ||
    input.roundStatus === "published" ||
    input.roundStatus === "closed" ||
    input.roundStatus === "emergency_suspended"
      ? input.roundStatus
      : "open";
  const sourceEventRef = `stripe_refund:${input.providerRefundId ?? input.providerChargeId ?? input.paymentIntentId}`;
  const refundSummary = input.fullyRefunded ? "Full refund" : "Partial refund";

  if (isPreCloseRoundStatus(roundStatus)) {
    return {
      action: "back_out_counted_contribution_before_round_close",
      roundId,
      campaignId,
      sourceEventRef,
      pledgeUpdate: {
        status: input.fullyRefunded ? "voided" : "pledged",
        eligibilityState: input.fullyRefunded ? "blocked" : "pending_review",
      },
      paymentProofRow: {
        pledge_id: null,
        campaign_id: campaignId,
        amount_verified_cents: 0,
        status: "superseded",
        reason_code: "external_handoff_failed",
        reconciliation_source: "fiscal_host_webhook",
        source_event_ref: sourceEventRef,
        created_at: input.refundedAt,
      },
    };
  }

  return {
    action: "create_post_close_reconciliation_task",
    roundId,
    campaignId,
    sourceEventRef,
    reviewCaseRow: {
      campaign_id: campaignId,
      state: "needs_evidence",
      action: "needs_evidence",
      reason_code: "external_handoff_failed",
      reviewer_id: null,
      opened_at: input.refundedAt,
      closed_at: null,
      appeal_status: "none",
      challenge_window_ends_at: null,
      public_notes: `${refundSummary} after round close requires MPGF reconciliation before any milestone release changes.`,
      allowed_next_actions: ["needs_evidence", "challenge", "finalize"],
    },
  };
}

export async function createMpgfBillingPortal(input: { userId: string }): Promise<MpgfRealMoneyCheckoutResult> {
  const readiness = await loadMpgfRealMoneyReadiness();

  if (!readiness.ready) {
    return {
      ok: false,
      message: "MPGF Stripe Billing management is not enabled yet.",
      readiness,
    };
  }

  const supabase = createServiceClient() as SupabaseServiceAny;
  const { data: commitment, error } = await supabase
    .from("mpgf_recurring_contribution_commitments")
    .select("id, provider_customer_id, provider_subscription_id")
    .eq("user_id", input.userId)
    .in("mode", ["test_payment", "real_money"])
    .not("provider_customer_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not read MPGF billing state: ${error.message}`);
  }

  if (!commitment?.provider_customer_id) {
    return {
      ok: false,
      message: "No active MPGF Stripe Billing customer was found for this account.",
      readiness,
    };
  }

  const portalSession = await getStripe().billingPortal.sessions.create({
    customer: commitment.provider_customer_id,
    return_url: `${getSiteUrl()}/mpgf/account/contributions`,
  });

  return {
    ok: true,
    message: "Stripe Billing portal session created.",
    checkoutUrl: portalSession.url,
    readiness,
  };
}

function toManualEvidenceRecord(row: Record<string, unknown>): MpgfRealMoneyAccountState["manualEvidence"][number] {
  return {
    id: String(row.id),
    amountCents: Number(row.amount_cents ?? 0),
    currency: typeof row.currency === "string" ? row.currency : "usd",
    provider: normalizeManualEvidenceProvider(String(row.provider ?? "other")),
    externalPaymentReference: String(row.external_payment_reference ?? ""),
    evidenceUrl: typeof row.evidence_url === "string" ? row.evidence_url : null,
    evidenceDescription: String(row.evidence_description ?? ""),
    paidAt: typeof row.paid_at === "string" ? row.paid_at : null,
    status:
      row.status === "under_review" ||
      row.status === "verified" ||
      row.status === "rejected" ||
      row.status === "converted_to_contribution"
        ? row.status
        : "submitted",
    createdAt: typeof row.created_at === "string" ? row.created_at : null,
    reviewedAt: typeof row.reviewed_at === "string" ? row.reviewed_at : null,
  };
}

export async function submitMpgfManualExternalPaymentEvidence(input: {
  userId: string;
  amountDollars: number;
  provider: MpgfManualEvidenceProvider;
  externalPaymentReference: string;
  evidenceUrl?: string | null;
  evidenceDescription: string;
  paidAt?: string | null;
}): Promise<MpgfManualEvidenceActionResult> {
  const readiness = await loadMpgfManualEvidenceReadiness();
  const amountCents = toCents(input.amountDollars, "External payment evidence amount");
  const externalPaymentReference = optionalTrimmed(input.externalPaymentReference);
  const evidenceDescription = optionalTrimmed(input.evidenceDescription);
  const paidAt = optionalTrimmed(input.paidAt);

  if (!externalPaymentReference) {
    return {
      ok: false,
      message: "External payment reference is required.",
      readiness,
    };
  }

  if (!evidenceDescription) {
    return {
      ok: false,
      message: "Evidence description is required.",
      readiness,
    };
  }

  const securedEvidence = normalizeMpgfManualEvidenceSecurity({
    evidenceDescription,
    evidenceUrl: input.evidenceUrl,
    externalPaymentReference,
    siteUrl: getSiteUrl(),
  });

  let supabase: SupabaseServiceAny;

  try {
    supabase = (await createClient()) as unknown as SupabaseServiceAny;
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not open MPGF manual evidence persistence.",
      readiness,
    };
  }

  const { data, error } = await supabase
    .from("mpgf_manual_external_payment_evidence")
    .insert({
      user_id: input.userId,
      cycle_id: demoCycle.id,
      amount_cents: amountCents,
      currency: "usd",
      provider: input.provider,
      external_payment_reference: externalPaymentReference,
      evidence_url: securedEvidence.signedEvidenceUrl,
      evidence_description: evidenceDescription,
      evidence_access_scope: securedEvidence.accessScope,
      evidence_signed_url_expires_at: securedEvidence.signedUrlExpiresAt,
      evidence_malware_scan_status: securedEvidence.malwareScanStatus,
      evidence_normalized_json: securedEvidence.normalizedEvidenceJson,
      paid_at: paidAt || null,
      status: "submitted",
    })
    .select("*")
    .single();

  if (error) {
    return {
      ok: false,
      message: `Could not submit MPGF manual external-payment evidence: ${error.message}`,
      readiness,
    };
  }

  return {
    ok: true,
    message: "Manual external-payment evidence submitted for MPGF review. It is not counted as a verified contribution yet.",
    evidence: toManualEvidenceRecord(data as Record<string, unknown>),
    readiness,
  };
}

function toRealMoneyContribution(row: Record<string, unknown>): MpgfRealMoneyAccountState["contributions"][number] {
  return {
    id: String(row.id),
    paymentIntentId: typeof row.payment_intent_id === "string" ? row.payment_intent_id : null,
    amountCents: Number(row.amount_cents ?? 0),
    currency: typeof row.currency === "string" ? row.currency : "usd",
    contributionMode:
      row.contribution_mode === "test_payment" || row.contribution_mode === "manual_external"
        ? row.contribution_mode
        : "real_money",
    status:
      row.status === "pending" ||
      row.status === "late_assigned_next_cycle" ||
      row.status === "refunded" ||
      row.status === "chargeback_disputed" ||
      row.status === "chargeback_lost" ||
      row.status === "voided"
        ? row.status
        : "recorded",
    receivedAt: typeof row.received_at === "string" ? row.received_at : null,
    budgetEffectiveAt: typeof row.budget_effective_at === "string" ? row.budget_effective_at : null,
  };
}

function toRealMoneyRefund(row: Record<string, unknown>): MpgfRealMoneyAccountState["refunds"][number] {
  return {
    id: String(row.id),
    contributionId: typeof row.contribution_id === "string" ? row.contribution_id : null,
    paymentIntentId: typeof row.payment_intent_id === "string" ? row.payment_intent_id : null,
    amountCents: Number(row.amount_cents ?? 0),
    currency: typeof row.currency === "string" ? row.currency : "usd",
    status:
      row.status === "approved" ||
      row.status === "submitted_to_provider" ||
      row.status === "succeeded" ||
      row.status === "failed" ||
      row.status === "cancelled"
        ? row.status
        : "requested",
    requestedAt: typeof row.requested_at === "string" ? row.requested_at : null,
    processedAt: typeof row.processed_at === "string" ? row.processed_at : null,
  };
}

export async function loadMpgfRealMoneyAccountState(input: {
  userId?: string | null;
}): Promise<MpgfRealMoneyAccountState> {
  const emptyState: MpgfRealMoneyAccountState = {
    contributions: [],
    manualEvidence: [],
    refunds: [],
    billingPortalAvailable: false,
    warnings: [],
  };

  if (!input.userId) {
    return emptyState;
  }

  if (!hasSupabaseEnv() || !hasServiceRoleEnv()) {
    return {
      ...emptyState,
      warnings: ["Real-money account state requires Supabase service configuration."],
    };
  }

  try {
    const supabase = createServiceClient() as SupabaseServiceAny;
    const [
      { data: contributions, error: contributionsError },
      { data: refunds, error: refundsError },
      { data: manualEvidence, error: manualEvidenceError },
      { data: commitments },
    ] =
      await Promise.all([
        supabase
          .from("mpgf_contributions")
          .select("id, payment_intent_id, amount_cents, currency, contribution_mode, status, received_at, budget_effective_at")
          .eq("user_id", input.userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("mpgf_refunds")
          .select("id, contribution_id, payment_intent_id, amount_cents, currency, status, requested_at, processed_at")
          .eq("requested_by", input.userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("mpgf_manual_external_payment_evidence")
          .select("id, amount_cents, currency, provider, external_payment_reference, evidence_url, evidence_description, paid_at, status, created_at, reviewed_at")
          .eq("user_id", input.userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("mpgf_recurring_contribution_commitments")
          .select("id, provider_customer_id")
          .eq("user_id", input.userId)
          .in("mode", ["test_payment", "real_money"])
          .not("provider_customer_id", "is", null)
          .limit(1),
      ]);

    const warnings = [
      contributionsError ? `Real-money contributions could not be loaded: ${contributionsError.message}` : null,
      refundsError ? `Real-money refunds could not be loaded: ${refundsError.message}` : null,
      manualEvidenceError ? `Manual external-payment evidence could not be loaded: ${manualEvidenceError.message}` : null,
    ].filter((warning): warning is string => Boolean(warning));

    return {
      contributions: (contributions ?? []).map(toRealMoneyContribution),
      manualEvidence: (manualEvidence ?? []).map(toManualEvidenceRecord),
      refunds: (refunds ?? []).map(toRealMoneyRefund),
      billingPortalAvailable: Boolean(commitments?.length),
      warnings,
    };
  } catch (error) {
    return {
      ...emptyState,
      warnings: [error instanceof Error ? error.message : "Real-money account state could not be loaded."],
    };
  }
}

async function upsertContributionFromPaymentIntent(input: {
  supabase: SupabaseServiceAny;
  paymentIntentId: string;
  userId: string | null;
  amountCents: number;
  mode: "test_payment" | "real_money";
  stripePaymentIntentId: string | null;
  stripeCustomerId?: string | null;
  stripeCheckoutSessionId?: string | null;
  stripeSubscriptionId?: string | null;
  status?: "pending" | "recorded" | "refunded" | "voided";
}) {
  await input.supabase.from("mpgf_payment_intents").update({
    status: input.status === "refunded" ? "succeeded" : "succeeded",
    stripe_payment_intent_id: input.stripePaymentIntentId,
    stripe_customer_id: input.stripeCustomerId ?? undefined,
    stripe_checkout_session_id: input.stripeCheckoutSessionId ?? undefined,
    stripe_subscription_id: input.stripeSubscriptionId ?? undefined,
    confirmed_at: new Date().toISOString(),
  }).eq("id", input.paymentIntentId);

  return input.supabase.from("mpgf_contributions").upsert(
    {
      cycle_id: demoCycle.id,
      budget_effective_cycle_id: demoCycle.id,
      user_id: input.userId,
      payment_intent_id: input.paymentIntentId,
      amount_cents: input.amountCents,
      currency: "usd",
      contribution_mode: input.mode,
      status: input.status ?? "recorded",
      received_at: new Date().toISOString(),
      budget_effective_at: new Date().toISOString(),
      stripe_payment_intent_id: input.stripePaymentIntentId,
      stripe_checkout_session_id: input.stripeCheckoutSessionId ?? null,
      stripe_subscription_id: input.stripeSubscriptionId ?? null,
    },
    { onConflict: "payment_intent_id" },
  );
}

async function recordMpgfCheckoutSession(session: Stripe.Checkout.Session, status: "paid" | "failed" | "cancelled") {
  const metadata = session.metadata ?? {};
  const paymentIntentRecordId = metadata.mpgf_payment_intent_id;

  if (!paymentIntentRecordId) {
    return false;
  }

  const supabase = createServiceClient() as SupabaseServiceAny;
  const stripePaymentIntentId = stripeObjectId(session.payment_intent);
  const stripeSubscriptionId = stripeObjectId(session.subscription);
  const stripeCustomerId = stripeObjectId(session.customer);
  const mode = metadata.mpgf_mode === "test_payment" ? "test_payment" : "real_money";
  const amountCents = Number(session.amount_total ?? 0);
  const userId = metadata.mpgf_user_id || null;

  if (status === "paid") {
    await upsertContributionFromPaymentIntent({
      supabase,
      paymentIntentId: paymentIntentRecordId,
      userId,
      amountCents,
      mode,
      stripePaymentIntentId,
      stripeCustomerId,
      stripeCheckoutSessionId: session.id,
      stripeSubscriptionId,
      status: "recorded",
    });

    if (metadata.mpgf_recurring_commitment_id && stripeSubscriptionId) {
      await supabase
        .from("mpgf_recurring_contribution_commitments")
        .update({
          status: "active",
          provider_subscription_id: stripeSubscriptionId,
          provider_customer_id: stripeCustomerId,
          next_scheduled_at: null,
        })
        .eq("id", metadata.mpgf_recurring_commitment_id);
    }

    return true;
  }

  await supabase
    .from("mpgf_payment_intents")
    .update({
      status: status === "cancelled" ? "cancelled" : "failed",
      stripe_payment_intent_id: stripePaymentIntentId,
      stripe_customer_id: stripeCustomerId,
      stripe_checkout_session_id: session.id,
      stripe_subscription_id: stripeSubscriptionId,
    })
    .eq("id", paymentIntentRecordId);

  return true;
}

async function recordMpgfSubscriptionInvoice(invoice: Stripe.Invoice) {
  const invoiceAny = invoice as unknown as Record<string, any>;
  const subscriptionId = stripeObjectId(invoiceAny.subscription);

  if (!subscriptionId) {
    return false;
  }

  const supabase = createServiceClient() as SupabaseServiceAny;
  const { data: commitment } = await supabase
    .from("mpgf_recurring_contribution_commitments")
    .select("id, user_id, amount_cents, mode, status, provider_customer_id")
    .eq("provider_subscription_id", subscriptionId)
    .maybeSingle();

  if (!commitment || !canRecordMpgfSponsorPoolInvoice(commitment)) {
    return false;
  }

  const stripePaymentIntentId = stripeObjectId(invoiceAny.payment_intent);
  const amountCents = Number(invoice.amount_paid ?? commitment.amount_cents ?? 0);
  const paymentIntentRecord = await supabase
    .from("mpgf_payment_intents")
    .upsert(
      {
        intended_cycle_id: demoCycle.id,
        budget_effective_cycle_id: demoCycle.id,
        user_id: commitment.user_id,
        amount_cents: amountCents,
        currency: "usd",
        mode: commitment.mode === "test_payment" ? "test_payment" : "real_money",
        provider: "stripe",
        provider_payment_intent_id: stripePaymentIntentId,
        stripe_payment_intent_id: stripePaymentIntentId,
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: commitment.provider_customer_id,
        status: "succeeded",
        cadence: "monthly",
        checkout_mode: "subscription",
        idempotency_key: invoice.id,
        confirmed_at: new Date().toISOString(),
      },
      { onConflict: "idempotency_key" },
    )
    .select("id")
    .single();

  if (paymentIntentRecord.error) {
    throw new Error(paymentIntentRecord.error.message);
  }

  await upsertContributionFromPaymentIntent({
    supabase,
    paymentIntentId: paymentIntentRecord.data.id,
    userId: commitment.user_id,
    amountCents,
    mode: commitment.mode === "test_payment" ? "test_payment" : "real_money",
    stripePaymentIntentId,
    stripeCustomerId: commitment.provider_customer_id,
    stripeSubscriptionId: subscriptionId,
    status: "recorded",
  });

  return true;
}

async function recordMpgfSubscriptionCancellation(subscription: Stripe.Subscription) {
  const cancellation = buildMpgfSubscriptionCancellationUpdate(subscription as unknown as Record<string, unknown>);

  if (!cancellation) {
    return false;
  }

  const supabase = createServiceClient() as SupabaseServiceAny;
  const { data, error } = await supabase
    .from("mpgf_recurring_contribution_commitments")
    .update(cancellation.update)
    .eq("provider_subscription_id", cancellation.providerSubscriptionId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

async function loadMpgfPublicGoodsRoundStatus(supabase: SupabaseServiceAny, roundId: string) {
  const result = await supabase
    .from("mpgf_public_goods_rounds")
    .select("status")
    .eq("id", roundId)
    .maybeSingle();

  if (result.error) {
    throw new Error(`Could not load MPGF public-goods round for refund reconciliation: ${result.error.message}`);
  }

  const status = (result.data as Record<string, unknown> | null)?.status;

  return typeof status === "string" ? status : "open";
}

async function reconcileMpgfPublicGoodsRefund(input: {
  supabase: SupabaseServiceAny;
  paymentIntentId: string;
  metadata: Record<string, unknown> | null;
  fullyRefunded: boolean;
  amountRefundedCents: number;
  providerRefundId?: string | null;
  providerChargeId?: string | null;
  refundedAt: string;
}) {
  const roundId = metadataText(input.metadata, "mpgf_public_goods_round_id");
  const roundStatus = roundId ? await loadMpgfPublicGoodsRoundStatus(input.supabase, roundId) : null;
  const plan = buildMpgfPublicGoodsRefundReconciliationPlan({
    paymentIntentId: input.paymentIntentId,
    metadata: input.metadata,
    roundStatus,
    fullyRefunded: input.fullyRefunded,
    amountRefundedCents: input.amountRefundedCents,
    providerRefundId: input.providerRefundId,
    providerChargeId: input.providerChargeId,
    refundedAt: input.refundedAt,
  });

  if (!plan) {
    return false;
  }

  if (plan.action === "back_out_counted_contribution_before_round_close") {
    const pledgeUpdate = await input.supabase
      .from("mpgf_public_goods_pledges")
      .update({
        status: plan.pledgeUpdate.status,
        eligibility_state: plan.pledgeUpdate.eligibilityState,
      })
      .eq("payment_intent_ref", input.paymentIntentId)
      .eq("campaign_id", plan.campaignId);

    if (pledgeUpdate.error) {
      throw new Error(`Could not back out MPGF public-goods pledge after refund: ${pledgeUpdate.error.message}`);
    }

    const proofUpsert = await input.supabase
      .from("mpgf_public_goods_payment_proofs")
      .upsert(plan.paymentProofRow, { onConflict: "reconciliation_source,source_event_ref" });

    if (proofUpsert.error) {
      throw new Error(`Could not record MPGF public-goods refund proof: ${proofUpsert.error.message}`);
    }

    return true;
  }

  const reviewCaseInsert = await input.supabase.from("mpgf_public_goods_review_cases").insert(plan.reviewCaseRow);

  if (reviewCaseInsert.error) {
    throw new Error(`Could not create MPGF public-goods post-close refund reconciliation task: ${reviewCaseInsert.error.message}`);
  }

  return true;
}

async function recordMpgfRefundFromCharge(charge: Stripe.Charge) {
  const stripePaymentIntentId = stripeObjectId(charge.payment_intent);

  if (!stripePaymentIntentId) {
    return false;
  }

  const supabase = createServiceClient() as SupabaseServiceAny;
  const { data: paymentIntent } = await supabase
    .from("mpgf_payment_intents")
    .select("id, amount_cents, metadata_json")
    .eq("stripe_payment_intent_id", stripePaymentIntentId)
    .maybeSingle();

  if (!paymentIntent) {
    return false;
  }

  const amountRefundedCents = Number(charge.amount_refunded ?? 0);
  const fullyRefunded = amountRefundedCents >= Number(paymentIntent.amount_cents ?? 0);
  const latestRefund = charge.refunds?.data?.[0];
  const refundedAt = new Date(
    ((latestRefund?.created ?? Math.floor(Date.now() / 1000)) as number) * 1000,
  ).toISOString();

  await supabase
    .from("mpgf_contributions")
    .update({
      status: fullyRefunded ? "refunded" : "recorded",
      refunded_at: fullyRefunded ? new Date().toISOString() : null,
      provider_charge_id: charge.id,
    })
    .eq("payment_intent_id", paymentIntent.id);

  if (latestRefund) {
    await supabase.from("mpgf_refunds").upsert(
      {
        payment_intent_id: paymentIntent.id,
        amount_cents: latestRefund.amount,
        currency: latestRefund.currency,
        status: latestRefund.status === "succeeded" ? "succeeded" : "submitted_to_provider",
        provider_refund_id: latestRefund.id,
        provider_submitted_at: refundedAt,
        processed_at: latestRefund.status === "succeeded" ? new Date().toISOString() : null,
        evidence_json: {
          stripeChargeId: charge.id,
          publicGoodsReconciliation:
            await reconcileMpgfPublicGoodsRefund({
              supabase,
              paymentIntentId: String(paymentIntent.id),
              metadata: readRecord((paymentIntent as Record<string, unknown>).metadata_json),
              fullyRefunded,
              amountRefundedCents,
              providerRefundId: latestRefund.id,
              providerChargeId: charge.id,
              refundedAt,
            }),
        },
      },
      { onConflict: "provider_refund_id" },
    );
  } else {
    await reconcileMpgfPublicGoodsRefund({
      supabase,
      paymentIntentId: String(paymentIntent.id),
      metadata: readRecord((paymentIntent as Record<string, unknown>).metadata_json),
      fullyRefunded,
      amountRefundedCents,
      providerChargeId: charge.id,
      refundedAt,
    });
  }

  return true;
}

export function hashStripeWebhookBody(rawBody: string) {
  return createHash("sha256").update(rawBody).digest("hex");
}

function toStripeSavedCommitmentEventRow(
  event: MpgfStripeSavedCommitmentWebhookEvent,
): MpgfStripeSavedCommitmentEventInsert {
  return {
    id: event.id,
    saved_commitment_id: null,
    conditional_pledge_id: event.conditionalPledgeId ?? null,
    pledge_intent_id: event.pledgeIntentId ?? null,
    provider_event_id_hash: event.providerEventIdHash,
    provider_object_id_hash: event.providerObjectIdHash ?? null,
    provider_customer_id_hash: event.providerCustomerIdHash ?? null,
    provider_payment_method_id_hash: event.providerPaymentMethodIdHash ?? null,
    event_type: event.eventType,
    event_state: event.eventState,
    status: event.status,
    signature_verified: event.signatureVerified,
    structure_verified: event.structureVerified,
    payload_hash: event.payloadHash,
    append_only_hash: event.appendOnlyHash,
    review_required_before_counting: true,
    final_payout_authorized: false,
    received_at: event.receivedAt,
  };
}

function toPaymentMethodTokenRow(
  event: MpgfStripeSavedCommitmentWebhookEvent,
): MpgfPaymentMethodTokenInsert | null {
  if (!event.paymentMethodToken || !event.stateChangeAllowed) {
    return null;
  }

  return {
    id: event.paymentMethodToken.id,
    profile_id: null,
    provider: "stripe",
    provider_customer_id_hash: event.paymentMethodToken.providerCustomerIdHash,
    provider_payment_method_id_hash: event.paymentMethodToken.providerPaymentMethodIdHash,
    setup_status: event.paymentMethodToken.setupStatus,
    future_use_consent_at: event.receivedAt,
    raw_card_data_stored: false,
    updated_at: event.receivedAt,
  };
}

function toStripePaymentEventRow(event: MpgfStripeSavedCommitmentWebhookEvent): MpgfPaymentEventInsert | null {
  if (!event.stateChangeAllowed) {
    return null;
  }

  return {
    id: `mpgf-stripe-payment-event-${event.providerEventIdHash.slice(7, 19)}`,
    conditional_pledge_id: event.conditionalPledgeId ?? null,
    provider: "stripe",
    provider_event_id_hash: event.providerEventIdHash,
    provider_status: event.eventState,
    amount_cents: event.amountCents ?? 0,
    signature_verified: event.signatureVerified,
    payload_hash: event.payloadHash,
    verified_at: event.status === "recorded" ? event.receivedAt : null,
    final_payout_authorized: false,
    append_only_hash: event.appendOnlyHash,
    created_at: event.receivedAt,
  };
}

async function persistMpgfStripeSavedCommitmentWebhookEvent(
  supabase: SupabaseServiceAny,
  event: MpgfStripeSavedCommitmentWebhookEvent,
) {
  const eventRow = toStripeSavedCommitmentEventRow(event);
  const eventWrite = await supabase
    .from("mpgf_stripe_saved_commitment_events")
    .upsert(eventRow, { onConflict: "provider_event_id_hash" });

  if (eventWrite.error) {
    throw new Error(eventWrite.error.message);
  }

  const tokenRow = toPaymentMethodTokenRow(event);

  if (tokenRow) {
    const tokenWrite = await supabase
      .from("mpgf_payment_method_tokens")
      .upsert(tokenRow, { onConflict: "id" });

    if (tokenWrite.error) {
      throw new Error(tokenWrite.error.message);
    }
  }

  const paymentEventRow = toStripePaymentEventRow(event);

  if (paymentEventRow) {
    const paymentEventWrite = await supabase
      .from("mpgf_payment_events")
      .upsert(paymentEventRow, { onConflict: "provider_event_id_hash" });

    if (paymentEventWrite.error) {
      throw new Error(paymentEventWrite.error.message);
    }
  }
}

export async function handleMpgfStripeWebhookEvent(input: {
  event: Stripe.Event;
  rawBodyHash: string;
  signatureVerified: boolean;
}) {
  const supabase = createServiceClient() as SupabaseServiceAny;
  const eventRecord = await supabase
    .from("mpgf_payment_webhook_events")
    .upsert(
      {
        provider: "stripe",
        provider_event_id: input.event.id,
        stripe_event_id: input.event.id,
        event_type: input.event.type,
        raw_body_hash: input.rawBodyHash,
        payload_json: input.event as unknown as Record<string, unknown>,
        signature_verified: input.signatureVerified,
        signature_verified_at: input.signatureVerified ? new Date().toISOString() : null,
        status: "received",
      },
      { onConflict: "provider,provider_event_id" },
    )
    .select("id, processed")
    .single();

  if (eventRecord.error) {
    throw new Error(eventRecord.error.message);
  }

  if (eventRecord.data.processed) {
    await supabase
      .from("mpgf_payment_webhook_events")
      .update({
        replay_attempt_count: 1,
        last_replayed_at: new Date().toISOString(),
      })
      .eq("id", eventRecord.data.id);

    return { handled: true, status: "already_processed" as const };
  }

  let handled = false;

  try {
    if (
      input.event.type === "checkout.session.completed" ||
      input.event.type === "checkout.session.async_payment_succeeded"
    ) {
      handled = await recordMpgfCheckoutSession(input.event.data.object as Stripe.Checkout.Session, "paid");
    } else if (input.event.type === "checkout.session.async_payment_failed") {
      handled = await recordMpgfCheckoutSession(input.event.data.object as Stripe.Checkout.Session, "failed");
    } else if (input.event.type === "checkout.session.expired") {
      handled = await recordMpgfCheckoutSession(input.event.data.object as Stripe.Checkout.Session, "cancelled");
    } else if (input.event.type === "invoice.paid") {
      handled = await recordMpgfSubscriptionInvoice(input.event.data.object as Stripe.Invoice);
    } else if (
      input.event.type === "customer.subscription.deleted" ||
      input.event.type === "customer.subscription.updated"
    ) {
      handled = await recordMpgfSubscriptionCancellation(input.event.data.object as Stripe.Subscription);
    } else if (input.event.type === "charge.refunded") {
      handled = await recordMpgfRefundFromCharge(input.event.data.object as Stripe.Charge);
    } else if (
      isMpgfStripeSavedCommitmentEvent(
        input.event.type,
        readRecord((input.event.data.object as unknown as Record<string, unknown> | undefined)?.metadata) ?? {},
      )
    ) {
      const savedCommitmentEvent = recordMpgfStripeSavedCommitmentWebhook(input.event as unknown as Record<string, unknown>, {
        signatureVerified: input.signatureVerified,
      });
      await persistMpgfStripeSavedCommitmentWebhookEvent(supabase, savedCommitmentEvent);
      handled = true;
    }

    await supabase
      .from("mpgf_payment_webhook_events")
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
        status: handled ? "processed" : "ignored",
      })
      .eq("id", eventRecord.data.id);

    return { handled, status: handled ? ("processed" as const) : ("ignored" as const) };
  } catch (error) {
    await supabase
      .from("mpgf_payment_webhook_events")
      .update({
        processed: false,
        processing_error: error instanceof Error ? error.message : "Unknown MPGF webhook handling error.",
        status: "failed",
      })
      .eq("id", eventRecord.data.id);

    throw error;
  }
}

export async function requestMpgfRefund(input: { contributionId: string; reason: string }) {
  const viewer = await getViewer();

  if (!viewer) {
    return { ok: false, message: "Sign in to request an MPGF refund." };
  }

  const supabase = createServiceClient() as SupabaseServiceAny;
  const { data: contribution, error: contributionError } = await supabase
    .from("mpgf_contributions")
    .select("id, user_id, payment_intent_id, amount_cents, currency, status")
    .eq("id", input.contributionId)
    .eq("user_id", viewer.authUser.id)
    .maybeSingle();

  if (contributionError || !contribution) {
    return { ok: false, message: "Refundable MPGF contribution was not found for this account." };
  }

  if (contribution.status !== "recorded") {
    return { ok: false, message: "Only recorded MPGF contributions can request a refund." };
  }

  const { error } = await supabase.from("mpgf_refunds").insert({
    contribution_id: contribution.id,
    payment_intent_id: contribution.payment_intent_id,
    amount_cents: contribution.amount_cents,
    currency: contribution.currency,
    status: "requested",
    reason: input.reason.trim() || "Participant requested refund.",
    requested_by: viewer.authUser.id,
    requested_at: new Date().toISOString(),
  });

  if (error) {
    return { ok: false, message: `Could not request MPGF refund: ${error.message}` };
  }

  return { ok: true, message: "MPGF refund request recorded for review." };
}
