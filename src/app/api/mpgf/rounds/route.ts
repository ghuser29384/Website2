import { NextResponse } from "next/server";

import { MPGF_PUBLIC_GOODS_API_HEADERS, listMpgfPublicGoodsRoundsApi } from "@/lib/mpgf/public-goods-api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(listMpgfPublicGoodsRoundsApi(), { headers: MPGF_PUBLIC_GOODS_API_HEADERS });
}
