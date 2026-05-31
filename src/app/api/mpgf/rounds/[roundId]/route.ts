import { NextResponse } from "next/server";

import { getMpgfPublicGoodsRoundApi } from "@/lib/mpgf/public-goods-api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ roundId: string }> }) {
  const { roundId } = await params;
  const result = getMpgfPublicGoodsRoundApi(roundId);

  if (!result) {
    return NextResponse.json({ ok: false, error: "MPGF public-goods round not found." }, { status: 404 });
  }

  return NextResponse.json(result);
}
