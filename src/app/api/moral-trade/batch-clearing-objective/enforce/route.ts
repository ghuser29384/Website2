import { createHash } from "node:crypto";

import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  MORAL_TRADE_BATCH_CLEARING_OBJECTIVE_VALIDATOR_VERSION,
  evaluateMoralTradeBatchClearingObjective,
  getMoralTradeBatchClearingObjectiveContract,
  validateMoralTradeBatchClearingObjectiveContract,
  type MoralTradeBatchClearingAllocationDriver,
  type MoralTradeBatchClearingObjectiveEvaluationInput,
  type MoralTradeBatchClearingObjectivePolicyStatus,
  type MoralTradeBatchClearingObjectiveRecord,
  type MoralTradeBatchClearingObjectiveResultState,
  type MoralTradeBatchClearingObjectiveSubjectType,
  type MoralTradeBatchClearingObjectiveTransition,
  type MoralTradeBatchClearingObjectiveType,
  type MoralTradeBatchClearingTieBreakFairnessRuleType,
} from "@/lib/moral-trade/batch-clearing-objective";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database, Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_TEXT_FIELD_LENGTH = 800;
const MAX_IDEMPOTENCY_LENGTH = 160;
const MAX_RECORDS = 48;
const MAX_ARRAY_ITEMS = 48;
const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

const TRANSITIONS = new Set<MoralTradeBatchClearingObjectiveTransition>([
  "draft_preview",
  "match_candidate_generation",
  "matched_trade_lock",
  "clearing_run",
  "payment_capture",
  "reliance",
  "public_metric_publication",
  "release_gate_promotion",
]);
const SUBJECT_TYPES = new Set<MoralTradeBatchClearingObjectiveSubjectType>([
  "donation_offset_batch",
  "donation_offset_offer_pool",
  "matched_trade_lock_proposal",
  "cleared_trade_agreement",
  "public_metric_batch",
  "release_gate",
]);
const OBJECTIVE_TYPES = new Set<MoralTradeBatchClearingObjectiveType>([
  "maximize_safe_matched_volume",
  "maximize_safe_participant_count",
  "minimize_unmatched_residual",
  "manual_review",
]);
const TIE_BREAK_FAIRNESS_RULE_TYPES =
  new Set<MoralTradeBatchClearingTieBreakFairnessRuleType>([
    "seeded_deterministic_hash",
    "pro_rata_by_frozen_capacity",
    "round_robin_by_hash",
    "reviewer_approved_manual",
    "manual_review",
  ]);
const ALLOCATION_DRIVERS = new Set<MoralTradeBatchClearingAllocationDriver>([
  "objective_score",
  "frozen_capacity",
  "participant_confirmed_bounds",
  "seeded_hash",
  "moral_score",
  "operator_preference",
  "public_pressure",
  "timestamp_race",
  "private_cap_leakage",
  "database_order",
  "protected_trait",
  "hidden_reviewer_preference",
]);
const RESULT_STATES = new Set<MoralTradeBatchClearingObjectiveResultState>([
  "draft",
  "reproducible",
  "under_review",
  "non_blocking",
  "blocked",
  "superseded",
]);
const POLICY_STATUSES = new Set<MoralTradeBatchClearingObjectivePolicyStatus>([
  "resolved_immutable",
  "missing",
  "mutable",
  "stale",
  "superseded",
]);
const REQUEST_KEYS = new Set(["evaluationInput", "idempotencyKey"]);
const EVALUATION_INPUT_KEYS = new Set([
  "batchObjectiveRequired",
  "checkedAt",
  "records",
  "transition",
]);
const RECORD_KEYS = new Set([
  "allocationDriversUsed",
  "batchClearingObjectivePolicyRef",
  "createdAt",
  "deterministicAlgorithmVersion",
  "excludedRecordsHash",
  "inputBundleHash",
  "objectiveFrozenAt",
  "objectiveResultHash",
  "objectiveType",
  "policyStatus",
  "recordId",
  "reproducibilityCheckRef",
  "resultState",
  "reviewerDecisionRef",
  "scarceCapacity",
  "subjectId",
  "subjectType",
  "tieBreakFairnessPolicyRef",
  "tieBreakFairnessRuleType",
  "updatedAt",
]);

type BatchClearingObjectiveEnforcementInsert =
  Database["public"]["Tables"]["moral_trade_batch_clearing_objective_enforcement_records"]["Insert"];

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

function nullableHashField(value: unknown, key: string, blockers: string[]) {
  const normalized = nullableString(value);

  if (normalized !== null && !HASH_PATTERN.test(normalized)) {
    blockers.push(`${key}: sha256 hash is required when provided`);
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

    return [];
  }

  if (value.length > MAX_ARRAY_ITEMS) {
    blockers.push(`${key}: at most ${MAX_ARRAY_ITEMS} entries are supported`);
  }

  return value
    .slice(0, MAX_ARRAY_ITEMS)
    .map((entry, index) =>
      enumField(entry, allowed, fallback, `${key}.${index}`, blockers, true),
    );
}

function unsupportedKeys(
  value: Record<string, unknown>,
  allowed: Set<string>,
  prefix: string,
) {
  return Object.keys(value)
    .filter((key) => !allowed.has(key))
    .map((key) => `${prefix}.${key}: unsupported batch-clearing objective enforcement key`);
}

function normalizeRecord(
  value: unknown,
  index: number,
  blockers: string[],
): MoralTradeBatchClearingObjectiveRecord {
  const record = isRecord(value) ? value : {};
  const prefix = `evaluationInput.records.${index}`;

  if (!isRecord(value)) {
    blockers.push(`${prefix}: object is required`);
  } else {
    blockers.push(...unsupportedKeys(record, RECORD_KEYS, prefix));
  }

  return {
    allocationDriversUsed: enumArrayField(
      record.allocationDriversUsed,
      ALLOCATION_DRIVERS,
      "database_order",
      `${prefix}.allocationDriversUsed`,
      blockers,
    ),
    batchClearingObjectivePolicyRef: requiredStringField(
      record.batchClearingObjectivePolicyRef,
      `${prefix}.batchClearingObjectivePolicyRef`,
      blockers,
      `submitted-batch-clearing-objective-policy-${index + 1}`,
    ),
    createdAt: stringField(record.createdAt),
    deterministicAlgorithmVersion: requiredStringField(
      record.deterministicAlgorithmVersion,
      `${prefix}.deterministicAlgorithmVersion`,
      blockers,
    ),
    excludedRecordsHash: nullableHashField(
      record.excludedRecordsHash,
      `${prefix}.excludedRecordsHash`,
      blockers,
    ),
    inputBundleHash: nullableHashField(
      record.inputBundleHash,
      `${prefix}.inputBundleHash`,
      blockers,
    ),
    objectiveFrozenAt: nullableString(record.objectiveFrozenAt),
    objectiveResultHash: nullableHashField(
      record.objectiveResultHash,
      `${prefix}.objectiveResultHash`,
      blockers,
    ),
    objectiveType: enumField(
      record.objectiveType,
      OBJECTIVE_TYPES,
      "manual_review",
      `${prefix}.objectiveType`,
      blockers,
      true,
    ),
    policyStatus: enumField(
      record.policyStatus,
      POLICY_STATUSES,
      "missing",
      `${prefix}.policyStatus`,
      blockers,
      true,
    ),
    recordId: requiredStringField(
      record.recordId,
      `${prefix}.recordId`,
      blockers,
      `submitted-batch-clearing-objective-record-${index + 1}`,
    ),
    reproducibilityCheckRef: nullableString(record.reproducibilityCheckRef),
    resultState: enumField(
      record.resultState,
      RESULT_STATES,
      "draft",
      `${prefix}.resultState`,
      blockers,
      true,
    ),
    reviewerDecisionRef: nullableString(record.reviewerDecisionRef),
    scarceCapacity: booleanField(record.scarceCapacity),
    subjectId: requiredStringField(
      record.subjectId,
      `${prefix}.subjectId`,
      blockers,
      `submitted-batch-clearing-objective-subject-${index + 1}`,
    ),
    subjectType: enumField(
      record.subjectType,
      SUBJECT_TYPES,
      "donation_offset_batch",
      `${prefix}.subjectType`,
      blockers,
      true,
    ),
    tieBreakFairnessPolicyRef: requiredStringField(
      record.tieBreakFairnessPolicyRef,
      `${prefix}.tieBreakFairnessPolicyRef`,
      blockers,
    ),
    tieBreakFairnessRuleType: enumField(
      record.tieBreakFairnessRuleType,
      TIE_BREAK_FAIRNESS_RULE_TYPES,
      "manual_review",
      `${prefix}.tieBreakFairnessRuleType`,
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

  if (Array.isArray(value.records) && value.records.length > MAX_RECORDS) {
    blockers.push(`evaluationInput.records: at most ${MAX_RECORDS} records are supported`);
  }

  const input: MoralTradeBatchClearingObjectiveEvaluationInput = {
    batchObjectiveRequired: booleanField(value.batchObjectiveRequired),
    checkedAt: stringField(value.checkedAt) || undefined,
    records: Array.isArray(value.records)
      ? value.records
          .slice(0, MAX_RECORDS)
          .map((entry, index) => normalizeRecord(entry, index, blockers))
      : [],
    transition: enumField(
      value.transition,
      TRANSITIONS,
      "draft_preview",
      "evaluationInput.transition",
      blockers,
      true,
    ),
  };

  if (!Array.isArray(value.records)) {
    blockers.push("evaluationInput.records: array is required");
  }

  return { input, blockers };
}

function normalizeIdempotencyKey(value: unknown, fallbackHash: string) {
  const normalized = stringField(value, "").slice(0, MAX_IDEMPOTENCY_LENGTH);

  return normalized || `batch-clearing-objective-enforce:${fallbackHash}`;
}

function authorizationFields() {
  return {
    clearingRunAllowed: false,
    draftPreviewAllowed: false,
    matchCandidateGenerationAllowed: false,
    matchedTradeLockAllowed: false,
    paymentCaptureAllowed: false,
    publicMetricPublicationAllowed: false,
    releaseGatePromotionAllowed: false,
    relianceAllowed: false,
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
  const contract = getMoralTradeBatchClearingObjectiveContract();
  const contractValidation =
    validateMoralTradeBatchClearingObjectiveContract(contract);

  return buildMoralTradeApiJsonResponse(
    {
      ok: false,
      checkedAt,
      contractVersion: contract.version,
      batchClearingObjectiveGateStatus: "blocked",
      ...authorizationFields(),
      stateMutation: false,
      persistence: {
        requested: true,
        status: "not_recorded",
        recordId: null,
        table: "moral_trade_batch_clearing_objective_enforcement_records",
      },
      contractValidation,
      fallback:
        "Invalid batch-clearing objective enforcement input creates no enforcement record and cannot authorize draft preview, matching, lock, clearing, payment capture, reliance, public metric publication, or release promotion.",
      blockers,
    },
    "private_no_store",
    { status },
  );
}

export async function POST(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(
    request,
    "batch_clearing_objective_enforce",
  );
  const checkedAt = new Date().toISOString();

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited batch-clearing objective enforcement creates no enforcement record and cannot authorize draft preview, matching, lock, clearing, payment capture, reliance, public metric publication, or release promotion.",
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

  const contract = getMoralTradeBatchClearingObjectiveContract();
  const contractValidation =
    validateMoralTradeBatchClearingObjectiveContract(contract);
  const evaluation = evaluateMoralTradeBatchClearingObjective(normalized.input);
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
    batchClearingObjectiveGateStatus:
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
          table: "moral_trade_batch_clearing_objective_enforcement_records",
        },
        fallback:
          "Batch-clearing objective enforcement was evaluated but not recorded because Supabase is not configured; no draft preview, matching, lock, clearing, payment capture, reliance, public metric publication, or release-promotion state changed.",
        blockers: [
          ...blockers,
          "supabase_unconfigured:batch_clearing_objective_enforce",
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
          table: "moral_trade_batch_clearing_objective_enforcement_records",
        },
        fallback:
          "Authentication is required before recording batch-clearing objective enforcement. No draft preview, matching, lock, clearing, payment capture, reliance, public metric publication, or release-promotion state changed.",
        blockers: [
          ...blockers,
          "authentication_required:batch_clearing_objective_enforce",
        ],
      },
      "private_no_store",
      { status: 401 },
    );
  }

  const existing = await supabase
    .from("moral_trade_batch_clearing_objective_enforcement_records")
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
          table: "moral_trade_batch_clearing_objective_enforcement_records",
        },
      },
      "private_no_store",
    );
  }

  const insert: BatchClearingObjectiveEnforcementInsert = {
    batch_objective_required_bool: evaluation.batchObjectiveRequired,
    blocker_codes: evaluation.blockers,
    clearing_run_allowed_bool: false,
    contract_version: contract.version,
    draft_preview_allowed_bool: false,
    enforcement_input_json: normalized.input as unknown as Json,
    enforcement_status: evaluation.status,
    evaluation_hash: evaluationHash,
    evaluation_result_json: evaluation as unknown as Json,
    idempotency_key: idempotencyKey,
    match_candidate_generation_allowed_bool: false,
    matched_trade_lock_allowed_bool: false,
    owner_profile_id: user.id,
    payment_capture_allowed_bool: false,
    prohibited_allocation_driver_count:
      evaluation.prohibitedAllocationDriverCount,
    public_metric_publication_allowed_bool: false,
    record_count: normalized.input.records.length,
    release_gate_promotion_allowed_bool: false,
    reliance_allowed_bool: false,
    reproducible_result_count: evaluation.reproducibleResultCount,
    reviewed_record_count: evaluation.reviewedRecordCount,
    transition: evaluation.transition,
    user_facing_blocker_categories: evaluation.userFacingBlockerCategories,
    validator_version: MORAL_TRADE_BATCH_CLEARING_OBJECTIVE_VALIDATOR_VERSION,
  };
  const { data, error } = await supabase
    .from("moral_trade_batch_clearing_objective_enforcement_records")
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
          table: "moral_trade_batch_clearing_objective_enforcement_records",
        },
        fallback:
          "The batch-clearing objective enforcement result could not be recorded. No draft preview, matching, lock, clearing, payment capture, reliance, public metric publication, or release-promotion state changed.",
        blockers: [
          ...blockers,
          "database_insert_failed:batch_clearing_objective_enforce",
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
        table: "moral_trade_batch_clearing_objective_enforcement_records",
      },
    },
    "private_no_store",
    { status: contractValidation.status === "pass" ? 201 : 422 },
  );
}
