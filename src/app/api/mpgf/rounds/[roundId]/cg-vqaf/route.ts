import { NextResponse } from "next/server";

import { MPGF_PUBLIC_GOODS_API_HEADERS } from "@/lib/mpgf/public-goods-api";
import {
  buildMpgfPublicGoodsCgVqafReport,
  getMpgfPublicGoodsCgVqafReportApi,
} from "@/lib/mpgf/public-goods-cg-vqaf";
import { loadMpgfPublicGoodsSupportSignalsForRound } from "@/lib/mpgf/public-goods-support-signal-persistence";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ roundId: string }> }) {
  const { roundId } = await params;
  const fallbackResult = getMpgfPublicGoodsCgVqafReportApi(roundId);

  if (!fallbackResult) {
    return NextResponse.json(
      { ok: false, error: "MPGF CG-VQAF report not found." },
      { status: 404, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }

  try {
    const supportSignalState = await loadMpgfPublicGoodsSupportSignalsForRound(roundId);
    const result = supportSignalState.supportSignals
      ? buildMpgfPublicGoodsCgVqafReport({ supportSignals: supportSignalState.supportSignals })
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
        error: error instanceof Error ? error.message : "Could not load MPGF CG-VQAF report.",
      },
      { status: 500, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }
}
