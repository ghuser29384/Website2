import { createHash } from "node:crypto";

import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  MORAL_TRADE_CHALLENGE_APPEAL_VALIDATOR_VERSION,
  evaluateMoralTradeAppealCase,
  getMoralTradeChallengeAppealContract,
  validateMoralTradeChallengeAppealContract,
  type MoralTradeAppealCaseEvaluationInput,
  type MoralTradeAppealCaseRecord,
  type MoralTradeAppealCaseStatus,
  type MoralTradeAppealNoticeState,
  type MoralTradeAppealPolicyRecord,
  type MoralTradeAppealReviewStatus,
  type MoralTradeAppealTrigger,
  type MoralTradeChallengeAppealOutcome,
  type MoralTradeChallengeStanding,
  type MoralTradeChallengeSubject,
} from "@/lib/moral-trade/challenge-appeal";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database, Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_TEXT_FIELD_LENGTH = 600;
const MAX_IDEMPOTENCY_LENGTH = 160;
const MAX_RECORDS = 12;
const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

const SUBJECTS = new Set<MoralTradeChallengeSubject>([
  "claim",
  "evidence_row",
  "baseline_concern",
  "disclosure_decision",
  "externality_trigger",
  "completion_state",
  "policy_flag",
]);
const STANDINGS = new Set<MoralTradeChallengeStanding>([
  "participant",
  "counterparty",
  "affected_party",
  "reviewer",
  "admin_safety",
  "external_verifier",
]);
const TRIGGERS = new Set<MoralTradeAppealTrigger>([
  "duplicate_proof",
  "coercive_baseline",
  "wrong_scope_evidence",
  "material_factual_error",
  "privacy_disclosure_error",
  "externality_remedy_gap",
  "reviewer_conflict",
  "policy_misapplied",
]);
const OUTCOMES = new Set<MoralTradeChallengeAppealOutcome>([
  "uphold_decision",
  "request_evidence",
  "route_human_review",
  "open_challenge_window",
  "block_reliance",
  "record_remedy",
  "close_unresolved",
  "correct_record",
]);
const REVIEW_STATUSES = new Set<MoralTradeAppealReviewStatus>([
  "passed",
  "not_required_for_stage",
  "missing",
  "under_review",
  "failed",
  "stale",
  "superseded",
]);
const CASE_STATUSES = new Set<MoralTradeAppealCaseStatus>([
  "draft",
  "filed",
  "noticed",
  "under_neutral_review",
  "correction_requested",
  "upheld",
  "corrected",
  "dismissed",
  "closed_unresolved",
  "superseded",
  "stale",
]);
const NOTICE_STATES = new Set<MoralTradeAppealNoticeState>([
  "missing",
  "queued",
  "delivered",
  "failed",
  "not_required_for_stage",
]);
const REQUEST_KEYS = new Set(["evaluationInput", "idempotencyKey"]);
const EVALUATION_INPUT_KEYS = new Set([
  "appealCases",
  "checkedAt",
  "policies",
  "requiresAppealCase",
  "requiresNeutralReview",
  "subject",
  "trigger",
]);
const POLICY_KEYS = new Set([
  "deadlineRequired",
  "maxAppealAgeDays",
  "neutralReviewRequired",
  "nonRetaliationRequired",
  "noticeRequired",
  "policyHash",
  "policyId",
  "reviewedAt",
  "safetyBlockerWaiverProhibited",
  "settledObligationReopenProhibited",
  "status",
  "subject",
  "supersededBy",
]);
const APPEAL_CASE_KEYS = new Set([
  "appealCaseId",
  "caseHash",
  "deadlineAt",
  "evidenceScopeRefs",
  "expiresAt",
  "filedAt",
  "neutralReviewStatus",
  "nonRetaliationNoticeSent",
  "noticeState",
  "outcome",
  "policyRef",
  "privateDetailsRedacted",
  "reviewedAt",
  "safetyBlockerWaiverAttempted",
  "scopeHash",
  "settledObligationReopenAttempted",
  "standing",
  "standingStatus",
  "status",
  "subject",
  "supersededBy",
  "trigger",
]);

type ChallengeAppealEnforcementInsert =
  Database["public"]["Tables"]["moral_trade_challenge_appeal_enforcement_records"]["Insert"];

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

function nullableString(value: unknown) {
  const normalized = stringField(value);

  return normalized ? normalized : null;
}

function numberField(value: unknown, fallback: number, max = 1_000_000) {
  const numeric = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.min(max, Math.max(0, Math.round(numeric)));
}

function booleanField(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
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
    .map((key) => `${prefix}.${key}: unsupported challenge-appeal enforcement key`);
}

function normalizeStringArray(value: unknown, max = MAX_RECORDS) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .slice(0, max)
    .map((entry) => stringField(entry))
    .filter(Boolean);
}

function normalizePolicies(
  value: unknown,
  blockers: string[],
): MoralTradeAppealPolicyRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.slice(0, MAX_RECORDS).flatMap((entry, index) => {
    if (!isRecord(entry)) {
      blockers.push(`policies[${index}]: object is required`);

      return [];
    }

    blockers.push(...unsupportedKeys(entry, POLICY_KEYS, `policies[${index}]`));

    return [
      {
        deadlineRequired: booleanField(entry.deadlineRequired, true),
        maxAppealAgeDays: numberField(entry.maxAppealAgeDays, 30, 365),
        neutralReviewRequired: booleanField(entry.neutralReviewRequired, true),
        nonRetaliationRequired: booleanField(entry.nonRetaliationRequired, true),
        noticeRequired: booleanField(entry.noticeRequired, true),
        policyHash: stringField(entry.policyHash),
        policyId: stringField(entry.policyId, `appeal-policy-${index}`),
        reviewedAt: nullableString(entry.reviewedAt),
        safetyBlockerWaiverProhibited: booleanField(
          entry.safetyBlockerWaiverProhibited,
          true,
        ),
        settledObligationReopenProhibited: booleanField(
          entry.settledObligationReopenProhibited,
          true,
        ),
        status: enumField(
          entry.status,
          REVIEW_STATUSES,
          "missing",
          `policies[${index}].status`,
          blockers,
        ),
        subject: enumField(
          entry.subject,
          SUBJECTS,
          "claim",
          `policies[${index}].subject`,
          blockers,
          true,
        ),
        supersededBy: nullableString(entry.supersededBy),
      },
    ];
  });
}

function normalizeAppealCases(
  value: unknown,
  blockers: string[],
): MoralTradeAppealCaseRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.slice(0, MAX_RECORDS).flatMap((entry, index) => {
    if (!isRecord(entry)) {
      blockers.push(`appealCases[${index}]: object is required`);

      return [];
    }

    blockers.push(
      ...unsupportedKeys(entry, APPEAL_CASE_KEYS, `appealCases[${index}]`),
    );

    return [
      {
        appealCaseId: stringField(entry.appealCaseId, `appeal-case-${index}`),
        caseHash: stringField(entry.caseHash),
        deadlineAt: nullableString(entry.deadlineAt),
        evidenceScopeRefs: normalizeStringArray(entry.evidenceScopeRefs),
        expiresAt: nullableString(entry.expiresAt),
        filedAt: nullableString(entry.filedAt),
        neutralReviewStatus: enumField(
          entry.neutralReviewStatus,
          REVIEW_STATUSES,
          "missing",
          `appealCases[${index}].neutralReviewStatus`,
          blockers,
        ),
        nonRetaliationNoticeSent: booleanField(
          entry.nonRetaliationNoticeSent,
        ),
        noticeState: enumField(
          entry.noticeState,
          NOTICE_STATES,
          "missing",
          `appealCases[${index}].noticeState`,
          blockers,
        ),
        outcome: enumField(
          entry.outcome,
          OUTCOMES,
          "route_human_review",
          `appealCases[${index}].outcome`,
          blockers,
          true,
        ),
        policyRef: stringField(entry.policyRef),
        privateDetailsRedacted: booleanField(entry.privateDetailsRedacted),
        reviewedAt: nullableString(entry.reviewedAt),
        safetyBlockerWaiverAttempted: booleanField(
          entry.safetyBlockerWaiverAttempted,
        ),
        scopeHash: nullableString(entry.scopeHash),
        settledObligationReopenAttempted: booleanField(
          entry.settledObligationReopenAttempted,
        ),
        standing: enumField(
          entry.standing,
          STANDINGS,
          "participant",
          `appealCases[${index}].standing`,
          blockers,
          true,
        ),
        standingStatus: enumField(
          entry.standingStatus,
          REVIEW_STATUSES,
          "missing",
          `appealCases[${index}].standingStatus`,
          blockers,
        ),
        status: enumField(
          entry.status,
          CASE_STATUSES,
          "draft",
          `appealCases[${index}].status`,
          blockers,
        ),
        subject: enumField(
          entry.subject,
          SUBJECTS,
          "claim",
          `appealCases[${index}].subject`,
          blockers,
          true,
        ),
        supersededBy: nullableString(entry.supersededBy),
        trigger: enumField(
          entry.trigger,
          TRIGGERS,
          "material_factual_error",
          `appealCases[${index}].trigger`,
          blockers,
          true,
        ),
      },
    ];
  });
}

function normalizeEvaluationInput(value: unknown): {
  input?: MoralTradeAppealCaseEvaluationInput;
  blockers: string[];
} {
  const blockers: string[] = [];

  if (!isRecord(value)) {
    return { blockers: ["evaluationInput: object is required"] };
  }

  blockers.push(...unsupportedKeys(value, EVALUATION_INPUT_KEYS, "evaluationInput"));

  const input: MoralTradeAppealCaseEvaluationInput = {
    appealCases: normalizeAppealCases(value.appealCases, blockers),
    checkedAt: stringField(value.checkedAt) || new Date().toISOString(),
    policies: normalizePolicies(value.policies, blockers),
    requiresAppealCase: booleanField(value.requiresAppealCase, true),
    requiresNeutralReview: booleanField(value.requiresNeutralReview, true),
    subject: enumField(
      value.subject,
      SUBJECTS,
      "claim",
      "evaluationInput.subject",
      blockers,
      true,
    ),
    trigger: enumField(
      value.trigger,
      TRIGGERS,
      "material_factual_error",
      "evaluationInput.trigger",
      blockers,
      true,
    ),
  };

  return { input, blockers };
}

function normalizeIdempotencyKey(value: unknown, fallbackHash: string) {
  const normalized = stringField(value, "");

  if (normalized) {
    return normalized.slice(0, MAX_IDEMPOTENCY_LENGTH);
  }

  return `challenge-appeal-enforce:${fallbackHash}`;
}

function invalidRequestResponse({
  checkedAt,
  blockers,
  status = 400,
}: {
  checkedAt: string;
  blockers: string[];
  status?: number;
}) {
  const contract = getMoralTradeChallengeAppealContract();
  const contractValidation = validateMoralTradeChallengeAppealContract(contract);

  return buildMoralTradeApiJsonResponse(
    {
      ok: false,
      checkedAt,
      contractVersion: contract.version,
      challengeAppealGateStatus: "blocked",
      opensAppeal: false,
      correctsRecord: false,
      relianceBearingTransitionAllowed: false,
      safetyBlockerWaiverAllowed: false,
      settledObligationReopenAllowed: false,
      publicMetricAllowed: false,
      stateMutation: false,
      persistence: {
        requested: true,
        status: "not_recorded",
        recordId: null,
        table: "moral_trade_challenge_appeal_enforcement_records",
      },
      contractValidation,
      fallback:
        "Invalid challenge-appeal enforcement input creates no enforcement record and cannot open appeals, correct records, authorize reliance, waive safety blockers, reopen settled obligations, or publish metrics.",
      blockers,
    },
    "private_no_store",
    { status },
  );
}

export async function POST(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(
    request,
    "challenge_appeal_enforce",
  );
  const checkedAt = new Date().toISOString();

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited challenge-appeal enforcement creates no enforcement record and cannot open appeals, correct records, authorize reliance, waive safety blockers, reopen settled obligations, or publish metrics.",
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

  const contract = getMoralTradeChallengeAppealContract();
  const contractValidation = validateMoralTradeChallengeAppealContract(contract);
  const evaluation = evaluateMoralTradeAppealCase(normalized.input);
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
    challengeAppealGateStatus:
      evaluation.status === "pass" ? "non_blocking" : "blocked",
    opensAppeal: false,
    correctsRecord: false,
    relianceBearingTransitionAllowed: false,
    safetyBlockerWaiverAllowed: false,
    settledObligationReopenAllowed: false,
    publicMetricAllowed: false,
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
          table: "moral_trade_challenge_appeal_enforcement_records",
        },
        fallback:
          "Challenge-appeal enforcement was evaluated but not recorded because Supabase is not configured; no appeal, correction, reliance, safety-waiver, settled-obligation, or public-metric state changed.",
        blockers: [
          ...blockers,
          "supabase_unconfigured:challenge_appeal_enforce",
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
          table: "moral_trade_challenge_appeal_enforcement_records",
        },
        fallback:
          "Authentication is required before recording challenge-appeal enforcement. No appeal, correction, reliance, safety-waiver, settled-obligation, or public-metric state changed.",
        blockers: [
          ...blockers,
          "authentication_required:challenge_appeal_enforce",
        ],
      },
      "private_no_store",
      { status: 401 },
    );
  }

  const existing = await supabase
    .from("moral_trade_challenge_appeal_enforcement_records")
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
          table: "moral_trade_challenge_appeal_enforcement_records",
        },
      },
      "private_no_store",
    );
  }

  const insert: ChallengeAppealEnforcementInsert = {
    appeal_case_count: evaluation.appealCaseCount,
    blocker_codes: evaluation.blockers,
    contract_version: contract.version,
    corrects_record_bool: false,
    enforcement_input_json: normalized.input as unknown as Json,
    enforcement_status: evaluation.status,
    evaluation_hash: evaluationHash,
    evaluation_result_json: evaluation as unknown as Json,
    idempotency_key: idempotencyKey,
    opens_appeal_bool: false,
    owner_profile_id: user.id,
    policy_count: evaluation.policyCount,
    public_metric_allowed_bool: false,
    reliance_bearing_transition_allowed_bool: false,
    requires_appeal_case_bool: normalized.input.requiresAppealCase,
    requires_neutral_review_bool: normalized.input.requiresNeutralReview,
    safety_blocker_waiver_allowed_bool: false,
    settled_obligation_reopen_allowed_bool: false,
    subject: evaluation.subject,
    trigger: evaluation.trigger,
    user_facing_blocker_categories: evaluation.userFacingBlockerCategories,
    validator_version: MORAL_TRADE_CHALLENGE_APPEAL_VALIDATOR_VERSION,
  };
  const { data, error } = await supabase
    .from("moral_trade_challenge_appeal_enforcement_records")
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
          table: "moral_trade_challenge_appeal_enforcement_records",
        },
        fallback:
          "The challenge-appeal enforcement result could not be recorded. No appeal, correction, reliance, safety-waiver, settled-obligation, or public-metric state changed.",
        blockers: [
          ...blockers,
          "database_insert_failed:challenge_appeal_enforce",
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
        table: "moral_trade_challenge_appeal_enforcement_records",
      },
    },
    "private_no_store",
    { status: contractValidation.status === "pass" ? 201 : 422 },
  );
}
