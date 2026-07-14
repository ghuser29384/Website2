import { createHash } from "node:crypto";

import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  MORAL_TRADE_RECIPIENT_ACCEPTANCE_VALIDATOR_VERSION,
  evaluateMoralTradeRecipientAcceptance,
  getMoralTradeRecipientAcceptanceContract,
  validateMoralTradeRecipientAcceptanceContract,
  type MoralTradeAdverseAssociationReviewRecord,
  type MoralTradeAdverseAssociationRiskClass,
  type MoralTradeAdverseAssociationStatus,
  type MoralTradeRecipientAcceptanceEvaluationInput,
  type MoralTradeRecipientAcceptancePolicyRecord,
  type MoralTradeRecipientAcceptancePolicyStatus,
  type MoralTradeRecipientAcceptanceRecord,
  type MoralTradeRecipientAcceptanceStatus,
  type MoralTradeRecipientAcceptanceSubjectType,
  type MoralTradeRecipientAcceptanceTransition,
  type MoralTradeVisibleRecipientAcceptanceStatus,
} from "@/lib/moral-trade/recipient-acceptance";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database, Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_TEXT_FIELD_LENGTH = 800;
const MAX_IDEMPOTENCY_LENGTH = 160;
const MAX_POLICIES = 12;
const MAX_ACCEPTANCE_RECORDS = 12;
const MAX_ADVERSE_ASSOCIATION_REVIEWS = 12;
const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

const TRANSITIONS = new Set<MoralTradeRecipientAcceptanceTransition>([
  "non_money_preview",
  "recipient_listing_publication",
  "matched_trade_lock",
  "payment_authorization",
  "payment_capture",
  "payout_release",
  "public_metric_publication",
  "release_gate_promotion",
]);
const SUBJECT_TYPES = new Set<MoralTradeRecipientAcceptanceSubjectType>([
  "donation_offset",
  "pledge_swap",
  "compensated_moral_action",
  "matched_trade_lock_proposal",
  "cleared_trade_agreement",
  "common_ground_budget_project",
]);
const POLICY_STATUSES = new Set<MoralTradeRecipientAcceptancePolicyStatus>([
  "resolved_immutable",
  "missing",
  "mutable",
  "stale",
  "superseded",
]);
const ACCEPTANCE_STATUSES = new Set<MoralTradeRecipientAcceptanceStatus>([
  "not_required_for_stage",
  "pending_recipient",
  "accepted",
  "conditional_acceptance",
  "declined",
  "expired",
  "revoked",
  "superseded",
  "blocked",
]);
const ADVERSE_ASSOCIATION_STATUSES =
  new Set<MoralTradeAdverseAssociationStatus>([
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
  ]);
const RISK_CLASSES = new Set<MoralTradeAdverseAssociationRiskClass>([
  "none",
  "low",
  "medium",
  "high",
  "severe",
]);
const VISIBLE_RECIPIENT_STATUSES =
  new Set<MoralTradeVisibleRecipientAcceptanceStatus>([
    "preview_only",
    "recipient_pending",
    "recipient_accepted",
    "accepted_with_conditions",
    "adverse_association_review",
    "declined_or_blocked",
    "expired_stale",
  ]);
const REQUEST_KEYS = new Set(["evaluationInput", "idempotencyKey"]);
const EVALUATION_INPUT_KEYS = new Set([
  "acceptanceRecords",
  "adverseAssociationReviews",
  "checkedAt",
  "policies",
  "transition",
]);
const POLICY_KEYS = new Set([
  "expiresAt",
  "maxReviewAgeDays",
  "policyHash",
  "policyId",
  "policyStatus",
  "publicSummaryAllowed",
  "releaseStage",
  "requiresAdverseAssociationReview",
  "requiresRecipientConsent",
  "reviewedAt",
  "subjectType",
  "supersededBy",
]);
const ACCEPTANCE_KEYS = new Set([
  "acceptanceId",
  "acceptanceScopeHash",
  "acceptanceStatus",
  "acceptedAt",
  "conditionalTermsPublic",
  "donorPrivateTermsPublic",
  "expiresAt",
  "policyRef",
  "recipientConsentHash",
  "recipientPrivateNotesPublic",
  "recipientRef",
  "reviewedAt",
  "reviewerNotesPublic",
  "subjectRef",
  "subjectType",
  "supersededBy",
  "visibleUserStatus",
]);
const ADVERSE_ASSOCIATION_KEYS = new Set([
  "acceptanceRef",
  "expiresAt",
  "mitigationHash",
  "policyRef",
  "privateDonorReasonPublic",
  "rawAssociationEvidencePublic",
  "recipientIdentityExpansionPublic",
  "reviewHash",
  "reviewId",
  "reviewStatus",
  "reviewedAt",
  "reviewerNotesPublic",
  "riskClass",
  "supersededBy",
  "visibleUserStatus",
]);

type RecipientAcceptanceEnforcementInsert =
  Database["public"]["Tables"]["moral_trade_recipient_acceptance_enforcement_records"]["Insert"];

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

function integerField(
  value: unknown,
  key: string,
  blockers: string[],
  fallback: number,
) {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (value !== undefined) {
    blockers.push(`${key}: positive integer is required`);
  }

  return fallback;
}

function requiredHashField(value: unknown, key: string, blockers: string[]) {
  const normalized = stringField(value);

  if (!HASH_PATTERN.test(normalized)) {
    blockers.push(`${key}: sha256 hash is required`);
  }

  return normalized;
}

function nullableHashField(value: unknown, key: string, blockers: string[]) {
  const normalized = stringField(value);

  if (!normalized) {
    return null;
  }

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

function unsupportedKeys(
  value: Record<string, unknown>,
  allowed: Set<string>,
  prefix: string,
) {
  return Object.keys(value)
    .filter((key) => !allowed.has(key))
    .map(
      (key) => `${prefix}.${key}: unsupported recipient-acceptance enforcement key`,
    );
}

function normalizePolicy(
  value: unknown,
  index: number,
  blockers: string[],
): MoralTradeRecipientAcceptancePolicyRecord {
  const record = isRecord(value) ? value : {};
  const prefix = `evaluationInput.policies.${index}`;

  if (!isRecord(value)) {
    blockers.push(`${prefix}: object is required`);
  } else {
    blockers.push(...unsupportedKeys(record, POLICY_KEYS, prefix));
  }

  return {
    expiresAt: nullableString(record.expiresAt),
    maxReviewAgeDays: integerField(
      record.maxReviewAgeDays,
      `${prefix}.maxReviewAgeDays`,
      blockers,
      90,
    ),
    policyHash: requiredHashField(record.policyHash, `${prefix}.policyHash`, blockers),
    policyId: requiredStringField(
      record.policyId,
      `${prefix}.policyId`,
      blockers,
      `submitted-recipient-acceptance-policy-${index + 1}`,
    ),
    policyStatus: enumField(
      record.policyStatus,
      POLICY_STATUSES,
      "missing",
      `${prefix}.policyStatus`,
      blockers,
      true,
    ),
    publicSummaryAllowed: booleanField(record.publicSummaryAllowed, true),
    releaseStage: requiredStringField(
      record.releaseStage,
      `${prefix}.releaseStage`,
      blockers,
      "submitted-release-stage",
    ),
    requiresAdverseAssociationReview: booleanField(
      record.requiresAdverseAssociationReview,
      true,
    ),
    requiresRecipientConsent: booleanField(record.requiresRecipientConsent, true),
    reviewedAt: stringField(record.reviewedAt),
    subjectType: enumField(
      record.subjectType,
      SUBJECT_TYPES,
      "donation_offset",
      `${prefix}.subjectType`,
      blockers,
      true,
    ),
    supersededBy: nullableString(record.supersededBy),
  };
}

function normalizeAcceptanceRecord(
  value: unknown,
  index: number,
  blockers: string[],
): MoralTradeRecipientAcceptanceRecord {
  const record = isRecord(value) ? value : {};
  const prefix = `evaluationInput.acceptanceRecords.${index}`;

  if (!isRecord(value)) {
    blockers.push(`${prefix}: object is required`);
  } else {
    blockers.push(...unsupportedKeys(record, ACCEPTANCE_KEYS, prefix));
  }

  return {
    acceptanceId: requiredStringField(
      record.acceptanceId,
      `${prefix}.acceptanceId`,
      blockers,
      `submitted-recipient-acceptance-${index + 1}`,
    ),
    acceptanceScopeHash: requiredHashField(
      record.acceptanceScopeHash,
      `${prefix}.acceptanceScopeHash`,
      blockers,
    ),
    acceptanceStatus: enumField(
      record.acceptanceStatus,
      ACCEPTANCE_STATUSES,
      "pending_recipient",
      `${prefix}.acceptanceStatus`,
      blockers,
      true,
    ),
    acceptedAt: nullableString(record.acceptedAt),
    conditionalTermsPublic: booleanField(record.conditionalTermsPublic),
    donorPrivateTermsPublic: booleanField(record.donorPrivateTermsPublic),
    expiresAt: nullableString(record.expiresAt),
    policyRef: requiredStringField(
      record.policyRef,
      `${prefix}.policyRef`,
      blockers,
      `submitted-recipient-acceptance-policy-${index + 1}`,
    ),
    recipientConsentHash: nullableHashField(
      record.recipientConsentHash,
      `${prefix}.recipientConsentHash`,
      blockers,
    ),
    recipientPrivateNotesPublic: booleanField(record.recipientPrivateNotesPublic),
    recipientRef: requiredStringField(
      record.recipientRef,
      `${prefix}.recipientRef`,
      blockers,
      `submitted-recipient-${index + 1}`,
    ),
    reviewedAt: stringField(record.reviewedAt),
    reviewerNotesPublic: booleanField(record.reviewerNotesPublic),
    subjectRef: requiredStringField(
      record.subjectRef,
      `${prefix}.subjectRef`,
      blockers,
      `submitted-subject-${index + 1}`,
    ),
    subjectType: enumField(
      record.subjectType,
      SUBJECT_TYPES,
      "donation_offset",
      `${prefix}.subjectType`,
      blockers,
      true,
    ),
    supersededBy: nullableString(record.supersededBy),
    visibleUserStatus: enumField(
      record.visibleUserStatus,
      VISIBLE_RECIPIENT_STATUSES,
      "recipient_pending",
      `${prefix}.visibleUserStatus`,
      blockers,
      true,
    ),
  };
}

function normalizeAdverseAssociationReview(
  value: unknown,
  index: number,
  blockers: string[],
): MoralTradeAdverseAssociationReviewRecord {
  const record = isRecord(value) ? value : {};
  const prefix = `evaluationInput.adverseAssociationReviews.${index}`;

  if (!isRecord(value)) {
    blockers.push(`${prefix}: object is required`);
  } else {
    blockers.push(...unsupportedKeys(record, ADVERSE_ASSOCIATION_KEYS, prefix));
  }

  return {
    acceptanceRef: requiredStringField(
      record.acceptanceRef,
      `${prefix}.acceptanceRef`,
      blockers,
      `submitted-recipient-acceptance-${index + 1}`,
    ),
    expiresAt: nullableString(record.expiresAt),
    mitigationHash: nullableHashField(
      record.mitigationHash,
      `${prefix}.mitigationHash`,
      blockers,
    ),
    policyRef: requiredStringField(
      record.policyRef,
      `${prefix}.policyRef`,
      blockers,
      `submitted-recipient-acceptance-policy-${index + 1}`,
    ),
    privateDonorReasonPublic: booleanField(record.privateDonorReasonPublic),
    rawAssociationEvidencePublic: booleanField(record.rawAssociationEvidencePublic),
    recipientIdentityExpansionPublic: booleanField(
      record.recipientIdentityExpansionPublic,
    ),
    reviewHash: requiredHashField(
      record.reviewHash,
      `${prefix}.reviewHash`,
      blockers,
    ),
    reviewId: requiredStringField(
      record.reviewId,
      `${prefix}.reviewId`,
      blockers,
      `submitted-adverse-association-review-${index + 1}`,
    ),
    reviewStatus: enumField(
      record.reviewStatus,
      ADVERSE_ASSOCIATION_STATUSES,
      "under_review",
      `${prefix}.reviewStatus`,
      blockers,
      true,
    ),
    reviewedAt: stringField(record.reviewedAt),
    reviewerNotesPublic: booleanField(record.reviewerNotesPublic),
    riskClass: enumField(
      record.riskClass,
      RISK_CLASSES,
      "none",
      `${prefix}.riskClass`,
      blockers,
      true,
    ),
    supersededBy: nullableString(record.supersededBy),
    visibleUserStatus: enumField(
      record.visibleUserStatus,
      VISIBLE_RECIPIENT_STATUSES,
      "adverse_association_review",
      `${prefix}.visibleUserStatus`,
      blockers,
      true,
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

  const input: MoralTradeRecipientAcceptanceEvaluationInput = {
    acceptanceRecords: Array.isArray(value.acceptanceRecords)
      ? value.acceptanceRecords
          .slice(0, MAX_ACCEPTANCE_RECORDS)
          .map((entry, index) => normalizeAcceptanceRecord(entry, index, blockers))
      : [],
    adverseAssociationReviews: Array.isArray(value.adverseAssociationReviews)
      ? value.adverseAssociationReviews
          .slice(0, MAX_ADVERSE_ASSOCIATION_REVIEWS)
          .map((entry, index) =>
            normalizeAdverseAssociationReview(entry, index, blockers),
          )
      : [],
    checkedAt: stringField(value.checkedAt) || undefined,
    policies: Array.isArray(value.policies)
      ? value.policies
          .slice(0, MAX_POLICIES)
          .map((entry, index) => normalizePolicy(entry, index, blockers))
      : [],
    transition: enumField(
      value.transition,
      TRANSITIONS,
      "matched_trade_lock",
      "evaluationInput.transition",
      blockers,
      true,
    ),
  };

  return { input, blockers };
}

function normalizeIdempotencyKey(value: unknown, fallbackHash: string) {
  const normalized = stringField(value, "").slice(0, MAX_IDEMPOTENCY_LENGTH);

  return normalized || `recipient-acceptance-enforce:${fallbackHash}`;
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
  const contract = getMoralTradeRecipientAcceptanceContract();
  const contractValidation = validateMoralTradeRecipientAcceptanceContract(contract);

  return buildMoralTradeApiJsonResponse(
    {
      ok: false,
      checkedAt,
      contractVersion: contract.version,
      recipientAcceptanceGateStatus: "blocked",
      recipientListingPublicationAllowed: false,
      lockTransitionAllowed: false,
      paymentAuthorizationAllowed: false,
      paymentCaptureAllowed: false,
      payoutReleaseAllowed: false,
      publicMetricPublicationAllowed: false,
      releaseGatePromotionAllowed: false,
      stateMutation: false,
      persistence: {
        requested: true,
        status: "not_recorded",
        recordId: null,
        table: "moral_trade_recipient_acceptance_enforcement_records",
      },
      contractValidation,
      fallback:
        "Invalid recipient-acceptance enforcement input creates no enforcement record and cannot authorize recipient listing, lock, payment authorization, payment capture, payout release, public metrics, or release promotion.",
      blockers,
    },
    "private_no_store",
    { status },
  );
}

export async function POST(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(
    request,
    "recipient_acceptance_enforce",
  );
  const checkedAt = new Date().toISOString();

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited recipient-acceptance enforcement creates no enforcement record and cannot authorize recipient listing, lock, payment authorization, payment capture, payout release, public metrics, or release promotion.",
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

  const contract = getMoralTradeRecipientAcceptanceContract();
  const contractValidation = validateMoralTradeRecipientAcceptanceContract(contract);
  const evaluation = evaluateMoralTradeRecipientAcceptance(normalized.input);
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
    recipientAcceptanceGateStatus:
      evaluation.status === "pass" ? "non_blocking" : "blocked",
    recipientListingPublicationAllowed: false,
    lockTransitionAllowed: false,
    paymentAuthorizationAllowed: false,
    paymentCaptureAllowed: false,
    payoutReleaseAllowed: false,
    publicMetricPublicationAllowed: false,
    releaseGatePromotionAllowed: false,
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
          table: "moral_trade_recipient_acceptance_enforcement_records",
        },
        fallback:
          "Recipient-acceptance enforcement was evaluated but not recorded because Supabase is not configured; no recipient listing, lock, payment authorization, payment capture, payout release, public metric, or release-promotion state changed.",
        blockers: [...blockers, "supabase_unconfigured:recipient_acceptance_enforce"],
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
          table: "moral_trade_recipient_acceptance_enforcement_records",
        },
        fallback:
          "Authentication is required before recording recipient-acceptance enforcement. No recipient listing, lock, payment authorization, payment capture, payout release, public metric, or release-promotion state changed.",
        blockers: [...blockers, "authentication_required:recipient_acceptance_enforce"],
      },
      "private_no_store",
      { status: 401 },
    );
  }

  const existing = await supabase
    .from("moral_trade_recipient_acceptance_enforcement_records")
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
          table: "moral_trade_recipient_acceptance_enforcement_records",
        },
      },
      "private_no_store",
    );
  }

  const insert: RecipientAcceptanceEnforcementInsert = {
    acceptance_record_count: normalized.input.acceptanceRecords.length,
    accepted_recipient_count: evaluation.acceptedRecipientCount,
    adverse_association_review_count:
      normalized.input.adverseAssociationReviews.length,
    blocker_codes: evaluation.blockers,
    cleared_adverse_association_count: evaluation.clearedAdverseAssociationCount,
    contract_version: contract.version,
    enforcement_input_json: normalized.input as unknown as Json,
    enforcement_status: evaluation.status,
    evaluation_hash: evaluationHash,
    evaluation_result_json: evaluation as unknown as Json,
    idempotency_key: idempotencyKey,
    immutable_policy_count: evaluation.immutablePolicyCount,
    lock_transition_allowed_bool: false,
    owner_profile_id: user.id,
    payment_authorization_allowed_bool: false,
    payment_capture_allowed_bool: false,
    policy_record_count: normalized.input.policies.length,
    public_metric_publication_allowed_bool: false,
    payout_release_allowed_bool: false,
    recipient_listing_publication_allowed_bool: false,
    release_gate_promotion_allowed_bool: false,
    required_acceptance_record_count: evaluation.requiredAcceptanceRecordCount,
    required_adverse_association_review_count:
      evaluation.requiredAdverseAssociationReviewCount,
    required_policy_count: evaluation.requiredPolicyCount,
    transition: evaluation.transition,
    user_facing_blocker_categories: evaluation.userFacingBlockerCategories,
    validator_version: MORAL_TRADE_RECIPIENT_ACCEPTANCE_VALIDATOR_VERSION,
  };
  const { data, error } = await supabase
    .from("moral_trade_recipient_acceptance_enforcement_records")
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
          table: "moral_trade_recipient_acceptance_enforcement_records",
        },
        fallback:
          "The recipient-acceptance enforcement result could not be recorded. No recipient listing, lock, payment authorization, payment capture, payout release, public metric, or release-promotion state changed.",
        blockers: [...blockers, "database_insert_failed:recipient_acceptance_enforce"],
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
        table: "moral_trade_recipient_acceptance_enforcement_records",
      },
    },
    "private_no_store",
    { status: contractValidation.status === "pass" ? 201 : 422 },
  );
}
