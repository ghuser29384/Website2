import { createHash } from "node:crypto";

import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  MORAL_TRADE_NEGATIVE_COMMITMENT_SCOPE_VALIDATOR_VERSION,
  evaluateMoralTradeNegativeCommitmentScopes,
  getMoralTradeNegativeCommitmentScopeContract,
  validateMoralTradeNegativeCommitmentScopeContract,
  type MoralTradeNegativeCommitmentScopeEvaluationInput,
  type MoralTradeNegativeCommitmentScopeRecord,
  type MoralTradeNegativeCommitmentScopeTransition,
} from "@/lib/moral-trade/negative-commitment-scopes";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database, Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_IDEMPOTENCY_LENGTH = 160;
const MAX_RECORDS = 48;

const REQUEST_KEYS = new Set(["evaluationInput", "idempotencyKey"]);
const EVALUATION_INPUT_KEYS = new Set([
  "checkedAt",
  "negativeCommitmentScopeRequired",
  "scopes",
  "transition",
]);
const TRANSITIONS = new Set<MoralTradeNegativeCommitmentScopeTransition>([
  "draft_preview",
  "matched_trade_lock",
  "payment_capture",
  "reliance_bearing_transition",
  "abstention_evidence_acceptance",
  "completion_count",
  "public_metric_publication",
  "release_gate_promotion",
]);

type NegativeCommitmentScopeEnforcementInsert =
  Database["public"]["Tables"]["moral_trade_negative_commitment_scope_enforcement_records"]["Insert"];

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
    .map((key) => `${prefix}.${key}: unsupported negative-commitment scope enforcement key`);
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

  const input: MoralTradeNegativeCommitmentScopeEvaluationInput = {
    checkedAt: stringField(value.checkedAt) || undefined,
    negativeCommitmentScopeRequired: booleanField(
      value.negativeCommitmentScopeRequired,
    ),
    scopes: recordArrayField<MoralTradeNegativeCommitmentScopeRecord>(
      value.scopes,
      "evaluationInput.scopes",
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
      abstentionEvidenceAccepted: false,
      completionCountAllowed: false,
      matchedTradeLockAllowed: false,
      negativeCommitmentScopeGateStatus: "blocked",
      ok: false,
      paymentCaptureAllowed: false,
      publicMetricPublicationAllowed: false,
      releaseGatePromotionAllowed: false,
      relianceBearingTransitionAllowed: false,
      stateMutation: false,
    },
    "no_store_dynamic",
    { status },
  );
}

function normalizeIdempotencyKey(value: unknown, fallbackHash: string) {
  const normalized = stringField(value).slice(0, MAX_IDEMPOTENCY_LENGTH);

  return normalized || `negative-commitment-scope-enforce:${fallbackHash}`;
}

export async function POST(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(
    request,
    "negative_commitment_scope_enforce",
  );
  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited negative-commitment scope enforcement creates no enforcement record and cannot authorize lock, payment, reliance, evidence acceptance, completion, public metrics, or release promotion.",
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return buildBlockedResponse(
      400,
      "invalid_json_body",
      "Invalid JSON body creates no enforcement record and cannot authorize negative-commitment scope transitions.",
    );
  }

  if (!isRecord(body)) {
    return buildBlockedResponse(
      400,
      "request_body_object_required",
      "The negative-commitment scope enforcement request must be a JSON object.",
    );
  }

  const requestBlockers = unsupportedKeys(body, REQUEST_KEYS, "request");
  const normalized = normalizeEvaluationInput(body.evaluationInput);
  if (!normalized.input) {
    return buildBlockedResponse(
      400,
      "invalid_evaluation_input",
      "Negative-commitment scope evaluation input is missing or malformed.",
      [...requestBlockers, ...normalized.blockers],
    );
  }

  const evaluation = evaluateMoralTradeNegativeCommitmentScopes(normalized.input);
  const contract = getMoralTradeNegativeCommitmentScopeContract();
  const validation = validateMoralTradeNegativeCommitmentScopeContract(contract);
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
    abstentionEvidenceAccepted: false,
    blockers,
    boundedScopeCount: evaluation.boundedScopeCount,
    checkedAt: evaluation.checkedAt,
    completionCountAllowed: false,
    contractVersion: contract.version,
    enforcementStatus: status,
    evaluationHash,
    highConfidenceScopeCount: evaluation.highConfidenceScopeCount,
    idempotencyKey,
    matchedTradeLockAllowed: false,
    negativeCommitmentScopeGateStatus: status,
    negativeCommitmentScopeRequired: evaluation.negativeCommitmentScopeRequired,
    ok: status === "pass",
    paymentCaptureAllowed: false,
    publicMetricPublicationAllowed: false,
    releaseGatePromotionAllowed: false,
    relianceBearingTransitionAllowed: false,
    scopeCount: evaluation.scopeCount,
    stateMutation: false,
    substitutionReviewedScopeCount: evaluation.substitutionReviewedScopeCount,
    transition: evaluation.transition,
    userFacingBlockerCategories: evaluation.userFacingBlockerCategories,
    validation,
    validatorVersion: MORAL_TRADE_NEGATIVE_COMMITMENT_SCOPE_VALIDATOR_VERSION,
  };

  if (!hasSupabaseEnv()) {
    return buildMoralTradeApiJsonResponse(
      {
        ...responseBody,
        blockers: [
          ...blockers,
          "supabase_unconfigured:negative_commitment_scope_enforce",
        ],
        negativeCommitmentScopeGateStatus: "blocked",
        ok: false,
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
          "authentication_required:negative_commitment_scope_enforce",
        ],
        negativeCommitmentScopeGateStatus: "blocked",
        ok: false,
        persistenceStatus: "skipped_authentication_required",
      },
      "private_no_store",
      { status: 401 },
    );
  }

  const insert: NegativeCommitmentScopeEnforcementInsert = {
    abstention_evidence_accepted_bool: false,
    blocker_codes: blockers,
    bounded_scope_count: evaluation.boundedScopeCount,
    completion_count_allowed_bool: false,
    contract_version: contract.version,
    enforcement_input_json: normalized.input as unknown as Json,
    enforcement_status: status,
    evaluation_hash: evaluationHash,
    evaluation_result_json: evaluation as unknown as Json,
    high_confidence_scope_count: evaluation.highConfidenceScopeCount,
    idempotency_key: idempotencyKey,
    matched_trade_lock_allowed_bool: false,
    negative_commitment_scope_required_bool:
      evaluation.negativeCommitmentScopeRequired,
    owner_profile_id: user.id,
    payment_capture_allowed_bool: false,
    public_metric_publication_allowed_bool: false,
    release_gate_promotion_allowed_bool: false,
    reliance_bearing_transition_allowed_bool: false,
    scope_count: evaluation.scopeCount,
    state_mutation_allowed_bool: false,
    substitution_reviewed_scope_count: evaluation.substitutionReviewedScopeCount,
    transition: evaluation.transition,
    user_facing_blocker_categories: evaluation.userFacingBlockerCategories,
    validator_version: MORAL_TRADE_NEGATIVE_COMMITMENT_SCOPE_VALIDATOR_VERSION,
  };
  const { error: insertError } = await client
    .from("moral_trade_negative_commitment_scope_enforcement_records")
    .insert(insert);

  if (insertError) {
    return buildMoralTradeApiJsonResponse(
      {
        ...responseBody,
        blockers: [
          ...blockers,
          "database_insert_failed:negative_commitment_scope_enforce",
        ],
        negativeCommitmentScopeGateStatus: "blocked",
        ok: false,
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
