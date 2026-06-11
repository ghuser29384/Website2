export const MORAL_TRADE_REVIEW_CAPACITY_CONTRACT_VERSION =
  "moral-trade-review-capacity-v0.1-2026-06";
export const MORAL_TRADE_REVIEW_CAPACITY_VALIDATOR_VERSION =
  "moral-trade-review-capacity-validator-v0.1";

export type MoralTradeReviewCapacityTransition =
  | "draft_preview"
  | "live_offer_publication"
  | "matchable_publication"
  | "matched_trade_lock"
  | "payment_authorization"
  | "payment_capture"
  | "reliance_bearing_transition"
  | "public_metric_publication"
  | "release_gate_promotion";

export type MoralTradeReviewCapacitySubjectType =
  | "donation_offset"
  | "pledge_swap"
  | "compensated_moral_action"
  | "performance_bond_condition"
  | "side_agreement"
  | "matched_trade_lock_proposal"
  | "cleared_trade_agreement";

export type MoralTradeReviewCapacityPolicyStatus =
  | "resolved_immutable"
  | "missing"
  | "mutable"
  | "stale"
  | "superseded";

export type MoralTradeReviewQueueState =
  | "preview_only"
  | "admitted"
  | "waitlisted"
  | "expired"
  | "blocked"
  | "superseded";

export type MoralTradeVisibleReviewQueueStatus =
  | "preview"
  | "in_review_queue"
  | "waitlisted_capacity"
  | "review_delayed"
  | "expired_stale"
  | "blocked_needs_review"
  | "ready_for_review";

export type MoralTradeReviewerPanelState =
  | "eligible"
  | "missing"
  | "conflicted"
  | "unavailable"
  | "stale"
  | "superseded";

export type MoralTradeReviewConflictScreeningState =
  | "passed"
  | "disclosed_nonblocking"
  | "not_required_for_stage"
  | "missing"
  | "unresolved"
  | "conflicted"
  | "superseded";

export type MoralTradeReviewQualityState =
  | "current"
  | "not_required_for_stage"
  | "missing"
  | "failed"
  | "stale"
  | "superseded";

export interface MoralTradeReviewCapacityPolicyRecord {
  policyId: string;
  releaseStage: string;
  subjectType: MoralTradeReviewCapacitySubjectType;
  policyStatus: MoralTradeReviewCapacityPolicyStatus;
  policyHash: string;
  maxOpenQueueDepth: number;
  maxEstimatedWaitDays: number;
  minEligibleReviewerCount: number;
  neutralPanelRequired: boolean;
  maxBaselineAgeDays: number;
  maxPaymentAuthorizationAgeDays: number;
  reviewedAt: string;
  expiresAt: string | null;
  supersededBy: string | null;
}

export interface MoralTradeReviewQueueRecord {
  queueId: string;
  policyRef: string;
  subjectType: MoralTradeReviewCapacitySubjectType;
  subjectRef: string;
  queueState: MoralTradeReviewQueueState;
  queuePosition: number | null;
  openQueueDepth: number;
  eligibleReviewerCount: number;
  neutralPanelAvailable: boolean;
  visibleUserQueueStatus: string;
  userStatusCopyHash: string;
  estimatedReviewBy: string | null;
  baselineExpiresAt: string | null;
  paymentAuthorizationExpiresAt: string | null;
  reviewedAt: string;
  expiresAt: string | null;
  supersededBy: string | null;
  privateQueueReasonPublic: boolean;
  reviewerIdentityPublic: boolean;
}

export interface MoralTradeReviewerPanelAssignmentRecord {
  assignmentId: string;
  queueRef: string;
  assignmentState: MoralTradeReviewerPanelState;
  reviewerCount: number;
  neutralReviewerCount: number;
  conflictScreeningState: MoralTradeReviewConflictScreeningState;
  reviewerQualityState: MoralTradeReviewQualityState;
  assignmentHash: string;
  reviewedAt: string;
  expiresAt: string | null;
  supersededBy: string | null;
  reviewerIdentityPublic: boolean;
  conflictFactsPublic: boolean;
}

export interface MoralTradeReviewCapacityTransitionDefinition {
  key: MoralTradeReviewCapacityTransition;
  label: string;
  requiresCapacityPolicy: boolean;
  requiresQueueAdmission: boolean;
  requiresReviewerPanel: boolean;
  requiresNeutralPanel: boolean;
  blocksPaymentAuthorizationStaleness: boolean;
  userFacingBlockerCategory: string;
}

export interface MoralTradeReviewCapacityEvaluationInput {
  transition: MoralTradeReviewCapacityTransition;
  checkedAt?: string;
  policies: MoralTradeReviewCapacityPolicyRecord[];
  queueRecords: MoralTradeReviewQueueRecord[];
  panelAssignments: MoralTradeReviewerPanelAssignmentRecord[];
}

export interface MoralTradeReviewCapacityEvaluation {
  status: "pass" | "blocked";
  transition: MoralTradeReviewCapacityTransition;
  checkedAt: string;
  requiredPolicyCount: number;
  requiredQueueRecordCount: number;
  eligiblePanelCount: number;
  admittedQueueCount: number;
  blockers: string[];
  userFacingBlockerCategories: string[];
}

export interface MoralTradeReviewCapacityCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradeReviewCapacityValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-review-capacity-contract";
  validatorVersion: string;
  contractVersion: string;
  checks: MoralTradeReviewCapacityCheck[];
  blockers: string[];
}

export interface MoralTradeReviewCapacityContract {
  version: string;
  purpose: string;
  failClosedRule: string;
  privacyBoundary: string;
  firstClassRecordTables: string[];
  policySnapshotSubjects: string[];
  subjectTypes: MoralTradeReviewCapacitySubjectType[];
  queueStates: MoralTradeReviewQueueState[];
  visibleQueueStatuses: MoralTradeVisibleReviewQueueStatus[];
  panelStates: MoralTradeReviewerPanelState[];
  policyStatuses: MoralTradeReviewCapacityPolicyStatus[];
  conflictScreeningStates: MoralTradeReviewConflictScreeningState[];
  reviewerQualityStates: MoralTradeReviewQualityState[];
  failClosedStatuses: Array<
    | MoralTradeReviewCapacityPolicyStatus
    | MoralTradeReviewQueueState
    | MoralTradeReviewerPanelState
    | MoralTradeReviewConflictScreeningState
    | MoralTradeReviewQualityState
  >;
  transitionDefinitions: MoralTradeReviewCapacityTransitionDefinition[];
  sampleEvaluations: MoralTradeReviewCapacityEvaluation[];
  contractTests: string[];
}

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
const MAX_POLICY_AGE_DAYS = 90;
const MAX_QUEUE_RECORD_AGE_DAYS = 30;
const MAX_PANEL_ASSIGNMENT_AGE_DAYS = 30;
const MAX_ALLOWED_REVIEW_WAIT_DAYS = 30;

const FIRST_CLASS_RECORD_TABLES = [
  "moral_trade_review_capacity_policies",
  "moral_trade_review_queue_records",
  "moral_trade_reviewer_panel_assignments",
] as const;

const POLICY_SNAPSHOT_SUBJECTS = [
  "review_capacity",
  "review_queue_admission",
] as const;

const SUBJECT_TYPES: MoralTradeReviewCapacitySubjectType[] = [
  "donation_offset",
  "pledge_swap",
  "compensated_moral_action",
  "performance_bond_condition",
  "side_agreement",
  "matched_trade_lock_proposal",
  "cleared_trade_agreement",
];

const QUEUE_STATES: MoralTradeReviewQueueState[] = [
  "preview_only",
  "admitted",
  "waitlisted",
  "expired",
  "blocked",
  "superseded",
];

const VISIBLE_QUEUE_STATUSES: MoralTradeVisibleReviewQueueStatus[] = [
  "preview",
  "in_review_queue",
  "waitlisted_capacity",
  "review_delayed",
  "expired_stale",
  "blocked_needs_review",
  "ready_for_review",
];

const PASSING_VISIBLE_QUEUE_STATUSES = new Set<string>([
  "in_review_queue",
  "ready_for_review",
]);

const PANEL_STATES: MoralTradeReviewerPanelState[] = [
  "eligible",
  "missing",
  "conflicted",
  "unavailable",
  "stale",
  "superseded",
];

const POLICY_STATUSES: MoralTradeReviewCapacityPolicyStatus[] = [
  "resolved_immutable",
  "missing",
  "mutable",
  "stale",
  "superseded",
];

const CONFLICT_SCREENING_STATES: MoralTradeReviewConflictScreeningState[] = [
  "passed",
  "disclosed_nonblocking",
  "not_required_for_stage",
  "missing",
  "unresolved",
  "conflicted",
  "superseded",
];

const REVIEWER_QUALITY_STATES: MoralTradeReviewQualityState[] = [
  "current",
  "not_required_for_stage",
  "missing",
  "failed",
  "stale",
  "superseded",
];

const FAIL_CLOSED_STATUSES = [
  "missing",
  "mutable",
  "stale",
  "superseded",
  "preview_only",
  "waitlisted",
  "expired",
  "blocked",
  "conflicted",
  "unavailable",
  "unresolved",
  "failed",
] as const;

const TRANSITION_DEFINITIONS: MoralTradeReviewCapacityTransitionDefinition[] = [
  {
    key: "draft_preview",
    label: "Draft preview",
    requiresCapacityPolicy: false,
    requiresQueueAdmission: false,
    requiresReviewerPanel: false,
    requiresNeutralPanel: false,
    blocksPaymentAuthorizationStaleness: false,
    userFacingBlockerCategory: "Review capacity is preview-only",
  },
  {
    key: "live_offer_publication",
    label: "Live offer publication",
    requiresCapacityPolicy: true,
    requiresQueueAdmission: true,
    requiresReviewerPanel: true,
    requiresNeutralPanel: false,
    blocksPaymentAuthorizationStaleness: false,
    userFacingBlockerCategory: "Offer needs review-capacity admission before it can go live",
  },
  {
    key: "matchable_publication",
    label: "Matchable publication",
    requiresCapacityPolicy: true,
    requiresQueueAdmission: true,
    requiresReviewerPanel: true,
    requiresNeutralPanel: true,
    blocksPaymentAuthorizationStaleness: false,
    userFacingBlockerCategory:
      "Offer needs an eligible reviewer or neutral panel before matching",
  },
  {
    key: "matched_trade_lock",
    label: "Matched-trade lock",
    requiresCapacityPolicy: true,
    requiresQueueAdmission: true,
    requiresReviewerPanel: true,
    requiresNeutralPanel: true,
    blocksPaymentAuthorizationStaleness: true,
    userFacingBlockerCategory:
      "Lock waits for review capacity and fresh baseline/payment authorization",
  },
  {
    key: "payment_authorization",
    label: "Payment authorization",
    requiresCapacityPolicy: true,
    requiresQueueAdmission: true,
    requiresReviewerPanel: true,
    requiresNeutralPanel: true,
    blocksPaymentAuthorizationStaleness: true,
    userFacingBlockerCategory:
      "Payment authorization waits for admitted review capacity",
  },
  {
    key: "payment_capture",
    label: "Payment capture",
    requiresCapacityPolicy: true,
    requiresQueueAdmission: true,
    requiresReviewerPanel: true,
    requiresNeutralPanel: true,
    blocksPaymentAuthorizationStaleness: true,
    userFacingBlockerCategory:
      "Payment capture waits for review capacity and non-stale authorization",
  },
  {
    key: "reliance_bearing_transition",
    label: "Reliance-bearing transition",
    requiresCapacityPolicy: true,
    requiresQueueAdmission: true,
    requiresReviewerPanel: true,
    requiresNeutralPanel: true,
    blocksPaymentAuthorizationStaleness: true,
    userFacingBlockerCategory:
      "Reliance-bearing state waits for capacity, reviewer, and freshness evidence",
  },
  {
    key: "public_metric_publication",
    label: "Public metric publication",
    requiresCapacityPolicy: true,
    requiresQueueAdmission: true,
    requiresReviewerPanel: true,
    requiresNeutralPanel: true,
    blocksPaymentAuthorizationStaleness: false,
    userFacingBlockerCategory:
      "Public metrics wait for review-capacity governed completed-trade evidence",
  },
  {
    key: "release_gate_promotion",
    label: "Release-gate promotion",
    requiresCapacityPolicy: true,
    requiresQueueAdmission: true,
    requiresReviewerPanel: true,
    requiresNeutralPanel: true,
    blocksPaymentAuthorizationStaleness: true,
    userFacingBlockerCategory:
      "Release promotion waits for review-capacity overflow and staleness controls",
  },
];

const CONTRACT_TESTS = [
  "review_capacity_contract_validator",
  "review_queue_admission_test",
  "review_capacity_overflow_waitlist_test",
  "neutral_panel_availability_test",
  "queue_delay_staleness_test",
  "review_capacity_route_health_spec_and_migration_wiring",
] as const;

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeReviewCapacityCheck {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

function isHash(value: string | null) {
  return typeof value === "string" && HASH_PATTERN.test(value);
}

function daysBetween(earlier: string, later: string) {
  const earlierTimestamp = Date.parse(earlier);
  const laterTimestamp = Date.parse(later);

  if (!Number.isFinite(earlierTimestamp) || !Number.isFinite(laterTimestamp)) {
    return Number.POSITIVE_INFINITY;
  }

  return (laterTimestamp - earlierTimestamp) / (1000 * 60 * 60 * 24);
}

function isExpired(value: string | null, checkedAt: string) {
  if (value === null) {
    return false;
  }

  const expiresAt = Date.parse(value);
  const checkedAtTimestamp = Date.parse(checkedAt);

  return (
    !Number.isFinite(expiresAt) ||
    !Number.isFinite(checkedAtTimestamp) ||
    expiresAt <= checkedAtTimestamp
  );
}

function isAfter(left: string | null, right: string | null) {
  if (left === null || right === null) {
    return false;
  }

  const leftTimestamp = Date.parse(left);
  const rightTimestamp = Date.parse(right);

  return (
    !Number.isFinite(leftTimestamp) ||
    !Number.isFinite(rightTimestamp) ||
    leftTimestamp > rightTimestamp
  );
}

function makeHash(seed: string) {
  const hexSeed = seed.replace(/[^a-f0-9]/gi, "a") || "a";

  return `sha256:${hexSeed.padEnd(64, "0").slice(0, 64).toLowerCase()}`;
}

function makeSamplePolicy(
  overrides: Partial<MoralTradeReviewCapacityPolicyRecord> = {},
): MoralTradeReviewCapacityPolicyRecord {
  return {
    policyId: "review-capacity-policy:tier-1-donation-offset",
    releaseStage: "tier_1_money_only_donation_offset",
    subjectType: "donation_offset",
    policyStatus: "resolved_immutable",
    policyHash: makeHash("review-capacity-policy"),
    maxOpenQueueDepth: 40,
    maxEstimatedWaitDays: 7,
    minEligibleReviewerCount: 2,
    neutralPanelRequired: true,
    maxBaselineAgeDays: 14,
    maxPaymentAuthorizationAgeDays: 3,
    reviewedAt: "2026-06-11T12:00:00.000Z",
    expiresAt: "2026-09-11T12:00:00.000Z",
    supersededBy: null,
    ...overrides,
  };
}

function makeSampleQueue(
  overrides: Partial<MoralTradeReviewQueueRecord> = {},
): MoralTradeReviewQueueRecord {
  return {
    queueId: "review-queue:offset-offer-demo",
    policyRef: "review-capacity-policy:tier-1-donation-offset",
    subjectType: "donation_offset",
    subjectRef: "offset-offer:demo",
    queueState: "admitted",
    queuePosition: 3,
    openQueueDepth: 12,
    eligibleReviewerCount: 3,
    neutralPanelAvailable: true,
    visibleUserQueueStatus: "in_review_queue",
    userStatusCopyHash: makeHash("public-review-queue-status"),
    estimatedReviewBy: "2026-06-14T12:00:00.000Z",
    baselineExpiresAt: "2026-06-20T12:00:00.000Z",
    paymentAuthorizationExpiresAt: "2026-06-16T12:00:00.000Z",
    reviewedAt: "2026-06-11T12:00:00.000Z",
    expiresAt: "2026-06-18T12:00:00.000Z",
    supersededBy: null,
    privateQueueReasonPublic: false,
    reviewerIdentityPublic: false,
    ...overrides,
  };
}

function makeSamplePanel(
  overrides: Partial<MoralTradeReviewerPanelAssignmentRecord> = {},
): MoralTradeReviewerPanelAssignmentRecord {
  return {
    assignmentId: "reviewer-panel:offset-offer-demo",
    queueRef: "review-queue:offset-offer-demo",
    assignmentState: "eligible",
    reviewerCount: 3,
    neutralReviewerCount: 1,
    conflictScreeningState: "passed",
    reviewerQualityState: "current",
    assignmentHash: makeHash("reviewer-panel-assignment"),
    reviewedAt: "2026-06-11T12:00:00.000Z",
    expiresAt: "2026-06-18T12:00:00.000Z",
    supersededBy: null,
    reviewerIdentityPublic: false,
    conflictFactsPublic: false,
    ...overrides,
  };
}

function getTransitionDefinition(
  transition: MoralTradeReviewCapacityTransition,
) {
  return TRANSITION_DEFINITIONS.find((definition) => definition.key === transition);
}

function userStatusIsUnsafe(status: string) {
  return /reviewer|identity|conflict|private|raw|internal/i.test(status);
}

function policyBlocks({
  checkedAt,
  definition,
  policy,
}: {
  checkedAt: string;
  definition: MoralTradeReviewCapacityTransitionDefinition;
  policy: MoralTradeReviewCapacityPolicyRecord;
}) {
  const blockers: string[] = [];

  if (policy.policyStatus !== "resolved_immutable") {
    blockers.push(
      `review_capacity_policy_not_immutable:${policy.policyId}:${policy.policyStatus}`,
    );
  }

  if (!isHash(policy.policyHash)) {
    blockers.push(`invalid_review_capacity_policy_hash:${policy.policyId}`);
  }

  if (policy.supersededBy) {
    blockers.push(`review_capacity_policy_superseded:${policy.policyId}`);
  }

  if (daysBetween(policy.reviewedAt, checkedAt) > MAX_POLICY_AGE_DAYS) {
    blockers.push(`stale_review_capacity_policy:${policy.policyId}`);
  }

  if (isExpired(policy.expiresAt, checkedAt)) {
    blockers.push(`expired_review_capacity_policy:${policy.policyId}`);
  }

  if (!Number.isInteger(policy.maxOpenQueueDepth) || policy.maxOpenQueueDepth < 1) {
    blockers.push(`invalid_review_capacity_queue_depth:${policy.policyId}`);
  }

  if (
    !Number.isInteger(policy.maxEstimatedWaitDays) ||
    policy.maxEstimatedWaitDays < 1 ||
    policy.maxEstimatedWaitDays > MAX_ALLOWED_REVIEW_WAIT_DAYS
  ) {
    blockers.push(`invalid_review_capacity_wait_days:${policy.policyId}`);
  }

  if (
    !Number.isInteger(policy.minEligibleReviewerCount) ||
    policy.minEligibleReviewerCount < 1
  ) {
    blockers.push(`invalid_review_capacity_min_reviewer_count:${policy.policyId}`);
  }

  if (definition.requiresNeutralPanel && !policy.neutralPanelRequired) {
    blockers.push(`neutral_panel_policy_required:${policy.policyId}`);
  }

  if (
    !Number.isInteger(policy.maxBaselineAgeDays) ||
    policy.maxBaselineAgeDays < 1
  ) {
    blockers.push(`invalid_review_capacity_baseline_age:${policy.policyId}`);
  }

  if (
    !Number.isInteger(policy.maxPaymentAuthorizationAgeDays) ||
    policy.maxPaymentAuthorizationAgeDays < 1
  ) {
    blockers.push(
      `invalid_review_capacity_payment_authorization_age:${policy.policyId}`,
    );
  }

  return blockers;
}

function queueBlocks({
  checkedAt,
  definition,
  policy,
  queue,
}: {
  checkedAt: string;
  definition: MoralTradeReviewCapacityTransitionDefinition;
  policy: MoralTradeReviewCapacityPolicyRecord | undefined;
  queue: MoralTradeReviewQueueRecord;
}) {
  const blockers: string[] = [];

  if (!policy) {
    blockers.push(`review_capacity_policy_missing_for_queue:${queue.queueId}`);
  } else if (queue.policyRef !== policy.policyId) {
    blockers.push(`review_queue_policy_ref_mismatch:${queue.queueId}`);
  }

  if (queue.queueState !== "admitted") {
    blockers.push(`review_queue_not_admitted:${queue.queueId}:${queue.queueState}`);
  }

  if (!Number.isInteger(queue.openQueueDepth) || queue.openQueueDepth < 0) {
    blockers.push(`invalid_review_queue_depth:${queue.queueId}`);
  }

  if (policy && queue.openQueueDepth > policy.maxOpenQueueDepth) {
    blockers.push(`review_queue_over_policy_depth:${queue.queueId}`);
  }

  if (!Number.isInteger(queue.eligibleReviewerCount)) {
    blockers.push(`invalid_review_queue_eligible_reviewer_count:${queue.queueId}`);
  }

  if (policy && queue.eligibleReviewerCount < policy.minEligibleReviewerCount) {
    blockers.push(`review_queue_insufficient_eligible_reviewers:${queue.queueId}`);
  }

  if (definition.requiresNeutralPanel && !queue.neutralPanelAvailable) {
    blockers.push(`review_queue_neutral_panel_unavailable:${queue.queueId}`);
  }

  if (queue.queuePosition === null || queue.queuePosition < 1) {
    blockers.push(`review_queue_position_missing:${queue.queueId}`);
  } else if (policy && queue.queuePosition > policy.maxOpenQueueDepth) {
    blockers.push(`review_queue_position_over_policy_depth:${queue.queueId}`);
  }

  if (!VISIBLE_QUEUE_STATUSES.includes(queue.visibleUserQueueStatus as MoralTradeVisibleReviewQueueStatus)) {
    blockers.push(`review_queue_visible_status_unknown:${queue.queueId}`);
  }

  if (!PASSING_VISIBLE_QUEUE_STATUSES.has(queue.visibleUserQueueStatus)) {
    blockers.push(
      `review_queue_visible_status_not_live:${queue.queueId}:${queue.visibleUserQueueStatus}`,
    );
  }

  if (userStatusIsUnsafe(queue.visibleUserQueueStatus)) {
    blockers.push(`unsafe_review_queue_user_status_copy:${queue.queueId}`);
  }

  if (!isHash(queue.userStatusCopyHash)) {
    blockers.push(`invalid_review_queue_user_status_hash:${queue.queueId}`);
  }

  if (queue.estimatedReviewBy === null) {
    blockers.push(`estimated_review_deadline_missing:${queue.queueId}`);
  }

  if (policy && queue.estimatedReviewBy) {
    if (daysBetween(checkedAt, queue.estimatedReviewBy) > policy.maxEstimatedWaitDays) {
      blockers.push(`estimated_review_delay_exceeds_policy:${queue.queueId}`);
    }
  }

  if (isAfter(queue.estimatedReviewBy, queue.baselineExpiresAt)) {
    blockers.push(`estimated_review_after_baseline_expiry:${queue.queueId}`);
  }

  if (
    definition.blocksPaymentAuthorizationStaleness &&
    isAfter(queue.estimatedReviewBy, queue.paymentAuthorizationExpiresAt)
  ) {
    blockers.push(`estimated_review_after_payment_authorization_expiry:${queue.queueId}`);
  }

  if (daysBetween(queue.reviewedAt, checkedAt) > MAX_QUEUE_RECORD_AGE_DAYS) {
    blockers.push(`stale_review_queue_record:${queue.queueId}`);
  }

  if (isExpired(queue.expiresAt, checkedAt)) {
    blockers.push(`expired_review_queue_record:${queue.queueId}`);
  }

  if (queue.supersededBy) {
    blockers.push(`review_queue_record_superseded:${queue.queueId}`);
  }

  if (queue.privateQueueReasonPublic) {
    blockers.push(`private_review_queue_reason_public:${queue.queueId}`);
  }

  if (queue.reviewerIdentityPublic) {
    blockers.push(`reviewer_identity_public_in_queue_status:${queue.queueId}`);
  }

  return blockers;
}

function panelBlocks({
  checkedAt,
  definition,
  policy,
  panel,
}: {
  checkedAt: string;
  definition: MoralTradeReviewCapacityTransitionDefinition;
  policy: MoralTradeReviewCapacityPolicyRecord | undefined;
  panel: MoralTradeReviewerPanelAssignmentRecord;
}) {
  const blockers: string[] = [];

  if (panel.assignmentState !== "eligible") {
    blockers.push(
      `reviewer_panel_assignment_not_eligible:${panel.assignmentId}:${panel.assignmentState}`,
    );
  }

  if (!Number.isInteger(panel.reviewerCount) || panel.reviewerCount < 1) {
    blockers.push(`reviewer_panel_count_missing:${panel.assignmentId}`);
  }

  if (policy && panel.reviewerCount < policy.minEligibleReviewerCount) {
    blockers.push(`reviewer_panel_below_policy_minimum:${panel.assignmentId}`);
  }

  if (definition.requiresNeutralPanel && panel.neutralReviewerCount < 1) {
    blockers.push(`neutral_reviewer_panel_missing:${panel.assignmentId}`);
  }

  if (
    !["passed", "disclosed_nonblocking", "not_required_for_stage"].includes(
      panel.conflictScreeningState,
    )
  ) {
    blockers.push(
      `reviewer_panel_conflict_screening_blocked:${panel.assignmentId}:${panel.conflictScreeningState}`,
    );
  }

  if (
    !["current", "not_required_for_stage"].includes(panel.reviewerQualityState)
  ) {
    blockers.push(
      `reviewer_panel_quality_not_current:${panel.assignmentId}:${panel.reviewerQualityState}`,
    );
  }

  if (!isHash(panel.assignmentHash)) {
    blockers.push(`invalid_reviewer_panel_assignment_hash:${panel.assignmentId}`);
  }

  if (daysBetween(panel.reviewedAt, checkedAt) > MAX_PANEL_ASSIGNMENT_AGE_DAYS) {
    blockers.push(`stale_reviewer_panel_assignment:${panel.assignmentId}`);
  }

  if (isExpired(panel.expiresAt, checkedAt)) {
    blockers.push(`expired_reviewer_panel_assignment:${panel.assignmentId}`);
  }

  if (panel.supersededBy) {
    blockers.push(`reviewer_panel_assignment_superseded:${panel.assignmentId}`);
  }

  if (panel.reviewerIdentityPublic) {
    blockers.push(`reviewer_identity_public_in_panel_assignment:${panel.assignmentId}`);
  }

  if (panel.conflictFactsPublic) {
    blockers.push(`reviewer_conflict_facts_public:${panel.assignmentId}`);
  }

  return blockers;
}

export function evaluateMoralTradeReviewCapacity(
  input: MoralTradeReviewCapacityEvaluationInput,
): MoralTradeReviewCapacityEvaluation {
  const checkedAt = input.checkedAt ?? new Date().toISOString();
  const definition = getTransitionDefinition(input.transition);
  const blockers: string[] = [];

  if (!definition) {
    return {
      status: "blocked",
      transition: input.transition,
      checkedAt,
      requiredPolicyCount: 0,
      requiredQueueRecordCount: 0,
      eligiblePanelCount: 0,
      admittedQueueCount: 0,
      blockers: [`unknown_review_capacity_transition:${input.transition}`],
      userFacingBlockerCategories: [
        "Review capacity state cannot be interpreted",
      ],
    };
  }

  if (!definition.requiresCapacityPolicy) {
    return {
      status: "pass",
      transition: input.transition,
      checkedAt,
      requiredPolicyCount: 0,
      requiredQueueRecordCount: 0,
      eligiblePanelCount: 0,
      admittedQueueCount: 0,
      blockers: [],
      userFacingBlockerCategories: [],
    };
  }

  if (input.policies.length === 0) {
    blockers.push("review_capacity_policy_required");
  }

  if (definition.requiresQueueAdmission && input.queueRecords.length === 0) {
    blockers.push("review_queue_record_required");
  }

  if (definition.requiresReviewerPanel && input.panelAssignments.length === 0) {
    blockers.push("reviewer_panel_assignment_required");
  }

  const policiesById = new Map(
    input.policies.map((policy) => [policy.policyId, policy]),
  );

  for (const policy of input.policies) {
    blockers.push(...policyBlocks({ checkedAt, definition, policy }));
  }

  for (const queue of input.queueRecords) {
    blockers.push(
      ...queueBlocks({
        checkedAt,
        definition,
        policy: policiesById.get(queue.policyRef),
        queue,
      }),
    );
  }

  const panelsByQueueRef = new Map(
    input.panelAssignments.map((panel) => [panel.queueRef, panel]),
  );

  for (const panel of input.panelAssignments) {
    const queue = input.queueRecords.find(
      (record) => record.queueId === panel.queueRef,
    );
    blockers.push(
      ...panelBlocks({
        checkedAt,
        definition,
        policy: queue ? policiesById.get(queue.policyRef) : input.policies[0],
        panel,
      }),
    );
  }

  for (const queue of input.queueRecords) {
    if (!panelsByQueueRef.has(queue.queueId)) {
      blockers.push(`reviewer_panel_missing_for_queue:${queue.queueId}`);
    }
  }

  const admittedQueueCount = input.queueRecords.filter(
    (queue) => queue.queueState === "admitted",
  ).length;
  const eligiblePanelCount = input.panelAssignments.filter(
    (panel) => panel.assignmentState === "eligible",
  ).length;

  return {
    status: blockers.length === 0 ? "pass" : "blocked",
    transition: input.transition,
    checkedAt,
    requiredPolicyCount: definition.requiresCapacityPolicy ? 1 : 0,
    requiredQueueRecordCount: definition.requiresQueueAdmission ? 1 : 0,
    eligiblePanelCount,
    admittedQueueCount,
    blockers,
    userFacingBlockerCategories:
      blockers.length === 0 ? [] : [definition.userFacingBlockerCategory],
  };
}

export function getMoralTradeReviewCapacityContract(): MoralTradeReviewCapacityContract {
  return {
    version: MORAL_TRADE_REVIEW_CAPACITY_CONTRACT_VERSION,
    purpose:
      "Public validator-backed review-capacity and queue-admission contract for non-public-goods offers before live, matchable, payable, reliance-bearing, or public-metric transitions.",
    failClosedRule:
      "A non-public-goods offer cannot be presented as live, matchable, payable, reliance-bearing, or public-metric-ready unless a frozen review-capacity policy, admitted queue record, visible user-facing queue status, eligible reviewer assignment, neutral panel where required, and non-stale baseline/payment-authorization timing all pass. Queue overflow, missing eligible reviewers, unavailable neutral panels, hidden queue status, stale baselines, stale payment authorizations, and unsafe public copies waitlist, expire, or keep the offer in preview.",
    privacyBoundary:
      "Public review-capacity surfaces expose table names, status categories, policy subjects, transition requirements, and sample statuses only. They must not expose reviewer identities, conflict facts, private queue reasons, participant-specific queue records, baseline details, payment authorization details, reviewer notes, source evidence, contact details, or raw internal status copies.",
    firstClassRecordTables: [...FIRST_CLASS_RECORD_TABLES],
    policySnapshotSubjects: [...POLICY_SNAPSHOT_SUBJECTS],
    subjectTypes: SUBJECT_TYPES,
    queueStates: QUEUE_STATES,
    visibleQueueStatuses: VISIBLE_QUEUE_STATUSES,
    panelStates: PANEL_STATES,
    policyStatuses: POLICY_STATUSES,
    conflictScreeningStates: CONFLICT_SCREENING_STATES,
    reviewerQualityStates: REVIEWER_QUALITY_STATES,
    failClosedStatuses: [...FAIL_CLOSED_STATUSES],
    transitionDefinitions: TRANSITION_DEFINITIONS,
    sampleEvaluations: [
      evaluateMoralTradeReviewCapacity({
        transition: "draft_preview",
        checkedAt: "2026-06-11T12:00:00.000Z",
        policies: [],
        queueRecords: [],
        panelAssignments: [],
      }),
      evaluateMoralTradeReviewCapacity({
        transition: "matchable_publication",
        checkedAt: "2026-06-11T12:00:00.000Z",
        policies: [makeSamplePolicy()],
        queueRecords: [makeSampleQueue()],
        panelAssignments: [makeSamplePanel()],
      }),
      evaluateMoralTradeReviewCapacity({
        transition: "live_offer_publication",
        checkedAt: "2026-06-11T12:00:00.000Z",
        policies: [makeSamplePolicy({ maxOpenQueueDepth: 5 })],
        queueRecords: [
          makeSampleQueue({
            queueState: "waitlisted",
            openQueueDepth: 9,
            queuePosition: 8,
            visibleUserQueueStatus: "waitlisted_capacity",
          }),
        ],
        panelAssignments: [makeSamplePanel()],
      }),
      evaluateMoralTradeReviewCapacity({
        transition: "payment_capture",
        checkedAt: "2026-06-11T12:00:00.000Z",
        policies: [makeSamplePolicy()],
        queueRecords: [
          makeSampleQueue({
            estimatedReviewBy: "2026-06-18T12:00:00.000Z",
            baselineExpiresAt: "2026-06-13T12:00:00.000Z",
            paymentAuthorizationExpiresAt: "2026-06-15T12:00:00.000Z",
          }),
        ],
        panelAssignments: [makeSamplePanel()],
      }),
      evaluateMoralTradeReviewCapacity({
        transition: "matched_trade_lock",
        checkedAt: "2026-06-11T12:00:00.000Z",
        policies: [makeSamplePolicy()],
        queueRecords: [makeSampleQueue({ neutralPanelAvailable: false })],
        panelAssignments: [makeSamplePanel({ neutralReviewerCount: 0 })],
      }),
    ],
    contractTests: [...CONTRACT_TESTS],
  };
}

export function validateMoralTradeReviewCapacityContract(
  contract = getMoralTradeReviewCapacityContract(),
): MoralTradeReviewCapacityValidation {
  const checks = [
    check(
      "first_class_review_capacity_records",
      "Review capacity has first-class policy, queue, and reviewer-panel records",
      FIRST_CLASS_RECORD_TABLES.every((table) =>
        contract.firstClassRecordTables.includes(table),
      ),
      contract.firstClassRecordTables.join(", "),
    ),
    check(
      "policy_snapshot_subjects",
      "Review capacity uses explicit policy snapshot subjects",
      POLICY_SNAPSHOT_SUBJECTS.every((subject) =>
        contract.policySnapshotSubjects.includes(subject),
      ),
      contract.policySnapshotSubjects.join(", "),
    ),
    check(
      "live_matchable_payable_reliance_transitions",
      "Live, matchable, payable, reliance, public metric, and release transitions are gated",
      [
        "live_offer_publication",
        "matchable_publication",
        "payment_capture",
        "reliance_bearing_transition",
        "public_metric_publication",
        "release_gate_promotion",
      ].every((transition) =>
        contract.transitionDefinitions.some(
          (definition) =>
            definition.key === transition &&
            definition.requiresCapacityPolicy &&
            definition.requiresQueueAdmission &&
            definition.requiresReviewerPanel,
        ),
      ),
      contract.transitionDefinitions.map((definition) => definition.key).join(", "),
    ),
    check(
      "neutral_panel_and_staleness_controls",
      "Neutral-panel availability and baseline/payment staleness are blocking controls",
      contract.transitionDefinitions.some(
        (definition) =>
          definition.requiresNeutralPanel &&
          definition.blocksPaymentAuthorizationStaleness,
      ),
      "requiresNeutralPanel and blocksPaymentAuthorizationStaleness",
    ),
    check(
      "visible_user_queue_statuses",
      "User-facing queue statuses are explicit and privacy-safe",
      ([
        "in_review_queue",
        "waitlisted_capacity",
        "expired_stale",
      ] satisfies MoralTradeVisibleReviewQueueStatus[]).every((status) =>
        contract.visibleQueueStatuses.includes(status),
      ) &&
        /visible user-facing queue status/i.test(contract.failClosedRule) &&
        /raw internal status copies/i.test(contract.privacyBoundary),
      contract.visibleQueueStatuses.join(", "),
    ),
    check(
      "overflow_and_staleness_fail_closed",
      "Queue overflow and stale baselines/payment authorizations fail closed",
      /Queue overflow/i.test(contract.failClosedRule) &&
        /stale baselines/i.test(contract.failClosedRule) &&
        /stale payment authorizations/i.test(contract.failClosedRule),
      contract.failClosedRule,
    ),
    check(
      "public_privacy_boundary",
      "Public contract excludes reviewer identities, conflict facts, private reasons, and participant records",
      /reviewer identities/i.test(contract.privacyBoundary) &&
        /conflict facts/i.test(contract.privacyBoundary) &&
        /private queue reasons/i.test(contract.privacyBoundary) &&
        /participant-specific queue records/i.test(contract.privacyBoundary),
      contract.privacyBoundary,
    ),
    check(
      "sample_evaluations_include_waitlist_staleness_and_neutral_panel_blocks",
      "Sample evaluations cover pass, waitlist overflow, staleness, and neutral-panel blocking",
      contract.sampleEvaluations.some((evaluation) => evaluation.status === "pass") &&
        contract.sampleEvaluations.some((evaluation) =>
          evaluation.blockers.some((blocker) => blocker.includes("waitlisted")),
        ) &&
        contract.sampleEvaluations.some((evaluation) =>
          evaluation.blockers.some((blocker) => blocker.includes("payment_authorization")),
        ) &&
        contract.sampleEvaluations.some((evaluation) =>
          evaluation.blockers.some((blocker) => blocker.includes("neutral")),
        ),
      `${contract.sampleEvaluations.length} sample evaluation(s)`,
    ),
    check(
      "contract_tests_declared",
      "Contract declares focused review-capacity tests",
      [
        "review_capacity_contract_validator",
        "review_queue_admission_test",
        "review_capacity_overflow_waitlist_test",
        "neutral_panel_availability_test",
        "queue_delay_staleness_test",
      ].every((testName) => contract.contractTests.includes(testName)),
      contract.contractTests.join(", "),
    ),
  ];

  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => entry.id);

  return {
    status: blockers.length === 0 ? "pass" : "fail",
    validatorName: "moral-trade-review-capacity-contract",
    validatorVersion: MORAL_TRADE_REVIEW_CAPACITY_VALIDATOR_VERSION,
    contractVersion: contract.version,
    checks,
    blockers,
  };
}
