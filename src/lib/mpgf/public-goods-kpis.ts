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
import { loadMpgfPublicGoodsAllocationContributionRecords } from "./public-goods-allocation-results";
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

export type MpgfPublicGoodsContributionVerificationSource =
  | "provider_webhook"
  | "manual_evidence"
  | "signed_intent_review"
  | "legacy_payment_proof";

export interface MpgfPublicGoodsContributionKpiRecord {
  id: string;
  pledgeId?: string;
  campaignId: string;
  amountVerifiedCents: number;
  pledgedAt?: string;
  countedAt?: string;
  autoVerified: boolean;
  verificationSource: MpgfPublicGoodsContributionVerificationSource;
  reviewRequiredBeforeCounting: true;
}

export interface MpgfPublicGoodsPaymentEventKpiRow {
  id: string;
  conditional_pledge_id: string | null;
  provider: string;
  provider_status: string;
  amount_cents: number;
  signature_verified: boolean;
  verified_at: string | null;
  append_only_hash: string;
  created_at: string;
}

export interface MpgfPublicGoodsProviderPaymentEventKpiRow {
  id: string;
  pledge_intent_id: string;
  provider: string;
  event_type: string;
  amount_cents: number;
  status: string;
  signature_verified: boolean;
  append_only_hash: string;
  received_at: string;
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

export type MpgfPublicGoodsPublicMetricInstrumentationStatus = "computed" | "instrumentation_pending";

export interface MpgfPublicGoodsPublicMetricCatalogItem {
  key: string;
  label: MpgfPublicGoodsPublicMetricLabel;
  category: string;
  unit: "cents" | "basis_points" | "count" | "hours";
  privacyScope: "aggregate_only_no_user_or_reason_text";
  instrumentationStatus: MpgfPublicGoodsPublicMetricInstrumentationStatus;
  currentValue: number | null;
}

export interface MpgfPublicGoodsPublicMetricCatalog {
  optimizationTarget: "incremental_verified_cross_view_review_cleared_funding";
  doesNotOptimizeGrossDonationVolumeAlone: true;
  privacyPolicy: "aggregate_only_no_user_or_reason_text";
  requiredMetricCount: number;
  computedMetricCount: number;
  pendingMetricCount: number;
  metrics: MpgfPublicGoodsPublicMetricCatalogItem[];
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
  publicMetrics: MpgfPublicGoodsPublicMetricCatalog;
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

export const MPGF_PUBLIC_GOODS_PUBLIC_METRIC_LABELS = [
  "gross-captured dollars",
  "fee dollars excluded from public-good credit",
  "fee-quote policy-hash binding, waived-fee validation, `(roundId, id)` / allocation-key uniqueness, and feeInputHash validation failure count",
  "net-recipient-cleared dollars",
  "actual-cleared dollars",
  "counted-cleared dollars",
  "match-eligible cleared dollars",
  "weak-support-to-counted-dollar conversion",
  "strong-support-to-counted-dollar conversion",
  "cleared cross-view dollars per sponsor dollar",
  "threshold-clear rate",
  "average active clusters per cleared project",
  "base-match utilization",
  "base-match claim-vs-paid ratio",
  "bonus-match utilization",
  "bonus-match cap utilization",
  "bonus-match capped-proration pass count",
  "raw-vs-verified-clear dissent pressure count",
  "bonus-affecting dissent-pressure exclusion count",
  "optimizer equal-objective tie-break count",
  "fee-excluded threshold/match dollars",
  "missing, duplicate-id, duplicate-allocation-key, fee-policy-hash-mismatched, or waived-fee-inconsistent FeeQuote row zero-allocation count",
  "failure-bonus utilization",
  "failure-bonus denied-by-reason counts",
  "failure-bonus raw-vs-participant-capped ratio",
  "failure-bonus integer-rounding remainder cents",
  "failure-bonus participant-round cap utilization",
  "failure-bonus participant-proration stable-order-key validation failure count",
  "failure-bonus participant-proration undefined-helper prevention count",
  "failure-bonus round-level proration undefined-helper prevention count",
  "Stage 4 base-match default-ratio local-definition validation failure count",
  "failure-bonus provisional-vs-paid ratio",
  "failure-bonus claim eligibility-hash / claimant-conflict / stored-amount mismatch rejection count",
  "failure-bonus proration factor bps",
  "failure-bonus backed-available-pool utilization",
  "non-binding settlement-preview dollars excluded from clearing",
  "base-match rounding remainder cents",
  "bonus-match rounding remainder cents",
  "base-match funded-vs-advertised ratio",
  "bonus-match funded-vs-advertised ratio",
  "failure-bonus funded-vs-advertised ratio",
  "success-reward funded-vs-advertised ratio",
  "success-reward utilization",
  "success-reward denied-by-reason counts",
  "success-reward dominance-mode disabled-by-underbacking count",
  "coordination-credit units issued",
  "coordination-credit no-allocation-power invariant violation count",
  "impact-certificate units issued",
  "impact-certificate late-access rejection count",
  "sealed-pledge exact-progress exposure incident count",
  "self-match / linked-account / same-payment-method / same-control exclusions",
  "authorization failure reclearing count",
  "authorization wrong-amount / short-expiry removals",
  "authorization-failed dollars removed from clearing",
  "payment-commitment snapshot count and invalidation count",
  "payment-commitment provider-evidence-hash malformed/invalid count",
  "clearing input bundle validation failure count",
  "clearing input bundle component-hash mismatch count",
  "clearing input bundle uniqueness violation count",
  "snapshot / project-eligibility-snapshot uniqueness violation count",
  "Common Ground Budget row-count uniqueness violation count",
  "identity-eligibility row-count uniqueness violation count",
  "round-keyed payment-snapshot row-count uniqueness violation count",
  "Stage 7 claim-creation attempts denied by full Section 10 qualified predicate",
  "Stage 7 duplicate failure-bonus claim create no-op / same-key mismatch rejection count",
  "sponsor frozen-vs-live backing mismatch count",
  "sponsor commitment source-hash / integer-cent validation failure count",
  "bonus fixed-point score-unit quantization mismatch count",
  "invalid monetary-cap / basis-point-cap allocation rejection count",
  "unsafe integer cent/count/basis-point validation failure count",
  "unverified-or-nonclear-identity counted-dollar exclusion count",
  "project-eligibility-snapshot hash validation failure count",
  "project-eligibility-snapshot baseline/action-evidence boolean validation failure count",
  "project-eligibility-snapshot cutoff/kind mismatch count",
  "conditional-intent counterparty-volume / bucket-array validation failure count",
  "round donor-counted-cap / identity-threshold validation failure count",
  "project match-bps validation failure count",
  "round sponsor-budget validation failure count",
  "identity-weight bps validation failure count",
  "payment-commitment missing-payment-method-ref count",
  "bonus fixed-constant / review-pressure-threshold validation failure count",
  "project economic-term validation failure count",
  "project baseline/action-evidence hard-gate rejection count",
  "payment-commitment snapshot binding-hash validation failure count",
  "moral-bucket snapshot binding-hash validation failure count",
  "moral-bucket snapshot graph-well-formedness validation failure count",
  "Stage 1 loose moral-bucket-snapshot hard-gate rejection count",
  "Stage 1 missing/ineligible clearing-bundle sponsor-backed hard-gate rejection count",
  "Section 11 / Stage 1 gated final sponsor-backing variable zeroing count",
  "cross-budget stance/conditional-intent row rejection count",
  "duplicate support-stance / conditional-intent selected-row rejection count",
  "formula-level bundle row-count uniqueness guard rejection count",
  "failure-bonus project-row binding rejection count",
  "failure-bonus missing/ineligible clearing-bundle sponsor-backing rejection count",
  "round-open eligibility snapshot non-boolean/truthy-field rejection count",
  "round-clearing-input-bundle binding-hash validation failure count",
  "sponsor backing timing validation failure count",
  "sponsor backing post-parameter-freeze rejection count",
  "sponsor commitment monetary-field validation failure count",
  "moral-bucket snapshot post-freeze creation rejection count",
  "moral-bucket reciprocal-map raw-key mismatch count",
  "project-round eligibility snapshot binding-hash validation failure count",
  "failure-bonus qualification full-backing denial count",
  "failure-bonus claimant-conflict snapshot context-binding rejection count",
  "trim-stable string identifier validation failure count",
  "fail-closed helper validation failure count",
  "matching raw Math.min bypass prevention count",
  "matching per-project payout-map sanitization failure count",
  "stable-order explicit tuple-field coverage count",
  "project-bucket counterparty-lookup naming mismatch count",
  "failure-bonus exact target-proration underallocation prevention count",
  "failure-bonus duplicate/wrong-round claim-list rejection count",
  "aggregate sumBigInt helper validation failure count",
  "Stage 7 local helper-definition validation failure count",
  "Stage 7 replay/review non-side-effect output undefined-helper prevention count",
  "canonical timestamp validation failure count",
  "round rulebook / parameter-freeze validation failure count",
  "sponsor preview backing validation failure count",
  "round timeline validation failure count",
  "failure-bonus preview-backing validation failure count",
  "failure-bonus full-backing validation failure count",
  "counterparty-bucket raw-array validation failure count",
  "budget-period / recurring-next-capture / budget-fallback-rule validation failure count",
  "conditional-intent enum / post-capture-state validation failure count",
  "sponsor preview future-timestamp rejection count",
  "authorization-reconciliation event-hash / duplicate-event validation failure count",
  "custody authorization timing / exact-amount validation failure count",
  "round-clearing-input-bundle id-binding validation failure count",
  "bps out-of-range fail-closed count",
  "failure-bonus budget-cap validation failure count",
  "bonus collusion-risk / cluster-distribution validation failure count",
  "deprecated stance counterparty-volume field ignored count",
  "moral-bucket distinctness asymmetry blocks",
  "authorization-to-capture lag",
  "counted-to-payout lag",
  "donor retention into next round",
  "Sybil flag rate",
  "appeal rate",
  "blocked-project precision",
  "privacy incident count",
  "deployment-mode guardrail rejection count",
  "shadow-mode payment-snapshot exemption simulation count",
  "deployment-audit payment-reconciliation-path mismatch count",
  "full-deployment shadow-only-prior-evidence rejection count",
  "selected sponsor-paid fee-support aggregate rejection count",
  "supporter-count dust-floor exclusion count",
  "capped-pilot configured-cap overrun rejection count",
  "capped-pilot gross-exposure cap utilization",
  "failure-bonus claimant-conflict denial count",
  "failure-bonus claimant-conflict snapshot binding rejection count",
  "sponsor-paid fee quote backing-hash mismatch count",
  "sponsor-paid fee support aggregate overcommit rejection count",
  "pivotality calculator open count by allowed surface",
  "pivotality calculator invalid-input rejection count",
  "pivotality calculator impossible-result count",
  "pivotality calculator live-data-access rejection count",
  "pivotality calculator no-side-effect invariant violation count",
  "simplified-UX advanced-drawer open count",
  "simplified-UX review-screen consent completion count",
  "simplified-UX data-parity mismatch count",
  "plain-language guided-mode completion count",
  "plain-label to canonical-record mismatch count",
  "final-review required-detail expansion count",
  "final-review hidden-required-field rejection count",
  "payment-language overclaim prevention count",
  "matching/reward/impact-language overclaim prevention count",
  "copy-map accessibility-label parity failure count",
  "moral-public-goods search-intent routed-to-CGB-card count",
  "moral-public-goods search zero-state suppression count",
  "public-goods primary CTA click-through count",
  "public-goods ordinary-offer drawer open count",
  "empty-filter default-render prevention count",
  "stale-current-product-label exposure count",
  "legacy-demo-label correctness count",
  "public-goods lane-count separation mismatch count",
  "public-goods mobile primary-CTA visibility failure count",
  "public-goods search accessibility announcement failure count",
] as const;

export type MpgfPublicGoodsPublicMetricLabel = (typeof MPGF_PUBLIC_GOODS_PUBLIC_METRIC_LABELS)[number];

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

function publicMetricKey(label: string) {
  return label
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function publicMetricCategory(label: string) {
  const normalized = label.toLowerCase();

  if (normalized.includes("failure-bonus")) {
    return "failure_bonus";
  }

  if (normalized.includes("success-reward") || normalized.includes("coordination-credit") || normalized.includes("impact-certificate")) {
    return "reward_credit_certificate";
  }

  if (normalized.includes("payment") || normalized.includes("authorization") || normalized.includes("custody")) {
    return "payment_authorization";
  }

  if (normalized.includes("sponsor") || normalized.includes("base-match") || normalized.includes("bonus-match")) {
    return "sponsor_matching";
  }

  if (
    normalized.includes("identity") ||
    normalized.includes("sybil") ||
    normalized.includes("collusion") ||
    normalized.includes("linked-account") ||
    normalized.includes("same-control")
  ) {
    return "identity_integrity";
  }

  if (
    normalized.includes("validation") ||
    normalized.includes("binding-hash") ||
    normalized.includes("hash") ||
    normalized.includes("malformed") ||
    normalized.includes("fail-closed") ||
    normalized.includes("rejection")
  ) {
    return "validation_guards";
  }

  if (
    normalized.includes("search") ||
    normalized.includes("cta") ||
    normalized.includes("drawer") ||
    normalized.includes("accessibility") ||
    normalized.includes("ux") ||
    normalized.includes("label")
  ) {
    return "public_experience";
  }

  if (normalized.includes("lag") || normalized.includes("retention") || normalized.includes("appeal rate")) {
    return "operations";
  }

  return "funding_clearance";
}

function publicMetricUnit(label: string): MpgfPublicGoodsPublicMetricCatalogItem["unit"] {
  const normalized = label.toLowerCase();

  if (normalized.includes("dollars")) {
    return "cents";
  }

  if (normalized.includes("rate") || normalized.includes("ratio") || normalized.includes("utilization") || normalized.includes("bps")) {
    return "basis_points";
  }

  if (normalized.includes("lag") || normalized.includes("time")) {
    return "hours";
  }

  return "count";
}

export function buildMpgfPublicGoodsPublicMetricCatalog(
  computedValues: Partial<Record<MpgfPublicGoodsPublicMetricLabel, number | null>> = {},
): MpgfPublicGoodsPublicMetricCatalog {
  const computedValueKeys = new Set(Object.keys(computedValues));
  const metrics = MPGF_PUBLIC_GOODS_PUBLIC_METRIC_LABELS.map((label) => ({
    key: publicMetricKey(label),
    label,
    category: publicMetricCategory(label),
    unit: publicMetricUnit(label),
    privacyScope: "aggregate_only_no_user_or_reason_text" as const,
    instrumentationStatus: computedValueKeys.has(label) ? "computed" as const : "instrumentation_pending" as const,
    currentValue: computedValues[label] ?? null,
  }));

  return {
    optimizationTarget: "incremental_verified_cross_view_review_cleared_funding",
    doesNotOptimizeGrossDonationVolumeAlone: true,
    privacyPolicy: "aggregate_only_no_user_or_reason_text",
    requiredMetricCount: MPGF_PUBLIC_GOODS_PUBLIC_METRIC_LABELS.length,
    computedMetricCount: metrics.filter((metric) => metric.instrumentationStatus === "computed").length,
    pendingMetricCount: metrics.filter((metric) => metric.instrumentationStatus === "instrumentation_pending").length,
    metrics,
  };
}

export function validateMpgfPublicGoodsPublicMetricCatalog(catalog = buildMpgfPublicGoodsPublicMetricCatalog()) {
  const presentLabels = new Set(catalog.metrics.map((metric) => metric.label));
  const missingLabels = MPGF_PUBLIC_GOODS_PUBLIC_METRIC_LABELS.filter((label) => !presentLabels.has(label));
  const rawPrivateFieldsExposed = catalog.metrics.some(
    (metric) => metric.privacyScope !== "aggregate_only_no_user_or_reason_text",
  );

  return {
    passed:
      missingLabels.length === 0 &&
      catalog.requiredMetricCount === MPGF_PUBLIC_GOODS_PUBLIC_METRIC_LABELS.length &&
      catalog.optimizationTarget === "incremental_verified_cross_view_review_cleared_funding" &&
      catalog.doesNotOptimizeGrossDonationVolumeAlone &&
      !rawPrivateFieldsExposed,
    missingLabels,
    requiredMetricCount: MPGF_PUBLIC_GOODS_PUBLIC_METRIC_LABELS.length,
    publishedMetricCount: catalog.metrics.length,
    rawPrivateFieldsExposed,
    doesNotOptimizeGrossDonationVolumeAlone: catalog.doesNotOptimizeGrossDonationVolumeAlone,
  };
}

function readString(row: Record<string, unknown>, key: string, fallback = "") {
  const value = row[key];

  return typeof value === "string" && value.trim() ? value : fallback;
}

function readNullableString(row: Record<string, unknown>, key: string) {
  const value = row[key];

  return typeof value === "string" && value.trim() ? value : null;
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
  return (
    proof.reconciliationSource === "fiscal_host_webhook" ||
    proof.reconciliationSource === "sponsor_signed_intent" ||
    proof.reconciliationSource === "every_org_partner_webhook"
  );
}

function groupBy<T, K extends string>(rows: T[], keyForRow: (row: T) => K | null | undefined) {
  const grouped = new Map<K, T[]>();

  for (const row of rows) {
    const key = keyForRow(row);

    if (!key) {
      continue;
    }

    grouped.set(key, [...(grouped.get(key) ?? []), row]);
  }

  return grouped;
}

function isCountableSharedPaymentEventForKpi(event: MpgfPublicGoodsPaymentEventKpiRow) {
  const status = event.provider_status.toLowerCase();
  const countableStatuses = new Set([
    "recorded",
    "capture_succeeded",
    "external_handoff_verified",
    "payment_intent_succeeded_pending_review",
  ]);

  return (
    event.signature_verified &&
    event.amount_cents > 0 &&
    countableStatuses.has(status) &&
    (event.verified_at !== null || status === "payment_intent_succeeded_pending_review")
  );
}

function isCountableProviderPaymentEventForKpi(event: MpgfPublicGoodsProviderPaymentEventKpiRow) {
  return (
    event.signature_verified &&
    event.amount_cents > 0 &&
    event.status === "recorded" &&
    event.event_type === "capture_succeeded"
  );
}

function isProviderWebhookSource(provider: string) {
  return provider !== "manual_evidence";
}

function contributionVerificationSourceForEvent(input: {
  pledge: MpgfPublicGoodsPledge;
  sharedPaymentEvent?: MpgfPublicGoodsPaymentEventKpiRow;
  providerPaymentEvent?: MpgfPublicGoodsProviderPaymentEventKpiRow;
}): MpgfPublicGoodsContributionVerificationSource {
  if (input.pledge.captureMode === "signed_intent") {
    return "signed_intent_review";
  }

  const provider = input.sharedPaymentEvent?.provider ?? input.providerPaymentEvent?.provider;

  return provider === "manual_evidence" ? "manual_evidence" : "provider_webhook";
}

function firstCountedPaymentEventForPledge(input: {
  pledge: MpgfPublicGoodsPledge;
  sharedPaymentEvents: MpgfPublicGoodsPaymentEventKpiRow[];
  providerPaymentEvents: MpgfPublicGoodsProviderPaymentEventKpiRow[];
}) {
  const sharedCandidates = input.sharedPaymentEvents.map((event) => ({
    id: event.id,
    amountCents: event.amount_cents,
    provider: event.provider,
    countedAt: event.verified_at ?? event.created_at,
    sharedPaymentEvent: event,
    providerPaymentEvent: undefined,
  }));
  const providerCandidates = input.providerPaymentEvents.map((event) => ({
    id: event.id,
    amountCents: event.amount_cents,
    provider: event.provider,
    countedAt: event.received_at || event.created_at,
    sharedPaymentEvent: undefined,
    providerPaymentEvent: event,
  }));

  return [...sharedCandidates, ...providerCandidates]
    .filter((event) => event.amountCents > 0)
    .sort((left, right) => left.countedAt.localeCompare(right.countedAt) || left.id.localeCompare(right.id))[0];
}

function buildMpgfPublicGoodsContributionKpiRecordsFromPaymentProofs({
  paymentProofs,
  pledges,
}: {
  paymentProofs: MpgfPublicGoodsPaymentProof[];
  pledges: MpgfPublicGoodsPledge[];
}) {
  const pledgesById = new Map(pledges.map((pledge) => [pledge.id, pledge]));

  return paymentProofs
    .filter((proof) => proof.status === "verified" && proof.amountVerifiedCents > 0)
    .map((proof) => {
      const pledge = proof.pledgeId ? pledgesById.get(proof.pledgeId) : undefined;

      return {
        id: `legacy-payment-proof:${proof.id}`,
        ...(proof.pledgeId ? { pledgeId: proof.pledgeId } : {}),
        campaignId: proof.campaignId,
        amountVerifiedCents: clampNonNegativeInteger(proof.amountVerifiedCents),
        ...(pledge?.createdAt ? { pledgedAt: pledge.createdAt } : {}),
        ...(proof.verifiedAt ? { countedAt: proof.verifiedAt } : {}),
        autoVerified: isAutoVerifiedProof(proof),
        verificationSource: "legacy_payment_proof" as const,
        reviewRequiredBeforeCounting: true as const,
      };
    });
}

export function buildMpgfPublicGoodsContributionKpiRecordsFromPersistedContributionRows({
  pledges,
  paymentEvents = [],
  providerPaymentEvents = [],
}: {
  pledges: MpgfPublicGoodsPledge[];
  paymentEvents?: MpgfPublicGoodsPaymentEventKpiRow[];
  providerPaymentEvents?: MpgfPublicGoodsProviderPaymentEventKpiRow[];
}): MpgfPublicGoodsContributionKpiRecord[] {
  const sharedPaymentsByPledgeId = groupBy(
    paymentEvents.filter(isCountableSharedPaymentEventForKpi),
    (event) => event.conditional_pledge_id,
  );
  const providerPaymentsByPledgeId = groupBy(
    providerPaymentEvents.filter(isCountableProviderPaymentEventForKpi),
    (event) => event.pledge_intent_id,
  );

  return pledges
    .filter(isEligiblePledge)
    .map((pledge) => {
      const sharedPaymentEvents = sharedPaymentsByPledgeId.get(pledge.id) ?? [];
      const providerPaymentEventsForPledge = providerPaymentsByPledgeId.get(pledge.id) ?? [];
      const countedEvent = firstCountedPaymentEventForPledge({
        pledge,
        sharedPaymentEvents,
        providerPaymentEvents: providerPaymentEventsForPledge,
      });
      const verificationSource = contributionVerificationSourceForEvent({
        pledge,
        sharedPaymentEvent: countedEvent?.sharedPaymentEvent,
        providerPaymentEvent: countedEvent?.providerPaymentEvent,
      });
      const provider = countedEvent?.provider;

      return {
        id: `persisted-contribution:${pledge.id}`,
        pledgeId: pledge.id,
        campaignId: pledge.campaignId,
        amountVerifiedCents: clampNonNegativeInteger(pledge.amountCents),
        pledgedAt: pledge.createdAt,
        ...(countedEvent?.countedAt ? { countedAt: countedEvent.countedAt } : {}),
        autoVerified: Boolean(provider && isProviderWebhookSource(provider)) && verificationSource !== "signed_intent_review",
        verificationSource,
        reviewRequiredBeforeCounting: true,
      };
    });
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
  contributionKpiRecords,
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
  contributionKpiRecords?: MpgfPublicGoodsContributionKpiRecord[];
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
  const pledgesById = new Map(pledges.map((pledge) => [pledge.id, pledge]));
  const fundingContributionRecords =
    contributionKpiRecords ??
    buildMpgfPublicGoodsContributionKpiRecordsFromPaymentProofs({
      paymentProofs,
      pledges,
    });
  const autoVerifiedContributionRecords = fundingContributionRecords.filter((record) => record.autoVerified);
  const manualVerifiedContributionRecords = fundingContributionRecords.filter((record) => !record.autoVerified);
  const hoursFromPledgeToCounted = fundingContributionRecords
    .map((record) => {
      const pledgedAt = record.pledgedAt ?? (record.pledgeId ? pledgesById.get(record.pledgeId)?.createdAt : undefined);
      const pledgedAtMs = parseDateMs(pledgedAt);
      const countedAtMs = parseDateMs(record.countedAt);

      if (pledgedAtMs == null || countedAtMs == null || countedAtMs < pledgedAtMs) {
        return null;
      }

      return roundHours((countedAtMs - pledgedAtMs) / (60 * 60 * 1000));
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
  const verifiedDollarsRoutedCents = fundingContributionRecords.reduce(
    (sum, record) => sum + clampNonNegativeInteger(record.amountVerifiedCents),
    0,
  );
  const clearedRecipientCents = payableDirectEligibleCents + matchAllocatedCents;
  const computedPublicMetricValues: Partial<Record<MpgfPublicGoodsPublicMetricLabel, number | null>> = {
    "gross-captured dollars": verifiedDollarsRoutedCents,
    "fee dollars excluded from public-good credit": 0,
    "net-recipient-cleared dollars": clearedRecipientCents,
    "actual-cleared dollars": clearedRecipientCents,
    "counted-cleared dollars": payableDirectEligibleCents,
    "match-eligible cleared dollars": payableDirectEligibleCents,
    "cleared cross-view dollars per sponsor dollar": rateBps(payableDirectEligibleCents, matchAllocatedCents),
    "threshold-clear rate": rateBps(thresholdClearedCampaignCount, campaigns.length),
    "base-match utilization": rateBps(roundAllocation.baseMatchAllocatedCents, roundAllocation.baseMatchBudgetCents),
    "base-match claim-vs-paid ratio": rateBps(roundAllocation.baseMatchAllocatedCents, roundAllocation.baseMatchAllocatedCents),
    "bonus-match utilization": rateBps(roundAllocation.qfBonusAllocatedCents, roundAllocation.qfBonusBudgetCents),
    "non-binding settlement-preview dollars excluded from clearing": 0,
    "base-match funded-vs-advertised ratio": rateBps(roundAllocation.baseMatchBudgetCents, roundAllocation.baseMatchBudgetCents),
    "bonus-match funded-vs-advertised ratio": rateBps(roundAllocation.qfBonusBudgetCents, roundAllocation.qfBonusBudgetCents),
    "success-reward utilization": 0,
    "coordination-credit units issued": 0,
    "coordination-credit no-allocation-power invariant violation count": 0,
    "impact-certificate units issued": 0,
    "impact-certificate late-access rejection count": 0,
    "sealed-pledge exact-progress exposure incident count": 0,
    "donor retention into next round": retainedRecurringDonors3MonthBps,
    "appeal rate": rateBps(appealCaseCount, Math.max(1, reviewCases.length)),
    "privacy incident count": 0,
    "pivotality calculator no-side-effect invariant violation count": 0,
    "moral-public-goods search-intent routed-to-CGB-card count": analyticsEvents.filter(
      (event) => event.event_type === "moral_public_goods_search_routed_to_cgb_card",
    ).length,
    "moral-public-goods search zero-state suppression count": analyticsEvents.filter(
      (event) => event.event_type === "moral_public_goods_zero_state_suppressed",
    ).length,
    "public-goods primary CTA click-through count": analyticsEvents.filter(
      (event) => event.event_type === "public_goods_primary_cta_clicked",
    ).length,
    "public-goods ordinary-offer drawer open count": analyticsEvents.filter(
      (event) => event.event_type === "public_goods_ordinary_offer_drawer_opened",
    ).length,
    "empty-filter default-render prevention count": analyticsEvents.filter(
      (event) => event.event_type === "public_goods_empty_filter_default_prevented",
    ).length,
    "public-goods mobile primary-CTA visibility failure count": 0,
    "public-goods search accessibility announcement failure count": 0,
  };

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
      verifiedDollarsRoutedCents,
      verifiedSupporterCountPerWinningCampaign: payableLines.length
        ? Math.round(payableLines.reduce((sum, line) => sum + line.verifiedSupporterCount, 0) / payableLines.length)
        : null,
      thresholdClearRateBps: rateBps(thresholdClearedCampaignCount, campaigns.length),
      sponsorLeverageRatioBps: rateBps(matchAllocatedCents, payableDirectEligibleCents),
      autoVerifiedContributionShareBps: rateBps(autoVerifiedContributionRecords.length, fundingContributionRecords.length),
      autoVerifiedContributionCount: autoVerifiedContributionRecords.length,
      manualVerifiedContributionCount: manualVerifiedContributionRecords.length,
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
    publicMetrics: buildMpgfPublicGoodsPublicMetricCatalog(computedPublicMetricValues),
  };
}

async function selectRowsWithFilter(
  supabase: SupabaseServiceAny,
  table: string,
  columns: string,
  filterQuery: (query: any) => any = (query) => query,
) {
  const result = await filterQuery(supabase.from(table).select(columns));

  if (result.error) {
    throw new Error(`Could not load MPGF public-goods KPI data from ${table}: ${result.error.message}`);
  }

  return ((result.data ?? []) as unknown[]).filter((row): row is Record<string, unknown> => Boolean(row && typeof row === "object"));
}

async function selectRows(supabase: SupabaseServiceAny, table: string, columns: string) {
  return selectRowsWithFilter(supabase, table, columns);
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
      ["external_receipt", "fiscal_host_webhook", "sponsor_signed_intent", "every_org_partner_webhook"] as const,
      "external_receipt",
    ),
    verifiedAt: readString(row, "verified_at") || undefined,
    createdAt: readString(row, "created_at", new Date("2026-05-29T12:00:00.000Z").toISOString()),
  };
}

function mapPaymentEventKpiRow(row: Record<string, unknown>): MpgfPublicGoodsPaymentEventKpiRow {
  return {
    id: readString(row, "id", "payment-event-unknown"),
    conditional_pledge_id: readNullableString(row, "conditional_pledge_id"),
    provider: readString(row, "provider", "manual_evidence"),
    provider_status: readString(row, "provider_status", "unknown"),
    amount_cents: clampNonNegativeInteger(readNumber(row, "amount_cents")),
    signature_verified: readBoolean(row, "signature_verified"),
    verified_at: readNullableString(row, "verified_at"),
    append_only_hash: readString(row, "append_only_hash", "sha256:missing"),
    created_at: readString(row, "created_at", new Date("2026-05-29T12:00:00.000Z").toISOString()),
  };
}

function mapProviderPaymentEventKpiRow(row: Record<string, unknown>): MpgfPublicGoodsProviderPaymentEventKpiRow {
  return {
    id: readString(row, "id", "provider-payment-event-unknown"),
    pledge_intent_id: readString(row, "pledge_intent_id", "pledge-intent-unknown"),
    provider: readString(row, "provider", "manual_evidence"),
    event_type: readString(row, "event_type", "unknown"),
    amount_cents: clampNonNegativeInteger(readNumber(row, "amount_cents")),
    status: readString(row, "status", "needs_review"),
    signature_verified: readBoolean(row, "signature_verified"),
    append_only_hash: readString(row, "append_only_hash", "sha256:missing"),
    received_at: readString(row, "received_at", new Date("2026-05-29T12:00:00.000Z").toISOString()),
    created_at: readString(row, "created_at", new Date("2026-05-29T12:00:00.000Z").toISOString()),
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
  const reviewCases = reviewRows.map(mapReviewCaseRow);
  const legacyPledges = pledgeRows.map(mapPledgeRow);
  const legacyPaymentProofs = proofRows.map(mapPaymentProofRow);
  const subscriptions = subscriptionRows.map(mapSubscriptionRow);
  const rounds = roundRows.map(mapRoundRow);
  const matchPools = matchPoolRows.map(mapMatchPoolRow);
  const round = rounds[0] ?? demoMpgfAssuranceRound;
  const matchPool = matchPools.find((candidate) => candidate.id === round.matchPoolId) ?? matchPools[0] ?? demoMpgfMatchPool;
  const contributionWarnings: string[] = [];
  const contributionLoad = await loadMpgfPublicGoodsAllocationContributionRecords({ roundId: round.id }).catch((error) => {
    contributionWarnings.push(
      error instanceof Error
        ? `Could not load persisted conditional contribution records for KPI snapshot: ${error.message}`
        : "Could not load persisted conditional contribution records for KPI snapshot.",
    );

    return null;
  });
  const usePersistedContributions = Boolean(contributionLoad && contributionLoad.rawConditionalPledgeCount > 0);
  const pledges = usePersistedContributions ? contributionLoad?.pledges ?? [] : legacyPledges;
  const persistedPledgeIds = pledges.map((pledge) => pledge.id).filter((id) => id.trim());
  const [paymentEventRows, providerPaymentEventRows] =
    usePersistedContributions && persistedPledgeIds.length > 0
      ? await Promise.all([
          selectRowsWithFilter(
            supabase,
            "mpgf_payment_events",
            "id, conditional_pledge_id, provider, provider_status, amount_cents, signature_verified, verified_at, append_only_hash, created_at",
            (query) => query.in("conditional_pledge_id", persistedPledgeIds),
          ),
          selectRowsWithFilter(
            supabase,
            "mpgf_provider_payment_events",
            "id, pledge_intent_id, provider, event_type, amount_cents, status, signature_verified, append_only_hash, received_at, created_at",
            (query) => query.in("pledge_intent_id", persistedPledgeIds),
          ),
        ]).catch((error) => {
          contributionWarnings.push(
            error instanceof Error
              ? `Could not load persisted provider event records for KPI snapshot: ${error.message}`
              : "Could not load persisted provider event records for KPI snapshot.",
          );

          return [[], []] as [Record<string, unknown>[], Record<string, unknown>[]];
        })
      : [[], []];
  const contributionKpiRecords = usePersistedContributions
    ? buildMpgfPublicGoodsContributionKpiRecordsFromPersistedContributionRows({
        pledges,
        paymentEvents: paymentEventRows.map(mapPaymentEventKpiRow),
        providerPaymentEvents: providerPaymentEventRows.map(mapProviderPaymentEventKpiRow),
      })
    : undefined;
  const paymentProofs = legacyPaymentProofs;
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
      contributionKpiRecords,
      subscriptions,
      analyticsEvents,
      round,
      matchPool,
      campaignStartAtById,
      generatedAt,
      dataSource: campaignRows.length > 0 ? "database" : "demo_fixture",
    }),
    warnings: [
      ...(campaignRows.length > 0 ? [] : ["No database campaigns found; KPI snapshot fell back to demo fixtures."]),
      ...(contributionLoad?.warnings ?? []),
      ...contributionWarnings,
    ],
  };
}
