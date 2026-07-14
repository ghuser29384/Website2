import { createHash } from "node:crypto";

import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  MORAL_TRADE_COMMITMENT_SETTLEMENT_VALIDATOR_VERSION,
  evaluateMoralTradeCommitmentSettlement,
  getMoralTradeCommitmentSettlementContract,
  validateMoralTradeCommitmentSettlementContract,
  type MoralTradeAtomicSettlementGroup,
  type MoralTradeCommitmentInventoryRecord,
  type MoralTradeCommitmentReservationRecord,
  type MoralTradeCommitmentSettlementEvaluationInput,
  type MoralTradeCommitmentSettlementTransition,
} from "@/lib/moral-trade/commitment-settlement";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database, Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_TEXT_FIELD_LENGTH = 800;
const MAX_IDEMPOTENCY_LENGTH = 160;
const MAX_RECORDS = 64;

const REQUEST_KEYS = new Set(["evaluationInput", "idempotencyKey"]);
const EVALUATION_INPUT_KEYS = new Set([
  "atomicSettlementGroups",
  "checkedAt",
  "commitmentInventories",
  "commitmentReservations",
  "commitmentSettlementRequired",
  "transition",
]);
const TRANSITIONS = new Set<MoralTradeCommitmentSettlementTransition>([
  "draft_preview",
  "match_candidate_preview",
  "matched_trade_lock",
  "payment_authorization",
  "payment_capture",
  "performance_release",
  "public_metric_publication",
  "release_gate_promotion",
]);

type CommitmentSettlementEnforcementInsert =
  Database["public"]["Tables"]["moral_trade_commitment_settlement_enforcement_records"]["Insert"];

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

function unsupportedKeys(
  value: Record<string, unknown>,
  allowed: Set<string>,
  prefix: string,
) {
  return Object.keys(value)
    .filter((key) => !allowed.has(key))
    .map((key) => `${prefix}.${key}: unsupported commitment-settlement enforcement key`);
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
      input: null,
      blockers: ["evaluationInput: object is required"],
    };
  }

  blockers.push(...unsupportedKeys(value, EVALUATION_INPUT_KEYS, "evaluationInput"));

  const input: MoralTradeCommitmentSettlementEvaluationInput = {
    atomicSettlementGroups: recordArrayField<MoralTradeAtomicSettlementGroup>(
      value.atomicSettlementGroups,
      "evaluationInput.atomicSettlementGroups",
      blockers,
    ),
    checkedAt: stringField(value.checkedAt) || undefined,
    commitmentInventories: recordArrayField<MoralTradeCommitmentInventoryRecord>(
      value.commitmentInventories,
      "evaluationInput.commitmentInventories",
      blockers,
    ),
    commitmentReservations: recordArrayField<MoralTradeCommitmentReservationRecord>(
      value.commitmentReservations,
      "evaluationInput.commitmentReservations",
      blockers,
    ),
    commitmentSettlementRequired: booleanField(value.commitmentSettlementRequired),
    transition: enumField(
      value.transition,
      TRANSITIONS,
      "draft_preview",
      "evaluationInput.transition",
      blockers,
    ),
  };

  return { input, blockers };
}

function normalizeIdempotencyKey(value: unknown, fallbackHash: string) {
  const normalized = stringField(value, "").slice(0, MAX_IDEMPOTENCY_LENGTH);

  return normalized || `commitment-settlement-enforce:${fallbackHash}`;
}

function authorizationFields() {
  return {
    runtimeTransitionAllowed: false,
    matchCandidatePreviewAllowed: false,
    matchedTradeLockAllowed: false,
    paymentAuthorizationAllowed: false,
    paymentCaptureAllowed: false,
    performanceReleaseAllowed: false,
    publicMetricPublicationAllowed: false,
    releaseGatePromotionAllowed: false,
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
  const contract = getMoralTradeCommitmentSettlementContract();
  const contractValidation = validateMoralTradeCommitmentSettlementContract(contract);

  return buildMoralTradeApiJsonResponse(
    {
      ok: false,
      checkedAt,
      contractVersion: contract.version,
      commitmentSettlementGateStatus: "blocked",
      ...authorizationFields(),
      stateMutation: false,
      persistence: {
        requested: true,
        status: "not_recorded",
        recordId: null,
        table: "moral_trade_commitment_settlement_enforcement_records",
      },
      contractValidation,
      fallback:
        "Invalid commitment-settlement enforcement input creates no enforcement record and cannot authorize runtime transition, match preview, matched-trade lock, payment authorization, payment capture, performance release, public metric publication, or release promotion.",
      blockers,
    },
    "private_no_store",
    { status },
  );
}

export async function POST(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(
    request,
    "commitment_settlement_enforce",
  );
  const checkedAt = new Date().toISOString();

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited commitment-settlement enforcement creates no enforcement record and cannot authorize runtime transition, match preview, matched-trade lock, payment authorization, payment capture, performance release, public metric publication, or release promotion.",
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

  const contract = getMoralTradeCommitmentSettlementContract();
  const contractValidation = validateMoralTradeCommitmentSettlementContract(contract);
  const evaluation = evaluateMoralTradeCommitmentSettlement(normalized.input);
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
    commitmentSettlementGateStatus:
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
          table: "moral_trade_commitment_settlement_enforcement_records",
        },
        fallback:
          "Commitment-settlement enforcement was evaluated but not recorded because Supabase is not configured; no runtime transition, match preview, matched-trade lock, payment authorization, payment capture, performance release, public metric publication, or release promotion state changed.",
        blockers: [
          ...blockers,
          "supabase_unconfigured:commitment_settlement_enforce",
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
          table: "moral_trade_commitment_settlement_enforcement_records",
        },
        fallback:
          "Authentication is required before recording commitment-settlement enforcement. No runtime transition, match preview, matched-trade lock, payment authorization, payment capture, performance release, public metric publication, or release promotion state changed.",
        blockers: [
          ...blockers,
          "authentication_required:commitment_settlement_enforce",
        ],
      },
      "private_no_store",
      { status: 401 },
    );
  }

  const existing = await supabase
    .from("moral_trade_commitment_settlement_enforcement_records")
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
          table: "moral_trade_commitment_settlement_enforcement_records",
        },
      },
      "private_no_store",
    );
  }

  const insert: CommitmentSettlementEnforcementInsert = {
    atomic_settlement_group_count: evaluation.atomicSettlementGroupCount,
    blocker_codes: blockers,
    commitment_settlement_required_bool: evaluation.commitmentSettlementRequired,
    contract_version: contract.version,
    enforcement_input_json: normalized.input as unknown as Json,
    enforcement_status: evaluation.status,
    evaluation_hash: evaluationHash,
    evaluation_result_json: evaluation as unknown as Json,
    idempotency_key: idempotencyKey,
    matched_trade_lock_allowed_bool: false,
    match_candidate_preview_allowed_bool: false,
    non_blocking_record_count: evaluation.nonBlockingRecordCount,
    owner_profile_id: user.id,
    payment_authorization_allowed_bool: false,
    payment_capture_allowed_bool: false,
    performance_release_allowed_bool: false,
    public_metric_publication_allowed_bool: false,
    record_count: evaluation.reviewedRecordCount,
    release_gate_promotion_allowed_bool: false,
    reserved_commitment_count: evaluation.reservedCommitmentCount,
    reviewed_record_count: evaluation.reviewedRecordCount,
    runtime_transition_allowed_bool: false,
    transition: evaluation.transition,
    user_facing_blocker_categories: evaluation.userFacingBlockerCategories,
    validator_version: MORAL_TRADE_COMMITMENT_SETTLEMENT_VALIDATOR_VERSION,
  };
  const { data, error } = await supabase
    .from("moral_trade_commitment_settlement_enforcement_records")
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
          table: "moral_trade_commitment_settlement_enforcement_records",
        },
        fallback:
          "The commitment-settlement enforcement result could not be recorded. No runtime transition, match preview, matched-trade lock, payment authorization, payment capture, performance release, public metric publication, or release promotion state changed.",
        blockers: [
          ...blockers,
          "database_insert_failed:commitment_settlement_enforce",
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
        table: "moral_trade_commitment_settlement_enforcement_records",
      },
    },
    "private_no_store",
    { status: contractValidation.status === "pass" ? 201 : 422 },
  );
}
