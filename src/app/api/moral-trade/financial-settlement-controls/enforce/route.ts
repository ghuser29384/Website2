import { createHash } from "node:crypto";

import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  MORAL_TRADE_FINANCIAL_SETTLEMENT_CONTROLS_VALIDATOR_VERSION,
  evaluateMoralTradeFinancialSettlementControls,
  getMoralTradeFinancialSettlementControlsContract,
  validateMoralTradeFinancialSettlementControlsContract,
  type MoralTradeChallengeWindowStatus,
  type MoralTradeCurrencyStatus,
  type MoralTradeFeeDisclosureStatus,
  type MoralTradeFinancialSettlementControlKey,
  type MoralTradeFinancialSettlementControlRecord,
  type MoralTradeFinancialSettlementControlStatus,
  type MoralTradeFinancialSettlementEvaluationInput,
  type MoralTradeFinancialSettlementSubjectType,
  type MoralTradeFinancialSettlementTransition,
  type MoralTradeFxSnapshotStatus,
  type MoralTradeMetricExclusionStatus,
  type MoralTradeNoticeDeliveryStatus,
  type MoralTradePayoutDestinationStatus,
  type MoralTradePayoutMilestoneStatus,
  type MoralTradeSettlementEvidenceStatus,
  type MoralTradeSettlementPolicySnapshotStatus,
  type MoralTradeTimeAuthorityStatus,
} from "@/lib/moral-trade/financial-settlement-controls";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database, Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_TEXT_FIELD_LENGTH = 1_200;
const MAX_IDEMPOTENCY_LENGTH = 160;
const MAX_RECORDS = 64;
const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

const TRANSITIONS = new Set<MoralTradeFinancialSettlementTransition>([
  "draft_preview",
  "public_preview",
  "matched_trade_lock",
  "payment_authorization",
  "payment_capture",
  "challenge_window_default",
  "payout_milestone_release",
  "public_metric_publication",
  "release_gate_promotion",
]);
const CONTROL_KEYS = new Set<MoralTradeFinancialSettlementControlKey>([
  "platform_fee_policy",
  "platform_fee_disclosure",
  "fx_policy",
  "fx_rate_snapshot",
  "notification_policy",
  "material_notice_record",
  "time_authority_policy",
  "server_deadline_record",
  "challenge_window_record",
  "payout_milestone_record",
  "payout_milestone_evidence",
  "payout_destination_binding",
]);
const SUBJECT_TYPES = new Set<MoralTradeFinancialSettlementSubjectType>([
  "donation_offset",
  "pledge_swap",
  "compensated_moral_action",
  "common_ground_budget",
  "public_goods_round",
  "matched_trade_lock_proposal",
  "payment_event",
  "payout_milestone",
  "challenge_window",
  "release_gate",
]);
const CONTROL_STATUSES = new Set<MoralTradeFinancialSettlementControlStatus>([
  "passed",
  "not_required_for_stage",
  "missing",
  "under_review",
  "blocked",
  "stale",
  "superseded",
]);
const POLICY_STATUSES = new Set<MoralTradeSettlementPolicySnapshotStatus>([
  "resolved_immutable",
  "missing",
  "mutable",
  "stale",
  "superseded",
]);
const POLICY_SUBJECTS = new Set<
  MoralTradeFinancialSettlementControlRecord["policySnapshotSubject"]
>([
  "platform_fee",
  "fx",
  "notification",
  "time_authority",
  "challenge_window",
  "payout_milestone",
]);
const CURRENCY_STATUSES = new Set<MoralTradeCurrencyStatus>([
  "explicit_currency",
  "inherits_settlement_currency",
  "not_required_for_stage",
  "missing",
  "currency_mismatch",
  "stale",
]);
const FEE_STATUSES = new Set<MoralTradeFeeDisclosureStatus>([
  "displayed_separately",
  "not_required_for_stage",
  "missing",
  "bundled_into_moral_volume",
  "stale",
]);
const FX_STATUSES = new Set<MoralTradeFxSnapshotStatus>([
  "snapshot_current",
  "not_required_for_stage",
  "missing",
  "expired",
  "spread_hidden",
  "fee_not_separated",
  "stale",
]);
const METRIC_STATUSES = new Set<MoralTradeMetricExclusionStatus>([
  "excluded",
  "not_required_for_stage",
  "missing",
  "included_in_moral_volume",
  "included_in_qf_signal",
  "included_in_threshold_progress",
  "included_in_impact_claim",
  "stale",
]);
const NOTICE_STATUSES = new Set<MoralTradeNoticeDeliveryStatus>([
  "delivered_confirmed",
  "not_required_for_stage",
  "missing",
  "failed",
  "unconfirmed_channel",
  "stale",
]);
const TIME_AUTHORITY_STATUSES = new Set<MoralTradeTimeAuthorityStatus>([
  "server_authoritative",
  "not_required_for_stage",
  "missing",
  "client_clock_used",
  "unsynchronized_job",
  "mutable_display_time",
  "stale",
]);
const CHALLENGE_WINDOW_STATUSES = new Set<MoralTradeChallengeWindowStatus>([
  "open_or_not_required",
  "closed_after_notice",
  "not_required_for_stage",
  "missing",
  "expired_without_notice",
  "defaulted_against_participant",
  "stale",
]);
const PAYOUT_MILESTONE_STATUSES = new Set<MoralTradePayoutMilestoneStatus>([
  "releasable",
  "not_required_for_stage",
  "missing",
  "under_review",
  "blocked",
  "destination_mismatch",
  "evidence_missing",
  "challenge_open",
  "stale",
  "superseded",
]);
const EVIDENCE_STATUSES = new Set<MoralTradeSettlementEvidenceStatus>([
  "claim_typed_evidence_passed",
  "not_required_for_stage",
  "missing",
  "under_review",
  "failed",
  "stale",
]);
const DESTINATION_STATUSES = new Set<MoralTradePayoutDestinationStatus>([
  "verified_destination_bound",
  "not_required_for_stage",
  "missing",
  "unverified",
  "changed_after_lock",
  "stale",
]);
const REQUEST_KEYS = new Set(["evaluationInput", "idempotencyKey"]);
const EVALUATION_INPUT_KEYS = new Set(["checkedAt", "records", "transition"]);
const RECORD_KEYS = new Set([
  "challengeWindowStatus",
  "controlHash",
  "controlId",
  "controlKey",
  "currencyStatus",
  "destinationStatus",
  "evidenceStatus",
  "expiresAt",
  "feeDisclosureStatus",
  "fxSnapshotStatus",
  "metricExclusionStatus",
  "noticeDeliveryStatus",
  "payoutMilestoneStatus",
  "policySnapshotStatus",
  "policySnapshotSubject",
  "reviewedAt",
  "status",
  "subjectRef",
  "subjectType",
  "supersededBy",
  "timeAuthorityStatus",
]);

type FinancialSettlementControlEnforcementInsert =
  Database["public"]["Tables"]["moral_trade_financial_settlement_control_enforcement_records"]["Insert"];

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

function unsupportedKeys(
  value: Record<string, unknown>,
  allowed: Set<string>,
  prefix: string,
) {
  return Object.keys(value)
    .filter((key) => !allowed.has(key))
    .map((key) => `${prefix}.${key}: unsupported financial-settlement enforcement key`);
}

function normalizeRecord(
  value: unknown,
  index: number,
  blockers: string[],
): MoralTradeFinancialSettlementControlRecord {
  const record = isRecord(value) ? value : {};
  const prefix = `evaluationInput.records.${index}`;

  if (!isRecord(value)) {
    blockers.push(`${prefix}: object is required`);
  } else {
    blockers.push(...unsupportedKeys(record, RECORD_KEYS, prefix));
  }

  return {
    challengeWindowStatus: enumField(
      record.challengeWindowStatus,
      CHALLENGE_WINDOW_STATUSES,
      "missing",
      `${prefix}.challengeWindowStatus`,
      blockers,
      true,
    ),
    controlHash: requiredHashField(record.controlHash, `${prefix}.controlHash`, blockers),
    controlId: requiredStringField(
      record.controlId,
      `${prefix}.controlId`,
      blockers,
      `submitted-financial-settlement-control-${index + 1}`,
    ),
    controlKey: enumField(
      record.controlKey,
      CONTROL_KEYS,
      "platform_fee_policy",
      `${prefix}.controlKey`,
      blockers,
      true,
    ),
    currencyStatus: enumField(
      record.currencyStatus,
      CURRENCY_STATUSES,
      "missing",
      `${prefix}.currencyStatus`,
      blockers,
      true,
    ),
    destinationStatus: enumField(
      record.destinationStatus,
      DESTINATION_STATUSES,
      "missing",
      `${prefix}.destinationStatus`,
      blockers,
      true,
    ),
    evidenceStatus: enumField(
      record.evidenceStatus,
      EVIDENCE_STATUSES,
      "missing",
      `${prefix}.evidenceStatus`,
      blockers,
      true,
    ),
    expiresAt: nullableString(record.expiresAt),
    feeDisclosureStatus: enumField(
      record.feeDisclosureStatus,
      FEE_STATUSES,
      "missing",
      `${prefix}.feeDisclosureStatus`,
      blockers,
      true,
    ),
    fxSnapshotStatus: enumField(
      record.fxSnapshotStatus,
      FX_STATUSES,
      "missing",
      `${prefix}.fxSnapshotStatus`,
      blockers,
      true,
    ),
    metricExclusionStatus: enumField(
      record.metricExclusionStatus,
      METRIC_STATUSES,
      "missing",
      `${prefix}.metricExclusionStatus`,
      blockers,
      true,
    ),
    noticeDeliveryStatus: enumField(
      record.noticeDeliveryStatus,
      NOTICE_STATUSES,
      "missing",
      `${prefix}.noticeDeliveryStatus`,
      blockers,
      true,
    ),
    payoutMilestoneStatus: enumField(
      record.payoutMilestoneStatus,
      PAYOUT_MILESTONE_STATUSES,
      "missing",
      `${prefix}.payoutMilestoneStatus`,
      blockers,
      true,
    ),
    policySnapshotStatus: enumField(
      record.policySnapshotStatus,
      POLICY_STATUSES,
      "missing",
      `${prefix}.policySnapshotStatus`,
      blockers,
      true,
    ),
    policySnapshotSubject: enumField(
      record.policySnapshotSubject,
      POLICY_SUBJECTS,
      "platform_fee",
      `${prefix}.policySnapshotSubject`,
      blockers,
      true,
    ),
    reviewedAt: requiredStringField(
      record.reviewedAt,
      `${prefix}.reviewedAt`,
      blockers,
    ),
    status: enumField(
      record.status,
      CONTROL_STATUSES,
      "missing",
      `${prefix}.status`,
      blockers,
      true,
    ),
    subjectRef: requiredStringField(
      record.subjectRef,
      `${prefix}.subjectRef`,
      blockers,
      `submitted-financial-settlement-subject-${index + 1}`,
    ),
    subjectType: enumField(
      record.subjectType,
      SUBJECT_TYPES,
      "matched_trade_lock_proposal",
      `${prefix}.subjectType`,
      blockers,
      true,
    ),
    supersededBy: nullableString(record.supersededBy),
    timeAuthorityStatus: enumField(
      record.timeAuthorityStatus,
      TIME_AUTHORITY_STATUSES,
      "missing",
      `${prefix}.timeAuthorityStatus`,
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

  if (Array.isArray(value.records) && value.records.length > MAX_RECORDS) {
    blockers.push(`evaluationInput.records: at most ${MAX_RECORDS} records are supported`);
  }

  const input: MoralTradeFinancialSettlementEvaluationInput = {
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

  return normalized || `financial-settlement-controls-enforce:${fallbackHash}`;
}

function authorizationFields() {
  return {
    challengeWindowDefaultAllowed: false,
    draftPreviewAllowed: false,
    matchedTradeLockAllowed: false,
    paymentAuthorizationAllowed: false,
    paymentCaptureAllowed: false,
    payoutMilestoneReleaseAllowed: false,
    publicMetricPublicationAllowed: false,
    publicPreviewAllowed: false,
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
  const contract = getMoralTradeFinancialSettlementControlsContract();
  const contractValidation =
    validateMoralTradeFinancialSettlementControlsContract(contract);

  return buildMoralTradeApiJsonResponse(
    {
      ok: false,
      checkedAt,
      contractVersion: contract.version,
      financialSettlementControlsGateStatus: "blocked",
      ...authorizationFields(),
      stateMutation: false,
      persistence: {
        requested: true,
        status: "not_recorded",
        recordId: null,
        table: "moral_trade_financial_settlement_control_enforcement_records",
      },
      contractValidation,
      fallback:
        "Invalid financial-settlement enforcement input creates no enforcement record and cannot authorize public preview, matched-trade lock, payment authorization, payment capture, challenge default, payout milestone release, public metric publication, or release promotion.",
      blockers,
    },
    "private_no_store",
    { status },
  );
}

export async function POST(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(
    request,
    "financial_settlement_controls_enforce",
  );
  const checkedAt = new Date().toISOString();

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited financial-settlement enforcement creates no enforcement record and cannot authorize public preview, matched-trade lock, payment authorization, payment capture, challenge default, payout milestone release, public metric publication, or release promotion.",
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

  const contract = getMoralTradeFinancialSettlementControlsContract();
  const contractValidation =
    validateMoralTradeFinancialSettlementControlsContract(contract);
  const evaluation = evaluateMoralTradeFinancialSettlementControls(normalized.input);
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
    financialSettlementControlsGateStatus:
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
          table: "moral_trade_financial_settlement_control_enforcement_records",
        },
        fallback:
          "Financial-settlement enforcement was evaluated but not recorded because Supabase is not configured; no public preview, matched-trade lock, payment authorization, payment capture, challenge default, payout milestone release, public metric publication, or release-promotion state changed.",
        blockers: [
          ...blockers,
          "supabase_unconfigured:financial_settlement_controls_enforce",
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
          table: "moral_trade_financial_settlement_control_enforcement_records",
        },
        fallback:
          "Authentication is required before recording financial-settlement enforcement. No public preview, matched-trade lock, payment authorization, payment capture, challenge default, payout milestone release, public metric publication, or release-promotion state changed.",
        blockers: [
          ...blockers,
          "authentication_required:financial_settlement_controls_enforce",
        ],
      },
      "private_no_store",
      { status: 401 },
    );
  }

  const existing = await supabase
    .from("moral_trade_financial_settlement_control_enforcement_records")
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
          table: "moral_trade_financial_settlement_control_enforcement_records",
        },
      },
      "private_no_store",
    );
  }

  const insert: FinancialSettlementControlEnforcementInsert = {
    blocker_codes: evaluation.blockers,
    blocker_count: evaluation.blockers.length,
    challenge_window_default_allowed_bool: false,
    contract_version: contract.version,
    draft_preview_allowed_bool: false,
    enforcement_input_json: normalized.input as unknown as Json,
    enforcement_status: evaluation.status,
    evaluation_hash: evaluationHash,
    evaluation_result_json: evaluation as unknown as Json,
    idempotency_key: idempotencyKey,
    matched_trade_lock_allowed_bool: false,
    owner_profile_id: user.id,
    passing_control_count: evaluation.passingControlCount,
    payment_authorization_allowed_bool: false,
    payment_capture_allowed_bool: false,
    payout_milestone_release_allowed_bool: false,
    public_metric_publication_allowed_bool: false,
    public_preview_allowed_bool: false,
    record_count: normalized.input.records.length,
    release_gate_promotion_allowed_bool: false,
    required_control_count: evaluation.requiredControlCount,
    transition: evaluation.transition,
    user_facing_blocker_categories: evaluation.userFacingBlockerCategories,
    validator_version: MORAL_TRADE_FINANCIAL_SETTLEMENT_CONTROLS_VALIDATOR_VERSION,
  };
  const { data, error } = await supabase
    .from("moral_trade_financial_settlement_control_enforcement_records")
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
          table: "moral_trade_financial_settlement_control_enforcement_records",
        },
        fallback:
          "The financial-settlement enforcement result could not be recorded. No public preview, matched-trade lock, payment authorization, payment capture, challenge default, payout milestone release, public metric publication, or release-promotion state changed.",
        blockers: [
          ...blockers,
          "database_insert_failed:financial_settlement_controls_enforce",
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
        table: "moral_trade_financial_settlement_control_enforcement_records",
      },
    },
    "private_no_store",
    { status: contractValidation.status === "pass" ? 201 : 422 },
  );
}
