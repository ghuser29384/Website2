import { NextResponse } from "next/server";

import { MPGF_PUBLIC_GOODS_API_HEADERS } from "@/lib/mpgf/public-goods-api";
import { getMpgfPublicGoodsGovernanceResultsApi } from "@/lib/mpgf/public-goods-governance-ballots";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const result = getMpgfPublicGoodsGovernanceResultsApi(url.searchParams.get("roundId") ?? undefined);

  if (!result) {
    return NextResponse.json(
      { ok: false, error: "MPGF governance results not found." },
      { status: 404, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }

  return NextResponse.json(result, { headers: MPGF_PUBLIC_GOODS_API_HEADERS });
}
