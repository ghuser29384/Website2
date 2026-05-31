import { NextResponse } from "next/server";

import { getMpgfPublicGoodsGovernanceApi } from "@/lib/mpgf/public-goods-governance";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(getMpgfPublicGoodsGovernanceApi());
}
