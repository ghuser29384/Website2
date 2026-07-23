import { NextResponse } from "next/server";

import { isCronRequestAuthorized } from "@/lib/cron";
import {
  promoteConditionalRedirectBackupOrFallback,
  settleConditionalRedirectOffer,
} from "@/lib/payments/conditional-redirect-settlement";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function processConditionalRedirects(request: Request) {
  if (!isCronRequestAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createServiceClient() as any;
  const now = new Date().toISOString();
  const outcomes: Array<Record<string, unknown>> = [];

  const { data: dueOffers, error: dueError } = await supabase
    .from("conditional_redirect_offers")
    .select("id")
    .in("status", ["open", "arbitrating"])
    .lte("arbitration_closes_at", now)
    .order("arbitration_closes_at", { ascending: true })
    .limit(25);
  if (dueError) return NextResponse.json({ error: dueError.message }, { status: 500 });

  for (const offer of dueOffers ?? []) {
    const { data: winner, error } = await supabase.rpc(
      "arbitrate_conditional_redirect_offer",
      { p_offer_id: offer.id },
    );
    if (error) {
      outcomes.push({ offerId: offer.id, status: "arbitration_failed", error: error.message });
      continue;
    }
    outcomes.push({ offerId: offer.id, status: winner ? "winner_selected" : "fallback_selected" });
  }

  const { data: expiredRecoveries, error: recoveryError } = await supabase
    .from("conditional_redirect_offers")
    .select("id")
    .eq("status", "matcher_recovery")
    .lte("recovery_ends_at", now)
    .limit(25);
  if (recoveryError) {
    return NextResponse.json({ error: recoveryError.message }, { status: 500 });
  }
  for (const offer of expiredRecoveries ?? []) {
    try {
      outcomes.push({
        offerId: offer.id,
        ...(await promoteConditionalRedirectBackupOrFallback(String(offer.id))),
      });
    } catch (error) {
      outcomes.push({
        offerId: offer.id,
        status: "promotion_failed",
        error: error instanceof Error ? error.message : "Backup promotion failed.",
      });
    }
  }

  const { data: expiredCreatorRecoveries, error: creatorRecoveryError } = await supabase
    .from("conditional_redirect_offers")
    .select("id, creator_mandate_id")
    .eq("status", "creator_recovery")
    .lte("recovery_ends_at", now)
    .limit(25);
  if (creatorRecoveryError) {
    return NextResponse.json({ error: creatorRecoveryError.message }, { status: 500 });
  }
  for (const offer of expiredCreatorRecoveries ?? []) {
    await Promise.all([
      supabase
        .from("conditional_redirect_offers")
        .update({
          status: "cancelled",
          cancellation_reason: "Creator did not restore authorization within 15 minutes.",
          completed_at: now,
        })
        .eq("id", offer.id)
        .eq("status", "creator_recovery"),
      supabase
        .from("conditional_redirect_candidates")
        .update({ status: "cancelled", recovery_ends_at: null })
        .eq("offer_id", offer.id)
        .in("status", ["winner", "backup", "recovery", "promoted"]),
      supabase
        .from("conditional_payment_mandates")
        .update({
          status: "cancelled",
          cancelled_at: now,
          failure_code: "creator_recovery_expired",
        })
        .eq("purpose", "conditional_redirect")
        .eq("subject_type", "conditional_redirect_offer")
        .eq("subject_id", offer.id)
        .in("status", ["setup_pending", "ready", "failed", "requires_action"]),
    ]);
    outcomes.push({ offerId: offer.id, status: "cancelled_after_creator_recovery" });
  }

  const { data: settlementOffers, error: settlementError } = await supabase
    .from("conditional_redirect_offers")
    .select("id")
    .in("status", ["matched_settling", "fallback_settling"])
    .limit(25);
  if (settlementError) {
    return NextResponse.json({ error: settlementError.message }, { status: 500 });
  }
  for (const offer of settlementOffers ?? []) {
    try {
      outcomes.push(await settleConditionalRedirectOffer(String(offer.id)));
    } catch (error) {
      outcomes.push({
        offerId: offer.id,
        status: "settlement_waiting",
        error: error instanceof Error ? error.message : "Settlement failed.",
      });
    }
  }

  return NextResponse.json({ processed: outcomes.length, outcomes });
}

export async function GET(request: Request) {
  return processConditionalRedirects(request);
}

export async function POST(request: Request) {
  return processConditionalRedirects(request);
}
