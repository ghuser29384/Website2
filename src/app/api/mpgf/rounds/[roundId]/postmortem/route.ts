import { NextResponse } from "next/server";

import { MPGF_PUBLIC_GOODS_API_HEADERS } from "@/lib/mpgf/public-goods-api";
import {
  loadMpgfPublicGoodsAllocationContext,
  loadMpgfPublicGoodsAllocationContributionRecords,
} from "@/lib/mpgf/public-goods-allocation-results";
import { buildMpgfPublicGoodsKpiSnapshot } from "@/lib/mpgf/public-goods-kpis";
import {
  buildMpgfPublicGoodsPostmortemReport,
  getMpgfPublicGoodsPostmortemReportApi,
} from "@/lib/mpgf/public-goods-postmortem";
import { buildMpgfPublicGoodsThresholdCalibrationReport } from "@/lib/mpgf/public-goods-threshold-calibration";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ roundId: string }> }) {
  const { roundId } = await params;
  const fallbackResult = getMpgfPublicGoodsPostmortemReportApi(roundId);

  try {
    const contextLoad = await loadMpgfPublicGoodsAllocationContext({ roundId });

    if (contextLoad.source === "demo_fixture" && !fallbackResult) {
      return NextResponse.json(
        { ok: false, error: "MPGF public-goods postmortem report not found." },
        { status: 404, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
      );
    }

    const contributionLoad = await loadMpgfPublicGoodsAllocationContributionRecords({ roundId });
    const result = contextLoad.source === "database_round_context"
      ? buildMpgfPublicGoodsPostmortemReport({
          round: contextLoad.round,
          kpiSnapshot: buildMpgfPublicGoodsKpiSnapshot({
            campaigns: contextLoad.campaigns,
            pledges: contributionLoad.pledges,
            round: contextLoad.round,
            matchPool: contextLoad.matchPool,
            dataSource: "database",
          }),
          thresholdCalibration: buildMpgfPublicGoodsThresholdCalibrationReport({
            campaigns: contextLoad.campaigns,
            pledges: contributionLoad.pledges,
            round: contextLoad.round,
            matchPool: contextLoad.matchPool,
          }),
        })
      : fallbackResult;

    if (!result) {
      return NextResponse.json(
        { ok: false, error: "MPGF public-goods postmortem report not found." },
        { status: 404, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
      );
    }

    return NextResponse.json(
      {
        ...result,
        allocationContextSource: contextLoad.source,
        contributionSource: contributionLoad.source,
        loadedCampaignCount: contextLoad.campaignCount,
        loadedContributionRecordCount: contributionLoad.rawConditionalPledgeCount,
        eligibleContributionRecordCount: contributionLoad.eligibleContributionRecordCount,
        warnings: [...contextLoad.warnings, ...contributionLoad.warnings],
      },
      { headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  } catch (error) {
    if (fallbackResult) {
      return NextResponse.json(
        {
          ...fallbackResult,
          allocationContextSource: "demo_fixture",
          contributionSource: "demo_fixture",
          warnings: [
            error instanceof Error
              ? `Could not load persisted MPGF postmortem state: ${error.message}`
              : "Could not load persisted MPGF postmortem state.",
          ],
        },
        { headers: MPGF_PUBLIC_GOODS_API_HEADERS },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Could not load MPGF public-goods postmortem report.",
      },
      { status: 500, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }
}
