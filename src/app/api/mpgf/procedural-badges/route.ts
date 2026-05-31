import { NextResponse } from "next/server";

import { MPGF_PUBLIC_GOODS_API_HEADERS } from "@/lib/mpgf/public-goods-api";
import { getMpgfPublicGoodsProceduralBadgesApi } from "@/lib/mpgf/public-goods-procedural-badges";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const roundId = url.searchParams.get("roundId") ?? undefined;
  const result = getMpgfPublicGoodsProceduralBadgesApi(roundId);

  if (!result) {
    return NextResponse.json(
      { ok: false, error: "MPGF procedural badge ledger not found." },
      { status: 404, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }

  return NextResponse.json(result, { headers: MPGF_PUBLIC_GOODS_API_HEADERS });
}
