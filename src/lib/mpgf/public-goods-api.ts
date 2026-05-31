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
import { buildMpgfPublicGoodsAllocationSourceProofMap } from "./public-goods-allocation-results";
import { getMpgfPublicGoodsContributionFlowApi } from "./public-goods-contribution-intents";
import { buildMpgfPublicGoodsMilestoneSchedule } from "./public-goods-milestones";
import { buildMpgfPublicGoodsSponsorPoolFlywheel } from "./public-goods-sponsor-flywheel";
import type {
  MpgfPublicGoodsCampaign,
  MpgfPublicGoodsPledge,
  MpgfPublicGoodsReviewCase,
} from "./types";

export const MPGF_PUBLIC_GOODS_API_PRIVACY_POLICY = "aggregate_only_no_private_evidence_urls_contact_data_or_supporter_reasons";
export const MPGF_PUBLIC_GOODS_API_CACHE_CONTROL = "no-store, max-age=0";
export const MPGF_PUBLIC_GOODS_API_HEADERS = {
  "Cache-Control": MPGF_PUBLIC_GOODS_API_CACHE_CONTROL,
} as const;

export interface MpgfPublicGoodsPublicApiOptions {
  incidentStatusByCampaignId?: Record<string, "clear" | "frozen" | "resolved" | undefined>;
}

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

function incidentStateForCampaign(campaign: MpgfPublicGoodsCampaign, options: MpgfPublicGoodsPublicApiOptions = {}) {
  const configured = options.incidentStatusByCampaignId?.[campaign.id];

  if (configured === "frozen") {
    return "frozen" as const;
  }

  return campaign.reviewStatus === "blocked" ? ("frozen" as const) : ("clear" as const);
}

function publicCampaignProgress(campaign: MpgfPublicGoodsCampaign, options: MpgfPublicGoodsPublicApiOptions = {}) {
  const pledges = campaignPledges(campaign.id);
  const assurance = getMpgfCampaignAssuranceStatus(campaign, demoMpgfAssurancePledges, new Date("2026-05-31T12:00:00.000Z"));
  const allocation = allocateMpgfAssuranceRound({ now: new Date("2026-05-31T12:00:00.000Z") });
  const line = allocation.lines.find((candidate) => candidate.campaignId === campaign.id);
  const approvedMatchCents = (line?.baseMatchCents ?? 0) + (line?.qfBonusCents ?? 0);
  const reviewSummary = latestReviewSummary(campaign.id);
  const incidentState = incidentStateForCampaign(campaign, options);
  const matchPreviewHiddenByIncidentFreeze = incidentState === "frozen";

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
    matchEstimateCents: matchPreviewHiddenByIncidentFreeze ? null : approvedMatchCents,
    baseMatchCents: matchPreviewHiddenByIncidentFreeze ? null : line?.baseMatchCents ?? 0,
    qfBonusCents: matchPreviewHiddenByIncidentFreeze ? null : line?.qfBonusCents ?? 0,
    matchPreviewHiddenByIncidentFreeze,
    milestoneSchedule: buildMpgfPublicGoodsMilestoneSchedule({ campaignId: campaign.id }).map((milestone) => ({
      id: milestone.id,
      ordinal: milestone.ordinal,
      releasePct: milestone.releasePct,
      status: milestone.status,
    })),
    reviewSummary,
    incidentState,
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
    cacheControl: MPGF_PUBLIC_GOODS_API_CACHE_CONTROL,
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
  const sponsorPoolFlywheel = buildMpgfPublicGoodsSponsorPoolFlywheel();
  const contributionFlow = getMpgfPublicGoodsContributionFlowApi(roundId);

  return {
    ok: true,
    privacyPolicy: MPGF_PUBLIC_GOODS_API_PRIVACY_POLICY,
    cacheControl: MPGF_PUBLIC_GOODS_API_CACHE_CONTROL,
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
        flywheelPolicy: sponsorPoolFlywheel.flywheelPolicy,
        flywheelPath: `/api/mpgf/sponsor-pools/${sponsorPoolFlywheel.poolId}`,
        flywheelAvailableForRoundCents: sponsorPoolFlywheel.availableForRoundCents,
        flywheelSourceTypes: sponsorPoolFlywheel.sourceTypes,
      },
      contributionFlow,
      campaignCount: demoMpgfPublicGoodsCampaigns.length,
      verifiedDonorCount: allocation.lines.reduce((sum, line) => sum + line.verifiedSupporterCount, 0),
      calcHash: publicCalcHash(allocation.lines.map((line) => [line.campaignId, line.qfScore, line.totalPayoutCents])),
    },
  };
}

export function listMpgfPublicGoodsCampaignsApi(
  roundId: string = demoMpgfAssuranceRound.id,
  options: MpgfPublicGoodsPublicApiOptions = {},
) {
  if (roundId !== demoMpgfAssuranceRound.id) {
    return null;
  }

  return {
    ok: true,
    privacyPolicy: MPGF_PUBLIC_GOODS_API_PRIVACY_POLICY,
    cacheControl: MPGF_PUBLIC_GOODS_API_CACHE_CONTROL,
    roundId,
    campaigns: demoMpgfPublicGoodsCampaigns.map((campaign) => publicCampaignProgress(campaign, options)),
  };
}

export function getMpgfPublicGoodsCampaignApi(
  campaignIdOrSlug: string,
  options: MpgfPublicGoodsPublicApiOptions = {},
) {
  const campaign = demoMpgfPublicGoodsCampaigns.find(
    (candidate) => candidate.id === campaignIdOrSlug || candidate.slug === campaignIdOrSlug,
  );

  if (!campaign) {
    return null;
  }

  return {
    ok: true,
    privacyPolicy: MPGF_PUBLIC_GOODS_API_PRIVACY_POLICY,
    cacheControl: MPGF_PUBLIC_GOODS_API_CACHE_CONTROL,
    campaign: {
      ...publicCampaignProgress(campaign, options),
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

export function getMpgfPublicGoodsMatchPreviewApi(
  roundId: string = demoMpgfAssuranceRound.id,
  options: MpgfPublicGoodsPublicApiOptions = {},
) {
  if (roundId !== demoMpgfAssuranceRound.id) {
    return null;
  }

  const allocation = allocateMpgfAssuranceRound({ now: new Date("2026-05-31T12:00:00.000Z") });
  const previewRows = allocation.lines.map((line) => {
    const campaign = demoMpgfPublicGoodsCampaigns.find((candidate) => candidate.id === line.campaignId);
    const incidentState = campaign ? incidentStateForCampaign(campaign, options) : "clear";
    const matchPreviewHiddenByIncidentFreeze = incidentState === "frozen";

    return {
      campaignId: line.campaignId,
      status: line.status,
      incidentState,
      matchPreviewHiddenByIncidentFreeze,
      verifiedDonorCount: line.verifiedSupporterCount,
      directEligibleCents: line.directEligibleCents,
      qfScore: matchPreviewHiddenByIncidentFreeze ? null : line.qfScore,
      estimatedBaseMatchCents: matchPreviewHiddenByIncidentFreeze ? null : line.baseMatchCents,
      estimatedQfBonusCents: matchPreviewHiddenByIncidentFreeze ? null : line.qfBonusCents,
      estimatedMatchCents: matchPreviewHiddenByIncidentFreeze ? null : line.baseMatchCents + line.qfBonusCents,
      blockers: matchPreviewHiddenByIncidentFreeze
        ? [...new Set([...line.blockers, "incident_frozen_match_preview_hidden"])]
        : line.blockers,
    };
  });

  return {
    ok: true,
    privacyPolicy: MPGF_PUBLIC_GOODS_API_PRIVACY_POLICY,
    cacheControl: MPGF_PUBLIC_GOODS_API_CACHE_CONTROL,
    roundId,
    final: false,
    incidentFreezePolicy: "hide_mutable_match_preview_until_resolved",
    calcHash: publicCalcHash(previewRows),
    rows: previewRows,
  };
}

export function getMpgfPublicGoodsAllocationReportApi(roundId: string = demoMpgfAssuranceRound.id) {
  if (roundId !== demoMpgfAssuranceRound.id) {
    return null;
  }

  const allocation = allocateMpgfAssuranceRound({ now: new Date("2026-05-31T12:00:00.000Z") });
  const sourceProofByCampaignId = buildMpgfPublicGoodsAllocationSourceProofMap({
    allocation,
    pledges: demoMpgfAssurancePledges,
  });
  const rows = allocation.lines.map((line) => {
    const sourceProof = sourceProofByCampaignId.get(line.campaignId);

    if (!sourceProof) {
      throw new Error(`MPGF public-goods allocation source proof missing for ${line.campaignId}.`);
    }

    return {
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
      sourceContributionDigest: sourceProof.sourceContributionDigest,
      eligibleContributionRecordCount: sourceProof.eligibleContributionRecordCount,
      rawPaymentObjectCount: sourceProof.rawPaymentObjectCount,
      uniqueCountedIdentityCount: sourceProof.uniqueCountedIdentityCount,
      regeneratedFromContributionRecords: sourceProof.regeneratedFromContributionRecords,
    };
  });

  return {
    ok: true,
    privacyPolicy: MPGF_PUBLIC_GOODS_API_PRIVACY_POLICY,
    cacheControl: MPGF_PUBLIC_GOODS_API_CACHE_CONTROL,
    roundId,
    final: true,
    regenerationPolicy: "allocation_report_regenerates_from_underlying_contribution_records_collapsed_by_identity",
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
    cacheControl: MPGF_PUBLIC_GOODS_API_CACHE_CONTROL,
    ledgerPolicy: "public_aggregate_no_donor_rows_no_receipt_urls",
    calcHash: publicCalcHash(rows),
    rows,
  };
}
