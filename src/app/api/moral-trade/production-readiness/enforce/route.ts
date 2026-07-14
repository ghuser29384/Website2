import { createHash } from "node:crypto";

import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  MORAL_TRADE_PRODUCTION_READINESS_VALIDATOR_VERSION,
  evaluateMoralTradeProductionReadiness,
  getMoralTradeProductionReadinessContract,
  validateMoralTradeProductionReadinessContract,
  type MoralTradeProductionControlKey,
  type MoralTradeProductionControlRecord,
  type MoralTradeProductionControlStatus,
  type MoralTradeProductionPolicySnapshotStatus,
  type MoralTradeProductionReadinessEvaluationInput,
  type MoralTradeProductionReadinessGate,
} from "@/lib/moral-trade/production-readiness";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database, Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_TEXT_FIELD_LENGTH = 1_200;
const MAX_IDEMPOTENCY_LENGTH = 160;
const MAX_RECORDS = 64;
const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

const GATES = new Set<MoralTradeProductionReadinessGate>([
  "sandbox_calculation_preview",
  "real_money_capture",
  "payout_release",
  "round_close",
  "public_money_metric_release",
  "privacy_disclosure",
  "release_gate_promotion",
  "non_emergency_privileged_change",
]);
const CONTROL_KEYS = new Set<MoralTradeProductionControlKey>([
  "account_security",
  "backup_recovery",
  "deployment_configuration",
  "schema_migration",
  "environment_data_isolation",
  "financial_reconciliation",
  "audit_integrity",
  "data_security_key_management",
]);
const CONTROL_STATUSES = new Set<MoralTradeProductionControlStatus>([
  "ready",
  "not_required_for_stage",
  "missing",
  "failed",
  "stale",
  "under_review",
  "drift_detected",
  "unverified",
  "restore_failed",
  "variance_unresolved",
  "high_risk_event_open",
]);
const POLICY_STATUSES = new Set<MoralTradeProductionPolicySnapshotStatus>([
  "resolved_immutable",
  "missing",
  "mutable",
  "stale",
  "superseded",
]);
const REQUEST_KEYS = new Set(["evaluationInput", "idempotencyKey"]);
const EVALUATION_INPUT_KEYS = new Set(["checkedAt", "gate", "records"]);
const RECORD_KEYS = new Set([
  "controlKey",
  "evidenceHash",
  "lastVerifiedAt",
  "policySnapshotStatus",
  "recordTable",
  "status",
  "subjectRef",
]);

type ProductionReadinessEnforcementInsert =
  Database["public"]["Tables"]["moral_trade_production_readiness_enforcement_records"]["Insert"];

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

function requiredHashField(value: unknown, key: string, blockers: string[]) {
  const normalized = stringField(value);

  if (!HASH_PATTERN.test(normalized)) {
    blockers.push(`${key}: sha256 hash is required`);
  }

  return normalized;
}

function enumField<T extends string>(
  value: unknown,
  allowed: Iterable<T>,
  fallback: T,
  key: string,
  blockers: string[],
  required = false,
) {
  const normalized = stringField(value);
  const allowedSet = allowed instanceof Set ? allowed : new Set(allowed);

  if (allowedSet.has(normalized as T)) {
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
    .map((key) => `${prefix}.${key}: unsupported production-readiness enforcement key`);
}

function normalizeRecord(
  value: unknown,
  index: number,
  blockers: string[],
): MoralTradeProductionControlRecord {
  const record = isRecord(value) ? value : {};
  const prefix = `evaluationInput.records.${index}`;

  if (!isRecord(value)) {
    blockers.push(`${prefix}: object is required`);
  } else {
    blockers.push(...unsupportedKeys(record, RECORD_KEYS, prefix));
  }

  return {
    controlKey: enumField<MoralTradeProductionControlKey>(
      record.controlKey,
      CONTROL_KEYS,
      "environment_data_isolation",
      `${prefix}.controlKey`,
      blockers,
      true,
    ),
    evidenceHash: requiredHashField(record.evidenceHash, `${prefix}.evidenceHash`, blockers),
    lastVerifiedAt: requiredStringField(
      record.lastVerifiedAt,
      `${prefix}.lastVerifiedAt`,
      blockers,
    ),
    policySnapshotStatus: enumField<MoralTradeProductionPolicySnapshotStatus>(
      record.policySnapshotStatus,
      POLICY_STATUSES,
      "missing",
      `${prefix}.policySnapshotStatus`,
      blockers,
      true,
    ),
    recordTable: requiredStringField(record.recordTable, `${prefix}.recordTable`, blockers),
    status: enumField<MoralTradeProductionControlStatus>(
      record.status,
      CONTROL_STATUSES,
      "missing",
      `${prefix}.status`,
      blockers,
      true,
    ),
    subjectRef: stringField(record.subjectRef) || undefined,
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

  const input: MoralTradeProductionReadinessEvaluationInput = {
    checkedAt: stringField(value.checkedAt) || undefined,
    gate: enumField<MoralTradeProductionReadinessGate>(
      value.gate,
      GATES,
      "sandbox_calculation_preview",
      "evaluationInput.gate",
      blockers,
      true,
    ),
    records: Array.isArray(value.records)
      ? value.records
          .slice(0, MAX_RECORDS)
          .map((entry, index) => normalizeRecord(entry, index, blockers))
      : [],
  };

  if (!Array.isArray(value.records)) {
    blockers.push("evaluationInput.records: array is required");
  }

  return { input, blockers };
}

function normalizeIdempotencyKey(value: unknown, fallbackHash: string) {
  const normalized = stringField(value).slice(0, MAX_IDEMPOTENCY_LENGTH);

  return normalized || `production-readiness-enforce:${fallbackHash}`;
}

function authorizationFields() {
  return {
    nonEmergencyPrivilegedChangeAllowed: false,
    payoutReleaseAllowed: false,
    privacyDisclosureAllowed: false,
    publicMoneyMetricReleaseAllowed: false,
    realMoneyCaptureAllowed: false,
    releaseGatePromotionAllowed: false,
    roundCloseAllowed: false,
    sandboxCalculationPreviewAllowed: false,
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
  const contract = getMoralTradeProductionReadinessContract();
  const contractValidation = validateMoralTradeProductionReadinessContract(contract);

  return buildMoralTradeApiJsonResponse(
    {
      ok: false,
      checkedAt,
      contractVersion: contract.version,
      productionReadinessGateStatus: "blocked",
      ...authorizationFields(),
      stateMutation: false,
      persistence: {
        requested: true,
        status: "not_recorded",
        recordId: null,
        table: "moral_trade_production_readiness_enforcement_records",
      },
      contractValidation,
      fallback:
        "Invalid production-readiness enforcement input creates no enforcement record and cannot authorize sandbox preview, money capture, payout release, round close, public money metric release, privacy disclosure, release promotion, or privileged change.",
      blockers,
    },
    "private_no_store",
    { status },
  );
}

export async function POST(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "production_readiness_enforce");
  const checkedAt = new Date().toISOString();

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited production-readiness enforcement creates no enforcement record and cannot authorize sandbox preview, money capture, payout release, round close, public money metric release, privacy disclosure, release promotion, or privileged change.",
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

  const contract = getMoralTradeProductionReadinessContract();
  const contractValidation = validateMoralTradeProductionReadinessContract(contract);
  const evaluation = evaluateMoralTradeProductionReadiness(normalized.input);
  const evaluationHash = hashJson({
    contractVersion: contract.version,
    evaluation,
    normalizedInput: normalized.input,
  });
  const idempotencyKey = normalizeIdempotencyKey(body.idempotencyKey, evaluationHash);
  const blockers = [...contractValidation.blockers, ...evaluation.blockers];
  const basePayload = {
    checkedAt,
    contractVersion: contract.version,
    productionReadinessGateStatus: evaluation.status === "pass" ? "non_blocking" : "blocked",
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
          table: "moral_trade_production_readiness_enforcement_records",
        },
        fallback:
          "Production-readiness enforcement was evaluated but not recorded because Supabase is not configured; no sandbox preview, money capture, payout release, round close, public metric, privacy disclosure, release-promotion, or privileged-change state changed.",
        blockers: [...blockers, "supabase_unconfigured:production_readiness_enforce"],
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
          table: "moral_trade_production_readiness_enforcement_records",
        },
        fallback:
          "Authentication is required before recording production-readiness enforcement. No sandbox preview, money capture, payout release, round close, public metric, privacy disclosure, release-promotion, or privileged-change state changed.",
        blockers: [...blockers, "authentication_required:production_readiness_enforce"],
      },
      "private_no_store",
      { status: 401 },
    );
  }

  const existing = await supabase
    .from("moral_trade_production_readiness_enforcement_records")
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
          table: "moral_trade_production_readiness_enforcement_records",
        },
      },
      "private_no_store",
    );
  }

  const insert: ProductionReadinessEnforcementInsert = {
    blocker_codes: blockers,
    blocker_count: blockers.length,
    contract_version: contract.version,
    enforcement_input_json: normalized.input as unknown as Json,
    enforcement_status: evaluation.status,
    evaluation_hash: evaluationHash,
    evaluation_result_json: evaluation as unknown as Json,
    gate: evaluation.gate,
    idempotency_key: idempotencyKey,
    non_emergency_privileged_change_allowed_bool: false,
    owner_profile_id: user.id,
    passing_control_count: evaluation.passingControlCount,
    payout_release_allowed_bool: false,
    privacy_disclosure_allowed_bool: false,
    public_money_metric_release_allowed_bool: false,
    real_money_capture_allowed_bool: false,
    record_count: normalized.input.records.length,
    release_gate_promotion_allowed_bool: false,
    required_control_count: evaluation.requiredControlCount,
    round_close_allowed_bool: false,
    sandbox_calculation_preview_allowed_bool: false,
    user_facing_blocker_categories: evaluation.userFacingBlockerCategories,
    validator_version: MORAL_TRADE_PRODUCTION_READINESS_VALIDATOR_VERSION,
  };
  const { data, error } = await supabase
    .from("moral_trade_production_readiness_enforcement_records")
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
          table: "moral_trade_production_readiness_enforcement_records",
        },
        fallback:
          "The production-readiness enforcement result could not be recorded. No sandbox preview, money capture, payout release, round close, public metric, privacy disclosure, release-promotion, or privileged-change state changed.",
        blockers: [...blockers, "database_insert_failed:production_readiness_enforce"],
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
        table: "moral_trade_production_readiness_enforcement_records",
      },
    },
    "private_no_store",
  );
}
