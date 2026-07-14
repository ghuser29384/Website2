export const MORAL_TRADE_RESOURCE_COMPATIBILITY_CONTRACT_VERSION =
  "moral-trade-resource-compatibility-v0.1-2026-06";
export const MORAL_TRADE_RESOURCE_COMPATIBILITY_VALIDATOR_VERSION =
  "moral-trade-resource-compatibility-validator-v0.1";

export type MoralTradeResourceCompatibilityTransition =
  | "draft_preview"
  | "match_candidate_generation"
  | "matched_trade_lock"
  | "clearing_run"
  | "payment_capture"
  | "public_metric_publication"
  | "release_gate_promotion";

export type MoralTradeResourceCompatibilitySubjectType =
  | "offset_offer"
  | "pledge_swap_offer"
  | "matched_trade_lock_proposal"
  | "cleared_trade_agreement"
  | "compensated_action_terms"
  | "negative_commitment_scope"
  | "side_agreement_disclosure";

export type MoralTradeResourceConflictType =
  | "none_disclosed"
  | "mutually_exclusive_resource"
  | "mutually_exclusive_action"
  | "incompatible_destination"
  | "incompatible_timing"
  | "zero_sum_control_claim"
  | "third_party_control_conflict"
  | "manual_review"
  | "unknown";

export type MoralTradeJointFeasibilityState =
  | "feasible"
  | "feasible_with_conditions"
  | "under_review"
  | "infeasible_blocking"
  | "disputed"
  | "manual_review"
  | "superseded";

export type MoralTradeHybridOrCompromiseGoodState =
  | "not_applicable"
  | "identified"
  | "unclear"
  | "blocked"
  | "manual_review";

export type MoralTradeResourceCompatibilityReviewState =
  | "not_required"
  | "under_review"
  | "non_blocking"
  | "blocked"
  | "manual_review"
  | "superseded";

export type MoralTradeResourceCompatibilityPolicyStatus =
  | "resolved_immutable"
  | "missing"
  | "mutable"
  | "stale"
  | "superseded";

export interface MoralTradeResourceCompatibilityAssessmentRecord {
  assessmentId: string;
  subjectType: MoralTradeResourceCompatibilitySubjectType;
  subjectId: string;
  participantIdsHash: string;
  resourceCompatibilityPolicyRef: string;
  policyStatus: MoralTradeResourceCompatibilityPolicyStatus;
  resourceOrActionConflictType: MoralTradeResourceConflictType;
  jointFeasibilityState: MoralTradeJointFeasibilityState;
  hybridOrCompromiseGoodState: MoralTradeHybridOrCompromiseGoodState;
  incompatibleDutyOrControlRefs: string[];
  reviewState: MoralTradeResourceCompatibilityReviewState;
  reviewerDecisionRef: string | null;
  createdAt: string;
  updatedAt: string;
  publicParticipantIdentity: boolean;
  publicPrivateDutiesOrConstraints: boolean;
  publicPrivateResourceClaims: boolean;
  publicReviewerNotes: boolean;
  publicThirdPartyControlFacts: boolean;
}

export interface MoralTradeResourceCompatibilityEvaluationInput {
  transition: MoralTradeResourceCompatibilityTransition;
  assessmentRequired: boolean;
  checkedAt?: string;
  assessments: MoralTradeResourceCompatibilityAssessmentRecord[];
}

export interface MoralTradeResourceCompatibilityEvaluation {
  status: "pass" | "blocked";
  transition: MoralTradeResourceCompatibilityTransition;
  checkedAt: string;
  assessmentRequired: boolean;
  reviewedAssessmentCount: number;
  feasibleAssessmentCount: number;
  privacySafeAssessmentCount: number;
  blockers: string[];
  userFacingBlockerCategories: string[];
}

export interface MoralTradeResourceCompatibilityTransitionDefinition {
  key: MoralTradeResourceCompatibilityTransition;
  label: string;
  requiresAssessment: boolean;
  requiresNonBlockingReview: boolean;
  userFacingBlockerCategory: string;
}

export interface MoralTradeResourceCompatibilityCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradeResourceCompatibilityValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-resource-compatibility-contract";
  validatorVersion: string;
  contractVersion: string;
  checks: MoralTradeResourceCompatibilityCheck[];
  blockers: string[];
}

export interface MoralTradeResourceCompatibilityContract {
  version: string;
  purpose: string;
  failClosedRule: string;
  privacyBoundary: string;
  zeroSumConflictRule: string;
  firstClassRecordTables: string[];
  policySnapshotSubjects: string[];
  subjectTypes: MoralTradeResourceCompatibilitySubjectType[];
  conflictTypes: MoralTradeResourceConflictType[];
  jointFeasibilityStates: MoralTradeJointFeasibilityState[];
  hybridOrCompromiseGoodStates: MoralTradeHybridOrCompromiseGoodState[];
  reviewStates: MoralTradeResourceCompatibilityReviewState[];
  policyStatuses: MoralTradeResourceCompatibilityPolicyStatus[];
  transitionDefinitions: MoralTradeResourceCompatibilityTransitionDefinition[];
  sampleEvaluations: MoralTradeResourceCompatibilityEvaluation[];
  contractTests: string[];
}

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
const MAX_ASSESSMENT_AGE_DAYS = 120;

const FIRST_CLASS_RECORD_TABLES = [
  "moral_trade_resource_compatibility_assessments",
] as const;

const POLICY_SNAPSHOT_SUBJECTS = ["resource_compatibility"] as const;

const SUBJECT_TYPES: MoralTradeResourceCompatibilitySubjectType[] = [
  "offset_offer",
  "pledge_swap_offer",
  "matched_trade_lock_proposal",
  "cleared_trade_agreement",
  "compensated_action_terms",
  "negative_commitment_scope",
  "side_agreement_disclosure",
];

const CONFLICT_TYPES: MoralTradeResourceConflictType[] = [
  "none_disclosed",
  "mutually_exclusive_resource",
  "mutually_exclusive_action",
  "incompatible_destination",
  "incompatible_timing",
  "zero_sum_control_claim",
  "third_party_control_conflict",
  "manual_review",
  "unknown",
];

const JOINT_FEASIBILITY_STATES: MoralTradeJointFeasibilityState[] = [
  "feasible",
  "feasible_with_conditions",
  "under_review",
  "infeasible_blocking",
  "disputed",
  "manual_review",
  "superseded",
];

const HYBRID_OR_COMPROMISE_GOOD_STATES: MoralTradeHybridOrCompromiseGoodState[] = [
  "not_applicable",
  "identified",
  "unclear",
  "blocked",
  "manual_review",
];

const REVIEW_STATES: MoralTradeResourceCompatibilityReviewState[] = [
  "not_required",
  "under_review",
  "non_blocking",
  "blocked",
  "manual_review",
  "superseded",
];

const POLICY_STATUSES: MoralTradeResourceCompatibilityPolicyStatus[] = [
  "resolved_immutable",
  "missing",
  "mutable",
  "stale",
  "superseded",
];

const BLOCKING_CONFLICT_TYPES = new Set<MoralTradeResourceConflictType>([
  "mutually_exclusive_resource",
  "mutually_exclusive_action",
  "incompatible_destination",
  "incompatible_timing",
  "zero_sum_control_claim",
  "third_party_control_conflict",
  "manual_review",
  "unknown",
]);

const PASSING_FEASIBILITY_STATES = new Set<MoralTradeJointFeasibilityState>([
  "feasible",
  "feasible_with_conditions",
]);

const PASSING_HYBRID_STATES = new Set<MoralTradeHybridOrCompromiseGoodState>([
  "not_applicable",
  "identified",
]);

const TRANSITION_DEFINITIONS: MoralTradeResourceCompatibilityTransitionDefinition[] = [
  {
    key: "draft_preview",
    label: "Draft preview",
    requiresAssessment: false,
    requiresNonBlockingReview: false,
    userFacingBlockerCategory:
      "Resource compatibility is preview-only until an assessment is reviewed",
  },
  {
    key: "match_candidate_generation",
    label: "Match-candidate generation",
    requiresAssessment: true,
    requiresNonBlockingReview: true,
    userFacingBlockerCategory:
      "Candidate generation needs joint feasibility review before bucketed trades are matchable",
  },
  {
    key: "matched_trade_lock",
    label: "Matched-trade lock",
    requiresAssessment: true,
    requiresNonBlockingReview: true,
    userFacingBlockerCategory:
      "Lock requires reviewed jointly feasible actions, destinations, timing, duties, and control claims",
  },
  {
    key: "clearing_run",
    label: "Clearing run",
    requiresAssessment: true,
    requiresNonBlockingReview: true,
    userFacingBlockerCategory:
      "Clearing cannot rely on mutually infeasible resources or zero-sum control claims",
  },
  {
    key: "payment_capture",
    label: "Payment capture",
    requiresAssessment: true,
    requiresNonBlockingReview: true,
    userFacingBlockerCategory:
      "Payment capture waits for non-blocking resource-compatibility review",
  },
  {
    key: "public_metric_publication",
    label: "Public metric publication",
    requiresAssessment: true,
    requiresNonBlockingReview: true,
    userFacingBlockerCategory:
      "Public metrics cannot count trades that repackage zero-sum conflicts",
  },
  {
    key: "release_gate_promotion",
    label: "Release-gate promotion",
    requiresAssessment: true,
    requiresNonBlockingReview: true,
    userFacingBlockerCategory:
      "Release promotion requires first-class resource-compatibility evidence",
  },
];

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeResourceCompatibilityCheck {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

function hasValidHash(value: string | null) {
  return Boolean(value && HASH_PATTERN.test(value));
}

function hasMeaningfulText(value: string | null) {
  return Boolean(value && value.trim().length >= 3);
}

function daysBetween(olderIso: string, newerIso: string) {
  const older = Date.parse(olderIso);
  const newer = Date.parse(newerIso);

  if (!Number.isFinite(older) || !Number.isFinite(newer) || newer < older) {
    return Number.POSITIVE_INFINITY;
  }

  return (newer - older) / 86_400_000;
}

function isPrivacySafe(record: MoralTradeResourceCompatibilityAssessmentRecord) {
  return (
    !record.publicParticipantIdentity &&
    !record.publicPrivateDutiesOrConstraints &&
    !record.publicPrivateResourceClaims &&
    !record.publicReviewerNotes &&
    !record.publicThirdPartyControlFacts
  );
}

function isFeasible(record: MoralTradeResourceCompatibilityAssessmentRecord) {
  return (
    record.resourceOrActionConflictType === "none_disclosed" &&
    PASSING_FEASIBILITY_STATES.has(record.jointFeasibilityState) &&
    PASSING_HYBRID_STATES.has(record.hybridOrCompromiseGoodState)
  );
}

function pushAssessmentBlockers(
  blockers: string[],
  record: MoralTradeResourceCompatibilityAssessmentRecord,
  checkedAt: string,
) {
  if (!hasMeaningfulText(record.assessmentId)) {
    blockers.push("resource_compatibility_assessment_id_missing");
  }

  if (!hasMeaningfulText(record.subjectId)) {
    blockers.push(`resource_compatibility_subject_missing:${record.assessmentId}`);
  }

  if (!hasValidHash(record.participantIdsHash)) {
    blockers.push(`resource_compatibility_participant_hash_invalid:${record.assessmentId}`);
  }

  if (!hasMeaningfulText(record.resourceCompatibilityPolicyRef)) {
    blockers.push(`resource_compatibility_policy_ref_missing:${record.assessmentId}`);
  }

  if (record.policyStatus !== "resolved_immutable") {
    blockers.push(
      `resource_compatibility_policy_not_immutable:${record.assessmentId}:${record.policyStatus}`,
    );
  }

  if (BLOCKING_CONFLICT_TYPES.has(record.resourceOrActionConflictType)) {
    blockers.push(
      `resource_or_action_conflict_blocking:${record.assessmentId}:${record.resourceOrActionConflictType}`,
    );
  }

  if (!PASSING_FEASIBILITY_STATES.has(record.jointFeasibilityState)) {
    blockers.push(
      `joint_feasibility_not_non_blocking:${record.assessmentId}:${record.jointFeasibilityState}`,
    );
  }

  if (!PASSING_HYBRID_STATES.has(record.hybridOrCompromiseGoodState)) {
    blockers.push(
      `hybrid_or_compromise_good_not_clear:${record.assessmentId}:${record.hybridOrCompromiseGoodState}`,
    );
  }

  if (
    record.resourceOrActionConflictType !== "none_disclosed" &&
    record.incompatibleDutyOrControlRefs.length === 0
  ) {
    blockers.push(`incompatible_duty_or_control_refs_missing:${record.assessmentId}`);
  }

  if (record.reviewState !== "non_blocking") {
    blockers.push(
      `resource_compatibility_review_not_non_blocking:${record.assessmentId}:${record.reviewState}`,
    );
  }

  if (!hasMeaningfulText(record.reviewerDecisionRef)) {
    blockers.push(`resource_compatibility_reviewer_decision_missing:${record.assessmentId}`);
  }

  if (daysBetween(record.updatedAt, checkedAt) > MAX_ASSESSMENT_AGE_DAYS) {
    blockers.push(`stale_resource_compatibility_assessment:${record.assessmentId}`);
  }

  if (!isPrivacySafe(record)) {
    blockers.push(`resource_compatibility_privacy_leak:${record.assessmentId}`);
  }
}

export function evaluateMoralTradeResourceCompatibility(
  input: MoralTradeResourceCompatibilityEvaluationInput,
): MoralTradeResourceCompatibilityEvaluation {
  const checkedAt = input.checkedAt ?? new Date().toISOString();
  const blockers: string[] = [];

  if (input.assessmentRequired && input.assessments.length === 0) {
    blockers.push("resource_compatibility_assessment_record_missing");
  }

  for (const assessment of input.assessments) {
    pushAssessmentBlockers(blockers, assessment, checkedAt);
  }

  if (
    input.assessmentRequired &&
    !input.assessments.some(
      (assessment) =>
        assessment.reviewState === "non_blocking" &&
        assessment.policyStatus === "resolved_immutable" &&
        isFeasible(assessment) &&
        isPrivacySafe(assessment),
    )
  ) {
    blockers.push("non_blocking_resource_compatibility_assessment_missing");
  }

  return {
    status: blockers.length ? "blocked" : "pass",
    transition: input.transition,
    checkedAt,
    assessmentRequired: input.assessmentRequired,
    reviewedAssessmentCount: input.assessments.filter(
      (assessment) => assessment.reviewState === "non_blocking",
    ).length,
    feasibleAssessmentCount: input.assessments.filter(isFeasible).length,
    privacySafeAssessmentCount: input.assessments.filter(isPrivacySafe).length,
    blockers,
    userFacingBlockerCategories: TRANSITION_DEFINITIONS.filter(
      (transition) => transition.key === input.transition && blockers.length,
    ).map((transition) => transition.userFacingBlockerCategory),
  };
}

function demoAssessment(
  overrides: Partial<MoralTradeResourceCompatibilityAssessmentRecord> = {},
): MoralTradeResourceCompatibilityAssessmentRecord {
  return {
    assessmentId: "resource-compatibility:demo",
    subjectType: "matched_trade_lock_proposal",
    subjectId: "matched-trade-lock-proposal:demo",
    participantIdsHash:
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    resourceCompatibilityPolicyRef: "policy-snapshot:resource-compatibility-v1",
    policyStatus: "resolved_immutable",
    resourceOrActionConflictType: "none_disclosed",
    jointFeasibilityState: "feasible",
    hybridOrCompromiseGoodState: "identified",
    incompatibleDutyOrControlRefs: [],
    reviewState: "non_blocking",
    reviewerDecisionRef: "review-decision:resource-compatibility",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-12T00:00:00.000Z",
    publicParticipantIdentity: false,
    publicPrivateDutiesOrConstraints: false,
    publicPrivateResourceClaims: false,
    publicReviewerNotes: false,
    publicThirdPartyControlFacts: false,
    ...overrides,
  };
}

export function getMoralTradeResourceCompatibilityContract(): MoralTradeResourceCompatibilityContract {
  return {
    version: MORAL_TRADE_RESOURCE_COMPATIBILITY_CONTRACT_VERSION,
    purpose:
      "Fail-closed resource-compatibility and joint-feasibility contract for non-public-goods Moral Trade previews, locks, clearing, payment, public metrics, and release gates.",
    failClosedRule:
      "Non-public-goods trades need a first-class resource-compatibility assessment before proposed actions, donations, abstentions, destinations, timing, duties, or control claims can clear, lock, capture, count publicly, or promote release gates. Missing, stale, disputed, under-review, infeasible, mutually exclusive, zero-sum, third-party-control, unknown, or privacy-leaking assessments fail closed to preview/manual review.",
    privacyBoundary:
      "Public surfaces may expose only coarse compatibility status categories, subject type, conflict class, and contract version. They must not expose participant identity hashes, private duties or constraints, private resource claims, reviewer notes, third-party control facts, raw side agreements, or participant-specific assessment rows.",
    zeroSumConflictRule:
      "A trade cannot clear merely because each party likes some part of it when the asserted gain comes from both parties claiming the same scarce control right, blocking each other's action, incompatible timing or destination, or relabeling a zero-sum conflict as a compromise.",
    firstClassRecordTables: [...FIRST_CLASS_RECORD_TABLES],
    policySnapshotSubjects: [...POLICY_SNAPSHOT_SUBJECTS],
    subjectTypes: [...SUBJECT_TYPES],
    conflictTypes: [...CONFLICT_TYPES],
    jointFeasibilityStates: [...JOINT_FEASIBILITY_STATES],
    hybridOrCompromiseGoodStates: [...HYBRID_OR_COMPROMISE_GOOD_STATES],
    reviewStates: [...REVIEW_STATES],
    policyStatuses: [...POLICY_STATUSES],
    transitionDefinitions: TRANSITION_DEFINITIONS,
    sampleEvaluations: [
      evaluateMoralTradeResourceCompatibility({
        transition: "clearing_run",
        assessmentRequired: true,
        checkedAt: "2026-06-12T00:00:00.000Z",
        assessments: [demoAssessment()],
      }),
      evaluateMoralTradeResourceCompatibility({
        transition: "clearing_run",
        assessmentRequired: true,
        checkedAt: "2026-06-12T00:00:00.000Z",
        assessments: [
          demoAssessment({
            resourceOrActionConflictType: "zero_sum_control_claim",
            jointFeasibilityState: "infeasible_blocking",
            hybridOrCompromiseGoodState: "blocked",
            incompatibleDutyOrControlRefs: ["control-claim:shared-scarce-right"],
            reviewState: "blocked",
          }),
        ],
      }),
    ],
    contractTests: [
      "resource_compatibility_assessment_test",
      "resource_compatibility_contract_validator",
      "resource_compatibility_zero_sum_conflict_blocks",
      "resource_compatibility_privacy_boundary",
      "resource_compatibility_route_contract",
      "resource_compatibility_schema_contract",
    ],
  };
}

export function validateMoralTradeResourceCompatibilityContract(
  contract = getMoralTradeResourceCompatibilityContract(),
): MoralTradeResourceCompatibilityValidation {
  const checks = [
    check(
      "first-class-records",
      "Contract names resource compatibility assessment records",
      FIRST_CLASS_RECORD_TABLES.every((table) =>
        contract.firstClassRecordTables.includes(table),
      ),
      contract.firstClassRecordTables.join(", "),
    ),
    check(
      "policy-snapshot-subject",
      "Contract names resource_compatibility policy snapshots",
      contract.policySnapshotSubjects.includes("resource_compatibility"),
      contract.policySnapshotSubjects.join(", "),
    ),
    check(
      "subject-coverage",
      "Contract covers offset, pledge, lock, cleared agreement, compensated-action, negative-commitment, and side-agreement subjects",
      SUBJECT_TYPES.every((subjectType) => contract.subjectTypes.includes(subjectType)),
      contract.subjectTypes.join(", "),
    ),
    check(
      "conflict-coverage",
      "Contract covers mutually exclusive, incompatible, zero-sum, third-party, manual-review, and unknown conflict states",
      [
        "mutually_exclusive_resource",
        "mutually_exclusive_action",
        "incompatible_destination",
        "incompatible_timing",
        "zero_sum_control_claim",
        "third_party_control_conflict",
        "manual_review",
        "unknown",
      ].every((conflictType) =>
        contract.conflictTypes.includes(conflictType as MoralTradeResourceConflictType),
      ),
      contract.conflictTypes.join(", "),
    ),
    check(
      "transition-coverage",
      "Transitions guard lock, clearing, payment, public metrics, and release promotion",
      ["matched_trade_lock", "clearing_run", "payment_capture", "public_metric_publication", "release_gate_promotion"].every(
        (transition) =>
          contract.transitionDefinitions.some(
            (definition) => definition.key === transition,
          ),
      ),
      contract.transitionDefinitions.map((definition) => definition.key).join(", "),
    ),
    check(
      "privacy-boundary",
      "Privacy boundary excludes private duties, resource claims, reviewer notes, and participant-specific rows",
      /private duties/i.test(contract.privacyBoundary) &&
        /private resource claims/i.test(contract.privacyBoundary) &&
        /participant-specific assessment rows/i.test(contract.privacyBoundary),
      contract.privacyBoundary,
    ),
    check(
      "zero-sum-rule",
      "Zero-sum rule blocks shared scarce control claims and relabeled conflicts",
      /scarce control right/i.test(contract.zeroSumConflictRule) &&
        /zero-sum conflict/i.test(contract.zeroSumConflictRule),
      contract.zeroSumConflictRule,
    ),
    check(
      "sample-pass-and-block",
      "Sample evaluations include passing and blocked resource-compatibility paths",
      contract.sampleEvaluations.some((evaluation) => evaluation.status === "pass") &&
        contract.sampleEvaluations.some((evaluation) => evaluation.status === "blocked"),
      contract.sampleEvaluations
        .map((evaluation) => `${evaluation.transition}:${evaluation.status}`)
        .join(", "),
    ),
    check(
      "release-gate-test",
      "Contract advertises resource_compatibility_assessment_test",
      contract.contractTests.includes("resource_compatibility_assessment_test"),
      contract.contractTests.join(", "),
    ),
  ];
  const blockers = checks
    .filter((item) => item.status === "fail")
    .map((item) => item.id);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-resource-compatibility-contract",
    validatorVersion: MORAL_TRADE_RESOURCE_COMPATIBILITY_VALIDATOR_VERSION,
    contractVersion: contract.version,
    checks,
    blockers,
  };
}
