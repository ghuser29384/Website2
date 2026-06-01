import { createHash } from "node:crypto";

import {
  demoMpgfAssurancePledges,
  demoMpgfAssuranceRound,
  demoMpgfMatchPool,
  demoMpgfPublicGoodsCampaigns,
} from "./data";
import {
  countMpgfQfContributionCents,
  getMpgfCampaignAssuranceStatus,
  mpgfVerificationWeightFromHumanScoreBps,
} from "./mechanism";
import type {
  MpgfPublicGoodsCampaign,
  MpgfPublicGoodsMatchPool,
  MpgfPublicGoodsPledge,
  MpgfPublicGoodsRound,
} from "./types";

export const MPGF_PUBLIC_GOODS_CG_VQAF_POLICY =
  "common_ground_verified_quadratic_assurance_funding_v1";

export const MPGF_PUBLIC_GOODS_CG_VQAF_PRIVACY_POLICY =
  "support_signals_private_by_default_public_aggregates_only";

export type MpgfPublicGoodsSupportSignalType =
  | "strong_support"
  | "weak_common_ground_support"
  | "dissent_review_requested";

export type MpgfPublicGoodsMoralCluster =
  | "humanitarian"
  | "longtermist"
  | "animal_inclusive"
  | "institutional_pluralist";

export const MPGF_PUBLIC_GOODS_SUPPORT_SIGNAL_OPTIONS = [
  {
    value: "strong_support",
    label: "Strongly support",
    description: "This campaign is a direct priority for my moral view.",
    defaultStrengthBps: 9_000,
  },
  {
    value: "weak_common_ground_support",
    label: "Weak common-ground support",
    description: "This campaign is not my top priority, but I can endorse it as a shared moral public good.",
    defaultStrengthBps: 6_000,
  },
  {
    value: "dissent_review_requested",
    label: "Dissent / want review",
    description: "This campaign needs externality, threat-baseline, destination, or collusion review before I support it.",
    defaultStrengthBps: 2_500,
  },
] as const satisfies ReadonlyArray<{
  value: MpgfPublicGoodsSupportSignalType;
  label: string;
  description: string;
  defaultStrengthBps: number;
}>;

export const MPGF_PUBLIC_GOODS_MORAL_CLUSTER_OPTIONS = [
  {
    value: "humanitarian",
    label: "Humanitarian",
    description: "Near-term human welfare and basic needs.",
  },
  {
    value: "longtermist",
    label: "Longtermist",
    description: "Future generations, existential risk, and durable institutions.",
  },
  {
    value: "animal_inclusive",
    label: "Animal-inclusive",
    description: "Nonhuman animals and sentient-being welfare.",
  },
  {
    value: "institutional_pluralist",
    label: "Institutional pluralist",
    description: "Fair process, public-interest knowledge, and cross-view legitimacy.",
  },
] as const satisfies ReadonlyArray<{
  value: MpgfPublicGoodsMoralCluster;
  label: string;
  description: string;
}>;

export const MPGF_PUBLIC_GOODS_COLLECTIVE_ACTION_STATES = [
  {
    value: "signal_only",
    label: "Signal only",
    description: "Private support or dissent signal recorded for aggregate common-ground discovery.",
  },
  {
    value: "pledge_saved",
    label: "Pledge saved",
    description: "A fast-route, saved commitment, or fallback proof intent exists for the campaign.",
  },
  {
    value: "pending_verification",
    label: "Pending verification",
    description: "Identity, payment, evidence, and review gates are not yet counted.",
  },
  {
    value: "threshold_cleared",
    label: "Threshold cleared",
    description: "Amount and verified-supporter gates have cleared under locked round parameters.",
  },
  {
    value: "counted",
    label: "Counted",
    description: "The contribution is eligible for base match and capital-constrained QF bonus calculation.",
  },
  {
    value: "payout_in_milestones",
    label: "Payout in milestones",
    description: "Reviewer-authorized release proceeds through the published milestone schedule.",
  },
] as const;

export interface MpgfPublicGoodsSupportSignal {
  ok: true;
  id: string;
  roundId: string;
  campaignId: string;
  userRefHash: string;
  moralCluster: MpgfPublicGoodsMoralCluster;
  signalType: MpgfPublicGoodsSupportSignalType;
  strengthBps: number;
  privateByDefault: true;
  countsForCommonGround: boolean;
  noGlobalMoralRanking: true;
  createdAt: string;
  calcHash: string;
}

export interface MpgfPublicGoodsCgVqafRow {
  campaignId: string;
  status: string;
  directCents: number;
  verifiedSupporterCount: number;
  qSignalCents: number;
  baseMatchCents: number;
  bonusCapCents: number;
  bonusCents: number;
  finalPayoutCents: number;
  commonGroundSignalCount: number;
  weakCommonGroundSignalCount: number;
  dissentSignalCount: number;
  moralClusterCount: number;
  commonGroundScoreBps: number;
  blockers: string[];
  calculationHash: string;
}

export interface MpgfPublicGoodsCgVqafReport {
  ok: true;
  roundId: string;
  policy: typeof MPGF_PUBLIC_GOODS_CG_VQAF_POLICY;
  privacyPolicy: typeof MPGF_PUBLIC_GOODS_CG_VQAF_PRIVACY_POLICY;
  formulaVersion: "cg_vqaf_capital_constrained_qf_v1";
  noGlobalMoralRanking: true;
  ranksCoordinatabilityOnly: true;
  parametersLockedBeforeRoundOpen: true;
  lambda: number;
  baseMatchReserveCents: number;
  qfBonusBudgetCents: number;
  baseMatchAllocatedCents: number;
  qfBonusAllocatedCents: number;
  totalDirectCents: number;
  finalPayoutCents: number;
  supportSignalsSuppressed: true;
  rows: MpgfPublicGoodsCgVqafRow[];
  calcHash: string;
}

export function isMpgfPublicGoodsSupportSignalType(value: unknown): value is MpgfPublicGoodsSupportSignalType {
  return MPGF_PUBLIC_GOODS_SUPPORT_SIGNAL_OPTIONS.some((option) => option.value === value);
}

export function isMpgfPublicGoodsMoralCluster(value: unknown): value is MpgfPublicGoodsMoralCluster {
  return MPGF_PUBLIC_GOODS_MORAL_CLUSTER_OPTIONS.some((option) => option.value === value);
}

export function defaultMpgfPublicGoodsSupportStrengthBps(signalType: MpgfPublicGoodsSupportSignalType) {
  return MPGF_PUBLIC_GOODS_SUPPORT_SIGNAL_OPTIONS.find((option) => option.value === signalType)?.defaultStrengthBps ?? 0;
}

const demoSupportSignals: Array<{
  campaignId: string;
  userRef: string;
  moralCluster: MpgfPublicGoodsMoralCluster;
  signalType: MpgfPublicGoodsSupportSignalType;
  strengthBps: number;
}> = [
  {
    campaignId: "campaign-global-health-basic-needs",
    userRef: "private-cg-humanitarian-alix",
    moralCluster: "humanitarian",
    signalType: "strong_support",
    strengthBps: 9_000,
  },
  {
    campaignId: "campaign-global-health-basic-needs",
    userRef: "private-cg-pluralist-briar",
    moralCluster: "institutional_pluralist",
    signalType: "weak_common_ground_support",
    strengthBps: 6_500,
  },
  {
    campaignId: "campaign-global-health-basic-needs",
    userRef: "private-cg-longtermist-cy",
    moralCluster: "longtermist",
    signalType: "weak_common_ground_support",
    strengthBps: 5_500,
  },
  {
    campaignId: "campaign-existential-risk-resilience",
    userRef: "private-cg-longtermist-dara",
    moralCluster: "longtermist",
    signalType: "strong_support",
    strengthBps: 9_200,
  },
  {
    campaignId: "campaign-existential-risk-resilience",
    userRef: "private-cg-pluralist-eli",
    moralCluster: "institutional_pluralist",
    signalType: "weak_common_ground_support",
    strengthBps: 6_200,
  },
  {
    campaignId: "campaign-animal-welfare-transition",
    userRef: "private-cg-animal-fin",
    moralCluster: "animal_inclusive",
    signalType: "strong_support",
    strengthBps: 8_900,
  },
  {
    campaignId: "campaign-animal-welfare-transition",
    userRef: "private-cg-humanitarian-gale",
    moralCluster: "humanitarian",
    signalType: "weak_common_ground_support",
    strengthBps: 5_700,
  },
  {
    campaignId: "campaign-animal-welfare-transition",
    userRef: "private-cg-pluralist-harper",
    moralCluster: "institutional_pluralist",
    signalType: "dissent_review_requested",
    strengthBps: 2_500,
  },
  {
    campaignId: "campaign-public-interest-knowledge",
    userRef: "private-cg-pluralist-ira",
    moralCluster: "institutional_pluralist",
    signalType: "weak_common_ground_support",
    strengthBps: 6_800,
  },
  {
    campaignId: "campaign-public-interest-knowledge",
    userRef: "private-cg-longtermist-jules",
    moralCluster: "longtermist",
    signalType: "weak_common_ground_support",
    strengthBps: 5_900,
  },
];

function hashValue(value: unknown) {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

function clampBps(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.min(10_000, Math.floor(value))) : 0;
}

function distributeIntegerBudget<T>(
  items: T[],
  budgetCents: number,
  weightFor: (item: T) => number,
  keyFor: (item: T) => string,
) {
  const budget = Math.max(0, Math.floor(budgetCents));
  const weights = items.map((item) => Math.max(0, weightFor(item)));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const allocations = new Map<string, number>();

  if (budget === 0 || totalWeight <= 0) {
    for (const item of items) {
      allocations.set(keyFor(item), 0);
    }

    return allocations;
  }

  const raw = items.map((item, index) => {
    const exact = (budget * weights[index]) / totalWeight;

    return {
      item,
      key: keyFor(item),
      floor: Math.floor(exact),
      remainder: exact - Math.floor(exact),
    };
  });
  let assigned = 0;

  for (const row of raw) {
    allocations.set(row.key, row.floor);
    assigned += row.floor;
  }

  for (const row of [...raw]
    .sort((left, right) => right.remainder - left.remainder || left.key.localeCompare(right.key))
    .slice(0, budget - assigned)) {
    allocations.set(row.key, (allocations.get(row.key) ?? 0) + 1);
  }

  return allocations;
}

function eligibleWeightedContributions(campaignId: string, pledges: MpgfPublicGoodsPledge[]) {
  const byUser = new Map<string, { grossCents: number; humanScoreBps: number }>();

  for (const pledge of pledges) {
    if (pledge.campaignId !== campaignId || pledge.eligibilityState !== "eligible") {
      continue;
    }

    if (pledge.status !== "pledged" && pledge.status !== "captured") {
      continue;
    }

    const existing = byUser.get(pledge.userId);

    if (!existing) {
      byUser.set(pledge.userId, {
        grossCents: pledge.amountCents,
        humanScoreBps: pledge.humanScoreBps,
      });
      continue;
    }

    existing.grossCents += pledge.amountCents;
    existing.humanScoreBps = Math.max(existing.humanScoreBps, pledge.humanScoreBps);
  }

  return [...byUser.entries()].map(([donorId, row]) => {
    const verificationWeight = mpgfVerificationWeightFromHumanScoreBps(row.humanScoreBps);
    const countedCents = Math.floor(countMpgfQfContributionCents(row.grossCents) * verificationWeight);

    return {
      donorId,
      countedCents,
    };
  }).filter((row) => row.countedCents > 0);
}

function qSignalCents(contributions: Array<{ countedCents: number }>) {
  const direct = contributions.reduce((sum, row) => sum + row.countedCents, 0);
  const rootSum = contributions.reduce((sum, row) => sum + Math.sqrt(row.countedCents), 0);

  return Math.max(0, Math.floor(rootSum * rootSum - direct));
}

function normalizeSignal({
  round,
  campaignId,
  userRef,
  moralCluster,
  signalType,
  strengthBps,
  createdAt,
}: {
  round: MpgfPublicGoodsRound;
  campaignId: string;
  userRef: string;
  moralCluster: MpgfPublicGoodsMoralCluster;
  signalType: MpgfPublicGoodsSupportSignalType;
  strengthBps: number;
  createdAt: string;
}): MpgfPublicGoodsSupportSignal {
  const userRefHash = hashValue(["mpgf-cg-vqaf-support-signal", userRef]);
  const normalizedStrengthBps = clampBps(strengthBps);
  const calcHash = hashValue([
    round.id,
    campaignId,
    userRefHash,
    moralCluster,
    signalType,
    normalizedStrengthBps,
    createdAt,
  ]);

  return {
    ok: true,
    id: `mpgf-cg-support-${calcHash.slice(7, 19)}`,
    roundId: round.id,
    campaignId,
    userRefHash,
    moralCluster,
    signalType,
    strengthBps: normalizedStrengthBps,
    privateByDefault: true,
    countsForCommonGround: signalType !== "dissent_review_requested",
    noGlobalMoralRanking: true,
    createdAt,
    calcHash,
  };
}

export function createMpgfPublicGoodsSupportSignal({
  round = demoMpgfAssuranceRound,
  campaignId,
  userRef,
  moralCluster,
  signalType,
  strengthBps,
  createdAt = "2026-05-31T12:00:00.000Z",
}: {
  round?: MpgfPublicGoodsRound;
  campaignId: string;
  userRef: string;
  moralCluster: MpgfPublicGoodsMoralCluster;
  signalType: MpgfPublicGoodsSupportSignalType;
  strengthBps: number;
  createdAt?: string;
}) {
  if (!userRef.trim()) {
    throw new Error("MPGF CG-VQAF support signals require a private user reference.");
  }

  if (!demoMpgfPublicGoodsCampaigns.some((campaign) => campaign.id === campaignId || campaign.slug === campaignId)) {
    throw new Error("MPGF CG-VQAF support signal targets an unknown campaign.");
  }

  return normalizeSignal({
    round,
    campaignId,
    userRef,
    moralCluster,
    signalType,
    strengthBps,
    createdAt,
  });
}

function defaultSupportSignals(round = demoMpgfAssuranceRound) {
  return demoSupportSignals.map((signal) => normalizeSignal({
    round,
    campaignId: signal.campaignId,
    userRef: signal.userRef,
    moralCluster: signal.moralCluster,
    signalType: signal.signalType,
    strengthBps: signal.strengthBps,
    createdAt: "2026-05-31T12:00:00.000Z",
  }));
}

function commonGroundStats(campaignId: string, supportSignals: MpgfPublicGoodsSupportSignal[]) {
  const relevant = supportSignals.filter((signal) => signal.campaignId === campaignId);
  const supportive = relevant.filter((signal) => signal.countsForCommonGround);
  const weak = relevant.filter((signal) => signal.signalType === "weak_common_ground_support");
  const dissent = relevant.filter((signal) => signal.signalType === "dissent_review_requested");
  const moralClusterCount = new Set(supportive.map((signal) => signal.moralCluster)).size;
  const strengthSum = supportive.reduce((sum, signal) => sum + signal.strengthBps, 0);
  const supportAverage = supportive.length ? strengthSum / supportive.length : 0;
  const clusterBreadthBps = Math.min(10_000, moralClusterCount * 2_500);
  const dissentPenaltyBps = Math.min(4_000, dissent.length * 1_000);

  return {
    commonGroundSignalCount: supportive.length,
    weakCommonGroundSignalCount: weak.length,
    dissentSignalCount: dissent.length,
    moralClusterCount,
    commonGroundScoreBps: clampBps(Math.floor((supportAverage + clusterBreadthBps) / 2) - dissentPenaltyBps),
  };
}

function solveCapitalConstrainedLambda(items: Array<{ qSignalCents: number; bonusCapCents: number }>, budgetCents: number) {
  const budget = Math.max(0, Math.floor(budgetCents));
  const active = items.filter((item) => item.qSignalCents > 0 && item.bonusCapCents > 0);

  if (!active.length || budget <= 0) {
    return 0;
  }

  const totalCap = active.reduce((sum, item) => sum + item.bonusCapCents, 0);

  if (totalCap <= budget) {
    return Math.max(...active.map((item) => item.bonusCapCents / item.qSignalCents));
  }

  let low = 0;
  let high = 1;
  const allocationAt = (lambda: number) =>
    active.reduce((sum, item) => sum + Math.min(item.bonusCapCents, lambda * item.qSignalCents), 0);

  while (allocationAt(high) < budget) {
    high *= 2;
  }

  for (let index = 0; index < 64; index += 1) {
    const mid = (low + high) / 2;

    if (allocationAt(mid) > budget) {
      high = mid;
    } else {
      low = mid;
    }
  }

  return low;
}

function allocateCapitalConstrainedBonus(
  items: Array<{ campaignId: string; qSignalCents: number; bonusCapCents: number }>,
  budgetCents: number,
  lambda: number,
) {
  const budget = Math.max(0, Math.floor(budgetCents));
  const rows = items.map((item) => {
    const exact = Math.min(item.bonusCapCents, lambda * item.qSignalCents);

    return {
      ...item,
      floor: Math.floor(exact),
      remainder: exact - Math.floor(exact),
    };
  });
  const allocations = new Map(rows.map((row) => [row.campaignId, row.floor]));
  const assigned = rows.reduce((sum, row) => sum + row.floor, 0);
  const remaining = Math.max(0, budget - assigned);

  for (const row of [...rows]
    .filter((candidate) => candidate.floor < candidate.bonusCapCents)
    .sort((left, right) => right.remainder - left.remainder || left.campaignId.localeCompare(right.campaignId))
    .slice(0, remaining)) {
    allocations.set(row.campaignId, (allocations.get(row.campaignId) ?? 0) + 1);
  }

  return allocations;
}

export function buildMpgfPublicGoodsCgVqafReport({
  campaigns = demoMpgfPublicGoodsCampaigns,
  pledges = demoMpgfAssurancePledges,
  round = demoMpgfAssuranceRound,
  matchPool = demoMpgfMatchPool,
  supportSignals = defaultSupportSignals(round),
  now = new Date("2026-05-29T12:00:00.000Z"),
}: {
  campaigns?: MpgfPublicGoodsCampaign[];
  pledges?: MpgfPublicGoodsPledge[];
  round?: MpgfPublicGoodsRound;
  matchPool?: MpgfPublicGoodsMatchPool;
  supportSignals?: MpgfPublicGoodsSupportSignal[];
  now?: Date;
} = {}): MpgfPublicGoodsCgVqafReport {
  const baseMatchReserveCents = Math.max(0, matchPool.budgetCents - matchPool.qfBonusCents);
  const statuses = new Map(campaigns.map((campaign) => [
    campaign.id,
    getMpgfCampaignAssuranceStatus(campaign, pledges, now),
  ]));
  const payableCampaigns = campaigns.filter((campaign) => statuses.get(campaign.id)?.status === "payable");
  const baseMatchRaw = new Map(payableCampaigns.map((campaign) => {
    const directCents = statuses.get(campaign.id)?.directEligibleCents ?? 0;

    return [
      campaign.id,
      Math.min(directCents, Math.floor(directCents * matchPool.baseMatchRatio)),
    ];
  }));
  const baseMatchByCampaign = distributeIntegerBudget(
    payableCampaigns,
    Math.min(baseMatchReserveCents, [...baseMatchRaw.values()].reduce((sum, amount) => sum + amount, 0)),
    (campaign) => baseMatchRaw.get(campaign.id) ?? 0,
    (campaign) => campaign.id,
  );
  const bonusInputs = payableCampaigns.map((campaign) => {
    const status = statuses.get(campaign.id);
    const contributions = eligibleWeightedContributions(campaign.id, pledges);
    const directCents = status?.directEligibleCents ?? 0;

    return {
      campaignId: campaign.id,
      qSignalCents: qSignalCents(contributions),
      bonusCapCents: Math.floor(directCents * round.qfCapMultiple),
    };
  });
  const lambda = solveCapitalConstrainedLambda(bonusInputs, round.qfEnabled ? matchPool.qfBonusCents : 0);
  const bonusByCampaign = allocateCapitalConstrainedBonus(
    bonusInputs,
    round.qfEnabled ? matchPool.qfBonusCents : 0,
    lambda,
  );
  const rows = campaigns.map((campaign) => {
    const status = statuses.get(campaign.id) ?? getMpgfCampaignAssuranceStatus(campaign, pledges, now);
    const contributions = eligibleWeightedContributions(campaign.id, pledges);
    const qSignal = status.status === "payable" ? qSignalCents(contributions) : 0;
    const baseMatchCents = baseMatchByCampaign.get(campaign.id) ?? 0;
    const bonusCapCents = status.status === "payable" ? Math.floor(status.directEligibleCents * round.qfCapMultiple) : 0;
    const bonusCents = bonusByCampaign.get(campaign.id) ?? 0;
    const finalPayoutCents = status.status === "payable"
      ? status.directEligibleCents + baseMatchCents + bonusCents
      : 0;
    const stats = commonGroundStats(campaign.id, supportSignals);
    const calculationHash = hashValue([
      round.id,
      campaign.id,
      status.status,
      status.directEligibleCents,
      status.verifiedSupporterCount,
      qSignal,
      baseMatchCents,
      bonusCapCents,
      bonusCents,
      finalPayoutCents,
      stats,
    ]);

    return {
      campaignId: campaign.id,
      status: status.status,
      directCents: status.directEligibleCents,
      verifiedSupporterCount: status.verifiedSupporterCount,
      qSignalCents: qSignal,
      baseMatchCents,
      bonusCapCents,
      bonusCents,
      finalPayoutCents,
      commonGroundSignalCount: stats.commonGroundSignalCount,
      weakCommonGroundSignalCount: stats.weakCommonGroundSignalCount,
      dissentSignalCount: stats.dissentSignalCount,
      moralClusterCount: stats.moralClusterCount,
      commonGroundScoreBps: stats.commonGroundScoreBps,
      blockers: status.blockers,
      calculationHash,
    };
  });
  const calcHash = hashValue([
    round.id,
    MPGF_PUBLIC_GOODS_CG_VQAF_POLICY,
    lambda,
    rows.map((row) => [
      row.campaignId,
      row.directCents,
      row.qSignalCents,
      row.baseMatchCents,
      row.bonusCents,
      row.commonGroundScoreBps,
      row.calculationHash,
    ]),
  ]);

  return {
    ok: true,
    roundId: round.id,
    policy: MPGF_PUBLIC_GOODS_CG_VQAF_POLICY,
    privacyPolicy: MPGF_PUBLIC_GOODS_CG_VQAF_PRIVACY_POLICY,
    formulaVersion: "cg_vqaf_capital_constrained_qf_v1",
    noGlobalMoralRanking: true,
    ranksCoordinatabilityOnly: true,
    parametersLockedBeforeRoundOpen: true,
    lambda: Number(lambda.toFixed(12)),
    baseMatchReserveCents,
    qfBonusBudgetCents: round.qfEnabled ? matchPool.qfBonusCents : 0,
    baseMatchAllocatedCents: rows.reduce((sum, row) => sum + row.baseMatchCents, 0),
    qfBonusAllocatedCents: rows.reduce((sum, row) => sum + row.bonusCents, 0),
    totalDirectCents: rows.reduce((sum, row) => sum + (row.status === "payable" ? row.directCents : 0), 0),
    finalPayoutCents: rows.reduce((sum, row) => sum + row.finalPayoutCents, 0),
    supportSignalsSuppressed: true,
    rows,
    calcHash,
  };
}

export function getMpgfPublicGoodsCgVqafReportApi(roundId: string = demoMpgfAssuranceRound.id) {
  if (roundId !== demoMpgfAssuranceRound.id) {
    return null;
  }

  return buildMpgfPublicGoodsCgVqafReport();
}

export function getMpgfPublicGoodsSupportSignalContractApi(roundId: string = demoMpgfAssuranceRound.id) {
  if (roundId !== demoMpgfAssuranceRound.id) {
    return null;
  }

  return {
    ok: true,
    roundId,
    policy: MPGF_PUBLIC_GOODS_CG_VQAF_POLICY,
    privacyPolicy: MPGF_PUBLIC_GOODS_CG_VQAF_PRIVACY_POLICY,
    supportSignalPath: `/api/mpgf/rounds/${roundId}/support-signals`,
    cgVqafReportPath: `/api/mpgf/rounds/${roundId}/cg-vqaf`,
    privateByDefault: true,
    publicAggregationOnly: true,
    rawSupportReasonsExcluded: true,
    noGlobalMoralRanking: true,
    ranksCoordinatabilityOnly: true,
    signalOptions: MPGF_PUBLIC_GOODS_SUPPORT_SIGNAL_OPTIONS,
    moralClusterOptions: MPGF_PUBLIC_GOODS_MORAL_CLUSTER_OPTIONS,
    collectiveActionStates: MPGF_PUBLIC_GOODS_COLLECTIVE_ACTION_STATES,
  };
}
