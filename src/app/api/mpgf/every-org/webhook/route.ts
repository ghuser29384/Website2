import { NextResponse } from "next/server";

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

interface DbErrorLike {
  code?: string | null;
  message?: string | null;
}

function configuredWebhookSecret() {
  return process.env.MPGF_EVERY_ORG_WEBHOOK_SHARED_SECRET?.trim() || undefined;
}

function hasServiceRoleEnv() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function requestWebhookSecret(request: Request) {
  return (
    request.headers.get("mpgf-every-org-webhook-secret") ??
    request.headers.get("x-mpgf-every-org-webhook-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    ""
  ).trim();
}

function webhookVerified(request: Request) {
  const expected = configuredWebhookSecret();

  if (!expected) {
    return true;
  }

  return requestWebhookSecret(request) === expected;
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

async function persistPartnerWebhookEvent(partnerWebhookEvent: MpgfEveryOrgPartnerWebhookEvent) {
  const row = toPartnerEventRow(partnerWebhookEvent);
  const base = {
    table: "mpgf_every_org_partner_events",
    id: row.id,
    dedupeBy: "charge_id_hash",
    dedupeKey: row.charge_id_hash,
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
  const { error } = await supabase.from("mpgf_every_org_partner_events").insert(row);

  if (!error) {
    return { ...base, status: "inserted" as const };
  }

  const dbError = error as DbErrorLike;

  if (dbError.code === "23505") {
    return { ...base, status: "already_recorded" as const };
  }

  if (dbError.code === "42P01") {
    return {
      ...base,
      status: "schema_missing" as const,
      migration: "20260601_mpgf_every_org_fast_route.sql",
      error:
        "MPGF Every.org partner-event table is missing. Run the Every.org fast-route migration before accepting partner webhooks.",
    };
  }

  return {
    ...base,
    status: "failed" as const,
    error: dbError.message ?? "Could not persist Every.org partner webhook event.",
  };
}

export async function POST(request: Request) {
  const expectedSecret = configuredWebhookSecret();

  if (expectedSecret && !webhookVerified(request)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized MPGF Every.org partner webhook request." },
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
        webhookVerified: webhookVerified(request),
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
