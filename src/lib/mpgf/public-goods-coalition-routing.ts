import { createHash } from "node:crypto";

import {
  demoMpgfAssurancePledges,
  demoMpgfAssuranceRound,
  demoMpgfMatchPool,
  demoMpgfPublicGoodsCampaigns,
} from "./data";
import { getMpgfCampaignAssuranceStatus } from "./mechanism";
import {
  createMpgfPublicGoodsSupportSignal,
  type MpgfPublicGoodsMoralCluster,
  type MpgfPublicGoodsSupportSignal,
} from "./public-goods-cg-vqaf";
import type {
  MpgfPublicGoodsCampaign,
  MpgfPublicGoodsMatchPool,
  MpgfPublicGoodsPledge,
  MpgfPublicGoodsRound,
} from "./types";

export const MPGF_PUBLIC_GOODS_COALITION_ROUTING_POLICY =
  "coalition_routed_escrowed_conditional_matching_v1";

export const MPGF_PUBLIC_GOODS_COALITION_ROUTING_PRIVACY_POLICY =
  "aggregate_coalition_candidates_no_user_budgets_or_private_support_reasons";

export const MPGF_PUBLIC_GOODS_COALITION_ROUTING_FAILURE_POLICY =
  "release_hold_then_fallback_rule_with_capped_carry_forward_or_failure_bonus";

export type MpgfPublicGoodsCoalitionHardGateStatus =
  | "passed"
  | "pending_review"
  | "challenge_open"
  | "blocked";

export type MpgfPublicGoodsCoalitionCandidateStatus =
  | "threshold_feasible"
  | "amount_gap"
  | "supporter_gap"
  | "cluster_gap"
  | "hard_gate_pending"
  | "hard_gate_blocked";

export interface MpgfPublicGoodsCoalitionRoutingRow {
  campaignId: string;
  hardGateStatus: MpgfPublicGoodsCoalitionHardGateStatus;
  candidateStatus: MpgfPublicGoodsCoalitionCandidateStatus;
  directEligibleCents: number;
  eligibleWeakBudgetCents: number;
  routedWeakBudgetCents: number;
  thresholdAmountCents: number;
  thresholdSupporters: number;
  thresholdClusterMin: number;
  activeSupporterCount: number;
  activeClusterCount: number;
  strongSupporterSignalCount: number;
  weakCommonGroundSignalCount: number;
  dissentSignalCount: number;
  amountGapCents: number;
  supporterGap: number;
  clusterGap: number;
  amountFeasible: boolean;
  supporterFeasible: boolean;
  clusterFeasible: boolean;
  thresholdFeasibleFlag: boolean;
  ecmBatchClearingEligible: boolean;
  failureBonusOrCarryForwardEligible: boolean;
  noGlobalMoralRanking: true;
  calculationHash: string;
}

export interface MpgfPublicGoodsCoalitionRoutingReport {
  ok: true;
  roundId: string;
  policy: typeof MPGF_PUBLIC_GOODS_COALITION_ROUTING_POLICY;
  privacyPolicy: typeof MPGF_PUBLIC_GOODS_COALITION_ROUTING_PRIVACY_POLICY;
  failureHandlingPolicy: typeof MPGF_PUBLIC_GOODS_COALITION_ROUTING_FAILURE_POLICY;
  stageOrder: [
    "hard_gating",
    "coalition_feasibility",
    "ecm_batch_clearing",
    "base_match_then_capped_diversity_bonus",
    "failure_fallback_or_carry_forward",
  ];
  weakSupportBudgetPolicy: "per_signal_strength_weighted_by_locked_donor_cap_until_user_budget_records_exist";
  weakStanceWeightBps: number;
  donorCapCents: number;
  thresholdClusterMin: number;
  noGlobalMoralRanking: true;
  moralReputationAffectsAllocationPower: false;
  publicAggregationOnly: true;
  candidateCount: number;
  feasibleCandidateCount: number;
  ecmBatchCandidateCount: number;
  weakSupportBudgetCents: number;
  routedWeakSupportBudgetCents: number;
  failureBonusOrCarryForwardCandidateCount: number;
  rows: MpgfPublicGoodsCoalitionRoutingRow[];
  calcHash: string;
}

function hashValue(value: unknown) {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

function clampNonNegativeInteger(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function readPositiveInteger(value: unknown, fallback: number) {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function readBps(value: unknown, fallback: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(0, Math.min(10_000, Math.floor(parsed)));
}

function hardGateStatusFor(campaign: MpgfPublicGoodsCampaign): MpgfPublicGoodsCoalitionHardGateStatus {
  if (campaign.reviewStatus === "blocked") {
    return "blocked";
  }

  if (campaign.reviewStatus === "challenge_window") {
    return "challenge_open";
  }

  if (campaign.reviewStatus === "approved" || campaign.reviewStatus === "finalized") {
    return "passed";
  }

  return "pending_review";
}

function candidateStatusFor(input: {
  hardGateStatus: MpgfPublicGoodsCoalitionHardGateStatus;
  amountFeasible: boolean;
  supporterFeasible: boolean;
  clusterFeasible: boolean;
}): MpgfPublicGoodsCoalitionCandidateStatus {
  if (input.hardGateStatus === "blocked") {
    return "hard_gate_blocked";
  }

  if (input.hardGateStatus !== "passed") {
    return "hard_gate_pending";
  }

  if (!input.amountFeasible) {
    return "amount_gap";
  }

  if (!input.supporterFeasible) {
    return "supporter_gap";
  }

  if (!input.clusterFeasible) {
    return "cluster_gap";
  }

  return "threshold_feasible";
}

function supportSignalsForCampaign(campaignId: string, supportSignals: MpgfPublicGoodsSupportSignal[]) {
  const relevant = supportSignals.filter((signal) => signal.campaignId === campaignId);
  const supportive = relevant.filter((signal) => signal.countsForCommonGround);
  const weak = relevant.filter((signal) => signal.signalType === "weak_common_ground_support");
  const strong = relevant.filter((signal) => signal.signalType === "strong_support");
  const dissent = relevant.filter((signal) => signal.signalType === "dissent_review_requested");

  return {
    supportive,
    weak,
    strong,
    dissent,
  };
}

function eligibleWeakBudgetCents({
  donorCapCents,
  signals,
  weakStanceWeightBps,
}: {
  donorCapCents: number;
  signals: MpgfPublicGoodsSupportSignal[];
  weakStanceWeightBps: number;
}) {
  return signals.reduce((sum, signal) => {
    const cappedSignalBudget = Math.floor((donorCapCents * weakStanceWeightBps) / 10_000);

    return sum + Math.floor((cappedSignalBudget * signal.strengthBps) / 10_000);
  }, 0);
}

function defaultSupportSignals(round: MpgfPublicGoodsRound) {
  return [
    createMpgfPublicGoodsSupportSignal({
      round,
      campaignId: "campaign-global-health-basic-needs",
      userRef: "private-coalition-humanitarian-alix",
      moralCluster: "humanitarian",
      signalType: "strong_support",
      strengthBps: 9_000,
    }),
    createMpgfPublicGoodsSupportSignal({
      round,
      campaignId: "campaign-global-health-basic-needs",
      userRef: "private-coalition-pluralist-briar",
      moralCluster: "institutional_pluralist",
      signalType: "weak_common_ground_support",
      strengthBps: 6_500,
    }),
    createMpgfPublicGoodsSupportSignal({
      round,
      campaignId: "campaign-global-health-basic-needs",
      userRef: "private-coalition-longtermist-cy",
      moralCluster: "longtermist",
      signalType: "weak_common_ground_support",
      strengthBps: 5_500,
    }),
    createMpgfPublicGoodsSupportSignal({
      round,
      campaignId: "campaign-existential-risk-resilience",
      userRef: "private-coalition-longtermist-dara",
      moralCluster: "longtermist",
      signalType: "strong_support",
      strengthBps: 9_200,
    }),
    createMpgfPublicGoodsSupportSignal({
      round,
      campaignId: "campaign-existential-risk-resilience",
      userRef: "private-coalition-pluralist-eli",
      moralCluster: "institutional_pluralist",
      signalType: "weak_common_ground_support",
      strengthBps: 6_200,
    }),
    createMpgfPublicGoodsSupportSignal({
      round,
      campaignId: "campaign-animal-welfare-transition",
      userRef: "private-coalition-animal-fin",
      moralCluster: "animal_inclusive",
      signalType: "strong_support",
      strengthBps: 8_900,
    }),
    createMpgfPublicGoodsSupportSignal({
      round,
      campaignId: "campaign-animal-welfare-transition",
      userRef: "private-coalition-humanitarian-gale",
      moralCluster: "humanitarian",
      signalType: "weak_common_ground_support",
      strengthBps: 5_700,
    }),
    createMpgfPublicGoodsSupportSignal({
      round,
      campaignId: "campaign-public-interest-knowledge",
      userRef: "private-coalition-pluralist-ira",
      moralCluster: "institutional_pluralist",
      signalType: "weak_common_ground_support",
      strengthBps: 6_800,
    }),
    createMpgfPublicGoodsSupportSignal({
      round,
      campaignId: "campaign-public-interest-knowledge",
      userRef: "private-coalition-longtermist-jules",
      moralCluster: "longtermist",
      signalType: "weak_common_ground_support",
      strengthBps: 5_900,
    }),
  ];
}

export function buildMpgfPublicGoodsCoalitionRoutingReport({
  campaigns = demoMpgfPublicGoodsCampaigns,
  pledges = demoMpgfAssurancePledges,
  round = demoMpgfAssuranceRound,
  matchPool = demoMpgfMatchPool,
  supportSignals,
  now = new Date("2026-05-31T12:00:00.000Z"),
}: {
  campaigns?: MpgfPublicGoodsCampaign[];
  pledges?: MpgfPublicGoodsPledge[];
  round?: MpgfPublicGoodsRound;
  matchPool?: MpgfPublicGoodsMatchPool;
  supportSignals?: MpgfPublicGoodsSupportSignal[];
  now?: Date;
} = {}): MpgfPublicGoodsCoalitionRoutingReport {
  const donorCapCents = readPositiveInteger(matchPool.restrictionsJson.perDonorQfCapCents, 10_000);
  const weakStanceWeightBps = readBps(matchPool.restrictionsJson.weakStanceWeightBps, 6_000);
  const thresholdClusterMin = readPositiveInteger(matchPool.restrictionsJson.thresholdClusterMin, 2);
  const sourceSupportSignals = supportSignals ?? (
    round.id === demoMpgfAssuranceRound.id ? defaultSupportSignals(round) : []
  );
  const rows = campaigns.map((campaign): MpgfPublicGoodsCoalitionRoutingRow => {
    const assurance = getMpgfCampaignAssuranceStatus(campaign, pledges, now);
    const signals = supportSignalsForCampaign(campaign.id, sourceSupportSignals);
    const supportiveUserRefs = new Set(signals.supportive.map((signal) => signal.userRefHash));
    const supportiveClusters = new Set<MpgfPublicGoodsMoralCluster>(
      signals.supportive.map((signal) => signal.moralCluster),
    );
    const weakBudget = eligibleWeakBudgetCents({
      donorCapCents,
      signals: signals.weak,
      weakStanceWeightBps,
    });
    const hardGateStatus = hardGateStatusFor(campaign);
    const directEligibleCents = clampNonNegativeInteger(assurance.directEligibleCents);
    const amountGapCents = Math.max(0, campaign.thresholdAmountCents - directEligibleCents - weakBudget);
    const activeSupporterCount = Math.max(assurance.verifiedSupporterCount, supportiveUserRefs.size);
    const activeClusterCount = supportiveClusters.size;
    const supporterGap = Math.max(0, campaign.thresholdSupporters - activeSupporterCount);
    const clusterGap = Math.max(0, thresholdClusterMin - activeClusterCount);
    const amountFeasible = amountGapCents === 0;
    const supporterFeasible = supporterGap === 0;
    const clusterFeasible = clusterGap === 0;
    const thresholdFeasibleFlag =
      hardGateStatus === "passed" && amountFeasible && supporterFeasible && clusterFeasible;
    const routedWeakBudgetCents = thresholdFeasibleFlag
      ? Math.min(weakBudget, Math.max(0, campaign.thresholdAmountCents - directEligibleCents))
      : 0;
    const candidateStatus = candidateStatusFor({
      hardGateStatus,
      amountFeasible,
      supporterFeasible,
      clusterFeasible,
    });
    const failureBonusOrCarryForwardEligible =
      hardGateStatus === "passed" && !thresholdFeasibleFlag && activeSupporterCount > 0;
    const calculationHash = hashValue([
      round.id,
      campaign.id,
      hardGateStatus,
      directEligibleCents,
      weakBudget,
      routedWeakBudgetCents,
      campaign.thresholdAmountCents,
      campaign.thresholdSupporters,
      thresholdClusterMin,
      activeSupporterCount,
      activeClusterCount,
      candidateStatus,
    ]);

    return {
      campaignId: campaign.id,
      hardGateStatus,
      candidateStatus,
      directEligibleCents,
      eligibleWeakBudgetCents: weakBudget,
      routedWeakBudgetCents,
      thresholdAmountCents: campaign.thresholdAmountCents,
      thresholdSupporters: campaign.thresholdSupporters,
      thresholdClusterMin,
      activeSupporterCount,
      activeClusterCount,
      strongSupporterSignalCount: signals.strong.length,
      weakCommonGroundSignalCount: signals.weak.length,
      dissentSignalCount: signals.dissent.length,
      amountGapCents,
      supporterGap,
      clusterGap,
      amountFeasible,
      supporterFeasible,
      clusterFeasible,
      thresholdFeasibleFlag,
      ecmBatchClearingEligible: thresholdFeasibleFlag,
      failureBonusOrCarryForwardEligible,
      noGlobalMoralRanking: true,
      calculationHash,
    };
  }).sort((left, right) => (
    Number(right.thresholdFeasibleFlag) - Number(left.thresholdFeasibleFlag) ||
    right.routedWeakBudgetCents - left.routedWeakBudgetCents ||
    right.eligibleWeakBudgetCents - left.eligibleWeakBudgetCents ||
    left.campaignId.localeCompare(right.campaignId)
  ));
  const calcHash = hashValue([
    round.id,
    MPGF_PUBLIC_GOODS_COALITION_ROUTING_POLICY,
    weakStanceWeightBps,
    donorCapCents,
    thresholdClusterMin,
    rows.map((row) => [
      row.campaignId,
      row.candidateStatus,
      row.eligibleWeakBudgetCents,
      row.routedWeakBudgetCents,
      row.thresholdFeasibleFlag,
      row.calculationHash,
    ]),
  ]);

  return {
    ok: true,
    roundId: round.id,
    policy: MPGF_PUBLIC_GOODS_COALITION_ROUTING_POLICY,
    privacyPolicy: MPGF_PUBLIC_GOODS_COALITION_ROUTING_PRIVACY_POLICY,
    failureHandlingPolicy: MPGF_PUBLIC_GOODS_COALITION_ROUTING_FAILURE_POLICY,
    stageOrder: [
      "hard_gating",
      "coalition_feasibility",
      "ecm_batch_clearing",
      "base_match_then_capped_diversity_bonus",
      "failure_fallback_or_carry_forward",
    ],
    weakSupportBudgetPolicy: "per_signal_strength_weighted_by_locked_donor_cap_until_user_budget_records_exist",
    weakStanceWeightBps,
    donorCapCents,
    thresholdClusterMin,
    noGlobalMoralRanking: true,
    moralReputationAffectsAllocationPower: false,
    publicAggregationOnly: true,
    candidateCount: rows.length,
    feasibleCandidateCount: rows.filter((row) => row.thresholdFeasibleFlag).length,
    ecmBatchCandidateCount: rows.filter((row) => row.ecmBatchClearingEligible).length,
    weakSupportBudgetCents: rows.reduce((sum, row) => sum + row.eligibleWeakBudgetCents, 0),
    routedWeakSupportBudgetCents: rows.reduce((sum, row) => sum + row.routedWeakBudgetCents, 0),
    failureBonusOrCarryForwardCandidateCount: rows.filter((row) => row.failureBonusOrCarryForwardEligible).length,
    rows,
    calcHash,
  };
}

export function getMpgfPublicGoodsCoalitionRoutingReportApi(roundId: string = demoMpgfAssuranceRound.id) {
  if (roundId !== demoMpgfAssuranceRound.id) {
    return null;
  }

  return buildMpgfPublicGoodsCoalitionRoutingReport();
}
