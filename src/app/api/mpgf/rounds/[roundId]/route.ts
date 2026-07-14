import { NextResponse } from "next/server";

import { allocateMpgfAssuranceRound } from "@/lib/mpgf/mechanism";
import {
  MPGF_PUBLIC_GOODS_API_HEADERS,
  buildMpgfPublicGoodsRoundApi,
  getMpgfPublicGoodsRoundApi,
} from "@/lib/mpgf/public-goods-api";
import {
  loadMpgfPublicGoodsAllocationContext,
  loadMpgfPublicGoodsAllocationContributionRecords,
} from "@/lib/mpgf/public-goods-allocation-results";
import { loadMpgfPublicGoodsSupportSignalsForRound } from "@/lib/mpgf/public-goods-support-signal-persistence";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ roundId: string }> }) {
  const { roundId } = await params;
  const fallbackResult = getMpgfPublicGoodsRoundApi(roundId);

  try {
    const contextLoad = await loadMpgfPublicGoodsAllocationContext({ roundId });

    if (contextLoad.source === "demo_fixture" && !fallbackResult) {
      return NextResponse.json(
        { ok: false, error: "MPGF public-goods round not found." },
        { status: 404, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
      );
    }

    const contributionLoad = await loadMpgfPublicGoodsAllocationContributionRecords({ roundId });
    const supportSignalState = contextLoad.source === "database_round_context"
      ? await loadMpgfPublicGoodsSupportSignalsForRound(roundId)
      : {
          source: "demo_fixture" as const,
          supportSignals: null,
          persistedSupportSignalCount: 0,
          skippedSupportSignalCount: 0,
          warnings: [],
        };
    const result = contextLoad.source === "database_round_context"
      ? buildMpgfPublicGoodsRoundApi({
          round: contextLoad.round,
          campaigns: contextLoad.campaigns,
          matchPool: contextLoad.matchPool,
          allocation: allocateMpgfAssuranceRound({
            campaigns: contextLoad.campaigns,
            pledges: contributionLoad.pledges,
            round: contextLoad.round,
            matchPool: contextLoad.matchPool,
          }),
          pledges: contributionLoad.pledges,
          supportSignals: supportSignalState.supportSignals ?? [],
          dataSource: "database",
        })
      : fallbackResult;

    if (!result) {
      return NextResponse.json(
        { ok: false, error: "MPGF public-goods round not found." },
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
        supportSignalSource: supportSignalState.source,
        persistedSupportSignalCount: supportSignalState.persistedSupportSignalCount,
        skippedSupportSignalCount: supportSignalState.skippedSupportSignalCount,
        warnings: [...contextLoad.warnings, ...contributionLoad.warnings, ...supportSignalState.warnings],
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
          supportSignalSource: "demo_fixture",
          warnings: [
            error instanceof Error
              ? `Could not load persisted MPGF round state: ${error.message}`
              : "Could not load persisted MPGF round state.",
          ],
        },
        { headers: MPGF_PUBLIC_GOODS_API_HEADERS },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Could not load MPGF public-goods round.",
      },
      { status: 500, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }
}
