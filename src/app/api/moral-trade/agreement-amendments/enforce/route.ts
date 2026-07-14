import { createHash } from "node:crypto";

import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  MORAL_TRADE_AGREEMENT_AMENDMENTS_VALIDATOR_VERSION,
  evaluateMoralTradeAgreementAmendment,
  getMoralTradeAgreementAmendmentContract,
  validateMoralTradeAgreementAmendmentContract,
  type MoralTradeAgreementAmendmentConfirmationState,
  type MoralTradeAgreementAmendmentEvaluationInput,
  type MoralTradeAgreementAmendmentPolicyRecord,
  type MoralTradeAgreementAmendmentRecord,
  type MoralTradeAgreementAmendmentReviewStatus,
  type MoralTradeAgreementAmendmentState,
  type MoralTradeAgreementAmendmentSubjectType,
  type MoralTradeAgreementAmendmentTransition,
  type MoralTradeAgreementAmendmentType,
} from "@/lib/moral-trade/agreement-amendments";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database, Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_TEXT_FIELD_LENGTH = 600;
const MAX_IDEMPOTENCY_LENGTH = 160;
const MAX_RECORDS = 12;
const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

const TRANSITIONS = new Set<MoralTradeAgreementAmendmentTransition>([
  "donation_offset_material_change",
  "pledge_swap_material_change",
  "post_lock_correction",
  "pause_or_early_termination",
  "evidence_standard_change",
  "destination_change",
]);
const SUBJECT_TYPES = new Set<MoralTradeAgreementAmendmentSubjectType>([
  "locked_donation_offset",
  "locked_pledge_swap",
  "matched_trade_lock_proposal",
  "cleared_trade_agreement",
]);
const AMENDMENT_TYPES = new Set<MoralTradeAgreementAmendmentType>([
  "correction",
  "mutual_modification",
  "pause",
  "early_termination",
  "evidence_standard_change",
  "schedule_change",
  "compensation_change",
  "destination_change",
  "baseline_correction",
  "privacy_change",
  "other",
]);
const REVIEW_STATUSES = new Set<MoralTradeAgreementAmendmentReviewStatus>([
  "passed",
  "not_required_for_stage",
  "missing",
  "under_review",
  "failed",
  "stale",
  "superseded",
]);
const AMENDMENT_STATES = new Set<MoralTradeAgreementAmendmentState>([
  "draft",
  "presented",
  "confirmed",
  "approved",
  "applied",
  "rejected",
  "withdrawn",
  "superseded",
  "stale",
]);
const CONFIRMATION_STATES = new Set<MoralTradeAgreementAmendmentConfirmationState>([
  "missing",
  "stale",
  "scope_mismatch",
  "passed",
  "not_required_for_stage",
]);
const REQUEST_KEYS = new Set(["evaluationInput", "idempotencyKey"]);
const EVALUATION_INPUT_KEYS = new Set([
  "amendmentType",
  "amendments",
  "checkedAt",
  "policies",
  "requiresAmendment",
  "requiresAppliedAmendment",
  "requiresNeutralReview",
  "requiresRelianceBearingTransition",
  "requiresRenewedConfirmations",
  "subjectType",
  "transition",
]);
const POLICY_KEYS = new Set([
  "amendmentType",
  "baselineIntegrityRequired",
  "beforeAfterHashRequired",
  "maxAmendmentAgeDays",
  "neutralReviewRequiredForBurdenShift",
  "nonRetroactivityRequired",
  "noticeRequired",
  "policyHash",
  "policyId",
  "renewedConfirmationRequired",
  "reviewedAt",
  "reviewerQualityRequired",
  "status",
  "subjectType",
  "supersededBy",
]);
const AMENDMENT_KEYS = new Set([
  "afterTermsHash",
  "amendmentHash",
  "amendmentId",
  "amendmentState",
  "amendmentType",
  "appliedAt",
  "baselineIntegrityStatus",
  "beforeTermsHash",
  "burdenOrBenefitShift",
  "cancellationRightsNarrowed",
  "compensationChanged",
  "confirmationState",
  "donorOfRecordChanged",
  "evidenceClaimRetyped",
  "expiresAt",
  "exposureIncreased",
  "fundsRedirected",
  "materialChange",
  "neutralReviewStatus",
  "noticeStatus",
  "parentRecordEditDetected",
  "policyRef",
  "policySnapshotBundleHash",
  "privacyDisclosureChanged",
  "renewedConfirmationRefs",
  "retroactivePerformanceChange",
  "reviewedAt",
  "reviewerQualityStatus",
  "subjectRef",
  "subjectType",
  "supersededBy",
  "thirdPartyObligationChanged",
]);

type AgreementAmendmentEnforcementInsert =
  Database["public"]["Tables"]["moral_trade_agreement_amendment_enforcement_records"]["Insert"];

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

function nullableHash(value: unknown) {
  const normalized = stringField(value);

  return normalized ? normalized : null;
}

function hashField(value: unknown) {
  const normalized = stringField(value);

  return HASH_PATTERN.test(normalized) ? normalized : normalized;
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
    .map((key) => `${prefix}.${key}: unsupported agreement-amendment enforcement key`);
}

function stringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => stringField(entry))
    .filter(Boolean)
    .slice(0, MAX_RECORDS);
}

function normalizePolicy(
  value: unknown,
  index: number,
  blockers: string[],
): MoralTradeAgreementAmendmentPolicyRecord {
  const record = isRecord(value) ? value : {};

  if (!isRecord(value)) {
    blockers.push(`evaluationInput.policies.${index}: object is required`);
  } else {
    blockers.push(
      ...unsupportedKeys(record, POLICY_KEYS, `evaluationInput.policies.${index}`),
    );
  }

  return {
    amendmentType: enumField(
      record.amendmentType,
      AMENDMENT_TYPES,
      "correction",
      `evaluationInput.policies.${index}.amendmentType`,
      blockers,
    ),
    baselineIntegrityRequired: booleanField(record.baselineIntegrityRequired, true),
    beforeAfterHashRequired: booleanField(record.beforeAfterHashRequired, true),
    maxAmendmentAgeDays: numberField(record.maxAmendmentAgeDays, 45, 3650) || 45,
    neutralReviewRequiredForBurdenShift: booleanField(
      record.neutralReviewRequiredForBurdenShift,
      true,
    ),
    nonRetroactivityRequired: booleanField(record.nonRetroactivityRequired, true),
    noticeRequired: booleanField(record.noticeRequired, true),
    policyHash: hashField(record.policyHash),
    policyId: stringField(record.policyId, `submitted-policy-${index + 1}`),
    renewedConfirmationRequired: booleanField(
      record.renewedConfirmationRequired,
      true,
    ),
    reviewedAt: stringField(record.reviewedAt) || null,
    reviewerQualityRequired: booleanField(record.reviewerQualityRequired, true),
    status: enumField(
      record.status,
      REVIEW_STATUSES,
      "missing",
      `evaluationInput.policies.${index}.status`,
      blockers,
    ),
    subjectType: enumField(
      record.subjectType,
      SUBJECT_TYPES,
      "locked_donation_offset",
      `evaluationInput.policies.${index}.subjectType`,
      blockers,
    ),
    supersededBy: stringField(record.supersededBy) || null,
  };
}

function normalizeAmendment(
  value: unknown,
  index: number,
  blockers: string[],
): MoralTradeAgreementAmendmentRecord {
  const record = isRecord(value) ? value : {};

  if (!isRecord(value)) {
    blockers.push(`evaluationInput.amendments.${index}: object is required`);
  } else {
    blockers.push(
      ...unsupportedKeys(
        record,
        AMENDMENT_KEYS,
        `evaluationInput.amendments.${index}`,
      ),
    );
  }

  return {
    afterTermsHash: nullableHash(record.afterTermsHash),
    amendmentHash: hashField(record.amendmentHash),
    amendmentId: stringField(record.amendmentId, `submitted-amendment-${index + 1}`),
    amendmentState: enumField(
      record.amendmentState,
      AMENDMENT_STATES,
      "draft",
      `evaluationInput.amendments.${index}.amendmentState`,
      blockers,
    ),
    amendmentType: enumField(
      record.amendmentType,
      AMENDMENT_TYPES,
      "correction",
      `evaluationInput.amendments.${index}.amendmentType`,
      blockers,
    ),
    appliedAt: stringField(record.appliedAt) || null,
    baselineIntegrityStatus: enumField(
      record.baselineIntegrityStatus,
      REVIEW_STATUSES,
      "missing",
      `evaluationInput.amendments.${index}.baselineIntegrityStatus`,
      blockers,
    ),
    beforeTermsHash: nullableHash(record.beforeTermsHash),
    burdenOrBenefitShift: booleanField(record.burdenOrBenefitShift),
    cancellationRightsNarrowed: booleanField(record.cancellationRightsNarrowed),
    compensationChanged: booleanField(record.compensationChanged),
    confirmationState: enumField(
      record.confirmationState,
      CONFIRMATION_STATES,
      "missing",
      `evaluationInput.amendments.${index}.confirmationState`,
      blockers,
    ),
    donorOfRecordChanged: booleanField(record.donorOfRecordChanged),
    evidenceClaimRetyped: booleanField(record.evidenceClaimRetyped),
    expiresAt: stringField(record.expiresAt) || null,
    exposureIncreased: booleanField(record.exposureIncreased),
    fundsRedirected: booleanField(record.fundsRedirected),
    materialChange: booleanField(record.materialChange, true),
    neutralReviewStatus: enumField(
      record.neutralReviewStatus,
      REVIEW_STATUSES,
      "missing",
      `evaluationInput.amendments.${index}.neutralReviewStatus`,
      blockers,
    ),
    noticeStatus: enumField(
      record.noticeStatus,
      REVIEW_STATUSES,
      "missing",
      `evaluationInput.amendments.${index}.noticeStatus`,
      blockers,
    ),
    parentRecordEditDetected: booleanField(record.parentRecordEditDetected),
    policyRef: stringField(record.policyRef),
    policySnapshotBundleHash: nullableHash(record.policySnapshotBundleHash),
    privacyDisclosureChanged: booleanField(record.privacyDisclosureChanged),
    renewedConfirmationRefs: stringArray(record.renewedConfirmationRefs),
    retroactivePerformanceChange: booleanField(record.retroactivePerformanceChange),
    reviewedAt: stringField(record.reviewedAt) || null,
    reviewerQualityStatus: enumField(
      record.reviewerQualityStatus,
      REVIEW_STATUSES,
      "missing",
      `evaluationInput.amendments.${index}.reviewerQualityStatus`,
      blockers,
    ),
    subjectRef: stringField(record.subjectRef, `submitted-subject-${index + 1}`),
    subjectType: enumField(
      record.subjectType,
      SUBJECT_TYPES,
      "locked_donation_offset",
      `evaluationInput.amendments.${index}.subjectType`,
      blockers,
    ),
    supersededBy: stringField(record.supersededBy) || null,
    thirdPartyObligationChanged: booleanField(record.thirdPartyObligationChanged),
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

  const policies = Array.isArray(value.policies)
    ? value.policies.slice(0, MAX_RECORDS).map((entry, index) => normalizePolicy(entry, index, blockers))
    : [];
  const amendments = Array.isArray(value.amendments)
    ? value.amendments
        .slice(0, MAX_RECORDS)
        .map((entry, index) => normalizeAmendment(entry, index, blockers))
    : [];
  const input: MoralTradeAgreementAmendmentEvaluationInput = {
    amendmentType: enumField(
      value.amendmentType,
      AMENDMENT_TYPES,
      "correction",
      "evaluationInput.amendmentType",
      blockers,
      true,
    ),
    amendments,
    checkedAt: stringField(value.checkedAt) || undefined,
    policies,
    requiresAmendment: booleanField(value.requiresAmendment, true),
    requiresAppliedAmendment: booleanField(value.requiresAppliedAmendment),
    requiresNeutralReview: booleanField(value.requiresNeutralReview),
    requiresRelianceBearingTransition: booleanField(
      value.requiresRelianceBearingTransition,
    ),
    requiresRenewedConfirmations: booleanField(
      value.requiresRenewedConfirmations,
      true,
    ),
    subjectType: enumField(
      value.subjectType,
      SUBJECT_TYPES,
      "locked_donation_offset",
      "evaluationInput.subjectType",
      blockers,
      true,
    ),
    transition: enumField(
      value.transition,
      TRANSITIONS,
      "donation_offset_material_change",
      "evaluationInput.transition",
      blockers,
      true,
    ),
  };

  return { input, blockers };
}

function normalizeIdempotencyKey(value: unknown, fallbackHash: string) {
  const normalized = stringField(value, "").slice(0, MAX_IDEMPOTENCY_LENGTH);

  return normalized || `agreement-amendment-enforce:${fallbackHash}`;
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
  const contract = getMoralTradeAgreementAmendmentContract();
  const contractValidation = validateMoralTradeAgreementAmendmentContract(contract);

  return buildMoralTradeApiJsonResponse(
    {
      ok: false,
      checkedAt,
      contractVersion: contract.version,
      agreementAmendmentGateStatus: "blocked",
      appliesAmendment: false,
      materialChangeAllowed: false,
      parentRecordMutationAllowed: false,
      paymentTransitionAllowed: false,
      relianceBearingTransitionAllowed: false,
      publicMetricAllowed: false,
      stateMutation: false,
      persistence: {
        requested: true,
        status: "not_recorded",
        recordId: null,
        table: "moral_trade_agreement_amendment_enforcement_records",
      },
      contractValidation,
      fallback:
        "Invalid agreement-amendment enforcement input creates no enforcement record and cannot apply amendments, edit parent records, authorize material changes, authorize payment, authorize reliance, or publish metrics.",
      blockers,
    },
    "private_no_store",
    { status },
  );
}

export async function POST(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(
    request,
    "agreement_amendment_enforce",
  );
  const checkedAt = new Date().toISOString();

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited agreement-amendment enforcement creates no enforcement record and cannot apply amendments, edit parent records, authorize material changes, authorize payment, authorize reliance, or publish metrics.",
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

  const contract = getMoralTradeAgreementAmendmentContract();
  const contractValidation = validateMoralTradeAgreementAmendmentContract(contract);
  const evaluation = evaluateMoralTradeAgreementAmendment(normalized.input);
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
    agreementAmendmentGateStatus:
      evaluation.status === "pass" ? "non_blocking" : "blocked",
    appliesAmendment: false,
    materialChangeAllowed: false,
    parentRecordMutationAllowed: false,
    paymentTransitionAllowed: false,
    relianceBearingTransitionAllowed: false,
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
          table: "moral_trade_agreement_amendment_enforcement_records",
        },
        fallback:
          "Agreement-amendment enforcement was evaluated but not recorded because Supabase is not configured; no amendment, parent record, material change, payment, reliance, or public metric state changed.",
        blockers: [
          ...blockers,
          "supabase_unconfigured:agreement_amendment_enforce",
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
          table: "moral_trade_agreement_amendment_enforcement_records",
        },
        fallback:
          "Authentication is required before recording agreement-amendment enforcement. No amendment, parent record, material change, payment, reliance, or public metric state changed.",
        blockers: [
          ...blockers,
          "authentication_required:agreement_amendment_enforce",
        ],
      },
      "private_no_store",
      { status: 401 },
    );
  }

  const existing = await supabase
    .from("moral_trade_agreement_amendment_enforcement_records")
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
          table: "moral_trade_agreement_amendment_enforcement_records",
        },
      },
      "private_no_store",
    );
  }

  const insert: AgreementAmendmentEnforcementInsert = {
    amendment_count: evaluation.amendmentCount,
    amendment_type: evaluation.amendmentType,
    applies_amendment_bool: false,
    blocker_codes: evaluation.blockers,
    contract_version: contract.version,
    enforcement_input_json: normalized.input as unknown as Json,
    enforcement_status: evaluation.status,
    evaluation_hash: evaluationHash,
    evaluation_result_json: evaluation as unknown as Json,
    idempotency_key: idempotencyKey,
    material_change_allowed_bool: false,
    owner_profile_id: user.id,
    parent_record_mutation_allowed_bool: false,
    payment_transition_allowed_bool: false,
    policy_count: evaluation.policyCount,
    public_metric_allowed_bool: false,
    reliance_bearing_transition_allowed_bool: false,
    requires_amendment_bool: normalized.input.requiresAmendment,
    requires_applied_amendment_bool: normalized.input.requiresAppliedAmendment,
    requires_neutral_review_bool: normalized.input.requiresNeutralReview,
    requires_reliance_bearing_transition_bool:
      normalized.input.requiresRelianceBearingTransition,
    requires_renewed_confirmations_bool:
      normalized.input.requiresRenewedConfirmations,
    subject_type: evaluation.subjectType,
    transition: evaluation.transition,
    user_facing_blocker_categories: evaluation.userFacingBlockerCategories,
    validator_version: MORAL_TRADE_AGREEMENT_AMENDMENTS_VALIDATOR_VERSION,
  };
  const { data, error } = await supabase
    .from("moral_trade_agreement_amendment_enforcement_records")
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
          table: "moral_trade_agreement_amendment_enforcement_records",
        },
        fallback:
          "The agreement-amendment enforcement result could not be recorded. No amendment, parent record, material change, payment, reliance, or public metric state changed.",
        blockers: [
          ...blockers,
          "database_insert_failed:agreement_amendment_enforce",
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
        table: "moral_trade_agreement_amendment_enforcement_records",
      },
    },
    "private_no_store",
    { status: contractValidation.status === "pass" ? 201 : 422 },
  );
}
