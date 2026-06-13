import { createHash } from "node:crypto";

import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  MORAL_TRADE_SIDE_AGREEMENTS_VALIDATOR_VERSION,
  evaluateMoralTradeSideAgreementDisclosure,
  getMoralTradeSideAgreementContract,
  validateMoralTradeSideAgreementContract,
  type MoralTradeSideAgreementDisclosureRecord,
  type MoralTradeSideAgreementDisclosureStatus,
  type MoralTradeSideAgreementEvaluationInput,
  type MoralTradeSideAgreementNoticeStatus,
  type MoralTradeSideAgreementPolicySnapshotStatus,
  type MoralTradeSideAgreementReviewDimension,
  type MoralTradeSideAgreementReviewStatus,
  type MoralTradeSideAgreementSubjectType,
  type MoralTradeSideAgreementTransition,
} from "@/lib/moral-trade/side-agreements";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database, Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_TEXT_FIELD_LENGTH = 800;
const MAX_IDEMPOTENCY_LENGTH = 160;
const MAX_DISCLOSURES = 12;
const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

const TRANSITIONS = new Set<MoralTradeSideAgreementTransition>([
  "draft_preview",
  "matched_trade_lock",
  "payment_capture",
  "payout_release",
  "public_completion_claim",
  "challenge_decision",
  "release_gate_promotion",
]);
const SUBJECT_TYPES = new Set<MoralTradeSideAgreementSubjectType>([
  "donation_offset",
  "pledge_swap",
  "compensated_moral_action",
  "performance_bond",
  "evidence_term",
  "challenge_term",
  "recipient_choice",
  "common_ground_budget",
  "public_goods_round",
]);
const DISCLOSURE_STATUSES = new Set<MoralTradeSideAgreementDisclosureStatus>([
  "none_declared",
  "disclosed",
  "under_review",
  "non_blocking",
  "blocked",
  "missing",
  "stale",
  "superseded",
]);
const NOTICE_STATUSES = new Set<MoralTradeSideAgreementNoticeStatus>([
  "sent",
  "not_required_for_stage",
  "missing",
  "failed",
  "stale",
]);
const POLICY_STATUSES = new Set<MoralTradeSideAgreementPolicySnapshotStatus>([
  "resolved_immutable",
  "missing",
  "mutable",
  "stale",
  "superseded",
]);
const REVIEW_DIMENSIONS = new Set<MoralTradeSideAgreementReviewDimension>([
  "collusion",
  "externality",
  "legal_jurisdiction",
  "anti_threat",
  "reporting_integrity",
  "civil_rights_discrimination",
  "participant_autonomy",
  "confidentiality_privacy_rights",
  "financial_crime_fraud",
  "anti_corruption",
  "representative_authority",
]);
const REVIEW_STATUSES = new Set<MoralTradeSideAgreementReviewStatus>([
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
const EVALUATION_INPUT_KEYS = new Set(["checkedAt", "disclosures", "transition"]);
const DISCLOSURE_KEYS = new Set([
  "disclosureHash",
  "disclosureId",
  "disclosureStatus",
  "expiresAt",
  "participantNoticeStatus",
  "policySnapshotStatus",
  "privateDetailsRedacted",
  "publicSafeSummary",
  "reviewStatuses",
  "reviewedAt",
  "sideAgreementPresent",
  "subjectRef",
  "subjectType",
  "supersededBy",
]);

type SideAgreementEnforcementInsert =
  Database["public"]["Tables"]["moral_trade_side_agreement_enforcement_records"]["Insert"];

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
    .map((key) => `${prefix}.${key}: unsupported side-agreement enforcement key`);
}

function normalizeReviewStatuses(
  value: unknown,
  index: number,
  blockers: string[],
): MoralTradeSideAgreementDisclosureRecord["reviewStatuses"] {
  const record = isRecord(value) ? value : {};

  if (!isRecord(value)) {
    blockers.push(`evaluationInput.disclosures.${index}.reviewStatuses: object is required`);
  } else {
    blockers.push(
      ...unsupportedKeys(
        record,
        new Set([...REVIEW_DIMENSIONS]),
        `evaluationInput.disclosures.${index}.reviewStatuses`,
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
        `evaluationInput.disclosures.${index}.reviewStatuses.${dimension}`,
        blockers,
      ),
    ]),
  ) as MoralTradeSideAgreementDisclosureRecord["reviewStatuses"];
}

function normalizeDisclosure(
  value: unknown,
  index: number,
  blockers: string[],
): MoralTradeSideAgreementDisclosureRecord {
  const record = isRecord(value) ? value : {};

  if (!isRecord(value)) {
    blockers.push(`evaluationInput.disclosures.${index}: object is required`);
  } else {
    blockers.push(
      ...unsupportedKeys(record, DISCLOSURE_KEYS, `evaluationInput.disclosures.${index}`),
    );
  }

  return {
    disclosureHash: hashField(record.disclosureHash),
    disclosureId: stringField(record.disclosureId, `submitted-side-agreement-${index + 1}`),
    disclosureStatus: enumField(
      record.disclosureStatus,
      DISCLOSURE_STATUSES,
      "missing",
      `evaluationInput.disclosures.${index}.disclosureStatus`,
      blockers,
    ),
    expiresAt: nullableString(record.expiresAt),
    participantNoticeStatus: enumField(
      record.participantNoticeStatus,
      NOTICE_STATUSES,
      "missing",
      `evaluationInput.disclosures.${index}.participantNoticeStatus`,
      blockers,
    ),
    policySnapshotStatus: enumField(
      record.policySnapshotStatus,
      POLICY_STATUSES,
      "missing",
      `evaluationInput.disclosures.${index}.policySnapshotStatus`,
      blockers,
    ),
    privateDetailsRedacted: booleanField(record.privateDetailsRedacted),
    publicSafeSummary: stringField(record.publicSafeSummary),
    reviewedAt: stringField(record.reviewedAt),
    reviewStatuses: normalizeReviewStatuses(record.reviewStatuses, index, blockers),
    sideAgreementPresent: booleanField(record.sideAgreementPresent),
    subjectRef: stringField(record.subjectRef, `submitted-subject-${index + 1}`),
    subjectType: enumField(
      record.subjectType,
      SUBJECT_TYPES,
      "donation_offset",
      `evaluationInput.disclosures.${index}.subjectType`,
      blockers,
    ),
    supersededBy: nullableString(record.supersededBy),
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

  const disclosures = Array.isArray(value.disclosures)
    ? value.disclosures
        .slice(0, MAX_DISCLOSURES)
        .map((entry, index) => normalizeDisclosure(entry, index, blockers))
    : [];

  const input: MoralTradeSideAgreementEvaluationInput = {
    checkedAt: stringField(value.checkedAt) || undefined,
    disclosures,
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

  return normalized || `side-agreement-enforce:${fallbackHash}`;
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
  const contract = getMoralTradeSideAgreementContract();
  const contractValidation = validateMoralTradeSideAgreementContract(contract);

  return buildMoralTradeApiJsonResponse(
    {
      ok: false,
      checkedAt,
      contractVersion: contract.version,
      sideAgreementGateStatus: "blocked",
      lockTransitionAllowed: false,
      paymentTransitionAllowed: false,
      payoutReleaseAllowed: false,
      relianceBearingTransitionAllowed: false,
      challengeDecisionAllowed: false,
      publicCompletionClaimAllowed: false,
      releaseGatePromotionAllowed: false,
      stateMutation: false,
      persistence: {
        requested: true,
        status: "not_recorded",
        recordId: null,
        table: "moral_trade_side_agreement_enforcement_records",
      },
      contractValidation,
      fallback:
        "Invalid side-agreement enforcement input creates no enforcement record and cannot authorize lock, payment, payout, reliance, challenge decisions, public completion, or release promotion.",
      blockers,
    },
    "private_no_store",
    { status },
  );
}

export async function POST(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "side_agreement_enforce");
  const checkedAt = new Date().toISOString();

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited side-agreement enforcement creates no enforcement record and cannot authorize lock, payment, payout, reliance, challenge decisions, public completion, or release promotion.",
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

  const contract = getMoralTradeSideAgreementContract();
  const contractValidation = validateMoralTradeSideAgreementContract(contract);
  const evaluation = evaluateMoralTradeSideAgreementDisclosure(normalized.input);
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
    sideAgreementGateStatus: evaluation.status === "pass" ? "non_blocking" : "blocked",
    lockTransitionAllowed: false,
    paymentTransitionAllowed: false,
    payoutReleaseAllowed: false,
    relianceBearingTransitionAllowed: false,
    challengeDecisionAllowed: false,
    publicCompletionClaimAllowed: false,
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
          table: "moral_trade_side_agreement_enforcement_records",
        },
        fallback:
          "Side-agreement enforcement was evaluated but not recorded because Supabase is not configured; no lock, payment, payout, reliance, challenge, completion, or release-promotion state changed.",
        blockers: [...blockers, "supabase_unconfigured:side_agreement_enforce"],
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
          table: "moral_trade_side_agreement_enforcement_records",
        },
        fallback:
          "Authentication is required before recording side-agreement enforcement. No lock, payment, payout, reliance, challenge, completion, or release-promotion state changed.",
        blockers: [...blockers, "authentication_required:side_agreement_enforce"],
      },
      "private_no_store",
      { status: 401 },
    );
  }

  const existing = await supabase
    .from("moral_trade_side_agreement_enforcement_records")
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
          table: "moral_trade_side_agreement_enforcement_records",
        },
      },
      "private_no_store",
    );
  }

  const insert: SideAgreementEnforcementInsert = {
    blocker_codes: evaluation.blockers,
    challenge_decision_allowed_bool: false,
    contract_version: contract.version,
    disclosure_count: normalized.input.disclosures.length,
    enforcement_input_json: normalized.input as unknown as Json,
    enforcement_status: evaluation.status,
    evaluation_hash: evaluationHash,
    evaluation_result_json: evaluation as unknown as Json,
    idempotency_key: idempotencyKey,
    lock_transition_allowed_bool: false,
    owner_profile_id: user.id,
    passing_disclosure_count: evaluation.passingDisclosureCount,
    payment_transition_allowed_bool: false,
    payout_release_allowed_bool: false,
    public_completion_claim_allowed_bool: false,
    release_gate_promotion_allowed_bool: false,
    reliance_bearing_transition_allowed_bool: false,
    required_disclosure_count: evaluation.requiredDisclosureCount,
    transition: evaluation.transition,
    user_facing_blocker_categories: evaluation.userFacingBlockerCategories,
    validator_version: MORAL_TRADE_SIDE_AGREEMENTS_VALIDATOR_VERSION,
  };
  const { data, error } = await supabase
    .from("moral_trade_side_agreement_enforcement_records")
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
          table: "moral_trade_side_agreement_enforcement_records",
        },
        fallback:
          "The side-agreement enforcement result could not be recorded. No lock, payment, payout, reliance, challenge, completion, or release-promotion state changed.",
        blockers: [...blockers, "database_insert_failed:side_agreement_enforce"],
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
        table: "moral_trade_side_agreement_enforcement_records",
      },
    },
    "private_no_store",
    { status: contractValidation.status === "pass" ? 201 : 422 },
  );
}
