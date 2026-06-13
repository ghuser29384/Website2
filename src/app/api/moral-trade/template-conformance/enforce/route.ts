import { createHash } from "node:crypto";

import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  MORAL_TRADE_TEMPLATE_CONFORMANCE_VALIDATOR_VERSION,
  evaluateMoralTradeTemplateConformance,
  getMoralTradeTemplateConformanceContract,
  validateMoralTradeTemplateConformanceContract,
  type MoralTradeApprovedTradeTemplateRecord,
  type MoralTradeTemplateConformanceEvaluationInput,
  type MoralTradeTemplateConformanceState,
  type MoralTradeTemplateConformanceTransition,
  type MoralTradeTemplateInstanceRecord,
  type MoralTradeTemplateOffTemplateBehavior,
  type MoralTradeTemplateParameterPolicyStatus,
  type MoralTradeTemplateState,
  type MoralTradeTemplateSubjectType,
  type MoralTradeTemplateTradeType,
} from "@/lib/moral-trade/template-conformance";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database, Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_TEXT_FIELD_LENGTH = 800;
const MAX_IDEMPOTENCY_LENGTH = 160;
const MAX_TEMPLATES = 12;
const MAX_INSTANCES = 12;
const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

const TRANSITIONS = new Set<MoralTradeTemplateConformanceTransition>([
  "draft_preview",
  "live_offer_publication",
  "matched_trade_lock",
  "payment_capture",
  "reliance_bearing_transition",
  "public_metric_publication",
  "release_gate_promotion",
]);
const TRADE_TYPES = new Set<MoralTradeTemplateTradeType>([
  "donation_offset",
  "pledge_swap",
  "compensated_moral_action",
  "performance_bond_condition",
  "side_agreement",
]);
const SUBJECT_TYPES = new Set<MoralTradeTemplateSubjectType>([
  "offset_offer",
  "pledge_swap_offer",
  "matched_trade_lock_proposal",
  "cleared_trade_agreement",
  "seed_template",
  "worked_example",
]);
const TEMPLATE_STATES = new Set<MoralTradeTemplateState>([
  "draft",
  "active",
  "deprecated",
  "superseded",
  "blocked",
]);
const POLICY_STATUSES = new Set<MoralTradeTemplateParameterPolicyStatus>([
  "resolved_immutable",
  "missing",
  "mutable",
  "stale",
  "superseded",
]);
const OFF_TEMPLATE_BEHAVIORS = new Set<MoralTradeTemplateOffTemplateBehavior>([
  "block",
  "preview_only",
  "manual_review",
]);
const CONFORMANCE_STATES = new Set<MoralTradeTemplateConformanceState>([
  "draft",
  "conforms",
  "off_template_preview_only",
  "off_template_manual_review",
  "blocked",
  "superseded",
]);
const REQUEST_KEYS = new Set(["evaluationInput", "idempotencyKey"]);
const EVALUATION_INPUT_KEYS = new Set([
  "checkedAt",
  "instances",
  "templates",
  "transition",
]);
const TEMPLATE_KEYS = new Set([
  "allowedEvidenceClaimTypes",
  "allowedRecipientDestinationClasses",
  "cancellationRuleRef",
  "challengeWindowPolicyRef",
  "eligibleCauseBucketRefs",
  "expiresAt",
  "offTemplateBehavior",
  "parameterPolicyHash",
  "parameterPolicyStatus",
  "prohibitedParameterCodes",
  "requiredControlPackRef",
  "reviewedAt",
  "supersededBy",
  "templateId",
  "templateSlug",
  "templateState",
  "templateVersion",
  "tradeType",
]);
const INSTANCE_KEYS = new Set([
  "approvedTemplateRef",
  "conformanceState",
  "expiresAt",
  "freeTextCreatesNewCounterparties",
  "freeTextCreatesNewEvidenceStandards",
  "freeTextCreatesNewObligations",
  "freeTextCreatesSidePayments",
  "instanceId",
  "neutralReviewerApproved",
  "normalizedParameterHash",
  "offTemplateReasonCodes",
  "renewedParticipantConfirmationRef",
  "reviewedAt",
  "subjectRef",
  "subjectType",
  "submittedParameterHash",
  "supersededBy",
  "templateParameterPolicyRef",
]);

type TemplateConformanceEnforcementInsert =
  Database["public"]["Tables"]["moral_trade_template_conformance_enforcement_records"]["Insert"];

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

function booleanField(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function requiredHashField(value: unknown, key: string, blockers: string[]) {
  const normalized = stringField(value);

  if (!HASH_PATTERN.test(normalized)) {
    blockers.push(`${key}: sha256 hash is required`);
  }

  return normalized;
}

function stringArrayField(
  value: unknown,
  key: string,
  blockers: string[],
  required = false,
) {
  if (!Array.isArray(value)) {
    if (required) {
      blockers.push(`${key}: string array is required`);
    }

    return [];
  }

  const normalized = value
    .map((entry) => stringField(entry))
    .filter(Boolean);

  if (required && normalized.length === 0) {
    blockers.push(`${key}: at least one string is required`);
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
    .map((key) => `${prefix}.${key}: unsupported template-conformance enforcement key`);
}

function normalizeTemplate(
  value: unknown,
  index: number,
  blockers: string[],
): MoralTradeApprovedTradeTemplateRecord {
  const record = isRecord(value) ? value : {};
  const prefix = `evaluationInput.templates.${index}`;

  if (!isRecord(value)) {
    blockers.push(`${prefix}: object is required`);
  } else {
    blockers.push(...unsupportedKeys(record, TEMPLATE_KEYS, prefix));
  }

  return {
    allowedEvidenceClaimTypes: stringArrayField(
      record.allowedEvidenceClaimTypes,
      `${prefix}.allowedEvidenceClaimTypes`,
      blockers,
      true,
    ),
    allowedRecipientDestinationClasses: stringArrayField(
      record.allowedRecipientDestinationClasses,
      `${prefix}.allowedRecipientDestinationClasses`,
      blockers,
      true,
    ),
    cancellationRuleRef: nullableString(record.cancellationRuleRef),
    challengeWindowPolicyRef: nullableString(record.challengeWindowPolicyRef),
    eligibleCauseBucketRefs: stringArrayField(
      record.eligibleCauseBucketRefs,
      `${prefix}.eligibleCauseBucketRefs`,
      blockers,
      true,
    ),
    expiresAt: nullableString(record.expiresAt),
    offTemplateBehavior: enumField(
      record.offTemplateBehavior,
      OFF_TEMPLATE_BEHAVIORS,
      "block",
      `${prefix}.offTemplateBehavior`,
      blockers,
      true,
    ),
    parameterPolicyHash: requiredHashField(
      record.parameterPolicyHash,
      `${prefix}.parameterPolicyHash`,
      blockers,
    ),
    parameterPolicyStatus: enumField(
      record.parameterPolicyStatus,
      POLICY_STATUSES,
      "missing",
      `${prefix}.parameterPolicyStatus`,
      blockers,
      true,
    ),
    prohibitedParameterCodes: stringArrayField(
      record.prohibitedParameterCodes,
      `${prefix}.prohibitedParameterCodes`,
      blockers,
      true,
    ),
    requiredControlPackRef: nullableString(record.requiredControlPackRef),
    reviewedAt: stringField(record.reviewedAt),
    supersededBy: nullableString(record.supersededBy),
    templateId: requiredStringField(
      record.templateId,
      `${prefix}.templateId`,
      blockers,
      `submitted-template-${index + 1}`,
    ),
    templateSlug: requiredStringField(
      record.templateSlug,
      `${prefix}.templateSlug`,
      blockers,
      `submitted-template-${index + 1}`,
    ),
    templateState: enumField(
      record.templateState,
      TEMPLATE_STATES,
      "draft",
      `${prefix}.templateState`,
      blockers,
      true,
    ),
    templateVersion: requiredStringField(
      record.templateVersion,
      `${prefix}.templateVersion`,
      blockers,
      "submitted-template-version",
    ),
    tradeType: enumField(
      record.tradeType,
      TRADE_TYPES,
      "donation_offset",
      `${prefix}.tradeType`,
      blockers,
      true,
    ),
  };
}

function normalizeInstance(
  value: unknown,
  index: number,
  blockers: string[],
): MoralTradeTemplateInstanceRecord {
  const record = isRecord(value) ? value : {};
  const prefix = `evaluationInput.instances.${index}`;

  if (!isRecord(value)) {
    blockers.push(`${prefix}: object is required`);
  } else {
    blockers.push(...unsupportedKeys(record, INSTANCE_KEYS, prefix));
  }

  return {
    approvedTemplateRef: requiredStringField(
      record.approvedTemplateRef,
      `${prefix}.approvedTemplateRef`,
      blockers,
      `submitted-template-${index + 1}`,
    ),
    conformanceState: enumField(
      record.conformanceState,
      CONFORMANCE_STATES,
      "draft",
      `${prefix}.conformanceState`,
      blockers,
      true,
    ),
    expiresAt: nullableString(record.expiresAt),
    freeTextCreatesNewCounterparties: booleanField(
      record.freeTextCreatesNewCounterparties,
    ),
    freeTextCreatesNewEvidenceStandards: booleanField(
      record.freeTextCreatesNewEvidenceStandards,
    ),
    freeTextCreatesNewObligations: booleanField(record.freeTextCreatesNewObligations),
    freeTextCreatesSidePayments: booleanField(record.freeTextCreatesSidePayments),
    instanceId: requiredStringField(
      record.instanceId,
      `${prefix}.instanceId`,
      blockers,
      `submitted-template-instance-${index + 1}`,
    ),
    neutralReviewerApproved: booleanField(record.neutralReviewerApproved),
    normalizedParameterHash: requiredHashField(
      record.normalizedParameterHash,
      `${prefix}.normalizedParameterHash`,
      blockers,
    ),
    offTemplateReasonCodes: stringArrayField(
      record.offTemplateReasonCodes,
      `${prefix}.offTemplateReasonCodes`,
      blockers,
    ),
    renewedParticipantConfirmationRef: nullableString(
      record.renewedParticipantConfirmationRef,
    ),
    reviewedAt: stringField(record.reviewedAt),
    subjectRef: requiredStringField(
      record.subjectRef,
      `${prefix}.subjectRef`,
      blockers,
      `submitted-subject-${index + 1}`,
    ),
    subjectType: enumField(
      record.subjectType,
      SUBJECT_TYPES,
      "offset_offer",
      `${prefix}.subjectType`,
      blockers,
      true,
    ),
    submittedParameterHash: requiredHashField(
      record.submittedParameterHash,
      `${prefix}.submittedParameterHash`,
      blockers,
    ),
    supersededBy: nullableString(record.supersededBy),
    templateParameterPolicyRef: requiredStringField(
      record.templateParameterPolicyRef,
      `${prefix}.templateParameterPolicyRef`,
      blockers,
      `submitted-template-policy-${index + 1}`,
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

  const input: MoralTradeTemplateConformanceEvaluationInput = {
    checkedAt: stringField(value.checkedAt) || undefined,
    instances: Array.isArray(value.instances)
      ? value.instances
          .slice(0, MAX_INSTANCES)
          .map((entry, index) => normalizeInstance(entry, index, blockers))
      : [],
    templates: Array.isArray(value.templates)
      ? value.templates
          .slice(0, MAX_TEMPLATES)
          .map((entry, index) => normalizeTemplate(entry, index, blockers))
      : [],
    transition: enumField(
      value.transition,
      TRANSITIONS,
      "live_offer_publication",
      "evaluationInput.transition",
      blockers,
      true,
    ),
  };

  return { input, blockers };
}

function normalizeIdempotencyKey(value: unknown, fallbackHash: string) {
  const normalized = stringField(value, "").slice(0, MAX_IDEMPOTENCY_LENGTH);

  return normalized || `template-conformance-enforce:${fallbackHash}`;
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
  const contract = getMoralTradeTemplateConformanceContract();
  const contractValidation = validateMoralTradeTemplateConformanceContract(contract);

  return buildMoralTradeApiJsonResponse(
    {
      ok: false,
      checkedAt,
      contractVersion: contract.version,
      templateConformanceGateStatus: "blocked",
      livePublicationAllowed: false,
      lockTransitionAllowed: false,
      paymentTransitionAllowed: false,
      relianceBearingTransitionAllowed: false,
      publicMetricPublicationAllowed: false,
      releaseGatePromotionAllowed: false,
      stateMutation: false,
      persistence: {
        requested: true,
        status: "not_recorded",
        recordId: null,
        table: "moral_trade_template_conformance_enforcement_records",
      },
      contractValidation,
      fallback:
        "Invalid template-conformance enforcement input creates no enforcement record and cannot authorize live publication, lock, payment, reliance, public metrics, or release promotion.",
      blockers,
    },
    "private_no_store",
    { status },
  );
}

export async function POST(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(
    request,
    "template_conformance_enforce",
  );
  const checkedAt = new Date().toISOString();

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited template-conformance enforcement creates no enforcement record and cannot authorize live publication, lock, payment, reliance, public metrics, or release promotion.",
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

  const contract = getMoralTradeTemplateConformanceContract();
  const contractValidation = validateMoralTradeTemplateConformanceContract(contract);
  const evaluation = evaluateMoralTradeTemplateConformance(normalized.input);
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
    templateConformanceGateStatus:
      evaluation.status === "pass" ? "non_blocking" : "blocked",
    livePublicationAllowed: false,
    lockTransitionAllowed: false,
    paymentTransitionAllowed: false,
    relianceBearingTransitionAllowed: false,
    publicMetricPublicationAllowed: false,
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
          table: "moral_trade_template_conformance_enforcement_records",
        },
        fallback:
          "Template-conformance enforcement was evaluated but not recorded because Supabase is not configured; no live publication, lock, payment, reliance, public metric, or release-promotion state changed.",
        blockers: [...blockers, "supabase_unconfigured:template_conformance_enforce"],
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
          table: "moral_trade_template_conformance_enforcement_records",
        },
        fallback:
          "Authentication is required before recording template-conformance enforcement. No live publication, lock, payment, reliance, public metric, or release-promotion state changed.",
        blockers: [...blockers, "authentication_required:template_conformance_enforce"],
      },
      "private_no_store",
      { status: 401 },
    );
  }

  const existing = await supabase
    .from("moral_trade_template_conformance_enforcement_records")
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
          table: "moral_trade_template_conformance_enforcement_records",
        },
      },
      "private_no_store",
    );
  }

  const insert: TemplateConformanceEnforcementInsert = {
    blocker_codes: evaluation.blockers,
    conforming_instance_count: evaluation.conformingInstanceCount,
    contract_version: contract.version,
    enforcement_input_json: normalized.input as unknown as Json,
    enforcement_status: evaluation.status,
    evaluation_hash: evaluationHash,
    evaluation_result_json: evaluation as unknown as Json,
    idempotency_key: idempotencyKey,
    live_publication_allowed_bool: false,
    lock_transition_allowed_bool: false,
    off_template_exception_count: evaluation.offTemplateExceptionCount,
    owner_profile_id: user.id,
    passing_instance_count: evaluation.passingInstanceCount,
    payment_transition_allowed_bool: false,
    public_metric_publication_allowed_bool: false,
    release_gate_promotion_allowed_bool: false,
    reliance_bearing_transition_allowed_bool: false,
    required_instance_count: evaluation.requiredInstanceCount,
    template_instance_record_count: normalized.input.instances.length,
    template_record_count: normalized.input.templates.length,
    transition: evaluation.transition,
    user_facing_blocker_categories: evaluation.userFacingBlockerCategories,
    validator_version: MORAL_TRADE_TEMPLATE_CONFORMANCE_VALIDATOR_VERSION,
  };
  const { data, error } = await supabase
    .from("moral_trade_template_conformance_enforcement_records")
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
          table: "moral_trade_template_conformance_enforcement_records",
        },
        fallback:
          "The template-conformance enforcement result could not be recorded. No live publication, lock, payment, reliance, public metric, or release-promotion state changed.",
        blockers: [...blockers, "database_insert_failed:template_conformance_enforce"],
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
        table: "moral_trade_template_conformance_enforcement_records",
      },
    },
    "private_no_store",
    { status: contractValidation.status === "pass" ? 201 : 422 },
  );
}
