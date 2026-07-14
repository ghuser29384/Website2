import { createHash } from "node:crypto";

import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  MORAL_TRADE_USER_SAFETY_CONTENT_MODERATION_VALIDATOR_VERSION,
  evaluateMoralTradeUserSafetyContentModeration,
  getMoralTradeUserSafetyContentModerationContract,
  validateMoralTradeUserSafetyContentModerationContract,
  type MoralTradeAbuseReportResolutionStatus,
  type MoralTradeAbuseReportSeverity,
  type MoralTradeBlockDeclineStatus,
  type MoralTradeContactConsentStatus,
  type MoralTradeContactRateLimitStatus,
  type MoralTradeContentModerationDimension,
  type MoralTradeContentModerationRecord,
  type MoralTradeModeratedContentType,
  type MoralTradeModerationStatus,
  type MoralTradeRetaliationPreventionStatus,
  type MoralTradeSafetyPolicySnapshotStatus,
  type MoralTradeUserSafetyContentModerationEvaluationInput,
  type MoralTradeUserSafetyDimension,
  type MoralTradeUserSafetyModerationTransition,
  type MoralTradeUserSafetyRecord,
  type MoralTradeUserSafetyStatus,
  type MoralTradeViewpointNeutralityStatus,
} from "@/lib/moral-trade/user-safety-content-moderation";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database, Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_TEXT_FIELD_LENGTH = 1_200;
const MAX_IDEMPOTENCY_LENGTH = 160;
const MAX_RECORDS = 96;
const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

const TRANSITIONS = new Set<MoralTradeUserSafetyModerationTransition>([
  "draft_preview",
  "public_publication",
  "reviewer_actionable",
  "contact_introduction",
  "invite_link_creation",
  "reliance_bearing_preview",
  "payment_capture",
  "public_profile_amplification",
  "release_gate_promotion",
]);
const CONTENT_TYPES = new Set<MoralTradeModeratedContentType>([
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
]);
const MODERATION_DIMENSIONS = new Set<MoralTradeContentModerationDimension>([
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
]);
const USER_SAFETY_DIMENSIONS = new Set<MoralTradeUserSafetyDimension>([
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
]);
const MODERATION_STATUSES = new Set<MoralTradeModerationStatus>([
  "approved",
  "not_required_for_stage",
  "missing",
  "under_review",
  "blocked",
  "stale",
  "superseded",
]);
const USER_SAFETY_STATUSES = new Set<MoralTradeUserSafetyStatus>([
  "non_blocking",
  "not_required_for_stage",
  "missing",
  "under_review",
  "blocked",
  "serious_unresolved",
  "stale",
  "superseded",
]);
const POLICY_STATUSES = new Set<MoralTradeSafetyPolicySnapshotStatus>([
  "resolved_immutable",
  "missing",
  "mutable",
  "stale",
  "superseded",
]);
const VIEWPOINT_STATUSES = new Set<MoralTradeViewpointNeutralityStatus>([
  "confirmed_neutral",
  "not_required_for_stage",
  "missing",
  "viewpoint_ranked",
  "unpopular_view_blocked",
  "stale",
]);
const REVIEWER_QUALITY_STATUSES = new Set([
  "authorized",
  "not_required_for_stage",
  "missing",
  "failed",
  "stale",
] as const);
const MODERATION_REASON_CODES = new Set<
  MoralTradeContentModerationDimension | "none" | "unpopular_moral_view"
>([...MODERATION_DIMENSIONS, "none", "unpopular_moral_view"]);
const INTERACTION_TYPES = new Set([
  "contact_attempt",
  "invite_link",
  "profile_message",
  "support_message",
  "discussion_surface",
  "abuse_report",
] as const);
const CONTACT_CONSENT_STATUSES = new Set<MoralTradeContactConsentStatus>([
  "consented",
  "not_required_for_stage",
  "missing",
  "declined",
  "blocked",
  "withdrawn",
  "stale",
]);
const RATE_LIMIT_STATUSES = new Set<MoralTradeContactRateLimitStatus>([
  "within_limit",
  "not_required_for_stage",
  "missing",
  "exceeded",
  "stale",
]);
const BLOCK_DECLINE_STATUSES = new Set<MoralTradeBlockDeclineStatus>([
  "respected",
  "not_required_for_stage",
  "missing",
  "violated",
  "stale",
]);
const ABUSE_SEVERITIES = new Set<MoralTradeAbuseReportSeverity>([
  "none",
  "low",
  "medium",
  "serious",
  "critical",
]);
const ABUSE_RESOLUTION_STATUSES = new Set<MoralTradeAbuseReportResolutionStatus>([
  "none",
  "resolved_non_blocking",
  "not_required_for_stage",
  "missing",
  "open",
  "under_review",
  "serious_unresolved",
  "retaliation_risk",
  "stale",
]);
const RETALIATION_STATUSES = new Set<MoralTradeRetaliationPreventionStatus>([
  "non_blocking",
  "not_required_for_stage",
  "missing",
  "retaliation_risk",
  "stale",
]);
const REQUEST_KEYS = new Set(["evaluationInput", "idempotencyKey"]);
const EVALUATION_INPUT_KEYS = new Set([
  "checkedAt",
  "moderationRecords",
  "transition",
  "userSafetyRecords",
]);
const MODERATION_RECORD_KEYS = new Set([
  "contentHash",
  "contentType",
  "expiresAt",
  "moderationId",
  "moderationReasonCode",
  "policySnapshotStatus",
  "prohibitedUseCategories",
  "reviewedAt",
  "reviewerQualityStatus",
  "status",
  "subjectRef",
  "subjectType",
  "supersededBy",
  "userFacingReasonCategory",
  "viewpointNeutralityStatus",
  "viewpointRankedBool",
]);
const USER_SAFETY_RECORD_KEYS = new Set([
  "abuseReportResolutionStatus",
  "abuseReportSeverity",
  "blockDeclineWithdrawalStatus",
  "contactConsentStatus",
  "contactRecordHash",
  "expiresAt",
  "interactionType",
  "policySnapshotStatus",
  "rateLimitStatus",
  "retaliationPreventionStatus",
  "reviewedAt",
  "safetyDimensions",
  "safetyRecordId",
  "status",
  "subjectRef",
  "supersededBy",
  "userFacingReasonCategory",
]);

type UserSafetyContentModerationEnforcementInsert =
  Database["public"]["Tables"]["moral_trade_user_safety_content_moderation_enforcement_records"]["Insert"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }

  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function hashJson(value: unknown) {
  return `sha256:${createHash("sha256").update(stableStringify(value)).digest("hex")}`;
}

function stringField(value: unknown, fallback = "") {
  return typeof value === "string"
    ? value.trim().slice(0, MAX_TEXT_FIELD_LENGTH)
    : fallback;
}

function requiredStringField(
  value: unknown,
  key: string,
  blockers: string[],
  fallback = "",
) {
  const normalized = stringField(value, fallback);

  if (!normalized) {
    blockers.push(`${key}: missing`);
  }

  return normalized;
}

function nullableString(value: unknown) {
  const normalized = stringField(value);

  return normalized || null;
}

function booleanField(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function requiredHashField(value: unknown, key: string, blockers: string[]) {
  const normalized = stringField(value);

  if (!HASH_PATTERN.test(normalized)) {
    blockers.push(`${key}: sha256 hash is required`);
  }

  return normalized;
}

function enumField<T extends string>(
  value: unknown,
  allowed: Set<T>,
  fallback: T,
  key: string,
  blockers: string[],
  required = false,
) {
  const normalized = stringField(value);

  if (allowed.has(normalized as T)) {
    return normalized as T;
  }

  if (normalized) {
    blockers.push(`${key}: unsupported value`);
  } else if (required) {
    blockers.push(`${key}: missing`);
  }

  return fallback;
}

function enumArrayField<T extends string>(
  value: unknown,
  allowed: Set<T>,
  key: string,
  blockers: string[],
) {
  if (!Array.isArray(value)) {
    blockers.push(`${key}: array is required`);

    return [] as T[];
  }

  const normalized: T[] = [];

  for (const [index, entry] of value.entries()) {
    const candidate = stringField(entry);

    if (allowed.has(candidate as T)) {
      normalized.push(candidate as T);
    } else {
      blockers.push(`${key}.${index}: unsupported value`);
    }
  }

  return normalized;
}

function unsupportedKeys(
  value: Record<string, unknown>,
  allowed: Set<string>,
  prefix: string,
) {
  return Object.keys(value)
    .filter((key) => !allowed.has(key))
    .map((key) => `${prefix}.${key}: unsupported user-safety moderation enforcement key`);
}

function normalizeModerationRecord(
  value: unknown,
  index: number,
  blockers: string[],
): MoralTradeContentModerationRecord {
  const record = isRecord(value) ? value : {};
  const prefix = `evaluationInput.moderationRecords.${index}`;

  if (!isRecord(value)) {
    blockers.push(`${prefix}: object is required`);
  } else {
    blockers.push(...unsupportedKeys(record, MODERATION_RECORD_KEYS, prefix));
  }

  return {
    contentHash: requiredHashField(record.contentHash, `${prefix}.contentHash`, blockers),
    contentType: enumField(
      record.contentType,
      CONTENT_TYPES,
      "offer_text",
      `${prefix}.contentType`,
      blockers,
      true,
    ),
    expiresAt: nullableString(record.expiresAt),
    moderationId: requiredStringField(
      record.moderationId,
      `${prefix}.moderationId`,
      blockers,
      `submitted-content-moderation-${index + 1}`,
    ),
    moderationReasonCode: enumField(
      record.moderationReasonCode,
      MODERATION_REASON_CODES,
      "none",
      `${prefix}.moderationReasonCode`,
      blockers,
      true,
    ),
    policySnapshotStatus: enumField(
      record.policySnapshotStatus,
      POLICY_STATUSES,
      "missing",
      `${prefix}.policySnapshotStatus`,
      blockers,
      true,
    ),
    prohibitedUseCategories: enumArrayField(
      record.prohibitedUseCategories,
      MODERATION_DIMENSIONS,
      `${prefix}.prohibitedUseCategories`,
      blockers,
    ),
    reviewedAt: requiredStringField(
      record.reviewedAt,
      `${prefix}.reviewedAt`,
      blockers,
    ),
    reviewerQualityStatus: enumField(
      record.reviewerQualityStatus,
      REVIEWER_QUALITY_STATUSES,
      "missing",
      `${prefix}.reviewerQualityStatus`,
      blockers,
      true,
    ),
    status: enumField(
      record.status,
      MODERATION_STATUSES,
      "missing",
      `${prefix}.status`,
      blockers,
      true,
    ),
    subjectRef: requiredStringField(
      record.subjectRef,
      `${prefix}.subjectRef`,
      blockers,
      `submitted-moderation-subject-${index + 1}`,
    ),
    subjectType: requiredStringField(
      record.subjectType,
      `${prefix}.subjectType`,
      blockers,
      "moral_trade_subject",
    ),
    supersededBy: nullableString(record.supersededBy),
    userFacingReasonCategory: requiredStringField(
      record.userFacingReasonCategory,
      `${prefix}.userFacingReasonCategory`,
      blockers,
    ),
    viewpointNeutralityStatus: enumField(
      record.viewpointNeutralityStatus,
      VIEWPOINT_STATUSES,
      "missing",
      `${prefix}.viewpointNeutralityStatus`,
      blockers,
      true,
    ),
    viewpointRankedBool: booleanField(record.viewpointRankedBool),
  };
}

function normalizeUserSafetyRecord(
  value: unknown,
  index: number,
  blockers: string[],
): MoralTradeUserSafetyRecord {
  const record = isRecord(value) ? value : {};
  const prefix = `evaluationInput.userSafetyRecords.${index}`;

  if (!isRecord(value)) {
    blockers.push(`${prefix}: object is required`);
  } else {
    blockers.push(...unsupportedKeys(record, USER_SAFETY_RECORD_KEYS, prefix));
  }

  return {
    abuseReportResolutionStatus: enumField(
      record.abuseReportResolutionStatus,
      ABUSE_RESOLUTION_STATUSES,
      "missing",
      `${prefix}.abuseReportResolutionStatus`,
      blockers,
      true,
    ),
    abuseReportSeverity: enumField(
      record.abuseReportSeverity,
      ABUSE_SEVERITIES,
      "none",
      `${prefix}.abuseReportSeverity`,
      blockers,
      true,
    ),
    blockDeclineWithdrawalStatus: enumField(
      record.blockDeclineWithdrawalStatus,
      BLOCK_DECLINE_STATUSES,
      "missing",
      `${prefix}.blockDeclineWithdrawalStatus`,
      blockers,
      true,
    ),
    contactConsentStatus: enumField(
      record.contactConsentStatus,
      CONTACT_CONSENT_STATUSES,
      "missing",
      `${prefix}.contactConsentStatus`,
      blockers,
      true,
    ),
    contactRecordHash: requiredHashField(
      record.contactRecordHash,
      `${prefix}.contactRecordHash`,
      blockers,
    ),
    expiresAt: nullableString(record.expiresAt),
    interactionType: enumField(
      record.interactionType,
      INTERACTION_TYPES,
      "contact_attempt",
      `${prefix}.interactionType`,
      blockers,
      true,
    ),
    policySnapshotStatus: enumField(
      record.policySnapshotStatus,
      POLICY_STATUSES,
      "missing",
      `${prefix}.policySnapshotStatus`,
      blockers,
      true,
    ),
    rateLimitStatus: enumField(
      record.rateLimitStatus,
      RATE_LIMIT_STATUSES,
      "missing",
      `${prefix}.rateLimitStatus`,
      blockers,
      true,
    ),
    retaliationPreventionStatus: enumField(
      record.retaliationPreventionStatus,
      RETALIATION_STATUSES,
      "missing",
      `${prefix}.retaliationPreventionStatus`,
      blockers,
      true,
    ),
    reviewedAt: requiredStringField(
      record.reviewedAt,
      `${prefix}.reviewedAt`,
      blockers,
    ),
    safetyDimensions: enumArrayField(
      record.safetyDimensions,
      USER_SAFETY_DIMENSIONS,
      `${prefix}.safetyDimensions`,
      blockers,
    ),
    safetyRecordId: requiredStringField(
      record.safetyRecordId,
      `${prefix}.safetyRecordId`,
      blockers,
      `submitted-user-safety-${index + 1}`,
    ),
    status: enumField(
      record.status,
      USER_SAFETY_STATUSES,
      "missing",
      `${prefix}.status`,
      blockers,
      true,
    ),
    subjectRef: requiredStringField(
      record.subjectRef,
      `${prefix}.subjectRef`,
      blockers,
      `submitted-user-safety-subject-${index + 1}`,
    ),
    supersededBy: nullableString(record.supersededBy),
    userFacingReasonCategory: requiredStringField(
      record.userFacingReasonCategory,
      `${prefix}.userFacingReasonCategory`,
      blockers,
    ),
  };
}

function normalizeEvaluationInput(value: unknown) {
  const blockers: string[] = [];

  if (!isRecord(value)) {
    return {
      input: null,
      blockers: ["evaluationInput: object is required"],
    };
  }

  blockers.push(...unsupportedKeys(value, EVALUATION_INPUT_KEYS, "evaluationInput"));

  if (
    Array.isArray(value.moderationRecords) &&
    value.moderationRecords.length > MAX_RECORDS
  ) {
    blockers.push(
      `evaluationInput.moderationRecords: at most ${MAX_RECORDS} records are supported`,
    );
  }

  if (
    Array.isArray(value.userSafetyRecords) &&
    value.userSafetyRecords.length > MAX_RECORDS
  ) {
    blockers.push(
      `evaluationInput.userSafetyRecords: at most ${MAX_RECORDS} records are supported`,
    );
  }

  const input: MoralTradeUserSafetyContentModerationEvaluationInput = {
    checkedAt: stringField(value.checkedAt) || undefined,
    moderationRecords: Array.isArray(value.moderationRecords)
      ? value.moderationRecords
          .slice(0, MAX_RECORDS)
          .map((entry, index) => normalizeModerationRecord(entry, index, blockers))
      : [],
    transition: enumField(
      value.transition,
      TRANSITIONS,
      "draft_preview",
      "evaluationInput.transition",
      blockers,
      true,
    ),
    userSafetyRecords: Array.isArray(value.userSafetyRecords)
      ? value.userSafetyRecords
          .slice(0, MAX_RECORDS)
          .map((entry, index) => normalizeUserSafetyRecord(entry, index, blockers))
      : [],
  };

  if (!Array.isArray(value.moderationRecords)) {
    blockers.push("evaluationInput.moderationRecords: array is required");
  }

  if (!Array.isArray(value.userSafetyRecords)) {
    blockers.push("evaluationInput.userSafetyRecords: array is required");
  }

  return { input, blockers };
}

function normalizeIdempotencyKey(value: unknown, fallbackHash: string) {
  const normalized = stringField(value, "").slice(0, MAX_IDEMPOTENCY_LENGTH);

  return normalized || `user-safety-content-moderation-enforce:${fallbackHash}`;
}

function authorizationFields() {
  return {
    contactIntroductionAllowed: false,
    draftPreviewAllowed: false,
    inviteLinkCreationAllowed: false,
    paymentCaptureAllowed: false,
    publicProfileAmplificationAllowed: false,
    publicPublicationAllowed: false,
    releaseGatePromotionAllowed: false,
    relianceBearingPreviewAllowed: false,
    reviewerActionableAllowed: false,
  };
}

function invalidRequestResponse({
  blockers,
  checkedAt,
  status = 400,
}: {
  blockers: string[];
  checkedAt: string;
  status?: number;
}) {
  const contract = getMoralTradeUserSafetyContentModerationContract();
  const contractValidation =
    validateMoralTradeUserSafetyContentModerationContract(contract);

  return buildMoralTradeApiJsonResponse(
    {
      ok: false,
      checkedAt,
      contractVersion: contract.version,
      userSafetyContentModerationGateStatus: "blocked",
      ...authorizationFields(),
      stateMutation: false,
      persistence: {
        requested: true,
        status: "not_recorded",
        recordId: null,
        table: "moral_trade_user_safety_content_moderation_enforcement_records",
      },
      contractValidation,
      fallback:
        "Invalid user-safety/content-moderation enforcement input creates no enforcement record and cannot authorize public publication, reviewer actionability, contact introduction, invite-link creation, reliance-bearing preview, payment capture, profile amplification, or release promotion.",
      blockers,
    },
    "private_no_store",
    { status },
  );
}

export async function POST(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(
    request,
    "user_safety_content_moderation_enforce",
  );
  const checkedAt = new Date().toISOString();

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited user-safety/content-moderation enforcement creates no enforcement record and cannot authorize public publication, reviewer actionability, contact introduction, invite-link creation, reliance-bearing preview, payment capture, profile amplification, or release promotion.",
      "private, no-store",
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return invalidRequestResponse({
      checkedAt,
      blockers: ["invalid_json_body"],
    });
  }

  if (!isRecord(body)) {
    return invalidRequestResponse({
      checkedAt,
      blockers: ["request_body: object is required"],
    });
  }

  const requestBlockers = unsupportedKeys(body, REQUEST_KEYS, "request");
  const normalized = normalizeEvaluationInput(body.evaluationInput);

  if (!normalized.input || requestBlockers.length || normalized.blockers.length) {
    return invalidRequestResponse({
      checkedAt,
      blockers: [...requestBlockers, ...normalized.blockers],
    });
  }

  const contract = getMoralTradeUserSafetyContentModerationContract();
  const contractValidation =
    validateMoralTradeUserSafetyContentModerationContract(contract);
  const evaluation =
    evaluateMoralTradeUserSafetyContentModeration(normalized.input);
  const evaluationHash = hashJson({
    contractVersion: contract.version,
    evaluation,
    normalizedInput: normalized.input,
  });
  const idempotencyKey = normalizeIdempotencyKey(body.idempotencyKey, evaluationHash);
  const blockers = [...contractValidation.blockers];
  const basePayload = {
    checkedAt,
    contractVersion: contract.version,
    userSafetyContentModerationGateStatus:
      evaluation.status === "pass" ? "non_blocking" : "blocked",
    ...authorizationFields(),
    evaluation,
    evaluationHash,
    contractValidation,
    blockers,
  };

  if (!hasSupabaseEnv()) {
    return buildMoralTradeApiJsonResponse(
      {
        ok: false,
        ...basePayload,
        stateMutation: false,
        persistence: {
          requested: true,
          status: "supabase_unconfigured",
          recordId: null,
          table: "moral_trade_user_safety_content_moderation_enforcement_records",
        },
        fallback:
          "User-safety/content-moderation enforcement was evaluated but not recorded because Supabase is not configured; no public publication, reviewer-actionable, contact-introduction, invite-link, reliance-bearing preview, payment-capture, profile-amplification, or release-promotion state changed.",
        blockers: [
          ...blockers,
          "supabase_unconfigured:user_safety_content_moderation_enforce",
        ],
      },
      "private_no_store",
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return buildMoralTradeApiJsonResponse(
      {
        ok: false,
        ...basePayload,
        stateMutation: false,
        persistence: {
          requested: true,
          status: "auth_required",
          recordId: null,
          table: "moral_trade_user_safety_content_moderation_enforcement_records",
        },
        fallback:
          "Authentication is required before recording user-safety/content-moderation enforcement. No public publication, reviewer-actionable, contact-introduction, invite-link, reliance-bearing preview, payment-capture, profile-amplification, or release-promotion state changed.",
        blockers: [
          ...blockers,
          "authentication_required:user_safety_content_moderation_enforce",
        ],
      },
      "private_no_store",
      { status: 401 },
    );
  }

  const existing = await supabase
    .from("moral_trade_user_safety_content_moderation_enforcement_records")
    .select("id, evaluation_hash, created_at")
    .eq("owner_profile_id", user.id)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existing.data) {
    return buildMoralTradeApiJsonResponse(
      {
        ok: contractValidation.status === "pass",
        ...basePayload,
        stateMutation: false,
        persistence: {
          requested: true,
          status: "already_recorded",
          recordId: existing.data.id,
          evaluationHash: existing.data.evaluation_hash,
          recordedAt: existing.data.created_at,
          table: "moral_trade_user_safety_content_moderation_enforcement_records",
        },
      },
      "private_no_store",
    );
  }

  const insert: UserSafetyContentModerationEnforcementInsert = {
    blocker_codes: evaluation.blockers,
    blocker_count: evaluation.blockers.length,
    contact_introduction_allowed_bool: false,
    contract_version: contract.version,
    draft_preview_allowed_bool: false,
    enforcement_input_json: normalized.input as unknown as Json,
    enforcement_status: evaluation.status,
    evaluation_hash: evaluationHash,
    evaluation_result_json: evaluation as unknown as Json,
    idempotency_key: idempotencyKey,
    invite_link_creation_allowed_bool: false,
    moderation_record_count: normalized.input.moderationRecords.length,
    owner_profile_id: user.id,
    passing_moderation_count: evaluation.passingModerationCount,
    passing_user_safety_count: evaluation.passingUserSafetyCount,
    payment_capture_allowed_bool: false,
    public_profile_amplification_allowed_bool: false,
    public_publication_allowed_bool: false,
    release_gate_promotion_allowed_bool: false,
    reliance_bearing_preview_allowed_bool: false,
    required_content_type_count: evaluation.requiredContentTypeCount,
    required_user_safety_dimension_count:
      evaluation.requiredUserSafetyDimensionCount,
    reviewer_actionable_allowed_bool: false,
    transition: evaluation.transition,
    user_facing_blocker_categories: evaluation.userFacingBlockerCategories,
    user_safety_record_count: normalized.input.userSafetyRecords.length,
    validator_version:
      MORAL_TRADE_USER_SAFETY_CONTENT_MODERATION_VALIDATOR_VERSION,
  };
  const { data, error } = await supabase
    .from("moral_trade_user_safety_content_moderation_enforcement_records")
    .insert(insert)
    .select("id, evaluation_hash, created_at")
    .single();

  if (error) {
    return buildMoralTradeApiJsonResponse(
      {
        ok: false,
        ...basePayload,
        stateMutation: false,
        persistence: {
          requested: true,
          status: "insert_failed",
          recordId: null,
          table: "moral_trade_user_safety_content_moderation_enforcement_records",
        },
        fallback:
          "The user-safety/content-moderation enforcement result could not be recorded. No public publication, reviewer-actionable, contact-introduction, invite-link, reliance-bearing preview, payment-capture, profile-amplification, or release-promotion state changed.",
        blockers: [
          ...blockers,
          "database_insert_failed:user_safety_content_moderation_enforce",
        ],
      },
      "private_no_store",
      { status: 500 },
    );
  }

  return buildMoralTradeApiJsonResponse(
    {
      ok: contractValidation.status === "pass",
      ...basePayload,
      stateMutation: true,
      persistence: {
        requested: true,
        status: "recorded",
        recordId: data.id,
        evaluationHash: data.evaluation_hash,
        recordedAt: data.created_at,
        table: "moral_trade_user_safety_content_moderation_enforcement_records",
      },
    },
    "private_no_store",
    { status: contractValidation.status === "pass" ? 201 : 422 },
  );
}
