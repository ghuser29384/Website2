import { createHash } from "node:crypto";

import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  MORAL_TRADE_RELEASE_GATE_VALIDATOR_VERSION,
  evaluateMoralTradeReleaseGate,
  getMoralTradeReleaseGateContract,
  validateMoralTradeReleaseGateContract,
  type MoralTradePolicySnapshotStatus,
  type MoralTradePrivilegedActionStatus,
  type MoralTradeReleaseGateEvaluationInput,
  type MoralTradeReleaseGateRequirementResult,
  type MoralTradeReleaseGateRequirementStatus,
  type MoralTradeReleaseStage,
} from "@/lib/moral-trade/release-gates";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database, Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_TEXT_FIELD_LENGTH = 1_200;
const MAX_IDEMPOTENCY_LENGTH = 160;
const MAX_REQUIREMENT_RESULTS = 160;

const STAGES = new Set<MoralTradeReleaseStage>([
  "public_goods_preview",
  "donation_offset_payable",
  "pledge_swap_reliance_manual_pilot",
  "capped_real_money_release",
  "public_metric_release",
]);
const REQUIREMENT_STATUSES = new Set<MoralTradeReleaseGateRequirementStatus>([
  "passed",
  "not_required_for_stage",
  "waived_by_neutral_review",
  "failed",
  "missing",
  "stale",
  "unknown",
  "under_review",
]);
const POLICY_STATUSES = new Set<MoralTradePolicySnapshotStatus>([
  "resolved_immutable",
  "missing",
  "mutable",
  "stale",
  "superseded",
]);
const PRIVILEGED_ACTION_STATUSES = new Set<MoralTradePrivilegedActionStatus>([
  "not_required",
  "dual_control_approved",
  "neutral_review_approved",
  "missing",
  "rejected",
  "stale",
]);
const REQUEST_KEYS = new Set(["evaluationInput", "idempotencyKey"]);
const EVALUATION_INPUT_KEYS = new Set([
  "emergencyPaused",
  "featureFlagEnabled",
  "gateId",
  "policySnapshotBundleStatus",
  "results",
  "stage",
  "stateInterpretationPolicyStatus",
]);
const REQUIREMENT_RESULT_KEYS = new Set([
  "evidenceRef",
  "key",
  "policySnapshotStatus",
  "privilegedActionStatus",
  "recordedAt",
  "status",
]);

type ReleaseGateEnforcementInsert =
  Database["public"]["Tables"]["moral_trade_release_gate_enforcement_records"]["Insert"];

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

function booleanField(value: unknown, key: string, blockers: string[]) {
  if (typeof value === "boolean") {
    return value;
  }

  blockers.push(`${key}: boolean is required`);

  return false;
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
    .map((key) => `${prefix}.${key}: unsupported release-gate enforcement key`);
}

function normalizeRequirementResult(
  value: unknown,
  index: number,
  blockers: string[],
): MoralTradeReleaseGateRequirementResult {
  const record = isRecord(value) ? value : {};
  const prefix = `evaluationInput.results.${index}`;

  if (!isRecord(value)) {
    blockers.push(`${prefix}: object is required`);
  } else {
    blockers.push(...unsupportedKeys(record, REQUIREMENT_RESULT_KEYS, prefix));
  }

  return {
    evidenceRef: requiredStringField(record.evidenceRef, `${prefix}.evidenceRef`, blockers),
    key: requiredStringField(
      record.key,
      `${prefix}.key`,
      blockers,
      `submitted-release-gate-requirement-${index + 1}`,
    ),
    policySnapshotStatus: enumField(
      record.policySnapshotStatus,
      POLICY_STATUSES,
      "missing",
      `${prefix}.policySnapshotStatus`,
      blockers,
      true,
    ),
    privilegedActionStatus: enumField(
      record.privilegedActionStatus,
      PRIVILEGED_ACTION_STATUSES,
      "missing",
      `${prefix}.privilegedActionStatus`,
      blockers,
      true,
    ),
    recordedAt: requiredStringField(record.recordedAt, `${prefix}.recordedAt`, blockers),
    status: enumField(
      record.status,
      REQUIREMENT_STATUSES,
      "missing",
      `${prefix}.status`,
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

  if (Array.isArray(value.results) && value.results.length > MAX_REQUIREMENT_RESULTS) {
    blockers.push(
      `evaluationInput.results: at most ${MAX_REQUIREMENT_RESULTS} results are supported`,
    );
  }

  const input: MoralTradeReleaseGateEvaluationInput = {
    emergencyPaused: booleanField(
      value.emergencyPaused,
      "evaluationInput.emergencyPaused",
      blockers,
    ),
    featureFlagEnabled: booleanField(
      value.featureFlagEnabled,
      "evaluationInput.featureFlagEnabled",
      blockers,
    ),
    gateId: requiredStringField(value.gateId, "evaluationInput.gateId", blockers),
    policySnapshotBundleStatus: enumField(
      value.policySnapshotBundleStatus,
      POLICY_STATUSES,
      "missing",
      "evaluationInput.policySnapshotBundleStatus",
      blockers,
      true,
    ),
    results: Array.isArray(value.results)
      ? value.results
          .slice(0, MAX_REQUIREMENT_RESULTS)
          .map((entry, index) => normalizeRequirementResult(entry, index, blockers))
      : [],
    stage: enumField(
      value.stage,
      STAGES,
      "public_goods_preview",
      "evaluationInput.stage",
      blockers,
      true,
    ),
    stateInterpretationPolicyStatus: enumField(
      value.stateInterpretationPolicyStatus,
      POLICY_STATUSES,
      "missing",
      "evaluationInput.stateInterpretationPolicyStatus",
      blockers,
      true,
    ),
  };

  if (!Array.isArray(value.results)) {
    blockers.push("evaluationInput.results: array is required");
  }

  return { input, blockers };
}

function normalizeIdempotencyKey(value: unknown, fallbackHash: string) {
  const normalized = stringField(value).slice(0, MAX_IDEMPOTENCY_LENGTH);

  return normalized || `release-gate-enforce:${fallbackHash}`;
}

function authorizationFields() {
  return {
    payableAllowed: false,
    publicMetricPublicationAllowed: false,
    releaseGatePromotionAllowed: false,
    relianceBearingAllowed: false,
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
  const contract = getMoralTradeReleaseGateContract();
  const contractValidation = validateMoralTradeReleaseGateContract(contract);

  return buildMoralTradeApiJsonResponse(
    {
      ok: false,
      checkedAt,
      contractVersion: contract.version,
      releaseGateStatus: "blocked",
      ...authorizationFields(),
      stateMutation: false,
      persistence: {
        requested: true,
        status: "not_recorded",
        recordId: null,
        table: "moral_trade_release_gate_enforcement_records",
      },
      contractValidation,
      fallback:
        "Invalid release-gate enforcement input creates no enforcement record and cannot authorize payable, reliance-bearing, public-metric, or release-promotion state.",
      blockers,
    },
    "private_no_store",
    { status },
  );
}

export async function POST(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "release_gate_enforce");
  const checkedAt = new Date().toISOString();

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited release-gate enforcement creates no enforcement record and cannot authorize payable, reliance-bearing, public-metric, or release-promotion state.",
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

  const contract = getMoralTradeReleaseGateContract();
  const contractValidation = validateMoralTradeReleaseGateContract(contract);
  const evaluation = evaluateMoralTradeReleaseGate(normalized.input);
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
    releaseGateStatus: evaluation.status === "pass" ? "non_blocking" : "blocked",
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
          table: "moral_trade_release_gate_enforcement_records",
        },
        fallback:
          "Release-gate enforcement was evaluated but not recorded because Supabase is not configured; no payable, reliance-bearing, public-metric, or release-promotion state changed.",
        blockers: [...blockers, "supabase_unconfigured:release_gate_enforce"],
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
          table: "moral_trade_release_gate_enforcement_records",
        },
        fallback:
          "Authentication is required before recording release-gate enforcement. No payable, reliance-bearing, public-metric, or release-promotion state changed.",
        blockers: [...blockers, "authentication_required:release_gate_enforce"],
      },
      "private_no_store",
      { status: 401 },
    );
  }

  const existing = await supabase
    .from("moral_trade_release_gate_enforcement_records")
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
          table: "moral_trade_release_gate_enforcement_records",
        },
      },
      "private_no_store",
    );
  }

  const insert: ReleaseGateEnforcementInsert = {
    blocker_codes: blockers,
    blocker_count: blockers.length,
    contract_version: contract.version,
    emergency_paused_bool: normalized.input.emergencyPaused,
    enforcement_input_json: normalized.input as unknown as Json,
    enforcement_status: evaluation.status,
    evaluation_hash: evaluationHash,
    evaluation_result_json: evaluation as unknown as Json,
    feature_flag_enabled_bool: normalized.input.featureFlagEnabled,
    gate_id: normalized.input.gateId,
    idempotency_key: idempotencyKey,
    inactive_requirement_count: evaluation.inactiveRequirementCount,
    not_required_requirement_count: evaluation.notRequiredRequirementCount,
    owner_profile_id: user.id,
    passed_requirement_count: evaluation.passedRequirementCount,
    payable_allowed_bool: false,
    policy_snapshot_bundle_status: normalized.input.policySnapshotBundleStatus,
    public_metric_publication_allowed_bool: false,
    release_gate_promotion_allowed_bool: false,
    reliance_bearing_allowed_bool: false,
    required_requirement_count: evaluation.requiredRequirementCount,
    result_count: normalized.input.results.length,
    stage: evaluation.stage,
    state_interpretation_policy_status:
      normalized.input.stateInterpretationPolicyStatus,
    validator_version: MORAL_TRADE_RELEASE_GATE_VALIDATOR_VERSION,
    waived_requirement_count: evaluation.waivedRequirementCount,
  };
  const { data, error } = await supabase
    .from("moral_trade_release_gate_enforcement_records")
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
          table: "moral_trade_release_gate_enforcement_records",
        },
        fallback:
          "The release-gate enforcement result could not be recorded. No payable, reliance-bearing, public-metric, or release-promotion state changed.",
        blockers: [...blockers, "database_insert_failed:release_gate_enforce"],
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
        table: "moral_trade_release_gate_enforcement_records",
      },
    },
    "private_no_store",
  );
}
