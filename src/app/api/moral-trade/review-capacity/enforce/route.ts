import { createHash } from "node:crypto";

import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  MORAL_TRADE_REVIEW_CAPACITY_VALIDATOR_VERSION,
  evaluateMoralTradeReviewCapacity,
  getMoralTradeReviewCapacityContract,
  validateMoralTradeReviewCapacityContract,
  type MoralTradeReviewCapacityEvaluationInput,
  type MoralTradeReviewCapacityPolicyRecord,
  type MoralTradeReviewCapacityPolicyStatus,
  type MoralTradeReviewCapacitySubjectType,
  type MoralTradeReviewCapacityTransition,
  type MoralTradeReviewConflictScreeningState,
  type MoralTradeReviewQualityState,
  type MoralTradeReviewQueueRecord,
  type MoralTradeReviewQueueState,
  type MoralTradeReviewerPanelAssignmentRecord,
  type MoralTradeReviewerPanelState,
  type MoralTradeVisibleReviewQueueStatus,
} from "@/lib/moral-trade/review-capacity";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database, Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_TEXT_FIELD_LENGTH = 800;
const MAX_IDEMPOTENCY_LENGTH = 160;
const MAX_POLICIES = 12;
const MAX_QUEUE_RECORDS = 12;
const MAX_PANEL_ASSIGNMENTS = 12;
const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

const TRANSITIONS = new Set<MoralTradeReviewCapacityTransition>([
  "draft_preview",
  "live_offer_publication",
  "matchable_publication",
  "matched_trade_lock",
  "payment_authorization",
  "payment_capture",
  "reliance_bearing_transition",
  "public_metric_publication",
  "release_gate_promotion",
]);
const SUBJECT_TYPES = new Set<MoralTradeReviewCapacitySubjectType>([
  "donation_offset",
  "pledge_swap",
  "compensated_moral_action",
  "performance_bond_condition",
  "side_agreement",
  "matched_trade_lock_proposal",
  "cleared_trade_agreement",
]);
const POLICY_STATUSES = new Set<MoralTradeReviewCapacityPolicyStatus>([
  "resolved_immutable",
  "missing",
  "mutable",
  "stale",
  "superseded",
]);
const QUEUE_STATES = new Set<MoralTradeReviewQueueState>([
  "preview_only",
  "admitted",
  "waitlisted",
  "expired",
  "blocked",
  "superseded",
]);
const VISIBLE_QUEUE_STATUSES = new Set<MoralTradeVisibleReviewQueueStatus>([
  "preview",
  "in_review_queue",
  "waitlisted_capacity",
  "review_delayed",
  "expired_stale",
  "blocked_needs_review",
  "ready_for_review",
]);
const PANEL_STATES = new Set<MoralTradeReviewerPanelState>([
  "eligible",
  "missing",
  "conflicted",
  "unavailable",
  "stale",
  "superseded",
]);
const CONFLICT_SCREENING_STATES = new Set<MoralTradeReviewConflictScreeningState>([
  "passed",
  "disclosed_nonblocking",
  "not_required_for_stage",
  "missing",
  "unresolved",
  "conflicted",
  "superseded",
]);
const REVIEWER_QUALITY_STATES = new Set<MoralTradeReviewQualityState>([
  "current",
  "not_required_for_stage",
  "missing",
  "failed",
  "stale",
  "superseded",
]);
const REQUEST_KEYS = new Set(["evaluationInput", "idempotencyKey"]);
const EVALUATION_INPUT_KEYS = new Set([
  "checkedAt",
  "panelAssignments",
  "policies",
  "queueRecords",
  "transition",
]);
const POLICY_KEYS = new Set([
  "expiresAt",
  "maxBaselineAgeDays",
  "maxEstimatedWaitDays",
  "maxOpenQueueDepth",
  "maxPaymentAuthorizationAgeDays",
  "minEligibleReviewerCount",
  "neutralPanelRequired",
  "policyHash",
  "policyId",
  "policyStatus",
  "releaseStage",
  "reviewedAt",
  "subjectType",
  "supersededBy",
]);
const QUEUE_RECORD_KEYS = new Set([
  "baselineExpiresAt",
  "eligibleReviewerCount",
  "estimatedReviewBy",
  "expiresAt",
  "neutralPanelAvailable",
  "openQueueDepth",
  "paymentAuthorizationExpiresAt",
  "policyRef",
  "privateQueueReasonPublic",
  "queueId",
  "queuePosition",
  "queueState",
  "reviewedAt",
  "reviewerIdentityPublic",
  "subjectRef",
  "subjectType",
  "supersededBy",
  "userStatusCopyHash",
  "visibleUserQueueStatus",
]);
const PANEL_ASSIGNMENT_KEYS = new Set([
  "assignmentHash",
  "assignmentId",
  "assignmentState",
  "conflictFactsPublic",
  "conflictScreeningState",
  "expiresAt",
  "neutralReviewerCount",
  "queueRef",
  "reviewedAt",
  "reviewerCount",
  "reviewerIdentityPublic",
  "reviewerQualityState",
  "supersededBy",
]);

type ReviewCapacityEnforcementInsert =
  Database["public"]["Tables"]["moral_trade_review_capacity_enforcement_records"]["Insert"];

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
  fallback?: number,
): number;
function integerField(
  value: unknown,
  key: string,
  blockers: string[],
  fallback: number,
  nullable: true,
): number | null;
function integerField(
  value: unknown,
  key: string,
  blockers: string[],
  fallback = 0,
  nullable = false,
) {
  if (nullable && value === null) {
    return null;
  }

  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  blockers.push(`${key}: integer is required`);

  return fallback;
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

function unsupportedKeys(
  value: Record<string, unknown>,
  allowed: Set<string>,
  prefix: string,
) {
  return Object.keys(value)
    .filter((key) => !allowed.has(key))
    .map((key) => `${prefix}.${key}: unsupported review-capacity enforcement key`);
}

function normalizePolicy(
  value: unknown,
  index: number,
  blockers: string[],
): MoralTradeReviewCapacityPolicyRecord {
  const record = isRecord(value) ? value : {};
  const prefix = `evaluationInput.policies.${index}`;

  if (!isRecord(value)) {
    blockers.push(`${prefix}: object is required`);
  } else {
    blockers.push(...unsupportedKeys(record, POLICY_KEYS, prefix));
  }

  return {
    expiresAt: nullableString(record.expiresAt),
    maxBaselineAgeDays: integerField(
      record.maxBaselineAgeDays,
      `${prefix}.maxBaselineAgeDays`,
      blockers,
    ),
    maxEstimatedWaitDays: integerField(
      record.maxEstimatedWaitDays,
      `${prefix}.maxEstimatedWaitDays`,
      blockers,
    ),
    maxOpenQueueDepth: integerField(
      record.maxOpenQueueDepth,
      `${prefix}.maxOpenQueueDepth`,
      blockers,
    ),
    maxPaymentAuthorizationAgeDays: integerField(
      record.maxPaymentAuthorizationAgeDays,
      `${prefix}.maxPaymentAuthorizationAgeDays`,
      blockers,
    ),
    minEligibleReviewerCount: integerField(
      record.minEligibleReviewerCount,
      `${prefix}.minEligibleReviewerCount`,
      blockers,
    ),
    neutralPanelRequired: booleanField(record.neutralPanelRequired),
    policyHash: requiredHashField(record.policyHash, `${prefix}.policyHash`, blockers),
    policyId: requiredStringField(
      record.policyId,
      `${prefix}.policyId`,
      blockers,
      `submitted-review-capacity-policy-${index + 1}`,
    ),
    policyStatus: enumField(
      record.policyStatus,
      POLICY_STATUSES,
      "missing",
      `${prefix}.policyStatus`,
      blockers,
      true,
    ),
    releaseStage: requiredStringField(
      record.releaseStage,
      `${prefix}.releaseStage`,
      blockers,
      "submitted-release-stage",
    ),
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

function normalizeQueueRecord(
  value: unknown,
  index: number,
  blockers: string[],
): MoralTradeReviewQueueRecord {
  const record = isRecord(value) ? value : {};
  const prefix = `evaluationInput.queueRecords.${index}`;

  if (!isRecord(value)) {
    blockers.push(`${prefix}: object is required`);
  } else {
    blockers.push(...unsupportedKeys(record, QUEUE_RECORD_KEYS, prefix));
  }

  return {
    baselineExpiresAt: nullableString(record.baselineExpiresAt),
    eligibleReviewerCount: integerField(
      record.eligibleReviewerCount,
      `${prefix}.eligibleReviewerCount`,
      blockers,
    ),
    estimatedReviewBy: nullableString(record.estimatedReviewBy),
    expiresAt: nullableString(record.expiresAt),
    neutralPanelAvailable: booleanField(record.neutralPanelAvailable),
    openQueueDepth: integerField(record.openQueueDepth, `${prefix}.openQueueDepth`, blockers),
    paymentAuthorizationExpiresAt: nullableString(record.paymentAuthorizationExpiresAt),
    policyRef: requiredStringField(
      record.policyRef,
      `${prefix}.policyRef`,
      blockers,
      `submitted-review-capacity-policy-${index + 1}`,
    ),
    privateQueueReasonPublic: booleanField(record.privateQueueReasonPublic),
    queueId: requiredStringField(
      record.queueId,
      `${prefix}.queueId`,
      blockers,
      `submitted-review-queue-${index + 1}`,
    ),
    queuePosition: integerField(
      record.queuePosition,
      `${prefix}.queuePosition`,
      blockers,
      0,
      true,
    ),
    queueState: enumField(
      record.queueState,
      QUEUE_STATES,
      "preview_only",
      `${prefix}.queueState`,
      blockers,
      true,
    ),
    reviewedAt: stringField(record.reviewedAt),
    reviewerIdentityPublic: booleanField(record.reviewerIdentityPublic),
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
    userStatusCopyHash: requiredHashField(
      record.userStatusCopyHash,
      `${prefix}.userStatusCopyHash`,
      blockers,
    ),
    visibleUserQueueStatus: enumField(
      record.visibleUserQueueStatus,
      VISIBLE_QUEUE_STATUSES,
      "preview",
      `${prefix}.visibleUserQueueStatus`,
      blockers,
      true,
    ),
  };
}

function normalizePanelAssignment(
  value: unknown,
  index: number,
  blockers: string[],
): MoralTradeReviewerPanelAssignmentRecord {
  const record = isRecord(value) ? value : {};
  const prefix = `evaluationInput.panelAssignments.${index}`;

  if (!isRecord(value)) {
    blockers.push(`${prefix}: object is required`);
  } else {
    blockers.push(...unsupportedKeys(record, PANEL_ASSIGNMENT_KEYS, prefix));
  }

  return {
    assignmentHash: requiredHashField(
      record.assignmentHash,
      `${prefix}.assignmentHash`,
      blockers,
    ),
    assignmentId: requiredStringField(
      record.assignmentId,
      `${prefix}.assignmentId`,
      blockers,
      `submitted-reviewer-panel-${index + 1}`,
    ),
    assignmentState: enumField(
      record.assignmentState,
      PANEL_STATES,
      "missing",
      `${prefix}.assignmentState`,
      blockers,
      true,
    ),
    conflictFactsPublic: booleanField(record.conflictFactsPublic),
    conflictScreeningState: enumField(
      record.conflictScreeningState,
      CONFLICT_SCREENING_STATES,
      "missing",
      `${prefix}.conflictScreeningState`,
      blockers,
      true,
    ),
    expiresAt: nullableString(record.expiresAt),
    neutralReviewerCount: integerField(
      record.neutralReviewerCount,
      `${prefix}.neutralReviewerCount`,
      blockers,
    ),
    queueRef: requiredStringField(
      record.queueRef,
      `${prefix}.queueRef`,
      blockers,
      `submitted-review-queue-${index + 1}`,
    ),
    reviewedAt: stringField(record.reviewedAt),
    reviewerCount: integerField(record.reviewerCount, `${prefix}.reviewerCount`, blockers),
    reviewerIdentityPublic: booleanField(record.reviewerIdentityPublic),
    reviewerQualityState: enumField(
      record.reviewerQualityState,
      REVIEWER_QUALITY_STATES,
      "missing",
      `${prefix}.reviewerQualityState`,
      blockers,
      true,
    ),
    supersededBy: nullableString(record.supersededBy),
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

  const input: MoralTradeReviewCapacityEvaluationInput = {
    checkedAt: stringField(value.checkedAt) || undefined,
    panelAssignments: Array.isArray(value.panelAssignments)
      ? value.panelAssignments
          .slice(0, MAX_PANEL_ASSIGNMENTS)
          .map((entry, index) => normalizePanelAssignment(entry, index, blockers))
      : [],
    policies: Array.isArray(value.policies)
      ? value.policies
          .slice(0, MAX_POLICIES)
          .map((entry, index) => normalizePolicy(entry, index, blockers))
      : [],
    queueRecords: Array.isArray(value.queueRecords)
      ? value.queueRecords
          .slice(0, MAX_QUEUE_RECORDS)
          .map((entry, index) => normalizeQueueRecord(entry, index, blockers))
      : [],
    transition: enumField(
      value.transition,
      TRANSITIONS,
      "live_offer_publication",
      "evaluationInput.transition",
      blockers,
      true,
    ),
  };

  return { input, blockers };
}

function normalizeIdempotencyKey(value: unknown, fallbackHash: string) {
  const normalized = stringField(value, "").slice(0, MAX_IDEMPOTENCY_LENGTH);

  return normalized || `review-capacity-enforce:${fallbackHash}`;
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
  const contract = getMoralTradeReviewCapacityContract();
  const contractValidation = validateMoralTradeReviewCapacityContract(contract);

  return buildMoralTradeApiJsonResponse(
    {
      ok: false,
      checkedAt,
      contractVersion: contract.version,
      reviewCapacityGateStatus: "blocked",
      livePublicationAllowed: false,
      matchablePublicationAllowed: false,
      lockTransitionAllowed: false,
      paymentAuthorizationAllowed: false,
      paymentCaptureAllowed: false,
      relianceBearingTransitionAllowed: false,
      publicMetricPublicationAllowed: false,
      releaseGatePromotionAllowed: false,
      stateMutation: false,
      persistence: {
        requested: true,
        status: "not_recorded",
        recordId: null,
        table: "moral_trade_review_capacity_enforcement_records",
      },
      contractValidation,
      fallback:
        "Invalid review-capacity enforcement input creates no enforcement record and cannot authorize live publication, matching, lock, payment, reliance, public metrics, or release promotion.",
      blockers,
    },
    "private_no_store",
    { status },
  );
}

export async function POST(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(
    request,
    "review_capacity_enforce",
  );
  const checkedAt = new Date().toISOString();

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited review-capacity enforcement creates no enforcement record and cannot authorize live publication, matching, lock, payment, reliance, public metrics, or release promotion.",
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

  const contract = getMoralTradeReviewCapacityContract();
  const contractValidation = validateMoralTradeReviewCapacityContract(contract);
  const evaluation = evaluateMoralTradeReviewCapacity(normalized.input);
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
    reviewCapacityGateStatus:
      evaluation.status === "pass" ? "non_blocking" : "blocked",
    livePublicationAllowed: false,
    matchablePublicationAllowed: false,
    lockTransitionAllowed: false,
    paymentAuthorizationAllowed: false,
    paymentCaptureAllowed: false,
    relianceBearingTransitionAllowed: false,
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
          table: "moral_trade_review_capacity_enforcement_records",
        },
        fallback:
          "Review-capacity enforcement was evaluated but not recorded because Supabase is not configured; no live publication, matching, lock, payment, reliance, public metric, or release-promotion state changed.",
        blockers: [...blockers, "supabase_unconfigured:review_capacity_enforce"],
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
          table: "moral_trade_review_capacity_enforcement_records",
        },
        fallback:
          "Authentication is required before recording review-capacity enforcement. No live publication, matching, lock, payment, reliance, public metric, or release-promotion state changed.",
        blockers: [...blockers, "authentication_required:review_capacity_enforce"],
      },
      "private_no_store",
      { status: 401 },
    );
  }

  const existing = await supabase
    .from("moral_trade_review_capacity_enforcement_records")
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
          table: "moral_trade_review_capacity_enforcement_records",
        },
      },
      "private_no_store",
    );
  }

  const insert: ReviewCapacityEnforcementInsert = {
    admitted_queue_count: evaluation.admittedQueueCount,
    blocker_codes: evaluation.blockers,
    contract_version: contract.version,
    eligible_panel_count: evaluation.eligiblePanelCount,
    enforcement_input_json: normalized.input as unknown as Json,
    enforcement_status: evaluation.status,
    evaluation_hash: evaluationHash,
    evaluation_result_json: evaluation as unknown as Json,
    idempotency_key: idempotencyKey,
    live_publication_allowed_bool: false,
    lock_transition_allowed_bool: false,
    matchable_publication_allowed_bool: false,
    owner_profile_id: user.id,
    panel_assignment_record_count: normalized.input.panelAssignments.length,
    payment_authorization_allowed_bool: false,
    payment_capture_allowed_bool: false,
    policy_record_count: normalized.input.policies.length,
    public_metric_publication_allowed_bool: false,
    queue_record_count: normalized.input.queueRecords.length,
    release_gate_promotion_allowed_bool: false,
    reliance_bearing_transition_allowed_bool: false,
    required_policy_count: evaluation.requiredPolicyCount,
    required_queue_record_count: evaluation.requiredQueueRecordCount,
    transition: evaluation.transition,
    user_facing_blocker_categories: evaluation.userFacingBlockerCategories,
    validator_version: MORAL_TRADE_REVIEW_CAPACITY_VALIDATOR_VERSION,
  };
  const { data, error } = await supabase
    .from("moral_trade_review_capacity_enforcement_records")
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
          table: "moral_trade_review_capacity_enforcement_records",
        },
        fallback:
          "The review-capacity enforcement result could not be recorded. No live publication, matching, lock, payment, reliance, public metric, or release-promotion state changed.",
        blockers: [...blockers, "database_insert_failed:review_capacity_enforce"],
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
        table: "moral_trade_review_capacity_enforcement_records",
      },
    },
    "private_no_store",
    { status: contractValidation.status === "pass" ? 201 : 422 },
  );
}
