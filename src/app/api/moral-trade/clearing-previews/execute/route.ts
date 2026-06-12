import { createHash } from "node:crypto";

import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitBlocker,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  MORAL_TRADE_CLEARING_PREVIEW_VALIDATOR_VERSION,
  buildMoralTradeClearingPreview,
  getMoralTradeClearingPreviewContract,
  validateMoralTradeClearingPreviewContract,
  type MoralTradeClearingPreviewClearingMode,
  type MoralTradeClearingPreviewGateStatus,
  type MoralTradeClearingPreviewInput,
  type MoralTradeClearingPreviewMode,
  type MoralTradeClearingPreviewReleaseStage,
  type MoralTradeClearingPreviewTrack,
} from "@/lib/moral-trade/clearing-previews";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database, Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_TEXT_FIELD_LENGTH = 600;
const MAX_IDEMPOTENCY_LENGTH = 160;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TRACKS = new Set<MoralTradeClearingPreviewTrack>([
  "donation_offset",
  "pledge_swap",
]);
const MODES = new Set<MoralTradeClearingPreviewMode>([
  "match_candidate",
  "final_lock_proposal",
]);
const RELEASE_STAGES = new Set<MoralTradeClearingPreviewReleaseStage>([
  "donation_offset_preview_no_capture",
  "pledge_swap_preview_manual_review_only",
]);
const CLEARING_MODES = new Set<MoralTradeClearingPreviewClearingMode>([
  "batch",
  "direct_pair",
  "preview_only",
  "manual_review",
]);
const GATE_STATUSES = new Set<MoralTradeClearingPreviewGateStatus>([
  "passed",
  "not_required_for_stage",
  "needs_review",
  "blocked",
  "missing",
  "stale",
  "superseded",
  "out_of_bounds",
  "preview_only",
]);
const REQUEST_KEYS = new Set([
  "idempotencyKey",
  "previewInput",
  "sourceOfferId",
]);
const PREVIEW_INPUT_KEYS = new Set([
  "antiThreatStatus",
  "adverseAssociationStatus",
  "aiPreferenceElicitationStatus",
  "atomicSettlementStatus",
  "baselineConfidenceLevel",
  "baselineIntegrityStatus",
  "baselineSnapshotHash",
  "baselineVersion",
  "clearingRatioBps",
  "clearingMode",
  "commitmentReservationStatus",
  "destinationVerificationStatus",
  "directPairClearingStatus",
  "donorOfRecordTaxStatus",
  "doubleCountStatus",
  "evidenceAuthenticityStatus",
  "fallbackRule",
  "finalLockProposalRef",
  "finalLockProposalStatus",
  "financialCrimeStatus",
  "freshConfirmationCount",
  "inputBundleHash",
  "matchedCounterpartyVolumeCents",
  "matchingClearingRunHash",
  "matchingClearingRunRef",
  "matchingClearingRunStatus",
  "mode",
  "noTradeBaseline",
  "causeBucketTaxonomyStatus",
  "nonPublicGoodsSubsidyStatus",
  "nonparticipantExternalityStatus",
  "participantConfirmationStatus",
  "participantRatioMaxBps",
  "participantRatioMinBps",
  "participantSurplusConfirmed",
  "performanceTerms",
  "policySnapshotRef",
  "postClearAuditSamplingStatus",
  "privacyDisclosureStatus",
  "protectiveAssessmentStatus",
  "ratioBoundsStatus",
  "recipientAcceptanceStatus",
  "releaseStage",
  "reproducibilityStatus",
  "requiredFreshConfirmations",
  "residualNoTradeAction",
  "resultHash",
  "sideAgreementStatus",
  "stateInterpretationPolicyRef",
  "track",
  "tradeClassificationStatus",
  "unmatchedResidualCents",
  "userSafetyStatus",
  "verifiedPaymentDestinationStatus",
]);
const PERFORMANCE_TERMS_KEYS = new Set([
  "challengeWindowDays",
  "compensationTermsStatus",
  "evidencePlan",
  "leastIntrusiveAlternative",
  "maxObligationDays",
  "neutralReviewRequired",
  "performanceTermsStatus",
  "reciprocalReleaseRule",
  "scheduleStatus",
  "withdrawalBeforeLockRule",
]);

type ClearingPreviewRecordInsert =
  Database["public"]["Tables"]["moral_trade_clearing_preview_records"]["Insert"];

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

function nullableHashField(value: unknown) {
  const normalized = stringField(value);

  return normalized || null;
}

function numberField(value: unknown, fallback: number, max = 1_000_000) {
  const numeric = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.min(max, Math.max(0, Math.round(numeric)));
}

function booleanField(value: unknown) {
  return value === true;
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

  if (normalized) {
    blockers.push(`${key}: unsupported value`);
  } else {
    blockers.push(`${key}: missing`);
  }

  return fallback;
}

function gateStatus(
  value: unknown,
  key: string,
  blockers: string[],
): MoralTradeClearingPreviewGateStatus {
  return enumField(
    value,
    GATE_STATUSES,
    "missing",
    key,
    blockers,
  );
}

function unsupportedKeys(
  value: Record<string, unknown>,
  allowed: Set<string>,
  prefix: string,
) {
  return Object.keys(value)
    .filter((key) => !allowed.has(key))
    .map((key) => `${prefix}.${key}: unsupported clearing-preview input key`);
}

function normalizePerformanceTerms(
  value: unknown,
  blockers: string[],
): MoralTradeClearingPreviewInput["performanceTerms"] {
  if (!isRecord(value)) {
    return undefined;
  }

  blockers.push(...unsupportedKeys(value, PERFORMANCE_TERMS_KEYS, "performanceTerms"));

  return {
    challengeWindowDays: numberField(value.challengeWindowDays, 0, 365) || null,
    compensationTermsStatus: gateStatus(
      value.compensationTermsStatus,
      "performanceTerms.compensationTermsStatus",
      blockers,
    ),
    evidencePlan: stringField(value.evidencePlan),
    leastIntrusiveAlternative: stringField(value.leastIntrusiveAlternative),
    maxObligationDays: numberField(value.maxObligationDays, 0, 3650) || null,
    neutralReviewRequired: booleanField(value.neutralReviewRequired),
    performanceTermsStatus: gateStatus(
      value.performanceTermsStatus,
      "performanceTerms.performanceTermsStatus",
      blockers,
    ),
    reciprocalReleaseRule: stringField(value.reciprocalReleaseRule),
    scheduleStatus: gateStatus(
      value.scheduleStatus,
      "performanceTerms.scheduleStatus",
      blockers,
    ),
    withdrawalBeforeLockRule: stringField(value.withdrawalBeforeLockRule),
  };
}

function normalizePreviewInput(value: unknown) {
  const blockers: string[] = [];

  if (!isRecord(value)) {
    return {
      input: null,
      blockers: ["previewInput: object is required"],
    };
  }

  blockers.push(...unsupportedKeys(value, PREVIEW_INPUT_KEYS, "previewInput"));

  const track = enumField(
    value.track,
    TRACKS,
    "donation_offset",
    "previewInput.track",
    blockers,
  );
  const defaultReleaseStage =
    track === "pledge_swap"
      ? "pledge_swap_preview_manual_review_only"
      : "donation_offset_preview_no_capture";
  const releaseStage = enumField(
    value.releaseStage,
    RELEASE_STAGES,
    defaultReleaseStage,
    "previewInput.releaseStage",
    blockers,
  );
  const performanceTerms = normalizePerformanceTerms(value.performanceTerms, blockers);
  const input: MoralTradeClearingPreviewInput = {
    antiThreatStatus: gateStatus(value.antiThreatStatus, "previewInput.antiThreatStatus", blockers),
    adverseAssociationStatus: gateStatus(
      value.adverseAssociationStatus,
      "previewInput.adverseAssociationStatus",
      blockers,
    ),
    aiPreferenceElicitationStatus: gateStatus(
      value.aiPreferenceElicitationStatus,
      "previewInput.aiPreferenceElicitationStatus",
      blockers,
    ),
    atomicSettlementStatus: gateStatus(
      value.atomicSettlementStatus,
      "previewInput.atomicSettlementStatus",
      blockers,
    ),
    causeBucketTaxonomyStatus: gateStatus(
      value.causeBucketTaxonomyStatus,
      "previewInput.causeBucketTaxonomyStatus",
      blockers,
    ),
    baselineConfidenceLevel: enumField(
      value.baselineConfidenceLevel,
      new Set(["low", "medium", "high", "unknown"]),
      "unknown",
      "previewInput.baselineConfidenceLevel",
      blockers,
    ),
    baselineIntegrityStatus: gateStatus(
      value.baselineIntegrityStatus,
      "previewInput.baselineIntegrityStatus",
      blockers,
    ),
    baselineSnapshotHash: nullableHashField(value.baselineSnapshotHash),
    baselineVersion: stringField(value.baselineVersion),
    clearingRatioBps: numberField(value.clearingRatioBps, 0),
    clearingMode: enumField(
      value.clearingMode,
      CLEARING_MODES,
      "preview_only",
      "previewInput.clearingMode",
      blockers,
    ),
    commitmentReservationStatus: gateStatus(
      value.commitmentReservationStatus,
      "previewInput.commitmentReservationStatus",
      blockers,
    ),
    destinationVerificationStatus: gateStatus(
      value.destinationVerificationStatus,
      "previewInput.destinationVerificationStatus",
      blockers,
    ),
    directPairClearingStatus: gateStatus(
      value.directPairClearingStatus,
      "previewInput.directPairClearingStatus",
      blockers,
    ),
    donorOfRecordTaxStatus: gateStatus(
      value.donorOfRecordTaxStatus,
      "previewInput.donorOfRecordTaxStatus",
      blockers,
    ),
    doubleCountStatus: gateStatus(value.doubleCountStatus, "previewInput.doubleCountStatus", blockers),
    evidenceAuthenticityStatus: gateStatus(
      value.evidenceAuthenticityStatus,
      "previewInput.evidenceAuthenticityStatus",
      blockers,
    ),
    fallbackRule: stringField(value.fallbackRule),
    finalLockProposalRef: stringField(value.finalLockProposalRef),
    finalLockProposalStatus: gateStatus(
      value.finalLockProposalStatus,
      "previewInput.finalLockProposalStatus",
      blockers,
    ),
    financialCrimeStatus: gateStatus(
      value.financialCrimeStatus,
      "previewInput.financialCrimeStatus",
      blockers,
    ),
    freshConfirmationCount: numberField(value.freshConfirmationCount, 0, 10_000),
    inputBundleHash: nullableHashField(value.inputBundleHash),
    matchedCounterpartyVolumeCents: numberField(value.matchedCounterpartyVolumeCents, 0),
    matchingClearingRunHash: nullableHashField(value.matchingClearingRunHash),
    matchingClearingRunRef: stringField(value.matchingClearingRunRef),
    matchingClearingRunStatus: gateStatus(
      value.matchingClearingRunStatus,
      "previewInput.matchingClearingRunStatus",
      blockers,
    ),
    mode: enumField(
      value.mode,
      MODES,
      "match_candidate",
      "previewInput.mode",
      blockers,
    ),
    noTradeBaseline: stringField(value.noTradeBaseline),
    nonparticipantExternalityStatus: gateStatus(
      value.nonparticipantExternalityStatus,
      "previewInput.nonparticipantExternalityStatus",
      blockers,
    ),
    participantConfirmationStatus: gateStatus(
      value.participantConfirmationStatus,
      "previewInput.participantConfirmationStatus",
      blockers,
    ),
    participantRatioMaxBps: numberField(value.participantRatioMaxBps, 0),
    participantRatioMinBps: numberField(value.participantRatioMinBps, 0),
    participantSurplusConfirmed: booleanField(value.participantSurplusConfirmed),
    performanceTerms,
    policySnapshotRef: stringField(value.policySnapshotRef),
    postClearAuditSamplingStatus: gateStatus(
      value.postClearAuditSamplingStatus,
      "previewInput.postClearAuditSamplingStatus",
      blockers,
    ),
    nonPublicGoodsSubsidyStatus: gateStatus(
      value.nonPublicGoodsSubsidyStatus,
      "previewInput.nonPublicGoodsSubsidyStatus",
      blockers,
    ),
    privacyDisclosureStatus: gateStatus(
      value.privacyDisclosureStatus,
      "previewInput.privacyDisclosureStatus",
      blockers,
    ),
    protectiveAssessmentStatus: gateStatus(
      value.protectiveAssessmentStatus,
      "previewInput.protectiveAssessmentStatus",
      blockers,
    ),
    ratioBoundsStatus: gateStatus(value.ratioBoundsStatus, "previewInput.ratioBoundsStatus", blockers),
    recipientAcceptanceStatus: gateStatus(
      value.recipientAcceptanceStatus,
      "previewInput.recipientAcceptanceStatus",
      blockers,
    ),
    releaseStage,
    reproducibilityStatus: gateStatus(
      value.reproducibilityStatus,
      "previewInput.reproducibilityStatus",
      blockers,
    ),
    requiredFreshConfirmations: numberField(value.requiredFreshConfirmations, 2, 10_000),
    residualNoTradeAction: stringField(value.residualNoTradeAction),
    resultHash: nullableHashField(value.resultHash),
    sideAgreementStatus: gateStatus(
      value.sideAgreementStatus,
      "previewInput.sideAgreementStatus",
      blockers,
    ),
    stateInterpretationPolicyRef: stringField(value.stateInterpretationPolicyRef),
    track,
    tradeClassificationStatus: gateStatus(
      value.tradeClassificationStatus,
      "previewInput.tradeClassificationStatus",
      blockers,
    ),
    unmatchedResidualCents: numberField(value.unmatchedResidualCents, 0),
    userSafetyStatus: gateStatus(value.userSafetyStatus, "previewInput.userSafetyStatus", blockers),
    verifiedPaymentDestinationStatus: gateStatus(
      value.verifiedPaymentDestinationStatus,
      "previewInput.verifiedPaymentDestinationStatus",
      blockers,
    ),
  };

  return { input, blockers };
}

function normalizeIdempotencyKey(value: unknown, fallbackHash: string) {
  const normalized = stringField(value, "").slice(0, MAX_IDEMPOTENCY_LENGTH);

  return normalized || `clearing-preview:${fallbackHash}`;
}

function normalizeSourceOfferId(value: unknown) {
  const normalized = stringField(value);

  return UUID_PATTERN.test(normalized) ? normalized : null;
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
  const contract = getMoralTradeClearingPreviewContract();
  const contractValidation = validateMoralTradeClearingPreviewContract(contract);

  return buildMoralTradeApiJsonResponse(
    {
      ok: false,
      checkedAt,
      contractVersion: contract.version,
      captureAllowed: false,
      relianceBearing: false,
      stateMutation: false,
      persistence: {
        requested: true,
        status: "not_recorded",
        recordId: null,
        table: "moral_trade_clearing_preview_records",
      },
      contractValidation,
      fallback:
        "Unsupported clearing-preview execution input creates no preview record and cannot authorize capture, reliance, lock, completion, or metric inclusion.",
      blockers,
    },
    "private_no_store",
    { status },
  );
}

export async function POST(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "clearing_preview_execute");
  const checkedAt = new Date().toISOString();

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited clearing-preview execution creates no preview record and cannot authorize capture, reliance, lock, completion, or metric inclusion.",
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
  const normalized = normalizePreviewInput(body.previewInput);

  if (!normalized.input || requestBlockers.length) {
    return invalidRequestResponse({
      checkedAt,
      blockers: [...requestBlockers, ...normalized.blockers],
    });
  }

  const contract = getMoralTradeClearingPreviewContract();
  const contractValidation = validateMoralTradeClearingPreviewContract(contract);
  const preview = buildMoralTradeClearingPreview(normalized.input);
  const previewHash = hashJson({
    contractVersion: contract.version,
    normalizedInput: normalized.input,
    preview,
  });
  const idempotencyKey = normalizeIdempotencyKey(body.idempotencyKey, previewHash);
  const sourceOfferId = normalizeSourceOfferId(body.sourceOfferId);
  const blockers = [
    ...contractValidation.blockers,
    ...normalized.blockers,
  ];
  const basePayload = {
    checkedAt,
    contractVersion: contract.version,
    captureAllowed: false,
    relianceBearing: false,
    inputBlockers: normalized.blockers,
    preview,
    previewHash,
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
          table: "moral_trade_clearing_preview_records",
        },
        fallback:
          "Clearing preview was evaluated but not recorded because Supabase is not configured; preview remains non-capture and non-reliance-bearing.",
        blockers: [
          ...blockers,
          "supabase_unconfigured:clearing_preview_execute",
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
          table: "moral_trade_clearing_preview_records",
        },
        fallback:
          "Authentication is required before recording a clearing preview. No state changed and the preview cannot authorize capture, reliance, lock, completion, or metric inclusion.",
        blockers: [
          ...blockers,
          "authentication_required:clearing_preview_execute",
        ],
      },
      "private_no_store",
      { status: 401 },
    );
  }

  const existing = await supabase
    .from("moral_trade_clearing_preview_records")
    .select("id, preview_hash, created_at")
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
          previewHash: existing.data.preview_hash,
          recordedAt: existing.data.created_at,
          table: "moral_trade_clearing_preview_records",
        },
      },
      "private_no_store",
    );
  }

  const insert: ClearingPreviewRecordInsert = {
    blocker_codes: preview.blockerCodes,
    capture_allowed_bool: false,
    clearing_ratio_bps: preview.matchedTerms.clearingRatioBps,
    contract_version: contract.version,
    final_lock_proposal_ref: normalized.input.finalLockProposalRef,
    fresh_confirmation_count: preview.freshConfirmationCount,
    idempotency_key: idempotencyKey,
    match_candidate_creates_deal_bool: false,
    matched_counterparty_volume_cents:
      preview.matchedTerms.matchedCounterpartyVolumeCents,
    matching_clearing_run_ref: normalized.input.matchingClearingRunRef,
    mode: preview.mode,
    owner_profile_id: user.id,
    policy_snapshot_ref: normalized.input.policySnapshotRef,
    preview_hash: previewHash,
    preview_input_json: normalized.input as unknown as Json,
    preview_result_json: preview as unknown as Json,
    preview_section_statuses: preview.sections.map((section) => ({
      key: section.key,
      status: section.status,
      blockerCodes: section.blockerCodes,
    })) as unknown as Json,
    preview_status: preview.status,
    release_stage: preview.releaseStage,
    reliance_bearing_bool: false,
    required_fresh_confirmations: preview.requiredFreshConfirmations,
    requires_final_lock_proposal_bool: true,
    requires_fresh_confirmations_bool: true,
    source_offer_id: sourceOfferId,
    state_interpretation_policy_ref: normalized.input.stateInterpretationPolicyRef,
    track: preview.track,
    unmatched_residual_cents: preview.matchedTerms.unmatchedResidualCents,
    user_facing_blockers: preview.userFacingBlockers,
    validator_version: MORAL_TRADE_CLEARING_PREVIEW_VALIDATOR_VERSION,
  };
  const { data, error } = await supabase
    .from("moral_trade_clearing_preview_records")
    .insert(insert)
    .select("id, preview_hash, created_at")
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
          table: "moral_trade_clearing_preview_records",
        },
        fallback:
          "The clearing preview could not be recorded. No state changed and the preview cannot authorize capture, reliance, lock, completion, or metric inclusion.",
        blockers: [
          ...blockers,
          "database_insert_failed:clearing_preview_execute",
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
        previewHash: data.preview_hash,
        recordedAt: data.created_at,
        table: "moral_trade_clearing_preview_records",
      },
    },
    "private_no_store",
    { status: contractValidation.status === "pass" ? 200 : 422 },
  );
}
