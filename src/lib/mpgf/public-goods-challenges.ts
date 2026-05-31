import { createHash } from "node:crypto";

import { demoMpgfAssuranceRound, demoMpgfPublicGoodsCampaigns } from "./data";

export const MPGF_PUBLIC_GOODS_CHALLENGE_POLICY =
  "challenge_windows_pause_unreleased_milestones_without_authorizing_payouts";

export interface MpgfPublicGoodsChallenge {
  ok: true;
  id: string;
  roundId: string;
  campaignId: string;
  challengerRefHash: string;
  reasonCode:
    | "destination_evidence_disputed"
    | "identity_or_sybil_review"
    | "coordination_cluster_review"
    | "threat_baseline_review"
    | "other_reviewable_claim";
  publicSummary: string;
  status: "opened";
  pausesUnreleasedMilestones: true;
  finalPayoutAuthorized: false;
  openedAt: string;
  calcHash: string;
}

function hashValue(value: unknown) {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

function reasonCode(value: unknown): MpgfPublicGoodsChallenge["reasonCode"] {
  return value === "destination_evidence_disputed" ||
    value === "identity_or_sybil_review" ||
    value === "coordination_cluster_review" ||
    value === "threat_baseline_review"
    ? value
    : "other_reviewable_claim";
}

export function createMpgfPublicGoodsChallenge({
  roundId = demoMpgfAssuranceRound.id,
  campaignId,
  challengerId,
  reason,
  publicSummary,
  openedAt = new Date("2026-05-31T12:00:00.000Z").toISOString(),
}: {
  roundId?: string;
  campaignId: string;
  challengerId: string;
  reason?: unknown;
  publicSummary?: string;
  openedAt?: string;
}): MpgfPublicGoodsChallenge {
  if (roundId !== demoMpgfAssuranceRound.id) {
    throw new Error("MPGF challenge targets an unknown round.");
  }

  const campaign = demoMpgfPublicGoodsCampaigns.find(
    (candidate) => candidate.id === campaignId || candidate.slug === campaignId,
  );

  if (!campaign) {
    throw new Error("MPGF challenge targets an unknown campaign.");
  }

  if (!challengerId.trim()) {
    throw new Error("MPGF challenges require an authenticated challenger.");
  }

  const challengerRefHash = hashValue(["mpgf-challenge-challenger", challengerId]);
  const normalizedReasonCode = reasonCode(reason);
  const summary = publicSummary?.trim() || "Participant opened a reviewable MPGF challenge.";
  const calcHash = hashValue([
    roundId,
    campaign.id,
    challengerRefHash,
    normalizedReasonCode,
    summary,
    openedAt,
  ]);

  return {
    ok: true,
    id: `mpgf-challenge-${calcHash.slice(7, 19)}`,
    roundId,
    campaignId: campaign.id,
    challengerRefHash,
    reasonCode: normalizedReasonCode,
    publicSummary: summary,
    status: "opened",
    pausesUnreleasedMilestones: true,
    finalPayoutAuthorized: false,
    openedAt,
    calcHash,
  };
}
