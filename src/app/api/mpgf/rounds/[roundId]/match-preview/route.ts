import { NextResponse } from "next/server";

import { getMpgfPublicGoodsMatchPreviewApi } from "@/lib/mpgf/public-goods-api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ roundId: string }> }) {
  const { roundId } = await params;
  const result = getMpgfPublicGoodsMatchPreviewApi(roundId);

  if (!result) {
    return NextResponse.json({ ok: false, error: "MPGF public-goods match preview not found." }, { status: 404 });
  }

  return NextResponse.json(result);
}
