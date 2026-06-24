import { NextResponse } from "next/server";

import { allocateMpgfAssuranceRound } from "@/lib/mpgf/mechanism";
import {
  MPGF_PUBLIC_GOODS_API_HEADERS,
  buildMpgfPublicGoodsCampaignsApi,
  listMpgfPublicGoodsCampaignsApi,
} from "@/lib/mpgf/public-goods-api";
import {
  loadMpgfPublicGoodsAllocationContext,
  loadMpgfPublicGoodsAllocationContributionRecords,
} from "@/lib/mpgf/public-goods-allocation-results";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ roundId: string }> }) {
  const { roundId } = await params;
  const fallbackResult = listMpgfPublicGoodsCampaignsApi(roundId);

  try {
    const contextLoad = await loadMpgfPublicGoodsAllocationContext({ roundId });

    if (contextLoad.source === "demo_fixture" && !fallbackResult) {
      return NextResponse.json(
        { ok: false, error: "MPGF public-goods round campaigns not found." },
        { status: 404, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
      );
    }

    const contributionLoad = await loadMpgfPublicGoodsAllocationContributionRecords({ roundId });
    const result = contextLoad.source === "database_round_context"
      ? buildMpgfPublicGoodsCampaignsApi({
          roundId: contextLoad.round.id,
          campaigns: contextLoad.campaigns,
          pledges: contributionLoad.pledges,
          allocation: allocateMpgfAssuranceRound({
            campaigns: contextLoad.campaigns,
            pledges: contributionLoad.pledges,
            round: contextLoad.round,
            matchPool: contextLoad.matchPool,
          }),
          round: contextLoad.round,
        })
      : fallbackResult;

    if (!result) {
      return NextResponse.json(
        { ok: false, error: "MPGF public-goods round campaigns not found." },
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
              ? `Could not load persisted MPGF round campaigns state: ${error.message}`
              : "Could not load persisted MPGF round campaigns state.",
          ],
        },
        { headers: MPGF_PUBLIC_GOODS_API_HEADERS },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Could not load MPGF public-goods round campaigns.",
      },
      { status: 500, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }
}
