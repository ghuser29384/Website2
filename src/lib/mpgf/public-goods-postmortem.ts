import { createHash } from "node:crypto";

import { demoMpgfAssuranceRound } from "./data";
import { buildMpgfPublicGoodsKpiSnapshot, type MpgfPublicGoodsKpiSnapshot } from "./public-goods-kpis";
import {
  getMpgfPublicGoodsThresholdCalibrationReportApi,
  type MpgfPublicGoodsThresholdCalibrationReport,
} from "./public-goods-threshold-calibration";
import type { MpgfPublicGoodsRound } from "./types";

export const MPGF_PUBLIC_GOODS_POSTMORTEM_POLICY =
  "public_postmortem_and_next_round_parameter_reset_v1";

export const MPGF_PUBLIC_GOODS_POSTMORTEM_PRIVACY_POLICY =
  "aggregate_only_no_private_donor_reasons_receipts_or_reviewer_notes";

export interface MpgfPublicGoodsPostmortemArtifact {
  key: string;
  status: "published" | "pending_external_review" | "not_applicable_for_demo";
  path: string;
}

export interface MpgfPublicGoodsPostmortemParameterResetRow {
  campaignId: string;
  action: string;
  confidence: string;
  currentThresholdAmountCents: number;
  currentThresholdSupporters: number;
  recommendedNextRoundThresholdAmountCents: number;
  recommendedNextRoundThresholdSupporters: number;
  reasonCodes: string[];
}

export interface MpgfPublicGoodsPostmortemReport {
  ok: true;
  roundId: string;
  policy: typeof MPGF_PUBLIC_GOODS_POSTMORTEM_POLICY;
  privacyPolicy: typeof MPGF_PUBLIC_GOODS_POSTMORTEM_PRIVACY_POLICY;
  publicPostmortemTemplatePublished: true;
  currentRoundMutationAllowed: false;
  parameterResetPolicy: "next_round_only_after_public_postmortem_and_before_donations_open";
  noGlobalMoralRanking: true;
  noDonorMoralReputationWeighting: true;
  generatedAt: string;
  requiredPublicArtifacts: MpgfPublicGoodsPostmortemArtifact[];
  fundingOutcomes: {
    verifiedDollarsRoutedCents: number;
    verifiedSupporterCountPerWinningCampaign: number | null;
    thresholdClearRateBps: number | null;
    sponsorLeverageRatioBps: number | null;
    autoVerifiedContributionShareBps: number | null;
    medianHoursFromPledgeToCounted: number | null;
    sponsorPoolRefillRateBps: number | null;
    donorRetentionIntoNextRoundBps: number | null;
  };
  disputeAndReviewSummary: {
    reviewSlaAttainmentBps: number | null;
    disputeRateBps: number | null;
    appealOverturnRateBps: number | null;
    disputeCaseCount: number;
    appealCaseCount: number;
  };
  experimentSummary: {
    recommendedCount: number;
    activeAssignmentEventCount: number;
    experimentKeys: string[];
  };
  nextRoundParameterReset: {
    thresholdCalibrationPath: string;
    suggestedChangeCount: number;
    holdForReviewCount: number;
    rows: MpgfPublicGoodsPostmortemParameterResetRow[];
  };
  rolloutGate: MpgfPublicGoodsKpiSnapshot["rolloutGate"];
  calcHash: string;
}

function hashValue(value: unknown) {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

function requiredArtifacts(roundId: string): MpgfPublicGoodsPostmortemArtifact[] {
  return [
    {
      key: "allocation_report",
      status: "published",
      path: `/api/mpgf/rounds/${roundId}/allocations`,
    },
    {
      key: "sponsor_pool_source_breakdown",
      status: "published",
      path: "/api/mpgf/sponsor-pools/mpgf-common-ground-sponsor-pool-2026-05",
    },
    {
      key: "dispute_summary",
      status: "published",
      path: `/api/mpgf/rounds/${roundId}/postmortem`,
    },
    {
      key: "funding_kpis",
      status: "published",
      path: "/api/mpgf/public-goods/kpis?dryRun=1",
    },
    {
      key: "threshold_calibration",
      status: "published",
      path: `/api/mpgf/rounds/${roundId}/threshold-calibration`,
    },
    {
      key: "partner_legal_readiness",
      status: "pending_external_review",
      path: "/mpgf/real-money-terms",
    },
  ];
}

function parameterRows(thresholdCalibration: MpgfPublicGoodsThresholdCalibrationReport | null) {
  return (thresholdCalibration?.rows ?? []).map((row) => ({
    campaignId: row.campaignId,
    action: row.action,
    confidence: row.confidence,
    currentThresholdAmountCents: row.currentThresholdAmountCents,
    currentThresholdSupporters: row.currentThresholdSupporters,
    recommendedNextRoundThresholdAmountCents: row.recommendedNextRoundThresholdAmountCents,
    recommendedNextRoundThresholdSupporters: row.recommendedNextRoundThresholdSupporters,
    reasonCodes: row.reasonCodes,
  }));
}

export function buildMpgfPublicGoodsPostmortemReport({
  round = demoMpgfAssuranceRound,
  kpiSnapshot = buildMpgfPublicGoodsKpiSnapshot({ generatedAt: "2026-06-15T12:00:00.000Z" }),
  thresholdCalibration = getMpgfPublicGoodsThresholdCalibrationReportApi(round.id),
  generatedAt = "2026-06-15T12:00:00.000Z",
}: {
  round?: MpgfPublicGoodsRound;
  kpiSnapshot?: MpgfPublicGoodsKpiSnapshot;
  thresholdCalibration?: MpgfPublicGoodsThresholdCalibrationReport | null;
  generatedAt?: string;
} = {}): MpgfPublicGoodsPostmortemReport {
  const rows = parameterRows(thresholdCalibration);
  const requiredPublicArtifacts = requiredArtifacts(round.id);
  const experimentKeys = kpiSnapshot.experimentBacklog.experiments.map((experiment) => experiment.experimentKey);
  const calcHash = hashValue([
    round.id,
    MPGF_PUBLIC_GOODS_POSTMORTEM_POLICY,
    kpiSnapshot.funding,
    kpiSnapshot.review,
    kpiSnapshot.experimentBacklog,
    rows,
    requiredPublicArtifacts,
  ]);

  return {
    ok: true,
    roundId: round.id,
    policy: MPGF_PUBLIC_GOODS_POSTMORTEM_POLICY,
    privacyPolicy: MPGF_PUBLIC_GOODS_POSTMORTEM_PRIVACY_POLICY,
    publicPostmortemTemplatePublished: true,
    currentRoundMutationAllowed: false,
    parameterResetPolicy: "next_round_only_after_public_postmortem_and_before_donations_open",
    noGlobalMoralRanking: true,
    noDonorMoralReputationWeighting: true,
    generatedAt,
    requiredPublicArtifacts,
    fundingOutcomes: {
      verifiedDollarsRoutedCents: kpiSnapshot.funding.verifiedDollarsRoutedCents,
      verifiedSupporterCountPerWinningCampaign: kpiSnapshot.funding.verifiedSupporterCountPerWinningCampaign,
      thresholdClearRateBps: kpiSnapshot.funding.thresholdClearRateBps,
      sponsorLeverageRatioBps: kpiSnapshot.funding.sponsorLeverageRatioBps,
      autoVerifiedContributionShareBps: kpiSnapshot.funding.autoVerifiedContributionShareBps,
      medianHoursFromPledgeToCounted: kpiSnapshot.funding.medianHoursFromPledgeToCounted,
      sponsorPoolRefillRateBps: kpiSnapshot.funding.sponsorPoolRefillRateBps,
      donorRetentionIntoNextRoundBps: kpiSnapshot.funding.donorRetentionIntoNextRoundBps,
    },
    disputeAndReviewSummary: {
      reviewSlaAttainmentBps: kpiSnapshot.funding.reviewSlaAttainmentBps,
      disputeRateBps: kpiSnapshot.funding.disputeRateBps,
      appealOverturnRateBps: kpiSnapshot.funding.appealOverturnRateBps,
      disputeCaseCount: kpiSnapshot.review.disputeCaseCount,
      appealCaseCount: kpiSnapshot.review.appealCaseCount,
    },
    experimentSummary: {
      recommendedCount: kpiSnapshot.experimentBacklog.recommendedCount,
      activeAssignmentEventCount: kpiSnapshot.experimentBacklog.activeAssignmentEventCount,
      experimentKeys,
    },
    nextRoundParameterReset: {
      thresholdCalibrationPath: `/api/mpgf/rounds/${round.id}/threshold-calibration`,
      suggestedChangeCount: thresholdCalibration?.suggestedChangeCount ?? 0,
      holdForReviewCount: thresholdCalibration?.holdForReviewCount ?? 0,
      rows,
    },
    rolloutGate: kpiSnapshot.rolloutGate,
    calcHash,
  };
}

export function getMpgfPublicGoodsPostmortemReportApi(roundId: string = demoMpgfAssuranceRound.id) {
  if (roundId !== demoMpgfAssuranceRound.id) {
    return null;
  }

  return buildMpgfPublicGoodsPostmortemReport();
}
