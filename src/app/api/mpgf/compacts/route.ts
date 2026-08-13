import { NextResponse } from "next/server";

import { MPGF_PUBLIC_GOODS_API_HEADERS } from "@/lib/mpgf/public-goods-api";
import { loadMpgfPublicGoodsCompactsState } from "@/lib/mpgf/public-goods-compacts-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const state = await loadMpgfPublicGoodsCompactsState();

  return NextResponse.json(state, {
    status: state.available ? 200 : 503,
    headers: MPGF_PUBLIC_GOODS_API_HEADERS,
  });
}
