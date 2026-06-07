import { getMpgfCampaignAssuranceStatus } from "./mechanism";
import type {
  MpgfPublicGoodsAssuranceStatus,
  MpgfPublicGoodsCampaign,
  MpgfPublicGoodsRoundAllocation,
} from "./types";

export const MPGF_ROUND_BOARD_SCHEMA_VERSION = "mpgf-round-board-v1";

export type MpgfRoundBoardStatus = "cleared" | "near_threshold" | "needs_review" | "failed";

export interface MpgfRoundBoardCard {
  activeClusterCount: number;
  amountProgressBps: number;
  baseMatchUnlockedCents: number;
  campaignId: string;
  directCountedCents: number;
  href: string;
  inviteActionLabel: string;
  pivotalActionLabel: string;
  projectedAllocationCents: number;
  projectedBonusMaxCents: number;
  projectedBonusMinCents: number;
  schemaVersion: typeof MPGF_ROUND_BOARD_SCHEMA_VERSION;
  status: MpgfRoundBoardStatus;
  supporterProgressBps: number;
  thresholdAmountCents: number;
  thresholdSupporters: number;
  title: string;
  verifiedSupporterCount: number;
  yourStanceLabel: string;
}

function derivePrivacySafeClusterCount(campaign: MpgfPublicGoodsCampaign) {
  const clusters = new Set(
    campaign.causeTags
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean)
      .map((tag) => tag.split(/\s+/)[0] ?? tag),
  );

  return Math.max(1, Math.min(4, clusters.size || 1));
}

function mapRoundBoardStatus(
  status: MpgfPublicGoodsAssuranceStatus,
): MpgfRoundBoardStatus {
  if (status.status === "payable") {
    return "cleared";
  }

  if (status.status === "blocked" || status.status === "expired") {
    return "failed";
  }

  if (status.status === "review_pending" || status.status === "threshold_met") {
    return "needs_review";
  }

  return "near_threshold";
}

function stanceLabelForBoardStatus(status: MpgfRoundBoardStatus, viewerPresent: boolean) {
  if (!viewerPresent) {
    return "Sign in to set stance";
  }

  if (status === "cleared") {
    return "strong or weak common-ground";
  }

  if (status === "failed") {
    return "carry forward or abstain";
  }

  if (status === "needs_review") {
    return "weak common-ground after review";
  }

  return "weak common-ground preview";
}

function actionLabelForBoardStatus(status: MpgfRoundBoardStatus, viewerPresent: boolean) {
  if (status === "cleared") {
    return "View proof path";
  }

  if (status === "needs_review") {
    return "Wait for review";
  }

  if (status === "failed") {
    return "Review carry-forward fallback";
  }

  return viewerPresent ? "Add $5" : "Sign in to add $5";
}

function projectedAllocationForBoardStatus({
  status,
  starterCommonGroundBudgetCents,
}: {
  status: MpgfRoundBoardStatus;
  starterCommonGroundBudgetCents: number;
}) {
  if (status === "failed" || status === "needs_review") {
    return 0;
  }

  return Math.max(0, Math.min(500, starterCommonGroundBudgetCents));
}

export function buildMpgfRoundBoardCards({
  allocation,
  campaigns,
  starterCommonGroundBudgetCents = 500,
  statuses,
  viewerPresent,
}: {
  allocation: MpgfPublicGoodsRoundAllocation;
  campaigns: MpgfPublicGoodsCampaign[];
  starterCommonGroundBudgetCents?: number;
  statuses?: MpgfPublicGoodsAssuranceStatus[];
  viewerPresent: boolean;
}): MpgfRoundBoardCard[] {
  const lines = new Map(allocation.lines.map((line) => [line.campaignId, line]));
  const statusByCampaign = new Map(
    (statuses ?? campaigns.map((campaign) => getMpgfCampaignAssuranceStatus(campaign))).map((status) => [
      status.campaignId,
      status,
    ]),
  );

  return campaigns.map((campaign) => {
    const line = lines.get(campaign.id);
    const assuranceStatus = statusByCampaign.get(campaign.id) ?? getMpgfCampaignAssuranceStatus(campaign);
    const status = mapRoundBoardStatus(assuranceStatus);
    const projectedAllocationCents = projectedAllocationForBoardStatus({
      status,
      starterCommonGroundBudgetCents,
    });

    return {
      activeClusterCount: derivePrivacySafeClusterCount(campaign),
      amountProgressBps: assuranceStatus.amountProgressBps,
      baseMatchUnlockedCents: line?.baseMatchCents ?? 0,
      campaignId: campaign.id,
      directCountedCents: assuranceStatus.directEligibleCents,
      href: `/mpgf/pools/${campaign.slug}`,
      inviteActionLabel:
        status === "near_threshold" ? "Copy user-initiated invite link" : "Share after review if eligible",
      pivotalActionLabel: actionLabelForBoardStatus(status, viewerPresent),
      projectedAllocationCents,
      projectedBonusMaxCents: line?.qfBonusCapCents ?? 0,
      projectedBonusMinCents: line?.qfBonusCents ?? 0,
      schemaVersion: MPGF_ROUND_BOARD_SCHEMA_VERSION,
      status,
      supporterProgressBps: assuranceStatus.supporterProgressBps,
      thresholdAmountCents: assuranceStatus.thresholdAmountCents,
      thresholdSupporters: assuranceStatus.thresholdSupporters,
      title: campaign.title,
      verifiedSupporterCount: assuranceStatus.verifiedSupporterCount,
      yourStanceLabel: stanceLabelForBoardStatus(status, viewerPresent),
    };
  });
}
