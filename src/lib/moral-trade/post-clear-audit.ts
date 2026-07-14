export const MORAL_TRADE_POST_CLEAR_AUDIT_CONTRACT_VERSION =
  "moral-trade-post-clear-audit-v0.1-2026-06";
export const MORAL_TRADE_POST_CLEAR_AUDIT_VALIDATOR_VERSION =
  "moral-trade-post-clear-audit-validator-v0.1";

export type MoralTradePostClearAuditTransition =
  | "post_clear_sampling_assignment"
  | "audit_record_review"
  | "corrective_action_resolution"
  | "payment_reconciliation_close"
  | "payout_release"
  | "public_metric_publication"
  | "release_gate_promotion";

export type MoralTradePostClearAuditSubjectType =
  | "cleared_trade_agreement"
  | "matched_trade_lock_proposal"
  | "payment_event"
  | "evidence_record"
  | "payout_milestone"
  | "impact_claim_record";

export type MoralTradePostClearAuditType =
  | "random_sample"
  | "risk_triggered"
  | "dispute_triggered"
  | "payment_triggered"
  | "evidence_triggered"
  | "recipient_triggered"
  | "classification_triggered"
  | "manual_review";

export type MoralTradePostClearAuditMatchState =
  | "not_checked"
  | "matched"
  | "mismatch"
  | "manual_review";

export type MoralTradePostClearAuditState =
  | "pending"
  | "passed"
  | "failed"
  | "corrective_action_open"
  | "closed"
  | "superseded";

export type MoralTradePostClearAuditPolicyStatus =
  | "resolved_immutable"
  | "missing"
  | "mutable"
  | "stale"
  | "superseded";

export interface MoralTradePostClearAuditPolicyRecord {
  policyId: string;
  releaseStage: string;
  policyStatus: MoralTradePostClearAuditPolicyStatus;
  policyHash: string;
  sampledSubjectTypes: MoralTradePostClearAuditSubjectType[];
  auditTypes: MoralTradePostClearAuditType[];
  maxPolicyAgeDays: number;
  requiresTermSheetMatch: boolean;
  requiresBaselineEvidenceMatch: boolean;
  requiresRecipientAcceptanceMatch: boolean;
  requiresPaymentReconciliationMatch: boolean;
  requiresPrivacyDisclosureMatch: boolean;
  requiresClassificationMatch: boolean;
  prohibitsPublicReputationEffect: boolean;
  permitsCorrectionOnlyUnderFrozenPolicy: boolean;
  reviewedAt: string;
  expiresAt: string | null;
  supersededBy: string | null;
}

export interface MoralTradePostClearAuditRecord {
  recordId: string;
  subjectType: MoralTradePostClearAuditSubjectType;
  subjectRef: string;
  policyRef: string;
  auditType: MoralTradePostClearAuditType;
  sampledFieldsHash: string;
  termSheetMatchState: MoralTradePostClearAuditMatchState;
  baselineAndEvidenceMatchState: MoralTradePostClearAuditMatchState;
  recipientAcceptanceMatchState: MoralTradePostClearAuditMatchState;
  paymentAndReconciliationMatchState: MoralTradePostClearAuditMatchState;
  privacyOrDisclosureMatchState: MoralTradePostClearAuditMatchState;
  classificationMatchState: MoralTradePostClearAuditMatchState;
  correctiveActionRefs: string[];
  publicReputationEffectProhibited: boolean;
  auditState: MoralTradePostClearAuditState;
  reviewerDecisionRef: string | null;
  createdAt: string;
  updatedAt: string;
  rawPaymentEvidencePublic: boolean;
  privateCounterpartyTermsPublic: boolean;
  reviewerNotesPublic: boolean;
  rawReconciliationRowsPublic: boolean;
  providerPayloadPublic: boolean;
  participantSpecificRowsPublic: boolean;
}

export interface MoralTradePostClearAuditTransitionDefinition {
  key: MoralTradePostClearAuditTransition;
  label: string;
  requiresImmutablePolicyWhenRequired: boolean;
  requiresAuditRecordWhenRequired: boolean;
  requiresNonBlockingAuditForPublicSurface: boolean;
  requiresReviewerDecision: boolean;
  userFacingBlockerCategory: string;
}

export interface MoralTradePostClearAuditEvaluationInput {
  transition: MoralTradePostClearAuditTransition;
  postClearAuditRequired: boolean;
  checkedAt?: string;
  policies: MoralTradePostClearAuditPolicyRecord[];
  records: MoralTradePostClearAuditRecord[];
}

export interface MoralTradePostClearAuditEvaluation {
  status: "pass" | "blocked";
  transition: MoralTradePostClearAuditTransition;
  checkedAt: string;
  postClearAuditRequired: boolean;
  requiredPolicyCount: number;
  requiredRecordCount: number;
  immutablePolicyCount: number;
  nonBlockingAuditRecordCount: number;
  reviewerDecisionCount: number;
  blockers: string[];
  userFacingBlockerCategories: string[];
}

export interface MoralTradePostClearAuditCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradePostClearAuditValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-post-clear-audit-contract";
  validatorVersion: string;
  contractVersion: string;
  checks: MoralTradePostClearAuditCheck[];
  blockers: string[];
}

export interface MoralTradePostClearAuditContract {
  version: string;
  purpose: string;
  failClosedRule: string;
  privacyBoundary: string;
  firstClassRecordTables: string[];
  policySnapshotSubjects: string[];
  subjectTypes: MoralTradePostClearAuditSubjectType[];
  auditTypes: MoralTradePostClearAuditType[];
  matchStates: MoralTradePostClearAuditMatchState[];
  auditStates: MoralTradePostClearAuditState[];
  policyStatuses: MoralTradePostClearAuditPolicyStatus[];
  correctionBoundaries: string[];
  transitionDefinitions: MoralTradePostClearAuditTransitionDefinition[];
  sampleEvaluations: MoralTradePostClearAuditEvaluation[];
  contractTests: string[];
}

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
const DEFAULT_MAX_POLICY_AGE_DAYS = 120;

const FIRST_CLASS_RECORD_TABLES = [
  "moral_trade_post_clear_audit_policies",
  "moral_trade_post_clear_audit_records",
] as const;

const POLICY_SNAPSHOT_SUBJECTS = ["post_clear_audit"] as const;

const SUBJECT_TYPES: MoralTradePostClearAuditSubjectType[] = [
  "cleared_trade_agreement",
  "matched_trade_lock_proposal",
  "payment_event",
  "evidence_record",
  "payout_milestone",
  "impact_claim_record",
];

const AUDIT_TYPES: MoralTradePostClearAuditType[] = [
  "random_sample",
  "risk_triggered",
  "dispute_triggered",
  "payment_triggered",
  "evidence_triggered",
  "recipient_triggered",
  "classification_triggered",
  "manual_review",
];

const MATCH_STATES: MoralTradePostClearAuditMatchState[] = [
  "not_checked",
  "matched",
  "mismatch",
  "manual_review",
];

const AUDIT_STATES: MoralTradePostClearAuditState[] = [
  "pending",
  "passed",
  "failed",
  "corrective_action_open",
  "closed",
  "superseded",
];

const POLICY_STATUSES: MoralTradePostClearAuditPolicyStatus[] = [
  "resolved_immutable",
  "missing",
  "mutable",
  "stale",
  "superseded",
];

const CORRECTION_BOUNDARIES = [
  "fraud_error_correction_only_under_frozen_policy",
  "payment_error_correction_only_under_frozen_policy",
  "evidence_error_correction_only_under_frozen_policy",
  "recipient_disclosure_error_correction_only_under_frozen_policy",
  "classification_error_correction_only_under_frozen_policy",
  "no_public_moral_reputation_or_retroactive_obligation",
] as const;

const TRANSITION_DEFINITIONS: MoralTradePostClearAuditTransitionDefinition[] = [
  {
    key: "post_clear_sampling_assignment",
    label: "Post-clear sampling assignment",
    requiresImmutablePolicyWhenRequired: true,
    requiresAuditRecordWhenRequired: false,
    requiresNonBlockingAuditForPublicSurface: false,
    requiresReviewerDecision: false,
    userFacingBlockerCategory:
      "Post-clear sampling requires a frozen audit policy before selection",
  },
  {
    key: "audit_record_review",
    label: "Audit record review",
    requiresImmutablePolicyWhenRequired: true,
    requiresAuditRecordWhenRequired: true,
    requiresNonBlockingAuditForPublicSurface: false,
    requiresReviewerDecision: false,
    userFacingBlockerCategory:
      "Audit review requires a hash-backed post-clear audit record",
  },
  {
    key: "corrective_action_resolution",
    label: "Corrective action resolution",
    requiresImmutablePolicyWhenRequired: true,
    requiresAuditRecordWhenRequired: true,
    requiresNonBlockingAuditForPublicSurface: false,
    requiresReviewerDecision: true,
    userFacingBlockerCategory:
      "Corrective action must stay inside the frozen audit and dispute policy",
  },
  {
    key: "payment_reconciliation_close",
    label: "Payment reconciliation close",
    requiresImmutablePolicyWhenRequired: true,
    requiresAuditRecordWhenRequired: true,
    requiresNonBlockingAuditForPublicSurface: true,
    requiresReviewerDecision: true,
    userFacingBlockerCategory:
      "Payment reconciliation cannot close with unresolved post-clear audit blockers",
  },
  {
    key: "payout_release",
    label: "Payout release",
    requiresImmutablePolicyWhenRequired: true,
    requiresAuditRecordWhenRequired: true,
    requiresNonBlockingAuditForPublicSurface: true,
    requiresReviewerDecision: true,
    userFacingBlockerCategory:
      "Payout release waits for non-blocking post-clear audit status",
  },
  {
    key: "public_metric_publication",
    label: "Public metric publication",
    requiresImmutablePolicyWhenRequired: true,
    requiresAuditRecordWhenRequired: true,
    requiresNonBlockingAuditForPublicSurface: true,
    requiresReviewerDecision: true,
    userFacingBlockerCategory:
      "Public metrics wait for privacy-safe post-clear audit sampling",
  },
  {
    key: "release_gate_promotion",
    label: "Release-gate promotion",
    requiresImmutablePolicyWhenRequired: true,
    requiresAuditRecordWhenRequired: true,
    requiresNonBlockingAuditForPublicSurface: true,
    requiresReviewerDecision: true,
    userFacingBlockerCategory:
      "Release promotion waits for post-clear audit blockers to clear",
  },
];

const CONTRACT_TESTS = [
  "post_clear_audit_contract_validator",
  "post_clear_audit_sampling_test",
  "post_clear_audit_public_metric_fail_closed_test",
  "post_clear_audit_privacy_boundary_test",
  "post_clear_audit_route_health_spec_and_migration_wiring",
] as const;

const REQUIRED_SUBJECT_COVERAGE: MoralTradePostClearAuditSubjectType[] = [
  "cleared_trade_agreement",
  "matched_trade_lock_proposal",
  "payment_event",
  "evidence_record",
  "payout_milestone",
  "impact_claim_record",
];

const REQUIRED_AUDIT_TYPE_COVERAGE: MoralTradePostClearAuditType[] = [
  "random_sample",
  "risk_triggered",
  "dispute_triggered",
  "payment_triggered",
  "evidence_triggered",
  "recipient_triggered",
  "classification_triggered",
  "manual_review",
];

const REQUIRED_PUBLIC_SURFACE_TRANSITIONS: MoralTradePostClearAuditTransition[] = [
  "public_metric_publication",
  "payout_release",
  "release_gate_promotion",
];

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradePostClearAuditCheck {
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

function makeHash(seed: string) {
  const hexSeed = seed.replace(/[^a-f0-9]/gi, "a") || "a";

  return `sha256:${hexSeed.padEnd(64, "0").slice(0, 64).toLowerCase()}`;
}

function makeSamplePolicy(
  overrides: Partial<MoralTradePostClearAuditPolicyRecord> = {},
): MoralTradePostClearAuditPolicyRecord {
  return {
    policyId: "post-clear-audit-policy:tier-1",
    releaseStage: "tier_1_non_public_goods_completion",
    policyStatus: "resolved_immutable",
    policyHash: makeHash("post-clear-audit-policy"),
    sampledSubjectTypes: [...SUBJECT_TYPES],
    auditTypes: [...AUDIT_TYPES],
    maxPolicyAgeDays: DEFAULT_MAX_POLICY_AGE_DAYS,
    requiresTermSheetMatch: true,
    requiresBaselineEvidenceMatch: true,
    requiresRecipientAcceptanceMatch: true,
    requiresPaymentReconciliationMatch: true,
    requiresPrivacyDisclosureMatch: true,
    requiresClassificationMatch: true,
    prohibitsPublicReputationEffect: true,
    permitsCorrectionOnlyUnderFrozenPolicy: true,
    reviewedAt: "2026-06-11T12:00:00.000Z",
    expiresAt: "2026-10-11T12:00:00.000Z",
    supersededBy: null,
    ...overrides,
  };
}

function makeSampleRecord(
  overrides: Partial<MoralTradePostClearAuditRecord> = {},
): MoralTradePostClearAuditRecord {
  return {
    recordId: "post-clear-audit:cleared-trade-demo",
    subjectType: "cleared_trade_agreement",
    subjectRef: "cleared-trade:demo",
    policyRef: "post-clear-audit-policy:tier-1",
    auditType: "random_sample",
    sampledFieldsHash: makeHash("sampled-fields"),
    termSheetMatchState: "matched",
    baselineAndEvidenceMatchState: "matched",
    recipientAcceptanceMatchState: "matched",
    paymentAndReconciliationMatchState: "matched",
    privacyOrDisclosureMatchState: "matched",
    classificationMatchState: "matched",
    correctiveActionRefs: [],
    publicReputationEffectProhibited: true,
    auditState: "passed",
    reviewerDecisionRef: "review-decision:post-clear-demo",
    createdAt: "2026-06-11T12:00:00.000Z",
    updatedAt: "2026-06-11T12:00:00.000Z",
    rawPaymentEvidencePublic: false,
    privateCounterpartyTermsPublic: false,
    reviewerNotesPublic: false,
    rawReconciliationRowsPublic: false,
    providerPayloadPublic: false,
    participantSpecificRowsPublic: false,
    ...overrides,
  };
}

function getTransitionDefinition(transition: MoralTradePostClearAuditTransition) {
  return TRANSITION_DEFINITIONS.find((definition) => definition.key === transition);
}

function policyBlocks(policy: MoralTradePostClearAuditPolicyRecord, checkedAt: string) {
  const blockers: string[] = [];
  const maxPolicyAgeDays = Number.isFinite(policy.maxPolicyAgeDays)
    ? policy.maxPolicyAgeDays
    : DEFAULT_MAX_POLICY_AGE_DAYS;

  if (policy.policyStatus !== "resolved_immutable") {
    blockers.push(
      `post_clear_audit_policy_not_immutable:${policy.policyId}:${policy.policyStatus}`,
    );
  }

  if (!isHash(policy.policyHash)) {
    blockers.push(`post_clear_audit_policy_hash_invalid:${policy.policyId}`);
  }

  if (policy.supersededBy) {
    blockers.push(`post_clear_audit_policy_superseded:${policy.policyId}`);
  }

  if (daysBetween(policy.reviewedAt, checkedAt) > maxPolicyAgeDays) {
    blockers.push(`post_clear_audit_policy_stale:${policy.policyId}`);
  }

  if (isExpired(policy.expiresAt, checkedAt)) {
    blockers.push(`post_clear_audit_policy_expired:${policy.policyId}`);
  }

  if (!policy.prohibitsPublicReputationEffect) {
    blockers.push(`post_clear_audit_public_reputation_not_prohibited:${policy.policyId}`);
  }

  if (!policy.permitsCorrectionOnlyUnderFrozenPolicy) {
    blockers.push(
      `post_clear_audit_correction_path_not_frozen:${policy.policyId}`,
    );
  }

  return blockers;
}

function matchStateBlockers({
  definition,
  policy,
  record,
}: {
  definition: MoralTradePostClearAuditTransitionDefinition;
  policy: MoralTradePostClearAuditPolicyRecord | undefined;
  record: MoralTradePostClearAuditRecord;
}) {
  const blockers: string[] = [];
  const requiredStates = [
    {
      code: "term_sheet",
      required: policy?.requiresTermSheetMatch ?? true,
      state: record.termSheetMatchState,
    },
    {
      code: "baseline_and_evidence",
      required: policy?.requiresBaselineEvidenceMatch ?? true,
      state: record.baselineAndEvidenceMatchState,
    },
    {
      code: "recipient_acceptance",
      required: policy?.requiresRecipientAcceptanceMatch ?? true,
      state: record.recipientAcceptanceMatchState,
    },
    {
      code: "payment_and_reconciliation",
      required: policy?.requiresPaymentReconciliationMatch ?? true,
      state: record.paymentAndReconciliationMatchState,
    },
    {
      code: "privacy_or_disclosure",
      required: policy?.requiresPrivacyDisclosureMatch ?? true,
      state: record.privacyOrDisclosureMatchState,
    },
    {
      code: "classification",
      required: policy?.requiresClassificationMatch ?? true,
      state: record.classificationMatchState,
    },
  ];

  for (const entry of requiredStates) {
    if (!entry.required) {
      continue;
    }

    if (entry.state === "mismatch") {
      blockers.push(`post_clear_audit_${entry.code}_mismatch:${record.recordId}`);
    }

    if (
      definition.requiresNonBlockingAuditForPublicSurface &&
      entry.state !== "matched"
    ) {
      blockers.push(
        `post_clear_audit_${entry.code}_not_matched:${record.recordId}:${entry.state}`,
      );
    }
  }

  return blockers;
}

function recordBlocks({
  definition,
  policy,
  record,
}: {
  definition: MoralTradePostClearAuditTransitionDefinition;
  policy: MoralTradePostClearAuditPolicyRecord | undefined;
  record: MoralTradePostClearAuditRecord;
}) {
  const blockers: string[] = [];

  if (!policy) {
    blockers.push(`post_clear_audit_policy_missing:${record.policyRef}`);
  }

  if (policy && !policy.sampledSubjectTypes.includes(record.subjectType)) {
    blockers.push(
      `post_clear_audit_subject_not_allowed:${record.recordId}:${record.subjectType}`,
    );
  }

  if (policy && !policy.auditTypes.includes(record.auditType)) {
    blockers.push(
      `post_clear_audit_type_not_allowed:${record.recordId}:${record.auditType}`,
    );
  }

  if (!record.subjectRef.trim()) {
    blockers.push(`post_clear_audit_subject_ref_missing:${record.recordId}`);
  }

  if (!isHash(record.sampledFieldsHash)) {
    blockers.push(`post_clear_audit_sampled_fields_hash_invalid:${record.recordId}`);
  }

  blockers.push(...matchStateBlockers({ definition, policy, record }));

  if (!record.publicReputationEffectProhibited) {
    blockers.push(
      `post_clear_audit_public_reputation_effect_not_prohibited:${record.recordId}`,
    );
  }

  if (
    definition.requiresNonBlockingAuditForPublicSurface &&
    record.auditState !== "passed" &&
    record.auditState !== "closed"
  ) {
    blockers.push(
      `post_clear_audit_not_non_blocking:${record.recordId}:${record.auditState}`,
    );
  }

  if (record.auditState === "failed") {
    blockers.push(`post_clear_audit_failed:${record.recordId}`);
  }

  if (record.auditState === "corrective_action_open") {
    blockers.push(`post_clear_audit_corrective_action_open:${record.recordId}`);
  }

  if (record.auditState === "superseded") {
    blockers.push(`post_clear_audit_record_superseded:${record.recordId}`);
  }

  if (definition.requiresReviewerDecision && !record.reviewerDecisionRef) {
    blockers.push(`post_clear_audit_reviewer_decision_missing:${record.recordId}`);
  }

  if (
    record.auditState === "closed" &&
    record.correctiveActionRefs.length === 0 &&
    [
      record.termSheetMatchState,
      record.baselineAndEvidenceMatchState,
      record.recipientAcceptanceMatchState,
      record.paymentAndReconciliationMatchState,
      record.privacyOrDisclosureMatchState,
      record.classificationMatchState,
    ].some((state) => state === "mismatch")
  ) {
    blockers.push(`post_clear_audit_closed_without_correction:${record.recordId}`);
  }

  if (record.rawPaymentEvidencePublic) {
    blockers.push(`post_clear_audit_raw_payment_evidence_public:${record.recordId}`);
  }

  if (record.privateCounterpartyTermsPublic) {
    blockers.push(
      `post_clear_audit_private_counterparty_terms_public:${record.recordId}`,
    );
  }

  if (record.reviewerNotesPublic) {
    blockers.push(`post_clear_audit_reviewer_notes_public:${record.recordId}`);
  }

  if (record.rawReconciliationRowsPublic) {
    blockers.push(
      `post_clear_audit_raw_reconciliation_rows_public:${record.recordId}`,
    );
  }

  if (record.providerPayloadPublic) {
    blockers.push(`post_clear_audit_provider_payload_public:${record.recordId}`);
  }

  if (record.participantSpecificRowsPublic) {
    blockers.push(
      `post_clear_audit_participant_specific_rows_public:${record.recordId}`,
    );
  }

  return blockers;
}

export function evaluateMoralTradePostClearAudit(
  input: MoralTradePostClearAuditEvaluationInput,
): MoralTradePostClearAuditEvaluation {
  const definition = getTransitionDefinition(input.transition);
  const checkedAt = input.checkedAt ?? new Date().toISOString();
  const postClearAuditRequired = input.postClearAuditRequired || input.records.length > 0;
  const blockers: string[] = [];
  const userFacingBlockerCategories = new Set<string>();

  if (!definition) {
    blockers.push(`unknown_post_clear_audit_transition:${input.transition}`);

    return {
      status: "blocked",
      transition: input.transition,
      checkedAt,
      postClearAuditRequired,
      requiredPolicyCount: 0,
      requiredRecordCount: 0,
      immutablePolicyCount: 0,
      nonBlockingAuditRecordCount: 0,
      reviewerDecisionCount: 0,
      blockers,
      userFacingBlockerCategories: ["Unknown post-clear audit transition"],
    };
  }

  if (!postClearAuditRequired) {
    return {
      status: "pass",
      transition: definition.key,
      checkedAt,
      postClearAuditRequired: false,
      requiredPolicyCount: 0,
      requiredRecordCount: 0,
      immutablePolicyCount: 0,
      nonBlockingAuditRecordCount: 0,
      reviewerDecisionCount: 0,
      blockers: [],
      userFacingBlockerCategories: [],
    };
  }

  if (definition.requiresImmutablePolicyWhenRequired && input.policies.length === 0) {
    blockers.push("post_clear_audit_policy_required");
  }

  if (definition.requiresAuditRecordWhenRequired && input.records.length === 0) {
    blockers.push("post_clear_audit_record_required");
  }

  for (const policy of input.policies) {
    blockers.push(...policyBlocks(policy, checkedAt));
  }

  for (const record of input.records) {
    const policy = input.policies.find(
      (candidate) => candidate.policyId === record.policyRef,
    );

    blockers.push(...recordBlocks({ definition, policy, record }));
  }

  if (
    definition.requiresNonBlockingAuditForPublicSurface &&
    input.records.every(
      (record) => record.auditState !== "passed" && record.auditState !== "closed",
    )
  ) {
    blockers.push("post_clear_audit_non_blocking_record_required");
  }

  if (blockers.length) {
    userFacingBlockerCategories.add(definition.userFacingBlockerCategory);
  }

  const immutablePolicyCount = input.policies.filter(
    (policy) => policy.policyStatus === "resolved_immutable",
  ).length;
  const nonBlockingAuditRecordCount = input.records.filter(
    (record) => record.auditState === "passed" || record.auditState === "closed",
  ).length;
  const reviewerDecisionCount = input.records.filter(
    (record) => record.reviewerDecisionRef,
  ).length;

  return {
    status: blockers.length ? "blocked" : "pass",
    transition: definition.key,
    checkedAt,
    postClearAuditRequired,
    requiredPolicyCount: definition.requiresImmutablePolicyWhenRequired ? 1 : 0,
    requiredRecordCount: definition.requiresAuditRecordWhenRequired ? 1 : 0,
    immutablePolicyCount,
    nonBlockingAuditRecordCount,
    reviewerDecisionCount,
    blockers: Array.from(new Set(blockers)),
    userFacingBlockerCategories: Array.from(userFacingBlockerCategories),
  };
}

export function getMoralTradePostClearAuditContract(): MoralTradePostClearAuditContract {
  const samplePolicy = makeSamplePolicy();
  const sampleRecord = makeSampleRecord();

  return {
    version: MORAL_TRADE_POST_CLEAR_AUDIT_CONTRACT_VERSION,
    purpose:
      "Fail-closed privacy-safe post-clear audit sampling contract for completed non-public-goods donation offsets and pledge swaps, covering baselines, evidence, recipient acceptance, disclosure, payment state, classification, public metrics, payout release, and release-gate promotion.",
    failClosedRule:
      "Completed non-public-goods trades may be sampled only under a frozen post-clear audit policy. Required public metrics, payout release, payment reconciliation close, and release promotion fail closed when policy or hash-backed audit records are missing, mutable, stale, superseded, failed, privacy-leaking, or unresolved. Corrections may address fraud, evidence, payment, recipient, disclosure, or classification errors only under the frozen dispute, fraud, refund, or audit policy, and must not create public moral reputation, retroactive blame, or new obligations beyond the locked term sheet.",
    privacyBoundary:
      "Public surfaces may expose table names, subject types, audit types, match-state categories, transition rules, blocker categories, and sample statuses only. They must not expose raw payment evidence, private counterparty terms, reviewer notes, raw reconciliation rows, raw provider payloads, participant-specific audit rows, private evidence artifacts, or public moral reputation scores.",
    firstClassRecordTables: [...FIRST_CLASS_RECORD_TABLES],
    policySnapshotSubjects: [...POLICY_SNAPSHOT_SUBJECTS],
    subjectTypes: SUBJECT_TYPES,
    auditTypes: AUDIT_TYPES,
    matchStates: MATCH_STATES,
    auditStates: AUDIT_STATES,
    policyStatuses: POLICY_STATUSES,
    correctionBoundaries: [...CORRECTION_BOUNDARIES],
    transitionDefinitions: TRANSITION_DEFINITIONS,
    sampleEvaluations: [
      evaluateMoralTradePostClearAudit({
        transition: "post_clear_sampling_assignment",
        postClearAuditRequired: false,
        checkedAt: "2026-06-11T12:00:00.000Z",
        policies: [],
        records: [],
      }),
      evaluateMoralTradePostClearAudit({
        transition: "public_metric_publication",
        postClearAuditRequired: true,
        checkedAt: "2026-06-11T12:00:00.000Z",
        policies: [],
        records: [],
      }),
      evaluateMoralTradePostClearAudit({
        transition: "release_gate_promotion",
        postClearAuditRequired: true,
        checkedAt: "2026-06-11T12:00:00.000Z",
        policies: [samplePolicy],
        records: [sampleRecord],
      }),
      evaluateMoralTradePostClearAudit({
        transition: "payout_release",
        postClearAuditRequired: true,
        checkedAt: "2026-06-11T12:00:00.000Z",
        policies: [samplePolicy],
        records: [
          makeSampleRecord({
            auditState: "corrective_action_open",
            paymentAndReconciliationMatchState: "manual_review",
          }),
        ],
      }),
      evaluateMoralTradePostClearAudit({
        transition: "public_metric_publication",
        postClearAuditRequired: true,
        checkedAt: "2026-06-11T12:00:00.000Z",
        policies: [samplePolicy],
        records: [
          makeSampleRecord({
            rawPaymentEvidencePublic: true,
            providerPayloadPublic: true,
            participantSpecificRowsPublic: true,
          }),
        ],
      }),
    ],
    contractTests: [...CONTRACT_TESTS],
  };
}

export function validateMoralTradePostClearAuditContract(
  contract: MoralTradePostClearAuditContract = getMoralTradePostClearAuditContract(),
): MoralTradePostClearAuditValidation {
  const checks = [
    check(
      "versioned-contract",
      "Contract version is pinned",
      contract.version === MORAL_TRADE_POST_CLEAR_AUDIT_CONTRACT_VERSION,
      contract.version,
    ),
    check(
      "first-class-records",
      "First-class post-clear audit tables are declared",
      FIRST_CLASS_RECORD_TABLES.every((table) =>
        contract.firstClassRecordTables.includes(table),
      ),
      contract.firstClassRecordTables.join(", "),
    ),
    check(
      "policy-snapshot-subjects",
      "Policy snapshot subject includes post-clear audit",
      POLICY_SNAPSHOT_SUBJECTS.every((subject) =>
        contract.policySnapshotSubjects.includes(subject),
      ),
      contract.policySnapshotSubjects.join(", "),
    ),
    check(
      "subject-coverage",
      "Contract covers cleared trades, lock proposals, payment events, evidence, payouts, and impact claims",
      REQUIRED_SUBJECT_COVERAGE.every((subject) =>
        contract.subjectTypes.includes(subject),
      ),
      contract.subjectTypes.join(", "),
    ),
    check(
      "audit-type-coverage",
      "Contract covers random, risk, dispute, payment, evidence, recipient, classification, and manual audits",
      REQUIRED_AUDIT_TYPE_COVERAGE.every((auditType) =>
        contract.auditTypes.includes(auditType),
      ),
      contract.auditTypes.join(", "),
    ),
    check(
      "transition-coverage",
      "Public metrics, payout release, and release promotion require non-blocking audit records",
      REQUIRED_PUBLIC_SURFACE_TRANSITIONS.every(
        (key) =>
          contract.transitionDefinitions.some(
            (transition) =>
              transition.key === key &&
              transition.requiresImmutablePolicyWhenRequired &&
              transition.requiresAuditRecordWhenRequired &&
              transition.requiresNonBlockingAuditForPublicSurface &&
              transition.requiresReviewerDecision,
          ),
      ),
      contract.transitionDefinitions
        .map(
          (transition) =>
            `${transition.key}:${transition.requiresNonBlockingAuditForPublicSurface}`,
        )
        .join(", "),
    ),
    check(
      "correction-boundaries",
      "Correction boundaries prohibit public reputation and new retroactive obligations",
      contract.correctionBoundaries.includes(
        "fraud_error_correction_only_under_frozen_policy",
      ) &&
        contract.correctionBoundaries.includes(
          "no_public_moral_reputation_or_retroactive_obligation",
        ) &&
        /new obligations beyond the locked term sheet/i.test(contract.failClosedRule),
      contract.correctionBoundaries.join(", "),
    ),
    check(
      "sample-evaluations",
      "Sample evaluations cover pass and fail-closed post-clear audit states",
      contract.sampleEvaluations.some(
        (evaluation) =>
          evaluation.transition === "release_gate_promotion" &&
          evaluation.status === "pass" &&
          evaluation.nonBlockingAuditRecordCount > 0,
      ) &&
        contract.sampleEvaluations.some((evaluation) =>
          evaluation.blockers.includes("post_clear_audit_policy_required"),
        ) &&
        contract.sampleEvaluations.some((evaluation) =>
          evaluation.blockers.some((blocker) =>
            /post_clear_audit_corrective_action_open|post_clear_audit_not_non_blocking/i.test(
              blocker,
            ),
          ),
        ),
      contract.sampleEvaluations
        .map((evaluation) => `${evaluation.transition}:${evaluation.status}`)
        .join(", "),
    ),
    check(
      "privacy-boundary",
      "Public boundary excludes raw payment evidence and private audit rows",
      /raw payment evidence/i.test(contract.privacyBoundary) &&
        /private counterparty terms/i.test(contract.privacyBoundary) &&
        /reviewer notes/i.test(contract.privacyBoundary) &&
        /raw reconciliation rows/i.test(contract.privacyBoundary) &&
        /raw provider payloads/i.test(contract.privacyBoundary) &&
        /participant-specific audit rows/i.test(contract.privacyBoundary) &&
        /public moral reputation scores/i.test(contract.privacyBoundary),
      contract.privacyBoundary,
    ),
    check(
      "contract-tests",
      "Contract test hooks are named",
      CONTRACT_TESTS.every((testName) => contract.contractTests.includes(testName)),
      contract.contractTests.join(", "),
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => entry.id);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-post-clear-audit-contract",
    validatorVersion: MORAL_TRADE_POST_CLEAR_AUDIT_VALIDATOR_VERSION,
    contractVersion: contract.version,
    checks,
    blockers,
  };
}
