import { NextResponse } from "next/server";

import { authenticateEveryOrgPartnerWebhookRequest } from "@/lib/every-org-partner-webhook-auth";
import { MPGF_PUBLIC_GOODS_API_HEADERS } from "@/lib/mpgf/public-goods-api";
import {
  type MpgfEveryOrgPartnerWebhookEvent,
  type MpgfEveryOrgPartnerWebhookPayload,
  recordMpgfEveryOrgPartnerWebhook,
} from "@/lib/mpgf/public-goods-every-org";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type MpgfEveryOrgPartnerEventInsert =
  Database["public"]["Tables"]["mpgf_every_org_partner_events"]["Insert"];
type MpgfPublicGoodsPaymentProofInsert =
  Database["public"]["Tables"]["mpgf_public_goods_payment_proofs"]["Insert"];
type MpgfPaymentEventInsert = Database["public"]["Tables"]["mpgf_payment_events"]["Insert"];

interface DbErrorLike {
  code?: string | null;
  message?: string | null;
}

function hasServiceRoleEnv() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function safeTimestamp(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function toPartnerEventRow(
  partnerWebhookEvent: MpgfEveryOrgPartnerWebhookEvent,
): MpgfEveryOrgPartnerEventInsert {
  return {
    id: partnerWebhookEvent.id,
    round_id: partnerWebhookEvent.roundId,
    campaign_id: partnerWebhookEvent.campaignId ?? null,
    conditional_pledge_id: partnerWebhookEvent.conditionalPledgeId ?? null,
    pledge_intent_id: partnerWebhookEvent.pledgeIntentId ?? null,
    contributor_ref_hash: partnerWebhookEvent.contributorRefHash ?? null,
    partner_donation_id_hash: partnerWebhookEvent.partnerDonationIdHash ?? null,
    charge_id_hash: partnerWebhookEvent.chargeIdHash,
    nonprofit_ref_hash: partnerWebhookEvent.nonprofitRefHash ?? null,
    amount_cents: partnerWebhookEvent.amountCents,
    net_amount_cents: partnerWebhookEvent.netAmountCents ?? null,
    currency: partnerWebhookEvent.currency,
    frequency: partnerWebhookEvent.frequency ?? null,
    donation_date: safeTimestamp(partnerWebhookEvent.donationDate),
    status: partnerWebhookEvent.status,
    structure_verified: partnerWebhookEvent.structureVerified,
    webhook_verified: partnerWebhookEvent.webhookVerified,
    auto_creates_contribution_evidence: partnerWebhookEvent.autoCreatesContributionEvidence,
    evidence_review_state: partnerWebhookEvent.evidenceRecord.reviewState,
    review_required_before_counting: true,
    final_payout_authorized: false,
    payload_hash: partnerWebhookEvent.payloadHash,
    append_only_hash: partnerWebhookEvent.appendOnlyHash,
    received_at: safeTimestamp(partnerWebhookEvent.receivedAt) ?? new Date().toISOString(),
  };
}

function toPaymentEventRow(partnerWebhookEvent: MpgfEveryOrgPartnerWebhookEvent): MpgfPaymentEventInsert {
  return {
    id: `mpgf-payment-event-${partnerWebhookEvent.chargeIdHash.slice(7, 19)}`,
    conditional_pledge_id: partnerWebhookEvent.conditionalPledgeId ?? null,
    provider: "every_org",
    provider_event_id_hash: partnerWebhookEvent.chargeIdHash,
    provider_status: partnerWebhookEvent.status,
    amount_cents: partnerWebhookEvent.amountCents,
    signature_verified: partnerWebhookEvent.webhookVerified,
    payload_hash: partnerWebhookEvent.payloadHash,
    verified_at: partnerWebhookEvent.status === "recorded" ? safeTimestamp(partnerWebhookEvent.receivedAt) : null,
    final_payout_authorized: false,
    append_only_hash: partnerWebhookEvent.appendOnlyHash,
    created_at: safeTimestamp(partnerWebhookEvent.receivedAt) ?? new Date().toISOString(),
  };
}

function toContributionEvidenceRow(
  partnerWebhookEvent: MpgfEveryOrgPartnerWebhookEvent,
): MpgfPublicGoodsPaymentProofInsert | null {
  if (!partnerWebhookEvent.autoCreatesContributionEvidence || !partnerWebhookEvent.campaignId) {
    return null;
  }

  return {
    campaign_id: partnerWebhookEvent.campaignId,
    external_receipt_ref: partnerWebhookEvent.chargeIdHash,
    charity_receipt_ref: partnerWebhookEvent.partnerDonationIdHash ?? partnerWebhookEvent.nonprofitRefHash ?? null,
    amount_verified_cents: partnerWebhookEvent.amountCents,
    status: "pending_review",
    reason_code: "external_handoff_verified",
    reconciliation_source: "every_org_partner_webhook",
    source_event_ref: partnerWebhookEvent.dedupeKey,
    verified_at: null,
    created_at: safeTimestamp(partnerWebhookEvent.receivedAt) ?? new Date().toISOString(),
  };
}

function resultFromDbError(error: DbErrorLike, base: Record<string, unknown>) {
  if (error.code === "23505") {
    return { ...base, status: "already_recorded" as const };
  }

  if (error.code === "42P01" || error.code === "42703" || error.code === "23514") {
    return {
      ...base,
      status: "schema_missing" as const,
      migration: "20260601_mpgf_every_org_evidence_records.sql",
      error:
        "MPGF Every.org evidence tables or reconciliation-source constraints are missing. Run the Every.org evidence-record migration before accepting partner webhooks.",
    };
  }

  return {
    ...base,
    status: "failed" as const,
    error: error.message ?? "Could not persist Every.org partner webhook evidence.",
  };
}

async function persistPartnerWebhookEvent(partnerWebhookEvent: MpgfEveryOrgPartnerWebhookEvent) {
  const partnerEventRow = toPartnerEventRow(partnerWebhookEvent);
  const paymentEventRow = toPaymentEventRow(partnerWebhookEvent);
  const evidenceRow = toContributionEvidenceRow(partnerWebhookEvent);
  const base = {
    dedupeBy: "charge_id_hash",
    dedupeKey: partnerEventRow.charge_id_hash,
  };

  if (!hasSupabaseEnv() || !hasServiceRoleEnv()) {
    return {
      ...base,
      status: "not_configured" as const,
      warning:
        "Supabase service-role persistence is not configured; the Every.org event was validated but not counted.",
    };
  }

  const supabase = createServiceClient();
  const partnerEventWrite = await supabase.from("mpgf_every_org_partner_events").insert(partnerEventRow);
  const partnerEvent = partnerEventWrite.error
    ? resultFromDbError(partnerEventWrite.error as DbErrorLike, {
        table: "mpgf_every_org_partner_events",
        id: partnerEventRow.id,
      })
    : { table: "mpgf_every_org_partner_events", id: partnerEventRow.id, status: "inserted" as const };
  const paymentEventWrite = await supabase.from("mpgf_payment_events").insert(paymentEventRow);
  const paymentEvent = paymentEventWrite.error
    ? resultFromDbError(paymentEventWrite.error as DbErrorLike, {
        table: "mpgf_payment_events",
        id: paymentEventRow.id,
      })
    : { table: "mpgf_payment_events", id: paymentEventRow.id, status: "inserted" as const };
  const contributionEvidence = evidenceRow
    ? await supabase.from("mpgf_public_goods_payment_proofs").insert(evidenceRow)
    : null;
  const contributionEvidenceStatus = !evidenceRow
    ? {
        table: "mpgf_public_goods_payment_proofs",
        status: "not_created" as const,
        reason: "webhook_not_recorded_or_campaign_unmapped",
      }
    : contributionEvidence?.error
      ? resultFromDbError(contributionEvidence.error as DbErrorLike, {
          table: "mpgf_public_goods_payment_proofs",
          sourceEventRef: evidenceRow.source_event_ref,
        })
      : {
          table: "mpgf_public_goods_payment_proofs",
          sourceEventRef: evidenceRow.source_event_ref,
          status: "inserted" as const,
        };
  const writes = [partnerEvent, paymentEvent, contributionEvidenceStatus];
  const failed = writes.find((write) => write.status === "failed" || write.status === "schema_missing");

  if (failed) {
    return {
      ...base,
      status: failed.status,
      partnerEvent,
      paymentEvent,
      contributionEvidence: contributionEvidenceStatus,
      error: "Could not persist all Every.org partner webhook evidence records.",
    };
  }

  return {
    ...base,
    status: writes.every((write) => write.status === "already_recorded" || write.status === "not_created")
      ? "already_recorded" as const
      : "inserted" as const,
    partnerEvent,
    paymentEvent,
    contributionEvidence: contributionEvidenceStatus,
  };
}

export async function POST(request: Request) {
  const authorization = authenticateEveryOrgPartnerWebhookRequest(request.headers);

  if (!authorization.authorized) {
    return NextResponse.json(
      { ok: false },
      { status: 401, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }

  try {
    const payload = await request.json();

    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Every.org partner webhook expects a JSON object.");
    }

    const partnerWebhookEvent = recordMpgfEveryOrgPartnerWebhook(
      payload as MpgfEveryOrgPartnerWebhookPayload,
      {
        webhookVerified: true,
      },
    );
    const persistence = await persistPartnerWebhookEvent(partnerWebhookEvent);
    const persistenceFailed =
      persistence.status === "failed" || persistence.status === "schema_missing";

    return NextResponse.json(
      {
        ok: !persistenceFailed,
        partnerWebhookEvent,
        dedupeBy: partnerWebhookEvent.dedupeBy,
        dedupeKey: partnerWebhookEvent.dedupeKey,
        autoCreatesContributionEvidence: partnerWebhookEvent.autoCreatesContributionEvidence,
        reviewRequiredBeforeCounting: true,
        finalPayoutAuthorized: false,
        persistence,
      },
      { status: persistenceFailed ? 500 : 200, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not import Every.org partner webhook." },
      { status: 400, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }
}
