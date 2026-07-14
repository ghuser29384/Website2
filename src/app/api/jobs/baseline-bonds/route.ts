import { NextResponse } from "next/server";

import {
  getBaselineBondAppealWindowEndsAt,
  normalizeBaselineBondStatus,
  shouldOpenBaselineBondEvidence,
} from "@/lib/baseline-bonds";
import { isCronRequestAuthorized } from "@/lib/cron";
import { persistBaselineBondStatusTransition } from "@/lib/moral-trade/baseline-bond-transitions";
import type { Database } from "@/lib/supabase/database.types";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type DonationOffsetOfferRow = Database["public"]["Tables"]["donation_offset_offers"]["Row"];
type OfferRow = Database["public"]["Tables"]["offers"]["Row"];

async function processBaselineBondExpiries(request: Request) {
  if (!isCronRequestAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date();
  const client = supabase as any;
  const { data: offsets, error: offsetsError } = await client
    .from("donation_offset_offers")
    .select("*")
    .eq("baseline_bond_enabled", true)
    .eq("baseline_bond_status", "posted")
    .not("offer_expires_at", "is", null)
    .lte("offer_expires_at", now.toISOString())
    .order("offer_expires_at", { ascending: true })
    .limit(50);

  if (offsetsError) {
    return NextResponse.json({ error: offsetsError.message }, { status: 500 });
  }

  const offsetRows = (offsets ?? []) as DonationOffsetOfferRow[];
  const offerIds = offsetRows.map((row) => row.offer_id);
  const { data: offers, error: offersError } = offerIds.length
    ? await supabase.from("offers").select("*").in("id", offerIds)
    : { data: [] as OfferRow[], error: null };

  if (offersError) {
    return NextResponse.json({ error: offersError.message }, { status: 500 });
  }

  const offersById = new Map(((offers ?? []) as OfferRow[]).map((offer) => [offer.id, offer]));
  let evidenceOpened = 0;
  let skipped = 0;
  let transitionErrors = 0;

  for (const offset of offsetRows) {
    const offer = offersById.get(offset.offer_id);
    const currentStatus = normalizeBaselineBondStatus(offset.baseline_bond_status);

    if (
      !offer ||
      !shouldOpenBaselineBondEvidence({
        offerExpiresAt: offset.offer_expires_at,
        offerStatus: offer.status,
        status: currentStatus,
        now,
      })
    ) {
      skipped += 1;
      continue;
    }

    const { error: updateError } = await client
      .from("donation_offset_offers")
      .update({
        baseline_bond_appeal_window_ends_at: getBaselineBondAppealWindowEndsAt(now),
        baseline_bond_status: "evidence_due",
      })
      .eq("offer_id", offset.offer_id)
      .eq("baseline_bond_status", currentStatus);

    if (updateError) {
      transitionErrors += 1;
      continue;
    }

    const transitionResult = await persistBaselineBondStatusTransition({
      actorAgentId: "system:baseline-bond-expiry",
      actorAgentKind: "operator",
      actorLabel: "Baseline credibility bond expiry job",
      fromStatus: currentStatus,
      idempotencyKey: `baseline-bond:${offset.offer_id}:posted-to-evidence_due`,
      offerId: offset.offer_id,
      ownerProfileId: offer.owner_id,
      provenanceActivity: "challenge_window_opened",
      recordedAt: now.toISOString(),
      supabase,
      toStatus: "evidence_due",
    });

    if (transitionResult.error) {
      transitionErrors += 1;
      continue;
    }

    evidenceOpened += 1;
  }

  return NextResponse.json({
    evidenceOpened,
    scanned: offsetRows.length,
    skipped,
    transitionErrors,
  });
}

export async function GET(request: Request) {
  return processBaselineBondExpiries(request);
}

export async function POST(request: Request) {
  return processBaselineBondExpiries(request);
}
