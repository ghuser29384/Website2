import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createServiceClient } from "@/lib/supabase/server";

import {
  demoMpgfAssurancePledges,
  demoMpgfAssuranceRound,
  demoMpgfMatchPool,
  demoMpgfPublicGoodsCampaigns,
  demoMpgfPublicGoodsPaymentProofs,
  demoMpgfPublicGoodsReviewCases,
  demoMpgfPublicGoodsSubscriptions,
} from "./data";
import {
  allocateMpgfAssuranceRound,
  countMpgfQfContributionCents,
  getMpgfCampaignAssuranceStatus,
  getMpgfPublicGoodsFeatureFlagStatus,
} from "./mechanism";
import type {
  MpgfPublicGoodsAllocationLine,
  MpgfPublicGoodsCampaign,
  MpgfPublicGoodsCampaignReviewStatus,
  MpgfPublicGoodsCaptureMode,
  MpgfPublicGoodsDestinationType,
  MpgfPublicGoodsMatchPool,
  MpgfPublicGoodsPaymentProof,
  MpgfPublicGoodsPledge,
  MpgfPublicGoodsReviewAction,
  MpgfPublicGoodsReviewCase,
  MpgfPublicGoodsReviewReasonCode,
  MpgfPublicGoodsRound,
  MpgfPublicGoodsRoundAllocation,
  MpgfPublicGoodsSubscription,
  MpgfPublicGoodsVisibilityMode,
} from "./types";

type SupabaseServiceAny = ReturnType<typeof createServiceClient> & {
  from: (table: string) => any;
};

export type MpgfPublicGoodsKpiDataSource = "demo_fixture" | "database";

export interface MpgfPublicGoodsKpiAnalyticsEvent {
  event_type: string;
  campaign_id?: string | null;
  event_json?: Record<string, unknown> | null;
  created_at: string;
}

export interface MpgfPublicGoodsFundingExperimentCatalogItem {
  experimentKey: string;
  comparison: string;
  control: string;
  treatment: string;
  primaryMetric: string;
  guardrailMetrics: string[];
  privacyPolicy: "aggregate_assignment_no_raw_private_text";
  noGlobalMoralRanking: true;
}

export interface MpgfPublicGoodsKpiSnapshot {
  generatedAt: string;
  roundId: string;
  matchPoolId: string;
  dataSource: MpgfPublicGoodsKpiDataSource;
  privacyPolicy: "aggregate_only_no_user_or_reason_text";
  coordination: {
    campaignCount: number;
    supportSignalEventCount: number;
    commonGroundSupportSignalEventCount: number;
    dissentReviewSignalEventCount: number;
    supportSignalToPledgeIntentBps: number | null;
    pledgeIntentCount: number;
    campaignViewEventCount: number;
    pledgeIntentEventCount: number;
    eligiblePledgeCount: number;
    verifiedPledgeConversionBps: number | null;
    pageViewToPledgeIntentBps: number | null;
    thresholdClearedCampaignCount: number;
    thresholdClearRateBps: number | null;
    payableCampaignCount: number;
    medianHoursToThreshold: number | null;
  };
  matching: {
    directEligibleCents: number;
    payableDirectEligibleCents: number;
    sponsorPoolCents: number;
    baseMatchAllocatedCents: number;
    qfBonusAllocatedCents: number;
    matchAllocatedCents: number;
    directFundsToMatchMultiplierBps: number | null;
    matchToDirectMultiplierBps: number | null;
    sponsorPoolUtilizationBps: number | null;
  };
  donorEconomics: {
    activeContributionCount: number;
    eligibleContributionCount: number;
    medianGrossContributionCents: number | null;
    medianCapAdjustedCountedContributionCents: number | null;
    campaignConcentrationTopDirectShareBps: number | null;
    campaignConcentrationTopMatchShareBps: number | null;
    netNewFundingSurveyEventCount: number;
    likelyNetNewFundingEventCount: number;
    likelyNetNewFundingShareBps: number | null;
  };
  funding: {
    verifiedDollarsRoutedCents: number;
    verifiedSupporterCountPerWinningCampaign: number | null;
    thresholdClearRateBps: number | null;
    sponsorLeverageRatioBps: number | null;
    autoVerifiedContributionShareBps: number | null;
    autoVerifiedContributionCount: number;
    manualVerifiedContributionCount: number;
    medianHoursFromPledgeToCounted: number | null;
    sponsorPoolRefillRateBps: number | null;
    sponsorPoolMonthlyRefillCents: number;
    reviewSlaAttainmentBps: number | null;
    disputeRateBps: number | null;
    appealOverturnRateBps: number | null;
    donorRetentionIntoNextRoundBps: number | null;
  };
  handoffProof: {
    externalHandoffPledgeCount: number;
    verifiedExternalHandoffProofCount: number;
    externalHandoffCompletionRateBps: number | null;
    verifiedAmountCents: number;
    fundedCampaignCount: number;
    fundedCampaignsWithVerifiedProofCount: number;
    verifiableCompletionShareBps: number | null;
  };
  review: {
    reviewCaseCount: number;
    closedReviewCaseCount: number;
    openReviewCaseCount: number;
    reviewerMedianHoursToClose: number | null;
    disputeCaseCount: number;
    appealCaseCount: number;
    disputeRateBps: number | null;
  };
  safety: {
    excludedPledgeCount: number;
    duplicateOrBlockedPledgeCount: number;
    totalPledgedCents: number;
    eligibleDirectCents: number;
    fraudAdjustedPayoutRatioBps: number | null;
    noCustodyPilot: true;
    rawPrivateTextStored: false;
  };
  recurring: {
    subscriptionCount: number;
    activeSubscriptionCount: number;
    monthlyRunRateCents: number;
    retainedRecurringDonors3MonthBps: number | null;
    retainedRecurringDonors6MonthBps: number | null;
  };
  experimentBacklog: {
    recommendedCount: number;
    activeAssignmentEventCount: number;
    experiments: MpgfPublicGoodsFundingExperimentCatalogItem[];
  };
  rolloutGate: {
    accessMode: "invited_cohort" | "public_beta";
    cohort: string;
    invitedCohortRequired: boolean;
    reviewerTimingSampleReady: boolean;
    thresholdConversionSampleReady: boolean;
    widensPublicAccessAutomatically: false;
    recommendation: "hold_invited_cohort" | "ready_for_public_beta_review";
    blockers: string[];
  };
}

export interface LoadMpgfPublicGoodsKpiSnapshotResult {
  ok: boolean;
  status: "loaded" | "dry_run" | "not_configured";
  snapshot: MpgfPublicGoodsKpiSnapshot;
  warnings: string[];
}

const destinationTypes = ["external_charity", "fiscal_host", "internal_demo_pool", "signed_sponsor_route"] as const;
const reviewStatuses = ["draft", "submitted", "needs_evidence", "challenge_window", "approved", "blocked", "finalized"] as const;
const captureModes = ["external_handoff", "stored_payment_method", "signed_intent"] as const;
const visibilityModes = ["private_amount", "public_supporter", "public_reason"] as const;
const reviewActions = ["approve", "needs_evidence", "block", "challenge", "finalize"] as const;
const reasonCodes = [
  "destination_verified",
  "needs_destination_evidence",
  "needs_identity_evidence",
  "blocked_threat_baseline",
  "blocked_destination_risk",
  "challenge_opened",
  "challenge_resolved",
  "external_handoff_verified",
  "external_handoff_failed",
  "duplicate_identity_blocked",
  "appeal_requested",
  "appeal_denied",
  "appeal_upheld",
] as const;
const appealStatuses = ["none", "appeal_requested", "appeal_denied", "appeal_upheld"] as const;
const subscriptionStatuses = ["active", "paused", "cancelled", "past_due", "expired"] as const;
const subscriptionIntervals = ["monthly", "annual"] as const;
const subscriptionModes = ["pledge_only", "test_payment", "real_money"] as const;
const supporterGates = ["demo_self_attestation", "verified_human", "repository_existing_verification"] as const;

function hasServiceRoleEnv() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function clampNonNegativeInteger(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function rateBps(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return null;
  }

  return Math.max(0, Math.round((numerator / denominator) * 10_000));
}

function readString(row: Record<string, unknown>, key: string, fallback = "") {
  const value = row[key];

  return typeof value === "string" && value.trim() ? value : fallback;
}

function readNumber(row: Record<string, unknown>, key: string, fallback = 0) {
  const value = row[key];

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function readBoolean(row: Record<string, unknown>, key: string, fallback = false) {
  const value = row[key];

  return typeof value === "boolean" ? value : fallback;
}

function readStringArray(row: Record<string, unknown>, key: string) {
  const value = row[key];

  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function normalizeEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && allowed.includes(value as T) ? (value as T) : fallback;
}

function parseDateMs(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsed = Date.parse(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function roundHours(value: number) {
  return Math.round(value * 10) / 10;
}

function median(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[middle] ?? null;
  }

  const lower = sorted[middle - 1] ?? 0;
  const upper = sorted[middle] ?? 0;

  return (lower + upper) / 2;
}

function isActivePledge(pledge: MpgfPublicGoodsPledge) {
  return pledge.status === "pledged" || pledge.status === "captured";
}

function isEligiblePledge(pledge: MpgfPublicGoodsPledge) {
  return isActivePledge(pledge) && pledge.eligibilityState === "eligible" && pledge.amountCents > 0;
}

function perDonorQfCapCents(matchPool: MpgfPublicGoodsMatchPool) {
  const configured = matchPool.restrictionsJson.perDonorQfCapCents;

  return typeof configured === "number" && Number.isFinite(configured) && configured > 0
    ? Math.floor(configured)
    : 10_000;
}

function largestShareBps(amounts: number[], totalCents: number) {
  if (amounts.length === 0 || totalCents <= 0) {
    return null;
  }

  return rateBps(Math.max(...amounts), totalCents);
}

function netNewFundingProxy(event: MpgfPublicGoodsKpiAnalyticsEvent) {
  const eventJson = event.event_json ?? {};
  const proxy = eventJson.netNewFundingProxy;
  const preCommitmentStatus = eventJson.preCommitmentStatus;

  if (proxy === "likely_net_new" || preCommitmentStatus === "not_precommitted") {
    return "likely_net_new" as const;
  }

  if (proxy === "already_planned" || preCommitmentStatus === "already_planned") {
    return "already_planned" as const;
  }

  if (proxy === "uncertain" || preCommitmentStatus === "unknown") {
    return "uncertain" as const;
  }

  return null;
}

function supportSignalMode(event: MpgfPublicGoodsKpiAnalyticsEvent) {
  const eventJson = event.event_json ?? {};
  const mode = eventJson.supportSignalMode;

  if (mode === "common_ground_support" || mode === "dissent_review_requested") {
    return mode;
  }

  return null;
}

function fundingExperimentCatalog(): MpgfPublicGoodsFundingExperimentCatalogItem[] {
  return [
    {
      experimentKey: "mpgf_manual_evidence_vs_webhook_auto_import_v1",
      comparison: "manual_evidence_against_webhook_auto_import",
      control: "manual_external_payment_evidence",
      treatment: "provider_webhook_auto_import",
      primaryMetric: "autoVerifiedContributionShareBps",
      guardrailMetrics: ["reviewSlaAttainmentBps", "disputeRateBps", "rawPrivateTextStored"],
      privacyPolicy: "aggregate_assignment_no_raw_private_text",
      noGlobalMoralRanking: true,
    },
    {
      experimentKey: "mpgf_static_ordering_vs_common_ground_personalization_v1",
      comparison: "static_campaign_ordering_against_private_common_ground_ordering",
      control: "static_campaign_ordering",
      treatment: "private_common_ground_priority_grouping",
      primaryMetric: "supportSignalToPledgeIntentBps",
      guardrailMetrics: ["noGlobalMoralRanking", "dissentReviewSignalEventCount"],
      privacyPolicy: "aggregate_assignment_no_raw_private_text",
      noGlobalMoralRanking: true,
    },
    {
      experimentKey: "mpgf_donate_now_vs_unlock_round_framing_v1",
      comparison: "donate_now_against_unlock_the_round_assurance_framing",
      control: "donate_now",
      treatment: "unlock_the_round",
      primaryMetric: "pageViewToPledgeIntentBps",
      guardrailMetrics: ["likelyNetNewFundingShareBps", "refund_or_dispute_rate"],
      privacyPolicy: "aggregate_assignment_no_raw_private_text",
      noGlobalMoralRanking: true,
    },
    {
      experimentKey: "mpgf_default_off_vs_suggested_sponsor_refill_v1",
      comparison: "default_off_against_suggested_recurring_sponsor_pool_refill",
      control: "recurring_refill_default_off",
      treatment: "lightly_suggested_recurring_refill",
      primaryMetric: "sponsorPoolRefillRateBps",
      guardrailMetrics: ["donorRetentionIntoNextRoundBps", "subscriptionCancellationShareBps"],
      privacyPolicy: "aggregate_assignment_no_raw_private_text",
      noGlobalMoralRanking: true,
    },
  ];
}

function thresholdReachedAt(campaign: MpgfPublicGoodsCampaign, pledges: MpgfPublicGoodsPledge[]) {
  const userAmounts = new Map<string, number>();
  const sortedPledges = pledges
    .filter((pledge) => pledge.campaignId === campaign.id && isEligiblePledge(pledge))
    .sort((a, b) => (parseDateMs(a.createdAt) ?? 0) - (parseDateMs(b.createdAt) ?? 0));

  for (const pledge of sortedPledges) {
    userAmounts.set(pledge.userId, (userAmounts.get(pledge.userId) ?? 0) + pledge.amountCents);

    const directEligibleCents = [...userAmounts.values()].reduce((sum, amount) => sum + amount, 0);

    if (directEligibleCents >= campaign.thresholdAmountCents && userAmounts.size >= campaign.thresholdSupporters) {
      return pledge.createdAt;
    }
  }

  return null;
}

function retentionBps(subscriptions: MpgfPublicGoodsSubscription[], generatedAt: string, months: number) {
  const generatedAtMs = parseDateMs(generatedAt);

  if (generatedAtMs == null) {
    return null;
  }

  const cutoffMs = generatedAtMs - months * 30 * 24 * 60 * 60 * 1000;
  const matured = subscriptions.filter((subscription) => {
    const createdAtMs = parseDateMs(subscription.createdAt);

    return createdAtMs != null && createdAtMs <= cutoffMs;
  });

  if (matured.length === 0) {
    return null;
  }

  return rateBps(
    matured.filter((subscription) => subscription.status === "active").length,
    matured.length,
  );
}

function monthlyRunRateCents(subscriptions: MpgfPublicGoodsSubscription[]) {
  return subscriptions
    .filter((subscription) => subscription.status === "active")
    .reduce(
      (sum, subscription) => sum + (subscription.interval === "annual" ? Math.floor(subscription.amountCents / 12) : subscription.amountCents),
      0,
    );
}

function sumVerifiedProofs(paymentProofs: MpgfPublicGoodsPaymentProof[]) {
  return paymentProofs
    .filter((proof) => proof.status === "verified")
    .reduce((sum, proof) => sum + proof.amountVerifiedCents, 0);
}

function isAutoVerifiedProof(proof: MpgfPublicGoodsPaymentProof) {
  return proof.reconciliationSource === "fiscal_host_webhook" || proof.reconciliationSource === "sponsor_signed_intent";
}

function countFundedCampaignsWithVerifiedProofs(lines: MpgfPublicGoodsAllocationLine[], paymentProofs: MpgfPublicGoodsPaymentProof[]) {
  const fundedCampaignIds = new Set(lines.filter((line) => line.status === "payable" && line.totalPayoutCents > 0).map((line) => line.campaignId));
  const proofCampaignIds = new Set(
    paymentProofs
      .filter((proof) => proof.status === "verified" && proof.amountVerifiedCents > 0)
      .map((proof) => proof.campaignId),
  );

  return [...fundedCampaignIds].filter((campaignId) => proofCampaignIds.has(campaignId)).length;
}

export function buildMpgfPublicGoodsKpiSnapshot({
  campaigns = demoMpgfPublicGoodsCampaigns,
  pledges = demoMpgfAssurancePledges,
  reviewCases = demoMpgfPublicGoodsReviewCases,
  paymentProofs = demoMpgfPublicGoodsPaymentProofs,
  subscriptions = demoMpgfPublicGoodsSubscriptions,
  analyticsEvents = [],
  round = demoMpgfAssuranceRound,
  matchPool = demoMpgfMatchPool,
  allocation,
  campaignStartAtById = {},
  generatedAt = new Date("2026-05-29T12:00:00.000Z").toISOString(),
  dataSource = "demo_fixture",
}: {
  campaigns?: MpgfPublicGoodsCampaign[];
  pledges?: MpgfPublicGoodsPledge[];
  reviewCases?: MpgfPublicGoodsReviewCase[];
  paymentProofs?: MpgfPublicGoodsPaymentProof[];
  subscriptions?: MpgfPublicGoodsSubscription[];
  analyticsEvents?: MpgfPublicGoodsKpiAnalyticsEvent[];
  round?: MpgfPublicGoodsRound;
  matchPool?: MpgfPublicGoodsMatchPool;
  allocation?: MpgfPublicGoodsRoundAllocation;
  campaignStartAtById?: Record<string, string | undefined>;
  generatedAt?: string;
  dataSource?: MpgfPublicGoodsKpiDataSource;
} = {}): MpgfPublicGoodsKpiSnapshot {
  const now = new Date(generatedAt);
  const roundAllocation =
    allocation ??
    allocateMpgfAssuranceRound({
      campaigns,
      pledges,
      round,
      matchPool,
      now,
    });
  const assuranceStatuses = campaigns.map((campaign) => getMpgfCampaignAssuranceStatus(campaign, pledges, now));
  const eligiblePledges = pledges.filter(isEligiblePledge);
  const activePledges = pledges.filter(isActivePledge);
  const totalPledgedCents = activePledges.reduce((sum, pledge) => sum + clampNonNegativeInteger(pledge.amountCents), 0);
  const eligibleDirectCents = eligiblePledges.reduce((sum, pledge) => sum + clampNonNegativeInteger(pledge.amountCents), 0);
  const excludedPledgeCount = activePledges.length - eligiblePledges.length;
  const duplicateOrBlockedPledgeCount = activePledges.filter(
    (pledge) => pledge.eligibilityState === "duplicate_identity" || pledge.eligibilityState === "blocked",
  ).length;
  const thresholdHours = campaigns
    .map((campaign) => {
      const reachedAtMs = parseDateMs(thresholdReachedAt(campaign, pledges) ?? undefined);
      const startAtMs = parseDateMs(campaignStartAtById[campaign.id]) ?? parseDateMs(round.startsAt);

      if (reachedAtMs == null || startAtMs == null || reachedAtMs < startAtMs) {
        return null;
      }

      return roundHours((reachedAtMs - startAtMs) / (60 * 60 * 1000));
    })
    .filter((value): value is number => value != null);
  const reviewDurations = reviewCases
    .map((reviewCase) => {
      const openedAtMs = parseDateMs(reviewCase.openedAt);
      const closedAtMs = parseDateMs(reviewCase.closedAt);

      if (openedAtMs == null || closedAtMs == null || closedAtMs < openedAtMs) {
        return null;
      }

      return roundHours((closedAtMs - openedAtMs) / (60 * 60 * 1000));
    })
    .filter((value): value is number => value != null);
  const campaignViewEventCount = analyticsEvents.filter((event) => event.event_type === "campaign_viewed").length;
  const supportSignalEvents = analyticsEvents.filter((event) => event.event_type === "support_signal_recorded");
  const commonGroundSupportSignalEventCount = supportSignalEvents.filter(
    (event) => supportSignalMode(event) === "common_ground_support",
  ).length;
  const dissentReviewSignalEventCount = supportSignalEvents.filter(
    (event) => supportSignalMode(event) === "dissent_review_requested",
  ).length;
  const pledgeIntentEventCount = analyticsEvents.filter((event) => event.event_type === "pledge_intent_recorded").length;
  const pledgeIntentCount = pledgeIntentEventCount > 0 ? pledgeIntentEventCount : activePledges.length;
  const thresholdClearedCampaignCount = assuranceStatuses.filter((status) => status.thresholdPassed).length;
  const payableLines = roundAllocation.lines.filter((line) => line.status === "payable");
  const payableDirectEligibleCents = payableLines.reduce((sum, line) => sum + line.directEligibleCents, 0);
  const sponsorPoolCents = roundAllocation.baseMatchBudgetCents + roundAllocation.qfBonusBudgetCents;
  const matchAllocatedCents = roundAllocation.baseMatchAllocatedCents + roundAllocation.qfBonusAllocatedCents;
  const activeContributionAmounts = activePledges.map((pledge) => clampNonNegativeInteger(pledge.amountCents));
  const countedContributionAmounts = eligiblePledges.map((pledge) =>
    countMpgfQfContributionCents(pledge.amountCents, perDonorQfCapCents(matchPool)),
  );
  const campaignDirectAmounts = roundAllocation.lines.map((line) => line.directEligibleCents);
  const campaignMatchAmounts = roundAllocation.lines.map((line) => line.baseMatchCents + line.qfBonusCents);
  const netNewFundingEvents = analyticsEvents
    .filter((event) => event.event_type === "pledge_intent_recorded")
    .map(netNewFundingProxy)
    .filter((proxy): proxy is NonNullable<ReturnType<typeof netNewFundingProxy>> => Boolean(proxy));
  const likelyNetNewFundingEventCount = netNewFundingEvents.filter((proxy) => proxy === "likely_net_new").length;
  const externalHandoffPledgeCount = eligiblePledges.filter((pledge) => pledge.captureMode === "external_handoff").length;
  const verifiedExternalHandoffProofCount = paymentProofs.filter(
    (proof) =>
      proof.status === "verified" &&
      proof.amountVerifiedCents > 0 &&
      (proof.reconciliationSource === "external_receipt" || proof.reconciliationSource === "fiscal_host_webhook"),
  ).length;
  const verifiedProofs = paymentProofs.filter((proof) => proof.status === "verified" && proof.amountVerifiedCents > 0);
  const autoVerifiedProofs = verifiedProofs.filter(isAutoVerifiedProof);
  const manualVerifiedProofs = verifiedProofs.filter((proof) => !isAutoVerifiedProof(proof));
  const pledgesById = new Map(pledges.map((pledge) => [pledge.id, pledge]));
  const hoursFromPledgeToCounted = verifiedProofs
    .map((proof) => {
      const pledge = proof.pledgeId ? pledgesById.get(proof.pledgeId) : undefined;
      const pledgedAtMs = parseDateMs(pledge?.createdAt);
      const verifiedAtMs = parseDateMs(proof.verifiedAt);

      if (pledgedAtMs == null || verifiedAtMs == null || verifiedAtMs < pledgedAtMs) {
        return null;
      }

      return roundHours((verifiedAtMs - pledgedAtMs) / (60 * 60 * 1000));
    })
    .filter((value): value is number => value != null);
  const fundedCampaignCount = payableLines.filter((line) => line.totalPayoutCents > 0).length;
  const fundedCampaignsWithVerifiedProofCount = countFundedCampaignsWithVerifiedProofs(roundAllocation.lines, paymentProofs);
  const disputeCaseCount = reviewCases.filter(
    (reviewCase) =>
      reviewCase.action === "challenge" ||
      reviewCase.state === "blocked" ||
      reviewCase.state === "needs_evidence" ||
      reviewCase.appealStatus !== "none",
  ).length;
  const appealCaseCount = reviewCases.filter((reviewCase) => reviewCase.appealStatus !== "none").length;
  const reviewSlaHours = 72;
  const reviewSlaAttainmentBps = rateBps(
    reviewDurations.filter((duration) => duration <= reviewSlaHours).length,
    reviewDurations.length,
  );
  const appealOverturnRateBps = rateBps(
    reviewCases.filter((reviewCase) => reviewCase.appealStatus === "appeal_upheld").length,
    appealCaseCount,
  );
  const activeSubscriptionCount = subscriptions.filter((subscription) => subscription.status === "active").length;
  const recurringMonthlyRunRateCents = monthlyRunRateCents(subscriptions);
  const retainedRecurringDonors3MonthBps = retentionBps(subscriptions, generatedAt, 3);
  const retainedRecurringDonors6MonthBps = retentionBps(subscriptions, generatedAt, 6);
  const experiments = fundingExperimentCatalog();
  const activeExperimentAssignmentEventCount = analyticsEvents.filter(
    (event) => event.event_type === "experiment_assigned" || event.event_type === "experiment_assignment_recorded",
  ).length;
  const featureFlag = getMpgfPublicGoodsFeatureFlagStatus();
  const accessMode = featureFlag.accessMode === "public_beta" ? "public_beta" : "invited_cohort";
  const reviewerTimingSampleReady = reviewDurations.length >= 3;
  const thresholdConversionSampleReady = thresholdClearedCampaignCount >= 2;
  const rolloutBlockers = [
    featureFlag.invitedCohortRequired ? "invited_cohort_still_required" : null,
    reviewerTimingSampleReady ? null : "reviewer_timing_sample_too_small",
    thresholdConversionSampleReady ? null : "threshold_conversion_sample_too_small",
  ].filter((blocker): blocker is string => Boolean(blocker));

  return {
    generatedAt,
    roundId: round.id,
    matchPoolId: matchPool.id,
    dataSource,
    privacyPolicy: "aggregate_only_no_user_or_reason_text",
    coordination: {
      campaignCount: campaigns.length,
      supportSignalEventCount: supportSignalEvents.length,
      commonGroundSupportSignalEventCount,
      dissentReviewSignalEventCount,
      supportSignalToPledgeIntentBps: rateBps(pledgeIntentEventCount, supportSignalEvents.length),
      pledgeIntentCount,
      campaignViewEventCount,
      pledgeIntentEventCount,
      eligiblePledgeCount: eligiblePledges.length,
      verifiedPledgeConversionBps: rateBps(eligiblePledges.length, pledgeIntentCount),
      pageViewToPledgeIntentBps: rateBps(pledgeIntentEventCount, campaignViewEventCount),
      thresholdClearedCampaignCount,
      thresholdClearRateBps: rateBps(thresholdClearedCampaignCount, campaigns.length),
      payableCampaignCount: payableLines.length,
      medianHoursToThreshold: median(thresholdHours),
    },
    matching: {
      directEligibleCents: roundAllocation.lines.reduce((sum, line) => sum + line.directEligibleCents, 0),
      payableDirectEligibleCents,
      sponsorPoolCents,
      baseMatchAllocatedCents: roundAllocation.baseMatchAllocatedCents,
      qfBonusAllocatedCents: roundAllocation.qfBonusAllocatedCents,
      matchAllocatedCents,
      directFundsToMatchMultiplierBps: rateBps(payableDirectEligibleCents, matchAllocatedCents),
      matchToDirectMultiplierBps: rateBps(matchAllocatedCents, payableDirectEligibleCents),
      sponsorPoolUtilizationBps: rateBps(matchAllocatedCents, sponsorPoolCents),
    },
    donorEconomics: {
      activeContributionCount: activePledges.length,
      eligibleContributionCount: eligiblePledges.length,
      medianGrossContributionCents: median(activeContributionAmounts),
      medianCapAdjustedCountedContributionCents: median(countedContributionAmounts),
      campaignConcentrationTopDirectShareBps: largestShareBps(
        campaignDirectAmounts,
        roundAllocation.lines.reduce((sum, line) => sum + line.directEligibleCents, 0),
      ),
      campaignConcentrationTopMatchShareBps: largestShareBps(campaignMatchAmounts, matchAllocatedCents),
      netNewFundingSurveyEventCount: netNewFundingEvents.length,
      likelyNetNewFundingEventCount,
      likelyNetNewFundingShareBps: rateBps(likelyNetNewFundingEventCount, netNewFundingEvents.length),
    },
    funding: {
      verifiedDollarsRoutedCents: sumVerifiedProofs(paymentProofs),
      verifiedSupporterCountPerWinningCampaign: payableLines.length
        ? Math.round(payableLines.reduce((sum, line) => sum + line.verifiedSupporterCount, 0) / payableLines.length)
        : null,
      thresholdClearRateBps: rateBps(thresholdClearedCampaignCount, campaigns.length),
      sponsorLeverageRatioBps: rateBps(matchAllocatedCents, payableDirectEligibleCents),
      autoVerifiedContributionShareBps: rateBps(autoVerifiedProofs.length, verifiedProofs.length),
      autoVerifiedContributionCount: autoVerifiedProofs.length,
      manualVerifiedContributionCount: manualVerifiedProofs.length,
      medianHoursFromPledgeToCounted: median(hoursFromPledgeToCounted),
      sponsorPoolRefillRateBps: rateBps(recurringMonthlyRunRateCents, sponsorPoolCents),
      sponsorPoolMonthlyRefillCents: recurringMonthlyRunRateCents,
      reviewSlaAttainmentBps,
      disputeRateBps: rateBps(disputeCaseCount, Math.max(1, reviewCases.length)),
      appealOverturnRateBps,
      donorRetentionIntoNextRoundBps: retainedRecurringDonors3MonthBps,
    },
    handoffProof: {
      externalHandoffPledgeCount,
      verifiedExternalHandoffProofCount,
      externalHandoffCompletionRateBps: rateBps(verifiedExternalHandoffProofCount, externalHandoffPledgeCount),
      verifiedAmountCents: sumVerifiedProofs(paymentProofs),
      fundedCampaignCount,
      fundedCampaignsWithVerifiedProofCount,
      verifiableCompletionShareBps: rateBps(fundedCampaignsWithVerifiedProofCount, fundedCampaignCount),
    },
    review: {
      reviewCaseCount: reviewCases.length,
      closedReviewCaseCount: reviewDurations.length,
      openReviewCaseCount: reviewCases.length - reviewDurations.length,
      reviewerMedianHoursToClose: median(reviewDurations),
      disputeCaseCount,
      appealCaseCount,
      disputeRateBps: rateBps(disputeCaseCount, Math.max(1, reviewCases.length)),
    },
    safety: {
      excludedPledgeCount,
      duplicateOrBlockedPledgeCount,
      totalPledgedCents,
      eligibleDirectCents,
      fraudAdjustedPayoutRatioBps: rateBps(eligibleDirectCents, totalPledgedCents),
      noCustodyPilot: true,
      rawPrivateTextStored: false,
    },
    recurring: {
      subscriptionCount: subscriptions.length,
      activeSubscriptionCount,
      monthlyRunRateCents: recurringMonthlyRunRateCents,
      retainedRecurringDonors3MonthBps,
      retainedRecurringDonors6MonthBps,
    },
    experimentBacklog: {
      recommendedCount: experiments.length,
      activeAssignmentEventCount: activeExperimentAssignmentEventCount,
      experiments,
    },
    rolloutGate: {
      accessMode,
      cohort: featureFlag.cohort,
      invitedCohortRequired: featureFlag.invitedCohortRequired,
      reviewerTimingSampleReady,
      thresholdConversionSampleReady,
      widensPublicAccessAutomatically: false,
      recommendation: rolloutBlockers.length === 0 ? "ready_for_public_beta_review" : "hold_invited_cohort",
      blockers: rolloutBlockers,
    },
  };
}

async function selectRows(supabase: SupabaseServiceAny, table: string, columns: string) {
  const result = await supabase.from(table).select(columns);

  if (result.error) {
    throw new Error(`Could not load MPGF public-goods KPI data from ${table}: ${result.error.message}`);
  }

  return ((result.data ?? []) as unknown[]).filter((row): row is Record<string, unknown> => Boolean(row && typeof row === "object"));
}

function mapCampaignRow(row: Record<string, unknown>): MpgfPublicGoodsCampaign {
  return {
    id: readString(row, "id", "campaign-unknown"),
    slug: readString(row, "slug", readString(row, "id", "campaign-unknown")),
    poolAlternativeId: readString(row, "pool_alternative_id") || undefined,
    title: readString(row, "title", "Untitled public-goods campaign"),
    destinationType: normalizeEnum<MpgfPublicGoodsDestinationType>(row.destination_type, destinationTypes, "external_charity"),
    destinationRef: readString(row, "destination_ref", "redacted destination reference"),
    causeTags: readStringArray(row, "cause_tags"),
    publicSummary: readString(row, "public_summary", "Public-goods assurance campaign."),
    thresholdAmountCents: clampNonNegativeInteger(readNumber(row, "threshold_amount_cents", 1)),
    thresholdSupporters: Math.max(1, clampNonNegativeInteger(readNumber(row, "threshold_supporters", 1))),
    deadlineAt: readString(row, "deadline_at", new Date("2026-05-31T23:59:59.000Z").toISOString()),
    verificationMethod: readString(row, "verification_method", "External proof and reviewer confirmation."),
    baselineRule: readString(row, "baseline_rule", "No threat or coercive baseline."),
    exitRule: readString(row, "exit_rule", "Pledges expire if thresholds fail."),
    reviewStatus: normalizeEnum<MpgfPublicGoodsCampaignReviewStatus>(row.review_status, reviewStatuses, "submitted"),
    challengeWindowEndsAt: readString(row, "challenge_window_ends_at") || undefined,
  };
}

function mapPledgeRow(row: Record<string, unknown>): MpgfPublicGoodsPledge {
  return {
    id: readString(row, "id", "pledge-unknown"),
    campaignId: readString(row, "campaign_id", "campaign-unknown"),
    userId: readString(row, "user_ref", readString(row, "profile_id", "redacted-user")),
    amountCents: clampNonNegativeInteger(readNumber(row, "amount_cents")),
    visibilityMode: normalizeEnum<MpgfPublicGoodsVisibilityMode>(row.visibility_mode, visibilityModes, "private_amount"),
    isRecurring: readBoolean(row, "is_recurring"),
    captureMode: normalizeEnum<MpgfPublicGoodsCaptureMode>(row.capture_mode, captureModes, "external_handoff"),
    paymentIntentRef: readString(row, "payment_intent_ref") || undefined,
    eligibilityState: normalizeEnum(row.eligibility_state, ["eligible", "pending_review", "duplicate_identity", "below_minimum", "blocked"] as const, "pending_review"),
    humanScoreBps: clampNonNegativeInteger(readNumber(row, "human_score_bps")),
    status: normalizeEnum(row.status, ["pledged", "captured", "voided", "expired"] as const, "pledged"),
    createdAt: readString(row, "created_at", new Date("2026-05-29T12:00:00.000Z").toISOString()),
  };
}

function mapReviewCaseRow(row: Record<string, unknown>): MpgfPublicGoodsReviewCase {
  return {
    id: readString(row, "id", "review-case-unknown"),
    campaignId: readString(row, "campaign_id", "campaign-unknown"),
    state: normalizeEnum<MpgfPublicGoodsCampaignReviewStatus>(row.state, reviewStatuses, "submitted"),
    action: normalizeEnum<MpgfPublicGoodsReviewAction>(row.action, reviewActions, "needs_evidence"),
    reasonCode: normalizeEnum<MpgfPublicGoodsReviewReasonCode>(row.reason_code, reasonCodes, "needs_destination_evidence"),
    reviewerId: "redacted-reviewer",
    openedAt: readString(row, "opened_at", new Date("2026-05-29T12:00:00.000Z").toISOString()),
    closedAt: readString(row, "closed_at") || undefined,
    appealStatus: normalizeEnum(row.appeal_status, appealStatuses, "none"),
    challengeWindowEndsAt: readString(row, "challenge_window_ends_at") || undefined,
    publicNotes: "",
    allowedNextActions: readStringArray(row, "allowed_next_actions").filter((action): action is MpgfPublicGoodsReviewAction =>
      reviewActions.includes(action as MpgfPublicGoodsReviewAction),
    ),
  };
}

function mapPaymentProofRow(row: Record<string, unknown>): MpgfPublicGoodsPaymentProof {
  return {
    id: readString(row, "id", "payment-proof-unknown"),
    pledgeId: readString(row, "pledge_id") || undefined,
    campaignId: readString(row, "campaign_id", "campaign-unknown"),
    amountVerifiedCents: clampNonNegativeInteger(readNumber(row, "amount_verified_cents")),
    status: normalizeEnum(row.status, ["pending_review", "verified", "rejected", "superseded"] as const, "pending_review"),
    reasonCode: normalizeEnum<MpgfPublicGoodsReviewReasonCode>(row.reason_code, reasonCodes, "needs_destination_evidence"),
    reconciliationSource: normalizeEnum(
      row.reconciliation_source,
      ["external_receipt", "fiscal_host_webhook", "sponsor_signed_intent"] as const,
      "external_receipt",
    ),
    verifiedAt: readString(row, "verified_at") || undefined,
    createdAt: readString(row, "created_at", new Date("2026-05-29T12:00:00.000Z").toISOString()),
  };
}

function mapSubscriptionRow(row: Record<string, unknown>): MpgfPublicGoodsSubscription {
  return {
    id: readString(row, "id", "subscription-unknown"),
    userId: readString(row, "user_ref", readString(row, "profile_id", "redacted-user")),
    poolId: readString(row, "pool_id", demoMpgfMatchPool.id),
    amountCents: clampNonNegativeInteger(readNumber(row, "amount_cents")),
    interval: normalizeEnum(row.interval, subscriptionIntervals, "monthly"),
    status: normalizeEnum(row.status, subscriptionStatuses, "active"),
    captureMode: normalizeEnum<MpgfPublicGoodsCaptureMode>(row.capture_mode, captureModes, "external_handoff"),
    mode: normalizeEnum(row.mode, subscriptionModes, "pledge_only"),
    nextChargeAt: readString(row, "next_charge_at", new Date("2026-06-01T00:00:00.000Z").toISOString()),
    createdAt: readString(row, "created_at", new Date("2026-05-29T12:00:00.000Z").toISOString()),
  };
}

function mapRoundRow(row: Record<string, unknown>): MpgfPublicGoodsRound {
  return {
    id: readString(row, "id", demoMpgfAssuranceRound.id),
    name: readString(row, "name", "Public-goods assurance round"),
    startsAt: readString(row, "starts_at", demoMpgfAssuranceRound.startsAt),
    endsAt: readString(row, "ends_at", demoMpgfAssuranceRound.endsAt),
    matchPoolId: readString(row, "match_pool_id", demoMpgfMatchPool.id),
    qfEnabled: readBoolean(row, "qf_enabled", true),
    qfCapMultiple: Math.max(0, readNumber(row, "qf_cap_multiple", 1.5)),
    supporterGate: normalizeEnum(row.supporter_gate, supporterGates, "demo_self_attestation"),
  };
}

function mapMatchPoolRow(row: Record<string, unknown>): MpgfPublicGoodsMatchPool {
  return {
    id: readString(row, "id", demoMpgfMatchPool.id),
    funderType: normalizeEnum(
      row.funder_type,
      ["demo_common_ground_pool", "sponsor", "subscription_pool", "institution"] as const,
      "demo_common_ground_pool",
    ),
    budgetCents: clampNonNegativeInteger(readNumber(row, "budget_cents")),
    baseMatchRatio: Math.max(0, readNumber(row, "base_match_ratio", 1)),
    qfBonusCents: clampNonNegativeInteger(readNumber(row, "qf_bonus_cents")),
    visibleCommitment: readString(row, "visible_commitment", "A visible sponsor commitment backs threshold-cleared campaigns."),
    restrictionsJson: readRecord(row.restrictions_json) ?? {},
  };
}

export async function loadMpgfPublicGoodsKpiSnapshot({
  dryRun = false,
  generatedAt = new Date().toISOString(),
}: {
  dryRun?: boolean;
  generatedAt?: string;
} = {}): Promise<LoadMpgfPublicGoodsKpiSnapshotResult> {
  if (dryRun) {
    return {
      ok: true,
      status: "dry_run",
      snapshot: buildMpgfPublicGoodsKpiSnapshot({ generatedAt }),
      warnings: [],
    };
  }

  if (!hasSupabaseEnv() || !hasServiceRoleEnv()) {
    return {
      ok: false,
      status: "not_configured",
      snapshot: buildMpgfPublicGoodsKpiSnapshot({ generatedAt }),
      warnings: ["Supabase service-role configuration is required to load MPGF public-goods KPI data."],
    };
  }

  const supabase = createServiceClient() as SupabaseServiceAny;
  const [campaignRows, pledgeRows, reviewRows, proofRows, subscriptionRows, roundRows, matchPoolRows, analyticsRows] =
    await Promise.all([
      selectRows(
        supabase,
        "mpgf_public_goods_campaigns",
        "id, slug, pool_alternative_id, title, destination_type, destination_ref, cause_tags, public_summary, threshold_amount_cents, threshold_supporters, deadline_at, verification_method, baseline_rule, exit_rule, review_status, challenge_window_ends_at, created_at",
      ),
      selectRows(
        supabase,
        "mpgf_public_goods_pledges",
        "id, campaign_id, user_ref, amount_cents, visibility_mode, is_recurring, capture_mode, payment_intent_ref, eligibility_state, human_score_bps, status, created_at",
      ),
      selectRows(
        supabase,
        "mpgf_public_goods_review_cases",
        "id, campaign_id, state, action, reason_code, opened_at, closed_at, appeal_status, challenge_window_ends_at, allowed_next_actions",
      ),
      selectRows(
        supabase,
        "mpgf_public_goods_payment_proofs",
        "id, pledge_id, campaign_id, amount_verified_cents, status, reason_code, reconciliation_source, verified_at, created_at",
      ),
      selectRows(
        supabase,
        "mpgf_public_goods_subscriptions",
        "id, user_ref, pool_id, amount_cents, interval, status, capture_mode, mode, next_charge_at, created_at",
      ),
      selectRows(
        supabase,
        "mpgf_public_goods_rounds",
        "id, name, starts_at, ends_at, match_pool_id, qf_enabled, qf_cap_multiple, supporter_gate",
      ),
      selectRows(
        supabase,
        "mpgf_public_goods_match_pools",
        "id, funder_type, budget_cents, base_match_ratio, qf_bonus_cents, visible_commitment, restrictions_json",
      ),
      selectRows(
        supabase,
        "mpgf_public_goods_analytics_events",
        "event_type, campaign_id, event_json, created_at",
      ),
    ]);

  const campaigns = campaignRows.length > 0 ? campaignRows.map(mapCampaignRow) : demoMpgfPublicGoodsCampaigns;
  const pledges = pledgeRows.map(mapPledgeRow);
  const reviewCases = reviewRows.map(mapReviewCaseRow);
  const paymentProofs = proofRows.map(mapPaymentProofRow);
  const subscriptions = subscriptionRows.map(mapSubscriptionRow);
  const rounds = roundRows.map(mapRoundRow);
  const matchPools = matchPoolRows.map(mapMatchPoolRow);
  const round = rounds[0] ?? demoMpgfAssuranceRound;
  const matchPool = matchPools.find((candidate) => candidate.id === round.matchPoolId) ?? matchPools[0] ?? demoMpgfMatchPool;
  const campaignStartAtById = Object.fromEntries(
    campaignRows.map((row) => [readString(row, "id"), readString(row, "created_at") || undefined]),
  );
  const analyticsEvents = analyticsRows.map((row) => ({
    event_type: readString(row, "event_type"),
    campaign_id: readString(row, "campaign_id") || null,
    event_json: readRecord(row.event_json),
    created_at: readString(row, "created_at", generatedAt),
  })) satisfies MpgfPublicGoodsKpiAnalyticsEvent[];

  return {
    ok: true,
    status: "loaded",
    snapshot: buildMpgfPublicGoodsKpiSnapshot({
      campaigns,
      pledges,
      reviewCases,
      paymentProofs,
      subscriptions,
      analyticsEvents,
      round,
      matchPool,
      campaignStartAtById,
      generatedAt,
      dataSource: campaignRows.length > 0 ? "database" : "demo_fixture",
    }),
    warnings: campaignRows.length > 0 ? [] : ["No database campaigns found; KPI snapshot fell back to demo fixtures."],
  };
}
