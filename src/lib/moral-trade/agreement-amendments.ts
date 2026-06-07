export const MORAL_TRADE_AGREEMENT_AMENDMENTS_CONTRACT_VERSION =
  "moral-trade-agreement-amendments-v0.1-2026-06";
export const MORAL_TRADE_AGREEMENT_AMENDMENTS_VALIDATOR_VERSION =
  "moral-trade-agreement-amendments-validator-v0.1";

export type MoralTradeAgreementAmendmentTransition =
  | "donation_offset_material_change"
  | "pledge_swap_material_change"
  | "post_lock_correction"
  | "pause_or_early_termination"
  | "evidence_standard_change"
  | "destination_change";

export type MoralTradeAgreementAmendmentSubjectType =
  | "locked_donation_offset"
  | "locked_pledge_swap"
  | "matched_trade_lock_proposal"
  | "cleared_trade_agreement";

export type MoralTradeAgreementAmendmentType =
  | "correction"
  | "mutual_modification"
  | "pause"
  | "early_termination"
  | "evidence_standard_change"
  | "schedule_change"
  | "compensation_change"
  | "destination_change"
  | "baseline_correction"
  | "privacy_change"
  | "other";

export type MoralTradeAgreementAmendmentState =
  | "draft"
  | "presented"
  | "confirmed"
  | "approved"
  | "applied"
  | "rejected"
  | "withdrawn"
  | "superseded"
  | "stale";

export type MoralTradeAgreementAmendmentReviewStatus =
  | "passed"
  | "not_required_for_stage"
  | "missing"
  | "under_review"
  | "failed"
  | "stale"
  | "superseded";

export type MoralTradeAgreementAmendmentConfirmationState =
  | "missing"
  | "stale"
  | "scope_mismatch"
  | "passed"
  | "not_required_for_stage";

export type MoralTradeAgreementAmendmentFailClosedStatus =
  | "policy_missing"
  | "policy_mutable"
  | "policy_stale"
  | "policy_superseded"
  | "amendment_missing"
  | "amendment_unconfirmed"
  | "amendment_not_approved"
  | "amendment_not_applied"
  | "amendment_rejected_or_withdrawn"
  | "amendment_stale"
  | "amendment_superseded"
  | "parent_record_edit_detected"
  | "retroactive_performance_change"
  | "evidence_claim_retyped"
  | "exposure_increase_without_confirmation"
  | "funds_redirect_without_confirmation"
  | "compensation_change_without_confirmation"
  | "cancellation_rights_narrowed"
  | "privacy_change_without_confirmation"
  | "donor_of_record_change_without_confirmation"
  | "third_party_obligation_change_without_confirmation"
  | "renewed_confirmation_missing"
  | "renewed_confirmation_stale"
  | "participant_confirmation_scope_mismatch"
  | "neutral_review_missing"
  | "notice_missing"
  | "reviewer_quality_missing"
  | "baseline_integrity_missing"
  | "before_terms_hash_missing"
  | "after_terms_hash_missing"
  | "policy_snapshot_bundle_missing"
  | "invalid_amendment_hash"
  | "invalid_policy_hash";

export interface MoralTradeAgreementAmendmentPolicyRecord {
  policyId: string;
  subjectType: MoralTradeAgreementAmendmentSubjectType;
  amendmentType: MoralTradeAgreementAmendmentType;
  status: MoralTradeAgreementAmendmentReviewStatus;
  renewedConfirmationRequired: boolean;
  neutralReviewRequiredForBurdenShift: boolean;
  nonRetroactivityRequired: boolean;
  beforeAfterHashRequired: boolean;
  noticeRequired: boolean;
  reviewerQualityRequired: boolean;
  baselineIntegrityRequired: boolean;
  policyHash: string;
  reviewedAt: string | null;
  supersededBy: string | null;
  maxAmendmentAgeDays: number;
}

export interface MoralTradeAgreementAmendmentRecord {
  amendmentId: string;
  policyRef: string;
  subjectType: MoralTradeAgreementAmendmentSubjectType;
  subjectRef: string;
  amendmentType: MoralTradeAgreementAmendmentType;
  amendmentState: MoralTradeAgreementAmendmentState;
  materialChange: boolean;
  burdenOrBenefitShift: boolean;
  parentRecordEditDetected: boolean;
  retroactivePerformanceChange: boolean;
  evidenceClaimRetyped: boolean;
  exposureIncreased: boolean;
  fundsRedirected: boolean;
  compensationChanged: boolean;
  cancellationRightsNarrowed: boolean;
  privacyDisclosureChanged: boolean;
  donorOfRecordChanged: boolean;
  thirdPartyObligationChanged: boolean;
  beforeTermsHash: string | null;
  afterTermsHash: string | null;
  policySnapshotBundleHash: string | null;
  renewedConfirmationRefs: string[];
  confirmationState: MoralTradeAgreementAmendmentConfirmationState;
  neutralReviewStatus: MoralTradeAgreementAmendmentReviewStatus;
  noticeStatus: MoralTradeAgreementAmendmentReviewStatus;
  reviewerQualityStatus: MoralTradeAgreementAmendmentReviewStatus;
  baselineIntegrityStatus: MoralTradeAgreementAmendmentReviewStatus;
  amendmentHash: string;
  reviewedAt: string | null;
  expiresAt: string | null;
  appliedAt: string | null;
  supersededBy: string | null;
}

export interface MoralTradeAgreementAmendmentEvaluationInput {
  transition: MoralTradeAgreementAmendmentTransition;
  subjectType: MoralTradeAgreementAmendmentSubjectType;
  amendmentType: MoralTradeAgreementAmendmentType;
  requiresAmendment: boolean;
  requiresAppliedAmendment: boolean;
  requiresRelianceBearingTransition: boolean;
  requiresRenewedConfirmations: boolean;
  requiresNeutralReview: boolean;
  checkedAt?: string;
  policies: MoralTradeAgreementAmendmentPolicyRecord[];
  amendments: MoralTradeAgreementAmendmentRecord[];
}

export interface MoralTradeAgreementAmendmentEvaluation {
  status: "pass" | "blocked";
  transition: MoralTradeAgreementAmendmentTransition;
  subjectType: MoralTradeAgreementAmendmentSubjectType;
  amendmentType: MoralTradeAgreementAmendmentType;
  checkedAt: string;
  policyCount: number;
  amendmentCount: number;
  blockers: string[];
  userFacingBlockerCategories: string[];
}

export interface MoralTradeAgreementAmendmentTransitionDefinition {
  key: MoralTradeAgreementAmendmentTransition;
  label: string;
  protectedBoundary: string;
  requiredRecords: string[];
  blocksTransitions: string[];
}

export interface MoralTradeAgreementAmendmentCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradeAgreementAmendmentValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-agreement-amendments-contract";
  validatorVersion: string;
  contractVersion: string;
  checks: MoralTradeAgreementAmendmentCheck[];
  blockers: string[];
}

export interface MoralTradeAgreementAmendmentContract {
  version: string;
  purpose: string;
  privacyRule: string;
  failClosedRule: string;
  firstClassRecordTables: string[];
  policySnapshotSubjects: string[];
  transitions: MoralTradeAgreementAmendmentTransition[];
  subjectTypes: MoralTradeAgreementAmendmentSubjectType[];
  amendmentTypes: MoralTradeAgreementAmendmentType[];
  amendmentStates: MoralTradeAgreementAmendmentState[];
  confirmationStates: MoralTradeAgreementAmendmentConfirmationState[];
  failClosedStatuses: MoralTradeAgreementAmendmentFailClosedStatus[];
  transitionDefinitions: MoralTradeAgreementAmendmentTransitionDefinition[];
  sampleEvaluations: MoralTradeAgreementAmendmentEvaluation[];
  contractTests: string[];
}

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
const DEFAULT_MAX_AMENDMENT_AGE_DAYS = 45;

const FIRST_CLASS_RECORD_TABLES = [
  "moral_trade_agreement_amendment_policies",
  "moral_trade_agreement_amendment_records",
] as const;

const POLICY_SNAPSHOT_SUBJECTS = ["agreement_amendment"] as const;

const TRANSITIONS: MoralTradeAgreementAmendmentTransition[] = [
  "donation_offset_material_change",
  "pledge_swap_material_change",
  "post_lock_correction",
  "pause_or_early_termination",
  "evidence_standard_change",
  "destination_change",
];

const SUBJECT_TYPES: MoralTradeAgreementAmendmentSubjectType[] = [
  "locked_donation_offset",
  "locked_pledge_swap",
  "matched_trade_lock_proposal",
  "cleared_trade_agreement",
];

const AMENDMENT_TYPES: MoralTradeAgreementAmendmentType[] = [
  "correction",
  "mutual_modification",
  "pause",
  "early_termination",
  "evidence_standard_change",
  "schedule_change",
  "compensation_change",
  "destination_change",
  "baseline_correction",
  "privacy_change",
  "other",
];

const AMENDMENT_STATES: MoralTradeAgreementAmendmentState[] = [
  "draft",
  "presented",
  "confirmed",
  "approved",
  "applied",
  "rejected",
  "withdrawn",
  "superseded",
  "stale",
];

const CONFIRMATION_STATES: MoralTradeAgreementAmendmentConfirmationState[] = [
  "missing",
  "stale",
  "scope_mismatch",
  "passed",
  "not_required_for_stage",
];

const FAIL_CLOSED_STATUSES: MoralTradeAgreementAmendmentFailClosedStatus[] = [
  "policy_missing",
  "policy_mutable",
  "policy_stale",
  "policy_superseded",
  "amendment_missing",
  "amendment_unconfirmed",
  "amendment_not_approved",
  "amendment_not_applied",
  "amendment_rejected_or_withdrawn",
  "amendment_stale",
  "amendment_superseded",
  "parent_record_edit_detected",
  "retroactive_performance_change",
  "evidence_claim_retyped",
  "exposure_increase_without_confirmation",
  "funds_redirect_without_confirmation",
  "compensation_change_without_confirmation",
  "cancellation_rights_narrowed",
  "privacy_change_without_confirmation",
  "donor_of_record_change_without_confirmation",
  "third_party_obligation_change_without_confirmation",
  "renewed_confirmation_missing",
  "renewed_confirmation_stale",
  "participant_confirmation_scope_mismatch",
  "neutral_review_missing",
  "notice_missing",
  "reviewer_quality_missing",
  "baseline_integrity_missing",
  "before_terms_hash_missing",
  "after_terms_hash_missing",
  "policy_snapshot_bundle_missing",
  "invalid_amendment_hash",
  "invalid_policy_hash",
];

const TRANSITION_DEFINITIONS: MoralTradeAgreementAmendmentTransitionDefinition[] = [
  {
    key: "donation_offset_material_change",
    label: "Donation offset material change",
    protectedBoundary:
      "locked donation offsets cannot change amount, ratio, baseline, destination, donor treatment, evidence standard, or remedy by editing parent records",
    requiredRecords: [...FIRST_CLASS_RECORD_TABLES],
    blocksTransitions: ["payment_capture", "public_completed_claim", "payout_release"],
  },
  {
    key: "pledge_swap_material_change",
    label: "Pledge swap material change",
    protectedBoundary:
      "locked pledge swaps require append-only amendment records, renewed confirmations, and neutral review before burden-shifting changes can become reliance-bearing",
    requiredRecords: [...FIRST_CLASS_RECORD_TABLES],
    blocksTransitions: ["performance_start", "matched_trade_lock_update", "reliance_bearing_preview"],
  },
  {
    key: "post_lock_correction",
    label: "Post-lock correction",
    protectedBoundary:
      "corrections may clarify terms only when before/after hashes prove no retroactive performance or evidence-claim change",
    requiredRecords: [...FIRST_CLASS_RECORD_TABLES],
    blocksTransitions: ["terms_snapshot_update", "evidence_acceptance", "cleared_agreement_update"],
  },
  {
    key: "pause_or_early_termination",
    label: "Pause or early termination",
    protectedBoundary:
      "pause or early termination cannot narrow cancellation rights, redirect funds, or change compensation without affected confirmations and neutral review where required",
    requiredRecords: [...FIRST_CLASS_RECORD_TABLES],
    blocksTransitions: ["performance_pause", "early_termination", "refund_or_carry_forward"],
  },
  {
    key: "evidence_standard_change",
    label: "Evidence standard change",
    protectedBoundary:
      "evidence standards cannot be changed after lock to convert old evidence into a different claim type",
    requiredRecords: [...FIRST_CLASS_RECORD_TABLES],
    blocksTransitions: ["evidence_review", "impact_claim_publication", "breach_remedy"],
  },
  {
    key: "destination_change",
    label: "Destination change",
    protectedBoundary:
      "destination changes require renewed confirmation, policy snapshots, notice, and recipient/destination review before capture, payout, or public money claims",
    requiredRecords: [...FIRST_CLASS_RECORD_TABLES],
    blocksTransitions: ["payment_capture", "destination_reuse", "public_money_metric"],
  },
];

const CONTRACT_TESTS = [
  "agreement_amendment_contract_validator",
  "agreement_amendment_evaluator_fail_closed",
  "agreement_amendment_route_contract",
  "agreement_amendment_schema_contract",
  "agreement_amendment_health_contract",
] as const;

function hasAll(values: readonly string[], required: readonly string[]) {
  return required.every((entry) => values.includes(entry));
}

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeAgreementAmendmentCheck {
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

function statusPassed(status: MoralTradeAgreementAmendmentReviewStatus) {
  return status === "passed" || status === "not_required_for_stage";
}

function confirmationPassed(state: MoralTradeAgreementAmendmentConfirmationState) {
  return state === "passed" || state === "not_required_for_stage";
}

function isPolicyCurrent(
  policy: MoralTradeAgreementAmendmentPolicyRecord,
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

  return daysBetween(policy.reviewedAt, checkedAt) <= DEFAULT_MAX_AMENDMENT_AGE_DAYS;
}

function isAmendmentCurrent(
  amendment: MoralTradeAgreementAmendmentRecord,
  policy: MoralTradeAgreementAmendmentPolicyRecord,
  checkedAt: string,
) {
  if (
    amendment.amendmentState === "superseded" ||
    amendment.amendmentState === "stale" ||
    amendment.supersededBy ||
    isExpired(amendment.expiresAt, checkedAt) ||
    !amendment.reviewedAt
  ) {
    return false;
  }

  return daysBetween(amendment.reviewedAt, checkedAt) <= policy.maxAmendmentAgeDays;
}

function isAmendmentApproved(amendment: MoralTradeAgreementAmendmentRecord) {
  return amendment.amendmentState === "approved" || amendment.amendmentState === "applied";
}

function policyBlockers(
  policy: MoralTradeAgreementAmendmentPolicyRecord,
  checkedAt: string,
) {
  const blockers: string[] = [];

  if (!statusPassed(policy.status)) {
    if (policy.status === "missing" || policy.status === "under_review") {
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
  status: MoralTradeAgreementAmendmentReviewStatus,
  blocker: MoralTradeAgreementAmendmentFailClosedStatus,
  amendmentId: string,
) {
  return statusPassed(status) ? [] : [`${blocker}:${amendmentId}`];
}

function confirmationBlockers(
  amendment: MoralTradeAgreementAmendmentRecord,
  input: MoralTradeAgreementAmendmentEvaluationInput,
) {
  const requiresRenewed =
    input.requiresRenewedConfirmations ||
    amendment.materialChange ||
    amendment.exposureIncreased ||
    amendment.fundsRedirected ||
    amendment.compensationChanged ||
    amendment.privacyDisclosureChanged ||
    amendment.donorOfRecordChanged ||
    amendment.thirdPartyObligationChanged;
  const blockers: string[] = [];

  if (!requiresRenewed) {
    return blockers;
  }

  if (amendment.renewedConfirmationRefs.length === 0 || amendment.confirmationState === "missing") {
    blockers.push(`renewed_confirmation_missing:${amendment.amendmentId}`);
  }

  if (amendment.confirmationState === "stale") {
    blockers.push(`renewed_confirmation_stale:${amendment.amendmentId}`);
  }

  if (amendment.confirmationState === "scope_mismatch") {
    blockers.push(`participant_confirmation_scope_mismatch:${amendment.amendmentId}`);
  }

  if (!confirmationPassed(amendment.confirmationState)) {
    if (amendment.exposureIncreased) {
      blockers.push(`exposure_increase_without_confirmation:${amendment.amendmentId}`);
    }

    if (amendment.fundsRedirected) {
      blockers.push(`funds_redirect_without_confirmation:${amendment.amendmentId}`);
    }

    if (amendment.compensationChanged) {
      blockers.push(`compensation_change_without_confirmation:${amendment.amendmentId}`);
    }

    if (amendment.privacyDisclosureChanged) {
      blockers.push(`privacy_change_without_confirmation:${amendment.amendmentId}`);
    }

    if (amendment.donorOfRecordChanged) {
      blockers.push(`donor_of_record_change_without_confirmation:${amendment.amendmentId}`);
    }

    if (amendment.thirdPartyObligationChanged) {
      blockers.push(`third_party_obligation_change_without_confirmation:${amendment.amendmentId}`);
    }
  }

  return blockers;
}

function amendmentBlockers(
  amendment: MoralTradeAgreementAmendmentRecord,
  policy: MoralTradeAgreementAmendmentPolicyRecord,
  input: MoralTradeAgreementAmendmentEvaluationInput,
  checkedAt: string,
) {
  const blockers: string[] = [];

  if (amendment.amendmentState === "draft" || amendment.amendmentState === "presented") {
    blockers.push(`amendment_unconfirmed:${amendment.amendmentId}`);
  }

  if (!isAmendmentApproved(amendment)) {
    blockers.push(`amendment_not_approved:${amendment.amendmentId}`);
  }

  if (input.requiresAppliedAmendment && amendment.amendmentState !== "applied") {
    blockers.push(`amendment_not_applied:${amendment.amendmentId}`);
  }

  if (amendment.amendmentState === "rejected" || amendment.amendmentState === "withdrawn") {
    blockers.push(`amendment_rejected_or_withdrawn:${amendment.amendmentId}`);
  }

  if (!isAmendmentCurrent(amendment, policy, checkedAt)) {
    blockers.push(`amendment_stale:${amendment.amendmentId}`);
  }

  if (amendment.amendmentState === "superseded" || amendment.supersededBy) {
    blockers.push(`amendment_superseded:${amendment.amendmentId}`);
  }

  if (amendment.parentRecordEditDetected) {
    blockers.push(`parent_record_edit_detected:${amendment.amendmentId}`);
  }

  if (policy.nonRetroactivityRequired && amendment.retroactivePerformanceChange) {
    blockers.push(`retroactive_performance_change:${amendment.amendmentId}`);
  }

  if (amendment.evidenceClaimRetyped) {
    blockers.push(`evidence_claim_retyped:${amendment.amendmentId}`);
  }

  if (amendment.cancellationRightsNarrowed) {
    blockers.push(`cancellation_rights_narrowed:${amendment.amendmentId}`);
  }

  if (policy.beforeAfterHashRequired && !hasValidHash(amendment.beforeTermsHash)) {
    blockers.push(`before_terms_hash_missing:${amendment.amendmentId}`);
  }

  if (policy.beforeAfterHashRequired && !hasValidHash(amendment.afterTermsHash)) {
    blockers.push(`after_terms_hash_missing:${amendment.amendmentId}`);
  }

  if (!hasValidHash(amendment.policySnapshotBundleHash)) {
    blockers.push(`policy_snapshot_bundle_missing:${amendment.amendmentId}`);
  }

  if (policy.renewedConfirmationRequired) {
    blockers.push(...confirmationBlockers(amendment, input));
  }

  if (
    (policy.neutralReviewRequiredForBurdenShift && amendment.burdenOrBenefitShift) ||
    input.requiresNeutralReview
  ) {
    blockers.push(
      ...reviewStatusBlocker(
        amendment.neutralReviewStatus,
        "neutral_review_missing",
        amendment.amendmentId,
      ),
    );
  }

  if (policy.noticeRequired) {
    blockers.push(
      ...reviewStatusBlocker(
        amendment.noticeStatus,
        "notice_missing",
        amendment.amendmentId,
      ),
    );
  }

  if (policy.reviewerQualityRequired) {
    blockers.push(
      ...reviewStatusBlocker(
        amendment.reviewerQualityStatus,
        "reviewer_quality_missing",
        amendment.amendmentId,
      ),
    );
  }

  if (policy.baselineIntegrityRequired) {
    blockers.push(
      ...reviewStatusBlocker(
        amendment.baselineIntegrityStatus,
        "baseline_integrity_missing",
        amendment.amendmentId,
      ),
    );
  }

  if (!hasValidHash(amendment.amendmentHash)) {
    blockers.push(`invalid_amendment_hash:${amendment.amendmentId}`);
  }

  return blockers;
}

function userFacingCategories(blockers: string[]) {
  const categories = new Set<string>();

  for (const blocker of blockers) {
    if (blocker.includes("policy")) {
      categories.add("Amendment policy is not frozen and current");
    } else if (
      blocker.includes("parent_record") ||
      blocker.includes("retroactive") ||
      blocker.includes("evidence_claim")
    ) {
      categories.add("Locked terms cannot be silently or retroactively changed");
    } else if (
      blocker.includes("confirmation") ||
      blocker.includes("exposure") ||
      blocker.includes("funds_redirect") ||
      blocker.includes("compensation") ||
      blocker.includes("privacy") ||
      blocker.includes("donor") ||
      blocker.includes("third_party")
    ) {
      categories.add("Affected participants have not renewed confirmation");
    } else if (blocker.includes("neutral") || blocker.includes("reviewer")) {
      categories.add("Required neutral or reviewer-quality review is incomplete");
    } else {
      categories.add("Agreement amendment is not ready");
    }
  }

  return Array.from(categories);
}

export function evaluateMoralTradeAgreementAmendment(
  input: MoralTradeAgreementAmendmentEvaluationInput,
): MoralTradeAgreementAmendmentEvaluation {
  const checkedAt = input.checkedAt ?? new Date().toISOString();
  const matchingPolicies = input.policies.filter(
    (policy) =>
      policy.subjectType === input.subjectType &&
      policy.amendmentType === input.amendmentType,
  );
  const activePolicy =
    matchingPolicies.find((policy) => statusPassed(policy.status)) ?? matchingPolicies[0];
  const matchingAmendments = activePolicy
    ? input.amendments.filter(
        (amendment) =>
          amendment.policyRef === activePolicy.policyId &&
          amendment.subjectType === input.subjectType &&
          amendment.amendmentType === input.amendmentType,
      )
    : [];
  const activeAmendment = activePolicy
    ? matchingAmendments.find((amendment) =>
        isAmendmentApproved(amendment) &&
        isAmendmentCurrent(amendment, activePolicy, checkedAt),
      ) ?? matchingAmendments[0]
    : undefined;
  const blockers: string[] = [];

  if (!activePolicy) {
    blockers.push(`policy_missing:${input.amendmentType}`);
  } else {
    blockers.push(...policyBlockers(activePolicy, checkedAt));
  }

  if (input.requiresAmendment) {
    if (!activeAmendment) {
      blockers.push(`amendment_missing:${input.transition}`);
    } else if (activePolicy) {
      blockers.push(
        ...amendmentBlockers(activeAmendment, activePolicy, input, checkedAt),
      );
    }
  }

  const uniqueBlockers = Array.from(new Set(blockers));

  return {
    status: uniqueBlockers.length ? "blocked" : "pass",
    transition: input.transition,
    subjectType: input.subjectType,
    amendmentType: input.amendmentType,
    checkedAt,
    policyCount: matchingPolicies.length,
    amendmentCount: matchingAmendments.length,
    blockers: uniqueBlockers,
    userFacingBlockerCategories: userFacingCategories(uniqueBlockers),
  };
}

function samplePolicy(
  subjectType: MoralTradeAgreementAmendmentSubjectType,
  amendmentType: MoralTradeAgreementAmendmentType,
  overrides: Partial<MoralTradeAgreementAmendmentPolicyRecord> = {},
): MoralTradeAgreementAmendmentPolicyRecord {
  return {
    policyId: `agreement-amendment-policy-${subjectType}-${amendmentType}`,
    subjectType,
    amendmentType,
    status: "passed",
    renewedConfirmationRequired: true,
    neutralReviewRequiredForBurdenShift: true,
    nonRetroactivityRequired: true,
    beforeAfterHashRequired: true,
    noticeRequired: true,
    reviewerQualityRequired: true,
    baselineIntegrityRequired: true,
    policyHash:
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    reviewedAt: "2026-06-01T00:00:00.000Z",
    supersededBy: null,
    maxAmendmentAgeDays: DEFAULT_MAX_AMENDMENT_AGE_DAYS,
    ...overrides,
  };
}

function sampleAmendment(
  subjectType: MoralTradeAgreementAmendmentSubjectType,
  amendmentType: MoralTradeAgreementAmendmentType,
  policyRef: string,
  overrides: Partial<MoralTradeAgreementAmendmentRecord> = {},
): MoralTradeAgreementAmendmentRecord {
  return {
    amendmentId: `agreement-amendment-${subjectType}-${amendmentType}`,
    policyRef,
    subjectType,
    subjectRef: `subject:${subjectType}:sample`,
    amendmentType,
    amendmentState: "approved",
    materialChange: true,
    burdenOrBenefitShift: false,
    parentRecordEditDetected: false,
    retroactivePerformanceChange: false,
    evidenceClaimRetyped: false,
    exposureIncreased: false,
    fundsRedirected: false,
    compensationChanged: false,
    cancellationRightsNarrowed: false,
    privacyDisclosureChanged: false,
    donorOfRecordChanged: false,
    thirdPartyObligationChanged: false,
    beforeTermsHash:
      "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    afterTermsHash:
      "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    policySnapshotBundleHash:
      "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    renewedConfirmationRefs: [
      "participant-confirmation:affected-a",
      "participant-confirmation:affected-b",
    ],
    confirmationState: "passed",
    neutralReviewStatus: "not_required_for_stage",
    noticeStatus: "passed",
    reviewerQualityStatus: "passed",
    baselineIntegrityStatus: "passed",
    amendmentHash:
      "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    reviewedAt: "2026-06-01T00:00:00.000Z",
    expiresAt: "2026-06-20T00:00:00.000Z",
    appliedAt: null,
    supersededBy: null,
    ...overrides,
  };
}

function buildSampleEvaluations() {
  const correctionPolicy = samplePolicy("locked_donation_offset", "correction");
  const correctionAmendment = sampleAmendment(
    "locked_donation_offset",
    "correction",
    correctionPolicy.policyId,
  );
  const burdenShiftPolicy = samplePolicy(
    "locked_pledge_swap",
    "compensation_change",
  );
  const blockedBurdenShift = sampleAmendment(
    "locked_pledge_swap",
    "compensation_change",
    burdenShiftPolicy.policyId,
    {
      amendmentState: "presented",
      burdenOrBenefitShift: true,
      parentRecordEditDetected: true,
      retroactivePerformanceChange: true,
      exposureIncreased: true,
      compensationChanged: true,
      cancellationRightsNarrowed: true,
      beforeTermsHash: null,
      afterTermsHash: null,
      policySnapshotBundleHash: null,
      renewedConfirmationRefs: [],
      confirmationState: "missing",
      neutralReviewStatus: "missing",
      noticeStatus: "missing",
      reviewerQualityStatus: "under_review",
      baselineIntegrityStatus: "missing",
      amendmentHash: "invalid-hash",
    },
  );

  return [
    evaluateMoralTradeAgreementAmendment({
      transition: "post_lock_correction",
      subjectType: "locked_donation_offset",
      amendmentType: "correction",
      requiresAmendment: true,
      requiresAppliedAmendment: false,
      requiresRelianceBearingTransition: false,
      requiresRenewedConfirmations: true,
      requiresNeutralReview: false,
      checkedAt: "2026-06-02T00:00:00.000Z",
      policies: [correctionPolicy],
      amendments: [correctionAmendment],
    }),
    evaluateMoralTradeAgreementAmendment({
      transition: "pledge_swap_material_change",
      subjectType: "locked_pledge_swap",
      amendmentType: "compensation_change",
      requiresAmendment: true,
      requiresAppliedAmendment: false,
      requiresRelianceBearingTransition: true,
      requiresRenewedConfirmations: true,
      requiresNeutralReview: true,
      checkedAt: "2026-06-02T00:00:00.000Z",
      policies: [burdenShiftPolicy],
      amendments: [blockedBurdenShift],
    }),
  ];
}

export function getMoralTradeAgreementAmendmentContract(): MoralTradeAgreementAmendmentContract {
  return {
    version: MORAL_TRADE_AGREEMENT_AMENDMENTS_CONTRACT_VERSION,
    purpose:
      "Fail-closed agreement-amendment governance for locked donation offsets and pledge swaps: append-only amendment records, before/after hashes, renewed confirmations, non-retroactivity checks, notice, reviewer quality, baseline integrity, and neutral review before material changes can alter obligations or become reliance-bearing.",
    privacyRule:
      "Public agreement-amendment contract responses expose only static table names, transition names, amendment types, state codes, validation blockers, and sample pass/block states; they never expose private amendment narratives, participant identities, confirmation payloads, reviewer notes, payment details, private baselines, or counterparty-specific terms.",
    failClosedRule:
      "Parent-record edits are not amendments: missing, stale, unapproved, unapplied, rejected, withdrawn, or superseded amendment records; retroactive performance changes; evidence-claim retyping; exposure increases; fund redirects; compensation changes; cancellation-right narrowing; privacy, donor-of-record, or third-party-obligation changes without renewed confirmation; missing neutral review; missing notice; missing reviewer-quality or baseline-integrity checks; missing before/after terms hashes; missing policy snapshot bundle; or invalid hashes block material post-lock changes.",
    firstClassRecordTables: [...FIRST_CLASS_RECORD_TABLES],
    policySnapshotSubjects: [...POLICY_SNAPSHOT_SUBJECTS],
    transitions: [...TRANSITIONS],
    subjectTypes: [...SUBJECT_TYPES],
    amendmentTypes: [...AMENDMENT_TYPES],
    amendmentStates: [...AMENDMENT_STATES],
    confirmationStates: [...CONFIRMATION_STATES],
    failClosedStatuses: [...FAIL_CLOSED_STATUSES],
    transitionDefinitions: [...TRANSITION_DEFINITIONS],
    sampleEvaluations: buildSampleEvaluations(),
    contractTests: [...CONTRACT_TESTS],
  };
}

export function validateMoralTradeAgreementAmendmentContract(
  contract = getMoralTradeAgreementAmendmentContract(),
): MoralTradeAgreementAmendmentValidation {
  const checks = [
    check(
      "record-table-coverage",
      "Agreement amendments have first-class policy and amendment records",
      hasAll(contract.firstClassRecordTables, FIRST_CLASS_RECORD_TABLES),
      contract.firstClassRecordTables.join(", "),
    ),
    check(
      "policy-subject-coverage",
      "Agreement amendments are frozen policy-snapshot subjects",
      hasAll(contract.policySnapshotSubjects, POLICY_SNAPSHOT_SUBJECTS),
      contract.policySnapshotSubjects.join(", "),
    ),
    check(
      "transition-coverage",
      "Donation offsets, pledge swaps, corrections, pauses, evidence changes, and destination changes are covered",
      hasAll(contract.transitions, TRANSITIONS),
      contract.transitions.join(", "),
    ),
    check(
      "subject-type-coverage",
      "Locked offsets, locked pledge swaps, lock proposals, and cleared agreements are covered",
      hasAll(contract.subjectTypes, SUBJECT_TYPES),
      contract.subjectTypes.join(", "),
    ),
    check(
      "amendment-type-coverage",
      "Amendment types cover correction, mutual modification, pause, termination, schedule, compensation, destination, baseline, privacy, and other changes",
      hasAll(contract.amendmentTypes, AMENDMENT_TYPES),
      contract.amendmentTypes.join(", "),
    ),
    check(
      "amendment-state-coverage",
      "Amendment states include draft, presented, confirmed, approved, applied, rejected, withdrawn, stale, and superseded",
      hasAll(contract.amendmentStates, AMENDMENT_STATES),
      contract.amendmentStates.join(", "),
    ),
    check(
      "fail-closed-coverage",
      "Fail-closed statuses cover parent edits, retroactivity, retyped evidence, renewed confirmations, neutral review, notice, and hashes",
      hasAll(contract.failClosedStatuses, FAIL_CLOSED_STATUSES),
      contract.failClosedStatuses.join(", "),
    ),
    check(
      "transition-definition-coverage",
      "Every amendment transition lists required records and blocked transitions",
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
      "Sample evaluations prove a post-lock correction can pass and a burden-shifting pledge-swap change blocks",
      contract.sampleEvaluations.some(
        (evaluation) =>
          evaluation.transition === "post_lock_correction" &&
          evaluation.status === "pass",
      ) &&
        contract.sampleEvaluations.some(
          (evaluation) =>
            evaluation.transition === "pledge_swap_material_change" &&
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
    validatorName: "moral-trade-agreement-amendments-contract",
    validatorVersion: MORAL_TRADE_AGREEMENT_AMENDMENTS_VALIDATOR_VERSION,
    contractVersion: contract.version,
    checks,
    blockers,
  };
}

const moralTradeAgreementAmendments = {
  evaluateMoralTradeAgreementAmendment,
  getMoralTradeAgreementAmendmentContract,
  validateMoralTradeAgreementAmendmentContract,
};

export default moralTradeAgreementAmendments;
