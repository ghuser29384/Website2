export const MORAL_TRADE_REVIEWER_QUALITY_CONTRACT_VERSION =
  "moral-trade-reviewer-quality-v0.1-2026-06";
export const MORAL_TRADE_REVIEWER_QUALITY_VALIDATOR_VERSION =
  "moral-trade-reviewer-quality-validator-v0.1";

export type MoralTradeReviewerQualityReviewType =
  | "matching_clearing"
  | "release_gate_approval"
  | "recipient_destination_verification"
  | "privacy_grant_approval"
  | "evidence_acceptance"
  | "impact_claim_publication"
  | "appeal_resolution"
  | "incident_closure"
  | "payout_release"
  | "blocker_override";

export type MoralTradeReviewerQualityStatus =
  | "passed"
  | "not_required_for_stage"
  | "missing"
  | "under_review"
  | "failed"
  | "stale"
  | "superseded";

export type MoralTradeReviewerAuthorizationStatus =
  | "authorized"
  | "not_required_for_stage"
  | "missing"
  | "stale"
  | "out_of_scope"
  | "suspended"
  | "superseded";

export type MoralTradeReviewerConflictStatus =
  | "none_declared"
  | "disclosed_nonblocking"
  | "not_required_for_stage"
  | "missing"
  | "unresolved"
  | "conflicted"
  | "superseded";

export type MoralTradeReviewerDecisionState =
  | "approved"
  | "blocked"
  | "needs_changes"
  | "recused"
  | "superseded";

export type MoralTradeReviewerQualityPolicySnapshotStatus =
  | "resolved_immutable"
  | "missing"
  | "mutable"
  | "stale"
  | "superseded";

export type MoralTradeReviewerQualityFailClosedStatus =
  | "policy_missing"
  | "policy_mutable"
  | "policy_stale"
  | "policy_superseded"
  | "decision_missing"
  | "decision_stale"
  | "decision_superseded"
  | "reviewer_authorization_missing"
  | "reviewer_authorization_stale"
  | "reviewer_out_of_scope"
  | "reviewer_suspended"
  | "conflict_missing"
  | "conflict_unresolved"
  | "conflict_blocking"
  | "calibration_missing"
  | "calibration_failed"
  | "second_review_missing"
  | "audit_missing"
  | "audit_failed"
  | "audit_stale"
  | "default_approval_detected"
  | "review_speed_override_detected"
  | "invalid_reviewer_hash"
  | "invalid_decision_hash"
  | "invalid_audit_hash";

export interface MoralTradeReviewerQualityPolicyRecord {
  policyId: string;
  policyVersion: string;
  reviewType: MoralTradeReviewerQualityReviewType;
  authorizationRequired: boolean;
  conflictCheckRequired: boolean;
  calibrationRequired: boolean;
  secondReviewRequired: boolean;
  auditSamplingRequired: boolean;
  defaultApprovalProhibited: boolean;
  reviewSpeedTargetCreatesDefaultApproval: boolean;
  maxDecisionAgeDays: number;
  policySnapshotStatus: MoralTradeReviewerQualityPolicySnapshotStatus;
  policyHash: string;
  reviewedAt: string;
  supersededBy: string | null;
}

export interface MoralTradeReviewerQualityDecisionRecord {
  decisionId: string;
  reviewType: MoralTradeReviewerQualityReviewType;
  subjectType: string;
  subjectId: string;
  reviewerIdHash: string;
  reviewerRole: string;
  reviewerAuthorizationStatus: MoralTradeReviewerAuthorizationStatus;
  conflictStatus: MoralTradeReviewerConflictStatus;
  calibrationStatus: MoralTradeReviewerQualityStatus;
  secondReviewStatus: MoralTradeReviewerQualityStatus;
  auditStatus: MoralTradeReviewerQualityStatus;
  decisionState: MoralTradeReviewerDecisionState;
  policyRef: string;
  neutralPanelRef: string | null;
  reviewQualityAuditRefs: string[];
  defaultApprovalDetected: boolean;
  reviewSpeedOverrideDetected: boolean;
  decisionHash: string;
  decidedAt: string;
  expiresAt: string | null;
  supersededBy: string | null;
}

export interface MoralTradeReviewQualityAuditRecord {
  auditId: string;
  reviewerIdHash: string;
  reviewType: MoralTradeReviewerQualityReviewType;
  policyRef: string;
  auditStatus: MoralTradeReviewerQualityStatus;
  sampledDecisionCount: number;
  overturnCount: number;
  calibrationFailureCount: number;
  unresolvedConflictCount: number;
  outOfScopeDecisionCount: number;
  defaultApprovalDetected: boolean;
  auditHash: string;
  auditedAt: string;
  expiresAt: string | null;
  supersededBy: string | null;
}

export interface MoralTradeReviewerQualityReviewDefinition {
  key: MoralTradeReviewerQualityReviewType;
  label: string;
  blocksTransitions: string[];
  userFacingBlockerCategory: string;
}

export interface MoralTradeReviewerQualityEvaluationInput {
  reviewType: MoralTradeReviewerQualityReviewType;
  checkedAt?: string;
  policies: MoralTradeReviewerQualityPolicyRecord[];
  decisions: MoralTradeReviewerQualityDecisionRecord[];
  audits: MoralTradeReviewQualityAuditRecord[];
}

export interface MoralTradeReviewerQualityEvaluation {
  status: "pass" | "blocked";
  reviewType: MoralTradeReviewerQualityReviewType;
  checkedAt: string;
  requiredPolicyCount: number;
  requiredDecisionCount: number;
  auditCount: number;
  blockers: string[];
  userFacingBlockerCategories: string[];
}

export interface MoralTradeReviewerQualityCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradeReviewerQualityValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-reviewer-quality-contract";
  validatorVersion: string;
  contractVersion: string;
  checks: MoralTradeReviewerQualityCheck[];
  blockers: string[];
}

export interface MoralTradeReviewerQualityContract {
  version: string;
  purpose: string;
  failClosedRule: string;
  privacyRule: string;
  firstClassRecordTables: string[];
  policySnapshotSubjects: string[];
  reviewTypes: MoralTradeReviewerQualityReviewType[];
  failClosedStatuses: MoralTradeReviewerQualityFailClosedStatus[];
  reviewDefinitions: MoralTradeReviewerQualityReviewDefinition[];
  sampleEvaluations: MoralTradeReviewerQualityEvaluation[];
  contractTests: string[];
}

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
const MAX_DECISION_AGE_DAYS = 180;

const FIRST_CLASS_RECORD_TABLES = [
  "moral_trade_reviewer_quality_policies",
  "moral_trade_review_quality_audits",
  "moral_trade_review_decisions",
] as const;

const POLICY_SNAPSHOT_SUBJECTS = ["reviewer_quality"] as const;

const REVIEW_TYPES: MoralTradeReviewerQualityReviewType[] = [
  "matching_clearing",
  "release_gate_approval",
  "recipient_destination_verification",
  "privacy_grant_approval",
  "evidence_acceptance",
  "impact_claim_publication",
  "appeal_resolution",
  "incident_closure",
  "payout_release",
  "blocker_override",
];

const FAIL_CLOSED_STATUSES: MoralTradeReviewerQualityFailClosedStatus[] = [
  "policy_missing",
  "policy_mutable",
  "policy_stale",
  "policy_superseded",
  "decision_missing",
  "decision_stale",
  "decision_superseded",
  "reviewer_authorization_missing",
  "reviewer_authorization_stale",
  "reviewer_out_of_scope",
  "reviewer_suspended",
  "conflict_missing",
  "conflict_unresolved",
  "conflict_blocking",
  "calibration_missing",
  "calibration_failed",
  "second_review_missing",
  "audit_missing",
  "audit_failed",
  "audit_stale",
  "default_approval_detected",
  "review_speed_override_detected",
  "invalid_reviewer_hash",
  "invalid_decision_hash",
  "invalid_audit_hash",
];

const REVIEW_DEFINITIONS: MoralTradeReviewerQualityReviewDefinition[] = [
  {
    key: "matching_clearing",
    label: "Matching and clearing",
    blocksTransitions: ["matching_clearing", "matched_trade_lock"],
    userFacingBlockerCategory: "Reviewer eligibility needs confirmation before clearing",
  },
  {
    key: "release_gate_approval",
    label: "Release-gate approval",
    blocksTransitions: ["release_gate_promotion", "public_metric_release"],
    userFacingBlockerCategory: "Reviewer eligibility needs confirmation before release",
  },
  {
    key: "recipient_destination_verification",
    label: "Recipient and destination verification",
    blocksTransitions: ["payment_capture", "payout_release"],
    userFacingBlockerCategory: "Reviewer eligibility needs confirmation before money movement",
  },
  {
    key: "privacy_grant_approval",
    label: "Privacy grant approval",
    blocksTransitions: ["privacy_disclosure", "contact_introduction"],
    userFacingBlockerCategory: "Reviewer eligibility needs confirmation before disclosure",
  },
  {
    key: "evidence_acceptance",
    label: "Evidence acceptance",
    blocksTransitions: ["evidence_acceptance", "challenge_window_close"],
    userFacingBlockerCategory: "Reviewer eligibility needs confirmation before evidence can count",
  },
  {
    key: "impact_claim_publication",
    label: "Impact claim publication",
    blocksTransitions: ["impact_claim_publication", "public_metric_release"],
    userFacingBlockerCategory: "Reviewer eligibility needs confirmation before publication",
  },
  {
    key: "appeal_resolution",
    label: "Appeal resolution",
    blocksTransitions: ["appeal_resolution", "superseding_decision"],
    userFacingBlockerCategory: "Reviewer eligibility needs confirmation before appeal resolution",
  },
  {
    key: "incident_closure",
    label: "Incident closure",
    blocksTransitions: ["incident_closure", "emergency_unpause"],
    userFacingBlockerCategory: "Reviewer eligibility needs confirmation before incident closure",
  },
  {
    key: "payout_release",
    label: "Payout release",
    blocksTransitions: ["payout_release", "round_close"],
    userFacingBlockerCategory: "Reviewer eligibility needs confirmation before payout release",
  },
  {
    key: "blocker_override",
    label: "Blocker override",
    blocksTransitions: ["blocker_override", "non_emergency_privileged_change"],
    userFacingBlockerCategory: "Reviewer eligibility needs confirmation before override",
  },
];

const CONTRACT_TESTS = [
  "reviewer_quality_contract_validator",
  "reviewer_quality_missing_policy_or_decision_fails_closed",
  "reviewer_quality_conflict_scope_calibration_second_review_blocks",
  "reviewer_quality_default_approval_and_failed_audits_block",
  "reviewer_quality_route_health_spec_and_schema_wiring",
] as const;

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeReviewerQualityCheck {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

function isHash(value: string) {
  return HASH_PATTERN.test(value);
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

  if (!Number.isFinite(expiresAt) || !Number.isFinite(checkedAtTimestamp)) {
    return true;
  }

  return expiresAt <= checkedAtTimestamp;
}

function statusPassed(status: MoralTradeReviewerQualityStatus) {
  return status === "passed" || status === "not_required_for_stage";
}

function conflictPassed(status: MoralTradeReviewerConflictStatus) {
  return status === "none_declared" ||
    status === "disclosed_nonblocking" ||
    status === "not_required_for_stage";
}

function policyForReviewType(
  reviewType: MoralTradeReviewerQualityReviewType,
  policies: MoralTradeReviewerQualityPolicyRecord[],
) {
  return policies.find(
    (policy) => policy.reviewType === reviewType && policy.supersededBy === null,
  );
}

function decisionBlockers(
  decision: MoralTradeReviewerQualityDecisionRecord,
  policy: MoralTradeReviewerQualityPolicyRecord,
  checkedAt: string,
) {
  const blockers: string[] = [];

  if (!isHash(decision.reviewerIdHash)) {
    blockers.push(`invalid_reviewer_hash:${decision.decisionId}`);
  }

  if (!isHash(decision.decisionHash)) {
    blockers.push(`invalid_decision_hash:${decision.decisionId}`);
  }

  if (decision.supersededBy !== null || decision.decisionState === "superseded") {
    blockers.push(`decision_superseded:${decision.decisionId}`);
  }

  if (isExpired(decision.expiresAt, checkedAt) ||
      daysBetween(decision.decidedAt, checkedAt) > policy.maxDecisionAgeDays) {
    blockers.push(`decision_stale:${decision.decisionId}`);
  }

  if (policy.authorizationRequired) {
    if (decision.reviewerAuthorizationStatus === "missing") {
      blockers.push(`reviewer_authorization_missing:${decision.decisionId}`);
    }

    if (decision.reviewerAuthorizationStatus === "stale") {
      blockers.push(`reviewer_authorization_stale:${decision.decisionId}`);
    }

    if (decision.reviewerAuthorizationStatus === "out_of_scope") {
      blockers.push(`reviewer_out_of_scope:${decision.decisionId}`);
    }

    if (decision.reviewerAuthorizationStatus === "suspended") {
      blockers.push(`reviewer_suspended:${decision.decisionId}`);
    }
  }

  if (policy.conflictCheckRequired) {
    if (decision.conflictStatus === "missing") {
      blockers.push(`conflict_missing:${decision.decisionId}`);
    }

    if (decision.conflictStatus === "unresolved") {
      blockers.push(`conflict_unresolved:${decision.decisionId}`);
    }

    if (decision.conflictStatus === "conflicted") {
      blockers.push(`conflict_blocking:${decision.decisionId}`);
    }
  }

  if (policy.calibrationRequired) {
    if (decision.calibrationStatus === "missing" ||
        decision.calibrationStatus === "under_review") {
      blockers.push(`calibration_missing:${decision.decisionId}`);
    }

    if (decision.calibrationStatus === "failed" ||
        decision.calibrationStatus === "stale") {
      blockers.push(`calibration_failed:${decision.decisionId}`);
    }
  }

  if (policy.secondReviewRequired && !statusPassed(decision.secondReviewStatus)) {
    blockers.push(`second_review_missing:${decision.decisionId}`);
  }

  if (policy.auditSamplingRequired && !statusPassed(decision.auditStatus)) {
    blockers.push(`audit_missing:${decision.decisionId}`);
  }

  if (policy.defaultApprovalProhibited && decision.defaultApprovalDetected) {
    blockers.push(`default_approval_detected:${decision.decisionId}`);
  }

  if (policy.defaultApprovalProhibited &&
      policy.reviewSpeedTargetCreatesDefaultApproval) {
    blockers.push(`default_approval_detected:${policy.policyId}`);
  }

  if (decision.reviewSpeedOverrideDetected) {
    blockers.push(`review_speed_override_detected:${decision.decisionId}`);
  }

  if (!conflictPassed(decision.conflictStatus)) {
    blockers.push(`conflict_unresolved:${decision.decisionId}`);
  }

  return blockers;
}

function auditBlockers(
  audit: MoralTradeReviewQualityAuditRecord,
  checkedAt: string,
) {
  const blockers: string[] = [];

  if (!isHash(audit.reviewerIdHash)) {
    blockers.push(`invalid_reviewer_hash:${audit.auditId}`);
  }

  if (!isHash(audit.auditHash)) {
    blockers.push(`invalid_audit_hash:${audit.auditId}`);
  }

  if (audit.supersededBy !== null || isExpired(audit.expiresAt, checkedAt)) {
    blockers.push(`audit_stale:${audit.auditId}`);
  }

  if (audit.auditStatus === "failed" ||
      audit.auditStatus === "stale" ||
      audit.auditStatus === "under_review" ||
      audit.auditStatus === "missing") {
    blockers.push(`audit_failed:${audit.auditId}`);
  }

  if (audit.overturnCount > 0 ||
      audit.calibrationFailureCount > 0 ||
      audit.unresolvedConflictCount > 0 ||
      audit.outOfScopeDecisionCount > 0) {
    blockers.push(`audit_failed:${audit.auditId}`);
  }

  if (audit.defaultApprovalDetected) {
    blockers.push(`default_approval_detected:${audit.auditId}`);
  }

  return blockers;
}

export function evaluateMoralTradeReviewerQuality(
  input: MoralTradeReviewerQualityEvaluationInput,
): MoralTradeReviewerQualityEvaluation {
  const checkedAt = input.checkedAt ?? new Date().toISOString();
  const blockers: string[] = [];
  const userFacingBlockerCategories = new Set<string>();
  const policy = policyForReviewType(input.reviewType, input.policies);
  const reviewDefinition = REVIEW_DEFINITIONS.find(
    (definition) => definition.key === input.reviewType,
  );

  if (!policy) {
    blockers.push(`policy_missing:${input.reviewType}`);
  } else {
    if (!isHash(policy.policyHash)) {
      blockers.push(`invalid_policy_hash:${policy.policyId}`);
    }

    if (policy.policySnapshotStatus === "missing") {
      blockers.push(`policy_missing:${policy.policyId}`);
    }

    if (policy.policySnapshotStatus === "mutable") {
      blockers.push(`policy_mutable:${policy.policyId}`);
    }

    if (policy.policySnapshotStatus === "stale") {
      blockers.push(`policy_stale:${policy.policyId}`);
    }

    if (policy.policySnapshotStatus === "superseded" ||
        policy.supersededBy !== null) {
      blockers.push(`policy_superseded:${policy.policyId}`);
    }
  }

  const decisions = input.decisions.filter(
    (decision) => decision.reviewType === input.reviewType,
  );
  const audits = input.audits.filter(
    (audit) => audit.reviewType === input.reviewType,
  );

  if (decisions.length === 0) {
    blockers.push(`decision_missing:${input.reviewType}`);
  }

  if (policy && policy.auditSamplingRequired && audits.length === 0) {
    blockers.push(`audit_missing:${input.reviewType}`);
  }

  if (policy) {
    for (const decision of decisions) {
      blockers.push(...decisionBlockers(decision, policy, checkedAt));
    }
  }

  for (const audit of audits) {
    blockers.push(...auditBlockers(audit, checkedAt));
  }

  if (blockers.length > 0) {
    userFacingBlockerCategories.add(
      reviewDefinition?.userFacingBlockerCategory ??
        "Reviewer eligibility needs confirmation before this decision can count",
    );
  }

  return {
    status: blockers.length === 0 ? "pass" : "blocked",
    reviewType: input.reviewType,
    checkedAt,
    requiredPolicyCount: 1,
    requiredDecisionCount: 1,
    auditCount: audits.length,
    blockers: Array.from(new Set(blockers)),
    userFacingBlockerCategories: Array.from(userFacingBlockerCategories),
  };
}

function samplePolicy(
  reviewType: MoralTradeReviewerQualityReviewType,
  overrides: Partial<MoralTradeReviewerQualityPolicyRecord> = {},
): MoralTradeReviewerQualityPolicyRecord {
  return {
    policyId: `policy-${reviewType}`,
    policyVersion: MORAL_TRADE_REVIEWER_QUALITY_CONTRACT_VERSION,
    reviewType,
    authorizationRequired: true,
    conflictCheckRequired: true,
    calibrationRequired: true,
    secondReviewRequired: true,
    auditSamplingRequired: true,
    defaultApprovalProhibited: true,
    reviewSpeedTargetCreatesDefaultApproval: false,
    maxDecisionAgeDays: MAX_DECISION_AGE_DAYS,
    policySnapshotStatus: "resolved_immutable",
    policyHash:
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    reviewedAt: "2026-06-01T00:00:00.000Z",
    supersededBy: null,
    ...overrides,
  };
}

function sampleDecision(
  policy: MoralTradeReviewerQualityPolicyRecord,
  overrides: Partial<MoralTradeReviewerQualityDecisionRecord> = {},
): MoralTradeReviewerQualityDecisionRecord {
  return {
    decisionId: `decision-${policy.reviewType}`,
    reviewType: policy.reviewType,
    subjectType: policy.reviewType,
    subjectId: "subject_123",
    reviewerIdHash:
      "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    reviewerRole: "neutral_reviewer",
    reviewerAuthorizationStatus: "authorized",
    conflictStatus: "none_declared",
    calibrationStatus: "passed",
    secondReviewStatus: "passed",
    auditStatus: "passed",
    decisionState: "approved",
    policyRef: policy.policyId,
    neutralPanelRef: "panel_123",
    reviewQualityAuditRefs: ["audit_123"],
    defaultApprovalDetected: false,
    reviewSpeedOverrideDetected: false,
    decisionHash:
      "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    decidedAt: "2026-06-01T00:00:00.000Z",
    expiresAt: "2026-07-01T00:00:00.000Z",
    supersededBy: null,
    ...overrides,
  };
}

function sampleAudit(
  policy: MoralTradeReviewerQualityPolicyRecord,
  overrides: Partial<MoralTradeReviewQualityAuditRecord> = {},
): MoralTradeReviewQualityAuditRecord {
  return {
    auditId: `audit-${policy.reviewType}`,
    reviewerIdHash:
      "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    reviewType: policy.reviewType,
    policyRef: policy.policyId,
    auditStatus: "passed",
    sampledDecisionCount: 3,
    overturnCount: 0,
    calibrationFailureCount: 0,
    unresolvedConflictCount: 0,
    outOfScopeDecisionCount: 0,
    defaultApprovalDetected: false,
    auditHash:
      "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    auditedAt: "2026-06-01T00:00:00.000Z",
    expiresAt: "2026-07-01T00:00:00.000Z",
    supersededBy: null,
    ...overrides,
  };
}

export function getMoralTradeReviewerQualityContract(): MoralTradeReviewerQualityContract {
  const releasePolicy = samplePolicy("release_gate_approval");
  const evidencePolicy = samplePolicy("evidence_acceptance");
  const payoutPolicy = samplePolicy("payout_release");
  const checkedAt = "2026-06-02T00:00:00.000Z";

  const sampleEvaluations = [
    evaluateMoralTradeReviewerQuality({
      reviewType: "release_gate_approval",
      checkedAt,
      policies: [releasePolicy],
      decisions: [sampleDecision(releasePolicy)],
      audits: [sampleAudit(releasePolicy)],
    }),
    evaluateMoralTradeReviewerQuality({
      reviewType: "evidence_acceptance",
      checkedAt,
      policies: [evidencePolicy],
      decisions: [
        sampleDecision(evidencePolicy, {
          decisionId: "decision-evidence-conflicted",
          conflictStatus: "unresolved",
          secondReviewStatus: "missing",
        }),
      ],
      audits: [sampleAudit(evidencePolicy)],
    }),
    evaluateMoralTradeReviewerQuality({
      reviewType: "payout_release",
      checkedAt,
      policies: [payoutPolicy],
      decisions: [
        sampleDecision(payoutPolicy, {
          decisionId: "decision-payout-defaulted",
          defaultApprovalDetected: true,
        }),
      ],
      audits: [
        sampleAudit(payoutPolicy, {
          auditId: "audit-payout-failed",
          auditStatus: "failed",
          overturnCount: 1,
        }),
      ],
    }),
  ];

  return {
    version: MORAL_TRADE_REVIEWER_QUALITY_CONTRACT_VERSION,
    purpose:
      "Require reviewer-quality policy, authorization, conflict, calibration, second-review, and audit evidence before human-review decisions can clear, release, publish, or promote marketplace state.",
    failClosedRule:
      "Reviewer judgment is not an ungoverned primitive. Missing, stale, conflicted, out-of-scope, suspended, default-approved, uncalibrated, unaudited, or single-review decisions fail closed until an eligible reviewer or neutral panel records a superseding decision under the frozen reviewer-quality policy.",
    privacyRule:
      "Reviewer-quality contract responses expose review-type keys, table names, status vocabularies, and aggregate sample statuses only. They never expose reviewer identities, private reviewer notes, calibration details, conflict facts, audit evidence, or participant-specific subject records.",
    firstClassRecordTables: [...FIRST_CLASS_RECORD_TABLES],
    policySnapshotSubjects: [...POLICY_SNAPSHOT_SUBJECTS],
    reviewTypes: REVIEW_TYPES,
    failClosedStatuses: FAIL_CLOSED_STATUSES,
    reviewDefinitions: REVIEW_DEFINITIONS,
    sampleEvaluations,
    contractTests: [...CONTRACT_TESTS],
  };
}

export function validateMoralTradeReviewerQualityContract(
  contract = getMoralTradeReviewerQualityContract(),
): MoralTradeReviewerQualityValidation {
  const checks = [
    check(
      "first-class-record-tables",
      "Reviewer-quality policies, audits, and review decisions are first-class records.",
      FIRST_CLASS_RECORD_TABLES.every((table) =>
        contract.firstClassRecordTables.includes(table),
      ),
      contract.firstClassRecordTables.join(", "),
    ),
    check(
      "policy-snapshot-subject",
      "Reviewer quality resolves through an immutable policy snapshot subject.",
      contract.policySnapshotSubjects.includes("reviewer_quality"),
      contract.policySnapshotSubjects.join(", "),
    ),
    check(
      "high-risk-review-types",
      "Reviewer quality covers clearing, release gates, recipient verification, privacy grants, evidence, impact claims, appeals, incidents, payout release, and overrides.",
      [
        "matching_clearing",
        "release_gate_approval",
        "recipient_destination_verification",
        "privacy_grant_approval",
        "evidence_acceptance",
        "impact_claim_publication",
        "appeal_resolution",
        "incident_closure",
        "payout_release",
        "blocker_override",
      ].every((reviewType) =>
        contract.reviewTypes.includes(
          reviewType as MoralTradeReviewerQualityReviewType,
        ),
      ),
      contract.reviewTypes.join(", "),
    ),
    check(
      "fail-closed-statuses",
      "Authorization, scope, conflict, calibration, second-review, audit, default-approval, and stale-decision blockers are explicit.",
      [
        "reviewer_authorization_missing",
        "reviewer_out_of_scope",
        "conflict_unresolved",
        "calibration_failed",
        "second_review_missing",
        "audit_failed",
        "default_approval_detected",
        "decision_stale",
      ].every((status) =>
        contract.failClosedStatuses.includes(
          status as MoralTradeReviewerQualityFailClosedStatus,
        ),
      ),
      contract.failClosedStatuses.join(", "),
    ),
    check(
      "default-approval-prohibited",
      "The contract states that review-speed targets cannot create default approvals or default private-data disclosures.",
      /default-approved/i.test(contract.failClosedRule) &&
        /Reviewer judgment is not an ungoverned primitive/i.test(
          contract.failClosedRule,
        ),
      contract.failClosedRule,
    ),
    check(
      "privacy-boundary",
      "The public contract excludes reviewer identities, private notes, conflict facts, audit evidence, and participant-specific records.",
      /never expose reviewer identities/i.test(contract.privacyRule) &&
        /participant-specific subject records/i.test(contract.privacyRule),
      contract.privacyRule,
    ),
    check(
      "sample-evaluations",
      "The public contract exposes a passing release-gate sample and blocked evidence/payout samples.",
      contract.sampleEvaluations.some(
        (evaluation) =>
          evaluation.reviewType === "release_gate_approval" &&
          evaluation.status === "pass",
      ) &&
        contract.sampleEvaluations.some(
          (evaluation) =>
            evaluation.reviewType === "evidence_acceptance" &&
            evaluation.status === "blocked",
        ) &&
        contract.sampleEvaluations.some(
          (evaluation) =>
            evaluation.reviewType === "payout_release" &&
            evaluation.status === "blocked",
        ),
      contract.sampleEvaluations
        .map((evaluation) => `${evaluation.reviewType}:${evaluation.status}`)
        .join(", "),
    ),
    check(
      "contract-tests",
      "Reviewer-quality contract test hooks are published.",
      CONTRACT_TESTS.every((testName) => contract.contractTests.includes(testName)),
      contract.contractTests.join(", "),
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => entry.id);

  return {
    status: blockers.length === 0 ? "pass" : "fail",
    validatorName: "moral-trade-reviewer-quality-contract",
    validatorVersion: MORAL_TRADE_REVIEWER_QUALITY_VALIDATOR_VERSION,
    contractVersion: contract.version,
    checks,
    blockers,
  };
}

const moralTradeReviewerQuality = {
  evaluateMoralTradeReviewerQuality,
  getMoralTradeReviewerQualityContract,
  validateMoralTradeReviewerQualityContract,
};

export default moralTradeReviewerQuality;
