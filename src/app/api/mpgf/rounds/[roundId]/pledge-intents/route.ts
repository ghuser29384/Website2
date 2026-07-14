import { NextResponse } from "next/server";

import { getViewer } from "@/lib/app-data";
import {
  demoMpgfMatchPool,
  demoMpgfPublicGoodsCampaigns,
} from "@/lib/mpgf/data";
import {
  type MpgfPublicGoodsContributionMode,
  type MpgfPublicGoodsPledgeIntent,
  createMpgfPublicGoodsPledgeIntent,
} from "@/lib/mpgf/public-goods-contribution-intents";
import { MPGF_PUBLIC_GOODS_API_HEADERS } from "@/lib/mpgf/public-goods-api";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database, Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import type { MpgfPublicGoodsVisibilityMode } from "@/lib/mpgf/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SupabaseAny = Awaited<ReturnType<typeof createClient>> & {
  from: (table: string) => any;
};
type MpgfPledgeIntentInsert = Database["public"]["Tables"]["mpgf_pledge_intents"]["Insert"];
type MpgfConditionalPledgeInsert = Database["public"]["Tables"]["mpgf_conditional_pledges"]["Insert"];

function stringField(record: Record<string, unknown>, key: string, fallback = "") {
  const value = record[key];

  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function centsField(record: Record<string, unknown>) {
  const cents = Number(record.amountCents);

  if (Number.isInteger(cents) && cents > 0) {
    return cents;
  }

  const dollars = Number(record.amountDollars);

  return Number.isFinite(dollars) ? Math.round(dollars * 100) : 0;
}

function centsNamedField(record: Record<string, unknown>, centsKey: string, dollarsKey: string) {
  const cents = Number(record[centsKey]);

  if (Number.isInteger(cents) && cents > 0) {
    return cents;
  }

  const dollars = Number(record[dollarsKey]);

  return Number.isFinite(dollars) ? Math.round(dollars * 100) : undefined;
}

function stringListField(record: Record<string, unknown>, key: string) {
  const value = record[key];

  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }

  return typeof value === "string" ? value : undefined;
}

function visibilityMode(value: unknown): MpgfPublicGoodsVisibilityMode {
  return value === "public_supporter" || value === "public_reason" ? value : "private_amount";
}

function contributionMode(value: unknown): MpgfPublicGoodsContributionMode {
  return value === "stripe_setup_intent_saved_commitment" || value === "manual_proof_fallback"
    ? value
    : "every_org_fast_route";
}

function campaignDeadlineFor(pledgeIntent: MpgfPublicGoodsPledgeIntent) {
  return (
    demoMpgfPublicGoodsCampaigns.find((campaign) => campaign.id === pledgeIntent.campaignId)?.deadlineAt ??
    new Date().toISOString()
  );
}

function countedCapCents() {
  const value = Number(demoMpgfMatchPool.restrictionsJson.perDonorQfCapCents);

  return Number.isInteger(value) && value > 0 ? value : 1;
}

function toPledgeIntentRow(
  pledgeIntent: MpgfPublicGoodsPledgeIntent,
  profileId: string,
): MpgfPledgeIntentInsert {
  return {
    id: pledgeIntent.id,
    round_id: pledgeIntent.roundId,
    campaign_id: pledgeIntent.campaignId,
    profile_id: profileId,
    user_ref_hash: pledgeIntent.userRefHash,
    idempotency_key_hash: pledgeIntent.idempotencyKeyHash,
    amount_cents: pledgeIntent.amountCents,
    currency: "usd",
    acceptable_counterpart_buckets: pledgeIntent.acceptableCounterpartBuckets,
    minimum_counterparty_cleared_cents: pledgeIntent.minimumCounterpartyClearedCents,
    max_exposure_cents: pledgeIntent.maxExposureCents,
    visibility_pref: pledgeIntent.visibilityMode,
    payment_state: pledgeIntent.paymentState,
    counting_state: pledgeIntent.countingState,
    fallback_rule: pledgeIntent.fallbackRule as unknown as Json,
    donor_exposure_disclosure: pledgeIntent.donorExposureDisclosure as unknown as Json,
    cross_view_clearance_policy: pledgeIntent.crossViewClearancePolicy,
    capture_policy: pledgeIntent.capturePolicy,
    created_at: pledgeIntent.createdAt,
    updated_at: pledgeIntent.createdAt,
  };
}

function toConditionalPledgeRow(
  pledgeIntent: MpgfPublicGoodsPledgeIntent,
  profileId: string,
): MpgfConditionalPledgeInsert {
  return {
    id: pledgeIntent.id,
    round_id: pledgeIntent.roundId,
    campaign_id: pledgeIntent.campaignId,
    profile_id: profileId,
    amount_cents: pledgeIntent.amountCents,
    counted_cap_cents: countedCapCents(),
    acceptable_counterpart_buckets: pledgeIntent.acceptableCounterpartBuckets,
    minimum_counterparty_cleared_cents: pledgeIntent.minimumCounterpartyClearedCents,
    max_exposure_cents: pledgeIntent.maxExposureCents,
    failure_path_disclosure: pledgeIntent.donorExposureDisclosure as unknown as Json,
    cross_view_clearance_policy: pledgeIntent.crossViewClearancePolicy,
    visibility: pledgeIntent.visibilityMode,
    payment_mode: pledgeIntent.paymentMode,
    status: "pledge_saved",
    deadline_at: campaignDeadlineFor(pledgeIntent),
    capture_policy: pledgeIntent.capturePolicy,
    created_at: pledgeIntent.createdAt,
    updated_at: pledgeIntent.createdAt,
  };
}

async function persistPledgeIntentRows(
  pledgeIntent: MpgfPublicGoodsPledgeIntent,
  profileId: string,
) {
  if (!hasSupabaseEnv()) {
    return {
      ok: false,
      status: "not_configured" as const,
      warning: "Supabase is not configured; MPGF pledge intent was validated but not persisted.",
    };
  }

  const supabase = await createClient() as SupabaseAny;
  const pledgeIntentRow = toPledgeIntentRow(pledgeIntent, profileId);
  const conditionalPledgeRow = toConditionalPledgeRow(pledgeIntent, profileId);
  const pledgeIntentWrite = await supabase
    .from("mpgf_pledge_intents")
    .upsert(pledgeIntentRow, { onConflict: "idempotency_key_hash" });

  if (pledgeIntentWrite.error) {
    throw new Error(`Could not persist MPGF pledge intent: ${pledgeIntentWrite.error.message}`);
  }

  const conditionalPledgeWrite = await supabase
    .from("mpgf_conditional_pledges")
    .upsert(conditionalPledgeRow, { onConflict: "id" });

  if (conditionalPledgeWrite.error) {
    throw new Error(`Could not persist MPGF conditional pledge: ${conditionalPledgeWrite.error.message}`);
  }

  return {
    ok: true,
    status: "persisted" as const,
    pledgeIntentId: pledgeIntentRow.id,
    conditionalPledgeId: conditionalPledgeRow.id,
  };
}

export async function POST(request: Request, { params }: { params: Promise<{ roundId: string }> }) {
  const viewer = await getViewer();

  if (!viewer) {
    return NextResponse.json({ ok: false, error: "Sign in to create an MPGF pledge intent." }, { status: 401 });
  }

  try {
    const { roundId } = await params;
    const payload = await request.json();

    if (!payload || typeof payload !== "object") {
      throw new Error("MPGF pledge intents expect a JSON object.");
    }

    const record = payload as Record<string, unknown>;
    const pledgeIntent = createMpgfPublicGoodsPledgeIntent({
      roundId,
      campaignId: stringField(record, "campaignId"),
      userId: viewer.authUser.id,
      amountCents: centsField(record),
      acceptableCounterpartBuckets: stringListField(record, "acceptableCounterpartBuckets"),
      minimumCounterpartyClearedCents: centsNamedField(
        record,
        "minimumCounterpartyClearedCents",
        "minimumCounterpartyClearedDollars",
      ),
      paymentMode: contributionMode(record.paymentMode),
      visibilityMode: visibilityMode(record.visibilityMode),
      idempotencyKey: stringField(record, "idempotencyKey"),
    });
    const persistence = await persistPledgeIntentRows(pledgeIntent, viewer.authUser.id);

    return NextResponse.json(
      {
        ok: true,
        pledgeIntent,
        conditionalPledgeId: pledgeIntent.id,
        persistence,
        primaryFlow: pledgeIntent.primaryFlow,
        nextAction: "verify_identity",
        identityVerificationPath: `/api/mpgf/pledge-intents/${pledgeIntent.id}/verify-identity`,
        paymentAuthorizationPath: `/api/mpgf/pledge-intents/${pledgeIntent.id}/authorize-payment`,
        everyOrgDonateLinkPath: "/api/mpgf/every-org/donate-link",
        manualEvidenceFallbackPath: pledgeIntent.fallbackRule.manualEvidencePath,
        reviewRequiredBeforeCounting: true,
        finalPayoutAuthorized: false,
      },
      { status: 202, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not create MPGF pledge intent." },
      { status: 400, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }
}
