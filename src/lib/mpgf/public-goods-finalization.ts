import { createHash } from "node:crypto";

import {
  demoMpgfAssurancePledges,
  demoMpgfAssuranceRound,
  demoMpgfPublicGoodsCampaigns,
} from "./data";
import { allocateMpgfAssuranceRound } from "./mechanism";
import { buildMpgfPublicGoodsAllocationSourceProofMap } from "./public-goods-allocation-results";
import { buildMpgfPublicGoodsMilestoneSchedule } from "./public-goods-milestones";
import type {
  MpgfPublicGoodsCampaign,
  MpgfPublicGoodsPledge,
  MpgfPublicGoodsRound,
  MpgfPublicGoodsRoundAllocation,
} from "./types";

export const MPGF_PUBLIC_GOODS_FINALIZATION_POLICY =
  "deterministic_threshold_base_match_qf_with_coordination_penalties";

export const MPGF_PUBLIC_GOODS_COORDINATION_PRIVACY_POLICY =
  "coordination_flags_publish_cluster_hashes_and_reason_codes_only";

export interface MpgfPublicGoodsCoordinationFlag {
  id: string;
  roundId: string;
  campaignId: string;
  clusterKeyHash: string;
  severity: "watch" | "medium" | "high";
  penaltyBps: number;
  rationaleCodes: string[];
  publicRationale: string;
  createdAt: string;
  appendOnlyHash: string;
}

export interface MpgfPublicGoodsFinalizationRow {
  campaignId: string;
  status: string;
  directEligibleCents: number;
  verifiedSupporterCount: number;
  baseMatchCents: number;
  qfRawCents: number;
  antiCollusionFactorBps: number;
  qfBonusCents: number;
  withheldQfBonusCents: number;
  finalTotalCents: number;
  coordinationFlagCount: number;
  sourceContributionDigest: string;
  proofPath: string;
  calculationHash: string;
  blockers: string[];
}

export interface MpgfPublicGoodsFinalizationReport {
  ok: true;
  roundId: string;
  final: boolean;
  status: "preview" | "finalized";
  policy: typeof MPGF_PUBLIC_GOODS_FINALIZATION_POLICY;
  privacyPolicy: typeof MPGF_PUBLIC_GOODS_COORDINATION_PRIVACY_POLICY;
  baseMatchAllocatedCents: number;
  qfRawAllocatedCents: number;
  qfBonusAllocatedCents: number;
  withheldQfBonusCents: number;
  totalDirectEligibleCents: number;
  finalTotalCents: number;
  coordinationFlags: MpgfPublicGoodsCoordinationFlag[];
  rows: MpgfPublicGoodsFinalizationRow[];
  calcHash: string;
  proofPathRoot: string;
  requiresHumanReviewBeforeIrreversibleStateChange: true;
  finalPayoutAuthorized: false;
}

export interface MpgfPublicGoodsRoundReleasePlan {
  ok: true;
  roundId: string;
  finalizationHash: string;
  releasePolicy: "milestone_gated_partner_release_after_dual_control";
  partnerReleaseAuthorizationRequired: true;
  dualControlRequired: true;
  finalPayoutAuthorized: false;
  releases: Array<{
    campaignId: string;
    milestoneId: string;
    milestoneOrdinal: number;
    releasePct: number;
    sponsorReleaseCents: number;
    releaseAmountCents: number;
    status: "partner_release_pending" | "paused";
    proofPath: string;
  }>;
  calcHash: string;
}

function hashValue(value: unknown) {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

function campaignSlug(campaignId: string, campaigns: MpgfPublicGoodsCampaign[]) {
  return campaigns.find((campaign) => campaign.id === campaignId)?.slug ?? campaignId;
}

function minPenaltyBps(flags: MpgfPublicGoodsCoordinationFlag[]) {
  if (flags.length === 0) {
    return 10_000;
  }

  return Math.max(0, Math.min(...flags.map((flag) => flag.penaltyBps)));
}

export function detectMpgfPublicGoodsCoordinationFlags({
  round = demoMpgfAssuranceRound,
  pledges = demoMpgfAssurancePledges,
  createdAt = "2026-05-31T12:00:00.000Z",
}: {
  round?: MpgfPublicGoodsRound;
  pledges?: MpgfPublicGoodsPledge[];
  createdAt?: string;
} = {}): MpgfPublicGoodsCoordinationFlag[] {
  const campaignIds = [...new Set(pledges.map((pledge) => pledge.campaignId))].sort();
  const flags: MpgfPublicGoodsCoordinationFlag[] = [];

  for (const campaignId of campaignIds) {
    const campaignPledges = pledges.filter((pledge) => pledge.campaignId === campaignId);
    const duplicateOrBlocked = campaignPledges
      .filter((pledge) => pledge.eligibilityState === "duplicate_identity" || pledge.eligibilityState === "blocked")
      .sort((left, right) => left.id.localeCompare(right.id));

    if (duplicateOrBlocked.length === 0) {
      continue;
    }

    const clusterKeyHash = hashValue([
      "mpgf-public-goods-coordination-cluster",
      round.id,
      campaignId,
      duplicateOrBlocked.map((pledge) => [pledge.id, pledge.eligibilityState]),
    ]);
    const severity = duplicateOrBlocked.some((pledge) => pledge.eligibilityState === "duplicate_identity")
      ? "high"
      : "medium";
    const penaltyBps = severity === "high" ? 8_500 : 9_250;
    const rationaleCodes = [...new Set(duplicateOrBlocked.map((pledge) => pledge.eligibilityState))].sort();
    const appendOnlyHash = hashValue([
      round.id,
      campaignId,
      clusterKeyHash,
      severity,
      penaltyBps,
      rationaleCodes,
      createdAt,
    ]);

    flags.push({
      id: `coordination-flag-${appendOnlyHash.slice(7, 19)}`,
      roundId: round.id,
      campaignId,
      clusterKeyHash,
      severity,
      penaltyBps,
      rationaleCodes,
      publicRationale:
        "A privacy-safe coordination review detected duplicate or blocked contribution signals; QF bonus is penalized until review clears the cluster.",
      createdAt,
      appendOnlyHash,
    });
  }

  return flags;
}

export function buildMpgfPublicGoodsFinalizationReport({
  allocation = allocateMpgfAssuranceRound({ now: new Date("2026-05-31T12:00:00.000Z") }),
  campaigns = demoMpgfPublicGoodsCampaigns,
  pledges = demoMpgfAssurancePledges,
  final = false,
}: {
  allocation?: MpgfPublicGoodsRoundAllocation;
  campaigns?: MpgfPublicGoodsCampaign[];
  pledges?: MpgfPublicGoodsPledge[];
  final?: boolean;
} = {}): MpgfPublicGoodsFinalizationReport {
  const coordinationFlags = detectMpgfPublicGoodsCoordinationFlags({ pledges });
  const sourceProofByCampaignId = buildMpgfPublicGoodsAllocationSourceProofMap({ allocation, pledges });
  const rows = allocation.lines.map((line) => {
    const campaignFlags = coordinationFlags.filter((flag) => flag.campaignId === line.campaignId);
    const antiCollusionFactorBps = line.status === "payable" ? minPenaltyBps(campaignFlags) : 10_000;
    const qfRawCents = line.qfBonusCents;
    const qfBonusCents = line.status === "payable"
      ? Math.floor((qfRawCents * antiCollusionFactorBps) / 10_000)
      : 0;
    const withheldQfBonusCents = Math.max(0, qfRawCents - qfBonusCents);
    const sourceProof = sourceProofByCampaignId.get(line.campaignId);
    const proofPath = `/mpgf/pools/${campaignSlug(line.campaignId, campaigns)}`;
    const finalTotalCents = line.status === "payable"
      ? line.directEligibleCents + line.baseMatchCents + qfBonusCents
      : 0;
    const calculationHash = hashValue([
      allocation.roundId,
      line.campaignId,
      line.status,
      line.directEligibleCents,
      line.verifiedSupporterCount,
      line.baseMatchCents,
      qfRawCents,
      antiCollusionFactorBps,
      qfBonusCents,
      finalTotalCents,
      sourceProof?.sourceContributionDigest ?? null,
      campaignFlags.map((flag) => flag.appendOnlyHash),
    ]);

    return {
      campaignId: line.campaignId,
      status: line.status,
      directEligibleCents: line.directEligibleCents,
      verifiedSupporterCount: line.verifiedSupporterCount,
      baseMatchCents: line.baseMatchCents,
      qfRawCents,
      antiCollusionFactorBps,
      qfBonusCents,
      withheldQfBonusCents,
      finalTotalCents,
      coordinationFlagCount: campaignFlags.length,
      sourceContributionDigest: sourceProof?.sourceContributionDigest ?? hashValue([]),
      proofPath,
      calculationHash,
      blockers: campaignFlags.length > 0
        ? [...new Set([...line.blockers, "coordination_penalty_applied"])]
        : line.blockers,
    };
  });
  const calcHash = hashValue([
    allocation.roundId,
    final,
    rows.map((row) => [
      row.campaignId,
      row.directEligibleCents,
      row.baseMatchCents,
      row.qfRawCents,
      row.antiCollusionFactorBps,
      row.qfBonusCents,
      row.finalTotalCents,
      row.calculationHash,
    ]),
    coordinationFlags.map((flag) => flag.appendOnlyHash),
  ]);

  return {
    ok: true,
    roundId: allocation.roundId,
    final,
    status: final ? "finalized" : "preview",
    policy: MPGF_PUBLIC_GOODS_FINALIZATION_POLICY,
    privacyPolicy: MPGF_PUBLIC_GOODS_COORDINATION_PRIVACY_POLICY,
    baseMatchAllocatedCents: rows.reduce((sum, row) => sum + (row.status === "payable" ? row.baseMatchCents : 0), 0),
    qfRawAllocatedCents: rows.reduce((sum, row) => sum + (row.status === "payable" ? row.qfRawCents : 0), 0),
    qfBonusAllocatedCents: rows.reduce((sum, row) => sum + row.qfBonusCents, 0),
    withheldQfBonusCents: rows.reduce((sum, row) => sum + row.withheldQfBonusCents, 0),
    totalDirectEligibleCents: rows.reduce((sum, row) => sum + (row.status === "payable" ? row.directEligibleCents : 0), 0),
    finalTotalCents: rows.reduce((sum, row) => sum + row.finalTotalCents, 0),
    coordinationFlags,
    rows,
    calcHash,
    proofPathRoot: "/api/mpgf/rounds/:roundId/proof",
    requiresHumanReviewBeforeIrreversibleStateChange: true,
    finalPayoutAuthorized: false,
  };
}

export function getMpgfPublicGoodsFinalizationReportApi(roundId: string, final = false) {
  const report = buildMpgfPublicGoodsFinalizationReport({ final });

  if (roundId !== report.roundId) {
    return null;
  }

  return report;
}

export function buildMpgfPublicGoodsRoundReleasePlan({
  finalization = buildMpgfPublicGoodsFinalizationReport({ final: true }),
}: {
  finalization?: MpgfPublicGoodsFinalizationReport;
} = {}): MpgfPublicGoodsRoundReleasePlan {
  const releases = finalization.rows
    .filter((row) => row.status === "payable" && row.finalTotalCents > 0)
    .map((row) => {
      const [milestone] = buildMpgfPublicGoodsMilestoneSchedule({ campaignId: row.campaignId });
      const sponsorReleaseCents = row.baseMatchCents + row.qfBonusCents;
      const releasePct = milestone?.releasePct ?? 40;

      return {
        campaignId: row.campaignId,
        milestoneId: milestone?.id ?? `milestone-${row.campaignId}-1`,
        milestoneOrdinal: milestone?.ordinal ?? 1,
        releasePct,
        sponsorReleaseCents,
        releaseAmountCents: Math.floor((sponsorReleaseCents * releasePct) / 100),
        status: "partner_release_pending" as const,
        proofPath: row.proofPath,
      };
    });
  const calcHash = hashValue([
    finalization.roundId,
    finalization.calcHash,
    releases.map((release) => [
      release.campaignId,
      release.milestoneId,
      release.releasePct,
      release.sponsorReleaseCents,
      release.releaseAmountCents,
    ]),
  ]);

  return {
    ok: true,
    roundId: finalization.roundId,
    finalizationHash: finalization.calcHash,
    releasePolicy: "milestone_gated_partner_release_after_dual_control",
    partnerReleaseAuthorizationRequired: true,
    dualControlRequired: true,
    finalPayoutAuthorized: false,
    releases,
    calcHash,
  };
}

export function getMpgfPublicGoodsRoundReleasePlanApi(roundId: string) {
  const finalization = getMpgfPublicGoodsFinalizationReportApi(roundId, true);

  if (!finalization) {
    return null;
  }

  return buildMpgfPublicGoodsRoundReleasePlan({ finalization });
}
