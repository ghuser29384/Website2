export const MORAL_TRADE_USER_SAFETY_CONTENT_MODERATION_CONTRACT_VERSION =
  "moral-trade-user-safety-content-moderation-v0.1-2026-06";
export const MORAL_TRADE_USER_SAFETY_CONTENT_MODERATION_VALIDATOR_VERSION =
  "moral-trade-user-safety-content-moderation-validator-v0.1";

export type MoralTradeUserSafetyModerationTransition =
  | "draft_preview"
  | "public_publication"
  | "reviewer_actionable"
  | "contact_introduction"
  | "invite_link_creation"
  | "reliance_bearing_preview"
  | "payment_capture"
  | "public_profile_amplification"
  | "release_gate_promotion";

export type MoralTradeModeratedContentType =
  | "offer_text"
  | "template_text"
  | "profile_copy"
  | "public_description"
  | "evidence_filename_preview"
  | "reviewer_visible_note"
  | "invite_link_text"
  | "impact_claim_copy"
  | "contact_message"
  | "support_message"
  | "discussion_reply"
  | "abuse_report"
  | "appeal_text";

export type MoralTradeContentModerationDimension =
  | "illegal_activity"
  | "coercion_threat"
  | "deception_fraud_impersonation"
  | "hate_harassment"
  | "doxxing_privacy_violation"
  | "self_harm_exploitation"
  | "malware_cyber_abuse"
  | "sexual_exploitation"
  | "extremist_or_terror_finance"
  | "spam_platform_abuse"
  | "viewpoint_neutrality";

export type MoralTradeUserSafetyDimension =
  | "contact_consent"
  | "invite_link_rate_limit"
  | "decline_block_withdrawal_respected"
  | "repeated_solicitation"
  | "off_platform_pressure"
  | "doxxing_harassment"
  | "retaliatory_visibility_change"
  | "abuse_report_resolution"
  | "support_escalation"
  | "minor_or_vulnerable_contact";

export type MoralTradeModerationStatus =
  | "approved"
  | "not_required_for_stage"
  | "missing"
  | "under_review"
  | "blocked"
  | "stale"
  | "superseded";

export type MoralTradeUserSafetyStatus =
  | "non_blocking"
  | "not_required_for_stage"
  | "missing"
  | "under_review"
  | "blocked"
  | "serious_unresolved"
  | "stale"
  | "superseded";

export type MoralTradeSafetyPolicySnapshotStatus =
  | "resolved_immutable"
  | "missing"
  | "mutable"
  | "stale"
  | "superseded";

export type MoralTradeViewpointNeutralityStatus =
  | "confirmed_neutral"
  | "not_required_for_stage"
  | "missing"
  | "viewpoint_ranked"
  | "unpopular_view_blocked"
  | "stale";

export type MoralTradeContactConsentStatus =
  | "consented"
  | "not_required_for_stage"
  | "missing"
  | "declined"
  | "blocked"
  | "withdrawn"
  | "stale";

export type MoralTradeContactRateLimitStatus =
  | "within_limit"
  | "not_required_for_stage"
  | "missing"
  | "exceeded"
  | "stale";

export type MoralTradeBlockDeclineStatus =
  | "respected"
  | "not_required_for_stage"
  | "missing"
  | "violated"
  | "stale";

export type MoralTradeAbuseReportSeverity =
  | "none"
  | "low"
  | "medium"
  | "serious"
  | "critical";

export type MoralTradeAbuseReportResolutionStatus =
  | "none"
  | "resolved_non_blocking"
  | "not_required_for_stage"
  | "missing"
  | "open"
  | "under_review"
  | "serious_unresolved"
  | "retaliation_risk"
  | "stale";

export type MoralTradeRetaliationPreventionStatus =
  | "non_blocking"
  | "not_required_for_stage"
  | "missing"
  | "retaliation_risk"
  | "stale";

export interface MoralTradeContentModerationRecord {
  moderationId: string;
  subjectType: string;
  subjectRef: string;
  contentType: MoralTradeModeratedContentType;
  status: MoralTradeModerationStatus;
  policySnapshotStatus: MoralTradeSafetyPolicySnapshotStatus;
  contentHash: string;
  moderationReasonCode: MoralTradeContentModerationDimension | "none" | "unpopular_moral_view";
  prohibitedUseCategories: MoralTradeContentModerationDimension[];
  viewpointNeutralityStatus: MoralTradeViewpointNeutralityStatus;
  viewpointRankedBool: boolean;
  reviewerQualityStatus: "authorized" | "not_required_for_stage" | "missing" | "failed" | "stale";
  userFacingReasonCategory: string;
  reviewedAt: string;
  expiresAt: string | null;
  supersededBy: string | null;
}

export interface MoralTradeUserSafetyRecord {
  safetyRecordId: string;
  interactionType:
    | "contact_attempt"
    | "invite_link"
    | "profile_message"
    | "support_message"
    | "discussion_surface"
    | "abuse_report";
  subjectRef: string;
  status: MoralTradeUserSafetyStatus;
  policySnapshotStatus: MoralTradeSafetyPolicySnapshotStatus;
  safetyDimensions: MoralTradeUserSafetyDimension[];
  contactConsentStatus: MoralTradeContactConsentStatus;
  rateLimitStatus: MoralTradeContactRateLimitStatus;
  blockDeclineWithdrawalStatus: MoralTradeBlockDeclineStatus;
  abuseReportSeverity: MoralTradeAbuseReportSeverity;
  abuseReportResolutionStatus: MoralTradeAbuseReportResolutionStatus;
  retaliationPreventionStatus: MoralTradeRetaliationPreventionStatus;
  contactRecordHash: string;
  userFacingReasonCategory: string;
  reviewedAt: string;
  expiresAt: string | null;
  supersededBy: string | null;
}

export interface MoralTradeUserSafetyContentModerationTransitionDefinition {
  key: MoralTradeUserSafetyModerationTransition;
  label: string;
  requiredContentTypes: MoralTradeModeratedContentType[];
  requiredUserSafetyDimensions: MoralTradeUserSafetyDimension[];
  userFacingBlockerCategory: string;
}

export interface MoralTradeUserSafetyContentModerationEvaluationInput {
  transition: MoralTradeUserSafetyModerationTransition;
  checkedAt?: string;
  moderationRecords: MoralTradeContentModerationRecord[];
  userSafetyRecords: MoralTradeUserSafetyRecord[];
}

export interface MoralTradeUserSafetyContentModerationEvaluation {
  status: "pass" | "blocked";
  transition: MoralTradeUserSafetyModerationTransition;
  checkedAt: string;
  requiredContentTypeCount: number;
  requiredUserSafetyDimensionCount: number;
  passingModerationCount: number;
  passingUserSafetyCount: number;
  blockers: string[];
  userFacingBlockerCategories: string[];
}

export interface MoralTradeUserSafetyContentModerationCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradeUserSafetyContentModerationValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-user-safety-content-moderation-contract";
  validatorVersion: string;
  contractVersion: string;
  checks: MoralTradeUserSafetyContentModerationCheck[];
  blockers: string[];
}

export interface MoralTradeUserSafetyContentModerationContract {
  version: string;
  purpose: string;
  failClosedRule: string;
  privacyBoundary: string;
  firstClassRecordTables: string[];
  policySnapshotSubjects: string[];
  transitionDefinitions: MoralTradeUserSafetyContentModerationTransitionDefinition[];
  contentTypes: MoralTradeModeratedContentType[];
  moderationDimensions: MoralTradeContentModerationDimension[];
  userSafetyDimensions: MoralTradeUserSafetyDimension[];
  moderationFailClosedStatuses: MoralTradeModerationStatus[];
  userSafetyFailClosedStatuses: MoralTradeUserSafetyStatus[];
  contractNonClaims: string[];
  sampleEvaluations: MoralTradeUserSafetyContentModerationEvaluation[];
  contractTests: string[];
}

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
const MAX_REVIEW_AGE_DAYS = 90;

const FIRST_CLASS_RECORD_TABLES = [
  "moral_trade_user_safety_policies",
  "moral_trade_contact_interaction_records",
  "moral_trade_abuse_report_records",
  "moral_trade_content_moderation_policies",
  "moral_trade_content_moderation_records",
] as const;

const POLICY_SNAPSHOT_SUBJECTS = [
  "user_safety",
  "contact_interaction",
  "abuse_report",
  "content_moderation",
  "prohibited_use",
] as const;

const CONTENT_TYPES: MoralTradeModeratedContentType[] = [
  "offer_text",
  "template_text",
  "profile_copy",
  "public_description",
  "evidence_filename_preview",
  "reviewer_visible_note",
  "invite_link_text",
  "impact_claim_copy",
  "contact_message",
  "support_message",
  "discussion_reply",
  "abuse_report",
  "appeal_text",
];

const MODERATION_DIMENSIONS: MoralTradeContentModerationDimension[] = [
  "illegal_activity",
  "coercion_threat",
  "deception_fraud_impersonation",
  "hate_harassment",
  "doxxing_privacy_violation",
  "self_harm_exploitation",
  "malware_cyber_abuse",
  "sexual_exploitation",
  "extremist_or_terror_finance",
  "spam_platform_abuse",
  "viewpoint_neutrality",
];

const USER_SAFETY_DIMENSIONS: MoralTradeUserSafetyDimension[] = [
  "contact_consent",
  "invite_link_rate_limit",
  "decline_block_withdrawal_respected",
  "repeated_solicitation",
  "off_platform_pressure",
  "doxxing_harassment",
  "retaliatory_visibility_change",
  "abuse_report_resolution",
  "support_escalation",
  "minor_or_vulnerable_contact",
];

const MODERATION_PASS_STATUSES: MoralTradeModerationStatus[] = [
  "approved",
  "not_required_for_stage",
];

const USER_SAFETY_PASS_STATUSES: MoralTradeUserSafetyStatus[] = [
  "non_blocking",
  "not_required_for_stage",
];

const MODERATION_FAIL_CLOSED_STATUSES: MoralTradeModerationStatus[] = [
  "missing",
  "under_review",
  "blocked",
  "stale",
  "superseded",
];

const USER_SAFETY_FAIL_CLOSED_STATUSES: MoralTradeUserSafetyStatus[] = [
  "missing",
  "under_review",
  "blocked",
  "serious_unresolved",
  "stale",
  "superseded",
];

const PUBLICATION_CONTENT_TYPES: MoralTradeModeratedContentType[] = [
  "offer_text",
  "template_text",
  "profile_copy",
  "public_description",
  "evidence_filename_preview",
  "impact_claim_copy",
];

const REVIEWER_CONTENT_TYPES: MoralTradeModeratedContentType[] = [
  "offer_text",
  "evidence_filename_preview",
  "reviewer_visible_note",
  "impact_claim_copy",
];

const TRANSITION_DEFINITIONS: MoralTradeUserSafetyContentModerationTransitionDefinition[] = [
  {
    key: "draft_preview",
    label: "Draft preview",
    requiredContentTypes: [],
    requiredUserSafetyDimensions: [],
    userFacingBlockerCategory: "Draft-only preview can proceed without public safety clearance",
  },
  {
    key: "public_publication",
    label: "Public publication",
    requiredContentTypes: PUBLICATION_CONTENT_TYPES,
    requiredUserSafetyDimensions: [],
    userFacingBlockerCategory: "Public content needs moderation approval",
  },
  {
    key: "reviewer_actionable",
    label: "Reviewer-actionable evidence",
    requiredContentTypes: REVIEWER_CONTENT_TYPES,
    requiredUserSafetyDimensions: [],
    userFacingBlockerCategory: "Reviewer-visible content needs prohibited-use clearance",
  },
  {
    key: "contact_introduction",
    label: "Contact introduction",
    requiredContentTypes: ["contact_message", "profile_copy", "invite_link_text"],
    requiredUserSafetyDimensions: USER_SAFETY_DIMENSIONS,
    userFacingBlockerCategory: "Contact requires consent, rate limits, and abuse-report clearance",
  },
  {
    key: "invite_link_creation",
    label: "Invite-link creation",
    requiredContentTypes: ["invite_link_text", "profile_copy"],
    requiredUserSafetyDimensions: [
      "contact_consent",
      "invite_link_rate_limit",
      "decline_block_withdrawal_respected",
      "abuse_report_resolution",
      "minor_or_vulnerable_contact",
    ],
    userFacingBlockerCategory: "Invite links require safety and moderation checks",
  },
  {
    key: "reliance_bearing_preview",
    label: "Reliance-bearing preview",
    requiredContentTypes: PUBLICATION_CONTENT_TYPES,
    requiredUserSafetyDimensions: [
      "contact_consent",
      "decline_block_withdrawal_respected",
      "repeated_solicitation",
      "off_platform_pressure",
      "doxxing_harassment",
      "abuse_report_resolution",
      "minor_or_vulnerable_contact",
    ],
    userFacingBlockerCategory: "Reliance-bearing preview needs safety blockers resolved",
  },
  {
    key: "payment_capture",
    label: "Payment capture",
    requiredContentTypes: [
      "offer_text",
      "public_description",
      "evidence_filename_preview",
      "impact_claim_copy",
    ],
    requiredUserSafetyDimensions: [],
    userFacingBlockerCategory: "Payable content needs prohibited-use clearance",
  },
  {
    key: "public_profile_amplification",
    label: "Public-profile amplification",
    requiredContentTypes: ["profile_copy", "public_description"],
    requiredUserSafetyDimensions: [
      "contact_consent",
      "decline_block_withdrawal_respected",
      "retaliatory_visibility_change",
      "abuse_report_resolution",
    ],
    userFacingBlockerCategory: "Profile amplification needs retaliation and abuse-report clearance",
  },
  {
    key: "release_gate_promotion",
    label: "Release-gate promotion",
    requiredContentTypes: CONTENT_TYPES,
    requiredUserSafetyDimensions: USER_SAFETY_DIMENSIONS,
    userFacingBlockerCategory: "Release promotion requires full safety and moderation governance",
  },
];

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeUserSafetyContentModerationCheck {
  return { id, label, status: passed ? "pass" : "fail", evidence };
}

function findTransition(
  transition: MoralTradeUserSafetyModerationTransition,
) {
  return TRANSITION_DEFINITIONS.find((entry) => entry.key === transition);
}

function isStaleReview(
  reviewedAt: string,
  expiresAt: string | null,
  checkedAt: string,
) {
  const reviewedAtMs = Date.parse(reviewedAt);
  const checkedAtMs = Date.parse(checkedAt);
  if (!Number.isFinite(reviewedAtMs) || !Number.isFinite(checkedAtMs)) {
    return true;
  }
  if (expiresAt && Date.parse(expiresAt) <= checkedAtMs) {
    return true;
  }
  const ageMs = checkedAtMs - reviewedAtMs;
  return ageMs > MAX_REVIEW_AGE_DAYS * 24 * 60 * 60 * 1000;
}

function latestModerationRecord(
  records: MoralTradeContentModerationRecord[],
  contentType: MoralTradeModeratedContentType,
) {
  return records.find((record) => record.contentType === contentType);
}

function latestUserSafetyRecord(
  records: MoralTradeUserSafetyRecord[],
  dimension: MoralTradeUserSafetyDimension,
) {
  return records.find((record) => record.safetyDimensions.includes(dimension));
}

function moderationRecordPasses(
  record: MoralTradeContentModerationRecord,
  checkedAt: string,
) {
  const blockers: string[] = [];

  if (!MODERATION_PASS_STATUSES.includes(record.status)) {
    blockers.push(
      `content_moderation_not_approved:${record.contentType}:${record.status}`,
    );
  }
  if (record.policySnapshotStatus !== "resolved_immutable") {
    blockers.push(
      `content_moderation_policy_not_immutable:${record.contentType}:${record.policySnapshotStatus}`,
    );
  }
  if (!HASH_PATTERN.test(record.contentHash)) {
    blockers.push(
      `content_moderation_hash_invalid:${record.contentType}:${record.moderationId}`,
    );
  }
  if (isStaleReview(record.reviewedAt, record.expiresAt, checkedAt)) {
    blockers.push(
      `content_moderation_review_stale:${record.contentType}:${record.moderationId}`,
    );
  }
  if (record.reviewerQualityStatus !== "authorized" &&
    record.reviewerQualityStatus !== "not_required_for_stage") {
    blockers.push(
      `content_moderation_reviewer_quality_not_authorized:${record.contentType}:${record.reviewerQualityStatus}`,
    );
  }
  if (record.supersededBy) {
    blockers.push(
      `content_moderation_record_superseded:${record.contentType}:${record.moderationId}`,
    );
  }
  if (
    record.viewpointNeutralityStatus !== "confirmed_neutral" &&
    record.viewpointNeutralityStatus !== "not_required_for_stage"
  ) {
    blockers.push(
      `content_moderation_viewpoint_not_neutral:${record.contentType}:${record.viewpointNeutralityStatus}`,
    );
  }
  if (record.moderationReasonCode === "unpopular_moral_view") {
    blockers.push(`content_moderation_unpopular_view_blocked:${record.contentType}`);
  }
  if (record.viewpointRankedBool) {
    blockers.push(`content_moderation_viewpoint_ranked:${record.contentType}`);
  }
  const prohibitedCategories = record.prohibitedUseCategories.filter(
    (category) => category !== "viewpoint_neutrality",
  );
  if (record.status !== "approved" && prohibitedCategories.length > 0) {
    blockers.push(
      `content_moderation_prohibited_use_unresolved:${record.contentType}:${prohibitedCategories.join("+")}`,
    );
  }

  return blockers;
}

function userSafetyRecordPasses(
  record: MoralTradeUserSafetyRecord,
  dimension: MoralTradeUserSafetyDimension,
  checkedAt: string,
) {
  const blockers: string[] = [];

  if (!USER_SAFETY_PASS_STATUSES.includes(record.status)) {
    blockers.push(`user_safety_not_non_blocking:${dimension}:${record.status}`);
  }
  if (record.policySnapshotStatus !== "resolved_immutable") {
    blockers.push(
      `user_safety_policy_not_immutable:${dimension}:${record.policySnapshotStatus}`,
    );
  }
  if (!HASH_PATTERN.test(record.contactRecordHash)) {
    blockers.push(`user_safety_hash_invalid:${dimension}:${record.safetyRecordId}`);
  }
  if (isStaleReview(record.reviewedAt, record.expiresAt, checkedAt)) {
    blockers.push(`user_safety_review_stale:${dimension}:${record.safetyRecordId}`);
  }
  if (record.supersededBy) {
    blockers.push(`user_safety_record_superseded:${dimension}:${record.safetyRecordId}`);
  }
  if (
    record.contactConsentStatus !== "consented" &&
    record.contactConsentStatus !== "not_required_for_stage"
  ) {
    blockers.push(
      `user_safety_contact_consent_not_valid:${dimension}:${record.contactConsentStatus}`,
    );
  }
  if (
    record.rateLimitStatus !== "within_limit" &&
    record.rateLimitStatus !== "not_required_for_stage"
  ) {
    blockers.push(
      `user_safety_rate_limit_not_valid:${dimension}:${record.rateLimitStatus}`,
    );
  }
  if (
    record.blockDeclineWithdrawalStatus !== "respected" &&
    record.blockDeclineWithdrawalStatus !== "not_required_for_stage"
  ) {
    blockers.push(
      `user_safety_decline_block_withdrawal_not_respected:${dimension}:${record.blockDeclineWithdrawalStatus}`,
    );
  }
  if (
    (record.abuseReportSeverity === "serious" ||
      record.abuseReportSeverity === "critical") &&
    record.abuseReportResolutionStatus !== "resolved_non_blocking" &&
    record.abuseReportResolutionStatus !== "not_required_for_stage"
  ) {
    blockers.push(
      `user_safety_unresolved_serious_abuse_report:${dimension}:${record.abuseReportResolutionStatus}`,
    );
  }
  if (
    !["none", "resolved_non_blocking", "not_required_for_stage"].includes(
      record.abuseReportResolutionStatus,
    )
  ) {
    blockers.push(
      `user_safety_abuse_report_not_resolved:${dimension}:${record.abuseReportResolutionStatus}`,
    );
  }
  if (
    record.retaliationPreventionStatus !== "non_blocking" &&
    record.retaliationPreventionStatus !== "not_required_for_stage"
  ) {
    blockers.push(
      `user_safety_retaliation_prevention_not_non_blocking:${dimension}:${record.retaliationPreventionStatus}`,
    );
  }

  return blockers;
}

export function evaluateMoralTradeUserSafetyContentModeration(
  input: MoralTradeUserSafetyContentModerationEvaluationInput,
): MoralTradeUserSafetyContentModerationEvaluation {
  const checkedAt = input.checkedAt ?? new Date().toISOString();
  const definition = findTransition(input.transition);
  const blockers: string[] = [];
  const userFacingBlockerCategories = new Set<string>();
  let passingModerationCount = 0;
  let passingUserSafetyCount = 0;

  if (!definition) {
    return {
      status: "blocked",
      transition: input.transition,
      checkedAt,
      requiredContentTypeCount: 0,
      requiredUserSafetyDimensionCount: 0,
      passingModerationCount: 0,
      passingUserSafetyCount: 0,
      blockers: [`unknown_user_safety_moderation_transition:${input.transition}`],
      userFacingBlockerCategories: ["Unknown safety transition"],
    };
  }

  for (const contentType of definition.requiredContentTypes) {
    const record = latestModerationRecord(input.moderationRecords, contentType);
    if (!record) {
      blockers.push(`content_moderation_record_required:${contentType}`);
      userFacingBlockerCategories.add(definition.userFacingBlockerCategory);
      continue;
    }

    const recordBlockers = moderationRecordPasses(record, checkedAt);
    if (recordBlockers.length) {
      blockers.push(...recordBlockers);
      userFacingBlockerCategories.add(definition.userFacingBlockerCategory);
    } else {
      passingModerationCount += 1;
    }
  }

  for (const dimension of definition.requiredUserSafetyDimensions) {
    const record = latestUserSafetyRecord(input.userSafetyRecords, dimension);
    if (!record) {
      blockers.push(`user_safety_record_required:${dimension}`);
      userFacingBlockerCategories.add(definition.userFacingBlockerCategory);
      continue;
    }

    const recordBlockers = userSafetyRecordPasses(record, dimension, checkedAt);
    if (recordBlockers.length) {
      blockers.push(...recordBlockers);
      userFacingBlockerCategories.add(definition.userFacingBlockerCategory);
    } else {
      passingUserSafetyCount += 1;
    }
  }

  return {
    status: blockers.length ? "blocked" : "pass",
    transition: input.transition,
    checkedAt,
    requiredContentTypeCount: definition.requiredContentTypes.length,
    requiredUserSafetyDimensionCount:
      definition.requiredUserSafetyDimensions.length,
    passingModerationCount,
    passingUserSafetyCount,
    blockers,
    userFacingBlockerCategories: Array.from(userFacingBlockerCategories),
  };
}

function moderationRecord(
  contentType: MoralTradeModeratedContentType,
  overrides: Partial<MoralTradeContentModerationRecord> = {},
): MoralTradeContentModerationRecord {
  return {
    moderationId: `content-moderation:test:${contentType}`,
    subjectType: "pledge_swap",
    subjectRef: "pledge-swap:test",
    contentType,
    status: "approved",
    policySnapshotStatus: "resolved_immutable",
    contentHash: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    moderationReasonCode: "none",
    prohibitedUseCategories: ["viewpoint_neutrality"],
    viewpointNeutralityStatus: "confirmed_neutral",
    viewpointRankedBool: false,
    reviewerQualityStatus: "authorized",
    userFacingReasonCategory: "Content safety and prohibited-use review",
    reviewedAt: "2026-06-08T12:00:00.000Z",
    expiresAt: "2026-09-08T12:00:00.000Z",
    supersededBy: null,
    ...overrides,
  };
}

function userSafetyRecord(
  dimension: MoralTradeUserSafetyDimension,
  overrides: Partial<MoralTradeUserSafetyRecord> = {},
): MoralTradeUserSafetyRecord {
  return {
    safetyRecordId: `user-safety:test:${dimension}`,
    interactionType: "contact_attempt",
    subjectRef: "pledge-swap:test",
    status: "non_blocking",
    policySnapshotStatus: "resolved_immutable",
    safetyDimensions: [dimension],
    contactConsentStatus: "consented",
    rateLimitStatus: "within_limit",
    blockDeclineWithdrawalStatus: "respected",
    abuseReportSeverity: "none",
    abuseReportResolutionStatus: "none",
    retaliationPreventionStatus: "non_blocking",
    contactRecordHash:
      "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    userFacingReasonCategory: "Contact safety and abuse-report review",
    reviewedAt: "2026-06-08T12:00:00.000Z",
    expiresAt: "2026-09-08T12:00:00.000Z",
    supersededBy: null,
    ...overrides,
  };
}

function allModerationRecords(contentTypes: MoralTradeModeratedContentType[]) {
  return contentTypes.map((contentType) => moderationRecord(contentType));
}

function allUserSafetyRecords(dimensions: MoralTradeUserSafetyDimension[]) {
  return dimensions.map((dimension) => userSafetyRecord(dimension));
}

function buildSampleEvaluations() {
  const publicationDefinition = findTransition("public_publication");
  const contactDefinition = findTransition("contact_introduction");

  return [
    evaluateMoralTradeUserSafetyContentModeration({
      transition: "draft_preview",
      checkedAt: "2026-06-08T12:00:00.000Z",
      moderationRecords: [],
      userSafetyRecords: [],
    }),
    evaluateMoralTradeUserSafetyContentModeration({
      transition: "public_publication",
      checkedAt: "2026-06-08T12:00:00.000Z",
      moderationRecords: allModerationRecords(
        publicationDefinition?.requiredContentTypes ?? [],
      ),
      userSafetyRecords: [],
    }),
    evaluateMoralTradeUserSafetyContentModeration({
      transition: "contact_introduction",
      checkedAt: "2026-06-08T12:00:00.000Z",
      moderationRecords: [
        moderationRecord("contact_message", {
          status: "blocked",
          moderationReasonCode: "doxxing_privacy_violation",
          prohibitedUseCategories: [
            "doxxing_privacy_violation",
            "viewpoint_neutrality",
          ],
        }),
        moderationRecord("profile_copy"),
        moderationRecord("invite_link_text"),
      ],
      userSafetyRecords: [
        ...(contactDefinition?.requiredUserSafetyDimensions ?? [])
          .filter((dimension) => dimension !== "contact_consent")
          .map((dimension) => userSafetyRecord(dimension)),
        userSafetyRecord("contact_consent", {
          status: "serious_unresolved",
          contactConsentStatus: "withdrawn",
          rateLimitStatus: "exceeded",
          blockDeclineWithdrawalStatus: "violated",
          abuseReportSeverity: "serious",
          abuseReportResolutionStatus: "serious_unresolved",
          retaliationPreventionStatus: "retaliation_risk",
        }),
      ],
    }),
  ];
}

export function getMoralTradeUserSafetyContentModerationContract():
  MoralTradeUserSafetyContentModerationContract {
  return {
    version: MORAL_TRADE_USER_SAFETY_CONTENT_MODERATION_CONTRACT_VERSION,
    purpose:
      "Public validator-backed contract for first-class user-safety, contact, abuse-report, content-moderation, and prohibited-use governance before Moral Trade content becomes public, reviewer-actionable, reliance-bearing, payable, contact-enabling, profile-amplifying, or release-gate promoting.",
    failClosedRule:
      "Missing, mutable, stale, under-review, blocked, superseded, viewpoint-ranking, unpopular-view, contact-consent, rate-limit, block/decline, retaliation, or unresolved serious abuse-report states block the affected transition.",
    privacyBoundary:
      "Public contract output never exposes raw reports, reporter identities, target identities, private messages, reviewer notes, protected-trait facts, contact details, raw evidence, exact rare-view clusters, or participant-specific safety/moderation records.",
    firstClassRecordTables: [...FIRST_CLASS_RECORD_TABLES],
    policySnapshotSubjects: [...POLICY_SNAPSHOT_SUBJECTS],
    transitionDefinitions: TRANSITION_DEFINITIONS,
    contentTypes: CONTENT_TYPES,
    moderationDimensions: MODERATION_DIMENSIONS,
    userSafetyDimensions: USER_SAFETY_DIMENSIONS,
    moderationFailClosedStatuses: MODERATION_FAIL_CLOSED_STATUSES,
    userSafetyFailClosedStatuses: USER_SAFETY_FAIL_CLOSED_STATUSES,
    contractNonClaims: [
      "Content moderation is a prohibited-use and safety control, not moral ranking.",
      "The public contract cannot disclose private messages, reports, identities, reviewer notes, or rare-view clusters.",
      "Approved content moderation does not certify truth, impact, legality, or moral value.",
    ],
    sampleEvaluations: buildSampleEvaluations(),
    contractTests: [
      "user_safety_content_moderation_first_class_records",
      "draft_preview_passes_without_records",
      "public_and_reviewer_surfaces_require_viewpoint_neutral_moderation",
      "contact_introduction_requires_consent_rate_limit_block_and_report_clearance",
      "stale_mutable_superseded_and_private_record_states_fail_closed",
      "api_health_spec_migration_schema_and_types_publish_safety_moderation_contract",
    ],
  };
}

export function validateMoralTradeUserSafetyContentModerationContract(
  contract = getMoralTradeUserSafetyContentModerationContract(),
): MoralTradeUserSafetyContentModerationValidation {
  const sampleStatuses = contract.sampleEvaluations.map(
    (evaluation) => evaluation.status,
  );
  const checks = [
    check(
      "first_class_tables",
      "User safety and content moderation use first-class record tables",
      [
        "moral_trade_user_safety_policies",
        "moral_trade_contact_interaction_records",
        "moral_trade_abuse_report_records",
        "moral_trade_content_moderation_policies",
        "moral_trade_content_moderation_records",
      ].every((table) => contract.firstClassRecordTables.includes(table)),
      contract.firstClassRecordTables.join(", "),
    ),
    check(
      "policy_snapshot_subjects",
      "Safety and moderation policies are immutable snapshot subjects",
      ["user_safety", "contact_interaction", "abuse_report", "content_moderation", "prohibited_use"].every(
        (subject) => contract.policySnapshotSubjects.includes(subject),
      ),
      contract.policySnapshotSubjects.join(", "),
    ),
    check(
      "moderation_dimensions",
      "Content moderation covers prohibited-use dimensions without moral ranking",
      [
        "illegal_activity",
        "coercion_threat",
        "deception_fraud_impersonation",
        "doxxing_privacy_violation",
        "malware_cyber_abuse",
        "extremist_or_terror_finance",
        "spam_platform_abuse",
        "viewpoint_neutrality",
      ].every((dimension) =>
        contract.moderationDimensions.includes(
          dimension as MoralTradeContentModerationDimension,
        ),
      ) && contract.contractNonClaims.some((claim) => /not moral ranking/i.test(claim)),
      contract.moderationDimensions.join(", "),
    ),
    check(
      "user_safety_dimensions",
      "User safety covers consent, rate limits, blocking, reports, and retaliation",
      [
        "contact_consent",
        "invite_link_rate_limit",
        "decline_block_withdrawal_respected",
        "off_platform_pressure",
        "doxxing_harassment",
        "retaliatory_visibility_change",
        "abuse_report_resolution",
        "minor_or_vulnerable_contact",
      ].every((dimension) =>
        contract.userSafetyDimensions.includes(
          dimension as MoralTradeUserSafetyDimension,
        ),
      ),
      contract.userSafetyDimensions.join(", "),
    ),
    check(
      "high_risk_transitions",
      "Contact, reliance, payment, amplification, and release transitions are gated",
      [
        "contact_introduction",
        "invite_link_creation",
        "reliance_bearing_preview",
        "payment_capture",
        "public_profile_amplification",
        "release_gate_promotion",
      ].every((transition) =>
        contract.transitionDefinitions.some(
          (entry) =>
            entry.key === transition &&
            (entry.requiredContentTypes.length > 0 ||
              entry.requiredUserSafetyDimensions.length > 0),
        ),
      ),
      contract.transitionDefinitions
        .map(
          (entry) =>
            `${entry.key}:${entry.requiredContentTypes.length}+${entry.requiredUserSafetyDimensions.length}`,
        )
        .join(", "),
    ),
    check(
      "sample_evaluations",
      "Synthetic samples include draft pass, public pass, and contact block",
      sampleStatuses[0] === "pass" &&
        sampleStatuses[1] === "pass" &&
        sampleStatuses[2] === "blocked",
      sampleStatuses.join(", "),
    ),
    check(
      "privacy_boundary",
      "Public contract does not expose private safety or moderation records",
      /never exposes/i.test(contract.privacyBoundary) &&
        /raw reports/i.test(contract.privacyBoundary) &&
        /private messages/i.test(contract.privacyBoundary) &&
        /rare-view clusters/i.test(contract.privacyBoundary),
      contract.privacyBoundary,
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => entry.id);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-user-safety-content-moderation-contract",
    validatorVersion:
      MORAL_TRADE_USER_SAFETY_CONTENT_MODERATION_VALIDATOR_VERSION,
    contractVersion: contract.version,
    checks,
    blockers,
  };
}
