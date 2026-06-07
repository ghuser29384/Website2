import { createHash } from "node:crypto";

import type { MpgfPublicGoodsCoalitionRoutingReport } from "./public-goods-coalition-routing";

export const MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_PREVIEW_POLICY =
  "common_ground_budget_preview_no_capture_v1";

export const MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_CHOICE_POLICY =
  "participant_surplus_confirmation_required_no_dark_pattern_defaults_v1";

export const MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_FALLBACK_POLICY =
  "frozen_eligible_set_then_carry_forward_release_hold_or_manual_review_v1";

export type MpgfCommonGroundBudgetPeriod = "monthly" | "round_limited";
export type MpgfCommonGroundBudgetBaselineConfidence = "low" | "medium" | "high";
export type MpgfCommonGroundBudgetStance = "strong" | "weak" | "dissent" | "abstain";
export type MpgfCommonGroundBudgetFallbackRule = "carry_forward" | "reroute" | "release_hold";
export type MpgfCommonGroundBudgetUnroutablePolicy = "carry_forward" | "release_hold" | "manual_review";
export type MpgfCommonGroundBudgetActivationState =
  | "ready_for_confirmation"
  | "preview_only_confirmation_required"
  | "blocked";

export interface MpgfCommonGroundBudgetProject {
  id: string;
  title: string;
  thresholdAmountCents: number;
  thresholdSupporters: number;
}

export interface MpgfCommonGroundBudgetStanceInput {
  campaignId: string;
  stance: MpgfCommonGroundBudgetStance;
  maxAllocCents?: number | null;
  maxAllocPctBps?: number | null;
  rankOrder?: number | null;
  redactedNote?: string | null;
}

export interface MpgfCommonGroundBudgetPreviewInput {
  roundId: string;
  roundLockTime: string;
  projects: MpgfCommonGroundBudgetProject[];
  coalitionRouting: MpgfPublicGoodsCoalitionRoutingReport;
  budgetPeriod?: MpgfCommonGroundBudgetPeriod;
  monthlyBudgetCents?: number | null;
  roundBudgetCents?: number | null;
  settlementCurrency?: string | null;
  defaultAllocationBaseline?: string | null;
  baselineConfidenceLevel?: MpgfCommonGroundBudgetBaselineConfidence | null;
  baselineConfidenceRationale?: string | null;
  participantSurplusConfirmed?: boolean;
  projectSetChangePolicy?: "require_reconfirmation" | "allow_if_matches_preapproved_policy";
  fallbackRule?: MpgfCommonGroundBudgetFallbackRule;
  unroutableBudgetPolicy?: MpgfCommonGroundBudgetUnroutablePolicy;
  stances?: MpgfCommonGroundBudgetStanceInput[];
}

export interface MpgfCommonGroundBudgetPreviewRow {
  campaignId: string;
  title: string;
  stance: MpgfCommonGroundBudgetStance;
  rankOrder: number;
  maxAllocCents: number;
  maxAllocPctBps: number;
  projectedAllocationCents: number;
  allocationState: "currently_routed" | "pending_threshold" | "waiting_for_review" | "blocked" | "not_routed";
  candidateStatus: string;
  hardGateStatus: string;
  activeSupporterCount: number;
  activeClusterCount: number;
  amountGapCents: number;
  supporterGap: number;
  clusterGap: number;
  pivotalAction: string;
}

export interface MpgfCommonGroundBudgetPreview {
  ok: true;
  policy: typeof MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_PREVIEW_POLICY;
  choiceArchitecturePolicy: typeof MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_CHOICE_POLICY;
  fallbackPolicy: typeof MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_FALLBACK_POLICY;
  roundId: string;
  releaseStage: "sandbox_calculation";
  paymentCaptureAllowed: false;
  stateMutation: "none_preview_only";
  participantSurplusConfirmationRequired: true;
  participantSurplusConfirmed: boolean;
  activationState: MpgfCommonGroundBudgetActivationState;
  userFacingBlockers: Array<{
    reasonCategory: string;
    nextAction: string;
    moneyOrObligationsAffected: false;
    appealOrCorrectionPath: string | null;
  }>;
  budgetPeriod: MpgfCommonGroundBudgetPeriod;
  settlementCurrency: "usd";
  maximumBudgetCents: number;
  defaultAllocationBaseline: string;
  baselineConfidenceLevel: MpgfCommonGroundBudgetBaselineConfidence;
  baselineConfidenceRationale: string;
  eligibleProjectSetHash: string;
  eligiblePoolSetHash: string;
  projectSetChangePolicy: "require_reconfirmation" | "allow_if_matches_preapproved_policy";
  fallbackRule: MpgfCommonGroundBudgetFallbackRule;
  fallbackEligibleProjectSetHash: string;
  unroutableBudgetPolicy: MpgfCommonGroundBudgetUnroutablePolicy;
  roundLockConfirmationRequired: true;
  cancelUntil: string;
  termsSnapshotHash: string;
  participantConfirmationHash: string | null;
  tradeClassification: "moral_public_good_coalition";
  noGlobalMoralRanking: true;
  moralReputationAffectsAllocationPower: false;
  eligibleProjectCount: number;
  routedAllocationCents: number;
  pendingThresholdAllocationCents: number;
  blockedAllocationCents: number;
  unroutableBudgetCents: number;
  rows: MpgfCommonGroundBudgetPreviewRow[];
  calcHash: string;
}

function hashValue(value: unknown) {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

function normalizeCents(value: number | null | undefined, fallback: number) {
  return Number.isFinite(value) && Number(value) > 0 ? Math.floor(Number(value)) : fallback;
}

function normalizeBps(value: number | null | undefined, fallback: number) {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.min(10_000, Math.floor(Number(value))));
}

function compactText(value: string | null | undefined, fallback: string) {
  const compact = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";

  return (compact || fallback).slice(0, 700);
}

function normalizeBudgetPeriod(value: MpgfCommonGroundBudgetPeriod | undefined) {
  return value === "round_limited" ? "round_limited" : "monthly";
}

function normalizeBaselineConfidence(value: MpgfCommonGroundBudgetBaselineConfidence | null | undefined) {
  if (value === "low" || value === "high") {
    return value;
  }

  return "medium";
}

function normalizeFallbackRule(value: MpgfCommonGroundBudgetFallbackRule | undefined) {
  return value === "reroute" || value === "release_hold" ? value : "carry_forward";
}

function normalizeUnroutablePolicy(value: MpgfCommonGroundBudgetUnroutablePolicy | undefined) {
  return value === "release_hold" || value === "manual_review" ? value : "carry_forward";
}

function normalizeProjectSetChangePolicy(value: MpgfCommonGroundBudgetPreviewInput["projectSetChangePolicy"]) {
  return value === "allow_if_matches_preapproved_policy"
    ? "allow_if_matches_preapproved_policy"
    : "require_reconfirmation";
}

function stanceWeight(stance: MpgfCommonGroundBudgetStance) {
  if (stance === "strong") {
    return 10_000;
  }

  if (stance === "weak") {
    return 6_000;
  }

  return 0;
}

function allocationStateFor(
  row: Omit<MpgfCommonGroundBudgetPreviewRow, "allocationState" | "pivotalAction">,
): MpgfCommonGroundBudgetPreviewRow["allocationState"] {
  if (row.stance === "dissent" || row.stance === "abstain" || row.projectedAllocationCents === 0) {
    return "not_routed";
  }

  if (row.hardGateStatus === "blocked") {
    return "blocked";
  }

  if (row.hardGateStatus !== "passed") {
    return "waiting_for_review";
  }

  return row.candidateStatus === "threshold_feasible" ? "currently_routed" : "pending_threshold";
}

function pivotalActionFor(row: Omit<MpgfCommonGroundBudgetPreviewRow, "allocationState" | "pivotalAction">) {
  if (row.stance === "dissent") {
    return "Open or wait for review before routing budget.";
  }

  if (row.stance === "abstain") {
    return "No budget routes to this project.";
  }

  if (row.hardGateStatus === "blocked") {
    return "Choose another eligible project or use the fallback policy.";
  }

  if (row.hardGateStatus !== "passed") {
    return "Wait for reviewer approval before any routed allocation can count.";
  }

  if (row.candidateStatus === "threshold_feasible") {
    return "Confirm the budget preview to join this reviewed round.";
  }

  if (row.clusterGap > 0 || row.supporterGap > 0) {
    return "Copy a user-initiated invite link or wait for broader verified support.";
  }

  return "Add budget or wait for the next batch calculation.";
}

function defaultStances(projects: MpgfCommonGroundBudgetProject[]) {
  return projects.map((project, index): MpgfCommonGroundBudgetStanceInput => ({
    campaignId: project.id,
    stance: index === 0 ? "weak" : "abstain",
    maxAllocPctBps: index === 0 ? 10_000 : 0,
    rankOrder: index + 1,
  }));
}

export function buildMpgfCommonGroundBudgetPreview(
  input: MpgfCommonGroundBudgetPreviewInput,
): MpgfCommonGroundBudgetPreview {
  const budgetPeriod = normalizeBudgetPeriod(input.budgetPeriod);
  const maximumBudgetCents = normalizeCents(
    budgetPeriod === "monthly" ? input.monthlyBudgetCents : input.roundBudgetCents,
    2_500,
  );
  const projectSetChangePolicy = normalizeProjectSetChangePolicy(input.projectSetChangePolicy);
  const fallbackRule = normalizeFallbackRule(input.fallbackRule);
  const unroutableBudgetPolicy = normalizeUnroutablePolicy(input.unroutableBudgetPolicy);
  const baselineConfidenceLevel = normalizeBaselineConfidence(input.baselineConfidenceLevel);
  const projectsById = new Map(input.projects.map((project) => [project.id, project]));
  const coalitionRowsById = new Map(input.coalitionRouting.rows.map((row) => [row.campaignId, row]));
  const stanceInputs = input.stances?.length ? input.stances : defaultStances(input.projects);
  const normalizedStances = stanceInputs
    .filter((stance) => projectsById.has(stance.campaignId))
    .map((stance, index) => ({
      campaignId: stance.campaignId,
      stance: stance.stance,
      maxAllocCents: normalizeCents(stance.maxAllocCents ?? null, maximumBudgetCents),
      maxAllocPctBps: normalizeBps(stance.maxAllocPctBps ?? null, stance.stance === "abstain" ? 0 : 10_000),
      rankOrder: Number.isFinite(stance.rankOrder) && Number(stance.rankOrder) > 0
        ? Math.floor(Number(stance.rankOrder))
        : index + 1,
      redactedNoteHash: stance.redactedNote ? hashValue(["mpgf-common-ground-redacted-note", stance.redactedNote]) : null,
    }))
    .sort((left, right) => left.rankOrder - right.rankOrder || left.campaignId.localeCompare(right.campaignId));
  const eligibleProjectIds = normalizedStances
    .filter((stance) => stance.stance === "strong" || stance.stance === "weak")
    .map((stance) => stance.campaignId)
    .sort();
  const eligibleProjectSetHash = hashValue([
    input.roundId,
    "eligible-project-set",
    eligibleProjectIds,
    projectSetChangePolicy,
  ]);
  const fallbackEligibleProjectSetHash = hashValue([
    input.roundId,
    "fallback-eligible-project-set",
    eligibleProjectIds,
    fallbackRule,
    unroutableBudgetPolicy,
  ]);
  const eligiblePoolSetHash = hashValue([input.roundId, "eligible-pool-set", "project_pool_only_v1"]);
  const budgetableStances = normalizedStances.filter((stance) => stanceWeight(stance.stance) > 0);
  const totalWeight = budgetableStances.reduce((sum, stance) => sum + stanceWeight(stance.stance), 0);
  const projectedAllocations = new Map<string, number>();
  let initiallyAllocatedCents = 0;

  for (const stance of budgetableStances) {
    const pctCapCents = Math.floor((maximumBudgetCents * stance.maxAllocPctBps) / 10_000);
    const capCents = Math.min(stance.maxAllocCents, pctCapCents);
    const weightedShare = totalWeight > 0
      ? Math.floor((maximumBudgetCents * stanceWeight(stance.stance)) / totalWeight)
      : 0;
    const allocationCents = Math.min(capCents, weightedShare);

    projectedAllocations.set(stance.campaignId, allocationCents);
    initiallyAllocatedCents += allocationCents;
  }

  let remainderCents = Math.max(0, maximumBudgetCents - initiallyAllocatedCents);

  for (const stance of budgetableStances) {
    if (remainderCents <= 0) {
      break;
    }

    const pctCapCents = Math.floor((maximumBudgetCents * stance.maxAllocPctBps) / 10_000);
    const capCents = Math.min(stance.maxAllocCents, pctCapCents);
    const current = projectedAllocations.get(stance.campaignId) ?? 0;
    const extra = Math.min(remainderCents, Math.max(0, capCents - current));

    projectedAllocations.set(stance.campaignId, current + extra);
    remainderCents -= extra;
  }

  const rows = normalizedStances.map((stance): MpgfCommonGroundBudgetPreviewRow => {
    const project = projectsById.get(stance.campaignId);
    const coalition = coalitionRowsById.get(stance.campaignId);
    const partial = {
      campaignId: stance.campaignId,
      title: project?.title ?? stance.campaignId,
      stance: stance.stance,
      rankOrder: stance.rankOrder,
      maxAllocCents: stance.maxAllocCents,
      maxAllocPctBps: stance.maxAllocPctBps,
      projectedAllocationCents: projectedAllocations.get(stance.campaignId) ?? 0,
      candidateStatus: coalition?.candidateStatus ?? "hard_gate_pending",
      hardGateStatus: coalition?.hardGateStatus ?? "pending_review",
      activeSupporterCount: coalition?.activeSupporterCount ?? 0,
      activeClusterCount: coalition?.activeClusterCount ?? 0,
      amountGapCents: coalition?.amountGapCents ?? project?.thresholdAmountCents ?? 0,
      supporterGap: coalition?.supporterGap ?? project?.thresholdSupporters ?? 0,
      clusterGap: coalition?.clusterGap ?? input.coalitionRouting.thresholdClusterMin,
    };

    return {
      ...partial,
      allocationState: allocationStateFor(partial),
      pivotalAction: pivotalActionFor(partial),
    };
  });
  const routedAllocationCents = rows
    .filter((row) => row.allocationState === "currently_routed")
    .reduce((sum, row) => sum + row.projectedAllocationCents, 0);
  const pendingThresholdAllocationCents = rows
    .filter((row) => row.allocationState === "pending_threshold" || row.allocationState === "waiting_for_review")
    .reduce((sum, row) => sum + row.projectedAllocationCents, 0);
  const blockedAllocationCents = rows
    .filter((row) => row.allocationState === "blocked")
    .reduce((sum, row) => sum + row.projectedAllocationCents, 0);
  const allocatedCents = rows.reduce((sum, row) => sum + row.projectedAllocationCents, 0);
  const userFacingBlockers = [];

  if (!input.participantSurplusConfirmed) {
    userFacingBlockers.push({
      reasonCategory: "user_action_needed",
      nextAction: "Confirm that this routing is acceptable relative to your stated default allocation.",
      moneyOrObligationsAffected: false as const,
      appealOrCorrectionPath: null,
    });
  }

  if (blockedAllocationCents > 0) {
    userFacingBlockers.push({
      reasonCategory: "safety_or_anti_threat",
      nextAction: "Remove blocked projects or wait for reviewer correction before relying on the preview.",
      moneyOrObligationsAffected: false as const,
      appealOrCorrectionPath: "/mpgf/governance",
    });
  }

  if (!eligibleProjectIds.length) {
    userFacingBlockers.push({
      reasonCategory: "user_action_needed",
      nextAction: "Mark at least one reviewed project as strong or weak common-ground support.",
      moneyOrObligationsAffected: false as const,
      appealOrCorrectionPath: null,
    });
  }

  const termsSnapshotHash = hashValue([
    input.roundId,
    budgetPeriod,
    maximumBudgetCents,
    "usd",
    input.defaultAllocationBaseline,
    baselineConfidenceLevel,
    eligibleProjectSetHash,
    fallbackRule,
    unroutableBudgetPolicy,
    input.roundLockTime,
    normalizedStances,
    MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_PREVIEW_POLICY,
  ]);

  return {
    ok: true,
    policy: MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_PREVIEW_POLICY,
    choiceArchitecturePolicy: MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_CHOICE_POLICY,
    fallbackPolicy: MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_FALLBACK_POLICY,
    roundId: input.roundId,
    releaseStage: "sandbox_calculation",
    paymentCaptureAllowed: false,
    stateMutation: "none_preview_only",
    participantSurplusConfirmationRequired: true,
    participantSurplusConfirmed: Boolean(input.participantSurplusConfirmed),
    activationState: userFacingBlockers.length
      ? (blockedAllocationCents > 0 ? "blocked" : "preview_only_confirmation_required")
      : "ready_for_confirmation",
    userFacingBlockers,
    budgetPeriod,
    settlementCurrency: "usd",
    maximumBudgetCents,
    defaultAllocationBaseline: compactText(
      input.defaultAllocationBaseline,
      "I would otherwise hold this budget or donate through my usual default allocation.",
    ),
    baselineConfidenceLevel,
    baselineConfidenceRationale: compactText(
      input.baselineConfidenceRationale,
      "Self-attested preview only; confidence must be reviewed before reliance-bearing use.",
    ),
    eligibleProjectSetHash,
    eligiblePoolSetHash,
    projectSetChangePolicy,
    fallbackRule,
    fallbackEligibleProjectSetHash,
    unroutableBudgetPolicy,
    roundLockConfirmationRequired: true,
    cancelUntil: input.roundLockTime,
    termsSnapshotHash,
    participantConfirmationHash: input.participantSurplusConfirmed
      ? hashValue(["participant-confirmation", termsSnapshotHash, "surplus-confirmed"])
      : null,
    tradeClassification: "moral_public_good_coalition",
    noGlobalMoralRanking: true,
    moralReputationAffectsAllocationPower: false,
    eligibleProjectCount: eligibleProjectIds.length,
    routedAllocationCents,
    pendingThresholdAllocationCents,
    blockedAllocationCents,
    unroutableBudgetCents: Math.max(0, maximumBudgetCents - allocatedCents),
    rows,
    calcHash: hashValue([
      input.roundId,
      termsSnapshotHash,
      rows.map((row) => [
        row.campaignId,
        row.stance,
        row.projectedAllocationCents,
        row.allocationState,
      ]),
    ]),
  };
}
