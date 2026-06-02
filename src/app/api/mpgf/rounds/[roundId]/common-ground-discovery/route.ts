import { NextResponse } from "next/server";

import { MPGF_PUBLIC_GOODS_API_HEADERS } from "@/lib/mpgf/public-goods-api";
import {
  buildMpgfPublicGoodsCommonGroundDiscovery,
  getMpgfPublicGoodsCommonGroundDiscoveryApi,
  isMpgfPublicGoodsMoralCluster,
} from "@/lib/mpgf/public-goods-cg-vqaf";
import { loadMpgfPublicGoodsSupportSignalsForRound } from "@/lib/mpgf/public-goods-support-signal-persistence";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function moralClusterFromRequest(request: Request) {
  const value = new URL(request.url).searchParams.get("cluster");

  return isMpgfPublicGoodsMoralCluster(value) ? value : "institutional_pluralist";
}

export async function GET(request: Request, { params }: { params: Promise<{ roundId: string }> }) {
  const { roundId } = await params;
  const moralCluster = moralClusterFromRequest(request);
  const fallbackResult = getMpgfPublicGoodsCommonGroundDiscoveryApi(roundId, moralCluster);

  if (!fallbackResult) {
    return NextResponse.json(
      { ok: false, error: "MPGF common-ground discovery report not found." },
      { status: 404, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }

  try {
    const supportSignalState = await loadMpgfPublicGoodsSupportSignalsForRound(roundId);
    const result = supportSignalState.supportSignals
      ? buildMpgfPublicGoodsCommonGroundDiscovery({
          moralCluster,
          supportSignals: supportSignalState.supportSignals,
        })
      : fallbackResult;

    return NextResponse.json(
      {
        ...result,
        supportSignalSource: supportSignalState.source,
        persistedSupportSignalCount: supportSignalState.persistedSupportSignalCount,
        skippedSupportSignalCount: supportSignalState.skippedSupportSignalCount,
        warnings: supportSignalState.warnings,
      },
      { headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Could not load MPGF common-ground discovery.",
      },
      { status: 500, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }
}
