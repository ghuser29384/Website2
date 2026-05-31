import { NextResponse } from "next/server";

import { getMpgfPublicGoodsLedgerApi } from "@/lib/mpgf/public-goods-api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(getMpgfPublicGoodsLedgerApi());
}
