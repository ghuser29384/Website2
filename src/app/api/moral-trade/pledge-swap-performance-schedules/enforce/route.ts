import { createHash } from "node:crypto";

import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  MORAL_TRADE_PLEDGE_SWAP_PERFORMANCE_SCHEDULE_VALIDATOR_VERSION,
  evaluateMoralTradePledgeSwapPerformanceSchedules,
  getMoralTradePledgeSwapPerformanceScheduleContract,
  validateMoralTradePledgeSwapPerformanceScheduleContract,
  type MoralTradePledgeSwapPerformanceScheduleEvaluationInput,
  type MoralTradePledgeSwapPerformanceScheduleRecord,
  type MoralTradePledgeSwapPerformanceScheduleTransition,
} from "@/lib/moral-trade/pledge-swap-performance-schedules";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database, Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_IDEMPOTENCY_LENGTH = 160;
const MAX_RECORDS = 48;

const REQUEST_KEYS = new Set(["evaluationInput", "idempotencyKey"]);
const EVALUATION_INPUT_KEYS = new Set([
  "checkedAt",
  "performanceScheduleRequired",
  "schedules",
  "transition",
]);
const TRANSITIONS = new Set<MoralTradePledgeSwapPerformanceScheduleTransition>([
  "draft_preview",
  "matched_trade_lock",
  "performance_start",
  "checkpoint_evidence",
  "performance_release",
  "breach_remedy",
  "reciprocal_release",
  "public_metric_publication",
  "release_gate_promotion",
]);

type PerformanceScheduleEnforcementInsert =
  Database["public"]["Tables"]["moral_trade_pledge_swap_performance_schedule_enforcement_records"]["Insert"];

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
  return typeof value === "string" ? value.trim() : fallback;
}

function booleanField(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function unsupportedKeys(
  value: Record<string, unknown>,
  allowed: Set<string>,
  prefix: string,
) {
  return Object.keys(value)
    .filter((key) => !allowed.has(key))
    .map((key) => `${prefix}.${key}: unsupported pledge-swap performance-schedule enforcement key`);
}

function enumField<T extends string>(
  value: unknown,
  allowed: Set<T>,
  fallback: T,
  key: string,
  blockers: string[],
) {
  const normalized = stringField(value);

  if (allowed.has(normalized as T)) {
    return normalized as T;
  }

  blockers.push(normalized ? `${key}: unsupported value` : `${key}: missing`);

  return fallback;
}

function recordArrayField<T>(
  value: unknown,
  key: string,
  blockers: string[],
): T[] {
  if (!Array.isArray(value)) {
    blockers.push(`${key}: array is required`);

    return [];
  }

  if (value.length > MAX_RECORDS) {
    blockers.push(`${key}: at most ${MAX_RECORDS} records are supported`);
  }

  return value.slice(0, MAX_RECORDS).map((entry, index) => {
    if (!isRecord(entry)) {
      blockers.push(`${key}.${index}: object is required`);

      return {};
    }

    return entry;
  }) as T[];
}

function normalizeEvaluationInput(value: unknown) {
  const blockers: string[] = [];

  if (!isRecord(value)) {
    return {
      blockers: ["evaluationInput: object is required"],
      input: null,
    };
  }

  blockers.push(...unsupportedKeys(value, EVALUATION_INPUT_KEYS, "evaluationInput"));

  const input: MoralTradePledgeSwapPerformanceScheduleEvaluationInput = {
    checkedAt: stringField(value.checkedAt) || undefined,
    performanceScheduleRequired: booleanField(value.performanceScheduleRequired),
    schedules: recordArrayField<MoralTradePledgeSwapPerformanceScheduleRecord>(
      value.schedules,
      "evaluationInput.schedules",
      blockers,
    ),
    transition: enumField(
      value.transition,
      TRANSITIONS,
      "draft_preview",
      "evaluationInput.transition",
      blockers,
    ),
  };

  return { blockers, input };
}

function buildBlockedResponse(
  status: number,
  blocker: string,
  detail: string,
  extraBlockers: string[] = [],
) {
  return buildMoralTradeApiJsonResponse(
    {
      blocker,
      blockers: [blocker, ...extraBlockers],
      detail,
      breachRemedyAllowed: false,
      checkpointEvidenceAllowed: false,
      matchedTradeLockAllowed: false,
      ok: false,
      performanceReleaseAllowed: false,
      performanceScheduleGateStatus: "blocked",
      performanceStartAllowed: false,
      publicMetricPublicationAllowed: false,
      reciprocalReleaseAllowed: false,
      releaseGatePromotionAllowed: false,
      runtimeTransitionAllowed: false,
      stateMutation: false,
    },
    "no_store_dynamic",
    { status },
  );
}

function normalizeIdempotencyKey(value: unknown, fallbackHash: string) {
  const normalized = stringField(value).slice(0, MAX_IDEMPOTENCY_LENGTH);

  return normalized || `pledge-swap-performance-schedule-enforce:${fallbackHash}`;
}

export async function POST(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(
    request,
    "pledge_swap_performance_schedule_enforce",
  );
  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited pledge-swap performance-schedule enforcement creates no enforcement record and cannot authorize lock, start, checkpoint, release, breach remedy, public metric, or release promotion.",
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return buildBlockedResponse(
      400,
      "invalid_json_body",
      "Invalid JSON body creates no enforcement record and cannot authorize pledge-swap performance-schedule transitions.",
    );
  }

  if (!isRecord(body)) {
    return buildBlockedResponse(
      400,
      "request_body_object_required",
      "The pledge-swap performance-schedule enforcement request must be a JSON object.",
    );
  }

  const requestBlockers = unsupportedKeys(body, REQUEST_KEYS, "request");
  const normalized = normalizeEvaluationInput(body.evaluationInput);
  if (!normalized.input) {
    return buildBlockedResponse(
      400,
      "invalid_evaluation_input",
      "Pledge-swap performance-schedule evaluation input is missing or malformed.",
      [...requestBlockers, ...normalized.blockers],
    );
  }

  const evaluation = evaluateMoralTradePledgeSwapPerformanceSchedules(normalized.input);
  const contract = getMoralTradePledgeSwapPerformanceScheduleContract();
  const validation = validateMoralTradePledgeSwapPerformanceScheduleContract(contract);
  const evaluationHash = hashJson({ evaluation, validation });
  const idempotencyKey = normalizeIdempotencyKey(body.idempotencyKey, evaluationHash);
  const blockers = [
    ...requestBlockers,
    ...normalized.blockers,
    ...evaluation.blockers,
    ...validation.blockers.map((entry) => `contract_validation:${entry}`),
  ];
  const status = blockers.length === 0 ? "pass" : "blocked";
  const responseBody = {
    blockers,
    checkedAt: evaluation.checkedAt,
    contractVersion: contract.version,
    breachRemedyAllowed: false,
    checkpointEvidenceAllowed: false,
    enforcementStatus: status,
    evaluationHash,
    idempotencyKey,
    matchedTradeLockAllowed: false,
    nonBlockingScheduleCount: evaluation.nonBlockingScheduleCount,
    ok: status === "pass",
    performanceReleaseAllowed: false,
    performanceScheduleGateStatus: status,
    performanceScheduleRequired: evaluation.performanceScheduleRequired,
    performanceStartAllowed: false,
    publicMetricPublicationAllowed: false,
    reciprocalReleaseAllowed: false,
    reciprocalReleaseScheduleCount: evaluation.reciprocalReleaseScheduleCount,
    releaseGatePromotionAllowed: false,
    runtimeTransitionAllowed: false,
    scheduleCount: evaluation.scheduleCount,
    stateMutation: false,
    synchronizedScheduleCount: evaluation.synchronizedScheduleCount,
    transition: evaluation.transition,
    userFacingBlockerCategories: evaluation.userFacingBlockerCategories,
    validation,
    validatorVersion: MORAL_TRADE_PLEDGE_SWAP_PERFORMANCE_SCHEDULE_VALIDATOR_VERSION,
  };

  if (!hasSupabaseEnv()) {
    return buildMoralTradeApiJsonResponse(
      {
        ...responseBody,
        blockers: [
          ...blockers,
          "supabase_unconfigured:pledge_swap_performance_schedule_enforce",
        ],
        ok: false,
        performanceScheduleGateStatus: "blocked",
        persistenceStatus: "skipped_supabase_unconfigured",
      },
      "private_no_store",
      { status: 503 },
    );
  }

  const client = await createClient();
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();

  if (authError || !user) {
    return buildMoralTradeApiJsonResponse(
      {
        ...responseBody,
        blockers: [
          ...blockers,
          "authentication_required:pledge_swap_performance_schedule_enforce",
        ],
        ok: false,
        performanceScheduleGateStatus: "blocked",
        persistenceStatus: "skipped_authentication_required",
      },
      "private_no_store",
      { status: 401 },
    );
  }

  const insert: PerformanceScheduleEnforcementInsert = {
    blocker_codes: blockers,
    breach_remedy_allowed_bool: false,
    checkpoint_evidence_allowed_bool: false,
    contract_version: contract.version,
    enforcement_input_json: normalized.input as unknown as Json,
    enforcement_status: status,
    evaluation_hash: evaluationHash,
    evaluation_result_json: evaluation as unknown as Json,
    idempotency_key: idempotencyKey,
    matched_trade_lock_allowed_bool: false,
    non_blocking_schedule_count: evaluation.nonBlockingScheduleCount,
    owner_profile_id: user.id,
    performance_release_allowed_bool: false,
    performance_schedule_required_bool: evaluation.performanceScheduleRequired,
    performance_start_allowed_bool: false,
    public_metric_publication_allowed_bool: false,
    reciprocal_release_allowed_bool: false,
    reciprocal_release_schedule_count: evaluation.reciprocalReleaseScheduleCount,
    release_gate_promotion_allowed_bool: false,
    runtime_transition_allowed_bool: false,
    schedule_count: evaluation.scheduleCount,
    synchronized_schedule_count: evaluation.synchronizedScheduleCount,
    transition: evaluation.transition,
    user_facing_blocker_categories: evaluation.userFacingBlockerCategories,
    validator_version: MORAL_TRADE_PLEDGE_SWAP_PERFORMANCE_SCHEDULE_VALIDATOR_VERSION,
  };
  const { error: insertError } = await client
    .from("moral_trade_pledge_swap_performance_schedule_enforcement_records")
    .insert(insert);

  if (insertError) {
    return buildMoralTradeApiJsonResponse(
      {
        ...responseBody,
        blockers: [
          ...blockers,
          "database_insert_failed:pledge_swap_performance_schedule_enforce",
        ],
        ok: false,
        performanceScheduleGateStatus: "blocked",
        persistenceStatus: "insert_failed",
      },
      "private_no_store",
      { status: 500 },
    );
  }

  return buildMoralTradeApiJsonResponse(
    {
      ...responseBody,
      persistenceStatus: "recorded",
    },
    "private_no_store",
  );
}
