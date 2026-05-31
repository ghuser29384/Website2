import { NextResponse } from "next/server";

import { MPGF_PUBLIC_GOODS_API_HEADERS, getMpgfPublicGoodsAllocationReportApi } from "@/lib/mpgf/public-goods-api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ roundId: string }> }) {
  const { roundId } = await params;
  const result = getMpgfPublicGoodsAllocationReportApi(roundId);

  if (!result) {
    return NextResponse.json(
      { ok: false, error: "MPGF public-goods allocation report not found." },
      { status: 404, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }

  return NextResponse.json(result, { headers: MPGF_PUBLIC_GOODS_API_HEADERS });
}
