import { NextResponse } from "next/server";

import { getViewer } from "@/lib/app-data";
import { demoMpgfPublicGoodsCampaigns } from "@/lib/mpgf/data";
import { reviewMpgfPublicGoodsCampaign } from "@/lib/mpgf/mechanism";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

export async function POST(request: Request) {
  const viewer = await getViewer();

  if (!viewer) {
    return NextResponse.json({ ok: false, error: "Sign in to file an MPGF appeal." }, { status: 401 });
  }

  try {
    const payload = await request.json();

    if (!payload || typeof payload !== "object") {
      throw new Error("MPGF public-goods appeals expect a JSON object.");
    }

    const record = payload as Record<string, unknown>;
    const campaignId = stringValue(record.campaignId);
    const campaign = demoMpgfPublicGoodsCampaigns.find(
      (candidate) => candidate.id === campaignId || candidate.slug === campaignId,
    );

    if (!campaign) {
      return NextResponse.json({ ok: false, error: "MPGF public-goods campaign not found." }, { status: 404 });
    }

    const appeal = reviewMpgfPublicGoodsCampaign({
      campaign,
      action: "challenge",
      reasonCode: "appeal_requested",
      reviewerId: "mpgf-appeal-intake",
      publicNotes: stringValue(record.publicNotes) || "Participant appeal submitted for MPGF public-goods review.",
      now: new Date(),
    });

    return NextResponse.json(
      {
        ok: true,
        appeal: appeal.reviewCase,
        appellantHashPolicy: "not_published_in_public_ledger",
        pausesUnreleasedMilestones: true,
        createsPayoutAuthorization: false,
      },
      { status: 202 },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not file MPGF public-goods appeal." },
      { status: 400 },
    );
  }
}
