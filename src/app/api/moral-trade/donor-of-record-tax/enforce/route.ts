import { createHash } from "node:crypto";

import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  MORAL_TRADE_DONOR_OF_RECORD_TAX_VALIDATOR_VERSION,
  evaluateMoralTradeDonorOfRecordTax,
  getMoralTradeDonorOfRecordTaxContract,
  validateMoralTradeDonorOfRecordTaxContract,
  type MoralTradeDonorOfRecordTaxEvaluationInput,
  type MoralTradeDonorOfRecordTaxRecord,
  type MoralTradeDonorOfRecordTaxTransition,
} from "@/lib/moral-trade/donor-of-record-tax";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database, Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_IDEMPOTENCY_LENGTH = 160;
const MAX_RECORDS = 48;

const REQUEST_KEYS = new Set(["evaluationInput", "idempotencyKey"]);
const EVALUATION_INPUT_KEYS = new Set([
  "checkedAt",
  "donorOfRecordTaxRequired",
  "records",
  "transition",
]);
const TRANSITIONS = new Set<MoralTradeDonorOfRecordTaxTransition>([
  "draft_preview",
  "matched_trade_lock",
  "payment_authorization",
  "payment_capture",
  "receipt_issuance",
  "public_metric_publication",
  "release_gate_promotion",
]);

type DonorTaxEnforcementInsert =
  Database["public"]["Tables"]["moral_trade_donor_of_record_tax_enforcement_records"]["Insert"];

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
    .map((key) => `${prefix}.${key}: unsupported donor-of-record tax enforcement key`);
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

  const input: MoralTradeDonorOfRecordTaxEvaluationInput = {
    checkedAt: stringField(value.checkedAt) || undefined,
    donorOfRecordTaxRequired: booleanField(value.donorOfRecordTaxRequired),
    records: recordArrayField<MoralTradeDonorOfRecordTaxRecord>(
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
      blocker,
      blockers: [blocker, ...extraBlockers],
      detail,
      donorOfRecordTaxGateStatus: "blocked",
      matchedTradeLockAllowed: false,
      ok: false,
      paymentAuthorizationAllowed: false,
      paymentCaptureAllowed: false,
      publicMetricPublicationAllowed: false,
      receiptIssuanceAllowed: false,
      releaseGatePromotionAllowed: false,
      stateMutation: false,
    },
    "no_store_dynamic",
    { status },
  );
}

function normalizeIdempotencyKey(value: unknown, fallbackHash: string) {
  const normalized = stringField(value).slice(0, MAX_IDEMPOTENCY_LENGTH);

  return normalized || `donor-of-record-tax-enforce:${fallbackHash}`;
}

export async function POST(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(
    request,
    "donor_of_record_tax_enforce",
  );
  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited donor-of-record tax enforcement creates no enforcement record and cannot authorize lock, payment, receipt issuance, public metrics, or release promotion.",
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return buildBlockedResponse(
      400,
      "invalid_json_body",
      "Invalid JSON body creates no enforcement record and cannot authorize donor-of-record tax transitions.",
    );
  }

  if (!isRecord(body)) {
    return buildBlockedResponse(
      400,
      "request_body_object_required",
      "The donor-of-record tax enforcement request must be a JSON object.",
    );
  }

  const requestBlockers = unsupportedKeys(body, REQUEST_KEYS, "request");
  const normalized = normalizeEvaluationInput(body.evaluationInput);
  if (!normalized.input) {
    return buildBlockedResponse(
      400,
      "invalid_evaluation_input",
      "Donor-of-record tax evaluation input is missing or malformed.",
      [...requestBlockers, ...normalized.blockers],
    );
  }

  const evaluation = evaluateMoralTradeDonorOfRecordTax(normalized.input);
  const contract = getMoralTradeDonorOfRecordTaxContract();
  const validation = validateMoralTradeDonorOfRecordTaxContract(contract);
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
    donorOfRecordTaxGateStatus: status,
    donorOfRecordTaxRequired: evaluation.donorOfRecordTaxRequired,
    enforcementStatus: status,
    evaluationHash,
    explicitDonorRecordCount: evaluation.explicitDonorRecordCount,
    idempotencyKey,
    matchedTradeLockAllowed: false,
    nonBlockingRecordCount: evaluation.nonBlockingRecordCount,
    ok: status === "pass",
    paymentAuthorizationAllowed: false,
    paymentCaptureAllowed: false,
    publicMetricPublicationAllowed: false,
    receiptIssuanceAllowed: false,
    receiptSafeRecordCount: evaluation.receiptSafeRecordCount,
    recordCount: evaluation.recordCount,
    releaseGatePromotionAllowed: false,
    stateMutation: false,
    transition: evaluation.transition,
    userFacingBlockerCategories: evaluation.userFacingBlockerCategories,
    validation,
    validatorVersion: MORAL_TRADE_DONOR_OF_RECORD_TAX_VALIDATOR_VERSION,
  };

  if (!hasSupabaseEnv()) {
    return buildMoralTradeApiJsonResponse(
      {
        ...responseBody,
        blockers: [...blockers, "supabase_unconfigured:donor_of_record_tax_enforce"],
        donorOfRecordTaxGateStatus: "blocked",
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
        blockers: [...blockers, "authentication_required:donor_of_record_tax_enforce"],
        donorOfRecordTaxGateStatus: "blocked",
        ok: false,
        persistenceStatus: "skipped_authentication_required",
      },
      "private_no_store",
      { status: 401 },
    );
  }

  const insert: DonorTaxEnforcementInsert = {
    blocker_codes: blockers,
    contract_version: contract.version,
    donor_of_record_tax_required_bool: evaluation.donorOfRecordTaxRequired,
    enforcement_input_json: normalized.input as unknown as Json,
    enforcement_status: status,
    evaluation_hash: evaluationHash,
    evaluation_result_json: evaluation as unknown as Json,
    explicit_donor_record_count: evaluation.explicitDonorRecordCount,
    idempotency_key: idempotencyKey,
    matched_trade_lock_allowed_bool: false,
    non_blocking_record_count: evaluation.nonBlockingRecordCount,
    owner_profile_id: user.id,
    payment_authorization_allowed_bool: false,
    payment_capture_allowed_bool: false,
    public_metric_publication_allowed_bool: false,
    receipt_issuance_allowed_bool: false,
    receipt_safe_record_count: evaluation.receiptSafeRecordCount,
    record_count: evaluation.recordCount,
    release_gate_promotion_allowed_bool: false,
    state_mutation_allowed_bool: false,
    transition: evaluation.transition,
    user_facing_blocker_categories: evaluation.userFacingBlockerCategories,
    validator_version: MORAL_TRADE_DONOR_OF_RECORD_TAX_VALIDATOR_VERSION,
  };
  const { error: insertError } = await client
    .from("moral_trade_donor_of_record_tax_enforcement_records")
    .insert(insert);

  if (insertError) {
    return buildMoralTradeApiJsonResponse(
      {
        ...responseBody,
        blockers: [...blockers, "database_insert_failed:donor_of_record_tax_enforce"],
        donorOfRecordTaxGateStatus: "blocked",
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
