import { NextResponse } from "next/server";

import { loadMpgfPublicGoodsAllocationContext } from "@/lib/mpgf/public-goods-allocation-results";
import { MPGF_PUBLIC_GOODS_API_HEADERS } from "@/lib/mpgf/public-goods-api";
import {
  buildMpgfPublicGoodsEcmRulebookReport,
  getMpgfPublicGoodsEcmRulebookReportApi,
} from "@/lib/mpgf/public-goods-ecm-rulebook";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ roundId: string }> }) {
  const { roundId } = await params;
  const fallbackResult = getMpgfPublicGoodsEcmRulebookReportApi(roundId);

  try {
    const contextLoad = await loadMpgfPublicGoodsAllocationContext({ roundId });

    if (contextLoad.source === "demo_fixture" && !fallbackResult) {
      return NextResponse.json(
        { ok: false, error: "MPGF CRECM rulebook report not found." },
        { status: 404, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
      );
    }

    const result = contextLoad.source === "database_round_context"
      ? buildMpgfPublicGoodsEcmRulebookReport({
          campaigns: contextLoad.campaigns,
          round: contextLoad.round,
          matchPool: contextLoad.matchPool,
        })
      : fallbackResult;

    if (!result) {
      return NextResponse.json(
        { ok: false, error: "MPGF CRECM rulebook report not found." },
        { status: 404, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
      );
    }

    return NextResponse.json(
      {
        ...result,
        allocationContextSource: contextLoad.source,
        loadedCampaignCount: contextLoad.campaignCount,
        warnings: contextLoad.warnings,
      },
      { headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  } catch (error) {
    if (fallbackResult) {
      return NextResponse.json(
        {
          ...fallbackResult,
          allocationContextSource: "demo_fixture",
          warnings: [
            error instanceof Error
              ? `Could not load persisted MPGF CRECM rulebook state: ${error.message}`
              : "Could not load persisted MPGF CRECM rulebook state.",
          ],
        },
        { headers: MPGF_PUBLIC_GOODS_API_HEADERS },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Could not load MPGF CRECM rulebook report.",
      },
      { status: 500, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }
}
