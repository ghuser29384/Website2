import { NextResponse } from "next/server";

import { MPGF_PUBLIC_GOODS_API_HEADERS, getMpgfPublicGoodsCampaignApi } from "@/lib/mpgf/public-goods-api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  const result = getMpgfPublicGoodsCampaignApi(campaignId);

  if (!result) {
    return NextResponse.json(
      { ok: false, error: "MPGF public-goods campaign not found." },
      { status: 404, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }

  return NextResponse.json(result, { headers: MPGF_PUBLIC_GOODS_API_HEADERS });
}
