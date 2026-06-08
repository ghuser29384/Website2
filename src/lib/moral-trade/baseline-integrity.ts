export const MORAL_TRADE_BASELINE_INTEGRITY_CONTRACT_VERSION =
  "moral-trade-baseline-integrity-v0.1-2026-06";
export const MORAL_TRADE_BASELINE_INTEGRITY_VALIDATOR_VERSION =
  "moral-trade-baseline-integrity-validator-v0.1";

export type MoralTradeBaselineIntegrityTransition =
  | "donation_offset_lock"
  | "pledge_swap_lock"
  | "broad_match_candidate"
  | "public_goods_round"
  | "post_lock_amendment";

export type MoralTradeBaselineIntegritySubjectType =
  | "offset_offer"
  | "pledge_swap_offer"
  | "matched_trade_lock_proposal"
  | "cleared_trade_agreement";

export type MoralTradeBaselineIntegrityReviewStatus =
  | "passed"
  | "not_required_for_stage"
  | "missing"
  | "under_review"
  | "failed"
  | "stale"
  | "superseded";

export type MoralTradeBaselineIntegrityAssessmentState =
  | "not_required"
  | "under_review"
  | "non_blocking"
  | "blocked"
  | "superseded"
  | "stale";

export type MoralTradeBaselineIntegritySourceKind =
  | "pre_existing_behavior"
  | "independent_obligation"
  | "historical_pattern"
  | "marketplace_created"
  | "marketplace_escalated"
  | "counterparty_triggered"
  | "unknown";

export type MoralTradeBaselineIntegrityLaunchClassification =
  | "clearable_moral_trade"
  | "preview_only"
  | "rejected_threat_externality"
  | "manual_review_required";

export type MoralTradeBaselineIntegrityFailClosedStatus =
  | "assessment_missing"
  | "assessment_under_review"
  | "assessment_blocked"
  | "assessment_stale"
  | "assessment_superseded"
  | "launch_classification_not_clearable"
  | "policy_missing"
  | "policy_mutable"
  | "policy_stale"
  | "policy_superseded"
  | "baseline_snapshot_missing"
  | "baseline_predates_offer_unverified"
  | "independent_reason_missing"
  | "history_evidence_missing"
  | "marketplace_created_baseline"
  | "marketplace_escalated_baseline"
  | "counterparty_triggered_escalation"
  | "harmful_baseline_escalated"
  | "good_faith_confidence_conflated"
  | "additionality_review_missing"
  | "externality_review_missing"
  | "reviewer_quality_missing"
  | "participant_confirmation_missing"
  | "private_evidence_public"
  | "invalid_assessment_hash"
  | "invalid_policy_hash";

export interface MoralTradeBaselineIntegrityPolicyRecord {
  policyId: string;
  subjectType: MoralTradeBaselineIntegritySubjectType;
  status: MoralTradeBaselineIntegrityReviewStatus;
  predatesOfferRequired: boolean;
  independentReasonRequired: boolean;
  historyEvidenceRequired: boolean;
  additionalityReviewRequired: boolean;
  externalityReviewRequired: boolean;
  reviewerQualityRequired: boolean;
  participantConfirmationRequired: boolean;
  goodFaithConfidenceSeparationRequired: boolean;
  privateEvidencePublicationProhibited: boolean;
  policyHash: string;
  reviewedAt: string | null;
  supersededBy: string | null;
  maxAssessmentAgeDays: number;
}

export interface MoralTradeBaselineIntegrityAssessmentRecord {
  assessmentId: string;
  policyRef: string;
  subjectType: MoralTradeBaselineIntegritySubjectType;
  subjectRef: string;
  assessmentState: MoralTradeBaselineIntegrityAssessmentState;
  launchClassification: MoralTradeBaselineIntegrityLaunchClassification;
  baselineSourceKind: MoralTradeBaselineIntegritySourceKind;
  baselineSnapshotHash: string | null;
  predatesOffer: boolean;
  independentReasonPresent: boolean;
  historyEvidencePresent: boolean;
  marketplaceCreated: boolean;
  marketplaceEscalated: boolean;
  counterpartyTriggeredEscalation: boolean;
  harmfulBaselineEscalated: boolean;
  goodFaithConfidenceSeparated: boolean;
  additionalityReviewStatus: MoralTradeBaselineIntegrityReviewStatus;
  externalityReviewStatus: MoralTradeBaselineIntegrityReviewStatus;
  reviewerQualityStatus: MoralTradeBaselineIntegrityReviewStatus;
  participantConfirmationStatus: MoralTradeBaselineIntegrityReviewStatus;
  privateEvidencePublic: boolean;
  assessmentHash: string;
  reviewedAt: string | null;
  expiresAt: string | null;
  supersededBy: string | null;
}

export interface MoralTradeBaselineIntegrityEvaluationInput {
  transition: MoralTradeBaselineIntegrityTransition;
  subjectType: MoralTradeBaselineIntegritySubjectType;
  requiresClearableTransition: boolean;
  requiresRelianceBearingTransition: boolean;
  requiresAssessment: boolean;
  checkedAt?: string;
  policies: MoralTradeBaselineIntegrityPolicyRecord[];
  assessments: MoralTradeBaselineIntegrityAssessmentRecord[];
}

export interface MoralTradeBaselineIntegrityEvaluation {
  status: "pass" | "blocked";
  transition: MoralTradeBaselineIntegrityTransition;
  subjectType: MoralTradeBaselineIntegritySubjectType;
  checkedAt: string;
  policyCount: number;
  assessmentCount: number;
  blockers: string[];
  launchClassification: MoralTradeBaselineIntegrityLaunchClassification | "unclassified";
  userFacingBlockerCategories: string[];
}

export interface MoralTradeBaselineIntegrityTransitionDefinition {
  key: MoralTradeBaselineIntegrityTransition;
  label: string;
  protectedBoundary: string;
  requiredRecords: string[];
  blocksTransitions: string[];
}

export interface MoralTradeBaselineIntegrityCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradeBaselineIntegrityValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-baseline-integrity-contract";
  validatorVersion: string;
  contractVersion: string;
  checks: MoralTradeBaselineIntegrityCheck[];
  blockers: string[];
}

export interface MoralTradeBaselineIntegrityContract {
  version: string;
  purpose: string;
  privacyRule: string;
  failClosedRule: string;
  enforcementRule: string;
  firstClassRecordTables: string[];
  enforcementRecordTables: string[];
  enforcementRoute: {
    method: "POST";
    path: "/api/moral-trade/baseline-integrity/enforce";
    auth: "authenticated";
    stateMutation: "append_only_enforcement_record";
  };
  policySnapshotSubjects: string[];
  transitions: MoralTradeBaselineIntegrityTransition[];
  subjectTypes: MoralTradeBaselineIntegritySubjectType[];
  assessmentStates: MoralTradeBaselineIntegrityAssessmentState[];
  baselineSourceKinds: MoralTradeBaselineIntegritySourceKind[];
  launchClassifications: MoralTradeBaselineIntegrityLaunchClassification[];
  failClosedStatuses: MoralTradeBaselineIntegrityFailClosedStatus[];
  transitionDefinitions: MoralTradeBaselineIntegrityTransitionDefinition[];
  sampleEvaluations: MoralTradeBaselineIntegrityEvaluation[];
  contractTests: string[];
}

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
const DEFAULT_MAX_ASSESSMENT_AGE_DAYS = 90;

const FIRST_CLASS_RECORD_TABLES = [
  "moral_trade_baseline_integrity_policies",
  "moral_trade_baseline_integrity_assessments",
] as const;

const ENFORCEMENT_RECORD_TABLES = [
  "moral_trade_baseline_integrity_enforcement_records",
] as const;

const POLICY_SNAPSHOT_SUBJECTS = [
  "baseline_integrity",
  "baseline_manufacturing",
] as const;

const TRANSITIONS: MoralTradeBaselineIntegrityTransition[] = [
  "donation_offset_lock",
  "pledge_swap_lock",
  "broad_match_candidate",
  "public_goods_round",
  "post_lock_amendment",
];

const SUBJECT_TYPES: MoralTradeBaselineIntegritySubjectType[] = [
  "offset_offer",
  "pledge_swap_offer",
  "matched_trade_lock_proposal",
  "cleared_trade_agreement",
];

const ASSESSMENT_STATES: MoralTradeBaselineIntegrityAssessmentState[] = [
  "not_required",
  "under_review",
  "non_blocking",
  "blocked",
  "superseded",
  "stale",
];

const BASELINE_SOURCE_KINDS: MoralTradeBaselineIntegritySourceKind[] = [
  "pre_existing_behavior",
  "independent_obligation",
  "historical_pattern",
  "marketplace_created",
  "marketplace_escalated",
  "counterparty_triggered",
  "unknown",
];

const LAUNCH_CLASSIFICATIONS: MoralTradeBaselineIntegrityLaunchClassification[] = [
  "clearable_moral_trade",
  "preview_only",
  "rejected_threat_externality",
  "manual_review_required",
];

const FAIL_CLOSED_STATUSES: MoralTradeBaselineIntegrityFailClosedStatus[] = [
  "assessment_missing",
  "assessment_under_review",
  "assessment_blocked",
  "assessment_stale",
  "assessment_superseded",
  "launch_classification_not_clearable",
  "policy_missing",
  "policy_mutable",
  "policy_stale",
  "policy_superseded",
  "baseline_snapshot_missing",
  "baseline_predates_offer_unverified",
  "independent_reason_missing",
  "history_evidence_missing",
  "marketplace_created_baseline",
  "marketplace_escalated_baseline",
  "counterparty_triggered_escalation",
  "harmful_baseline_escalated",
  "good_faith_confidence_conflated",
  "additionality_review_missing",
  "externality_review_missing",
  "reviewer_quality_missing",
  "participant_confirmation_missing",
  "private_evidence_public",
  "invalid_assessment_hash",
  "invalid_policy_hash",
];

const TRANSITION_DEFINITIONS: MoralTradeBaselineIntegrityTransitionDefinition[] = [
  {
    key: "donation_offset_lock",
    label: "Donation offset lock",
    protectedBoundary:
      "donation offsets cannot lock, capture, or count unless the offset baseline predates the offer and passes a non-blocking manufacturing review",
    requiredRecords: [...FIRST_CLASS_RECORD_TABLES],
    blocksTransitions: ["payment_capture", "cleared_trade_lock", "public_completed_claim"],
  },
  {
    key: "pledge_swap_lock",
    label: "Pledge swap lock",
    protectedBoundary:
      "pledge swaps cannot become reliance-bearing when either side escalated or manufactured a harmful baseline after marketplace exposure",
    requiredRecords: [...FIRST_CLASS_RECORD_TABLES],
    blocksTransitions: ["reliance_bearing_preview", "matched_trade_lock", "performance_start"],
  },
  {
    key: "broad_match_candidate",
    label: "Broad match candidate",
    protectedBoundary:
      "broad candidates remain preview-only when baseline source, history, independent reason, or externality review is unresolved",
    requiredRecords: ["moral_trade_baseline_integrity_assessments"],
    blocksTransitions: ["candidate_publication", "counterparty_preview", "match_candidate_counting"],
  },
  {
    key: "public_goods_round",
    label: "Public goods round",
    protectedBoundary:
      "public-goods clearing previews cannot count donation offsets whose baselines were marketplace-created or escalated",
    requiredRecords: [...FIRST_CLASS_RECORD_TABLES],
    blocksTransitions: ["round_close_publication", "bonus_allocation", "public_money_metric"],
  },
  {
    key: "post_lock_amendment",
    label: "Post-lock amendment",
    protectedBoundary:
      "material amendments require a fresh baseline-integrity assessment and renewed confirmation before changing obligations",
    requiredRecords: [...FIRST_CLASS_RECORD_TABLES],
    blocksTransitions: ["material_terms_update", "renewed_performance_start", "payout_release"],
  },
];

const CONTRACT_TESTS = [
  "baseline_integrity_contract_validator",
  "baseline_integrity_evaluator_fail_closed",
  "baseline_integrity_route_contract",
  "baseline_integrity_enforce_route_contract",
  "baseline_integrity_schema_contract",
  "baseline_integrity_enforcement_record_schema_contract",
  "baseline_integrity_health_contract",
] as const;

function hasAll(values: readonly string[], required: readonly string[]) {
  return required.every((entry) => values.includes(entry));
}

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeBaselineIntegrityCheck {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

function daysBetween(startIso: string, endIso: string) {
  const start = Date.parse(startIso);
  const end = Date.parse(endIso);

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.max(0, (end - start) / 86_400_000);
}

function isExpired(expiresAt: string | null, checkedAt: string) {
  return Boolean(expiresAt && Date.parse(expiresAt) <= Date.parse(checkedAt));
}

function hasValidHash(value: string | null) {
  return Boolean(value && HASH_PATTERN.test(value));
}

function statusPassed(status: MoralTradeBaselineIntegrityReviewStatus) {
  return status === "passed" || status === "not_required_for_stage";
}

function isPolicyCurrent(
  policy: MoralTradeBaselineIntegrityPolicyRecord,
  checkedAt: string,
) {
  if (
    policy.status === "superseded" ||
    policy.status === "stale" ||
    policy.supersededBy ||
    !policy.reviewedAt
  ) {
    return false;
  }

  return daysBetween(policy.reviewedAt, checkedAt) <= DEFAULT_MAX_ASSESSMENT_AGE_DAYS;
}

function isAssessmentCurrent(
  assessment: MoralTradeBaselineIntegrityAssessmentRecord,
  policy: MoralTradeBaselineIntegrityPolicyRecord,
  checkedAt: string,
) {
  if (
    assessment.assessmentState === "superseded" ||
    assessment.assessmentState === "stale" ||
    assessment.supersededBy ||
    isExpired(assessment.expiresAt, checkedAt) ||
    !assessment.reviewedAt
  ) {
    return false;
  }

  return daysBetween(assessment.reviewedAt, checkedAt) <= policy.maxAssessmentAgeDays;
}

function isAssessmentNonBlocking(
  assessment: MoralTradeBaselineIntegrityAssessmentRecord,
) {
  return (
    assessment.assessmentState === "non_blocking" ||
    assessment.assessmentState === "not_required"
  );
}

function policyBlockers(
  policy: MoralTradeBaselineIntegrityPolicyRecord,
  checkedAt: string,
) {
  const blockers: string[] = [];

  if (!statusPassed(policy.status)) {
    if (policy.status === "under_review" || policy.status === "missing") {
      blockers.push(`policy_mutable:${policy.policyId}`);
    } else if (policy.status === "superseded") {
      blockers.push(`policy_superseded:${policy.policyId}`);
    } else {
      blockers.push(`policy_stale:${policy.policyId}`);
    }
  }

  if (!isPolicyCurrent(policy, checkedAt)) {
    blockers.push(`policy_stale:${policy.policyId}`);
  }

  if (policy.supersededBy) {
    blockers.push(`policy_superseded:${policy.policyId}`);
  }

  if (!hasValidHash(policy.policyHash)) {
    blockers.push(`invalid_policy_hash:${policy.policyId}`);
  }

  return blockers;
}

function reviewStatusBlocker(
  status: MoralTradeBaselineIntegrityReviewStatus,
  blocker: MoralTradeBaselineIntegrityFailClosedStatus,
  assessmentId: string,
) {
  return statusPassed(status) ? [] : [`${blocker}:${assessmentId}`];
}

function assessmentBlockers(
  assessment: MoralTradeBaselineIntegrityAssessmentRecord,
  policy: MoralTradeBaselineIntegrityPolicyRecord,
  input: MoralTradeBaselineIntegrityEvaluationInput,
  checkedAt: string,
) {
  const blockers: string[] = [];

  if (assessment.assessmentState === "under_review") {
    blockers.push(`assessment_under_review:${assessment.assessmentId}`);
  }

  if (assessment.assessmentState === "blocked") {
    blockers.push(`assessment_blocked:${assessment.assessmentId}`);
  }

  if (!isAssessmentCurrent(assessment, policy, checkedAt)) {
    blockers.push(`assessment_stale:${assessment.assessmentId}`);
  }

  if (assessment.assessmentState === "superseded" || assessment.supersededBy) {
    blockers.push(`assessment_superseded:${assessment.assessmentId}`);
  }

  if (!isAssessmentNonBlocking(assessment)) {
    blockers.push(`assessment_blocked:${assessment.assessmentId}`);
  }

  if (
    (input.requiresClearableTransition || input.requiresRelianceBearingTransition) &&
    assessment.launchClassification !== "clearable_moral_trade"
  ) {
    blockers.push(`launch_classification_not_clearable:${assessment.assessmentId}`);
  }

  if (!hasValidHash(assessment.baselineSnapshotHash)) {
    blockers.push(`baseline_snapshot_missing:${assessment.assessmentId}`);
  }

  if (policy.predatesOfferRequired && !assessment.predatesOffer) {
    blockers.push(`baseline_predates_offer_unverified:${assessment.assessmentId}`);
  }

  if (policy.independentReasonRequired && !assessment.independentReasonPresent) {
    blockers.push(`independent_reason_missing:${assessment.assessmentId}`);
  }

  if (policy.historyEvidenceRequired && !assessment.historyEvidencePresent) {
    blockers.push(`history_evidence_missing:${assessment.assessmentId}`);
  }

  if (
    assessment.baselineSourceKind === "marketplace_created" ||
    assessment.marketplaceCreated
  ) {
    blockers.push(`marketplace_created_baseline:${assessment.assessmentId}`);
  }

  if (
    assessment.baselineSourceKind === "marketplace_escalated" ||
    assessment.marketplaceEscalated
  ) {
    blockers.push(`marketplace_escalated_baseline:${assessment.assessmentId}`);
  }

  if (
    assessment.baselineSourceKind === "counterparty_triggered" ||
    assessment.counterpartyTriggeredEscalation
  ) {
    blockers.push(`counterparty_triggered_escalation:${assessment.assessmentId}`);
  }

  if (assessment.harmfulBaselineEscalated) {
    blockers.push(`harmful_baseline_escalated:${assessment.assessmentId}`);
  }

  if (
    policy.goodFaithConfidenceSeparationRequired &&
    !assessment.goodFaithConfidenceSeparated
  ) {
    blockers.push(`good_faith_confidence_conflated:${assessment.assessmentId}`);
  }

  if (policy.additionalityReviewRequired) {
    blockers.push(
      ...reviewStatusBlocker(
        assessment.additionalityReviewStatus,
        "additionality_review_missing",
        assessment.assessmentId,
      ),
    );
  }

  if (policy.externalityReviewRequired) {
    blockers.push(
      ...reviewStatusBlocker(
        assessment.externalityReviewStatus,
        "externality_review_missing",
        assessment.assessmentId,
      ),
    );
  }

  if (policy.reviewerQualityRequired) {
    blockers.push(
      ...reviewStatusBlocker(
        assessment.reviewerQualityStatus,
        "reviewer_quality_missing",
        assessment.assessmentId,
      ),
    );
  }

  if (policy.participantConfirmationRequired) {
    blockers.push(
      ...reviewStatusBlocker(
        assessment.participantConfirmationStatus,
        "participant_confirmation_missing",
        assessment.assessmentId,
      ),
    );
  }

  if (
    policy.privateEvidencePublicationProhibited &&
    assessment.privateEvidencePublic
  ) {
    blockers.push(`private_evidence_public:${assessment.assessmentId}`);
  }

  if (!hasValidHash(assessment.assessmentHash)) {
    blockers.push(`invalid_assessment_hash:${assessment.assessmentId}`);
  }

  return blockers;
}

function userFacingCategories(blockers: string[]) {
  const categories = new Set<string>();

  for (const blocker of blockers) {
    if (blocker.includes("policy")) {
      categories.add("Baseline policy is not frozen and current");
    } else if (
      blocker.includes("marketplace") ||
      blocker.includes("counterparty_triggered") ||
      blocker.includes("harmful_baseline")
    ) {
      categories.add("Manufactured or escalated baselines are not eligible");
    } else if (
      blocker.includes("additionality") ||
      blocker.includes("externality") ||
      blocker.includes("reviewer_quality") ||
      blocker.includes("participant_confirmation")
    ) {
      categories.add("Required reviews and confirmations are incomplete");
    } else if (blocker.includes("private")) {
      categories.add("Private baseline evidence cannot be public");
    } else {
      categories.add("Baseline-integrity assessment is not non-blocking");
    }
  }

  return Array.from(categories);
}

export function evaluateMoralTradeBaselineIntegrity(
  input: MoralTradeBaselineIntegrityEvaluationInput,
): MoralTradeBaselineIntegrityEvaluation {
  const checkedAt = input.checkedAt ?? new Date().toISOString();
  const matchingPolicies = input.policies.filter(
    (policy) => policy.subjectType === input.subjectType,
  );
  const activePolicy =
    matchingPolicies.find((policy) => statusPassed(policy.status)) ?? matchingPolicies[0];
  const matchingAssessments = activePolicy
    ? input.assessments.filter(
        (assessment) =>
          assessment.policyRef === activePolicy.policyId &&
          assessment.subjectType === input.subjectType,
      )
    : [];
  const activeAssessment = activePolicy
    ? matchingAssessments.find(
        (assessment) =>
          isAssessmentNonBlocking(assessment) &&
          isAssessmentCurrent(assessment, activePolicy, checkedAt),
      ) ?? matchingAssessments[0]
    : undefined;
  const blockers: string[] = [];

  if (!activePolicy) {
    blockers.push(`policy_missing:${input.subjectType}`);
  } else {
    blockers.push(...policyBlockers(activePolicy, checkedAt));
  }

  if (input.requiresAssessment) {
    if (!activeAssessment) {
      blockers.push(`assessment_missing:${input.transition}`);
    } else if (activePolicy) {
      blockers.push(
        ...assessmentBlockers(activeAssessment, activePolicy, input, checkedAt),
      );
    }
  }

  const uniqueBlockers = Array.from(new Set(blockers));

  return {
    status: uniqueBlockers.length ? "blocked" : "pass",
    transition: input.transition,
    subjectType: input.subjectType,
    checkedAt,
    policyCount: matchingPolicies.length,
    assessmentCount: matchingAssessments.length,
    blockers: uniqueBlockers,
    launchClassification: activeAssessment?.launchClassification ?? "unclassified",
    userFacingBlockerCategories: userFacingCategories(uniqueBlockers),
  };
}

function samplePolicy(
  subjectType: MoralTradeBaselineIntegritySubjectType,
  overrides: Partial<MoralTradeBaselineIntegrityPolicyRecord> = {},
): MoralTradeBaselineIntegrityPolicyRecord {
  return {
    policyId: `baseline-integrity-policy-${subjectType}`,
    subjectType,
    status: "passed",
    predatesOfferRequired: true,
    independentReasonRequired: true,
    historyEvidenceRequired: true,
    additionalityReviewRequired: true,
    externalityReviewRequired: true,
    reviewerQualityRequired: true,
    participantConfirmationRequired: true,
    goodFaithConfidenceSeparationRequired: true,
    privateEvidencePublicationProhibited: true,
    policyHash:
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    reviewedAt: "2026-06-01T00:00:00.000Z",
    supersededBy: null,
    maxAssessmentAgeDays: DEFAULT_MAX_ASSESSMENT_AGE_DAYS,
    ...overrides,
  };
}

function sampleAssessment(
  subjectType: MoralTradeBaselineIntegritySubjectType,
  policyRef: string,
  overrides: Partial<MoralTradeBaselineIntegrityAssessmentRecord> = {},
): MoralTradeBaselineIntegrityAssessmentRecord {
  return {
    assessmentId: `baseline-integrity-assessment-${subjectType}`,
    policyRef,
    subjectType,
    subjectRef: `subject:${subjectType}:sample`,
    assessmentState: "non_blocking",
    launchClassification: "clearable_moral_trade",
    baselineSourceKind: "historical_pattern",
    baselineSnapshotHash:
      "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    predatesOffer: true,
    independentReasonPresent: true,
    historyEvidencePresent: true,
    marketplaceCreated: false,
    marketplaceEscalated: false,
    counterpartyTriggeredEscalation: false,
    harmfulBaselineEscalated: false,
    goodFaithConfidenceSeparated: true,
    additionalityReviewStatus: "passed",
    externalityReviewStatus: "passed",
    reviewerQualityStatus: "passed",
    participantConfirmationStatus: "passed",
    privateEvidencePublic: false,
    assessmentHash:
      "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    reviewedAt: "2026-06-01T00:00:00.000Z",
    expiresAt: "2026-07-01T00:00:00.000Z",
    supersededBy: null,
    ...overrides,
  };
}

function buildSampleEvaluations() {
  const donationPolicy = samplePolicy("offset_offer");
  const donationAssessment = sampleAssessment(
    "offset_offer",
    donationPolicy.policyId,
  );
  const pledgePolicy = samplePolicy("pledge_swap_offer");
  const blockedPledgeAssessment = sampleAssessment(
    "pledge_swap_offer",
    pledgePolicy.policyId,
    {
      assessmentState: "under_review",
      launchClassification: "preview_only",
      baselineSourceKind: "marketplace_escalated",
      baselineSnapshotHash: null,
      predatesOffer: false,
      independentReasonPresent: false,
      historyEvidencePresent: false,
      marketplaceEscalated: true,
      counterpartyTriggeredEscalation: true,
      harmfulBaselineEscalated: true,
      goodFaithConfidenceSeparated: false,
      additionalityReviewStatus: "missing",
      externalityReviewStatus: "failed",
      reviewerQualityStatus: "under_review",
      participantConfirmationStatus: "missing",
      privateEvidencePublic: true,
      assessmentHash: "invalid-hash",
    },
  );

  return [
    evaluateMoralTradeBaselineIntegrity({
      transition: "donation_offset_lock",
      subjectType: "offset_offer",
      requiresClearableTransition: true,
      requiresRelianceBearingTransition: false,
      requiresAssessment: true,
      checkedAt: "2026-06-02T00:00:00.000Z",
      policies: [donationPolicy],
      assessments: [donationAssessment],
    }),
    evaluateMoralTradeBaselineIntegrity({
      transition: "pledge_swap_lock",
      subjectType: "pledge_swap_offer",
      requiresClearableTransition: true,
      requiresRelianceBearingTransition: true,
      requiresAssessment: true,
      checkedAt: "2026-06-02T00:00:00.000Z",
      policies: [pledgePolicy],
      assessments: [blockedPledgeAssessment],
    }),
  ];
}

export function getMoralTradeBaselineIntegrityContract(): MoralTradeBaselineIntegrityContract {
  return {
    version: MORAL_TRADE_BASELINE_INTEGRITY_CONTRACT_VERSION,
    purpose:
      "Fail-closed baseline-integrity and baseline-manufacturing governance before donation offsets, pledge swaps, broad match candidates, public-goods rounds, or post-lock amendments can become clearable, reliance-bearing, payable, or publicly counted.",
    privacyRule:
      "Public baseline-integrity contract responses expose only static table names, status codes, transition names, launch classifications, validation blockers, and sample pass/block states; they never expose raw baseline narratives, private evidence, exact private constraints, counterparty-specific timing, reviewer notes, or participant-specific assessments.",
    failClosedRule:
      "Manufactured baselines are not moral trade: missing, stale, under-review, blocked, or superseded baseline-integrity assessments; marketplace-created or marketplace-escalated baselines; counterparty-triggered escalation; conflated good-faith/confidence; missing additionality, externality, reviewer-quality, or participant-confirmation review; and public private-evidence exposure keep donation offsets and pledge swaps preview-only or rejected-threat/externality until non-blocking.",
    enforcementRule:
      "Authenticated baseline-integrity enforcement writes only owner-scoped append-only enforcement records. Enforcement records can prove pass or blocked gate status, but they cannot create clearable transitions, authorize payment, authorize reliance, or publish public metrics.",
    firstClassRecordTables: [...FIRST_CLASS_RECORD_TABLES],
    enforcementRecordTables: [...ENFORCEMENT_RECORD_TABLES],
    enforcementRoute: {
      method: "POST",
      path: "/api/moral-trade/baseline-integrity/enforce",
      auth: "authenticated",
      stateMutation: "append_only_enforcement_record",
    },
    policySnapshotSubjects: [...POLICY_SNAPSHOT_SUBJECTS],
    transitions: [...TRANSITIONS],
    subjectTypes: [...SUBJECT_TYPES],
    assessmentStates: [...ASSESSMENT_STATES],
    baselineSourceKinds: [...BASELINE_SOURCE_KINDS],
    launchClassifications: [...LAUNCH_CLASSIFICATIONS],
    failClosedStatuses: [...FAIL_CLOSED_STATUSES],
    transitionDefinitions: [...TRANSITION_DEFINITIONS],
    sampleEvaluations: buildSampleEvaluations(),
    contractTests: [...CONTRACT_TESTS],
  };
}

export function validateMoralTradeBaselineIntegrityContract(
  contract = getMoralTradeBaselineIntegrityContract(),
): MoralTradeBaselineIntegrityValidation {
  const checks = [
    check(
      "record-table-coverage",
      "Baseline integrity has first-class policy and assessment records",
      hasAll(contract.firstClassRecordTables, FIRST_CLASS_RECORD_TABLES),
      contract.firstClassRecordTables.join(", "),
    ),
    check(
      "enforcement-record-table-coverage",
      "Baseline integrity has append-only enforcement records",
      hasAll(contract.enforcementRecordTables, ENFORCEMENT_RECORD_TABLES),
      contract.enforcementRecordTables.join(", "),
    ),
    check(
      "enforcement-route-coverage",
      "Baseline integrity exposes authenticated append-only enforcement",
      contract.enforcementRoute.method === "POST" &&
        contract.enforcementRoute.path ===
          "/api/moral-trade/baseline-integrity/enforce" &&
        contract.enforcementRoute.auth === "authenticated" &&
        contract.enforcementRoute.stateMutation ===
          "append_only_enforcement_record",
      `${contract.enforcementRoute.method} ${contract.enforcementRoute.path} ${contract.enforcementRoute.auth}`,
    ),
    check(
      "policy-subject-coverage",
      "Baseline integrity and baseline manufacturing are frozen policy-snapshot subjects",
      hasAll(contract.policySnapshotSubjects, POLICY_SNAPSHOT_SUBJECTS),
      contract.policySnapshotSubjects.join(", "),
    ),
    check(
      "transition-coverage",
      "Donation offsets, pledge swaps, broad candidates, public-goods rounds, and amendments are covered",
      hasAll(contract.transitions, TRANSITIONS),
      contract.transitions.join(", "),
    ),
    check(
      "subject-type-coverage",
      "Offset offers, pledge-swap offers, matched lock proposals, and cleared agreements are covered",
      hasAll(contract.subjectTypes, SUBJECT_TYPES),
      contract.subjectTypes.join(", "),
    ),
    check(
      "assessment-state-coverage",
      "Assessment states include not-required, under-review, non-blocking, blocked, stale, and superseded",
      hasAll(contract.assessmentStates, ASSESSMENT_STATES),
      contract.assessmentStates.join(", "),
    ),
    check(
      "baseline-source-coverage",
      "Baseline source kinds distinguish pre-existing, independent, historical, marketplace-created, marketplace-escalated, counterparty-triggered, and unknown baselines",
      hasAll(contract.baselineSourceKinds, BASELINE_SOURCE_KINDS),
      contract.baselineSourceKinds.join(", "),
    ),
    check(
      "fail-closed-coverage",
      "Fail-closed statuses cover missing assessments, manufactured baselines, review gaps, privacy exposure, and hash integrity",
      hasAll(contract.failClosedStatuses, FAIL_CLOSED_STATUSES),
      contract.failClosedStatuses.join(", "),
    ),
    check(
      "transition-definition-coverage",
      "Every baseline-integrity transition lists required records and blocked transitions",
      contract.transitionDefinitions.every(
        (definition) =>
          contract.transitions.includes(definition.key) &&
          definition.requiredRecords.length > 0 &&
          definition.blocksTransitions.length > 0,
      ),
      contract.transitionDefinitions
        .map((definition) => `${definition.key}:${definition.requiredRecords.length}`)
        .join(", "),
    ),
    check(
      "sample-evaluation-coverage",
      "Sample evaluations prove donation-offset baseline integrity can pass and manufactured pledge-swap baselines block",
      contract.sampleEvaluations.some(
        (evaluation) =>
          evaluation.transition === "donation_offset_lock" &&
          evaluation.status === "pass",
      ) &&
        contract.sampleEvaluations.some(
          (evaluation) =>
            evaluation.transition === "pledge_swap_lock" &&
            evaluation.status === "blocked",
        ),
      contract.sampleEvaluations
        .map((evaluation) => `${evaluation.transition}:${evaluation.status}`)
        .join(", "),
    ),
    check(
      "contract-test-coverage",
      "Contract lists route, schema, health, and fail-closed tests",
      hasAll(contract.contractTests, CONTRACT_TESTS),
      contract.contractTests.join(", "),
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => `${entry.id}:${entry.label}`);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-baseline-integrity-contract",
    validatorVersion: MORAL_TRADE_BASELINE_INTEGRITY_VALIDATOR_VERSION,
    contractVersion: contract.version,
    checks,
    blockers,
  };
}

const moralTradeBaselineIntegrity = {
  evaluateMoralTradeBaselineIntegrity,
  getMoralTradeBaselineIntegrityContract,
  validateMoralTradeBaselineIntegrityContract,
};

export default moralTradeBaselineIntegrity;
