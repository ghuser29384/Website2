import { createHash } from "node:crypto";

import { demoMpgfAssuranceRound } from "./data";

export const MPGF_PUBLIC_GOODS_GOVERNANCE_BALLOT_POLICY =
  "role_limited_plural_budget_ballots_no_global_moral_ranking";

export const MPGF_PUBLIC_GOODS_GOVERNANCE_BALLOT_PRIVACY_POLICY =
  "public_results_aggregate_only_voter_refs_hashed";

export type MpgfPublicGoodsGovernanceCategory =
  | "global_health"
  | "existential_risk"
  | "animal_welfare"
  | "public_interest_knowledge"
  | "sponsor_reserve";

export interface MpgfPublicGoodsGovernanceBallot {
  ok: true;
  id: string;
  roundId: string;
  voterRefHash: string;
  idempotencyKeyHash: string;
  weights: Array<{
    category: MpgfPublicGoodsGovernanceCategory;
    weightBps: number;
  }>;
  totalWeightBps: number;
  status: "submitted" | "pending_review";
  policy: typeof MPGF_PUBLIC_GOODS_GOVERNANCE_BALLOT_POLICY;
  noMoralRanking: true;
  noTransferableGovernanceWeight: true;
  submittedAt: string;
  calcHash: string;
}

export interface MpgfPublicGoodsGovernanceResults {
  ok: true;
  roundId: string;
  policy: typeof MPGF_PUBLIC_GOODS_GOVERNANCE_BALLOT_POLICY;
  privacyPolicy: typeof MPGF_PUBLIC_GOODS_GOVERNANCE_BALLOT_PRIVACY_POLICY;
  validBallotCount: number;
  suppressedSmallSample: boolean;
  categories: Array<{
    category: MpgfPublicGoodsGovernanceCategory;
    aggregateWeightBps: number;
    publicLabel: string;
  }>;
  noMoralRanking: true;
  noTransferableGovernanceWeight: true;
  calcHash: string;
}

const categories: Array<{ category: MpgfPublicGoodsGovernanceCategory; publicLabel: string }> = [
  { category: "global_health", publicLabel: "Global health and basic needs" },
  { category: "existential_risk", publicLabel: "Existential-risk resilience" },
  { category: "animal_welfare", publicLabel: "Animal welfare transition" },
  { category: "public_interest_knowledge", publicLabel: "Public-interest knowledge" },
  { category: "sponsor_reserve", publicLabel: "Unallocated sponsor reserve" },
];

const demoGovernanceWeights: Array<Record<MpgfPublicGoodsGovernanceCategory, number>> = [
  {
    global_health: 3_400,
    existential_risk: 2_100,
    animal_welfare: 1_800,
    public_interest_knowledge: 1_700,
    sponsor_reserve: 1_000,
  },
  {
    global_health: 2_300,
    existential_risk: 3_000,
    animal_welfare: 1_900,
    public_interest_knowledge: 1_800,
    sponsor_reserve: 1_000,
  },
  {
    global_health: 2_700,
    existential_risk: 2_300,
    animal_welfare: 2_500,
    public_interest_knowledge: 1_500,
    sponsor_reserve: 1_000,
  },
];

function hashValue(value: unknown) {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

function clampBps(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.min(10_000, Math.floor(value))) : 0;
}

function normalizeWeights(input: Partial<Record<MpgfPublicGoodsGovernanceCategory, number>>) {
  const weights = categories.map(({ category }) => ({
    category,
    weightBps: clampBps(Number(input[category] ?? 0)),
  }));
  const total = weights.reduce((sum, weight) => sum + weight.weightBps, 0);

  if (total <= 10_000) {
    return weights;
  }

  return weights.map((weight) => ({
    ...weight,
    weightBps: Math.floor((weight.weightBps * 10_000) / total),
  }));
}

export function createMpgfPublicGoodsGovernanceBallot({
  roundId = demoMpgfAssuranceRound.id,
  voterId,
  weightsByCategory,
  idempotencyKey,
  submittedAt = new Date("2026-05-31T12:00:00.000Z").toISOString(),
}: {
  roundId?: string;
  voterId: string;
  weightsByCategory: Partial<Record<MpgfPublicGoodsGovernanceCategory, number>>;
  idempotencyKey?: string;
  submittedAt?: string;
}): MpgfPublicGoodsGovernanceBallot {
  if (roundId !== demoMpgfAssuranceRound.id) {
    throw new Error("MPGF governance ballot targets an unknown round.");
  }

  if (!voterId.trim()) {
    throw new Error("MPGF governance ballots require an authenticated voter.");
  }

  const weights = normalizeWeights(weightsByCategory);
  const totalWeightBps = weights.reduce((sum, weight) => sum + weight.weightBps, 0);

  if (totalWeightBps <= 0) {
    throw new Error("MPGF governance ballots require at least one positive category weight.");
  }

  const stableKey = idempotencyKey?.trim() || `${roundId}:${voterId}:${JSON.stringify(weights)}`;
  const voterRefHash = hashValue(["mpgf-governance-voter", voterId]);
  const idempotencyKeyHash = hashValue(["mpgf-governance-idempotency", stableKey]);
  const id = `mpgf-governance-ballot-${idempotencyKeyHash.slice(7, 19)}`;
  const calcHash = hashValue([
    roundId,
    voterRefHash,
    idempotencyKeyHash,
    weights.map((weight) => [weight.category, weight.weightBps]),
    totalWeightBps,
  ]);

  return {
    ok: true,
    id,
    roundId,
    voterRefHash,
    idempotencyKeyHash,
    weights,
    totalWeightBps,
    status: "submitted",
    policy: MPGF_PUBLIC_GOODS_GOVERNANCE_BALLOT_POLICY,
    noMoralRanking: true,
    noTransferableGovernanceWeight: true,
    submittedAt,
    calcHash,
  };
}

export function getMpgfPublicGoodsGovernanceResultsApi(roundId: string = demoMpgfAssuranceRound.id): MpgfPublicGoodsGovernanceResults | null {
  if (roundId !== demoMpgfAssuranceRound.id) {
    return null;
  }

  const totals = new Map<MpgfPublicGoodsGovernanceCategory, number>(
    categories.map(({ category }) => [category, 0]),
  );

  for (const ballot of demoGovernanceWeights) {
    for (const { category } of categories) {
      totals.set(category, (totals.get(category) ?? 0) + clampBps(ballot[category]));
    }
  }

  const categoriesResult = categories.map(({ category, publicLabel }) => ({
    category,
    publicLabel,
    aggregateWeightBps: Math.floor((totals.get(category) ?? 0) / demoGovernanceWeights.length),
  }));
  const calcHash = hashValue([
    roundId,
    categoriesResult.map((category) => [category.category, category.aggregateWeightBps]),
    demoGovernanceWeights.length,
  ]);

  return {
    ok: true,
    roundId,
    policy: MPGF_PUBLIC_GOODS_GOVERNANCE_BALLOT_POLICY,
    privacyPolicy: MPGF_PUBLIC_GOODS_GOVERNANCE_BALLOT_PRIVACY_POLICY,
    validBallotCount: demoGovernanceWeights.length,
    suppressedSmallSample: demoGovernanceWeights.length < 3,
    categories: categoriesResult,
    noMoralRanking: true,
    noTransferableGovernanceWeight: true,
    calcHash,
  };
}
