import { NextResponse } from "next/server";

import { MPGF_PUBLIC_GOODS_API_HEADERS } from "@/lib/mpgf/public-goods-api";
import {
  loadMpgfPublicGoodsAllocationContext,
  loadMpgfPublicGoodsAllocationContributionRecords,
} from "@/lib/mpgf/public-goods-allocation-results";
import {
  buildMpgfPublicGoodsIdentityIntegrityReport,
  getMpgfPublicGoodsIdentityIntegrityReportApi,
} from "@/lib/mpgf/public-goods-identity-integrity";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ roundId: string }> }) {
  const { roundId } = await params;
  const fallbackResult = getMpgfPublicGoodsIdentityIntegrityReportApi(roundId);

  try {
    const contextLoad = await loadMpgfPublicGoodsAllocationContext({ roundId });

    if (contextLoad.source === "demo_fixture" && !fallbackResult) {
      return NextResponse.json(
        { ok: false, error: "MPGF identity-integrity report not found." },
        { status: 404, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
      );
    }

    const contributionLoad = await loadMpgfPublicGoodsAllocationContributionRecords({ roundId });
    const result = contextLoad.source === "database_round_context"
      ? buildMpgfPublicGoodsIdentityIntegrityReport({
          campaigns: contextLoad.campaigns,
          pledges: contributionLoad.pledges,
          round: contextLoad.round,
          matchPool: contextLoad.matchPool,
          attestations: [],
        })
      : fallbackResult;

    if (!result) {
      return NextResponse.json(
        { ok: false, error: "MPGF identity-integrity report not found." },
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
        identityAttestationSource: contextLoad.source === "database_round_context"
          ? "contribution_identity_verifications"
          : "demo_fixture",
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
          identityAttestationSource: "demo_fixture",
          warnings: [
            error instanceof Error
              ? `Could not load persisted MPGF identity-integrity state: ${error.message}`
              : "Could not load persisted MPGF identity-integrity state.",
          ],
        },
        { headers: MPGF_PUBLIC_GOODS_API_HEADERS },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Could not load MPGF identity-integrity report.",
      },
      { status: 500, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }
}
