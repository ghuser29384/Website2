import { NextResponse } from "next/server";

import { MPGF_PUBLIC_GOODS_API_HEADERS } from "@/lib/mpgf/public-goods-api";
import {
  getMpgfPublicGoodsCommonGroundDiscoveryApi,
  isMpgfPublicGoodsMoralCluster,
} from "@/lib/mpgf/public-goods-cg-vqaf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function moralClusterFromRequest(request: Request) {
  const value = new URL(request.url).searchParams.get("cluster");

  return isMpgfPublicGoodsMoralCluster(value) ? value : "institutional_pluralist";
}

export async function GET(request: Request, { params }: { params: Promise<{ roundId: string }> }) {
  const { roundId } = await params;
  const result = getMpgfPublicGoodsCommonGroundDiscoveryApi(roundId, moralClusterFromRequest(request));

  if (!result) {
    return NextResponse.json(
      { ok: false, error: "MPGF common-ground discovery report not found." },
      { status: 404, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }

  return NextResponse.json(result, { headers: MPGF_PUBLIC_GOODS_API_HEADERS });
}
