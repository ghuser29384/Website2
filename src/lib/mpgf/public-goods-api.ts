import { createHash } from "node:crypto";

import {
  demoMpgfAssurancePledges,
  demoMpgfAssuranceRound,
  demoMpgfMatchPool,
  demoMpgfPublicGoodsCampaigns,
  demoMpgfPublicGoodsReviewCases,
} from "./data";
import {
  allocateMpgfAssuranceRound,
  countMpgfQfContributionCents,
  getMpgfCampaignAssuranceStatus,
  mpgfVerificationWeightFromHumanScoreBps,
} from "./mechanism";
import { buildMpgfPublicGoodsMilestoneSchedule } from "./public-goods-milestones";
import type {
  MpgfPublicGoodsCampaign,
  MpgfPublicGoodsPledge,
  MpgfPublicGoodsReviewCase,
} from "./types";

export const MPGF_PUBLIC_GOODS_API_PRIVACY_POLICY = "aggregate_only_no_private_evidence_urls_contact_data_or_supporter_reasons";

function nowMs() {
  return new Date("2026-05-31T12:00:00.000Z").getTime();
}

function secondsUntil(value: string) {
  const parsed = Date.parse(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(0, Math.floor((parsed - nowMs()) / 1000));
}

function publicCalcHash(value: unknown) {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

function campaignPledges(campaignId: string, pledges = demoMpgfAssurancePledges) {
  return pledges.filter((pledge) => pledge.campaignId === campaignId);
}

function collapseEligiblePublicDonors(pledges: MpgfPublicGoodsPledge[]) {
  const byDonor = new Map<string, { grossCents: number; humanScoreBps: number }>();

  for (const pledge of pledges) {
    if (pledge.status !== "pledged" && pledge.status !== "captured") {
      continue;
    }

    if (pledge.eligibilityState !== "eligible") {
      continue;
    }

    const existing = byDonor.get(pledge.userId);

    if (!existing) {
      byDonor.set(pledge.userId, {
        grossCents: pledge.amountCents,
        humanScoreBps: pledge.humanScoreBps,
      });
      continue;
    }

    existing.grossCents += pledge.amountCents;
    existing.humanScoreBps = Math.max(existing.humanScoreBps, pledge.humanScoreBps);
  }

  return [...byDonor.values()];
}

function countedForMatchCents(pledges: MpgfPublicGoodsPledge[]) {
  return collapseEligiblePublicDonors(pledges).reduce((sum, donor) => {
    const verificationWeight = mpgfVerificationWeightFromHumanScoreBps(donor.humanScoreBps);

    return sum + Math.floor(countMpgfQfContributionCents(donor.grossCents) * verificationWeight);
  }, 0);
}

function latestReviewSummary(campaignId: string, reviewCases = demoMpgfPublicGoodsReviewCases) {
  const relevant = reviewCases.filter((reviewCase) => reviewCase.campaignId === campaignId);
  const latest = relevant.at(-1);

  return {
    reviewCaseCount: relevant.length,
    latestState: latest?.state ?? "submitted",
    latestReasonCode: latest?.reasonCode ?? "needs_destination_evidence",
    appealOpen: relevant.some((reviewCase) => reviewCase.appealStatus === "appeal_requested"),
    challengeOpen: relevant.some((reviewCase) => reviewCase.action === "challenge" && !reviewCase.closedAt),
  };
}

function publicCampaignProgress(campaign: MpgfPublicGoodsCampaign) {
  const pledges = campaignPledges(campaign.id);
  const assurance = getMpgfCampaignAssuranceStatus(campaign, demoMpgfAssurancePledges, new Date("2026-05-31T12:00:00.000Z"));
  const allocation = allocateMpgfAssuranceRound({ now: new Date("2026-05-31T12:00:00.000Z") });
  const line = allocation.lines.find((candidate) => candidate.campaignId === campaign.id);
  const approvedMatchCents = (line?.baseMatchCents ?? 0) + (line?.qfBonusCents ?? 0);
  const reviewSummary = latestReviewSummary(campaign.id);

  return {
    campaignId: campaign.id,
    slug: campaign.slug,
    title: campaign.title,
    destinationType: campaign.destinationType,
    causeTags: campaign.causeTags,
    directEligibleCents: assurance.directEligibleCents,
    countedForMatchCents: countedForMatchCents(pledges),
    verifiedDonorCount: assurance.verifiedSupporterCount,
    thresholdAmountCents: campaign.thresholdAmountCents,
    thresholdDonors: campaign.thresholdSupporters,
    thresholdPassed: assurance.thresholdPassed,
    reviewStatus: campaign.reviewStatus,
    campaignStatus: assurance.status,
    matchEstimateCents: approvedMatchCents,
    baseMatchCents: line?.baseMatchCents ?? 0,
    qfBonusCents: line?.qfBonusCents ?? 0,
    milestoneSchedule: buildMpgfPublicGoodsMilestoneSchedule({ campaignId: campaign.id }).map((milestone) => ({
      id: milestone.id,
      ordinal: milestone.ordinal,
      releasePct: milestone.releasePct,
      status: milestone.status,
    })),
    reviewSummary,
    incidentState: campaign.reviewStatus === "blocked" ? "frozen" : "clear",
    appealState: reviewSummary.appealOpen ? "appeal_requested" : "none",
    campaignPath: `/mpgf/campaigns/${campaign.slug}`,
    proofPath: `/mpgf/pools/${campaign.slug}`,
  };
}

export function listMpgfPublicGoodsRoundsApi() {
  const allocation = allocateMpgfAssuranceRound({ now: new Date("2026-05-31T12:00:00.000Z") });

  return {
    ok: true,
    privacyPolicy: MPGF_PUBLIC_GOODS_API_PRIVACY_POLICY,
    rounds: [
      {
        id: demoMpgfAssuranceRound.id,
        name: demoMpgfAssuranceRound.name,
        startsAt: demoMpgfAssuranceRound.startsAt,
        closesAt: demoMpgfAssuranceRound.endsAt,
        status: "open",
        sponsorPoolCents: allocation.baseMatchBudgetCents + allocation.qfBonusBudgetCents,
        campaignCount: demoMpgfPublicGoodsCampaigns.length,
        verifiedDonorCount: allocation.lines.reduce((sum, line) => sum + line.verifiedSupporterCount, 0),
        countdownSeconds: secondsUntil(demoMpgfAssuranceRound.endsAt),
      },
    ],
  };
}

export function getMpgfPublicGoodsRoundApi(roundId: string = demoMpgfAssuranceRound.id) {
  if (roundId !== demoMpgfAssuranceRound.id) {
    return null;
  }

  const allocation = allocateMpgfAssuranceRound({ now: new Date("2026-05-31T12:00:00.000Z") });

  return {
    ok: true,
    privacyPolicy: MPGF_PUBLIC_GOODS_API_PRIVACY_POLICY,
    round: {
      id: demoMpgfAssuranceRound.id,
      name: demoMpgfAssuranceRound.name,
      startsAt: demoMpgfAssuranceRound.startsAt,
      closesAt: demoMpgfAssuranceRound.endsAt,
      status: "open",
      countdownSeconds: secondsUntil(demoMpgfAssuranceRound.endsAt),
      qfEnabled: demoMpgfAssuranceRound.qfEnabled,
      qfCapMultiple: demoMpgfAssuranceRound.qfCapMultiple,
      supporterGate: demoMpgfAssuranceRound.supporterGate,
      sponsorPool: {
        id: demoMpgfMatchPool.id,
        visibleCommitment: demoMpgfMatchPool.visibleCommitment,
        budgetCents: demoMpgfMatchPool.budgetCents,
        baseMatchBudgetCents: allocation.baseMatchBudgetCents,
        qfBonusBudgetCents: allocation.qfBonusBudgetCents,
        perDonorQfCapCents: demoMpgfMatchPool.restrictionsJson.perDonorQfCapCents,
        verificationWeightPolicy: demoMpgfMatchPool.restrictionsJson.verificationWeightPolicy,
      },
      campaignCount: demoMpgfPublicGoodsCampaigns.length,
      verifiedDonorCount: allocation.lines.reduce((sum, line) => sum + line.verifiedSupporterCount, 0),
      calcHash: publicCalcHash(allocation.lines.map((line) => [line.campaignId, line.qfScore, line.totalPayoutCents])),
    },
  };
}

export function listMpgfPublicGoodsCampaignsApi(roundId: string = demoMpgfAssuranceRound.id) {
  if (roundId !== demoMpgfAssuranceRound.id) {
    return null;
  }

  return {
    ok: true,
    privacyPolicy: MPGF_PUBLIC_GOODS_API_PRIVACY_POLICY,
    roundId,
    campaigns: demoMpgfPublicGoodsCampaigns.map(publicCampaignProgress),
  };
}

export function getMpgfPublicGoodsCampaignApi(campaignIdOrSlug: string) {
  const campaign = demoMpgfPublicGoodsCampaigns.find(
    (candidate) => candidate.id === campaignIdOrSlug || candidate.slug === campaignIdOrSlug,
  );

  if (!campaign) {
    return null;
  }

  return {
    ok: true,
    privacyPolicy: MPGF_PUBLIC_GOODS_API_PRIVACY_POLICY,
    campaign: {
      ...publicCampaignProgress(campaign),
      publicSummary: campaign.publicSummary,
      verificationMethod: campaign.verificationMethod,
      baselineRule: campaign.baselineRule,
      exitRule: campaign.exitRule,
      challengeWindowEndsAt: campaign.challengeWindowEndsAt ?? null,
      destinationProof: {
        destinationRef: campaign.destinationRef,
        destinationType: campaign.destinationType,
        verificationMethod: campaign.verificationMethod,
      },
    },
  };
}

export function getMpgfPublicGoodsMatchPreviewApi(roundId: string = demoMpgfAssuranceRound.id) {
  if (roundId !== demoMpgfAssuranceRound.id) {
    return null;
  }

  const allocation = allocateMpgfAssuranceRound({ now: new Date("2026-05-31T12:00:00.000Z") });
  const previewRows = allocation.lines.map((line) => ({
    campaignId: line.campaignId,
    status: line.status,
    verifiedDonorCount: line.verifiedSupporterCount,
    directEligibleCents: line.directEligibleCents,
    qfScore: line.qfScore,
    estimatedBaseMatchCents: line.baseMatchCents,
    estimatedQfBonusCents: line.qfBonusCents,
    estimatedMatchCents: line.baseMatchCents + line.qfBonusCents,
    blockers: line.blockers,
  }));

  return {
    ok: true,
    privacyPolicy: MPGF_PUBLIC_GOODS_API_PRIVACY_POLICY,
    roundId,
    final: false,
    calcHash: publicCalcHash(previewRows),
    rows: previewRows,
  };
}

export function getMpgfPublicGoodsAllocationReportApi(roundId: string = demoMpgfAssuranceRound.id) {
  if (roundId !== demoMpgfAssuranceRound.id) {
    return null;
  }

  const allocation = allocateMpgfAssuranceRound({ now: new Date("2026-05-31T12:00:00.000Z") });
  const rows = allocation.lines.map((line) => ({
    campaignId: line.campaignId,
    status: line.status,
    directEligibleCents: line.directEligibleCents,
    verifiedDonorCount: line.verifiedSupporterCount,
    baseMatchCents: line.baseMatchCents,
    qfBonusCents: line.qfBonusCents,
    totalPayoutCents: line.status === "payable" ? line.totalPayoutCents : 0,
    proofRequired: line.proofRequired,
    custodyMode: line.custodyMode,
    blockers: line.blockers,
  }));

  return {
    ok: true,
    privacyPolicy: MPGF_PUBLIC_GOODS_API_PRIVACY_POLICY,
    roundId,
    final: true,
    calcHash: publicCalcHash(rows),
    sponsorPoolCents: allocation.baseMatchBudgetCents + allocation.qfBonusBudgetCents,
    baseMatchAllocatedCents: allocation.baseMatchAllocatedCents,
    qfBonusAllocatedCents: allocation.qfBonusAllocatedCents,
    totalPayoutCents: allocation.totalPayoutCents,
    rows,
  };
}

export function getMpgfPublicGoodsLedgerApi() {
  const allocation = allocateMpgfAssuranceRound({ now: new Date("2026-05-31T12:00:00.000Z") });
  const rows = demoMpgfPublicGoodsCampaigns.map((campaign) => {
    const pledges = campaignPledges(campaign.id);
    const line = allocation.lines.find((candidate) => candidate.campaignId === campaign.id);

    return {
      roundId: demoMpgfAssuranceRound.id,
      campaignId: campaign.id,
      donorCount: line?.verifiedSupporterCount ?? 0,
      directTotalCents: line?.directEligibleCents ?? 0,
      countedTotalCents: countedForMatchCents(pledges),
      matchTotalCents: (line?.baseMatchCents ?? 0) + (line?.qfBonusCents ?? 0),
      releasedTotalCents: 0,
      proofPath: `/mpgf/pools/${campaign.slug}`,
    };
  });

  return {
    ok: true,
    privacyPolicy: MPGF_PUBLIC_GOODS_API_PRIVACY_POLICY,
    ledgerPolicy: "public_aggregate_no_donor_rows_no_receipt_urls",
    calcHash: publicCalcHash(rows),
    rows,
  };
}
