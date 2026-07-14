import { createHash } from "node:crypto";

import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  MORAL_TRADE_TRADE_CLASSIFICATION_VALIDATOR_VERSION,
  evaluateMoralTradeTradeClassification,
  getMoralTradeTradeClassificationContract,
  validateMoralTradeTradeClassificationContract,
  type MoralTradeCounterfactualAcceptanceState,
  type MoralTradeMetricsEligibility,
  type MoralTradeOrdinaryServiceProcurementReviewState,
  type MoralTradeTradeClassification,
  type MoralTradeTradeClassificationEvaluationInput,
  type MoralTradeTradeClassificationPolicySnapshotStatus,
  type MoralTradeTradeClassificationRecord,
  type MoralTradeTradeClassificationReviewDimension,
  type MoralTradeTradeClassificationReviewStatus,
  type MoralTradeTradeClassificationState,
  type MoralTradeTradeClassificationSubjectType,
  type MoralTradeTradeClassificationTermsState,
  type MoralTradeTradeClassificationTransition,
} from "@/lib/moral-trade/trade-classification";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database, Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_TEXT_FIELD_LENGTH = 800;
const MAX_IDEMPOTENCY_LENGTH = 160;
const MAX_RECORDS = 12;
const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

const TRANSITIONS = new Set<MoralTradeTradeClassificationTransition>([
  "draft_preview",
  "matched_trade_lock",
  "payment_capture",
  "payout_release",
  "public_metric_publication",
  "release_gate_promotion",
]);
const SUBJECT_TYPES = new Set<MoralTradeTradeClassificationSubjectType>([
  "donation_offset",
  "pledge_swap",
  "compensated_moral_action",
  "common_ground_budget",
  "public_goods_round",
  "cleared_trade_agreement",
]);
const CLASSIFICATIONS = new Set<MoralTradeTradeClassification>([
  "pure_moral_trade",
  "mixed_moral_trade",
  "moral_public_good_coalition",
  "ordinary_donation_or_matching",
  "ordinary_service_or_procurement",
  "rejected_threat_or_externality",
]);
const CLASSIFICATION_STATES = new Set<MoralTradeTradeClassificationState>([
  "draft",
  "previewed",
  "reviewed",
  "metrics_excluded",
  "blocked",
  "stale",
  "superseded",
]);
const METRICS_ELIGIBILITIES = new Set<MoralTradeMetricsEligibility>([
  "eligible_for_moral_trade_metrics",
  "excluded_ordinary",
  "excluded_rejected",
  "manual_review",
]);
const COUNTERFACTUAL_STATES = new Set<MoralTradeCounterfactualAcceptanceState>([
  "not_recorded",
  "says_would_not_without_compensation",
  "says_would_anyway",
  "unclear",
  "manual_review",
]);
const ORDINARY_SERVICE_STATES = new Set<MoralTradeOrdinaryServiceProcurementReviewState>([
  "not_required",
  "under_review",
  "ordinary_service_blocking",
  "non_blocking",
  "manual_review",
]);
const TERMS_STATES = new Set<MoralTradeTradeClassificationTermsState>([
  "draft",
  "previewed",
  "locked",
  "blocked",
  "superseded",
]);
const POLICY_STATUSES = new Set<MoralTradeTradeClassificationPolicySnapshotStatus>([
  "resolved_immutable",
  "missing",
  "mutable",
  "stale",
  "superseded",
]);
const REVIEW_DIMENSIONS = new Set<MoralTradeTradeClassificationReviewDimension>([
  "legal_jurisdiction",
  "labor_employment",
  "tax_reporting",
  "coercion_undue_influence",
  "vulnerability_undue_inducement",
  "ordinary_service_procurement",
  "externality",
  "anti_corruption_process_integrity",
]);
const REVIEW_STATUSES = new Set<MoralTradeTradeClassificationReviewStatus>([
  "passed",
  "not_required_for_stage",
  "missing",
  "under_review",
  "failed",
  "blocked",
  "stale",
  "superseded",
]);
const REQUEST_KEYS = new Set(["evaluationInput", "idempotencyKey"]);
const EVALUATION_INPUT_KEYS = new Set(["checkedAt", "records", "transition"]);
const RECORD_KEYS = new Set([
  "classificationId",
  "classificationState",
  "compensationTermsFrozen",
  "evidenceBurdenFrozen",
  "exactActionFrozen",
  "exitRemedyRuleFrozen",
  "expiresAt",
  "metricsEligibility",
  "moralTradeClassificationRationaleHash",
  "ordinaryServiceProcurementReviewState",
  "payerMoralReasonHash",
  "performerCounterfactualAcceptanceState",
  "policySnapshotStatus",
  "publicBadgeExposed",
  "reviewPeriodFrozen",
  "reviewStatuses",
  "reviewedAt",
  "subjectRef",
  "subjectType",
  "supersededBy",
  "termsState",
  "tradeClassification",
]);

type TradeClassificationEnforcementInsert =
  Database["public"]["Tables"]["moral_trade_trade_classification_enforcement_records"]["Insert"];

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

function booleanField(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function nullableString(value: unknown) {
  const normalized = stringField(value);

  return normalized || null;
}

function hashField(value: unknown) {
  const normalized = stringField(value);

  return HASH_PATTERN.test(normalized) ? normalized : normalized;
}

function nullableHash(value: unknown) {
  const normalized = stringField(value);

  return normalized ? normalized : null;
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
    .map((key) => `${prefix}.${key}: unsupported trade-classification enforcement key`);
}

function normalizeReviewStatuses(
  value: unknown,
  index: number,
  blockers: string[],
): MoralTradeTradeClassificationRecord["reviewStatuses"] {
  const record = isRecord(value) ? value : {};

  if (!isRecord(value)) {
    blockers.push(`evaluationInput.records.${index}.reviewStatuses: object is required`);
  } else {
    blockers.push(
      ...unsupportedKeys(
        record,
        new Set([...REVIEW_DIMENSIONS]),
        `evaluationInput.records.${index}.reviewStatuses`,
      ),
    );
  }

  return Object.fromEntries(
    [...REVIEW_DIMENSIONS].map((dimension) => [
      dimension,
      enumField(
        record[dimension],
        REVIEW_STATUSES,
        "missing",
        `evaluationInput.records.${index}.reviewStatuses.${dimension}`,
        blockers,
      ),
    ]),
  ) as MoralTradeTradeClassificationRecord["reviewStatuses"];
}

function normalizeClassificationRecord(
  value: unknown,
  index: number,
  blockers: string[],
): MoralTradeTradeClassificationRecord {
  const record = isRecord(value) ? value : {};

  if (!isRecord(value)) {
    blockers.push(`evaluationInput.records.${index}: object is required`);
  } else {
    blockers.push(...unsupportedKeys(record, RECORD_KEYS, `evaluationInput.records.${index}`));
  }

  return {
    classificationId: stringField(
      record.classificationId,
      `submitted-trade-classification-${index + 1}`,
    ),
    classificationState: enumField(
      record.classificationState,
      CLASSIFICATION_STATES,
      "draft",
      `evaluationInput.records.${index}.classificationState`,
      blockers,
    ),
    compensationTermsFrozen: booleanField(record.compensationTermsFrozen),
    evidenceBurdenFrozen: booleanField(record.evidenceBurdenFrozen),
    exactActionFrozen: booleanField(record.exactActionFrozen),
    exitRemedyRuleFrozen: booleanField(record.exitRemedyRuleFrozen),
    expiresAt: nullableString(record.expiresAt),
    metricsEligibility: enumField(
      record.metricsEligibility,
      METRICS_ELIGIBILITIES,
      "manual_review",
      `evaluationInput.records.${index}.metricsEligibility`,
      blockers,
    ),
    moralTradeClassificationRationaleHash: hashField(
      record.moralTradeClassificationRationaleHash,
    ),
    ordinaryServiceProcurementReviewState: enumField(
      record.ordinaryServiceProcurementReviewState,
      ORDINARY_SERVICE_STATES,
      "under_review",
      `evaluationInput.records.${index}.ordinaryServiceProcurementReviewState`,
      blockers,
    ),
    payerMoralReasonHash: nullableHash(record.payerMoralReasonHash),
    performerCounterfactualAcceptanceState: enumField(
      record.performerCounterfactualAcceptanceState,
      COUNTERFACTUAL_STATES,
      "not_recorded",
      `evaluationInput.records.${index}.performerCounterfactualAcceptanceState`,
      blockers,
    ),
    policySnapshotStatus: enumField(
      record.policySnapshotStatus,
      POLICY_STATUSES,
      "missing",
      `evaluationInput.records.${index}.policySnapshotStatus`,
      blockers,
    ),
    publicBadgeExposed: booleanField(record.publicBadgeExposed),
    reviewPeriodFrozen: booleanField(record.reviewPeriodFrozen),
    reviewedAt: stringField(record.reviewedAt),
    reviewStatuses: normalizeReviewStatuses(record.reviewStatuses, index, blockers),
    subjectRef: stringField(record.subjectRef, `submitted-subject-${index + 1}`),
    subjectType: enumField(
      record.subjectType,
      SUBJECT_TYPES,
      "compensated_moral_action",
      `evaluationInput.records.${index}.subjectType`,
      blockers,
    ),
    supersededBy: nullableString(record.supersededBy),
    termsState: enumField(
      record.termsState,
      TERMS_STATES,
      "draft",
      `evaluationInput.records.${index}.termsState`,
      blockers,
    ),
    tradeClassification: enumField(
      record.tradeClassification,
      CLASSIFICATIONS,
      "ordinary_service_or_procurement",
      `evaluationInput.records.${index}.tradeClassification`,
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

  const records = Array.isArray(value.records)
    ? value.records
        .slice(0, MAX_RECORDS)
        .map((entry, index) => normalizeClassificationRecord(entry, index, blockers))
    : [];

  const input: MoralTradeTradeClassificationEvaluationInput = {
    checkedAt: stringField(value.checkedAt) || undefined,
    records,
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

  return normalized || `trade-classification-enforce:${fallbackHash}`;
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
  const contract = getMoralTradeTradeClassificationContract();
  const contractValidation = validateMoralTradeTradeClassificationContract(contract);

  return buildMoralTradeApiJsonResponse(
    {
      ok: false,
      checkedAt,
      contractVersion: contract.version,
      tradeClassificationGateStatus: "blocked",
      lockTransitionAllowed: false,
      paymentTransitionAllowed: false,
      payoutReleaseAllowed: false,
      relianceBearingTransitionAllowed: false,
      publicMetricPublicationAllowed: false,
      releaseGatePromotionAllowed: false,
      stateMutation: false,
      persistence: {
        requested: true,
        status: "not_recorded",
        recordId: null,
        table: "moral_trade_trade_classification_enforcement_records",
      },
      contractValidation,
      fallback:
        "Invalid trade-classification enforcement input creates no enforcement record and cannot authorize lock, payment, payout, reliance, public metrics, or release promotion.",
      blockers,
    },
    "private_no_store",
    { status },
  );
}

export async function POST(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(
    request,
    "trade_classification_enforce",
  );
  const checkedAt = new Date().toISOString();

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited trade-classification enforcement creates no enforcement record and cannot authorize lock, payment, payout, reliance, public metrics, or release promotion.",
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

  const contract = getMoralTradeTradeClassificationContract();
  const contractValidation = validateMoralTradeTradeClassificationContract(contract);
  const evaluation = evaluateMoralTradeTradeClassification(normalized.input);
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
    tradeClassificationGateStatus:
      evaluation.status === "pass" ? "non_blocking" : "blocked",
    lockTransitionAllowed: false,
    paymentTransitionAllowed: false,
    payoutReleaseAllowed: false,
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
          table: "moral_trade_trade_classification_enforcement_records",
        },
        fallback:
          "Trade-classification enforcement was evaluated but not recorded because Supabase is not configured; no lock, payment, payout, reliance, public metric, or release-promotion state changed.",
        blockers: [...blockers, "supabase_unconfigured:trade_classification_enforce"],
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
          table: "moral_trade_trade_classification_enforcement_records",
        },
        fallback:
          "Authentication is required before recording trade-classification enforcement. No lock, payment, payout, reliance, public metric, or release-promotion state changed.",
        blockers: [...blockers, "authentication_required:trade_classification_enforce"],
      },
      "private_no_store",
      { status: 401 },
    );
  }

  const existing = await supabase
    .from("moral_trade_trade_classification_enforcement_records")
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
          table: "moral_trade_trade_classification_enforcement_records",
        },
      },
      "private_no_store",
    );
  }

  const insert: TradeClassificationEnforcementInsert = {
    blocker_codes: evaluation.blockers,
    classification_record_count: normalized.input.records.length,
    contract_version: contract.version,
    enforcement_input_json: normalized.input as unknown as Json,
    enforcement_status: evaluation.status,
    evaluation_hash: evaluationHash,
    evaluation_result_json: evaluation as unknown as Json,
    idempotency_key: idempotencyKey,
    lock_transition_allowed_bool: false,
    metric_eligible_record_count: evaluation.metricEligibleRecordCount,
    owner_profile_id: user.id,
    passing_record_count: evaluation.passingRecordCount,
    payment_transition_allowed_bool: false,
    payout_release_allowed_bool: false,
    public_metric_publication_allowed_bool: false,
    release_gate_promotion_allowed_bool: false,
    reliance_bearing_transition_allowed_bool: false,
    required_record_count: evaluation.requiredRecordCount,
    transition: evaluation.transition,
    user_facing_blocker_categories: evaluation.userFacingBlockerCategories,
    validator_version: MORAL_TRADE_TRADE_CLASSIFICATION_VALIDATOR_VERSION,
  };
  const { data, error } = await supabase
    .from("moral_trade_trade_classification_enforcement_records")
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
          table: "moral_trade_trade_classification_enforcement_records",
        },
        fallback:
          "The trade-classification enforcement result could not be recorded. No lock, payment, payout, reliance, public metric, or release-promotion state changed.",
        blockers: [...blockers, "database_insert_failed:trade_classification_enforce"],
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
        table: "moral_trade_trade_classification_enforcement_records",
      },
    },
    "private_no_store",
    { status: contractValidation.status === "pass" ? 201 : 422 },
  );
}
