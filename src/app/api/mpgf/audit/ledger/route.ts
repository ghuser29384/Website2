import { NextResponse } from "next/server";

import { MPGF_PUBLIC_GOODS_API_HEADERS, getMpgfPublicGoodsLedgerApi } from "@/lib/mpgf/public-goods-api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(getMpgfPublicGoodsLedgerApi(), { headers: MPGF_PUBLIC_GOODS_API_HEADERS });
}
