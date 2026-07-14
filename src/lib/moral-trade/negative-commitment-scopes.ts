export const MORAL_TRADE_NEGATIVE_COMMITMENT_SCOPE_CONTRACT_VERSION =
  "moral-trade-negative-commitment-scopes-v0.1-2026-06";
export const MORAL_TRADE_NEGATIVE_COMMITMENT_SCOPE_VALIDATOR_VERSION =
  "moral-trade-negative-commitment-scope-validator-v0.1";

export type MoralTradeNegativeCommitmentScopeTransition =
  | "draft_preview"
  | "matched_trade_lock"
  | "payment_capture"
  | "reliance_bearing_transition"
  | "abstention_evidence_acceptance"
  | "completion_count"
  | "public_metric_publication"
  | "release_gate_promotion";

export type MoralTradeNegativeCommitmentSubjectType =
  | "donation_offset"
  | "pledge_swap"
  | "compensated_moral_action";

export type MoralTradeNegativeCommitmentType =
  | "opposed_donation_abstention"
  | "action_abstention"
  | "alternative_channel_abstention"
  | "mixed_negative_commitment";

export type MoralTradeNegativeCommitmentScopeState =
  | "draft"
  | "previewed"
  | "locked"
  | "active"
  | "completed"
  | "blocked"
  | "superseded";

export type MoralTradeAbstentionConfidenceState =
  | "low"
  | "medium"
  | "high"
  | "manual_review"
  | "blocked";

export type MoralTradeSubstitutionChannelReviewState =
  | "not_required"
  | "under_review"
  | "non_blocking"
  | "blocking"
  | "manual_review";

export interface MoralTradeNegativeCommitmentScopeRecord {
  recordId: string;
  subjectType: MoralTradeNegativeCommitmentSubjectType;
  subjectRef: string;
  negativeCommitmentType: MoralTradeNegativeCommitmentType;
  policySnapshotRef: string;
  coveredActionDescriptionHash: string;
  coveredActionBucketRef: string;
  timeWindowStartAt: string;
  timeWindowEndAt: string;
  knownAffiliateOrSubstituteRefs: string[];
  substitutesReviewed: boolean;
  deMinimisExclusionRule: string;
  evidenceStandardRef: string;
  abstentionConfidenceState: MoralTradeAbstentionConfidenceState;
  leastIntrusiveEvidencePlanRef: string;
  compromiseDonationProofTreatedAsAbstentionProof: boolean;
  rawPrivateEvidenceRequiredFromCounterparty: boolean;
  substitutionChannelReviewState: MoralTradeSubstitutionChannelReviewState;
  scopeState: MoralTradeNegativeCommitmentScopeState;
  reviewerDecisionRef: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  supersededBy: string | null;
}

export interface MoralTradeNegativeCommitmentScopeEvaluationInput {
  transition: MoralTradeNegativeCommitmentScopeTransition;
  checkedAt?: string;
  negativeCommitmentScopeRequired: boolean;
  scopes: MoralTradeNegativeCommitmentScopeRecord[];
}

export interface MoralTradeNegativeCommitmentScopeEvaluation {
  status: "pass" | "blocked";
  transition: MoralTradeNegativeCommitmentScopeTransition;
  checkedAt: string;
  negativeCommitmentScopeRequired: boolean;
  scopeCount: number;
  boundedScopeCount: number;
  highConfidenceScopeCount: number;
  substitutionReviewedScopeCount: number;
  blockers: string[];
  userFacingBlockerCategories: string[];
}

export interface MoralTradeNegativeCommitmentScopeCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradeNegativeCommitmentScopeValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-negative-commitment-scope-contract";
  validatorVersion: string;
  contractVersion: string;
  checks: MoralTradeNegativeCommitmentScopeCheck[];
  blockers: string[];
}

export interface MoralTradeNegativeCommitmentScopeContract {
  version: string;
  purpose: string;
  failClosedRule: string;
  substitutionRule: string;
  evidenceSeparationRule: string;
  privacyRule: string;
  firstClassRecordTables: string[];
  policySnapshotSubjects: string[];
  releaseGateTestHooks: string[];
  transitions: {
    key: MoralTradeNegativeCommitmentScopeTransition;
    requiresScopeRecords: boolean;
    requiresBoundedScope: boolean;
    requiresHighConfidence: boolean;
    requiresSubstitutionReview: boolean;
    userFacingBlockerCategory: string;
  }[];
  sampleEvaluations: MoralTradeNegativeCommitmentScopeEvaluation[];
  contractTests: string[];
}

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
const MAX_SCOPE_AGE_DAYS = 180;

const FIRST_CLASS_RECORD_TABLES = [
  "moral_trade_negative_commitment_scopes",
  "moral_trade_negative_commitment_scope_enforcement_records",
] as const;

const SUBJECT_TYPES = new Set<MoralTradeNegativeCommitmentSubjectType>([
  "donation_offset",
  "pledge_swap",
  "compensated_moral_action",
]);

const NEGATIVE_COMMITMENT_TYPES = new Set<MoralTradeNegativeCommitmentType>([
  "opposed_donation_abstention",
  "action_abstention",
  "alternative_channel_abstention",
  "mixed_negative_commitment",
]);

const POLICY_SNAPSHOT_SUBJECTS = [
  "negative_commitment_scope",
  "evidence_standard",
  "counterfactual_trust",
  "privacy_preserving_verification",
] as const;

const RELEASE_GATE_TEST_HOOKS = [
  "negative_commitment_substitution_test",
] as const;

const CONTRACT_TESTS = [
  "negative_commitment_scope_contract_validator",
  "negative_commitment_substitution_test",
  "negative_commitment_evidence_separation_test",
  "negative_commitment_scope_route_contract",
  "negative_commitment_scope_schema_contract",
] as const;

const BOUNDED_STATES = new Set<MoralTradeNegativeCommitmentScopeState>([
  "previewed",
  "locked",
  "active",
  "completed",
]);

const COMPLETION_STATES = new Set<MoralTradeNegativeCommitmentScopeState>([
  "completed",
]);

const PASSING_CONFIDENCE_STATES = new Set<MoralTradeAbstentionConfidenceState>([
  "medium",
  "high",
]);

const HIGH_CONFIDENCE_STATES = new Set<MoralTradeAbstentionConfidenceState>([
  "high",
]);

const PASSING_SUBSTITUTION_STATES = new Set<MoralTradeSubstitutionChannelReviewState>([
  "not_required",
  "non_blocking",
]);

const TRANSITIONS = [
  {
    key: "draft_preview",
    requiresScopeRecords: false,
    requiresBoundedScope: false,
    requiresHighConfidence: false,
    requiresSubstitutionReview: false,
    userFacingBlockerCategory:
      "Draft previews may describe negative commitments without reliance",
  },
  {
    key: "matched_trade_lock",
    requiresScopeRecords: true,
    requiresBoundedScope: true,
    requiresHighConfidence: false,
    requiresSubstitutionReview: true,
    userFacingBlockerCategory:
      "Lock requires bounded abstention scope, substitute review, and separate evidence standard",
  },
  {
    key: "payment_capture",
    requiresScopeRecords: true,
    requiresBoundedScope: true,
    requiresHighConfidence: false,
    requiresSubstitutionReview: true,
    userFacingBlockerCategory:
      "Payment cannot rely on an unbounded or unreviewed negative commitment",
  },
  {
    key: "reliance_bearing_transition",
    requiresScopeRecords: true,
    requiresBoundedScope: true,
    requiresHighConfidence: false,
    requiresSubstitutionReview: true,
    userFacingBlockerCategory:
      "Reliance requires bounded scope, substitute review, and non-invasive abstention evidence",
  },
  {
    key: "abstention_evidence_acceptance",
    requiresScopeRecords: true,
    requiresBoundedScope: true,
    requiresHighConfidence: true,
    requiresSubstitutionReview: true,
    userFacingBlockerCategory:
      "Abstention evidence requires high confidence without treating payment proof as proof of abstention",
  },
  {
    key: "completion_count",
    requiresScopeRecords: true,
    requiresBoundedScope: true,
    requiresHighConfidence: true,
    requiresSubstitutionReview: true,
    userFacingBlockerCategory:
      "Completion count requires high-confidence bounded abstention scope",
  },
  {
    key: "public_metric_publication",
    requiresScopeRecords: true,
    requiresBoundedScope: true,
    requiresHighConfidence: true,
    requiresSubstitutionReview: true,
    userFacingBlockerCategory:
      "Public metrics cannot count gross donations as abstention without high-confidence scope review",
  },
  {
    key: "release_gate_promotion",
    requiresScopeRecords: true,
    requiresBoundedScope: true,
    requiresHighConfidence: true,
    requiresSubstitutionReview: true,
    userFacingBlockerCategory:
      "Release promotion requires the negative-commitment substitution hook to pass",
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

function transitionContract(transition: MoralTradeNegativeCommitmentScopeTransition) {
  return TRANSITIONS.find((entry) => entry.key === transition) || TRANSITIONS[0];
}

function makeHash(seed: string) {
  const hexSeed = seed.replace(/[^a-f0-9]/gi, "e") || "e";

  return `sha256:${hexSeed.padEnd(64, "0").slice(0, 64).toLowerCase()}`;
}

function isScopeBounded(record: MoralTradeNegativeCommitmentScopeRecord) {
  return (
    isHash(record.coveredActionDescriptionHash) &&
    hasText(record.coveredActionBucketRef) &&
    isIsoDate(record.timeWindowStartAt) &&
    isIsoDate(record.timeWindowEndAt) &&
    Date.parse(record.timeWindowEndAt) > Date.parse(record.timeWindowStartAt) &&
    record.substitutesReviewed &&
    hasText(record.deMinimisExclusionRule) &&
    hasText(record.evidenceStandardRef) &&
    hasText(record.leastIntrusiveEvidencePlanRef) &&
    PASSING_SUBSTITUTION_STATES.has(record.substitutionChannelReviewState) &&
    !record.compromiseDonationProofTreatedAsAbstentionProof &&
    !record.rawPrivateEvidenceRequiredFromCounterparty &&
    BOUNDED_STATES.has(record.scopeState) &&
    !record.supersededBy
  );
}

function isHighConfidence(record: MoralTradeNegativeCommitmentScopeRecord) {
  return HIGH_CONFIDENCE_STATES.has(record.abstentionConfidenceState);
}

function pushScopeBlockers(
  blockers: string[],
  record: MoralTradeNegativeCommitmentScopeRecord,
  checkedAt: string,
  requiresHighConfidence: boolean,
) {
  const id = hasText(record.recordId) ? record.recordId : "negative-commitment-scope:missing-id";

  if (!hasText(record.recordId)) {
    blockers.push("negative_commitment_scope_record_id_missing");
  }

  if (!hasText(record.subjectRef)) {
    blockers.push(`negative_commitment_scope_subject_ref_missing:${id}`);
  }

  if (!SUBJECT_TYPES.has(record.subjectType)) {
    blockers.push(`negative_commitment_scope_subject_type_invalid:${id}`);
  }

  if (!NEGATIVE_COMMITMENT_TYPES.has(record.negativeCommitmentType)) {
    blockers.push(`negative_commitment_type_invalid:${id}`);
  }

  if (!hasText(record.policySnapshotRef)) {
    blockers.push(`negative_commitment_scope_policy_snapshot_missing:${id}`);
  }

  if (!isHash(record.coveredActionDescriptionHash)) {
    blockers.push(`negative_commitment_covered_action_hash_invalid:${id}`);
  }

  if (!hasText(record.coveredActionBucketRef)) {
    blockers.push(`negative_commitment_action_bucket_missing:${id}`);
  }

  if (!isIsoDate(record.timeWindowStartAt) || !isIsoDate(record.timeWindowEndAt)) {
    blockers.push(`negative_commitment_time_window_invalid:${id}`);
  } else if (Date.parse(record.timeWindowEndAt) <= Date.parse(record.timeWindowStartAt)) {
    blockers.push(`negative_commitment_time_window_not_positive:${id}`);
  }

  if (!record.substitutesReviewed) {
    blockers.push(`negative_commitment_substitutes_not_reviewed:${id}`);
  }

  if (!Array.isArray(record.knownAffiliateOrSubstituteRefs)) {
    blockers.push(`negative_commitment_substitute_refs_invalid:${id}`);
  }

  if (!hasText(record.deMinimisExclusionRule)) {
    blockers.push(`negative_commitment_de_minimis_rule_missing:${id}`);
  }

  if (!hasText(record.evidenceStandardRef)) {
    blockers.push(`negative_commitment_evidence_standard_missing:${id}`);
  }

  if (!hasText(record.leastIntrusiveEvidencePlanRef)) {
    blockers.push(`negative_commitment_least_intrusive_evidence_plan_missing:${id}`);
  }

  if (!PASSING_CONFIDENCE_STATES.has(record.abstentionConfidenceState)) {
    blockers.push(
      `negative_commitment_abstention_confidence_not_sufficient:${id}:${record.abstentionConfidenceState}`,
    );
  }

  if (requiresHighConfidence && !isHighConfidence(record)) {
    blockers.push(
      `negative_commitment_high_confidence_required:${id}:${record.abstentionConfidenceState}`,
    );
  }

  if (!PASSING_SUBSTITUTION_STATES.has(record.substitutionChannelReviewState)) {
    blockers.push(
      `negative_commitment_substitution_review_not_non_blocking:${id}:${record.substitutionChannelReviewState}`,
    );
  }

  if (record.compromiseDonationProofTreatedAsAbstentionProof) {
    blockers.push(`compromise_donation_proof_misused_as_abstention_proof:${id}`);
  }

  if (record.rawPrivateEvidenceRequiredFromCounterparty) {
    blockers.push(`negative_commitment_raw_private_evidence_required:${id}`);
  }

  if (!BOUNDED_STATES.has(record.scopeState)) {
    blockers.push(`negative_commitment_scope_not_bounded:${id}:${record.scopeState}`);
  }

  if (requiresHighConfidence && !COMPLETION_STATES.has(record.scopeState)) {
    blockers.push(`negative_commitment_scope_not_completion_ready:${id}:${record.scopeState}`);
  }

  if (!hasText(record.reviewerDecisionRef)) {
    blockers.push(`negative_commitment_reviewer_decision_missing:${id}`);
  }

  if (!isIsoDate(record.createdAt) || !isIsoDate(record.updatedAt)) {
    blockers.push(`negative_commitment_scope_timestamps_invalid:${id}`);
  }

  if (isExpired(record.expiresAt, checkedAt)) {
    blockers.push(`negative_commitment_scope_expired:${id}`);
  }

  if (daysBetween(record.updatedAt, checkedAt) > MAX_SCOPE_AGE_DAYS) {
    blockers.push(`negative_commitment_scope_stale:${id}`);
  }

  if (record.supersededBy) {
    blockers.push(`negative_commitment_scope_superseded:${id}`);
  }
}

export function evaluateMoralTradeNegativeCommitmentScopes(
  input: MoralTradeNegativeCommitmentScopeEvaluationInput,
): MoralTradeNegativeCommitmentScopeEvaluation {
  const checkedAt = input.checkedAt ?? new Date().toISOString();
  const transition = transitionContract(input.transition);
  const blockers: string[] = [];

  if (input.negativeCommitmentScopeRequired && input.scopes.length === 0) {
    blockers.push("negative_commitment_scope_record_required");
  }

  if (transition.requiresScopeRecords && input.scopes.length === 0) {
    blockers.push(`negative_commitment_scope_missing_for_transition:${transition.key}`);
  }

  for (const scope of input.scopes) {
    pushScopeBlockers(blockers, scope, checkedAt, transition.requiresHighConfidence);
  }

  const boundedScopeCount = input.scopes.filter(isScopeBounded).length;
  const highConfidenceScopeCount = input.scopes.filter(isHighConfidence).length;
  const substitutionReviewedScopeCount = input.scopes.filter((record) =>
    PASSING_SUBSTITUTION_STATES.has(record.substitutionChannelReviewState),
  ).length;

  if (
    transition.requiresBoundedScope &&
    input.scopes.length > 0 &&
    boundedScopeCount === 0
  ) {
    blockers.push(`negative_commitment_no_bounded_scope:${transition.key}`);
  }

  if (
    transition.requiresHighConfidence &&
    input.scopes.length > 0 &&
    highConfidenceScopeCount === 0
  ) {
    blockers.push(`negative_commitment_no_high_confidence_scope:${transition.key}`);
  }

  if (
    transition.requiresSubstitutionReview &&
    input.scopes.length > 0 &&
    substitutionReviewedScopeCount === 0
  ) {
    blockers.push(`negative_commitment_no_non_blocking_substitution_review:${transition.key}`);
  }

  return {
    status: blockers.length === 0 ? "pass" : "blocked",
    transition: input.transition,
    checkedAt,
    negativeCommitmentScopeRequired: input.negativeCommitmentScopeRequired,
    scopeCount: input.scopes.length,
    boundedScopeCount,
    highConfidenceScopeCount,
    substitutionReviewedScopeCount,
    blockers,
    userFacingBlockerCategories:
      blockers.length === 0 ? [] : [transition.userFacingBlockerCategory],
  };
}

function sampleScope(
  overrides: Partial<MoralTradeNegativeCommitmentScopeRecord> = {},
): MoralTradeNegativeCommitmentScopeRecord {
  return {
    abstentionConfidenceState: "high",
    compromiseDonationProofTreatedAsAbstentionProof: false,
    coveredActionBucketRef: "action-bucket:opposed-donation",
    coveredActionDescriptionHash: makeHash("covered-action"),
    createdAt: "2026-06-13T12:00:00.000Z",
    deMinimisExclusionRule:
      "Excludes incidental de minimis conduct below the frozen policy threshold.",
    evidenceStandardRef: "evidence-standard:abstention:v1",
    expiresAt: "2026-12-13T12:00:00.000Z",
    knownAffiliateOrSubstituteRefs: ["substitute-channel:known-affiliate"],
    leastIntrusiveEvidencePlanRef: "attestation-plan:least-intrusive-abstention",
    negativeCommitmentType: "opposed_donation_abstention",
    policySnapshotRef: "policy:negative-commitment-scope:v1",
    rawPrivateEvidenceRequiredFromCounterparty: false,
    recordId: "negative-commitment-scope:demo",
    reviewerDecisionRef: "review:negative-commitment-scope",
    scopeState: "completed",
    subjectRef: "pledge-swap:demo",
    subjectType: "pledge_swap",
    substitutesReviewed: true,
    substitutionChannelReviewState: "non_blocking",
    supersededBy: null,
    timeWindowEndAt: "2026-07-13T00:00:00.000Z",
    timeWindowStartAt: "2026-06-13T00:00:00.000Z",
    updatedAt: "2026-06-13T12:00:00.000Z",
    ...overrides,
  };
}

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeNegativeCommitmentScopeCheck {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

export function getMoralTradeNegativeCommitmentScopeContract():
  MoralTradeNegativeCommitmentScopeContract {
  const previewSample = evaluateMoralTradeNegativeCommitmentScopes({
    transition: "draft_preview",
    checkedAt: "2026-06-13T12:00:00.000Z",
    negativeCommitmentScopeRequired: false,
    scopes: [],
  });
  const lockSample = evaluateMoralTradeNegativeCommitmentScopes({
    transition: "matched_trade_lock",
    checkedAt: "2026-06-13T12:00:00.000Z",
    negativeCommitmentScopeRequired: true,
    scopes: [sampleScope({ scopeState: "locked", abstentionConfidenceState: "medium" })],
  });
  const completionSample = evaluateMoralTradeNegativeCommitmentScopes({
    transition: "completion_count",
    checkedAt: "2026-06-13T12:00:00.000Z",
    negativeCommitmentScopeRequired: true,
    scopes: [sampleScope()],
  });
  const blockedSample = evaluateMoralTradeNegativeCommitmentScopes({
    transition: "public_metric_publication",
    checkedAt: "2026-06-13T12:00:00.000Z",
    negativeCommitmentScopeRequired: true,
    scopes: [
      sampleScope({
        abstentionConfidenceState: "low",
        compromiseDonationProofTreatedAsAbstentionProof: true,
        leastIntrusiveEvidencePlanRef: "",
        rawPrivateEvidenceRequiredFromCounterparty: true,
        scopeState: "active",
        substitutesReviewed: false,
        substitutionChannelReviewState: "under_review",
      }),
    ],
  });

  return {
    version: MORAL_TRADE_NEGATIVE_COMMITMENT_SCOPE_CONTRACT_VERSION,
    purpose:
      "Fail-closed negative-commitment scope governance for donation-offset and pledge-swap abstention claims.",
    failClosedRule:
      "Negative or abstention commitments cannot reach lock, payment capture, reliance, evidence acceptance, completion count, public metrics, or release-gate promotion unless a first-class scope record freezes the covered action, time window, substitutes, de minimis exclusions, evidence standard, and abstention confidence.",
    substitutionRule:
      "Known affiliates, substitute channels, and alternative conduct must be reviewed before reliance; gross compromise donations or payment evidence do not prove abstention.",
    evidenceSeparationRule:
      "Abstention confidence is a separate claim from payment, donation, baseline, and completion evidence, and must use the least-intrusive feasible evidence plan.",
    privacyRule:
      "Counterparties and public surfaces receive only scoped attestation outcomes and coarse status; raw private evidence, substitute-channel details, reviewer notes, and participant-specific scope rows stay private unless a current privacy grant allows broader disclosure.",
    firstClassRecordTables: [...FIRST_CLASS_RECORD_TABLES],
    policySnapshotSubjects: [...POLICY_SNAPSHOT_SUBJECTS],
    releaseGateTestHooks: [...RELEASE_GATE_TEST_HOOKS],
    transitions: [...TRANSITIONS],
    sampleEvaluations: [previewSample, lockSample, completionSample, blockedSample],
    contractTests: [...CONTRACT_TESTS],
  };
}

export function validateMoralTradeNegativeCommitmentScopeContract(
  contract = getMoralTradeNegativeCommitmentScopeContract(),
): MoralTradeNegativeCommitmentScopeValidation {
  const checks = [
    check(
      "first-class-record-tables",
      "Negative-commitment scope and enforcement records are first-class tables.",
      FIRST_CLASS_RECORD_TABLES.every((table) =>
        contract.firstClassRecordTables.includes(table),
      ),
      contract.firstClassRecordTables.join(", "),
    ),
    check(
      "policy-subjects",
      "Scope, evidence, counterfactual-trust, and privacy-preserving verification policies are immutable inputs.",
      POLICY_SNAPSHOT_SUBJECTS.every((subject) =>
        contract.policySnapshotSubjects.includes(subject),
      ),
      contract.policySnapshotSubjects.join(", "),
    ),
    check(
      "release-gate-hook",
      "Release promotion exposes the negative-commitment substitution test hook.",
      contract.releaseGateTestHooks.includes("negative_commitment_substitution_test"),
      contract.releaseGateTestHooks.join(", "),
    ),
    check(
      "high-risk-transitions",
      "Lock, payment, reliance, completion, public metrics, and release promotion require first-class scope records.",
      [
        "matched_trade_lock",
        "payment_capture",
        "reliance_bearing_transition",
        "abstention_evidence_acceptance",
        "completion_count",
        "public_metric_publication",
        "release_gate_promotion",
      ].every((transition) =>
        contract.transitions.some(
          (entry) =>
            entry.key === transition &&
            entry.requiresScopeRecords &&
            entry.requiresBoundedScope,
        ),
      ),
      contract.transitions.map((entry) => entry.key).join(", "),
    ),
    check(
      "evidence-separation",
      "The contract blocks treating compromise donation proof as abstention proof.",
      /do not prove abstention/i.test(contract.substitutionRule) &&
        /separate claim/i.test(contract.evidenceSeparationRule),
      `${contract.substitutionRule} ${contract.evidenceSeparationRule}`,
    ),
    check(
      "privacy-boundary",
      "The public contract suppresses raw private evidence and substitute-channel details.",
      /raw private evidence/i.test(contract.privacyRule) &&
        /substitute-channel details/i.test(contract.privacyRule),
      contract.privacyRule,
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
      "Contract advertises negative-commitment scope tests.",
      CONTRACT_TESTS.every((testName) => contract.contractTests.includes(testName)),
      contract.contractTests.join(", "),
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => entry.id);

  return {
    status: blockers.length === 0 ? "pass" : "fail",
    validatorName: "moral-trade-negative-commitment-scope-contract",
    validatorVersion: MORAL_TRADE_NEGATIVE_COMMITMENT_SCOPE_VALIDATOR_VERSION,
    contractVersion: contract.version,
    checks,
    blockers,
  };
}
