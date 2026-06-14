import { createHash } from "node:crypto";

import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  MORAL_TRADE_AUTHORITY_OBLIGATION_VALIDATOR_VERSION,
  evaluateMoralTradeAuthorityObligations,
  getMoralTradeAuthorityObligationContract,
  validateMoralTradeAuthorityObligationContract,
  type MoralTradeAuthorityObligationEvaluationInput,
  type MoralTradeAuthorityObligationRecord,
  type MoralTradeAuthorityObligationTransition,
} from "@/lib/moral-trade/authority-obligations";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database, Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_IDEMPOTENCY_LENGTH = 160;
const MAX_RECORDS = 48;

const REQUEST_KEYS = new Set(["evaluationInput", "idempotencyKey"]);
const EVALUATION_INPUT_KEYS = new Set([
  "authorityObligationRequired",
  "checkedAt",
  "records",
  "transition",
]);
const TRANSITIONS = new Set<MoralTradeAuthorityObligationTransition>([
  "draft_preview",
  "matched_trade_lock",
  "payment_capture",
  "performance_start",
  "reliance_bearing_transition",
  "public_metric_publication",
  "release_gate_promotion",
]);

type AuthorityObligationEnforcementInsert =
  Database["public"]["Tables"]["moral_trade_authority_obligation_enforcement_records"]["Insert"];

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
    .map((key) => `${prefix}.${key}: unsupported authority/obligation enforcement key`);
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

  const input: MoralTradeAuthorityObligationEvaluationInput = {
    authorityObligationRequired: booleanField(value.authorityObligationRequired),
    checkedAt: stringField(value.checkedAt) || undefined,
    records: recordArrayField<MoralTradeAuthorityObligationRecord>(
      value.records,
      "evaluationInput.records",
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
      authorityDelegationAccepted: false,
      authorityObligationGateStatus: "blocked",
      blocker,
      blockers: [blocker, ...extraBlockers],
      detail,
      matchedTradeLockAllowed: false,
      ok: false,
      paymentCaptureAllowed: false,
      performanceStartAllowed: false,
      publicMetricPublicationAllowed: false,
      releaseGatePromotionAllowed: false,
      relianceBearingTransitionAllowed: false,
      stateMutation: false,
      thirdPartyObligationTransferAllowed: false,
    },
    "no_store_dynamic",
    { status },
  );
}

function normalizeIdempotencyKey(value: unknown, fallbackHash: string) {
  const normalized = stringField(value).slice(0, MAX_IDEMPOTENCY_LENGTH);

  return normalized || `authority-obligation-enforce:${fallbackHash}`;
}

export async function POST(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(
    request,
    "authority_obligation_enforce",
  );
  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited authority/obligation enforcement creates no enforcement record and cannot authorize lock, payment capture, performance start, reliance, public metrics, release promotion, delegation, or third-party-obligation transfer.",
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return buildBlockedResponse(
      400,
      "invalid_json_body",
      "Invalid JSON body creates no enforcement record and cannot authorize authority/obligation transitions.",
    );
  }

  if (!isRecord(body)) {
    return buildBlockedResponse(
      400,
      "request_body_object_required",
      "The authority/obligation enforcement request must be a JSON object.",
    );
  }

  const requestBlockers = unsupportedKeys(body, REQUEST_KEYS, "request");
  const normalized = normalizeEvaluationInput(body.evaluationInput);
  if (!normalized.input) {
    return buildBlockedResponse(
      400,
      "invalid_evaluation_input",
      "Authority/obligation evaluation input is missing or malformed.",
      [...requestBlockers, ...normalized.blockers],
    );
  }

  const evaluation = evaluateMoralTradeAuthorityObligations(normalized.input);
  const contract = getMoralTradeAuthorityObligationContract();
  const validation = validateMoralTradeAuthorityObligationContract(contract);
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
    authorityDelegationAccepted: false,
    authorityObligationGateStatus: status,
    authorityObligationRequired: evaluation.authorityObligationRequired,
    blockers,
    checkedAt: evaluation.checkedAt,
    contractVersion: contract.version,
    disclosedObligationRecordCount: evaluation.disclosedObligationRecordCount,
    enforcementStatus: status,
    evaluationHash,
    idempotencyKey,
    matchedTradeLockAllowed: false,
    nonBlockingRecordCount: evaluation.nonBlockingRecordCount,
    ok: status === "pass",
    paymentCaptureAllowed: false,
    performanceStartAllowed: false,
    publicMetricPublicationAllowed: false,
    recordCount: evaluation.recordCount,
    releaseGatePromotionAllowed: false,
    relianceBearingTransitionAllowed: false,
    representativeAuthorityRecordCount: evaluation.representativeAuthorityRecordCount,
    stateMutation: false,
    thirdPartyObligationRecordCount: evaluation.thirdPartyObligationRecordCount,
    thirdPartyObligationTransferAllowed: false,
    transition: evaluation.transition,
    userFacingBlockerCategories: evaluation.userFacingBlockerCategories,
    validation,
    validatorVersion: MORAL_TRADE_AUTHORITY_OBLIGATION_VALIDATOR_VERSION,
    verifiedAuthorityRecordCount: evaluation.verifiedAuthorityRecordCount,
  };

  if (!hasSupabaseEnv()) {
    return buildMoralTradeApiJsonResponse(
      {
        ...responseBody,
        blockers: [...blockers, "supabase_unconfigured:authority_obligation_enforce"],
        authorityObligationGateStatus: "blocked",
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
        blockers: [...blockers, "authentication_required:authority_obligation_enforce"],
        authorityObligationGateStatus: "blocked",
        ok: false,
        persistenceStatus: "skipped_authentication_required",
      },
      "private_no_store",
      { status: 401 },
    );
  }

  const insert: AuthorityObligationEnforcementInsert = {
    authority_delegation_accepted_bool: false,
    authority_obligation_required_bool: evaluation.authorityObligationRequired,
    blocker_codes: blockers,
    contract_version: contract.version,
    disclosed_obligation_record_count: evaluation.disclosedObligationRecordCount,
    enforcement_input_json: normalized.input as unknown as Json,
    enforcement_status: status,
    evaluation_hash: evaluationHash,
    evaluation_result_json: evaluation as unknown as Json,
    idempotency_key: idempotencyKey,
    matched_trade_lock_allowed_bool: false,
    non_blocking_record_count: evaluation.nonBlockingRecordCount,
    owner_profile_id: user.id,
    payment_capture_allowed_bool: false,
    performance_start_allowed_bool: false,
    public_metric_publication_allowed_bool: false,
    record_count: evaluation.recordCount,
    release_gate_promotion_allowed_bool: false,
    reliance_bearing_transition_allowed_bool: false,
    representative_authority_record_count: evaluation.representativeAuthorityRecordCount,
    state_mutation_allowed_bool: false,
    third_party_obligation_record_count: evaluation.thirdPartyObligationRecordCount,
    third_party_obligation_transfer_allowed_bool: false,
    transition: evaluation.transition,
    user_facing_blocker_categories: evaluation.userFacingBlockerCategories,
    validator_version: MORAL_TRADE_AUTHORITY_OBLIGATION_VALIDATOR_VERSION,
    verified_authority_record_count: evaluation.verifiedAuthorityRecordCount,
  };
  const { error: insertError } = await client
    .from("moral_trade_authority_obligation_enforcement_records")
    .insert(insert);

  if (insertError) {
    return buildMoralTradeApiJsonResponse(
      {
        ...responseBody,
        blockers: [...blockers, "database_insert_failed:authority_obligation_enforce"],
        authorityObligationGateStatus: "blocked",
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
