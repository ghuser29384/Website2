import { createHash } from "node:crypto";

import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  MORAL_TRADE_POST_CLEAR_AUDIT_VALIDATOR_VERSION,
  evaluateMoralTradePostClearAudit,
  getMoralTradePostClearAuditContract,
  validateMoralTradePostClearAuditContract,
  type MoralTradePostClearAuditEvaluationInput,
  type MoralTradePostClearAuditMatchState,
  type MoralTradePostClearAuditPolicyRecord,
  type MoralTradePostClearAuditPolicyStatus,
  type MoralTradePostClearAuditRecord,
  type MoralTradePostClearAuditState,
  type MoralTradePostClearAuditSubjectType,
  type MoralTradePostClearAuditTransition,
  type MoralTradePostClearAuditType,
} from "@/lib/moral-trade/post-clear-audit";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database, Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_TEXT_FIELD_LENGTH = 800;
const MAX_IDEMPOTENCY_LENGTH = 160;
const MAX_POLICIES = 12;
const MAX_RECORDS = 36;
const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

const TRANSITIONS = new Set<MoralTradePostClearAuditTransition>([
  "post_clear_sampling_assignment",
  "audit_record_review",
  "corrective_action_resolution",
  "payment_reconciliation_close",
  "payout_release",
  "public_metric_publication",
  "release_gate_promotion",
]);
const SUBJECT_TYPES = new Set<MoralTradePostClearAuditSubjectType>([
  "cleared_trade_agreement",
  "matched_trade_lock_proposal",
  "payment_event",
  "evidence_record",
  "payout_milestone",
  "impact_claim_record",
]);
const AUDIT_TYPES = new Set<MoralTradePostClearAuditType>([
  "random_sample",
  "risk_triggered",
  "dispute_triggered",
  "payment_triggered",
  "evidence_triggered",
  "recipient_triggered",
  "classification_triggered",
  "manual_review",
]);
const MATCH_STATES = new Set<MoralTradePostClearAuditMatchState>([
  "not_checked",
  "matched",
  "mismatch",
  "manual_review",
]);
const AUDIT_STATES = new Set<MoralTradePostClearAuditState>([
  "pending",
  "passed",
  "failed",
  "corrective_action_open",
  "closed",
  "superseded",
]);
const POLICY_STATUSES = new Set<MoralTradePostClearAuditPolicyStatus>([
  "resolved_immutable",
  "missing",
  "mutable",
  "stale",
  "superseded",
]);
const REQUEST_KEYS = new Set(["evaluationInput", "idempotencyKey"]);
const EVALUATION_INPUT_KEYS = new Set([
  "checkedAt",
  "policies",
  "postClearAuditRequired",
  "records",
  "transition",
]);
const POLICY_KEYS = new Set([
  "auditTypes",
  "expiresAt",
  "maxPolicyAgeDays",
  "permitsCorrectionOnlyUnderFrozenPolicy",
  "policyHash",
  "policyId",
  "policyStatus",
  "prohibitsPublicReputationEffect",
  "releaseStage",
  "requiresBaselineEvidenceMatch",
  "requiresClassificationMatch",
  "requiresPaymentReconciliationMatch",
  "requiresPrivacyDisclosureMatch",
  "requiresRecipientAcceptanceMatch",
  "requiresTermSheetMatch",
  "reviewedAt",
  "sampledSubjectTypes",
  "supersededBy",
]);
const RECORD_KEYS = new Set([
  "auditState",
  "auditType",
  "baselineAndEvidenceMatchState",
  "classificationMatchState",
  "correctiveActionRefs",
  "createdAt",
  "participantSpecificRowsPublic",
  "paymentAndReconciliationMatchState",
  "policyRef",
  "privateCounterpartyTermsPublic",
  "privacyOrDisclosureMatchState",
  "providerPayloadPublic",
  "publicReputationEffectProhibited",
  "rawPaymentEvidencePublic",
  "rawReconciliationRowsPublic",
  "recipientAcceptanceMatchState",
  "recordId",
  "reviewerDecisionRef",
  "reviewerNotesPublic",
  "sampledFieldsHash",
  "subjectRef",
  "subjectType",
  "termSheetMatchState",
  "updatedAt",
]);

type PostClearAuditEnforcementInsert =
  Database["public"]["Tables"]["moral_trade_post_clear_audit_enforcement_records"]["Insert"];

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
  fallback: T,
  key: string,
  blockers: string[],
) {
  if (!Array.isArray(value)) {
    blockers.push(`${key}: array is required`);

    return [] as T[];
  }

  return value
    .map((entry, index) =>
      enumField(entry, allowed, fallback, `${key}.${index}`, blockers, true),
    )
    .filter(Boolean);
}

function stringArrayField(value: unknown, key: string, blockers: string[]) {
  if (!Array.isArray(value)) {
    if (value !== undefined) {
      blockers.push(`${key}: array is required`);
    }

    return [];
  }

  return value.map((entry, index) =>
    requiredStringField(entry, `${key}.${index}`, blockers),
  );
}

function unsupportedKeys(
  value: Record<string, unknown>,
  allowed: Set<string>,
  prefix: string,
) {
  return Object.keys(value)
    .filter((key) => !allowed.has(key))
    .map(
      (key) =>
        `${prefix}.${key}: unsupported post-clear audit enforcement key`,
    );
}

function normalizePolicy(
  value: unknown,
  index: number,
  blockers: string[],
): MoralTradePostClearAuditPolicyRecord {
  const record = isRecord(value) ? value : {};
  const prefix = `evaluationInput.policies.${index}`;

  if (!isRecord(value)) {
    blockers.push(`${prefix}: object is required`);
  } else {
    blockers.push(...unsupportedKeys(record, POLICY_KEYS, prefix));
  }

  return {
    auditTypes: enumArrayField(
      record.auditTypes,
      AUDIT_TYPES,
      "random_sample",
      `${prefix}.auditTypes`,
      blockers,
    ),
    expiresAt: nullableString(record.expiresAt),
    maxPolicyAgeDays: integerField(
      record.maxPolicyAgeDays,
      `${prefix}.maxPolicyAgeDays`,
      blockers,
      120,
    ),
    permitsCorrectionOnlyUnderFrozenPolicy: booleanField(
      record.permitsCorrectionOnlyUnderFrozenPolicy,
      true,
    ),
    policyHash: requiredHashField(record.policyHash, `${prefix}.policyHash`, blockers),
    policyId: requiredStringField(
      record.policyId,
      `${prefix}.policyId`,
      blockers,
      `submitted-post-clear-audit-policy-${index + 1}`,
    ),
    policyStatus: enumField(
      record.policyStatus,
      POLICY_STATUSES,
      "missing",
      `${prefix}.policyStatus`,
      blockers,
      true,
    ),
    prohibitsPublicReputationEffect: booleanField(
      record.prohibitsPublicReputationEffect,
      true,
    ),
    releaseStage: requiredStringField(
      record.releaseStage,
      `${prefix}.releaseStage`,
      blockers,
      "submitted-release-stage",
    ),
    requiresBaselineEvidenceMatch: booleanField(
      record.requiresBaselineEvidenceMatch,
      true,
    ),
    requiresClassificationMatch: booleanField(
      record.requiresClassificationMatch,
      true,
    ),
    requiresPaymentReconciliationMatch: booleanField(
      record.requiresPaymentReconciliationMatch,
      true,
    ),
    requiresPrivacyDisclosureMatch: booleanField(
      record.requiresPrivacyDisclosureMatch,
      true,
    ),
    requiresRecipientAcceptanceMatch: booleanField(
      record.requiresRecipientAcceptanceMatch,
      true,
    ),
    requiresTermSheetMatch: booleanField(record.requiresTermSheetMatch, true),
    reviewedAt: stringField(record.reviewedAt),
    sampledSubjectTypes: enumArrayField(
      record.sampledSubjectTypes,
      SUBJECT_TYPES,
      "cleared_trade_agreement",
      `${prefix}.sampledSubjectTypes`,
      blockers,
    ),
    supersededBy: nullableString(record.supersededBy),
  };
}

function normalizeAuditRecord(
  value: unknown,
  index: number,
  blockers: string[],
): MoralTradePostClearAuditRecord {
  const record = isRecord(value) ? value : {};
  const prefix = `evaluationInput.records.${index}`;

  if (!isRecord(value)) {
    blockers.push(`${prefix}: object is required`);
  } else {
    blockers.push(...unsupportedKeys(record, RECORD_KEYS, prefix));
  }

  return {
    auditState: enumField(
      record.auditState,
      AUDIT_STATES,
      "pending",
      `${prefix}.auditState`,
      blockers,
      true,
    ),
    auditType: enumField(
      record.auditType,
      AUDIT_TYPES,
      "random_sample",
      `${prefix}.auditType`,
      blockers,
      true,
    ),
    baselineAndEvidenceMatchState: enumField(
      record.baselineAndEvidenceMatchState,
      MATCH_STATES,
      "not_checked",
      `${prefix}.baselineAndEvidenceMatchState`,
      blockers,
      true,
    ),
    classificationMatchState: enumField(
      record.classificationMatchState,
      MATCH_STATES,
      "not_checked",
      `${prefix}.classificationMatchState`,
      blockers,
      true,
    ),
    correctiveActionRefs: stringArrayField(
      record.correctiveActionRefs,
      `${prefix}.correctiveActionRefs`,
      blockers,
    ),
    createdAt: stringField(record.createdAt),
    participantSpecificRowsPublic: booleanField(
      record.participantSpecificRowsPublic,
    ),
    paymentAndReconciliationMatchState: enumField(
      record.paymentAndReconciliationMatchState,
      MATCH_STATES,
      "not_checked",
      `${prefix}.paymentAndReconciliationMatchState`,
      blockers,
      true,
    ),
    policyRef: requiredStringField(
      record.policyRef,
      `${prefix}.policyRef`,
      blockers,
      `submitted-post-clear-audit-policy-${index + 1}`,
    ),
    privateCounterpartyTermsPublic: booleanField(
      record.privateCounterpartyTermsPublic,
    ),
    privacyOrDisclosureMatchState: enumField(
      record.privacyOrDisclosureMatchState,
      MATCH_STATES,
      "not_checked",
      `${prefix}.privacyOrDisclosureMatchState`,
      blockers,
      true,
    ),
    providerPayloadPublic: booleanField(record.providerPayloadPublic),
    publicReputationEffectProhibited: booleanField(
      record.publicReputationEffectProhibited,
      true,
    ),
    rawPaymentEvidencePublic: booleanField(record.rawPaymentEvidencePublic),
    rawReconciliationRowsPublic: booleanField(record.rawReconciliationRowsPublic),
    recipientAcceptanceMatchState: enumField(
      record.recipientAcceptanceMatchState,
      MATCH_STATES,
      "not_checked",
      `${prefix}.recipientAcceptanceMatchState`,
      blockers,
      true,
    ),
    recordId: requiredStringField(
      record.recordId,
      `${prefix}.recordId`,
      blockers,
      `submitted-post-clear-audit-record-${index + 1}`,
    ),
    reviewerDecisionRef: nullableString(record.reviewerDecisionRef),
    reviewerNotesPublic: booleanField(record.reviewerNotesPublic),
    sampledFieldsHash: requiredHashField(
      record.sampledFieldsHash,
      `${prefix}.sampledFieldsHash`,
      blockers,
    ),
    subjectRef: requiredStringField(
      record.subjectRef,
      `${prefix}.subjectRef`,
      blockers,
      `submitted-subject-${index + 1}`,
    ),
    subjectType: enumField(
      record.subjectType,
      SUBJECT_TYPES,
      "cleared_trade_agreement",
      `${prefix}.subjectType`,
      blockers,
      true,
    ),
    termSheetMatchState: enumField(
      record.termSheetMatchState,
      MATCH_STATES,
      "not_checked",
      `${prefix}.termSheetMatchState`,
      blockers,
      true,
    ),
    updatedAt: stringField(record.updatedAt),
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

  const input: MoralTradePostClearAuditEvaluationInput = {
    checkedAt: stringField(value.checkedAt) || undefined,
    policies: Array.isArray(value.policies)
      ? value.policies
          .slice(0, MAX_POLICIES)
          .map((entry, index) => normalizePolicy(entry, index, blockers))
      : [],
    postClearAuditRequired: booleanField(value.postClearAuditRequired),
    records: Array.isArray(value.records)
      ? value.records
          .slice(0, MAX_RECORDS)
          .map((entry, index) => normalizeAuditRecord(entry, index, blockers))
      : [],
    transition: enumField(
      value.transition,
      TRANSITIONS,
      "public_metric_publication",
      "evaluationInput.transition",
      blockers,
      true,
    ),
  };

  return { input, blockers };
}

function normalizeIdempotencyKey(value: unknown, fallbackHash: string) {
  const normalized = stringField(value, "").slice(0, MAX_IDEMPOTENCY_LENGTH);

  return normalized || `post-clear-audit-enforce:${fallbackHash}`;
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
  const contract = getMoralTradePostClearAuditContract();
  const contractValidation = validateMoralTradePostClearAuditContract(contract);

  return buildMoralTradeApiJsonResponse(
    {
      ok: false,
      checkedAt,
      contractVersion: contract.version,
      postClearAuditGateStatus: "blocked",
      postClearSamplingAssignmentAllowed: false,
      auditRecordReviewAllowed: false,
      correctiveActionResolutionAllowed: false,
      paymentReconciliationCloseAllowed: false,
      payoutReleaseAllowed: false,
      publicMetricPublicationAllowed: false,
      releaseGatePromotionAllowed: false,
      stateMutation: false,
      persistence: {
        requested: true,
        status: "not_recorded",
        recordId: null,
        table: "moral_trade_post_clear_audit_enforcement_records",
      },
      contractValidation,
      fallback:
        "Invalid post-clear audit enforcement input creates no enforcement record and cannot authorize sampling assignment, audit review, correction resolution, payment reconciliation close, payout release, public metrics, or release promotion.",
      blockers,
    },
    "private_no_store",
    { status },
  );
}

export async function POST(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(
    request,
    "post_clear_audit_enforce",
  );
  const checkedAt = new Date().toISOString();

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited post-clear audit enforcement creates no enforcement record and cannot authorize sampling assignment, audit review, correction resolution, payment reconciliation close, payout release, public metrics, or release promotion.",
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

  const contract = getMoralTradePostClearAuditContract();
  const contractValidation = validateMoralTradePostClearAuditContract(contract);
  const evaluation = evaluateMoralTradePostClearAudit(normalized.input);
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
    postClearAuditGateStatus:
      evaluation.status === "pass" ? "non_blocking" : "blocked",
    postClearSamplingAssignmentAllowed: false,
    auditRecordReviewAllowed: false,
    correctiveActionResolutionAllowed: false,
    paymentReconciliationCloseAllowed: false,
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
          table: "moral_trade_post_clear_audit_enforcement_records",
        },
        fallback:
          "Post-clear audit enforcement was evaluated but not recorded because Supabase is not configured; no sampling assignment, audit review, correction resolution, payment reconciliation close, payout release, public metric, or release-promotion state changed.",
        blockers: [...blockers, "supabase_unconfigured:post_clear_audit_enforce"],
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
          table: "moral_trade_post_clear_audit_enforcement_records",
        },
        fallback:
          "Authentication is required before recording post-clear audit enforcement. No sampling assignment, audit review, correction resolution, payment reconciliation close, payout release, public metric, or release-promotion state changed.",
        blockers: [...blockers, "authentication_required:post_clear_audit_enforce"],
      },
      "private_no_store",
      { status: 401 },
    );
  }

  const existing = await supabase
    .from("moral_trade_post_clear_audit_enforcement_records")
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
          table: "moral_trade_post_clear_audit_enforcement_records",
        },
      },
      "private_no_store",
    );
  }

  const insert: PostClearAuditEnforcementInsert = {
    audit_record_count: normalized.input.records.length,
    audit_record_review_allowed_bool: false,
    blocker_codes: evaluation.blockers,
    contract_version: contract.version,
    corrective_action_resolution_allowed_bool: false,
    enforcement_input_json: normalized.input as unknown as Json,
    enforcement_status: evaluation.status,
    evaluation_hash: evaluationHash,
    evaluation_result_json: evaluation as unknown as Json,
    idempotency_key: idempotencyKey,
    immutable_policy_count: evaluation.immutablePolicyCount,
    non_blocking_audit_record_count: evaluation.nonBlockingAuditRecordCount,
    owner_profile_id: user.id,
    payment_reconciliation_close_allowed_bool: false,
    policy_record_count: normalized.input.policies.length,
    post_clear_audit_required_bool: evaluation.postClearAuditRequired,
    post_clear_sampling_assignment_allowed_bool: false,
    payout_release_allowed_bool: false,
    public_metric_publication_allowed_bool: false,
    release_gate_promotion_allowed_bool: false,
    required_policy_count: evaluation.requiredPolicyCount,
    required_record_count: evaluation.requiredRecordCount,
    reviewer_decision_count: evaluation.reviewerDecisionCount,
    transition: evaluation.transition,
    user_facing_blocker_categories: evaluation.userFacingBlockerCategories,
    validator_version: MORAL_TRADE_POST_CLEAR_AUDIT_VALIDATOR_VERSION,
  };
  const { data, error } = await supabase
    .from("moral_trade_post_clear_audit_enforcement_records")
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
          table: "moral_trade_post_clear_audit_enforcement_records",
        },
        fallback:
          "The post-clear audit enforcement result could not be recorded. No sampling assignment, audit review, correction resolution, payment reconciliation close, payout release, public metric, or release-promotion state changed.",
        blockers: [...blockers, "database_insert_failed:post_clear_audit_enforce"],
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
        table: "moral_trade_post_clear_audit_enforcement_records",
      },
    },
    "private_no_store",
    { status: contractValidation.status === "pass" ? 201 : 422 },
  );
}
