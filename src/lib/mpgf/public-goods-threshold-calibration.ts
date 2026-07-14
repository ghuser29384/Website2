import { createHash } from "node:crypto";

import {
  demoMpgfAssurancePledges,
  demoMpgfAssuranceRound,
  demoMpgfMatchPool,
  demoMpgfPublicGoodsCampaigns,
} from "./data";
import { getMpgfCampaignAssuranceStatus } from "./mechanism";
import { buildMpgfPublicGoodsCgVqafReport } from "./public-goods-cg-vqaf";
import type {
  MpgfPublicGoodsCampaign,
  MpgfPublicGoodsMatchPool,
  MpgfPublicGoodsPledge,
  MpgfPublicGoodsRound,
} from "./types";

export const MPGF_PUBLIC_GOODS_THRESHOLD_CALIBRATION_POLICY =
  "next_round_common_ground_threshold_calibration_v1";

export const MPGF_PUBLIC_GOODS_THRESHOLD_CALIBRATION_PRIVACY_POLICY =
  "aggregate_only_no_private_support_reasons_or_donor_rows";

type MpgfPublicGoodsThresholdCalibrationAction =
  | "increase_next_round_threshold"
  | "lower_next_round_threshold"
  | "keep_next_round_threshold"
  | "hold_for_review_before_next_round";

type MpgfPublicGoodsThresholdConfidence = "high" | "medium" | "low";

export interface MpgfPublicGoodsThresholdCalibrationRow {
  campaignId: string;
  currentThresholdAmountCents: number;
  currentThresholdSupporters: number;
  currentDirectEligibleCents: number;
  currentVerifiedSupporters: number;
  commonGroundScoreBps: number;
  commonGroundSignalCount: number;
  qSignalCents: number;
  sponsorBudgetShareBps: number;
  recommendedNextRoundThresholdAmountCents: number;
  recommendedNextRoundThresholdSupporters: number;
  action: MpgfPublicGoodsThresholdCalibrationAction;
  confidence: MpgfPublicGoodsThresholdConfidence;
  reasonCodes: string[];
  calculationHash: string;
}

export interface MpgfPublicGoodsThresholdCalibrationReport {
  ok: true;
  roundId: string;
  policy: typeof MPGF_PUBLIC_GOODS_THRESHOLD_CALIBRATION_POLICY;
  privacyPolicy: typeof MPGF_PUBLIC_GOODS_THRESHOLD_CALIBRATION_PRIVACY_POLICY;
  appliesTo: "next_round_only_after_public_postmortem";
  currentRoundMutationAllowed: false;
  parametersLockedBeforeDonationsOpen: true;
  noGlobalMoralRanking: true;
  ranksOperationalCalibrationOnly: true;
  rowCount: number;
  suggestedChangeCount: number;
  holdForReviewCount: number;
  rows: MpgfPublicGoodsThresholdCalibrationRow[];
  calcHash: string;
}

function hashValue(value: unknown) {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

function clampInteger(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function roundToNearestCents(value: number, unitCents: number) {
  const unit = Math.max(1, unitCents);

  return Math.max(unit, Math.round(value / unit) * unit);
}

function activePledgeCount(campaignId: string, pledges: MpgfPublicGoodsPledge[]) {
  return pledges.filter(
    (pledge) =>
      pledge.campaignId === campaignId &&
      (pledge.status === "pledged" || pledge.status === "captured"),
  ).length;
}

function confidenceFor({
  activeCount,
  commonGroundSignalCount,
  thresholdPassed,
}: {
  activeCount: number;
  commonGroundSignalCount: number;
  thresholdPassed: boolean;
}): MpgfPublicGoodsThresholdConfidence {
  if (thresholdPassed && activeCount >= 3 && commonGroundSignalCount >= 2) {
    return "high";
  }

  if (activeCount >= 2 || commonGroundSignalCount >= 2) {
    return "medium";
  }

  return "low";
}

function recommendedSupporterThreshold({
  currentThresholdSupporters,
  currentVerifiedSupporters,
  commonGroundScoreBps,
  commonGroundSignalCount,
}: {
  currentThresholdSupporters: number;
  currentVerifiedSupporters: number;
  commonGroundScoreBps: number;
  commonGroundSignalCount: number;
}) {
  const breadthFloor = commonGroundScoreBps >= 7_000 || commonGroundSignalCount >= currentThresholdSupporters + 1
    ? currentThresholdSupporters + 1
    : currentThresholdSupporters;
  const observedFloor = currentVerifiedSupporters >= currentThresholdSupporters
    ? Math.ceil(currentVerifiedSupporters * 1.15)
    : Math.max(2, Math.ceil(currentVerifiedSupporters * 1.1));

  return clampInteger(Math.max(2, breadthFloor, observedFloor), 2, 25);
}

function recommendedAmountThreshold({
  campaign,
  directEligibleCents,
  thresholdPassed,
  matchPool,
  campaignCount,
}: {
  campaign: MpgfPublicGoodsCampaign;
  directEligibleCents: number;
  thresholdPassed: boolean;
  matchPool: MpgfPublicGoodsMatchPool;
  campaignCount: number;
}) {
  const current = campaign.thresholdAmountCents;
  const sponsorPoolPerCampaign = Math.max(10_000, Math.floor(matchPool.budgetCents / Math.max(1, campaignCount)));
  const sponsorPressureCap = Math.max(current, Math.floor(sponsorPoolPerCampaign * 1.5));
  const observed = thresholdPassed
    ? Math.max(current, directEligibleCents * 1.1)
    : Math.max(10_000, Math.min(current * 0.9, directEligibleCents * 1.35 || current * 0.75));

  return Math.max(10_000, roundToNearestCents(Math.min(observed, sponsorPressureCap), 500));
}

function actionFor({
  campaign,
  recommendedAmountCents,
  recommendedSupporters,
  confidence,
}: {
  campaign: MpgfPublicGoodsCampaign;
  recommendedAmountCents: number;
  recommendedSupporters: number;
  confidence: MpgfPublicGoodsThresholdConfidence;
}): MpgfPublicGoodsThresholdCalibrationAction {
  if (campaign.reviewStatus === "blocked" || confidence === "low") {
    return "hold_for_review_before_next_round";
  }

  if (
    recommendedAmountCents > campaign.thresholdAmountCents ||
    recommendedSupporters > campaign.thresholdSupporters
  ) {
    return "increase_next_round_threshold";
  }

  if (
    recommendedAmountCents < campaign.thresholdAmountCents ||
    recommendedSupporters < campaign.thresholdSupporters
  ) {
    return "lower_next_round_threshold";
  }

  return "keep_next_round_threshold";
}

function reasonCodesFor({
  campaign,
  thresholdPassed,
  commonGroundScoreBps,
  qSignalCents,
  confidence,
  action,
}: {
  campaign: MpgfPublicGoodsCampaign;
  thresholdPassed: boolean;
  commonGroundScoreBps: number;
  qSignalCents: number;
  confidence: MpgfPublicGoodsThresholdConfidence;
  action: MpgfPublicGoodsThresholdCalibrationAction;
}) {
  const reasons = [
    thresholdPassed ? "current_threshold_cleared" : "current_threshold_not_cleared",
    commonGroundScoreBps >= 6_000 ? "broad_common_ground_signal" : "limited_common_ground_signal",
    qSignalCents > 0 ? "positive_breadth_sensitive_qf_signal" : "no_qf_breadth_signal",
    `confidence_${confidence}`,
    action,
  ];

  if (campaign.reviewStatus !== "approved") {
    reasons.push(`review_status_${campaign.reviewStatus}`);
  }

  return reasons;
}

export function buildMpgfPublicGoodsThresholdCalibrationReport({
  campaigns = demoMpgfPublicGoodsCampaigns,
  pledges = demoMpgfAssurancePledges,
  round = demoMpgfAssuranceRound,
  matchPool = demoMpgfMatchPool,
  now = new Date("2026-05-31T12:00:00.000Z"),
}: {
  campaigns?: MpgfPublicGoodsCampaign[];
  pledges?: MpgfPublicGoodsPledge[];
  round?: MpgfPublicGoodsRound;
  matchPool?: MpgfPublicGoodsMatchPool;
  now?: Date;
} = {}): MpgfPublicGoodsThresholdCalibrationReport {
  const cgVqaf = buildMpgfPublicGoodsCgVqafReport({ campaigns, pledges, round, matchPool, now });
  const rows = campaigns.map((campaign) => {
    const assurance = getMpgfCampaignAssuranceStatus(campaign, pledges, now);
    const cgRow = cgVqaf.rows.find((row) => row.campaignId === campaign.id);
    const activeCount = activePledgeCount(campaign.id, pledges);
    const confidence = confidenceFor({
      activeCount,
      commonGroundSignalCount: cgRow?.commonGroundSignalCount ?? 0,
      thresholdPassed: assurance.thresholdPassed,
    });
    const recommendedNextRoundThresholdAmountCents = recommendedAmountThreshold({
      campaign,
      directEligibleCents: assurance.directEligibleCents,
      thresholdPassed: assurance.thresholdPassed,
      matchPool,
      campaignCount: campaigns.length,
    });
    const recommendedNextRoundThresholdSupporters = recommendedSupporterThreshold({
      currentThresholdSupporters: campaign.thresholdSupporters,
      currentVerifiedSupporters: assurance.verifiedSupporterCount,
      commonGroundScoreBps: cgRow?.commonGroundScoreBps ?? 0,
      commonGroundSignalCount: cgRow?.commonGroundSignalCount ?? 0,
    });
    const sponsorBudgetShareBps = matchPool.budgetCents > 0
      ? clampInteger((recommendedNextRoundThresholdAmountCents / matchPool.budgetCents) * 10_000, 0, 10_000)
      : 0;
    const action = actionFor({
      campaign,
      recommendedAmountCents: recommendedNextRoundThresholdAmountCents,
      recommendedSupporters: recommendedNextRoundThresholdSupporters,
      confidence,
    });
    const reasonCodes = reasonCodesFor({
      campaign,
      thresholdPassed: assurance.thresholdPassed,
      commonGroundScoreBps: cgRow?.commonGroundScoreBps ?? 0,
      qSignalCents: cgRow?.qSignalCents ?? 0,
      confidence,
      action,
    });
    const calculationHash = hashValue([
      round.id,
      campaign.id,
      campaign.thresholdAmountCents,
      campaign.thresholdSupporters,
      assurance.directEligibleCents,
      assurance.verifiedSupporterCount,
      cgRow?.commonGroundScoreBps ?? 0,
      cgRow?.commonGroundSignalCount ?? 0,
      cgRow?.qSignalCents ?? 0,
      recommendedNextRoundThresholdAmountCents,
      recommendedNextRoundThresholdSupporters,
      action,
      confidence,
      reasonCodes,
    ]);

    return {
      campaignId: campaign.id,
      currentThresholdAmountCents: campaign.thresholdAmountCents,
      currentThresholdSupporters: campaign.thresholdSupporters,
      currentDirectEligibleCents: assurance.directEligibleCents,
      currentVerifiedSupporters: assurance.verifiedSupporterCount,
      commonGroundScoreBps: cgRow?.commonGroundScoreBps ?? 0,
      commonGroundSignalCount: cgRow?.commonGroundSignalCount ?? 0,
      qSignalCents: cgRow?.qSignalCents ?? 0,
      sponsorBudgetShareBps,
      recommendedNextRoundThresholdAmountCents,
      recommendedNextRoundThresholdSupporters,
      action,
      confidence,
      reasonCodes,
      calculationHash,
    };
  });
  const suggestedChangeCount = rows.filter((row) =>
    row.action === "increase_next_round_threshold" ||
    row.action === "lower_next_round_threshold"
  ).length;
  const holdForReviewCount = rows.filter((row) => row.action === "hold_for_review_before_next_round").length;
  const calcHash = hashValue([
    round.id,
    MPGF_PUBLIC_GOODS_THRESHOLD_CALIBRATION_POLICY,
    rows.map((row) => [
      row.campaignId,
      row.recommendedNextRoundThresholdAmountCents,
      row.recommendedNextRoundThresholdSupporters,
      row.action,
      row.confidence,
      row.calculationHash,
    ]),
  ]);

  return {
    ok: true,
    roundId: round.id,
    policy: MPGF_PUBLIC_GOODS_THRESHOLD_CALIBRATION_POLICY,
    privacyPolicy: MPGF_PUBLIC_GOODS_THRESHOLD_CALIBRATION_PRIVACY_POLICY,
    appliesTo: "next_round_only_after_public_postmortem",
    currentRoundMutationAllowed: false,
    parametersLockedBeforeDonationsOpen: true,
    noGlobalMoralRanking: true,
    ranksOperationalCalibrationOnly: true,
    rowCount: rows.length,
    suggestedChangeCount,
    holdForReviewCount,
    rows,
    calcHash,
  };
}

export function getMpgfPublicGoodsThresholdCalibrationReportApi(roundId: string = demoMpgfAssuranceRound.id) {
  if (roundId !== demoMpgfAssuranceRound.id) {
    return null;
  }

  return buildMpgfPublicGoodsThresholdCalibrationReport();
}
