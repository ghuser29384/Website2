import { createHash } from "node:crypto";

import {
  MORAL_TRADE_ACCOUNT_SECURITY_VALIDATOR_VERSION,
  evaluateMoralTradeAccountSecurity,
  getMoralTradeAccountSecurityContract,
  validateMoralTradeAccountSecurityContract,
  type MoralTradeAccountRecoveryBehavior,
  type MoralTradeAccountSecurityAction,
  type MoralTradeAccountSecurityEventRecord,
  type MoralTradeAccountSecurityEventType,
  type MoralTradeAccountSecurityEvaluationInput,
  type MoralTradeAccountSecurityHighRiskBehavior,
  type MoralTradeAccountSecurityPolicyRecord,
  type MoralTradeAccountSecurityPolicySnapshotStatus,
  type MoralTradeAccountSecurityRemediationStatus,
  type MoralTradeAccountSecurityReviewerDecisionStatus,
  type MoralTradeAccountSecurityRiskState,
  type MoralTradeAccountSecuritySubjectType,
} from "@/lib/moral-trade/account-security";
import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database, Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_TEXT_FIELD_LENGTH = 1_200;
const MAX_IDEMPOTENCY_LENGTH = 160;
const MAX_POLICIES = 32;
const MAX_EVENTS = 96;
const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
const REQUEST_KEYS = new Set(["evaluationInput", "idempotencyKey"]);
const EVALUATION_INPUT_KEYS = new Set(["action", "checkedAt", "events", "policies"]);
const POLICY_KEYS = new Set([
  "accountRecoveryBehavior",
  "appliesToAction",
  "cooldownHours",
  "evidenceHash",
  "highRiskBehavior",
  "noticeRequired",
  "policyId",
  "policySnapshotStatus",
  "policyVersion",
  "reviewedAt",
  "reviewerDecisionStatus",
  "riskSignals",
  "stepUpRequired",
  "supersededBy",
  "trustedDeviceRequired",
]);
const EVENT_KEYS = new Set([
  "actionSubjectId",
  "actionSubjectType",
  "cooldownUntil",
  "eventHash",
  "eventId",
  "eventType",
  "expiresAt",
  "noticeStatus",
  "participantIdHash",
  "policyRef",
  "recordedAt",
  "reviewerDecisionStatus",
  "riskState",
  "stepUpStatus",
  "supersededBy",
  "trustedDeviceStatus",
]);
const POLICY_STATUSES = new Set<MoralTradeAccountSecurityPolicySnapshotStatus>([
  "resolved_immutable",
  "missing",
  "mutable",
  "stale",
  "superseded",
]);
const HIGH_RISK_BEHAVIORS = new Set<MoralTradeAccountSecurityHighRiskBehavior>([
  "block",
  "step_up",
  "cooldown",
  "manual_review",
]);
const ACCOUNT_RECOVERY_BEHAVIORS = new Set<MoralTradeAccountRecoveryBehavior>([
  "block_real_money",
  "manual_review",
  "limited_access",
]);
const REVIEW_DECISION_STATUSES = new Set<MoralTradeAccountSecurityReviewerDecisionStatus>([
  "approved",
  "not_required_for_stage",
  "missing",
  "blocked",
  "expired",
  "superseded",
]);
const REMEDIATION_STATUSES = new Set<MoralTradeAccountSecurityRemediationStatus>([
  "passed",
  "delivered",
  "approved",
  "not_required_for_stage",
  "missing",
  "failed",
  "stale",
  "under_review",
]);
const RISK_STATES = new Set<MoralTradeAccountSecurityRiskState>([
  "low",
  "medium",
  "high",
  "blocked",
  "manual_review",
  "stale",
]);
const SUBJECT_TYPES = new Set<MoralTradeAccountSecuritySubjectType>([
  "common_ground_budget",
  "offset_offer",
  "pledge_swap_offer",
  "cleared_trade_agreement",
  "privacy_grant",
  "payment_event",
  "payout_milestone",
  "contact_interaction_record",
  "participant_confirmation_record",
  "participant_eligibility_record",
]);

type AccountSecurityEnforcementInsert =
  Database["public"]["Tables"]["moral_trade_account_security_enforcement_records"]["Insert"];

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

function booleanField(value: unknown, key: string, blockers: string[]) {
  if (typeof value === "boolean") {
    return value;
  }

  blockers.push(`${key}: boolean is required`);

  return false;
}

function nonNegativeIntegerField(value: unknown, key: string, blockers: string[]) {
  if (Number.isInteger(value) && Number(value) >= 0) {
    return Number(value);
  }

  blockers.push(`${key}: non-negative integer is required`);

  return 0;
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

function stringArrayField(value: unknown, key: string, blockers: string[]) {
  if (!Array.isArray(value)) {
    blockers.push(`${key}: string array is required`);

    return [];
  }

  return value.map((entry, index) => {
    const normalized = stringField(entry);

    if (!normalized) {
      blockers.push(`${key}.${index}: non-empty string is required`);
    }

    return normalized;
  }).filter(Boolean);
}

function unsupportedKeys(
  value: Record<string, unknown>,
  allowed: Set<string>,
  prefix: string,
) {
  return Object.keys(value)
    .filter((key) => !allowed.has(key))
    .map((key) => `${prefix}.${key}: unsupported account-security enforcement key`);
}

function actionKeys() {
  return getMoralTradeAccountSecurityContract().actionDefinitions.map(
    (action) => action.key,
  );
}

function normalizePolicy(
  value: unknown,
  index: number,
  blockers: string[],
): MoralTradeAccountSecurityPolicyRecord {
  const policy = isRecord(value) ? value : {};
  const prefix = `evaluationInput.policies.${index}`;

  if (!isRecord(value)) {
    blockers.push(`${prefix}: object is required`);
  } else {
    blockers.push(...unsupportedKeys(policy, POLICY_KEYS, prefix));
  }

  return {
    accountRecoveryBehavior: enumField<MoralTradeAccountRecoveryBehavior>(
      policy.accountRecoveryBehavior,
      ACCOUNT_RECOVERY_BEHAVIORS,
      "manual_review",
      `${prefix}.accountRecoveryBehavior`,
      blockers,
      true,
    ),
    appliesToAction: enumField<MoralTradeAccountSecurityAction>(
      policy.appliesToAction,
      actionKeys(),
      "participant_confirmation",
      `${prefix}.appliesToAction`,
      blockers,
      true,
    ),
    cooldownHours: nonNegativeIntegerField(
      policy.cooldownHours,
      `${prefix}.cooldownHours`,
      blockers,
    ),
    evidenceHash: requiredHashField(policy.evidenceHash, `${prefix}.evidenceHash`, blockers),
    highRiskBehavior: enumField<MoralTradeAccountSecurityHighRiskBehavior>(
      policy.highRiskBehavior,
      HIGH_RISK_BEHAVIORS,
      "step_up",
      `${prefix}.highRiskBehavior`,
      blockers,
      true,
    ),
    noticeRequired: booleanField(policy.noticeRequired, `${prefix}.noticeRequired`, blockers),
    policyId: requiredStringField(
      policy.policyId,
      `${prefix}.policyId`,
      blockers,
      `submitted-account-security-policy-${index + 1}`,
    ),
    policySnapshotStatus: enumField<MoralTradeAccountSecurityPolicySnapshotStatus>(
      policy.policySnapshotStatus,
      POLICY_STATUSES,
      "missing",
      `${prefix}.policySnapshotStatus`,
      blockers,
      true,
    ),
    policyVersion: requiredStringField(
      policy.policyVersion,
      `${prefix}.policyVersion`,
      blockers,
    ),
    reviewedAt: requiredStringField(policy.reviewedAt, `${prefix}.reviewedAt`, blockers),
    reviewerDecisionStatus: enumField<MoralTradeAccountSecurityReviewerDecisionStatus>(
      policy.reviewerDecisionStatus,
      REVIEW_DECISION_STATUSES,
      "missing",
      `${prefix}.reviewerDecisionStatus`,
      blockers,
      true,
    ),
    riskSignals: stringArrayField(policy.riskSignals, `${prefix}.riskSignals`, blockers),
    stepUpRequired: booleanField(
      policy.stepUpRequired,
      `${prefix}.stepUpRequired`,
      blockers,
    ),
    supersededBy: nullableString(policy.supersededBy),
    trustedDeviceRequired: booleanField(
      policy.trustedDeviceRequired,
      `${prefix}.trustedDeviceRequired`,
      blockers,
    ),
  };
}

function normalizeEvent(
  value: unknown,
  index: number,
  blockers: string[],
): MoralTradeAccountSecurityEventRecord {
  const event = isRecord(value) ? value : {};
  const contract = getMoralTradeAccountSecurityContract();
  const prefix = `evaluationInput.events.${index}`;

  if (!isRecord(value)) {
    blockers.push(`${prefix}: object is required`);
  } else {
    blockers.push(...unsupportedKeys(event, EVENT_KEYS, prefix));
  }

  return {
    actionSubjectId: requiredStringField(
      event.actionSubjectId,
      `${prefix}.actionSubjectId`,
      blockers,
      `submitted-account-security-subject-${index + 1}`,
    ),
    actionSubjectType: enumField<MoralTradeAccountSecuritySubjectType>(
      event.actionSubjectType,
      SUBJECT_TYPES,
      "participant_confirmation_record",
      `${prefix}.actionSubjectType`,
      blockers,
      true,
    ),
    cooldownUntil: nullableString(event.cooldownUntil),
    eventHash: requiredHashField(event.eventHash, `${prefix}.eventHash`, blockers),
    eventId: requiredStringField(
      event.eventId,
      `${prefix}.eventId`,
      blockers,
      `submitted-account-security-event-${index + 1}`,
    ),
    eventType: enumField<MoralTradeAccountSecurityEventType>(
      event.eventType,
      contract.eventTypes,
      "new_device",
      `${prefix}.eventType`,
      blockers,
      true,
    ),
    expiresAt: nullableString(event.expiresAt),
    noticeStatus: enumField<MoralTradeAccountSecurityRemediationStatus>(
      event.noticeStatus,
      REMEDIATION_STATUSES,
      "missing",
      `${prefix}.noticeStatus`,
      blockers,
      true,
    ),
    participantIdHash: requiredHashField(
      event.participantIdHash,
      `${prefix}.participantIdHash`,
      blockers,
    ),
    policyRef: requiredStringField(event.policyRef, `${prefix}.policyRef`, blockers),
    recordedAt: requiredStringField(event.recordedAt, `${prefix}.recordedAt`, blockers),
    reviewerDecisionStatus: enumField<MoralTradeAccountSecurityReviewerDecisionStatus>(
      event.reviewerDecisionStatus,
      REVIEW_DECISION_STATUSES,
      "missing",
      `${prefix}.reviewerDecisionStatus`,
      blockers,
      true,
    ),
    riskState: enumField<MoralTradeAccountSecurityRiskState>(
      event.riskState,
      RISK_STATES,
      "manual_review",
      `${prefix}.riskState`,
      blockers,
      true,
    ),
    stepUpStatus: enumField<MoralTradeAccountSecurityRemediationStatus>(
      event.stepUpStatus,
      REMEDIATION_STATUSES,
      "missing",
      `${prefix}.stepUpStatus`,
      blockers,
      true,
    ),
    supersededBy: nullableString(event.supersededBy),
    trustedDeviceStatus: enumField<MoralTradeAccountSecurityRemediationStatus>(
      event.trustedDeviceStatus,
      REMEDIATION_STATUSES,
      "missing",
      `${prefix}.trustedDeviceStatus`,
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

  if (Array.isArray(value.policies) && value.policies.length > MAX_POLICIES) {
    blockers.push(`evaluationInput.policies: at most ${MAX_POLICIES} policies are supported`);
  }

  if (Array.isArray(value.events) && value.events.length > MAX_EVENTS) {
    blockers.push(`evaluationInput.events: at most ${MAX_EVENTS} events are supported`);
  }

  const input: MoralTradeAccountSecurityEvaluationInput = {
    action: enumField<MoralTradeAccountSecurityAction>(
      value.action,
      actionKeys(),
      "participant_confirmation",
      "evaluationInput.action",
      blockers,
      true,
    ),
    checkedAt: stringField(value.checkedAt) || undefined,
    events: Array.isArray(value.events)
      ? value.events
          .slice(0, MAX_EVENTS)
          .map((entry, index) => normalizeEvent(entry, index, blockers))
      : [],
    policies: Array.isArray(value.policies)
      ? value.policies
          .slice(0, MAX_POLICIES)
          .map((entry, index) => normalizePolicy(entry, index, blockers))
      : [],
  };

  if (!Array.isArray(value.events)) {
    blockers.push("evaluationInput.events: array is required");
  }

  if (!Array.isArray(value.policies)) {
    blockers.push("evaluationInput.policies: array is required");
  }

  return { input, blockers };
}

function normalizeIdempotencyKey(value: unknown, fallbackHash: string) {
  const normalized = stringField(value).slice(0, MAX_IDEMPOTENCY_LENGTH);

  return normalized || `account-security-enforce:${fallbackHash}`;
}

function authorizationFields() {
  return {
    contactIntroductionAllowed: false,
    exposureIncreaseAllowed: false,
    participantConfirmationAllowed: false,
    paymentAuthorizationAllowed: false,
    paymentCaptureAllowed: false,
    payoutReleaseAllowed: false,
    privacyGrantAllowed: false,
    releaseGatePromotionAllowed: false,
    relianceBearingAgreementAllowed: false,
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
  const contract = getMoralTradeAccountSecurityContract();
  const contractValidation = validateMoralTradeAccountSecurityContract(contract);

  return buildMoralTradeApiJsonResponse(
    {
      ok: false,
      checkedAt,
      contractVersion: contract.version,
      accountSecurityGateStatus: "blocked",
      ...authorizationFields(),
      stateMutation: false,
      persistence: {
        requested: true,
        status: "not_recorded",
        recordId: null,
        table: "moral_trade_account_security_enforcement_records",
      },
      contractValidation,
      fallback:
        "Invalid account-security enforcement input creates no enforcement record and cannot authorize participant confirmation, payment authorization, payment capture, payout release, privacy grants, contact introduction, exposure increase, reliance-bearing agreement, or release promotion.",
      blockers,
    },
    "private_no_store",
    { status },
  );
}

export async function POST(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "account_security_enforce");
  const checkedAt = new Date().toISOString();

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited account-security enforcement creates no enforcement record and cannot authorize participant confirmation, payment authorization, payment capture, payout release, privacy grants, contact introduction, exposure increase, reliance-bearing agreement, or release promotion.",
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

  const contract = getMoralTradeAccountSecurityContract();
  const contractValidation = validateMoralTradeAccountSecurityContract(contract);
  const evaluation = evaluateMoralTradeAccountSecurity(normalized.input);
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
    accountSecurityGateStatus: evaluation.status === "pass" ? "non_blocking" : "blocked",
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
          table: "moral_trade_account_security_enforcement_records",
        },
        fallback:
          "Account-security enforcement was evaluated but not recorded because Supabase is not configured; no participant confirmation, payment authorization, payment capture, payout release, privacy grant, contact introduction, exposure increase, reliance-bearing, or release-promotion state changed.",
        blockers: [...blockers, "supabase_unconfigured:account_security_enforce"],
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
          table: "moral_trade_account_security_enforcement_records",
        },
        fallback:
          "Authentication is required before recording account-security enforcement. No participant confirmation, payment authorization, payment capture, payout release, privacy grant, contact introduction, exposure increase, reliance-bearing, or release-promotion state changed.",
        blockers: [...blockers, "authentication_required:account_security_enforce"],
      },
      "private_no_store",
      { status: 401 },
    );
  }

  const existing = await supabase
    .from("moral_trade_account_security_enforcement_records")
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
          table: "moral_trade_account_security_enforcement_records",
        },
      },
      "private_no_store",
    );
  }

  const insert: AccountSecurityEnforcementInsert = {
    action: evaluation.action,
    blocker_codes: blockers,
    blocker_count: blockers.length,
    contact_introduction_allowed_bool: false,
    contract_version: contract.version,
    enforcement_input_json: normalized.input as unknown as Json,
    enforcement_status: evaluation.status,
    evaluation_hash: evaluationHash,
    evaluation_result_json: evaluation as unknown as Json,
    event_count: normalized.input.events.length,
    exposure_increase_allowed_bool: false,
    high_risk_event_count: evaluation.highRiskEventCount,
    idempotency_key: idempotencyKey,
    owner_profile_id: user.id,
    participant_confirmation_allowed_bool: false,
    payment_authorization_allowed_bool: false,
    payment_capture_allowed_bool: false,
    payout_release_allowed_bool: false,
    policy_count: normalized.input.policies.length,
    privacy_grant_allowed_bool: false,
    release_gate_promotion_allowed_bool: false,
    reliance_bearing_agreement_allowed_bool: false,
    remediated_high_risk_event_count: evaluation.remediatedHighRiskEventCount,
    required_policy_count: evaluation.requiredPolicyCount,
    user_facing_blocker_categories: evaluation.userFacingBlockerCategories,
    validator_version: MORAL_TRADE_ACCOUNT_SECURITY_VALIDATOR_VERSION,
  };
  const { data, error } = await supabase
    .from("moral_trade_account_security_enforcement_records")
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
          table: "moral_trade_account_security_enforcement_records",
        },
        fallback:
          "The account-security enforcement result could not be recorded. No participant confirmation, payment authorization, payment capture, payout release, privacy grant, contact introduction, exposure increase, reliance-bearing, or release-promotion state changed.",
        blockers: [...blockers, "database_insert_failed:account_security_enforce"],
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
        table: "moral_trade_account_security_enforcement_records",
      },
    },
    "private_no_store",
  );
}
