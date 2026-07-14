export const MORAL_TRADE_ACTION_REVERSIBILITY_CONTRACT_VERSION =
  "moral-trade-action-reversibility-v0.1-2026-06";
export const MORAL_TRADE_ACTION_REVERSIBILITY_VALIDATOR_VERSION =
  "moral-trade-action-reversibility-validator-v0.1";

export type MoralTradeActionReversibilityTransition =
  | "draft_preview"
  | "matched_trade_lock"
  | "payment_capture"
  | "performance_start"
  | "reliance_bearing_transition"
  | "public_metric_publication"
  | "release_gate_promotion";

export type MoralTradeActionReversibilitySubjectType =
  | "pledge_swap"
  | "compensated_moral_action"
  | "performance_bond"
  | "side_agreement";

export type MoralTradeActionReversibilityLevel =
  | "reversible"
  | "partly_reversible"
  | "effectively_irreversible"
  | "unknown";

export type MoralTradeActionReviewState =
  | "not_required_for_stage"
  | "passed"
  | "under_review"
  | "blocked"
  | "stale";

export type MoralTradeActionLaunchMode =
  | "preview_only"
  | "manual_review"
  | "approved_reliance"
  | "disabled";

export type MoralTradeActionAssessmentState =
  | "draft"
  | "previewed"
  | "reviewed"
  | "approved"
  | "blocked"
  | "superseded";

export interface MoralTradeActionReversibilityRecord {
  recordId: string;
  subjectType: MoralTradeActionReversibilitySubjectType;
  subjectRef: string;
  actionReversibilityPolicyRef: string;
  actionDescriptionHash: string;
  reversibilityLevel: MoralTradeActionReversibilityLevel;
  highStakes: boolean;
  highStakesDomainRefs: string[];
  legalReviewState: MoralTradeActionReviewState;
  externalityReviewState: MoralTradeActionReviewState;
  vulnerabilityReviewState: MoralTradeActionReviewState;
  neutralReviewState: MoralTradeActionReviewState;
  exactFlowApproved: boolean;
  irreversiblePerformanceBeforeLockBlocked: boolean;
  launchMode: MoralTradeActionLaunchMode;
  assessmentState: MoralTradeActionAssessmentState;
  reviewerDecisionRef: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  supersededBy: string | null;
}

export interface MoralTradeActionReversibilityEvaluationInput {
  transition: MoralTradeActionReversibilityTransition;
  checkedAt?: string;
  actionReversibilityRequired: boolean;
  records: MoralTradeActionReversibilityRecord[];
}

export interface MoralTradeActionReversibilityEvaluation {
  status: "pass" | "blocked";
  transition: MoralTradeActionReversibilityTransition;
  checkedAt: string;
  actionReversibilityRequired: boolean;
  recordCount: number;
  nonBlockingRecordCount: number;
  highStakesOrIrreversibleRecordCount: number;
  approvedHighStakesRecordCount: number;
  blockers: string[];
  userFacingBlockerCategories: string[];
}

export interface MoralTradeActionReversibilityCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradeActionReversibilityValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-action-reversibility-contract";
  validatorVersion: string;
  contractVersion: string;
  checks: MoralTradeActionReversibilityCheck[];
  blockers: string[];
}

export interface MoralTradeActionReversibilityContract {
  version: string;
  purpose: string;
  failClosedRule: string;
  highStakesRule: string;
  noIrreversibleBeforeLockRule: string;
  firstClassRecordTables: string[];
  policySnapshotSubjects: string[];
  releaseGateTestHooks: string[];
  transitions: {
    key: MoralTradeActionReversibilityTransition;
    requiresAssessmentRecords: boolean;
    requiresNonBlockingReview: boolean;
    requiresApprovedHighStakesFlow: boolean;
    userFacingBlockerCategory: string;
  }[];
  sampleEvaluations: MoralTradeActionReversibilityEvaluation[];
  contractTests: string[];
}

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
const MAX_REVIEW_AGE_DAYS = 180;

const FIRST_CLASS_RECORD_TABLES = [
  "moral_trade_action_reversibility_assessments",
  "moral_trade_action_reversibility_enforcement_records",
] as const;

const POLICY_SNAPSHOT_SUBJECTS = [
  "action_reversibility_assessment",
  "legal_jurisdiction",
  "externality_review",
  "coercion_undue_influence",
  "release_gate_requirement",
] as const;

const RELEASE_GATE_TEST_HOOKS = ["irreversible_action_gate_test"] as const;

const CONTRACT_TESTS = [
  "action_reversibility_contract_validator",
  "irreversible_action_gate_test",
  "irreversible_performance_before_lock_test",
  "action_reversibility_route_contract",
  "action_reversibility_schema_contract",
] as const;

const PASSING_REVIEW_STATES = new Set<MoralTradeActionReviewState>([
  "not_required_for_stage",
  "passed",
]);

const NON_BLOCKING_STATES = new Set<MoralTradeActionAssessmentState>([
  "previewed",
  "reviewed",
  "approved",
]);

const SUBJECT_TYPES = new Set<MoralTradeActionReversibilitySubjectType>([
  "pledge_swap",
  "compensated_moral_action",
  "performance_bond",
  "side_agreement",
]);

const TRANSITIONS = [
  {
    key: "draft_preview",
    requiresAssessmentRecords: false,
    requiresNonBlockingReview: false,
    requiresApprovedHighStakesFlow: false,
    userFacingBlockerCategory:
      "Draft preview may describe action reversibility without reliance",
  },
  {
    key: "matched_trade_lock",
    requiresAssessmentRecords: true,
    requiresNonBlockingReview: true,
    requiresApprovedHighStakesFlow: true,
    userFacingBlockerCategory:
      "Lock requires action reversibility and high-stakes review",
  },
  {
    key: "payment_capture",
    requiresAssessmentRecords: true,
    requiresNonBlockingReview: true,
    requiresApprovedHighStakesFlow: true,
    userFacingBlockerCategory:
      "Payment capture cannot induce high-stakes or irreversible action without approval",
  },
  {
    key: "performance_start",
    requiresAssessmentRecords: true,
    requiresNonBlockingReview: true,
    requiresApprovedHighStakesFlow: true,
    userFacingBlockerCategory:
      "Performance cannot begin before irreversible-action controls pass",
  },
  {
    key: "reliance_bearing_transition",
    requiresAssessmentRecords: true,
    requiresNonBlockingReview: true,
    requiresApprovedHighStakesFlow: true,
    userFacingBlockerCategory:
      "Reliance requires exact-flow approval for high-stakes or irreversible action",
  },
  {
    key: "public_metric_publication",
    requiresAssessmentRecords: true,
    requiresNonBlockingReview: true,
    requiresApprovedHighStakesFlow: true,
    userFacingBlockerCategory:
      "Public metrics cannot count irreversible or high-stakes actions without approval",
  },
  {
    key: "release_gate_promotion",
    requiresAssessmentRecords: true,
    requiresNonBlockingReview: true,
    requiresApprovedHighStakesFlow: true,
    userFacingBlockerCategory:
      "Release promotion requires the irreversible-action gate to pass",
  },
] as const;

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isHash(value: unknown): value is string {
  return typeof value === "string" && HASH_PATTERN.test(value);
}

function isIsoDate(value: unknown): value is string {
  if (!hasText(value)) return false;
  return Number.isFinite(Date.parse(value));
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
  if (value === null) return false;
  const expiresAt = Date.parse(value);
  const checkedAtTimestamp = Date.parse(checkedAt);

  return (
    !Number.isFinite(expiresAt) ||
    !Number.isFinite(checkedAtTimestamp) ||
    expiresAt <= checkedAtTimestamp
  );
}

function transitionContract(transition: MoralTradeActionReversibilityTransition) {
  return TRANSITIONS.find((entry) => entry.key === transition) || TRANSITIONS[0];
}

function makeHash(seed: string) {
  const hexSeed = seed.replace(/[^a-f0-9]/gi, "a") || "a";

  return `sha256:${hexSeed.padEnd(64, "0").slice(0, 64).toLowerCase()}`;
}

function isHighStakesOrIrreversible(record: MoralTradeActionReversibilityRecord) {
  return (
    record.highStakes ||
    record.reversibilityLevel === "effectively_irreversible" ||
    record.reversibilityLevel === "unknown"
  );
}

function hasPassedHighStakesReview(record: MoralTradeActionReversibilityRecord) {
  if (!isHighStakesOrIrreversible(record)) return true;

  return (
    record.exactFlowApproved &&
    record.launchMode === "approved_reliance" &&
    PASSING_REVIEW_STATES.has(record.legalReviewState) &&
    PASSING_REVIEW_STATES.has(record.externalityReviewState) &&
    PASSING_REVIEW_STATES.has(record.vulnerabilityReviewState) &&
    PASSING_REVIEW_STATES.has(record.neutralReviewState)
  );
}

function hasHighStakesDomains(record: MoralTradeActionReversibilityRecord) {
  return (
    Array.isArray(record.highStakesDomainRefs) &&
    record.highStakesDomainRefs.length > 0 &&
    record.highStakesDomainRefs.every(hasText)
  );
}

function isNonBlocking(record: MoralTradeActionReversibilityRecord) {
  return (
    SUBJECT_TYPES.has(record.subjectType) &&
    isHash(record.actionDescriptionHash) &&
    hasText(record.actionReversibilityPolicyRef) &&
    record.reversibilityLevel !== "unknown" &&
    (!record.highStakes || hasHighStakesDomains(record)) &&
    NON_BLOCKING_STATES.has(record.assessmentState) &&
    record.irreversiblePerformanceBeforeLockBlocked &&
    hasPassedHighStakesReview(record) &&
    !record.supersededBy
  );
}

function pushRecordBlockers(
  blockers: string[],
  record: MoralTradeActionReversibilityRecord,
  checkedAt: string,
  requiresApprovedHighStakesFlow: boolean,
) {
  const id = hasText(record.recordId) ? record.recordId : "action-reversibility:missing-id";

  if (!hasText(record.recordId)) {
    blockers.push("action_reversibility_record_id_missing");
  }

  if (!SUBJECT_TYPES.has(record.subjectType)) {
    blockers.push(`action_reversibility_subject_type_invalid:${id}`);
  }

  if (!hasText(record.subjectRef)) {
    blockers.push(`action_reversibility_subject_ref_missing:${id}`);
  }

  if (!hasText(record.actionReversibilityPolicyRef)) {
    blockers.push(`action_reversibility_policy_missing:${id}`);
  }

  if (!isHash(record.actionDescriptionHash)) {
    blockers.push(`action_reversibility_action_hash_invalid:${id}`);
  }

  if (record.reversibilityLevel === "unknown") {
    blockers.push(`action_reversibility_level_unknown:${id}`);
  }

  if (record.highStakes && !hasHighStakesDomains(record)) {
    blockers.push(`action_reversibility_high_stakes_domain_missing:${id}`);
  }

  if (!record.irreversiblePerformanceBeforeLockBlocked) {
    blockers.push(`irreversible_performance_before_lock_not_blocked:${id}`);
  }

  const highRisk = isHighStakesOrIrreversible(record);
  if (requiresApprovedHighStakesFlow && highRisk) {
    const reviewStates: Array<[string, MoralTradeActionReviewState]> = [
      ["legal", record.legalReviewState],
      ["externality", record.externalityReviewState],
      ["vulnerability", record.vulnerabilityReviewState],
      ["neutral", record.neutralReviewState],
    ];

    for (const [key, state] of reviewStates) {
      if (!PASSING_REVIEW_STATES.has(state)) {
        blockers.push(`action_reversibility_${key}_review_not_passed:${id}:${state}`);
      }
    }

    if (!record.exactFlowApproved) {
      blockers.push(`action_reversibility_exact_flow_not_approved:${id}`);
    }

    if (record.launchMode !== "approved_reliance") {
      blockers.push(`action_reversibility_launch_mode_not_approved:${id}:${record.launchMode}`);
    }
  }

  if (!NON_BLOCKING_STATES.has(record.assessmentState)) {
    blockers.push(`action_reversibility_assessment_state_not_non_blocking:${id}:${record.assessmentState}`);
  }

  if (!hasText(record.reviewerDecisionRef)) {
    blockers.push(`action_reversibility_reviewer_decision_missing:${id}`);
  }

  if (!isIsoDate(record.createdAt) || !isIsoDate(record.updatedAt)) {
    blockers.push(`action_reversibility_timestamps_invalid:${id}`);
  }

  if (isExpired(record.expiresAt, checkedAt)) {
    blockers.push(`action_reversibility_record_expired:${id}`);
  }

  if (daysBetween(record.updatedAt, checkedAt) > MAX_REVIEW_AGE_DAYS) {
    blockers.push(`action_reversibility_record_stale:${id}`);
  }

  if (record.supersededBy) {
    blockers.push(`action_reversibility_record_superseded:${id}`);
  }
}

export function evaluateMoralTradeActionReversibility(
  input: MoralTradeActionReversibilityEvaluationInput,
): MoralTradeActionReversibilityEvaluation {
  const checkedAt = input.checkedAt ?? new Date().toISOString();
  const transition = transitionContract(input.transition);
  const blockers: string[] = [];

  if (input.actionReversibilityRequired && input.records.length === 0) {
    blockers.push("action_reversibility_record_required");
  }

  if (transition.requiresAssessmentRecords && input.records.length === 0) {
    blockers.push(`action_reversibility_record_missing_for_transition:${transition.key}`);
  }

  for (const record of input.records) {
    pushRecordBlockers(
      blockers,
      record,
      checkedAt,
      transition.requiresApprovedHighStakesFlow,
    );
  }

  const nonBlockingRecordCount = input.records.filter(isNonBlocking).length;
  const highStakesOrIrreversibleRecordCount = input.records.filter(
    isHighStakesOrIrreversible,
  ).length;
  const approvedHighStakesRecordCount = input.records.filter(
    (record) => isHighStakesOrIrreversible(record) && hasPassedHighStakesReview(record),
  ).length;

  if (
    transition.requiresNonBlockingReview &&
    input.records.length > 0 &&
    nonBlockingRecordCount === 0
  ) {
    blockers.push(`action_reversibility_no_non_blocking_record:${transition.key}`);
  }

  if (
    transition.requiresApprovedHighStakesFlow &&
    highStakesOrIrreversibleRecordCount > 0 &&
    approvedHighStakesRecordCount === 0
  ) {
    blockers.push(`action_reversibility_no_approved_high_stakes_record:${transition.key}`);
  }

  return {
    status: blockers.length === 0 ? "pass" : "blocked",
    transition: input.transition,
    checkedAt,
    actionReversibilityRequired: input.actionReversibilityRequired,
    recordCount: input.records.length,
    nonBlockingRecordCount,
    highStakesOrIrreversibleRecordCount,
    approvedHighStakesRecordCount,
    blockers,
    userFacingBlockerCategories:
      blockers.length === 0 ? [] : [transition.userFacingBlockerCategory],
  };
}

function sampleRecord(
  overrides: Partial<MoralTradeActionReversibilityRecord> = {},
): MoralTradeActionReversibilityRecord {
  return {
    actionDescriptionHash: makeHash("action-description"),
    actionReversibilityPolicyRef: "policy:action-reversibility:v1",
    assessmentState: "approved",
    createdAt: "2026-06-13T12:00:00.000Z",
    exactFlowApproved: true,
    expiresAt: "2026-12-13T12:00:00.000Z",
    externalityReviewState: "passed",
    highStakes: true,
    highStakesDomainRefs: ["domain:employment"],
    irreversiblePerformanceBeforeLockBlocked: true,
    launchMode: "approved_reliance",
    legalReviewState: "passed",
    neutralReviewState: "passed",
    recordId: "action-reversibility:demo",
    reviewerDecisionRef: "review:action-reversibility",
    reversibilityLevel: "effectively_irreversible",
    subjectRef: "pledge-swap:demo",
    subjectType: "pledge_swap",
    supersededBy: null,
    updatedAt: "2026-06-13T12:00:00.000Z",
    vulnerabilityReviewState: "passed",
    ...overrides,
  };
}

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeActionReversibilityCheck {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

export function getMoralTradeActionReversibilityContract():
  MoralTradeActionReversibilityContract {
  const previewSample = evaluateMoralTradeActionReversibility({
    transition: "draft_preview",
    checkedAt: "2026-06-13T12:00:00.000Z",
    actionReversibilityRequired: false,
    records: [],
  });
  const lockSample = evaluateMoralTradeActionReversibility({
    transition: "matched_trade_lock",
    checkedAt: "2026-06-13T12:00:00.000Z",
    actionReversibilityRequired: true,
    records: [sampleRecord()],
  });
  const reversibleSample = evaluateMoralTradeActionReversibility({
    transition: "performance_start",
    checkedAt: "2026-06-13T12:00:00.000Z",
    actionReversibilityRequired: true,
    records: [
      sampleRecord({
        exactFlowApproved: false,
        externalityReviewState: "not_required_for_stage",
        highStakes: false,
        highStakesDomainRefs: [],
        launchMode: "manual_review",
        legalReviewState: "not_required_for_stage",
        neutralReviewState: "not_required_for_stage",
        reversibilityLevel: "reversible",
        vulnerabilityReviewState: "not_required_for_stage",
      }),
    ],
  });
  const blockedSample = evaluateMoralTradeActionReversibility({
    transition: "reliance_bearing_transition",
    checkedAt: "2026-06-13T12:00:00.000Z",
    actionReversibilityRequired: true,
    records: [
      sampleRecord({
        exactFlowApproved: false,
        externalityReviewState: "under_review",
        irreversiblePerformanceBeforeLockBlocked: false,
        launchMode: "preview_only",
        legalReviewState: "blocked",
        neutralReviewState: "under_review",
        vulnerabilityReviewState: "stale",
      }),
    ],
  });

  return {
    version: MORAL_TRADE_ACTION_REVERSIBILITY_CONTRACT_VERSION,
    purpose:
      "Fail-closed action-reversibility governance for pledge swaps, compensated moral actions, performance bonds, and side agreements.",
    failClosedRule:
      "Reliance-bearing transitions cannot proceed unless requested actions are classified as reversible, partly reversible, or effectively irreversible and all required review gates pass under immutable policy.",
    highStakesRule:
      "High-stakes or effectively irreversible actions remain preview/manual-review only unless the exact flow passes legal, nonparticipant-externality, vulnerability, and neutral-review gates for the release stage.",
    noIrreversibleBeforeLockRule:
      "The platform must not induce irreversible performance before reciprocal lock, confirmation, authorization, eligibility, and atomic settlement controls are complete.",
    firstClassRecordTables: [...FIRST_CLASS_RECORD_TABLES],
    policySnapshotSubjects: [...POLICY_SNAPSHOT_SUBJECTS],
    releaseGateTestHooks: [...RELEASE_GATE_TEST_HOOKS],
    transitions: [...TRANSITIONS],
    sampleEvaluations: [previewSample, lockSample, reversibleSample, blockedSample],
    contractTests: [...CONTRACT_TESTS],
  };
}

export function validateMoralTradeActionReversibilityContract(
  contract = getMoralTradeActionReversibilityContract(),
): MoralTradeActionReversibilityValidation {
  const checks = [
    check(
      "first-class-record-tables",
      "Action-reversibility assessment and enforcement records are first-class tables.",
      FIRST_CLASS_RECORD_TABLES.every((table) =>
        contract.firstClassRecordTables.includes(table),
      ),
      contract.firstClassRecordTables.join(", "),
    ),
    check(
      "policy-subjects",
      "Action-reversibility, legal, externality, vulnerability, and release policies are immutable inputs.",
      POLICY_SNAPSHOT_SUBJECTS.every((subject) =>
        contract.policySnapshotSubjects.includes(subject),
      ),
      contract.policySnapshotSubjects.join(", "),
    ),
    check(
      "release-gate-hook",
      "Release promotion exposes the irreversible-action gate test hook.",
      contract.releaseGateTestHooks.includes("irreversible_action_gate_test"),
      contract.releaseGateTestHooks.join(", "),
    ),
    check(
      "high-risk-transitions",
      "Lock, payment, performance start, reliance, public metrics, and release promotion require action-reversibility review.",
      [
        "matched_trade_lock",
        "payment_capture",
        "performance_start",
        "reliance_bearing_transition",
        "public_metric_publication",
        "release_gate_promotion",
      ].every((transition) =>
        contract.transitions.some(
          (entry) =>
            entry.key === transition &&
            entry.requiresAssessmentRecords &&
            entry.requiresNonBlockingReview,
        ),
      ),
      contract.transitions.map((entry) => entry.key).join(", "),
    ),
    check(
      "high-stakes-rule",
      "The contract blocks high-stakes or irreversible actions without exact-flow review.",
      /exact flow passes legal/i.test(contract.highStakesRule) &&
        /neutral-review/i.test(contract.highStakesRule),
      contract.highStakesRule,
    ),
    check(
      "no-irreversible-before-lock",
      "The contract blocks irreversible performance before reciprocal lock.",
      /must not induce irreversible performance before reciprocal lock/i.test(
        contract.noIrreversibleBeforeLockRule,
      ),
      contract.noIrreversibleBeforeLockRule,
    ),
    check(
      "sample-evaluations",
      "Sample evaluations include pass and blocked states.",
      contract.sampleEvaluations.some((sample) => sample.status === "pass") &&
        contract.sampleEvaluations.some((sample) => sample.status === "blocked"),
      contract.sampleEvaluations
        .map((sample) => `${sample.transition}:${sample.status}`)
        .join(", "),
    ),
    check(
      "contract-tests",
      "Contract advertises action-reversibility tests.",
      CONTRACT_TESTS.every((testName) => contract.contractTests.includes(testName)),
      contract.contractTests.join(", "),
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => entry.id);

  return {
    status: blockers.length === 0 ? "pass" : "fail",
    validatorName: "moral-trade-action-reversibility-contract",
    validatorVersion: MORAL_TRADE_ACTION_REVERSIBILITY_VALIDATOR_VERSION,
    contractVersion: contract.version,
    checks,
    blockers,
  };
}
