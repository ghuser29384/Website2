export const MORAL_TRADE_PRIVACY_GOVERNANCE_CONTRACT_VERSION =
  "moral-trade-privacy-governance-v0.1-2026-06";
export const MORAL_TRADE_PRIVACY_GOVERNANCE_VALIDATOR_VERSION =
  "moral-trade-privacy-governance-validator-v0.1";

export type MoralTradePrivacySurface =
  | "reviewer_access"
  | "counterparty_preview"
  | "contact_introduction"
  | "evidence_review"
  | "profile_export"
  | "public_redacted_publication";

export type MoralTradePrivacyPolicySnapshotStatus =
  | "resolved_immutable"
  | "missing"
  | "mutable"
  | "stale"
  | "superseded";

export type MoralTradePrivacyGrantStatus =
  | "draft"
  | "granted"
  | "revoked"
  | "expired"
  | "superseded";

export type MoralTradePrivacyReviewStatus =
  | "passed"
  | "not_required_for_stage"
  | "missing"
  | "under_review"
  | "failed"
  | "stale"
  | "superseded";

export type MoralTradePrivacyAudienceStage =
  | "registry"
  | "consent"
  | "introduced"
  | "public_redacted";

export type MoralTradePrivacyAccessLevel =
  | "hidden"
  | "broad"
  | "specific"
  | "contact";

export type MoralTradePrivacyAccessDecision =
  | "allowed"
  | "blocked"
  | "redacted";

export type MoralTradePrivacyFailClosedStatus =
  | "policy_missing"
  | "policy_mutable"
  | "policy_stale"
  | "policy_superseded"
  | "grant_missing"
  | "grant_not_granted"
  | "grant_revoked"
  | "grant_expired"
  | "grant_superseded"
  | "grant_scope_mismatch"
  | "grant_purpose_missing"
  | "grant_expiry_missing"
  | "grant_hash_invalid"
  | "access_log_missing"
  | "access_log_stale"
  | "access_log_superseded"
  | "purpose_limit_missing"
  | "role_limit_missing"
  | "raw_private_artifact_returned"
  | "private_data_returned_without_allowed_decision"
  | "counterparty_disclosure_without_grant"
  | "public_disclosure_without_redaction_policy"
  | "redaction_missing"
  | "review_missing"
  | "review_failed"
  | "review_stale"
  | "confidentiality_review_missing"
  | "data_security_unresolved"
  | "reviewer_quality_missing"
  | "account_security_missing"
  | "participant_confirmation_missing"
  | "external_authority_missing"
  | "invalid_access_hash"
  | "invalid_review_hash"
  | "invalid_policy_hash";

export interface MoralTradePrivacyGrantPolicyRecord {
  policyId: string;
  policyVersion: string;
  surface: MoralTradePrivacySurface;
  policySnapshotStatus: MoralTradePrivacyPolicySnapshotStatus;
  grantRequired: boolean;
  accessLogRequired: boolean;
  roleLimitRequired: boolean;
  purposeLimitRequired: boolean;
  revocableGrantRequired: boolean;
  expiryRequired: boolean;
  dataSecurityReviewRequired: boolean;
  confidentialityReviewRequired: boolean;
  reviewerQualityRequired: boolean;
  accountSecurityRequired: boolean;
  participantConfirmationRequired: boolean;
  externalAuthorityRequired: boolean;
  redactionRequired: boolean;
  publicRedactionPolicyRequired: boolean;
  maxAccessLogAgeDays: number;
  policyHash: string;
  reviewedAt: string;
  supersededBy: string | null;
}

export interface MoralTradePrivacyGrantRecord {
  grantId: string;
  fieldKey: string;
  accessLevel: MoralTradePrivacyAccessLevel;
  audienceStage: MoralTradePrivacyAudienceStage;
  status: MoralTradePrivacyGrantStatus;
  purposeCode: string;
  ownerProfileHash: string;
  counterpartyProfileHash: string | null;
  revocable: boolean;
  grantHash: string;
  expiresAt: string | null;
  supersededBy: string | null;
}

export interface MoralTradePrivacyAccessLogRecord {
  logId: string;
  grantId: string;
  surface: MoralTradePrivacySurface;
  privacyPolicyRef: string;
  actorRole: string;
  purposeCode: string;
  fieldKey: string;
  accessDecision: MoralTradePrivacyAccessDecision;
  privateDataReturned: boolean;
  rawPrivateArtifactReturned: boolean;
  redactionApplied: boolean;
  roleLimited: boolean;
  purposeLimited: boolean;
  counterpartyDisclosure: boolean;
  publicDisclosure: boolean;
  accessHash: string;
  occurredAt: string;
  expiresAt: string | null;
  supersededBy: string | null;
}

export interface MoralTradePrivacyDisclosureReviewRecord {
  reviewId: string;
  grantId: string;
  surface: MoralTradePrivacySurface;
  privacyPolicyRef: string;
  reviewStatus: MoralTradePrivacyReviewStatus;
  confidentialityReviewStatus: MoralTradePrivacyReviewStatus;
  dataSecurityStatus: MoralTradePrivacyReviewStatus;
  reviewerQualityStatus: MoralTradePrivacyReviewStatus;
  accountSecurityStatus: MoralTradePrivacyReviewStatus;
  participantConfirmationStatus: MoralTradePrivacyReviewStatus;
  externalAuthorityStatus: MoralTradePrivacyReviewStatus;
  reviewHash: string;
  reviewedAt: string;
  expiresAt: string | null;
  supersededBy: string | null;
}

export interface MoralTradePrivacySurfaceDefinition {
  key: MoralTradePrivacySurface;
  label: string;
  protectedData: string;
  requiredControls: string[];
  blocksTransitions: string[];
}

export interface MoralTradePrivacyEvaluationInput {
  surface: MoralTradePrivacySurface;
  requestedFieldKey: string;
  requestedAudienceStage: MoralTradePrivacyAudienceStage;
  checkedAt?: string;
  policies: MoralTradePrivacyGrantPolicyRecord[];
  grants: MoralTradePrivacyGrantRecord[];
  accessLogs: MoralTradePrivacyAccessLogRecord[];
  reviews: MoralTradePrivacyDisclosureReviewRecord[];
}

export interface MoralTradePrivacyEvaluation {
  status: "pass" | "blocked";
  surface: MoralTradePrivacySurface;
  checkedAt: string;
  policyCount: number;
  grantCount: number;
  accessLogCount: number;
  reviewCount: number;
  blockers: string[];
  userFacingBlockerCategories: string[];
}

export interface MoralTradePrivacyGovernanceCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradePrivacyGovernanceValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-privacy-governance-contract";
  validatorVersion: string;
  contractVersion: string;
  checks: MoralTradePrivacyGovernanceCheck[];
  blockers: string[];
}

export interface MoralTradePrivacyGovernanceContract {
  version: string;
  purpose: string;
  privacyRule: string;
  failClosedRule: string;
  firstClassRecordTables: string[];
  existingRecordTables: string[];
  policySnapshotSubjects: string[];
  surfaces: MoralTradePrivacySurface[];
  audienceStages: MoralTradePrivacyAudienceStage[];
  accessLevels: MoralTradePrivacyAccessLevel[];
  failClosedStatuses: MoralTradePrivacyFailClosedStatus[];
  surfaceDefinitions: MoralTradePrivacySurfaceDefinition[];
  sampleEvaluations: MoralTradePrivacyEvaluation[];
  contractTests: string[];
}

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
const MAX_POLICY_AGE_DAYS = 90;

const FIRST_CLASS_RECORD_TABLES = [
  "moral_trade_privacy_grant_policies",
  "moral_trade_privacy_access_logs",
  "moral_trade_privacy_disclosure_reviews",
] as const;

const EXISTING_RECORD_TABLES = ["privacy_grants"] as const;

const POLICY_SNAPSHOT_SUBJECTS = ["privacy_disclosure"] as const;

const SURFACES: MoralTradePrivacySurface[] = [
  "reviewer_access",
  "counterparty_preview",
  "contact_introduction",
  "evidence_review",
  "profile_export",
  "public_redacted_publication",
];

const AUDIENCE_STAGES: MoralTradePrivacyAudienceStage[] = [
  "registry",
  "consent",
  "introduced",
  "public_redacted",
];

const ACCESS_LEVELS: MoralTradePrivacyAccessLevel[] = [
  "hidden",
  "broad",
  "specific",
  "contact",
];

const FAIL_CLOSED_STATUSES: MoralTradePrivacyFailClosedStatus[] = [
  "policy_missing",
  "policy_mutable",
  "policy_stale",
  "policy_superseded",
  "grant_missing",
  "grant_not_granted",
  "grant_revoked",
  "grant_expired",
  "grant_superseded",
  "grant_scope_mismatch",
  "grant_purpose_missing",
  "grant_expiry_missing",
  "grant_hash_invalid",
  "access_log_missing",
  "access_log_stale",
  "access_log_superseded",
  "purpose_limit_missing",
  "role_limit_missing",
  "raw_private_artifact_returned",
  "private_data_returned_without_allowed_decision",
  "counterparty_disclosure_without_grant",
  "public_disclosure_without_redaction_policy",
  "redaction_missing",
  "review_missing",
  "review_failed",
  "review_stale",
  "confidentiality_review_missing",
  "data_security_unresolved",
  "reviewer_quality_missing",
  "account_security_missing",
  "participant_confirmation_missing",
  "external_authority_missing",
  "invalid_access_hash",
  "invalid_review_hash",
  "invalid_policy_hash",
];

const REQUIRED_CONTROLS = [
  "frozen_privacy_disclosure_policy",
  "explicit_revocable_privacy_grant",
  "purpose_limited_access",
  "role_limited_access",
  "privacy_access_log",
  "data_security_review",
  "confidentiality_privacy_rights_review",
] as const;

const SURFACE_DEFINITIONS: MoralTradePrivacySurfaceDefinition[] = [
  {
    key: "reviewer_access",
    label: "Reviewer access",
    protectedData: "exact wishes, private evidence, source notes, and sensitive constraints",
    requiredControls: [
      ...REQUIRED_CONTROLS,
      "reviewer_quality_check",
      "account_security_check",
    ],
    blocksTransitions: ["reviewer_evidence_acceptance", "privacy_grant_approval"],
  },
  {
    key: "counterparty_preview",
    label: "Counterparty preview",
    protectedData: "counterparty-visible exact fields and consent-stage summaries",
    requiredControls: [...REQUIRED_CONTROLS, "participant_confirmation"],
    blocksTransitions: ["counterparty_preview_disclosure", "matched_trade_lock_proposal"],
  },
  {
    key: "contact_introduction",
    label: "Contact introduction",
    protectedData: "contact details, direct identifiers, and introduced-stage routing",
    requiredControls: [
      ...REQUIRED_CONTROLS,
      "participant_confirmation",
      "account_security_check",
    ],
    blocksTransitions: ["contact_detail_release", "intro_packet_contact_approval"],
  },
  {
    key: "evidence_review",
    label: "Evidence review",
    protectedData: "submitted artifacts, filenames, metadata, and claim-scoped evidence",
    requiredControls: [...REQUIRED_CONTROLS, "claim_scope_review"],
    blocksTransitions: ["evidence_acceptance", "impact_claim_review"],
  },
  {
    key: "profile_export",
    label: "Profile export",
    protectedData: "owner-scoped privacy grants and private background records",
    requiredControls: [...REQUIRED_CONTROLS, "export_scope_review"],
    blocksTransitions: ["profile_export_private_payload"],
  },
  {
    key: "public_redacted_publication",
    label: "Public redacted publication",
    protectedData: "public summaries derived from private facts or evidence",
    requiredControls: [
      ...REQUIRED_CONTROLS,
      "redacted_publication_policy",
      "small_sample_suppression",
    ],
    blocksTransitions: ["public_impact_claim", "transparency_report_publication"],
  },
];

const CONTRACT_TESTS = [
  "privacy_governance_contract_validator",
  "privacy_grant_evaluator_fail_closed",
  "privacy_access_log_schema_contract",
  "privacy_governance_route_contract",
  "privacy_governance_health_contract",
] as const;

function hasAll(values: readonly string[], required: readonly string[]) {
  return required.every((entry) => values.includes(entry));
}

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradePrivacyGovernanceCheck {
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

function findSurfaceDefinition(surface: MoralTradePrivacySurface) {
  return SURFACE_DEFINITIONS.find((definition) => definition.key === surface);
}

function policyBlockers(
  policy: MoralTradePrivacyGrantPolicyRecord,
  checkedAt: string,
) {
  const blockers: string[] = [];

  if (policy.policySnapshotStatus === "missing") {
    blockers.push(`policy_missing:${policy.surface}`);
  }

  if (policy.policySnapshotStatus === "mutable") {
    blockers.push(`policy_mutable:${policy.policyId}`);
  }

  if (
    policy.policySnapshotStatus === "stale" ||
    daysBetween(policy.reviewedAt, checkedAt) > MAX_POLICY_AGE_DAYS
  ) {
    blockers.push(`policy_stale:${policy.policyId}`);
  }

  if (policy.policySnapshotStatus === "superseded" || policy.supersededBy) {
    blockers.push(`policy_superseded:${policy.policyId}`);
  }

  if (!HASH_PATTERN.test(policy.policyHash)) {
    blockers.push(`invalid_policy_hash:${policy.policyId}`);
  }

  return blockers;
}

function grantBlockers(
  policy: MoralTradePrivacyGrantPolicyRecord,
  grant: MoralTradePrivacyGrantRecord,
  requestedFieldKey: string,
  requestedAudienceStage: MoralTradePrivacyAudienceStage,
  checkedAt: string,
) {
  const blockers: string[] = [];

  if (grant.status !== "granted") {
    blockers.push(
      grant.status === "revoked"
        ? `grant_revoked:${grant.grantId}`
        : grant.status === "expired"
          ? `grant_expired:${grant.grantId}`
          : grant.status === "superseded"
            ? `grant_superseded:${grant.grantId}`
            : `grant_not_granted:${grant.grantId}`,
    );
  }

  if (grant.supersededBy) {
    blockers.push(`grant_superseded:${grant.grantId}`);
  }

  if (isExpired(grant.expiresAt, checkedAt)) {
    blockers.push(`grant_expired:${grant.grantId}`);
  }

  if (grant.fieldKey !== requestedFieldKey) {
    blockers.push(`grant_scope_mismatch:${grant.grantId}`);
  }

  if (grant.audienceStage !== requestedAudienceStage) {
    blockers.push(`grant_scope_mismatch:${grant.grantId}`);
  }

  if (policy.purposeLimitRequired && !grant.purposeCode) {
    blockers.push(`grant_purpose_missing:${grant.grantId}`);
  }

  if (policy.revocableGrantRequired && !grant.revocable) {
    blockers.push(`grant_not_granted:${grant.grantId}`);
  }

  if (policy.expiryRequired && !grant.expiresAt) {
    blockers.push(`grant_expiry_missing:${grant.grantId}`);
  }

  if (!HASH_PATTERN.test(grant.ownerProfileHash)) {
    blockers.push(`grant_hash_invalid:${grant.grantId}`);
  }

  if (grant.counterpartyProfileHash && !HASH_PATTERN.test(grant.counterpartyProfileHash)) {
    blockers.push(`grant_hash_invalid:${grant.grantId}`);
  }

  if (!HASH_PATTERN.test(grant.grantHash)) {
    blockers.push(`grant_hash_invalid:${grant.grantId}`);
  }

  return blockers;
}

function accessLogBlockers(
  policy: MoralTradePrivacyGrantPolicyRecord,
  grant: MoralTradePrivacyGrantRecord,
  log: MoralTradePrivacyAccessLogRecord,
  checkedAt: string,
) {
  const blockers: string[] = [];

  if (isExpired(log.expiresAt, checkedAt)) {
    blockers.push(`access_log_stale:${log.logId}`);
  }

  if (log.supersededBy) {
    blockers.push(`access_log_superseded:${log.logId}`);
  }

  if (policy.purposeLimitRequired && (!log.purposeLimited || !log.purposeCode)) {
    blockers.push(`purpose_limit_missing:${log.logId}`);
  }

  if (policy.roleLimitRequired && (!log.roleLimited || !log.actorRole)) {
    blockers.push(`role_limit_missing:${log.logId}`);
  }

  if (log.rawPrivateArtifactReturned) {
    blockers.push(`raw_private_artifact_returned:${log.logId}`);
  }

  if (log.privateDataReturned && log.accessDecision !== "allowed") {
    blockers.push(`private_data_returned_without_allowed_decision:${log.logId}`);
  }

  if (log.counterpartyDisclosure && grant.status !== "granted") {
    blockers.push(`counterparty_disclosure_without_grant:${log.logId}`);
  }

  if (
    policy.publicRedactionPolicyRequired &&
    log.publicDisclosure &&
    log.accessDecision === "allowed"
  ) {
    blockers.push(`public_disclosure_without_redaction_policy:${log.logId}`);
  }

  if (policy.redactionRequired && log.publicDisclosure && !log.redactionApplied) {
    blockers.push(`redaction_missing:${log.logId}`);
  }

  if (!HASH_PATTERN.test(log.accessHash)) {
    blockers.push(`invalid_access_hash:${log.logId}`);
  }

  return blockers;
}

function statusBlocker(
  status: MoralTradePrivacyReviewStatus,
  blocker: MoralTradePrivacyFailClosedStatus,
  reviewId: string,
) {
  if (status === "passed" || status === "not_required_for_stage") {
    return [];
  }

  return [`${blocker}:${reviewId}`];
}

function reviewBlockers(
  policy: MoralTradePrivacyGrantPolicyRecord,
  review: MoralTradePrivacyDisclosureReviewRecord,
  checkedAt: string,
) {
  const blockers: string[] = [];

  if (review.reviewStatus === "failed") {
    blockers.push(`review_failed:${review.reviewId}`);
  }

  if (
    review.reviewStatus === "missing" ||
    review.reviewStatus === "under_review" ||
    review.reviewStatus === "stale" ||
    isExpired(review.expiresAt, checkedAt)
  ) {
    blockers.push(`review_stale:${review.reviewId}`);
  }

  if (review.reviewStatus === "superseded" || review.supersededBy) {
    blockers.push(`review_stale:${review.reviewId}`);
  }

  if (policy.confidentialityReviewRequired) {
    blockers.push(
      ...statusBlocker(
        review.confidentialityReviewStatus,
        "confidentiality_review_missing",
        review.reviewId,
      ),
    );
  }

  if (policy.dataSecurityReviewRequired) {
    blockers.push(
      ...statusBlocker(
        review.dataSecurityStatus,
        "data_security_unresolved",
        review.reviewId,
      ),
    );
  }

  if (policy.reviewerQualityRequired) {
    blockers.push(
      ...statusBlocker(
        review.reviewerQualityStatus,
        "reviewer_quality_missing",
        review.reviewId,
      ),
    );
  }

  if (policy.accountSecurityRequired) {
    blockers.push(
      ...statusBlocker(
        review.accountSecurityStatus,
        "account_security_missing",
        review.reviewId,
      ),
    );
  }

  if (policy.participantConfirmationRequired) {
    blockers.push(
      ...statusBlocker(
        review.participantConfirmationStatus,
        "participant_confirmation_missing",
        review.reviewId,
      ),
    );
  }

  if (policy.externalAuthorityRequired) {
    blockers.push(
      ...statusBlocker(
        review.externalAuthorityStatus,
        "external_authority_missing",
        review.reviewId,
      ),
    );
  }

  if (!HASH_PATTERN.test(review.reviewHash)) {
    blockers.push(`invalid_review_hash:${review.reviewId}`);
  }

  return blockers;
}

export function evaluateMoralTradePrivacyGovernance(
  input: MoralTradePrivacyEvaluationInput,
): MoralTradePrivacyEvaluation {
  const checkedAt = input.checkedAt ?? new Date().toISOString();
  const surfacePolicies = input.policies.filter(
    (policy) => policy.surface === input.surface,
  );
  const activePolicy =
    surfacePolicies.find(
      (policy) => policy.policySnapshotStatus === "resolved_immutable",
    ) ?? surfacePolicies[0];
  const scopedGrants = input.grants.filter(
    (grant) =>
      grant.fieldKey === input.requestedFieldKey &&
      grant.audienceStage === input.requestedAudienceStage,
  );
  const activeGrant =
    scopedGrants.find((grant) => grant.status === "granted") ?? scopedGrants[0];
  const definition = findSurfaceDefinition(input.surface);
  const blockers: string[] = [];

  if (!activePolicy) {
    blockers.push(`policy_missing:${input.surface}`);
  } else {
    blockers.push(...policyBlockers(activePolicy, checkedAt));
  }

  if (!activeGrant) {
    blockers.push(`grant_missing:${input.surface}:${input.requestedFieldKey}`);
  }

  if (activePolicy && activeGrant) {
    blockers.push(
      ...grantBlockers(
        activePolicy,
        activeGrant,
        input.requestedFieldKey,
        input.requestedAudienceStage,
        checkedAt,
      ),
    );

    const grantLogs = input.accessLogs.filter(
      (log) =>
        log.grantId === activeGrant.grantId &&
        log.surface === input.surface &&
        log.fieldKey === input.requestedFieldKey,
    );
    const grantReviews = input.reviews.filter(
      (review) =>
        review.grantId === activeGrant.grantId &&
        review.surface === input.surface,
    );

    if (activePolicy.accessLogRequired && !grantLogs.length) {
      blockers.push(`access_log_missing:${activeGrant.grantId}`);
    }

    for (const log of grantLogs) {
      blockers.push(...accessLogBlockers(activePolicy, activeGrant, log, checkedAt));
    }

    if (!grantReviews.length) {
      blockers.push(`review_missing:${activeGrant.grantId}`);
    }

    for (const review of grantReviews) {
      blockers.push(...reviewBlockers(activePolicy, review, checkedAt));
    }
  }

  return {
    status: blockers.length ? "blocked" : "pass",
    surface: input.surface,
    checkedAt,
    policyCount: surfacePolicies.length,
    grantCount: scopedGrants.length,
    accessLogCount: input.accessLogs.length,
    reviewCount: input.reviews.length,
    blockers,
    userFacingBlockerCategories: blockers.length
      ? [
          "Private disclosure needs a current grant, review, and access log before this data can be shown.",
          definition?.protectedData ?? "Private fields remain purpose-limited and role-limited.",
        ]
      : [],
  };
}

function samplePolicy(
  surface: MoralTradePrivacySurface,
  overrides: Partial<MoralTradePrivacyGrantPolicyRecord> = {},
): MoralTradePrivacyGrantPolicyRecord {
  return {
    policyId: `privacy-policy-${surface}`,
    policyVersion: MORAL_TRADE_PRIVACY_GOVERNANCE_CONTRACT_VERSION,
    surface,
    policySnapshotStatus: "resolved_immutable",
    grantRequired: true,
    accessLogRequired: true,
    roleLimitRequired: true,
    purposeLimitRequired: true,
    revocableGrantRequired: true,
    expiryRequired: true,
    dataSecurityReviewRequired: true,
    confidentialityReviewRequired: true,
    reviewerQualityRequired: true,
    accountSecurityRequired: true,
    participantConfirmationRequired: true,
    externalAuthorityRequired: false,
    redactionRequired: surface === "public_redacted_publication",
    publicRedactionPolicyRequired: surface === "public_redacted_publication",
    maxAccessLogAgeDays: 30,
    policyHash:
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    reviewedAt: "2026-06-01T00:00:00.000Z",
    supersededBy: null,
    ...overrides,
  };
}

function sampleGrant(
  overrides: Partial<MoralTradePrivacyGrantRecord> = {},
): MoralTradePrivacyGrantRecord {
  return {
    grantId: "privacy-grant-contact",
    fieldKey: "contact_email",
    accessLevel: "contact",
    audienceStage: "introduced",
    status: "granted",
    purposeCode: "contact_introduction",
    ownerProfileHash:
      "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    counterpartyProfileHash:
      "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    revocable: true,
    grantHash:
      "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    expiresAt: "2026-07-01T00:00:00.000Z",
    supersededBy: null,
    ...overrides,
  };
}

function sampleAccessLog(
  grant: MoralTradePrivacyGrantRecord,
  surface: MoralTradePrivacySurface,
  overrides: Partial<MoralTradePrivacyAccessLogRecord> = {},
): MoralTradePrivacyAccessLogRecord {
  return {
    logId: `privacy-access-${surface}`,
    grantId: grant.grantId,
    surface,
    privacyPolicyRef: `privacy-policy-${surface}`,
    actorRole: "reviewer",
    purposeCode: grant.purposeCode,
    fieldKey: grant.fieldKey,
    accessDecision: "allowed",
    privateDataReturned: true,
    rawPrivateArtifactReturned: false,
    redactionApplied: surface === "public_redacted_publication",
    roleLimited: true,
    purposeLimited: true,
    counterpartyDisclosure: surface === "contact_introduction",
    publicDisclosure: surface === "public_redacted_publication",
    accessHash:
      "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    occurredAt: "2026-06-01T00:00:00.000Z",
    expiresAt: "2026-07-01T00:00:00.000Z",
    supersededBy: null,
    ...overrides,
  };
}

function sampleReview(
  grant: MoralTradePrivacyGrantRecord,
  surface: MoralTradePrivacySurface,
  overrides: Partial<MoralTradePrivacyDisclosureReviewRecord> = {},
): MoralTradePrivacyDisclosureReviewRecord {
  return {
    reviewId: `privacy-review-${surface}`,
    grantId: grant.grantId,
    surface,
    privacyPolicyRef: `privacy-policy-${surface}`,
    reviewStatus: "passed",
    confidentialityReviewStatus: "passed",
    dataSecurityStatus: "passed",
    reviewerQualityStatus: "passed",
    accountSecurityStatus: "passed",
    participantConfirmationStatus: "passed",
    externalAuthorityStatus: "not_required_for_stage",
    reviewHash:
      "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    reviewedAt: "2026-06-01T00:00:00.000Z",
    expiresAt: "2026-07-01T00:00:00.000Z",
    supersededBy: null,
    ...overrides,
  };
}

export function getMoralTradePrivacyGovernanceContract(): MoralTradePrivacyGovernanceContract {
  const contactPolicy = samplePolicy("contact_introduction");
  const contactGrant = sampleGrant();
  const contactEvaluation = evaluateMoralTradePrivacyGovernance({
    surface: "contact_introduction",
    requestedFieldKey: "contact_email",
    requestedAudienceStage: "introduced",
    checkedAt: "2026-06-02T00:00:00.000Z",
    policies: [contactPolicy],
    grants: [contactGrant],
    accessLogs: [sampleAccessLog(contactGrant, "contact_introduction")],
    reviews: [sampleReview(contactGrant, "contact_introduction")],
  });
  const publicPolicy = samplePolicy("public_redacted_publication");
  const publicGrant = sampleGrant({
    grantId: "privacy-grant-public-summary",
    fieldKey: "private_evidence_summary",
    accessLevel: "specific",
    audienceStage: "public_redacted",
    status: "granted",
    purposeCode: "",
    expiresAt: null,
  });
  const publicEvaluation = evaluateMoralTradePrivacyGovernance({
    surface: "public_redacted_publication",
    requestedFieldKey: "private_evidence_summary",
    requestedAudienceStage: "public_redacted",
    checkedAt: "2026-06-02T00:00:00.000Z",
    policies: [publicPolicy],
    grants: [publicGrant],
    accessLogs: [
      sampleAccessLog(publicGrant, "public_redacted_publication", {
        logId: "privacy-access-public-unsafe",
        purposeCode: "",
        roleLimited: false,
        purposeLimited: false,
        rawPrivateArtifactReturned: true,
        redactionApplied: false,
        publicDisclosure: true,
      }),
    ],
    reviews: [
      sampleReview(publicGrant, "public_redacted_publication", {
        reviewId: "privacy-review-public-unsafe",
        confidentialityReviewStatus: "under_review",
        dataSecurityStatus: "failed",
        reviewerQualityStatus: "missing",
      }),
    ],
  });

  return {
    version: MORAL_TRADE_PRIVACY_GOVERNANCE_CONTRACT_VERSION,
    purpose:
      "Public fail-closed contract for privacy grants, private-data access logs, and disclosure reviews before reviewer, counterparty, contact, evidence, export, or redacted-public access to private Moral Trade data.",
    privacyRule:
      "Private facts, exact wishes, contact details, source notes, private evidence, credentials, and sensitive constraints can move only through explicit revocable privacy grants, frozen privacy-disclosure policy, purpose-limited access, role-limited access, and privacy_access_log records. Public contract surfaces publish table names, statuses, and sample outcomes only; they do not expose raw private artifacts, exact wishes, contact details, private evidence, source notes, access paths, reviewer notes, or participant-specific access records.",
    failClosedRule:
      "No private disclosure without a reconstructible ledger: missing frozen privacy policy, missing or revoked privacy grant, missing access log, stale log, missing purpose or role limit, raw private artifact return, missing confidentiality/privacy-rights review, missing data-security review, missing reviewer-quality/account-security/participant-confirmation checks, or invalid hashes block reviewer access, counterparty previews, contact introductions, evidence review, profile export, and public redacted publication.",
    firstClassRecordTables: [...FIRST_CLASS_RECORD_TABLES],
    existingRecordTables: [...EXISTING_RECORD_TABLES],
    policySnapshotSubjects: [...POLICY_SNAPSHOT_SUBJECTS],
    surfaces: [...SURFACES],
    audienceStages: [...AUDIENCE_STAGES],
    accessLevels: [...ACCESS_LEVELS],
    failClosedStatuses: [...FAIL_CLOSED_STATUSES],
    surfaceDefinitions: [...SURFACE_DEFINITIONS],
    sampleEvaluations: [contactEvaluation, publicEvaluation],
    contractTests: [...CONTRACT_TESTS],
  };
}

export function validateMoralTradePrivacyGovernanceContract(
  contract: MoralTradePrivacyGovernanceContract = getMoralTradePrivacyGovernanceContract(),
): MoralTradePrivacyGovernanceValidation {
  const surfaceKeys = contract.surfaceDefinitions.map((definition) => definition.key);
  const sampleStatuses = contract.sampleEvaluations.map((evaluation) => evaluation.status);
  const checks = [
    check(
      "first-class-records",
      "Privacy policies, access logs, and disclosure reviews are first-class records",
      hasAll(contract.firstClassRecordTables, FIRST_CLASS_RECORD_TABLES) &&
        hasAll(contract.existingRecordTables, EXISTING_RECORD_TABLES),
      [...contract.existingRecordTables, ...contract.firstClassRecordTables].join(", "),
    ),
    check(
      "policy-subjects",
      "Policy snapshots cover privacy disclosure",
      hasAll(contract.policySnapshotSubjects, POLICY_SNAPSHOT_SUBJECTS),
      contract.policySnapshotSubjects.join(", "),
    ),
    check(
      "surface-coverage",
      "All private-disclosure surfaces are covered",
      hasAll(contract.surfaces, SURFACES) &&
        hasAll(surfaceKeys, SURFACES) &&
        contract.surfaceDefinitions.every(
          (definition) =>
            definition.requiredControls.includes("explicit_revocable_privacy_grant") &&
            definition.requiredControls.includes("privacy_access_log") &&
            definition.requiredControls.includes("data_security_review"),
        ),
      surfaceKeys.join(", "),
    ),
    check(
      "grant-boundary",
      "Audience stages and access levels preserve staged disclosure",
      hasAll(contract.audienceStages, AUDIENCE_STAGES) &&
        hasAll(contract.accessLevels, ACCESS_LEVELS),
      `${contract.audienceStages.join(", ")} / ${contract.accessLevels.join(", ")}`,
    ),
    check(
      "fail-closed-statuses",
      "Fail-closed statuses cover grant, access-log, review, redaction, and hash blockers",
      hasAll(contract.failClosedStatuses, FAIL_CLOSED_STATUSES),
      contract.failClosedStatuses.join(", "),
    ),
    check(
      "sample-evaluations",
      "Sample evaluations prove pass and blocked disclosure states",
      sampleStatuses.includes("pass") &&
        sampleStatuses.includes("blocked") &&
        contract.sampleEvaluations.some((evaluation) =>
          evaluation.blockers.some((blocker) =>
            blocker.startsWith("raw_private_artifact_returned"),
          ),
        ),
      contract.sampleEvaluations
        .map((evaluation) => `${evaluation.surface}:${evaluation.status}`)
        .join(", "),
    ),
    check(
      "privacy-rule",
      "Privacy rule excludes raw private artifacts and participant-specific access records",
      /raw private artifacts/i.test(contract.privacyRule) &&
        /participant-specific access records/i.test(contract.privacyRule) &&
        /privacy_access_log/i.test(contract.privacyRule),
      contract.privacyRule,
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
    validatorName: "moral-trade-privacy-governance-contract",
    validatorVersion: MORAL_TRADE_PRIVACY_GOVERNANCE_VALIDATOR_VERSION,
    contractVersion: contract.version,
    checks,
    blockers,
  };
}

const moralTradePrivacyGovernance = {
  evaluateMoralTradePrivacyGovernance,
  getMoralTradePrivacyGovernanceContract,
  validateMoralTradePrivacyGovernanceContract,
};

export default moralTradePrivacyGovernance;
