export const MORAL_TRADE_RECIPIENT_ACCEPTANCE_CONTRACT_VERSION =
  "moral-trade-recipient-acceptance-v0.1-2026-06";
export const MORAL_TRADE_RECIPIENT_ACCEPTANCE_VALIDATOR_VERSION =
  "moral-trade-recipient-acceptance-validator-v0.1";

export type MoralTradeRecipientAcceptanceTransition =
  | "non_money_preview"
  | "recipient_listing_publication"
  | "matched_trade_lock"
  | "payment_authorization"
  | "payment_capture"
  | "payout_release"
  | "public_metric_publication"
  | "release_gate_promotion";

export type MoralTradeRecipientAcceptanceSubjectType =
  | "donation_offset"
  | "pledge_swap"
  | "compensated_moral_action"
  | "matched_trade_lock_proposal"
  | "cleared_trade_agreement"
  | "common_ground_budget_project";

export type MoralTradeRecipientAcceptancePolicyStatus =
  | "resolved_immutable"
  | "missing"
  | "mutable"
  | "stale"
  | "superseded";

export type MoralTradeRecipientAcceptanceStatus =
  | "not_required_for_stage"
  | "pending_recipient"
  | "accepted"
  | "conditional_acceptance"
  | "declined"
  | "expired"
  | "revoked"
  | "superseded"
  | "blocked";

export type MoralTradeAdverseAssociationStatus =
  | "not_required_for_stage"
  | "cleared"
  | "mitigated"
  | "under_review"
  | "disclosed_nonblocking"
  | "unresolved"
  | "severe"
  | "recipient_declined"
  | "stale"
  | "expired"
  | "superseded"
  | "blocked";

export type MoralTradeAdverseAssociationRiskClass =
  | "none"
  | "low"
  | "medium"
  | "high"
  | "severe";

export type MoralTradeVisibleRecipientAcceptanceStatus =
  | "preview_only"
  | "recipient_pending"
  | "recipient_accepted"
  | "accepted_with_conditions"
  | "adverse_association_review"
  | "declined_or_blocked"
  | "expired_stale";

export interface MoralTradeRecipientAcceptancePolicyRecord {
  policyId: string;
  releaseStage: string;
  subjectType: MoralTradeRecipientAcceptanceSubjectType;
  policyStatus: MoralTradeRecipientAcceptancePolicyStatus;
  policyHash: string;
  requiresRecipientConsent: boolean;
  requiresAdverseAssociationReview: boolean;
  maxReviewAgeDays: number;
  reviewedAt: string;
  expiresAt: string | null;
  supersededBy: string | null;
  publicSummaryAllowed: boolean;
}

export interface MoralTradeRecipientAcceptanceRecord {
  acceptanceId: string;
  policyRef: string;
  recipientRef: string;
  subjectType: MoralTradeRecipientAcceptanceSubjectType;
  subjectRef: string;
  acceptanceStatus: MoralTradeRecipientAcceptanceStatus;
  visibleUserStatus: MoralTradeVisibleRecipientAcceptanceStatus;
  recipientConsentHash: string | null;
  acceptanceScopeHash: string;
  acceptedAt: string | null;
  reviewedAt: string;
  expiresAt: string | null;
  supersededBy: string | null;
  conditionalTermsPublic: boolean;
  recipientPrivateNotesPublic: boolean;
  donorPrivateTermsPublic: boolean;
  reviewerNotesPublic: boolean;
}

export interface MoralTradeAdverseAssociationReviewRecord {
  reviewId: string;
  acceptanceRef: string;
  policyRef: string;
  reviewStatus: MoralTradeAdverseAssociationStatus;
  riskClass: MoralTradeAdverseAssociationRiskClass;
  visibleUserStatus: MoralTradeVisibleRecipientAcceptanceStatus;
  reviewHash: string;
  mitigationHash: string | null;
  reviewedAt: string;
  expiresAt: string | null;
  supersededBy: string | null;
  rawAssociationEvidencePublic: boolean;
  recipientIdentityExpansionPublic: boolean;
  privateDonorReasonPublic: boolean;
  reviewerNotesPublic: boolean;
}

export interface MoralTradeRecipientAcceptanceTransitionDefinition {
  key: MoralTradeRecipientAcceptanceTransition;
  label: string;
  requiresAcceptancePolicy: boolean;
  requiresAcceptanceRecord: boolean;
  requiresRecipientConsent: boolean;
  requiresAdverseAssociationReview: boolean;
  allowsMitigatedAssociation: boolean;
  userFacingBlockerCategory: string;
}

export interface MoralTradeRecipientAcceptanceEvaluationInput {
  transition: MoralTradeRecipientAcceptanceTransition;
  checkedAt?: string;
  policies: MoralTradeRecipientAcceptancePolicyRecord[];
  acceptanceRecords: MoralTradeRecipientAcceptanceRecord[];
  adverseAssociationReviews: MoralTradeAdverseAssociationReviewRecord[];
}

export interface MoralTradeRecipientAcceptanceEvaluation {
  status: "pass" | "blocked";
  transition: MoralTradeRecipientAcceptanceTransition;
  checkedAt: string;
  requiredPolicyCount: number;
  requiredAcceptanceRecordCount: number;
  requiredAdverseAssociationReviewCount: number;
  immutablePolicyCount: number;
  acceptedRecipientCount: number;
  clearedAdverseAssociationCount: number;
  blockers: string[];
  userFacingBlockerCategories: string[];
}

export interface MoralTradeRecipientAcceptanceCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradeRecipientAcceptanceValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-recipient-acceptance-contract";
  validatorVersion: string;
  contractVersion: string;
  checks: MoralTradeRecipientAcceptanceCheck[];
  blockers: string[];
}

export interface MoralTradeRecipientAcceptanceContract {
  version: string;
  purpose: string;
  failClosedRule: string;
  privacyBoundary: string;
  firstClassRecordTables: string[];
  policySnapshotSubjects: string[];
  subjectTypes: MoralTradeRecipientAcceptanceSubjectType[];
  acceptanceStatuses: MoralTradeRecipientAcceptanceStatus[];
  adverseAssociationStatuses: MoralTradeAdverseAssociationStatus[];
  visibleRecipientStatuses: MoralTradeVisibleRecipientAcceptanceStatus[];
  riskClasses: MoralTradeAdverseAssociationRiskClass[];
  policyStatuses: MoralTradeRecipientAcceptancePolicyStatus[];
  failClosedStatuses: Array<
    | MoralTradeRecipientAcceptancePolicyStatus
    | MoralTradeRecipientAcceptanceStatus
    | MoralTradeAdverseAssociationStatus
    | MoralTradeVisibleRecipientAcceptanceStatus
  >;
  transitionDefinitions: MoralTradeRecipientAcceptanceTransitionDefinition[];
  sampleEvaluations: MoralTradeRecipientAcceptanceEvaluation[];
  contractTests: string[];
}

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
const MAX_POLICY_AGE_DAYS = 120;
const MAX_ACCEPTANCE_AGE_DAYS = 90;
const DEFAULT_MAX_REVIEW_AGE_DAYS = 90;

const FIRST_CLASS_RECORD_TABLES = [
  "moral_trade_recipient_acceptance_policies",
  "moral_trade_recipient_acceptance_records",
  "moral_trade_adverse_association_reviews",
] as const;

const POLICY_SNAPSHOT_SUBJECTS = [
  "recipient_acceptance",
  "adverse_association",
] as const;

const SUBJECT_TYPES: MoralTradeRecipientAcceptanceSubjectType[] = [
  "donation_offset",
  "pledge_swap",
  "compensated_moral_action",
  "matched_trade_lock_proposal",
  "cleared_trade_agreement",
  "common_ground_budget_project",
];

const ACCEPTANCE_STATUSES: MoralTradeRecipientAcceptanceStatus[] = [
  "not_required_for_stage",
  "pending_recipient",
  "accepted",
  "conditional_acceptance",
  "declined",
  "expired",
  "revoked",
  "superseded",
  "blocked",
];

const ADVERSE_ASSOCIATION_STATUSES: MoralTradeAdverseAssociationStatus[] = [
  "not_required_for_stage",
  "cleared",
  "mitigated",
  "under_review",
  "disclosed_nonblocking",
  "unresolved",
  "severe",
  "recipient_declined",
  "stale",
  "expired",
  "superseded",
  "blocked",
];

const VISIBLE_RECIPIENT_STATUSES: MoralTradeVisibleRecipientAcceptanceStatus[] = [
  "preview_only",
  "recipient_pending",
  "recipient_accepted",
  "accepted_with_conditions",
  "adverse_association_review",
  "declined_or_blocked",
  "expired_stale",
];

const RISK_CLASSES: MoralTradeAdverseAssociationRiskClass[] = [
  "none",
  "low",
  "medium",
  "high",
  "severe",
];

const POLICY_STATUSES: MoralTradeRecipientAcceptancePolicyStatus[] = [
  "resolved_immutable",
  "missing",
  "mutable",
  "stale",
  "superseded",
];

const PASSING_ACCEPTANCE_STATUSES = new Set<MoralTradeRecipientAcceptanceStatus>([
  "accepted",
  "conditional_acceptance",
  "not_required_for_stage",
]);

const PASSING_ADVERSE_ASSOCIATION_STATUSES = new Set<MoralTradeAdverseAssociationStatus>([
  "cleared",
  "mitigated",
  "not_required_for_stage",
]);

const FAIL_CLOSED_STATUSES = [
  "missing",
  "mutable",
  "stale",
  "superseded",
  "pending_recipient",
  "declined",
  "expired",
  "revoked",
  "blocked",
  "under_review",
  "unresolved",
  "severe",
  "recipient_declined",
  "recipient_pending",
  "adverse_association_review",
  "declined_or_blocked",
  "expired_stale",
] as const;

const TRANSITION_DEFINITIONS: MoralTradeRecipientAcceptanceTransitionDefinition[] = [
  {
    key: "non_money_preview",
    label: "Non-money preview",
    requiresAcceptancePolicy: false,
    requiresAcceptanceRecord: false,
    requiresRecipientConsent: false,
    requiresAdverseAssociationReview: false,
    allowsMitigatedAssociation: true,
    userFacingBlockerCategory: "Recipient acceptance is preview-only",
  },
  {
    key: "recipient_listing_publication",
    label: "Recipient listing publication",
    requiresAcceptancePolicy: true,
    requiresAcceptanceRecord: true,
    requiresRecipientConsent: true,
    requiresAdverseAssociationReview: true,
    allowsMitigatedAssociation: true,
    userFacingBlockerCategory:
      "Recipient listing needs recipient acceptance and adverse-association review",
  },
  {
    key: "matched_trade_lock",
    label: "Matched-trade lock",
    requiresAcceptancePolicy: true,
    requiresAcceptanceRecord: true,
    requiresRecipientConsent: true,
    requiresAdverseAssociationReview: true,
    allowsMitigatedAssociation: true,
    userFacingBlockerCategory:
      "Lock waits for accepted recipient terms and adverse-association review",
  },
  {
    key: "payment_authorization",
    label: "Payment authorization",
    requiresAcceptancePolicy: true,
    requiresAcceptanceRecord: true,
    requiresRecipientConsent: true,
    requiresAdverseAssociationReview: true,
    allowsMitigatedAssociation: true,
    userFacingBlockerCategory:
      "Payment authorization waits for recipient acceptance and adverse-association review",
  },
  {
    key: "payment_capture",
    label: "Payment capture",
    requiresAcceptancePolicy: true,
    requiresAcceptanceRecord: true,
    requiresRecipientConsent: true,
    requiresAdverseAssociationReview: true,
    allowsMitigatedAssociation: true,
    userFacingBlockerCategory:
      "Payment capture waits for accepted recipient terms and non-blocking association review",
  },
  {
    key: "payout_release",
    label: "Payout release",
    requiresAcceptancePolicy: true,
    requiresAcceptanceRecord: true,
    requiresRecipientConsent: true,
    requiresAdverseAssociationReview: true,
    allowsMitigatedAssociation: false,
    userFacingBlockerCategory:
      "Payout release waits for clear recipient acceptance and association review",
  },
  {
    key: "public_metric_publication",
    label: "Public metric publication",
    requiresAcceptancePolicy: true,
    requiresAcceptanceRecord: true,
    requiresRecipientConsent: true,
    requiresAdverseAssociationReview: true,
    allowsMitigatedAssociation: false,
    userFacingBlockerCategory:
      "Public metrics wait for accepted recipient evidence and cleared association review",
  },
  {
    key: "release_gate_promotion",
    label: "Release-gate promotion",
    requiresAcceptancePolicy: true,
    requiresAcceptanceRecord: true,
    requiresRecipientConsent: true,
    requiresAdverseAssociationReview: true,
    allowsMitigatedAssociation: false,
    userFacingBlockerCategory:
      "Release promotion waits for recipient-acceptance and adverse-association controls",
  },
];

const CONTRACT_TESTS = [
  "recipient_acceptance_contract_validator",
  "recipient_acceptance_missing_or_declined_blocking_test",
  "adverse_association_blocking_test",
  "recipient_acceptance_privacy_boundary_test",
  "recipient_acceptance_route_health_spec_and_migration_wiring",
] as const;

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeRecipientAcceptanceCheck {
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
  overrides: Partial<MoralTradeRecipientAcceptancePolicyRecord> = {},
): MoralTradeRecipientAcceptancePolicyRecord {
  return {
    policyId: "recipient-acceptance-policy:tier-1-donation-offset",
    releaseStage: "tier_1_money_only_donation_offset",
    subjectType: "donation_offset",
    policyStatus: "resolved_immutable",
    policyHash: makeHash("recipient-acceptance-policy"),
    requiresRecipientConsent: true,
    requiresAdverseAssociationReview: true,
    maxReviewAgeDays: 45,
    reviewedAt: "2026-06-11T12:00:00.000Z",
    expiresAt: "2026-10-11T12:00:00.000Z",
    supersededBy: null,
    publicSummaryAllowed: true,
    ...overrides,
  };
}

function makeSampleAcceptance(
  overrides: Partial<MoralTradeRecipientAcceptanceRecord> = {},
): MoralTradeRecipientAcceptanceRecord {
  return {
    acceptanceId: "recipient-acceptance:offset-offer-demo",
    policyRef: "recipient-acceptance-policy:tier-1-donation-offset",
    recipientRef: "recipient:verified-charity-demo",
    subjectType: "donation_offset",
    subjectRef: "offset-offer:demo",
    acceptanceStatus: "accepted",
    visibleUserStatus: "recipient_accepted",
    recipientConsentHash: makeHash("recipient-consent"),
    acceptanceScopeHash: makeHash("recipient-acceptance-scope"),
    acceptedAt: "2026-06-11T12:00:00.000Z",
    reviewedAt: "2026-06-11T12:00:00.000Z",
    expiresAt: "2026-09-11T12:00:00.000Z",
    supersededBy: null,
    conditionalTermsPublic: false,
    recipientPrivateNotesPublic: false,
    donorPrivateTermsPublic: false,
    reviewerNotesPublic: false,
    ...overrides,
  };
}

function makeSampleAdverseAssociationReview(
  overrides: Partial<MoralTradeAdverseAssociationReviewRecord> = {},
): MoralTradeAdverseAssociationReviewRecord {
  return {
    reviewId: "adverse-association-review:offset-offer-demo",
    acceptanceRef: "recipient-acceptance:offset-offer-demo",
    policyRef: "recipient-acceptance-policy:tier-1-donation-offset",
    reviewStatus: "cleared",
    riskClass: "none",
    visibleUserStatus: "recipient_accepted",
    reviewHash: makeHash("adverse-association-review"),
    mitigationHash: null,
    reviewedAt: "2026-06-11T12:00:00.000Z",
    expiresAt: "2026-09-11T12:00:00.000Z",
    supersededBy: null,
    rawAssociationEvidencePublic: false,
    recipientIdentityExpansionPublic: false,
    privateDonorReasonPublic: false,
    reviewerNotesPublic: false,
    ...overrides,
  };
}

function getTransitionDefinition(
  transition: MoralTradeRecipientAcceptanceTransition,
) {
  return TRANSITION_DEFINITIONS.find((definition) => definition.key === transition);
}

function policyBlocks(
  policy: MoralTradeRecipientAcceptancePolicyRecord,
  checkedAt: string,
) {
  const blockers: string[] = [];

  if (policy.policyStatus !== "resolved_immutable") {
    blockers.push(
      `recipient_acceptance_policy_not_immutable:${policy.policyId}:${policy.policyStatus}`,
    );
  }

  if (!isHash(policy.policyHash)) {
    blockers.push(`recipient_acceptance_policy_hash_invalid:${policy.policyId}`);
  }

  if (policy.supersededBy) {
    blockers.push(`recipient_acceptance_policy_superseded:${policy.policyId}`);
  }

  if (daysBetween(policy.reviewedAt, checkedAt) > MAX_POLICY_AGE_DAYS) {
    blockers.push(`recipient_acceptance_policy_stale:${policy.policyId}`);
  }

  if (isExpired(policy.expiresAt, checkedAt)) {
    blockers.push(`recipient_acceptance_policy_expired:${policy.policyId}`);
  }

  if (
    !Number.isInteger(policy.maxReviewAgeDays) ||
    policy.maxReviewAgeDays < 1
  ) {
    blockers.push(`recipient_acceptance_policy_review_age_invalid:${policy.policyId}`);
  }

  return blockers;
}

function acceptanceBlocks({
  acceptance,
  checkedAt,
  definition,
  policy,
}: {
  acceptance: MoralTradeRecipientAcceptanceRecord;
  checkedAt: string;
  definition: MoralTradeRecipientAcceptanceTransitionDefinition;
  policy: MoralTradeRecipientAcceptancePolicyRecord | undefined;
}) {
  const blockers: string[] = [];

  if (!policy) {
    blockers.push(`recipient_acceptance_policy_missing:${acceptance.policyRef}`);
  }

  if (acceptance.supersededBy) {
    blockers.push(`recipient_acceptance_superseded:${acceptance.acceptanceId}`);
  }

  if (!PASSING_ACCEPTANCE_STATUSES.has(acceptance.acceptanceStatus)) {
    blockers.push(
      `recipient_acceptance_not_accepted:${acceptance.acceptanceId}:${acceptance.acceptanceStatus}`,
    );
  }

  if (acceptance.acceptanceStatus === "declined") {
    blockers.push(`recipient_acceptance_declined:${acceptance.acceptanceId}`);
  }

  if (acceptance.acceptanceStatus === "revoked") {
    blockers.push(`recipient_acceptance_revoked:${acceptance.acceptanceId}`);
  }

  if (definition.requiresRecipientConsent && !isHash(acceptance.recipientConsentHash)) {
    blockers.push(`recipient_consent_missing:${acceptance.acceptanceId}`);
  }

  if (!isHash(acceptance.acceptanceScopeHash)) {
    blockers.push(`recipient_acceptance_scope_hash_invalid:${acceptance.acceptanceId}`);
  }

  if (
    definition.requiresRecipientConsent &&
    acceptance.acceptanceStatus !== "not_required_for_stage" &&
    acceptance.acceptedAt === null
  ) {
    blockers.push(`recipient_acceptance_timestamp_missing:${acceptance.acceptanceId}`);
  }

  if (
    definition.requiresRecipientConsent &&
    !["recipient_accepted", "accepted_with_conditions"].includes(
      acceptance.visibleUserStatus,
    )
  ) {
    blockers.push(
      `recipient_acceptance_visible_status_blocking:${acceptance.acceptanceId}:${acceptance.visibleUserStatus}`,
    );
  }

  if (acceptance.conditionalTermsPublic) {
    blockers.push(`recipient_acceptance_conditional_terms_public:${acceptance.acceptanceId}`);
  }

  if (acceptance.recipientPrivateNotesPublic) {
    blockers.push(`recipient_private_notes_public:${acceptance.acceptanceId}`);
  }

  if (acceptance.donorPrivateTermsPublic) {
    blockers.push(`recipient_acceptance_donor_private_terms_public:${acceptance.acceptanceId}`);
  }

  if (acceptance.reviewerNotesPublic) {
    blockers.push(`recipient_acceptance_reviewer_notes_public:${acceptance.acceptanceId}`);
  }

  if (daysBetween(acceptance.reviewedAt, checkedAt) > MAX_ACCEPTANCE_AGE_DAYS) {
    blockers.push(`recipient_acceptance_stale:${acceptance.acceptanceId}`);
  }

  if (isExpired(acceptance.expiresAt, checkedAt)) {
    blockers.push(`recipient_acceptance_expired:${acceptance.acceptanceId}`);
  }

  return blockers;
}

function adverseAssociationBlocks({
  acceptance,
  checkedAt,
  definition,
  policy,
  review,
}: {
  acceptance: MoralTradeRecipientAcceptanceRecord | undefined;
  checkedAt: string;
  definition: MoralTradeRecipientAcceptanceTransitionDefinition;
  policy: MoralTradeRecipientAcceptancePolicyRecord | undefined;
  review: MoralTradeAdverseAssociationReviewRecord;
}) {
  const blockers: string[] = [];
  const maxReviewAgeDays =
    policy?.maxReviewAgeDays && policy.maxReviewAgeDays > 0
      ? policy.maxReviewAgeDays
      : DEFAULT_MAX_REVIEW_AGE_DAYS;

  if (!acceptance) {
    blockers.push(`adverse_association_acceptance_missing:${review.reviewId}`);
  } else if (review.acceptanceRef !== acceptance.acceptanceId) {
    blockers.push(`adverse_association_acceptance_ref_mismatch:${review.reviewId}`);
  }

  if (!policy) {
    blockers.push(`adverse_association_policy_missing:${review.policyRef}`);
  } else if (review.policyRef !== policy.policyId) {
    blockers.push(`adverse_association_policy_ref_mismatch:${review.reviewId}`);
  }

  if (review.supersededBy) {
    blockers.push(`adverse_association_review_superseded:${review.reviewId}`);
  }

  if (!isHash(review.reviewHash)) {
    blockers.push(`adverse_association_review_hash_invalid:${review.reviewId}`);
  }

  if (!PASSING_ADVERSE_ASSOCIATION_STATUSES.has(review.reviewStatus)) {
    blockers.push(
      `adverse_association_not_cleared:${review.reviewId}:${review.reviewStatus}`,
    );
  }

  if (
    review.reviewStatus === "mitigated" &&
    (!definition.allowsMitigatedAssociation || !isHash(review.mitigationHash))
  ) {
    blockers.push(`adverse_association_mitigation_not_sufficient:${review.reviewId}`);
  }

  if (review.reviewStatus === "severe" || review.riskClass === "severe") {
    blockers.push(`adverse_association_severe:${review.reviewId}`);
  }

  if (review.riskClass === "high" && review.reviewStatus !== "mitigated") {
    blockers.push(`adverse_association_high_risk_unmitigated:${review.reviewId}`);
  }

  if (review.visibleUserStatus === "adverse_association_review") {
    blockers.push(`adverse_association_visible_status_blocking:${review.reviewId}`);
  }

  if (review.rawAssociationEvidencePublic) {
    blockers.push(`raw_adverse_association_evidence_public:${review.reviewId}`);
  }

  if (review.recipientIdentityExpansionPublic) {
    blockers.push(`recipient_identity_expansion_public:${review.reviewId}`);
  }

  if (review.privateDonorReasonPublic) {
    blockers.push(`adverse_association_private_donor_reason_public:${review.reviewId}`);
  }

  if (review.reviewerNotesPublic) {
    blockers.push(`adverse_association_reviewer_notes_public:${review.reviewId}`);
  }

  if (daysBetween(review.reviewedAt, checkedAt) > maxReviewAgeDays) {
    blockers.push(`adverse_association_review_stale:${review.reviewId}`);
  }

  if (isExpired(review.expiresAt, checkedAt)) {
    blockers.push(`adverse_association_review_expired:${review.reviewId}`);
  }

  return blockers;
}

export function evaluateMoralTradeRecipientAcceptance(
  input: MoralTradeRecipientAcceptanceEvaluationInput,
): MoralTradeRecipientAcceptanceEvaluation {
  const definition = getTransitionDefinition(input.transition);
  const checkedAt = input.checkedAt ?? new Date().toISOString();
  const blockers: string[] = [];
  const userFacingBlockerCategories = new Set<string>();

  if (!definition) {
    blockers.push(`unknown_recipient_acceptance_transition:${input.transition}`);

    return {
      status: "blocked",
      transition: input.transition,
      checkedAt,
      requiredPolicyCount: 0,
      requiredAcceptanceRecordCount: 0,
      requiredAdverseAssociationReviewCount: 0,
      immutablePolicyCount: 0,
      acceptedRecipientCount: 0,
      clearedAdverseAssociationCount: 0,
      blockers,
      userFacingBlockerCategories: ["Unknown recipient-acceptance transition"],
    };
  }

  if (definition.requiresAcceptancePolicy && input.policies.length === 0) {
    blockers.push("recipient_acceptance_policy_required");
  }

  if (definition.requiresAcceptanceRecord && input.acceptanceRecords.length === 0) {
    blockers.push("recipient_acceptance_record_required");
  }

  if (
    definition.requiresAdverseAssociationReview &&
    input.adverseAssociationReviews.length === 0
  ) {
    blockers.push("adverse_association_review_required");
  }

  for (const policy of input.policies) {
    blockers.push(...policyBlocks(policy, checkedAt));
  }

  for (const acceptance of input.acceptanceRecords) {
    const policy = input.policies.find(
      (candidate) => candidate.policyId === acceptance.policyRef,
    );

    blockers.push(
      ...acceptanceBlocks({
        acceptance,
        checkedAt,
        definition,
        policy,
      }),
    );
  }

  for (const review of input.adverseAssociationReviews) {
    const policy = input.policies.find(
      (candidate) => candidate.policyId === review.policyRef,
    );
    const acceptance = input.acceptanceRecords.find(
      (candidate) => candidate.acceptanceId === review.acceptanceRef,
    );

    blockers.push(
      ...adverseAssociationBlocks({
        acceptance,
        checkedAt,
        definition,
        policy,
        review,
      }),
    );
  }

  if (blockers.length) {
    userFacingBlockerCategories.add(definition.userFacingBlockerCategory);
  }

  const immutablePolicyCount = input.policies.filter(
    (policy) => policy.policyStatus === "resolved_immutable",
  ).length;
  const acceptedRecipientCount = input.acceptanceRecords.filter((acceptance) =>
    PASSING_ACCEPTANCE_STATUSES.has(acceptance.acceptanceStatus),
  ).length;
  const clearedAdverseAssociationCount = input.adverseAssociationReviews.filter(
    (review) =>
      review.reviewStatus === "cleared" ||
      (definition.allowsMitigatedAssociation && review.reviewStatus === "mitigated") ||
      review.reviewStatus === "not_required_for_stage",
  ).length;

  return {
    status: blockers.length ? "blocked" : "pass",
    transition: definition.key,
    checkedAt,
    requiredPolicyCount: definition.requiresAcceptancePolicy ? 1 : 0,
    requiredAcceptanceRecordCount: definition.requiresAcceptanceRecord ? 1 : 0,
    requiredAdverseAssociationReviewCount:
      definition.requiresAdverseAssociationReview ? 1 : 0,
    immutablePolicyCount,
    acceptedRecipientCount,
    clearedAdverseAssociationCount,
    blockers: Array.from(new Set(blockers)),
    userFacingBlockerCategories: Array.from(userFacingBlockerCategories),
  };
}

export function getMoralTradeRecipientAcceptanceContract(): MoralTradeRecipientAcceptanceContract {
  const samplePolicy = makeSamplePolicy();
  const sampleAcceptance = makeSampleAcceptance();
  const sampleReview = makeSampleAdverseAssociationReview();

  return {
    version: MORAL_TRADE_RECIPIENT_ACCEPTANCE_CONTRACT_VERSION,
    purpose:
      "Fail-closed recipient acceptance and adverse-association contract for recipient listings, donation offsets, pledge swaps, matched-trade locks, payment, payout, public metrics, and release-gate transitions.",
    failClosedRule:
      "Non-money previews can run without records, but listings, lock, payment, payout, public metrics, and release promotion require immutable recipient-acceptance policy, current hash-backed recipient acceptance, recipient consent when required, and non-blocking adverse-association review. Missing, pending, declined, revoked, stale, expired, severe, unresolved, or privacy-leaking records block.",
    privacyBoundary:
      "Public surfaces may expose table names, status categories, transition rules, risk-class buckets, and sample statuses only. They must not expose recipient private notes, donor private terms, raw adverse-association evidence, expanded recipient identities, reviewer notes, private donor reasons, payment details, raw provider payloads, or participant-specific acceptance records.",
    firstClassRecordTables: [...FIRST_CLASS_RECORD_TABLES],
    policySnapshotSubjects: [...POLICY_SNAPSHOT_SUBJECTS],
    subjectTypes: SUBJECT_TYPES,
    acceptanceStatuses: ACCEPTANCE_STATUSES,
    adverseAssociationStatuses: ADVERSE_ASSOCIATION_STATUSES,
    visibleRecipientStatuses: VISIBLE_RECIPIENT_STATUSES,
    riskClasses: RISK_CLASSES,
    policyStatuses: POLICY_STATUSES,
    failClosedStatuses: [...FAIL_CLOSED_STATUSES],
    transitionDefinitions: TRANSITION_DEFINITIONS,
    sampleEvaluations: [
      evaluateMoralTradeRecipientAcceptance({
        transition: "non_money_preview",
        checkedAt: "2026-06-11T12:00:00.000Z",
        policies: [],
        acceptanceRecords: [],
        adverseAssociationReviews: [],
      }),
      evaluateMoralTradeRecipientAcceptance({
        transition: "payment_capture",
        checkedAt: "2026-06-11T12:00:00.000Z",
        policies: [samplePolicy],
        acceptanceRecords: [sampleAcceptance],
        adverseAssociationReviews: [sampleReview],
      }),
      evaluateMoralTradeRecipientAcceptance({
        transition: "matched_trade_lock",
        checkedAt: "2026-06-11T12:00:00.000Z",
        policies: [samplePolicy],
        acceptanceRecords: [
          makeSampleAcceptance({
            acceptanceStatus: "declined",
            visibleUserStatus: "declined_or_blocked",
            recipientConsentHash: null,
          }),
        ],
        adverseAssociationReviews: [sampleReview],
      }),
      evaluateMoralTradeRecipientAcceptance({
        transition: "payment_capture",
        checkedAt: "2026-06-11T12:00:00.000Z",
        policies: [samplePolicy],
        acceptanceRecords: [sampleAcceptance],
        adverseAssociationReviews: [
          makeSampleAdverseAssociationReview({
            reviewStatus: "severe",
            riskClass: "severe",
            visibleUserStatus: "adverse_association_review",
          }),
        ],
      }),
      evaluateMoralTradeRecipientAcceptance({
        transition: "public_metric_publication",
        checkedAt: "2026-06-11T12:00:00.000Z",
        policies: [samplePolicy],
        acceptanceRecords: [sampleAcceptance],
        adverseAssociationReviews: [
          makeSampleAdverseAssociationReview({
            reviewStatus: "mitigated",
            riskClass: "medium",
            mitigationHash: makeHash("mitigation"),
          }),
        ],
      }),
    ],
    contractTests: [...CONTRACT_TESTS],
  };
}

export function validateMoralTradeRecipientAcceptanceContract(
  contract: MoralTradeRecipientAcceptanceContract = getMoralTradeRecipientAcceptanceContract(),
): MoralTradeRecipientAcceptanceValidation {
  const checks = [
    check(
      "versioned-contract",
      "Contract version is pinned",
      contract.version === MORAL_TRADE_RECIPIENT_ACCEPTANCE_CONTRACT_VERSION,
      contract.version,
    ),
    check(
      "first-class-records",
      "First-class recipient acceptance tables are declared",
      FIRST_CLASS_RECORD_TABLES.every((table) =>
        contract.firstClassRecordTables.includes(table),
      ),
      contract.firstClassRecordTables.join(", "),
    ),
    check(
      "policy-snapshot-subjects",
      "Policy snapshot subjects include recipient acceptance and adverse association",
      POLICY_SNAPSHOT_SUBJECTS.every((subject) =>
        contract.policySnapshotSubjects.includes(subject),
      ),
      contract.policySnapshotSubjects.join(", "),
    ),
    check(
      "blocking-status-coverage",
      "Fail-closed statuses cover declined recipient and severe associations",
      contract.acceptanceStatuses.includes("declined") &&
        contract.acceptanceStatuses.includes("revoked") &&
        contract.adverseAssociationStatuses.includes("severe") &&
        contract.adverseAssociationStatuses.includes("unresolved") &&
        contract.visibleRecipientStatuses.includes("adverse_association_review"),
      [
        contract.acceptanceStatuses.join("|"),
        contract.adverseAssociationStatuses.join("|"),
        contract.visibleRecipientStatuses.join("|"),
      ].join(", "),
    ),
    check(
      "transition-coverage",
      "Lock, payment, payout, public metric, and release transitions require acceptance and association review",
      contract.transitionDefinitions.some(
        (transition) =>
          transition.key === "matched_trade_lock" &&
          transition.requiresAcceptanceRecord &&
          transition.requiresAdverseAssociationReview,
      ) &&
        contract.transitionDefinitions.some(
          (transition) =>
            transition.key === "payment_capture" &&
            transition.requiresRecipientConsent,
        ) &&
        contract.transitionDefinitions.some(
          (transition) =>
            transition.key === "public_metric_publication" &&
            !transition.allowsMitigatedAssociation,
        ),
      contract.transitionDefinitions
        .map((transition) => `${transition.key}:${transition.requiresAcceptanceRecord}`)
        .join(", "),
    ),
    check(
      "sample-evaluations",
      "Sample evaluations cover pass and fail-closed acceptance/adverse-association states",
      contract.sampleEvaluations.some(
        (evaluation) =>
          evaluation.transition === "payment_capture" &&
          evaluation.status === "pass",
      ) &&
        contract.sampleEvaluations.some((evaluation) =>
          evaluation.blockers.some((blocker) =>
            /recipient_acceptance_declined|recipient_acceptance_not_accepted/i.test(
              blocker,
            ),
          ),
        ) &&
        contract.sampleEvaluations.some((evaluation) =>
          evaluation.blockers.some((blocker) =>
            /adverse_association_not_cleared|adverse_association_severe|adverse_association_mitigation_not_sufficient/i.test(
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
      "Public boundary excludes private recipient and adverse-association details",
      /recipient private notes/i.test(contract.privacyBoundary) &&
        /raw adverse-association evidence/i.test(contract.privacyBoundary) &&
        /private donor reasons/i.test(contract.privacyBoundary) &&
        /reviewer notes/i.test(contract.privacyBoundary) &&
        /participant-specific acceptance records/i.test(contract.privacyBoundary),
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
    validatorName: "moral-trade-recipient-acceptance-contract",
    validatorVersion: MORAL_TRADE_RECIPIENT_ACCEPTANCE_VALIDATOR_VERSION,
    contractVersion: contract.version,
    checks,
    blockers,
  };
}
