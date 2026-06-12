export const MORAL_TRADE_NON_PUBLIC_GOODS_SUBSIDY_CONTRACT_VERSION =
  "moral-trade-non-public-goods-subsidy-v0.1-2026-06";
export const MORAL_TRADE_NON_PUBLIC_GOODS_SUBSIDY_VALIDATOR_VERSION =
  "moral-trade-non-public-goods-subsidy-validator-v0.1";

export type MoralTradeNonPublicGoodsSubsidyTransition =
  | "subsidy_pool_activation"
  | "subsidy_schedule_preview"
  | "subsidy_schedule_reservation"
  | "matched_trade_lock"
  | "payment_authorization"
  | "payment_capture"
  | "public_metric_publication"
  | "release_gate_promotion"
  | "subsidy_refund_or_carry_forward";

export type MoralTradeNonPublicGoodsSubsidyTradeType =
  | "donation_offset"
  | "pledge_swap"
  | "compensated_moral_action"
  | "manual_review";

export type MoralTradeNonPublicGoodsSubsidyTier =
  | "tier_1_money_only_donation_offset"
  | "tier_2_donation_offset_with_abstention_or_additionality_proof"
  | "tier_3_closed_counterparty_pledge_swap"
  | "tier_4_open_market_pledge_swap_or_compensated_action";

export type MoralTradeNonPublicGoodsSubsidySourceReviewState =
  | "not_started"
  | "under_review"
  | "non_blocking"
  | "blocked"
  | "manual_review"
  | "superseded";

export type MoralTradeNonPublicGoodsSubsidyConflictState =
  | "not_started"
  | "under_review"
  | "non_blocking"
  | "disclosed_nonblocking"
  | "blocked"
  | "manual_review"
  | "superseded";

export type MoralTradeNonPublicGoodsSubsidyDisclosureLevel =
  | "aggregate_only"
  | "source_bucket"
  | "named_sponsor"
  | "manual_review"
  | "undisclosed";

export type MoralTradeNonPublicGoodsSubsidyRefundPolicy =
  | "return_to_sponsor"
  | "carry_forward"
  | "manual_review";

export type MoralTradeNonPublicGoodsSubsidyPoolState =
  | "draft"
  | "active"
  | "paused"
  | "exhausted"
  | "closed"
  | "superseded"
  | "blocked";

export type MoralTradeNonPublicGoodsSubsidyType =
  | "fixed_bonus"
  | "ratio_match"
  | "fee_offset"
  | "verification_cost_coverage"
  | "manual_review";

export type MoralTradeNonPublicGoodsSubsidyScheduleState =
  | "previewed"
  | "reserved"
  | "applied"
  | "released"
  | "cancelled"
  | "refunded"
  | "superseded"
  | "blocked";

export type MoralTradeNonPublicGoodsSubsidyPolicyStatus =
  | "resolved_immutable"
  | "missing"
  | "mutable"
  | "stale"
  | "superseded";

export interface MoralTradeNonPublicGoodsSubsidyPoolRecord {
  poolId: string;
  sponsorIdHash: string;
  policySnapshotRef: string;
  policyStatus: MoralTradeNonPublicGoodsSubsidyPolicyStatus;
  poolHash: string;
  appliesToTradeType: MoralTradeNonPublicGoodsSubsidyTradeType;
  appliesToTiers: MoralTradeNonPublicGoodsSubsidyTier[];
  totalBudgetCents: number;
  settlementCurrency: string;
  sourceOfFundsReviewState: MoralTradeNonPublicGoodsSubsidySourceReviewState;
  sponsorConflictOfInterestState: MoralTradeNonPublicGoodsSubsidyConflictState;
  allowedCauseBucketTaxonomyRefs: string[];
  allowedRecipientOrDestinationClasses: string[];
  eligibilityRuleHash: string;
  allocationScheduleHash: string;
  maxSubsidyPerParticipantCents: number;
  maxSubsidyPerTradeCents: number;
  maxSubsidyRatioBps: number;
  publicDisclosureLevel: MoralTradeNonPublicGoodsSubsidyDisclosureLevel;
  refundOrCarryForwardPolicy: MoralTradeNonPublicGoodsSubsidyRefundPolicy;
  poolState: MoralTradeNonPublicGoodsSubsidyPoolState;
  reviewerDecisionRef: string | null;
  reviewedAt: string;
  expiresAt: string | null;
  supersededBy: string | null;
  sponsorIdentityPublic: boolean;
  privateSourceDetailsPublic: boolean;
  reviewerNotesPublic: boolean;
}

export interface MoralTradeNonPublicGoodsSubsidyScheduleRecord {
  scheduleId: string;
  poolRef: string;
  matchingClearingRunRef: string;
  matchedTradeLockProposalRef: string | null;
  clearedTradeAgreementRef: string | null;
  subsidyType: MoralTradeNonPublicGoodsSubsidyType;
  eligibilityInputHash: string;
  scheduleHash: string;
  subsidyAmountCents: number;
  subsidyRatioBps: number;
  capBinding: boolean;
  participantMoralTradeVolumeExclusion: boolean;
  directContributionExclusion: boolean;
  impactClaimExclusion: boolean;
  counterpartyDistinctnessExclusion: boolean;
  subsidyState: MoralTradeNonPublicGoodsSubsidyScheduleState;
  reviewerDecisionRef: string | null;
  createdAt: string;
  updatedAt: string;
  rawEligibilityInputPublic: boolean;
  participantSpecificSubsidyPublic: boolean;
  privateSponsorTermsPublic: boolean;
}

export interface MoralTradeNonPublicGoodsSubsidyTransitionDefinition {
  key: MoralTradeNonPublicGoodsSubsidyTransition;
  label: string;
  requiresActiveFrozenPoolWhenRequired: boolean;
  requiresScheduleRecordWhenRequired: boolean;
  requiresCapAndEligibilityChecks: boolean;
  requiresMetricExclusion: boolean;
  userFacingBlockerCategory: string;
}

export interface MoralTradeNonPublicGoodsSubsidyEvaluationInput {
  transition: MoralTradeNonPublicGoodsSubsidyTransition;
  subsidyRequired: boolean;
  checkedAt?: string;
  pools: MoralTradeNonPublicGoodsSubsidyPoolRecord[];
  schedules: MoralTradeNonPublicGoodsSubsidyScheduleRecord[];
}

export interface MoralTradeNonPublicGoodsSubsidyEvaluation {
  status: "pass" | "blocked";
  transition: MoralTradeNonPublicGoodsSubsidyTransition;
  checkedAt: string;
  subsidyRequired: boolean;
  activePoolCount: number;
  eligibleScheduleCount: number;
  frozenPolicyCount: number;
  capCheckedScheduleCount: number;
  metricExcludedScheduleCount: number;
  blockers: string[];
  userFacingBlockerCategories: string[];
}

export interface MoralTradeNonPublicGoodsSubsidyCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradeNonPublicGoodsSubsidyValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-non-public-goods-subsidy-contract";
  validatorVersion: string;
  contractVersion: string;
  checks: MoralTradeNonPublicGoodsSubsidyCheck[];
  blockers: string[];
}

export interface MoralTradeNonPublicGoodsSubsidyContract {
  version: string;
  purpose: string;
  failClosedRule: string;
  privacyBoundary: string;
  metricExclusionRule: string;
  firstClassRecordTables: string[];
  policySnapshotSubjects: string[];
  tradeTypes: MoralTradeNonPublicGoodsSubsidyTradeType[];
  allowedLaunchTiers: MoralTradeNonPublicGoodsSubsidyTier[];
  sourceReviewStates: MoralTradeNonPublicGoodsSubsidySourceReviewState[];
  conflictStates: MoralTradeNonPublicGoodsSubsidyConflictState[];
  disclosureLevels: MoralTradeNonPublicGoodsSubsidyDisclosureLevel[];
  refundPolicies: MoralTradeNonPublicGoodsSubsidyRefundPolicy[];
  poolStates: MoralTradeNonPublicGoodsSubsidyPoolState[];
  subsidyTypes: MoralTradeNonPublicGoodsSubsidyType[];
  scheduleStates: MoralTradeNonPublicGoodsSubsidyScheduleState[];
  policyStatuses: MoralTradeNonPublicGoodsSubsidyPolicyStatus[];
  transitionDefinitions: MoralTradeNonPublicGoodsSubsidyTransitionDefinition[];
  sampleEvaluations: MoralTradeNonPublicGoodsSubsidyEvaluation[];
  contractTests: string[];
}

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
const MAX_POOL_AGE_DAYS = 120;

const FIRST_CLASS_RECORD_TABLES = [
  "moral_trade_non_public_goods_subsidy_pools",
  "moral_trade_subsidy_schedule_records",
] as const;

const POLICY_SNAPSHOT_SUBJECTS = [
  "non_public_goods_subsidy",
  "subsidy_schedule",
] as const;

const TRADE_TYPES: MoralTradeNonPublicGoodsSubsidyTradeType[] = [
  "donation_offset",
  "pledge_swap",
  "compensated_moral_action",
  "manual_review",
];

const ALLOWED_LAUNCH_TIERS: MoralTradeNonPublicGoodsSubsidyTier[] = [
  "tier_1_money_only_donation_offset",
];

const ALL_TIERS: MoralTradeNonPublicGoodsSubsidyTier[] = [
  "tier_1_money_only_donation_offset",
  "tier_2_donation_offset_with_abstention_or_additionality_proof",
  "tier_3_closed_counterparty_pledge_swap",
  "tier_4_open_market_pledge_swap_or_compensated_action",
];

const SOURCE_REVIEW_STATES: MoralTradeNonPublicGoodsSubsidySourceReviewState[] = [
  "not_started",
  "under_review",
  "non_blocking",
  "blocked",
  "manual_review",
  "superseded",
];

const CONFLICT_STATES: MoralTradeNonPublicGoodsSubsidyConflictState[] = [
  "not_started",
  "under_review",
  "non_blocking",
  "disclosed_nonblocking",
  "blocked",
  "manual_review",
  "superseded",
];

const DISCLOSURE_LEVELS: MoralTradeNonPublicGoodsSubsidyDisclosureLevel[] = [
  "aggregate_only",
  "source_bucket",
  "named_sponsor",
  "manual_review",
  "undisclosed",
];

const REFUND_POLICIES: MoralTradeNonPublicGoodsSubsidyRefundPolicy[] = [
  "return_to_sponsor",
  "carry_forward",
  "manual_review",
];

const POOL_STATES: MoralTradeNonPublicGoodsSubsidyPoolState[] = [
  "draft",
  "active",
  "paused",
  "exhausted",
  "closed",
  "superseded",
  "blocked",
];

const SUBSIDY_TYPES: MoralTradeNonPublicGoodsSubsidyType[] = [
  "fixed_bonus",
  "ratio_match",
  "fee_offset",
  "verification_cost_coverage",
  "manual_review",
];

const SCHEDULE_STATES: MoralTradeNonPublicGoodsSubsidyScheduleState[] = [
  "previewed",
  "reserved",
  "applied",
  "released",
  "cancelled",
  "refunded",
  "superseded",
  "blocked",
];

const POLICY_STATUSES: MoralTradeNonPublicGoodsSubsidyPolicyStatus[] = [
  "resolved_immutable",
  "missing",
  "mutable",
  "stale",
  "superseded",
];

const NON_BLOCKING_SCHEDULE_STATES =
  new Set<MoralTradeNonPublicGoodsSubsidyScheduleState>([
    "previewed",
    "reserved",
    "applied",
    "released",
  ]);

const TRANSITIONS: MoralTradeNonPublicGoodsSubsidyTransitionDefinition[] = [
  {
    key: "subsidy_pool_activation",
    label: "Subsidy pool activation",
    requiresActiveFrozenPoolWhenRequired: true,
    requiresScheduleRecordWhenRequired: false,
    requiresCapAndEligibilityChecks: true,
    requiresMetricExclusion: true,
    userFacingBlockerCategory:
      "Subsidy pool needs frozen sponsor, source, cap, disclosure, and refund rules before use",
  },
  {
    key: "subsidy_schedule_preview",
    label: "Subsidy schedule preview",
    requiresActiveFrozenPoolWhenRequired: true,
    requiresScheduleRecordWhenRequired: true,
    requiresCapAndEligibilityChecks: true,
    requiresMetricExclusion: true,
    userFacingBlockerCategory:
      "Subsidy schedule needs eligibility, cap, and metric-exclusion checks",
  },
  {
    key: "subsidy_schedule_reservation",
    label: "Subsidy schedule reservation",
    requiresActiveFrozenPoolWhenRequired: true,
    requiresScheduleRecordWhenRequired: true,
    requiresCapAndEligibilityChecks: true,
    requiresMetricExclusion: true,
    userFacingBlockerCategory:
      "Subsidy reservation needs active budget and non-inflating schedule records",
  },
  {
    key: "matched_trade_lock",
    label: "Matched-trade lock",
    requiresActiveFrozenPoolWhenRequired: true,
    requiresScheduleRecordWhenRequired: true,
    requiresCapAndEligibilityChecks: true,
    requiresMetricExclusion: true,
    userFacingBlockerCategory:
      "Matched trade cannot lock with an unfrozen, over-cap, conflicted, or metric-inflating subsidy",
  },
  {
    key: "payment_authorization",
    label: "Payment authorization",
    requiresActiveFrozenPoolWhenRequired: true,
    requiresScheduleRecordWhenRequired: true,
    requiresCapAndEligibilityChecks: true,
    requiresMetricExclusion: true,
    userFacingBlockerCategory:
      "Payment authorization waits for subsidy source, conflict, cap, and exclusion checks",
  },
  {
    key: "payment_capture",
    label: "Payment capture",
    requiresActiveFrozenPoolWhenRequired: true,
    requiresScheduleRecordWhenRequired: true,
    requiresCapAndEligibilityChecks: true,
    requiresMetricExclusion: true,
    userFacingBlockerCategory:
      "Payment capture waits for governed subsidy schedule and refund/carry-forward policy",
  },
  {
    key: "public_metric_publication",
    label: "Public metric publication",
    requiresActiveFrozenPoolWhenRequired: true,
    requiresScheduleRecordWhenRequired: true,
    requiresCapAndEligibilityChecks: true,
    requiresMetricExclusion: true,
    userFacingBlockerCategory:
      "Public metrics must exclude subsidy dollars from participant moral-trade volume, direct contribution, impact, and counterparty distinctness",
  },
  {
    key: "release_gate_promotion",
    label: "Release-gate promotion",
    requiresActiveFrozenPoolWhenRequired: true,
    requiresScheduleRecordWhenRequired: true,
    requiresCapAndEligibilityChecks: true,
    requiresMetricExclusion: true,
    userFacingBlockerCategory:
      "Release promotion requires frozen subsidy governance and non-inflating metrics",
  },
  {
    key: "subsidy_refund_or_carry_forward",
    label: "Subsidy refund or carry-forward",
    requiresActiveFrozenPoolWhenRequired: true,
    requiresScheduleRecordWhenRequired: true,
    requiresCapAndEligibilityChecks: true,
    requiresMetricExclusion: true,
    userFacingBlockerCategory:
      "Unused subsidy handling must follow the frozen refund or carry-forward policy",
  },
];

const CONTRACT_TESTS = [
  "non_public_goods_subsidy_contract_validator",
  "non_public_goods_subsidy_fail_closed_without_frozen_pool",
  "non_public_goods_subsidy_cap_and_metric_exclusion_blocking",
  "non_public_goods_subsidy_privacy_boundary",
  "non_public_goods_subsidy_route_health_api_schema_wiring",
] as const;

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeNonPublicGoodsSubsidyCheck {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

function hasValidHash(value: string) {
  return HASH_PATTERN.test(value);
}

function parseDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const time = Date.parse(value);

  return Number.isFinite(time) ? new Date(time) : null;
}

function isExpired(expiresAt: string | null, checkedAt: Date) {
  const expires = parseDate(expiresAt);

  return Boolean(expires && expires.getTime() <= checkedAt.getTime());
}

function ageDays(reviewedAt: string, checkedAt: Date) {
  const reviewed = parseDate(reviewedAt);

  if (!reviewed) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.max(
    0,
    (checkedAt.getTime() - reviewed.getTime()) / (24 * 60 * 60 * 1000),
  );
}

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

function transitionDefinition(key: MoralTradeNonPublicGoodsSubsidyTransition) {
  return TRANSITIONS.find((transition) => transition.key === key) ?? TRANSITIONS[0];
}

function poolIsActiveFrozen(
  pool: MoralTradeNonPublicGoodsSubsidyPoolRecord,
  checkedAt: Date,
) {
  return (
    pool.poolState === "active" &&
    pool.policyStatus === "resolved_immutable" &&
    pool.sourceOfFundsReviewState === "non_blocking" &&
    (pool.sponsorConflictOfInterestState === "non_blocking" ||
      pool.sponsorConflictOfInterestState === "disclosed_nonblocking") &&
    pool.appliesToTradeType === "donation_offset" &&
    pool.appliesToTiers.length > 0 &&
    pool.appliesToTiers.every((tier) => ALLOWED_LAUNCH_TIERS.includes(tier)) &&
    pool.totalBudgetCents > 0 &&
    pool.maxSubsidyPerParticipantCents > 0 &&
    pool.maxSubsidyPerTradeCents > 0 &&
    pool.maxSubsidyPerTradeCents <= pool.totalBudgetCents &&
    pool.maxSubsidyPerParticipantCents <= pool.totalBudgetCents &&
    pool.maxSubsidyRatioBps > 0 &&
    pool.maxSubsidyRatioBps <= 10_000 &&
    pool.allowedCauseBucketTaxonomyRefs.length > 0 &&
    pool.allowedRecipientOrDestinationClasses.length > 0 &&
    pool.publicDisclosureLevel !== "undisclosed" &&
    pool.publicDisclosureLevel !== "manual_review" &&
    pool.refundOrCarryForwardPolicy !== "manual_review" &&
    hasValidHash(pool.sponsorIdHash) &&
    hasValidHash(pool.poolHash) &&
    hasValidHash(pool.eligibilityRuleHash) &&
    hasValidHash(pool.allocationScheduleHash) &&
    pool.reviewerDecisionRef !== null &&
    ageDays(pool.reviewedAt, checkedAt) <= MAX_POOL_AGE_DAYS &&
    !isExpired(pool.expiresAt, checkedAt) &&
    !pool.supersededBy &&
    !pool.sponsorIdentityPublic &&
    !pool.privateSourceDetailsPublic &&
    !pool.reviewerNotesPublic
  );
}

function scheduleIsEligible(
  schedule: MoralTradeNonPublicGoodsSubsidyScheduleRecord,
  pool: MoralTradeNonPublicGoodsSubsidyPoolRecord,
) {
  return (
    schedule.poolRef === pool.poolId &&
    NON_BLOCKING_SCHEDULE_STATES.has(schedule.subsidyState) &&
    schedule.subsidyType !== "manual_review" &&
    schedule.matchingClearingRunRef.trim().length > 0 &&
    hasValidHash(schedule.eligibilityInputHash) &&
    hasValidHash(schedule.scheduleHash) &&
    schedule.subsidyAmountCents >= 0 &&
    schedule.subsidyAmountCents <= pool.maxSubsidyPerTradeCents &&
    schedule.subsidyAmountCents <= pool.totalBudgetCents &&
    schedule.subsidyRatioBps >= 0 &&
    schedule.subsidyRatioBps <= pool.maxSubsidyRatioBps &&
    schedule.capBinding &&
    schedule.participantMoralTradeVolumeExclusion &&
    schedule.directContributionExclusion &&
    schedule.impactClaimExclusion &&
    schedule.counterpartyDistinctnessExclusion &&
    schedule.reviewerDecisionRef !== null &&
    !schedule.rawEligibilityInputPublic &&
    !schedule.participantSpecificSubsidyPublic &&
    !schedule.privateSponsorTermsPublic
  );
}

function collectPoolBlockers(
  pool: MoralTradeNonPublicGoodsSubsidyPoolRecord,
  checkedAt: Date,
) {
  const blockers: string[] = [];
  const id = pool.poolId || "unknown-pool";

  if (pool.policyStatus !== "resolved_immutable") {
    blockers.push(`subsidy_policy_not_immutable:${id}:${pool.policyStatus}`);
  }

  if (pool.poolState !== "active") {
    blockers.push(`subsidy_pool_not_active:${id}:${pool.poolState}`);
  }

  if (pool.sourceOfFundsReviewState !== "non_blocking") {
    blockers.push(
      `subsidy_source_of_funds_not_non_blocking:${id}:${pool.sourceOfFundsReviewState}`,
    );
  }

  if (
    pool.sponsorConflictOfInterestState !== "non_blocking" &&
    pool.sponsorConflictOfInterestState !== "disclosed_nonblocking"
  ) {
    blockers.push(
      `subsidy_conflict_review_not_non_blocking:${id}:${pool.sponsorConflictOfInterestState}`,
    );
  }

  if (pool.appliesToTradeType !== "donation_offset") {
    blockers.push(`subsidy_trade_type_not_low_risk_donation_offset:${id}:${pool.appliesToTradeType}`);
  }

  const disallowedTiers = pool.appliesToTiers.filter(
    (tier) => !ALLOWED_LAUNCH_TIERS.includes(tier),
  );

  if (pool.appliesToTiers.length === 0 || disallowedTiers.length > 0) {
    blockers.push(
      `subsidy_tier_scope_not_low_risk:${id}:${disallowedTiers.join(",") || "missing"}`,
    );
  }

  if (
    pool.totalBudgetCents <= 0 ||
    pool.maxSubsidyPerParticipantCents <= 0 ||
    pool.maxSubsidyPerTradeCents <= 0 ||
    pool.maxSubsidyPerTradeCents > pool.totalBudgetCents ||
    pool.maxSubsidyPerParticipantCents > pool.totalBudgetCents ||
    pool.maxSubsidyRatioBps <= 0 ||
    pool.maxSubsidyRatioBps > 10_000
  ) {
    blockers.push(`subsidy_caps_invalid:${id}`);
  }

  if (pool.allowedCauseBucketTaxonomyRefs.length === 0) {
    blockers.push(`subsidy_cause_bucket_eligibility_missing:${id}`);
  }

  if (pool.allowedRecipientOrDestinationClasses.length === 0) {
    blockers.push(`subsidy_recipient_destination_eligibility_missing:${id}`);
  }

  if (pool.publicDisclosureLevel === "undisclosed" || pool.publicDisclosureLevel === "manual_review") {
    blockers.push(`subsidy_public_disclosure_not_frozen:${id}:${pool.publicDisclosureLevel}`);
  }

  if (pool.refundOrCarryForwardPolicy === "manual_review") {
    blockers.push(`subsidy_refund_carry_forward_policy_manual_review:${id}`);
  }

  if (!hasValidHash(pool.sponsorIdHash)) {
    blockers.push(`subsidy_sponsor_hash_invalid:${id}`);
  }

  if (!hasValidHash(pool.poolHash)) {
    blockers.push(`subsidy_pool_hash_invalid:${id}`);
  }

  if (!hasValidHash(pool.eligibilityRuleHash)) {
    blockers.push(`subsidy_eligibility_rule_hash_invalid:${id}`);
  }

  if (!hasValidHash(pool.allocationScheduleHash)) {
    blockers.push(`subsidy_allocation_schedule_hash_invalid:${id}`);
  }

  if (!pool.reviewerDecisionRef) {
    blockers.push(`subsidy_reviewer_decision_missing:${id}`);
  }

  if (ageDays(pool.reviewedAt, checkedAt) > MAX_POOL_AGE_DAYS) {
    blockers.push(`subsidy_pool_review_stale:${id}`);
  }

  if (isExpired(pool.expiresAt, checkedAt)) {
    blockers.push(`subsidy_pool_expired:${id}`);
  }

  if (pool.supersededBy) {
    blockers.push(`subsidy_pool_superseded:${id}`);
  }

  if (pool.sponsorIdentityPublic) {
    blockers.push(`subsidy_sponsor_identity_public:${id}`);
  }

  if (pool.privateSourceDetailsPublic) {
    blockers.push(`subsidy_private_source_details_public:${id}`);
  }

  if (pool.reviewerNotesPublic) {
    blockers.push(`subsidy_reviewer_notes_public:${id}`);
  }

  return blockers;
}

function collectScheduleBlockers(
  schedule: MoralTradeNonPublicGoodsSubsidyScheduleRecord,
  pool: MoralTradeNonPublicGoodsSubsidyPoolRecord | null,
) {
  const blockers: string[] = [];
  const id = schedule.scheduleId || "unknown-schedule";

  if (!pool) {
    blockers.push(`subsidy_schedule_pool_missing:${id}:${schedule.poolRef || "missing"}`);
    return blockers;
  }

  if (!NON_BLOCKING_SCHEDULE_STATES.has(schedule.subsidyState)) {
    blockers.push(`subsidy_schedule_not_non_blocking:${id}:${schedule.subsidyState}`);
  }

  if (schedule.subsidyType === "manual_review") {
    blockers.push(`subsidy_schedule_type_manual_review:${id}`);
  }

  if (!schedule.matchingClearingRunRef.trim()) {
    blockers.push(`subsidy_matching_clearing_run_missing:${id}`);
  }

  if (!hasValidHash(schedule.eligibilityInputHash)) {
    blockers.push(`subsidy_schedule_eligibility_hash_invalid:${id}`);
  }

  if (!hasValidHash(schedule.scheduleHash)) {
    blockers.push(`subsidy_schedule_hash_invalid:${id}`);
  }

  if (
    schedule.subsidyAmountCents < 0 ||
    schedule.subsidyAmountCents > pool.maxSubsidyPerTradeCents ||
    schedule.subsidyAmountCents > pool.totalBudgetCents
  ) {
    blockers.push(`subsidy_amount_exceeds_cap:${id}`);
  }

  if (
    schedule.subsidyRatioBps < 0 ||
    schedule.subsidyRatioBps > pool.maxSubsidyRatioBps
  ) {
    blockers.push(`subsidy_ratio_exceeds_cap:${id}`);
  }

  if (!schedule.capBinding) {
    blockers.push(`subsidy_cap_check_missing:${id}`);
  }

  if (!schedule.participantMoralTradeVolumeExclusion) {
    blockers.push(`subsidy_moral_trade_volume_exclusion_missing:${id}`);
  }

  if (!schedule.directContributionExclusion) {
    blockers.push(`subsidy_direct_contribution_exclusion_missing:${id}`);
  }

  if (!schedule.impactClaimExclusion) {
    blockers.push(`subsidy_impact_claim_exclusion_missing:${id}`);
  }

  if (!schedule.counterpartyDistinctnessExclusion) {
    blockers.push(`subsidy_counterparty_distinctness_exclusion_missing:${id}`);
  }

  if (!schedule.reviewerDecisionRef) {
    blockers.push(`subsidy_schedule_reviewer_decision_missing:${id}`);
  }

  if (schedule.rawEligibilityInputPublic) {
    blockers.push(`subsidy_raw_eligibility_input_public:${id}`);
  }

  if (schedule.participantSpecificSubsidyPublic) {
    blockers.push(`subsidy_participant_specific_subsidy_public:${id}`);
  }

  if (schedule.privateSponsorTermsPublic) {
    blockers.push(`subsidy_private_sponsor_terms_public:${id}`);
  }

  return blockers;
}

export function evaluateMoralTradeNonPublicGoodsSubsidy(
  input: MoralTradeNonPublicGoodsSubsidyEvaluationInput,
): MoralTradeNonPublicGoodsSubsidyEvaluation {
  const checkedAt = parseDate(input.checkedAt) ?? new Date();
  const transition = transitionDefinition(input.transition);
  const blockers: string[] = [];

  if (!input.subsidyRequired) {
    const privacyBlockers = [
      ...input.pools.flatMap((pool) =>
        collectPoolBlockers(pool, checkedAt).filter((blocker) =>
          /public|private|reviewer_notes/.test(blocker),
        ),
      ),
      ...input.schedules.flatMap((schedule) =>
        collectScheduleBlockers(
          schedule,
          input.pools.find((pool) => pool.poolId === schedule.poolRef) ?? null,
        ).filter((blocker) => /public|private/.test(blocker)),
      ),
    ];

    return {
      status: privacyBlockers.length ? "blocked" : "pass",
      transition: input.transition,
      checkedAt: checkedAt.toISOString(),
      subsidyRequired: false,
      activePoolCount: 0,
      eligibleScheduleCount: 0,
      frozenPolicyCount: 0,
      capCheckedScheduleCount: 0,
      metricExcludedScheduleCount: 0,
      blockers: unique(privacyBlockers),
      userFacingBlockerCategories: privacyBlockers.length
        ? ["Private subsidy details cannot be published"]
        : [],
    };
  }

  if (transition.requiresActiveFrozenPoolWhenRequired && input.pools.length === 0) {
    blockers.push("subsidy_pool_missing");
  }

  const activePools = input.pools.filter((pool) => poolIsActiveFrozen(pool, checkedAt));
  const poolById = new Map(input.pools.map((pool) => [pool.poolId, pool]));

  for (const pool of input.pools) {
    blockers.push(...collectPoolBlockers(pool, checkedAt));
  }

  if (transition.requiresActiveFrozenPoolWhenRequired && activePools.length === 0) {
    blockers.push("active_frozen_subsidy_pool_missing");
  }

  if (transition.requiresScheduleRecordWhenRequired && input.schedules.length === 0) {
    blockers.push("subsidy_schedule_record_missing");
  }

  const eligibleSchedules = input.schedules.filter((schedule) => {
    const pool = poolById.get(schedule.poolRef);
    return Boolean(pool && scheduleIsEligible(schedule, pool));
  });

  for (const schedule of input.schedules) {
    blockers.push(...collectScheduleBlockers(schedule, poolById.get(schedule.poolRef) ?? null));
  }

  if (
    transition.requiresScheduleRecordWhenRequired &&
    input.schedules.length > 0 &&
    eligibleSchedules.length === 0
  ) {
    blockers.push("eligible_subsidy_schedule_missing");
  }

  const capCheckedScheduleCount = input.schedules.filter((schedule) => schedule.capBinding).length;
  const metricExcludedScheduleCount = input.schedules.filter(
    (schedule) =>
      schedule.participantMoralTradeVolumeExclusion &&
      schedule.directContributionExclusion &&
      schedule.impactClaimExclusion &&
      schedule.counterpartyDistinctnessExclusion,
  ).length;

  return {
    status: blockers.length ? "blocked" : "pass",
    transition: input.transition,
    checkedAt: checkedAt.toISOString(),
    subsidyRequired: true,
    activePoolCount: activePools.length,
    eligibleScheduleCount: eligibleSchedules.length,
    frozenPolicyCount: input.pools.filter(
      (pool) => pool.policyStatus === "resolved_immutable",
    ).length,
    capCheckedScheduleCount,
    metricExcludedScheduleCount,
    blockers: unique(blockers),
    userFacingBlockerCategories: blockers.length
      ? [transition.userFacingBlockerCategory]
      : [],
  };
}

function hashFor(seed: string) {
  const hexSeed = Array.from(seed)
    .map((character) => character.charCodeAt(0).toString(16).padStart(2, "0"))
    .join("");

  return `sha256:${hexSeed.padEnd(64, "a").slice(0, 64)}`;
}

const DEMO_POOL: MoralTradeNonPublicGoodsSubsidyPoolRecord = {
  poolId: "subsidy-pool:tier-1-donation-offset",
  sponsorIdHash: hashFor("sponsor"),
  policySnapshotRef: "policy-snapshot:non-public-goods-subsidy",
  policyStatus: "resolved_immutable",
  poolHash: hashFor("pool"),
  appliesToTradeType: "donation_offset",
  appliesToTiers: ["tier_1_money_only_donation_offset"],
  totalBudgetCents: 250_000,
  settlementCurrency: "USD",
  sourceOfFundsReviewState: "non_blocking",
  sponsorConflictOfInterestState: "disclosed_nonblocking",
  allowedCauseBucketTaxonomyRefs: ["cause-taxonomy:plural-reviewed-v1"],
  allowedRecipientOrDestinationClasses: ["verified_501c3_public_charity"],
  eligibilityRuleHash: hashFor("eligibility"),
  allocationScheduleHash: hashFor("allocation-schedule"),
  maxSubsidyPerParticipantCents: 5_000,
  maxSubsidyPerTradeCents: 10_000,
  maxSubsidyRatioBps: 2_500,
  publicDisclosureLevel: "source_bucket",
  refundOrCarryForwardPolicy: "carry_forward",
  poolState: "active",
  reviewerDecisionRef: "review-decision:subsidy-pool",
  reviewedAt: "2026-06-01T00:00:00.000Z",
  expiresAt: "2026-09-01T00:00:00.000Z",
  supersededBy: null,
  sponsorIdentityPublic: false,
  privateSourceDetailsPublic: false,
  reviewerNotesPublic: false,
};

const DEMO_SCHEDULE: MoralTradeNonPublicGoodsSubsidyScheduleRecord = {
  scheduleId: "subsidy-schedule:tier-1-offset",
  poolRef: DEMO_POOL.poolId,
  matchingClearingRunRef: "matching-clearing-run:tier-1-offset",
  matchedTradeLockProposalRef: "matched-trade-lock-proposal:tier-1-offset",
  clearedTradeAgreementRef: null,
  subsidyType: "fee_offset",
  eligibilityInputHash: hashFor("eligibility-input"),
  scheduleHash: hashFor("schedule"),
  subsidyAmountCents: 2_500,
  subsidyRatioBps: 1_000,
  capBinding: true,
  participantMoralTradeVolumeExclusion: true,
  directContributionExclusion: true,
  impactClaimExclusion: true,
  counterpartyDistinctnessExclusion: true,
  subsidyState: "reserved",
  reviewerDecisionRef: "review-decision:subsidy-schedule",
  createdAt: "2026-06-01T01:00:00.000Z",
  updatedAt: "2026-06-01T01:00:00.000Z",
  rawEligibilityInputPublic: false,
  participantSpecificSubsidyPublic: false,
  privateSponsorTermsPublic: false,
};

function sampleEvaluations(): MoralTradeNonPublicGoodsSubsidyEvaluation[] {
  return [
    evaluateMoralTradeNonPublicGoodsSubsidy({
      transition: "matched_trade_lock",
      subsidyRequired: true,
      checkedAt: "2026-06-12T00:00:00.000Z",
      pools: [DEMO_POOL],
      schedules: [DEMO_SCHEDULE],
    }),
    evaluateMoralTradeNonPublicGoodsSubsidy({
      transition: "matched_trade_lock",
      subsidyRequired: true,
      checkedAt: "2026-06-12T00:00:00.000Z",
      pools: [
        {
          ...DEMO_POOL,
          poolId: "subsidy-pool:blocking",
          policyStatus: "mutable",
          sourceOfFundsReviewState: "under_review",
          sponsorConflictOfInterestState: "blocked",
          appliesToTradeType: "pledge_swap",
          appliesToTiers: ["tier_3_closed_counterparty_pledge_swap"],
          publicDisclosureLevel: "undisclosed",
        },
      ],
      schedules: [
        {
          ...DEMO_SCHEDULE,
          poolRef: "subsidy-pool:blocking",
          subsidyAmountCents: 50_000,
          subsidyRatioBps: 5_000,
          capBinding: false,
          participantMoralTradeVolumeExclusion: false,
          directContributionExclusion: false,
          impactClaimExclusion: false,
          counterpartyDistinctnessExclusion: false,
        },
      ],
    }),
    evaluateMoralTradeNonPublicGoodsSubsidy({
      transition: "subsidy_schedule_preview",
      subsidyRequired: false,
      checkedAt: "2026-06-12T00:00:00.000Z",
      pools: [],
      schedules: [],
    }),
  ];
}

export function getMoralTradeNonPublicGoodsSubsidyContract(): MoralTradeNonPublicGoodsSubsidyContract {
  return {
    version: MORAL_TRADE_NON_PUBLIC_GOODS_SUBSIDY_CONTRACT_VERSION,
    purpose:
      "Fail-closed sponsor-funded non-public-goods subsidy governance for low-risk donation-offset tiers before subsidy schedule preview, matched-trade lock, payment, public metrics, or release promotion.",
    failClosedRule:
      "A sponsor subsidy is a governed mechanism input, not participant moral-trade volume, impact, or moral endorsement. Missing, mutable, stale, conflicted, over-cap, higher-tier, pledge-swap, undisclosed, manually reviewed, metric-inflating, or privacy-leaking subsidy records block clearing, payment, public metrics, and release-gate promotion.",
    privacyBoundary:
      "Public subsidy surfaces may expose only coarse disclosure level, cap status, eligibility status, and aggregate mechanism-support amounts. Sponsor identity hashes, private source details, raw eligibility inputs, participant-specific subsidy rows, private sponsor terms, and reviewer notes stay private unless a separate privacy grant and disclosure policy authorize a bounded release.",
    metricExclusionRule:
      "Subsidy dollars must be excluded from participant moral-trade volume, direct counted contribution, impact claims, and counterparty-distinctness metrics. They may be reported only as mechanism support under the frozen public disclosure policy.",
    firstClassRecordTables: [...FIRST_CLASS_RECORD_TABLES],
    policySnapshotSubjects: [...POLICY_SNAPSHOT_SUBJECTS],
    tradeTypes: [...TRADE_TYPES],
    allowedLaunchTiers: [...ALLOWED_LAUNCH_TIERS],
    sourceReviewStates: [...SOURCE_REVIEW_STATES],
    conflictStates: [...CONFLICT_STATES],
    disclosureLevels: [...DISCLOSURE_LEVELS],
    refundPolicies: [...REFUND_POLICIES],
    poolStates: [...POOL_STATES],
    subsidyTypes: [...SUBSIDY_TYPES],
    scheduleStates: [...SCHEDULE_STATES],
    policyStatuses: [...POLICY_STATUSES],
    transitionDefinitions: [...TRANSITIONS],
    sampleEvaluations: sampleEvaluations(),
    contractTests: [...CONTRACT_TESTS],
  };
}

export function validateMoralTradeNonPublicGoodsSubsidyContract(
  contract = getMoralTradeNonPublicGoodsSubsidyContract(),
): MoralTradeNonPublicGoodsSubsidyValidation {
  const checks = [
    check(
      "first_class_records",
      "Subsidy pools and schedules are first-class records",
      FIRST_CLASS_RECORD_TABLES.every((table) =>
        contract.firstClassRecordTables.includes(table),
      ),
      contract.firstClassRecordTables.join(", "),
    ),
    check(
      "policy_snapshot_subjects",
      "Policy snapshots cover non-public-goods subsidy and schedule subjects",
      POLICY_SNAPSHOT_SUBJECTS.every((subject) =>
        contract.policySnapshotSubjects.includes(subject),
      ),
      contract.policySnapshotSubjects.join(", "),
    ),
    check(
      "low_risk_tier_scope",
      "Launch subsidy scope is limited to tier-1 money-only donation offsets",
      contract.allowedLaunchTiers.length === 1 &&
        contract.allowedLaunchTiers[0] === "tier_1_money_only_donation_offset" &&
        contract.tradeTypes.includes("donation_offset") &&
        contract.tradeTypes.includes("pledge_swap"),
      contract.allowedLaunchTiers.join(", "),
    ),
    check(
      "state_coverage",
      "Contract lists source, conflict, disclosure, pool, schedule, and policy states",
      SOURCE_REVIEW_STATES.every((state) => contract.sourceReviewStates.includes(state)) &&
        CONFLICT_STATES.every((state) => contract.conflictStates.includes(state)) &&
        DISCLOSURE_LEVELS.every((level) => contract.disclosureLevels.includes(level)) &&
        POOL_STATES.every((state) => contract.poolStates.includes(state)) &&
        SCHEDULE_STATES.every((state) => contract.scheduleStates.includes(state)) &&
        POLICY_STATUSES.every((status) => contract.policyStatuses.includes(status)),
      `${contract.sourceReviewStates.length}/${contract.conflictStates.length}/${contract.scheduleStates.length}`,
    ),
    check(
      "transition_requirements",
      "Payment, lock, metric, release, reservation, and refund transitions require subsidy checks",
      [
        "matched_trade_lock",
        "payment_authorization",
        "payment_capture",
        "public_metric_publication",
        "release_gate_promotion",
        "subsidy_refund_or_carry_forward",
      ].every((key) =>
        contract.transitionDefinitions.some(
          (transition) =>
            transition.key === key &&
            transition.requiresActiveFrozenPoolWhenRequired &&
            transition.requiresScheduleRecordWhenRequired &&
            transition.requiresCapAndEligibilityChecks &&
            transition.requiresMetricExclusion,
        ),
      ),
      contract.transitionDefinitions.map((transition) => transition.key).join(", "),
    ),
    check(
      "sample_evaluations",
      "Sample evaluations include pass, fail-closed, and inactive-stage paths",
      contract.sampleEvaluations.some((evaluation) => evaluation.status === "pass") &&
        contract.sampleEvaluations.some((evaluation) => evaluation.status === "blocked") &&
        contract.sampleEvaluations.some((evaluation) => !evaluation.subsidyRequired),
      contract.sampleEvaluations.map((evaluation) => evaluation.status).join(", "),
    ),
    check(
      "metric_exclusion_rule",
      "Contract states subsidy dollars do not inflate participant contribution or impact metrics",
      /participant moral-trade volume/i.test(contract.metricExclusionRule) &&
        /direct counted contribution/i.test(contract.metricExclusionRule) &&
        /impact claims/i.test(contract.metricExclusionRule) &&
        /counterparty-distinctness/i.test(contract.metricExclusionRule),
      contract.metricExclusionRule,
    ),
    check(
      "privacy_boundary",
      "Public contract blocks private source, eligibility, participant row, sponsor term, and reviewer-note leakage",
      /private source details/i.test(contract.privacyBoundary) &&
        /raw eligibility inputs/i.test(contract.privacyBoundary) &&
        /participant-specific subsidy rows/i.test(contract.privacyBoundary) &&
        /private sponsor terms/i.test(contract.privacyBoundary) &&
        /reviewer notes/i.test(contract.privacyBoundary),
      contract.privacyBoundary,
    ),
    check(
      "contract_tests",
      "Contract declares focused subsidy governance tests",
      CONTRACT_TESTS.every((testName) => contract.contractTests.includes(testName)),
      contract.contractTests.join(", "),
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => `non-public-goods-subsidy:${entry.id}`);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-non-public-goods-subsidy-contract",
    validatorVersion: MORAL_TRADE_NON_PUBLIC_GOODS_SUBSIDY_VALIDATOR_VERSION,
    contractVersion: contract.version,
    checks,
    blockers,
  };
}
