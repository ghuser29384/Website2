import { NextResponse } from "next/server";

import { loadMpgfDacPublicCampaign } from "@/lib/mpgf/dac-lifecycle";
import { toPublicMpgfDacCampaignApi } from "@/lib/mpgf/dac-lifecycle-model";

export const dynamic = "force-dynamic";

interface MpgfDacCampaignApiRouteProps {
  params: Promise<{ campaignId: string }>;
}

export async function GET(_request: Request, { params }: MpgfDacCampaignApiRouteProps) {
  const { campaignId } = await params;

  try {
    const campaign = await loadMpgfDacPublicCampaign({ campaignIdOrSlug: campaignId });
    if (!campaign) {
      return NextResponse.json(
        { error: "Published DAC campaign not found." },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }

    const body = toPublicMpgfDacCampaignApi(campaign);
    return NextResponse.json(body, {
      headers: {
        "Cache-Control": "public, max-age=0, must-revalidate",
        ETag: `"${campaign.outcome?.outcomeSha256 ?? campaign.publishedTermsSha256}"`,
      },
    });
  } catch {
    return NextResponse.json(
      {
        error: "The DAC campaign audit view is temporarily unavailable.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
