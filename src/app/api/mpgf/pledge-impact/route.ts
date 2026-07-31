import { NextResponse } from "next/server";

import {
  buildPledgeImpactUnavailableEstimate,
  evaluatePledgeImpactForecast,
  getPledgeImpactCampaignId,
  isPledgeImpactPoolPublicKey,
  type PledgeImpactApiResponse,
  type PledgeImpactCampaignId,
} from "@/lib/mpgf/pledge-impact";
import { loadLatestPledgeImpactForecastRelease } from "@/lib/mpgf/pledge-impact-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function response(payload: PledgeImpactApiResponse, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      Pragma: "no-cache",
    },
  });
}

function readPositiveSafeInteger(value: string | null) {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const pool = url.searchParams.get("pool") ?? "";
  if (!isPledgeImpactPoolPublicKey(pool)) {
    return NextResponse.json(
      { error: "Unknown pool public key." },
      { status: 400, headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  }

  const pledgeCents = readPositiveSafeInteger(url.searchParams.get("pledgeCents"));
  if (pledgeCents === null) {
    return NextResponse.json(
      { error: "pledgeCents must be a non-negative safe integer." },
      { status: 400, headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  }

  const expectedCampaignId = getPledgeImpactCampaignId(pool);
  const requestedCampaign = url.searchParams.get("campaign") || expectedCampaignId;
  const requestedCampaignId = requestedCampaign as PledgeImpactCampaignId;
  if (requestedCampaignId !== expectedCampaignId) {
    return response(
      buildPledgeImpactUnavailableEstimate({
        campaignId: requestedCampaignId,
        pledgeCents,
        poolPublicKey: pool,
        reason: "campaign_mismatch",
      }),
    );
  }

  try {
    const release = await loadLatestPledgeImpactForecastRelease(pool);
    return response(
      evaluatePledgeImpactForecast({
        campaignId: expectedCampaignId,
        pledgeCents,
        poolPublicKey: pool,
        release,
      }),
    );
  } catch {
    return response(
      buildPledgeImpactUnavailableEstimate({
        campaignId: expectedCampaignId,
        pledgeCents,
        poolPublicKey: pool,
        reason: "service_unavailable",
      }),
    );
  }
}
