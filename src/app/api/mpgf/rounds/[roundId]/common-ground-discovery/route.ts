import { NextResponse } from "next/server";

import { MPGF_PUBLIC_GOODS_API_HEADERS } from "@/lib/mpgf/public-goods-api";
import {
  loadMpgfPublicGoodsAllocationContext,
  loadMpgfPublicGoodsAllocationContributionRecords,
} from "@/lib/mpgf/public-goods-allocation-results";
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

  try {
    const contextLoad = await loadMpgfPublicGoodsAllocationContext({ roundId });

    if (contextLoad.source === "demo_fixture" && !fallbackResult) {
      return NextResponse.json(
        { ok: false, error: "MPGF common-ground discovery report not found." },
        { status: 404, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
      );
    }

    const [supportSignalState, contributionLoad] = await Promise.all([
      loadMpgfPublicGoodsSupportSignalsForRound(roundId),
      loadMpgfPublicGoodsAllocationContributionRecords({ roundId }),
    ]);
    const result = contextLoad.source === "database_round_context"
      ? buildMpgfPublicGoodsCommonGroundDiscovery({
          moralCluster,
          campaigns: contextLoad.campaigns,
          pledges: contributionLoad.pledges,
          round: contextLoad.round,
          matchPool: contextLoad.matchPool,
          supportSignals: supportSignalState.supportSignals ?? [],
        })
      : supportSignalState.supportSignals
        ? buildMpgfPublicGoodsCommonGroundDiscovery({
            moralCluster,
            supportSignals: supportSignalState.supportSignals,
          })
        : fallbackResult;

    if (!result) {
      return NextResponse.json(
        { ok: false, error: "MPGF common-ground discovery report not found." },
        { status: 404, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
      );
    }

    return NextResponse.json(
      {
        ...result,
        allocationContextSource: contextLoad.source,
        loadedCampaignCount: contextLoad.campaignCount,
        contributionSource: contributionLoad.source,
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
              ? `Could not load persisted MPGF common-ground discovery state: ${error.message}`
              : "Could not load persisted MPGF common-ground discovery state.",
          ],
        },
        { headers: MPGF_PUBLIC_GOODS_API_HEADERS },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Could not load MPGF common-ground discovery.",
      },
      { status: 500, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }
}
