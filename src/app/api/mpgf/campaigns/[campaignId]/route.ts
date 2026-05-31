import { NextResponse } from "next/server";

import { getMpgfPublicGoodsCampaignApi } from "@/lib/mpgf/public-goods-api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  const result = getMpgfPublicGoodsCampaignApi(campaignId);

  if (!result) {
    return NextResponse.json({ ok: false, error: "MPGF public-goods campaign not found." }, { status: 404 });
  }

  return NextResponse.json(result);
}
