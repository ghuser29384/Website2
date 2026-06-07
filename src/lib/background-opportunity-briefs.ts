import {
  buildMatchExplanation,
  type MatchExplanationInput,
} from "@/lib/background-explanations";
import {
  BACKGROUND_SOURCE_RETENTION_DAY_OPTIONS,
  normalizeBackgroundSourcePermissionFields,
} from "@/lib/background-source-permissions";
import {
  BACKGROUND_PURPOSE_POLICY_VERSION,
  formatBackgroundPurposeLabel,
  normalizeBackgroundPurposeBinding,
  type BackgroundPurposeCode,
} from "@/lib/background-purpose-registry";
import { normalizeDisclosureFieldKeys } from "@/lib/background-disclosure";
import type { Database } from "@/lib/supabase/database.types";

type OpportunityBriefInsert =
  Database["public"]["Tables"]["background_opportunity_briefs"]["Insert"];
type IntroPacketInsert =
  Database["public"]["Tables"]["background_intro_packets"]["Insert"];
type DelegateReceiptInsert =
  Database["public"]["Tables"]["background_delegate_receipts"]["Insert"];
type SourceSummaryInsert =
  Database["public"]["Tables"]["background_source_summaries"]["Insert"];
type GrantReceiptInsert =
  Database["public"]["Tables"]["background_grant_receipts"]["Insert"];
type ProfileInterviewAnswerInsert =
  Database["public"]["Tables"]["background_profile_interview_answers"]["Insert"];

export const BACKGROUND_OPPORTUNITY_BRIEF_VERSION = "background-opportunity-brief-v1";
export const BACKGROUND_OPPORTUNITY_BRIEF_CARD_SCHEMA_VERSION =
  "background-opportunity-brief-card-v2";
export const BACKGROUND_OPPORTUNITY_BRIEF_LIST_RESPONSE_SCHEMA_VERSION =
  "background-opportunity-brief-list-response-v2";

export const BACKGROUND_OPPORTUNITY_BRIEF_DELIVERY_STATES = [
  "pending",
  "delivered",
  "opened",
  "interested",
  "maybe_later",
  "dismissed",
  "expired",
] as const;

export const BACKGROUND_OPPORTUNITY_BRIEF_ACTIONS = [
  "request_more_detail",
  "maybe_later",
  "dismiss",
  "report_concern",
] as const;

const BACKGROUND_OPPORTUNITY_BRIEF_CARD_ALLOWED_KEYS = [
  "actions",
  "authorizationScope",
  "blockerCodes",
  "confidenceBand",
  "deliveryState",
  "dependencyState",
  "factorCodes",
  "hiddenFieldsNotice",
  "humanReviewRequired",
  "id",
  "nextStep",
  "purposeLabel",
  "receiptId",
  "redactedFields",
  "redactionNotice",
  "revealConsequenceNotice",
  "reviewStatus",
  "safeSummary",
  "safetyBlockerCodes",
  "scannedSurfaces",
  "schemaVersion",
  "status",
  "title",
  "visibleCounts",
  "why",
] as const;

const BACKGROUND_OPPORTUNITY_BRIEF_LIST_RESPONSE_ALLOWED_KEYS = [
  "briefs",
  "privacyNotice",
  "rollout",
  "schemaVersion",
] as const;

const BACKGROUND_OPPORTUNITY_BRIEF_INTERNAL_KEY_PATTERN =
  /(?:candidate|counterparty|profile_id|match_id|key_hash|discoverability|inbound|budget|cohort|source_summary|debug|exact|raw|contact|private|notes?|message|prompt|timing)/i;

export const BACKGROUND_BRIEF_HIDDEN_FIELDS_NOTICE =
  "Exact wishes, private asks, contact details, raw source notes, and sensitive constraints stay hidden until a purpose-bound grant or mutual consent.";

export const BACKGROUND_BRIEF_REVEAL_NOTICE =
  "Requesting more detail queues a reviewed, field-bound step; it does not send contact details or introduce anyone automatically.";

export const BACKGROUND_INTRO_PACKET_DEFAULT_QUESTIONS = [
  "What narrow decision would this first conversation help you make?",
  "What happens if no trade or introduction occurs?",
  "Which field-bound details are necessary before meeting?",
  "What constraint would make the introduction unsafe or unproductive?",
] as const;

const BACKGROUND_INTRO_REQUESTER_ANSWER_KEYS = [
  "firstQuestion",
  "privacyConstraints",
  "proposedTradeShape",
] as const;

const BACKGROUND_INTRO_PRIVACY_CONSTRAINT_KEYS = [
  "allowedUse",
  "consentStage",
  "contactPreference",
  "redactionNotes",
  "reviewBoundaries",
  "safeIntroductionConditions",
  "visibility",
] as const;

const BACKGROUND_INTRO_TRADE_SHAPE_KEYS = [
  "counterpartyRole",
  "duration",
  "exitConditions",
  "format",
  "offeredCause",
  "participantRole",
  "publicDescription",
  "requestedCause",
  "verificationMethod",
] as const;

const MAX_TEXT_LENGTH = 900;
const SOURCE_RETENTION_DAY_SET = new Set<number>(BACKGROUND_SOURCE_RETENTION_DAY_OPTIONS);
const INTRO_REQUESTER_ANSWER_KEY_SET = new Set<string>(BACKGROUND_INTRO_REQUESTER_ANSWER_KEYS);
const PRIVACY_CONSTRAINT_KEY_SET = new Set<string>(BACKGROUND_INTRO_PRIVACY_CONSTRAINT_KEYS);
const TRADE_SHAPE_KEY_SET = new Set<string>(BACKGROUND_INTRO_TRADE_SHAPE_KEYS);

function compactText(value: string, maxLength = MAX_TEXT_LENGTH) {
  const compact = value.replace(/\s+/g, " ").trim();

  if (compact.length <= maxLength) {
    return compact;
  }

  return `${compact.slice(0, maxLength - 1).trim()}...`;
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function bucketVisibleCount(value: unknown): "withheld" | "none" | "1" | "2_to_3" | "4_plus" {
  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(numericValue)) {
    return "withheld";
  }

  if (numericValue <= 0) {
    return "none";
  }

  if (numericValue === 1) {
    return "1";
  }

  if (numericValue <= 3) {
    return "2_to_3";
  }

  return "4_plus";
}

function normalizeRequesterVisibleCounts(sharedCounts?: Record<string, unknown> | null) {
  return {
    factorCodes: bucketVisibleCount(sharedCounts?.factorCodeCount),
    redactedFields: bucketVisibleCount(sharedCounts?.redactedSurfaceCount),
    sharedCauses: bucketVisibleCount(sharedCounts?.sharedCauseCount),
  };
}

function getRequesterDependencyState(row: {
  delivery_state?: string | null;
  expires_at?: string | null;
  review_status?: string | null;
  status?: string | null;
}) {
  if (
    row.status === "expired" ||
    row.delivery_state === "expired" ||
    (row.expires_at && Date.parse(row.expires_at) <= Date.now())
  ) {
    return "stale_or_unavailable" as const;
  }

  if (row.review_status === "blocked") {
    return "review_required" as const;
  }

  return "valid" as const;
}

function genericBlockerCodes(row: {
  delivery_state?: string | null;
  review_status?: string | null;
  status?: string | null;
}) {
  const blockers: string[] = [];

  if (row.review_status === "blocked") {
    blockers.push("review_required");
  }

  if (row.status === "expired" || row.delivery_state === "expired") {
    blockers.push("stale_or_unavailable");
  }

  if (row.status === "dismissed" || row.status === "muted") {
    blockers.push("participant_dismissed");
  }

  return uniqueStrings(blockers);
}

function allowedActionsForDependencyState(
  dependencyState: ReturnType<typeof getRequesterDependencyState>,
) {
  if (dependencyState !== "valid") {
    return [];
  }

  return [...BACKGROUND_OPPORTUNITY_BRIEF_ACTIONS];
}

function exactKeyValidation({
  allowedKeys,
  value,
}: {
  allowedKeys: readonly string[];
  value: Record<string, unknown>;
}) {
  const allowed = new Set<string>(allowedKeys);
  const keys = Object.keys(value);
  const extraKeys = keys.filter((key) => !allowed.has(key));
  const missingKeys = allowedKeys.filter(
    (key) => !Object.prototype.hasOwnProperty.call(value, key),
  );
  const unsafeKeys = keys.filter((key) => BACKGROUND_OPPORTUNITY_BRIEF_INTERNAL_KEY_PATTERN.test(key));

  return {
    extraKeys,
    missingKeys,
    status:
      extraKeys.length || missingKeys.length || unsafeKeys.length ? ("fail" as const) : ("pass" as const),
    unsafeKeys,
  };
}

function normalizeRequesterAnswerValue(value: unknown) {
  if (typeof value === "string") {
    return compactText(value, 700);
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (Array.isArray(value) && value.every((entry) => typeof entry === "string")) {
    return uniqueStrings(value).slice(0, 12).map((entry) => compactText(entry, 220));
  }

  return null;
}

function normalizeRequesterAnswerObject({
  allowedKeys,
  errors,
  namespace,
  value,
}: {
  allowedKeys: Set<string>;
  errors: string[];
  namespace: string;
  value: unknown;
}) {
  const normalized: Record<string, unknown> = {};
  const unsupportedKeys: string[] = [];

  if (value == null) {
    return normalized;
  }

  if (!isRecord(value)) {
    errors.push(`${namespace} must be a structured object with approved reviewer-answer keys.`);
    return normalized;
  }

  for (const [key, entry] of Object.entries(value)) {
    if (!allowedKeys.has(key)) {
      unsupportedKeys.push(`${namespace}.${key}`);
      continue;
    }

    const normalizedValue = normalizeRequesterAnswerValue(entry);

    if (normalizedValue === null) {
      errors.push(`${namespace}.${key} must be a string, number, boolean, or string list.`);
      continue;
    }

    normalized[key] = normalizedValue;
  }

  if (unsupportedKeys.length) {
    errors.push(`Unsupported requester answer keys are not allowed: ${unsupportedKeys.join(", ")}.`);
  }

  return normalized;
}

export function normalizeOpportunityBriefDeliveryState(value?: string | null) {
  if (
    BACKGROUND_OPPORTUNITY_BRIEF_DELIVERY_STATES.includes(
      value as (typeof BACKGROUND_OPPORTUNITY_BRIEF_DELIVERY_STATES)[number],
    )
  ) {
    return value as (typeof BACKGROUND_OPPORTUNITY_BRIEF_DELIVERY_STATES)[number];
  }

  if (value === "open" || value === "packet_requested" || value === "muted") {
    return "delivered";
  }

  return "pending";
}

export function getOpportunityBriefDeliveryStateForFeedback(
  outcome: "dismissed" | "interested" | "maybe_later",
) {
  return outcome;
}

function addDays(now: Date, days: number) {
  const expiresAt = new Date(now.getTime());
  expiresAt.setUTCDate(expiresAt.getUTCDate() + days);
  return expiresAt.toISOString();
}

export function normalizeOpportunityBriefNextStep({
  hasOpenClarification,
  viewerConsented,
}: {
  hasOpenClarification?: boolean;
  viewerConsented?: boolean;
}): OpportunityBriefInsert["next_step_type"] {
  if (hasOpenClarification) {
    return "answer_questions";
  }

  if (viewerConsented) {
    return "request_detail";
  }

  return "request_intro_packet";
}

export function buildOpportunityBriefRow({
  candidateProfileId,
  expiresAt,
  hasOpenClarification = false,
  matchId,
  profileId,
  purposeCode,
  purposePolicyVersion,
  title = "Opportunity brief",
  ...input
}: MatchExplanationInput & {
  candidateProfileId?: string | null;
  expiresAt?: string;
  hasOpenClarification?: boolean;
  matchId: string;
  profileId: string;
  purposeCode?: string | null;
  purposePolicyVersion?: string | null;
  title?: string;
}): OpportunityBriefInsert {
  const explanation = buildMatchExplanation(input);
  const nextStepType = normalizeOpportunityBriefNextStep({
    hasOpenClarification,
    viewerConsented: input.viewerConsented,
  });
  const purposeBinding = normalizeBackgroundPurposeBinding({
    purposeCode,
    purposePolicyVersion: purposePolicyVersion ?? BACKGROUND_PURPOSE_POLICY_VERSION,
  });
  const reasonCodes = explanation.reasonCodes.length
    ? explanation.reasonCodes.join(", ")
    : "Broad preview compatibility";

  return {
    candidate_profile_id: candidateProfileId ?? null,
    confidence_band: explanation.confidenceBand,
    delivery_state: "pending",
    factor_codes: explanation.factorCodes,
    hidden_fields_notice: BACKGROUND_BRIEF_HIDDEN_FIELDS_NOTICE,
    human_review_required: true,
    match_id: matchId,
    next_step_type: nextStepType,
    output_schema_version: BACKGROUND_OPPORTUNITY_BRIEF_CARD_SCHEMA_VERSION,
    profile_id: profileId,
    purpose_code: purposeBinding.purposeCode,
    purpose_policy_version: purposeBinding.purposePolicyVersion,
    redacted_fields: explanation.redactedSurfaces,
    reveal_consequence_notice: BACKGROUND_BRIEF_REVEAL_NOTICE,
    review_status: "human_review_required",
    safe_summary: explanation.summary,
    shared_counts: {
      factorCodeCount: explanation.factorCodes.length,
      redactedSurfaceCount: explanation.redactedSurfaces.length,
      sharedCauseCount: input.sharedCauses.length,
    },
    status: "open",
    title,
    expires_at: expiresAt,
    why_text: compactText(
      `${explanation.summary} Reason codes: ${reasonCodes}. Next safe step: ${formatOpportunityBriefNextStep(nextStepType)}.`,
      700,
    ),
  };
}

export function formatOpportunityBriefNextStep(
  value: OpportunityBriefInsert["next_step_type"] | string,
) {
  switch (value) {
    case "answer_questions":
      return "answer clarifying questions";
    case "request_intro_packet":
      return "request a reviewed introduction packet";
    case "request_detail":
      return "request a purpose-bound detail grant";
    case "mute_or_dismiss":
      return "mute or dismiss similar leads";
    case "review_profile":
    default:
      return "review the broad preview";
  }
}

export interface BackgroundRequesterOpportunityBriefCard {
  actions: Array<(typeof BACKGROUND_OPPORTUNITY_BRIEF_ACTIONS)[number]>;
  authorizationScope: string;
  blockerCodes: string[];
  confidenceBand: string;
  deliveryState: ReturnType<typeof normalizeOpportunityBriefDeliveryState>;
  dependencyState: "valid" | "stale_or_unavailable" | "review_required";
  factorCodes: string[];
  hiddenFieldsNotice: string;
  humanReviewRequired: boolean;
  id: string;
  nextStep: string;
  purposeLabel: string;
  receiptId: string | null;
  redactedFields: string[];
  redactionNotice: string;
  revealConsequenceNotice: string;
  reviewStatus: string;
  safeSummary: string;
  safetyBlockerCodes: string[];
  scannedSurfaces: string[];
  schemaVersion: typeof BACKGROUND_OPPORTUNITY_BRIEF_CARD_SCHEMA_VERSION;
  status: string;
  title: string;
  visibleCounts: ReturnType<typeof normalizeRequesterVisibleCounts>;
  why: string;
}

export interface BackgroundOpportunityBriefListResponse {
  briefs: BackgroundRequesterOpportunityBriefCard[];
  privacyNotice: string;
  rollout: Record<string, unknown>;
  schemaVersion: typeof BACKGROUND_OPPORTUNITY_BRIEF_LIST_RESPONSE_SCHEMA_VERSION;
}

export function validateRequesterOpportunityBriefCard(value: Record<string, unknown>) {
  return exactKeyValidation({
    allowedKeys: BACKGROUND_OPPORTUNITY_BRIEF_CARD_ALLOWED_KEYS,
    value,
  });
}

export function validateOpportunityBriefListResponse(value: Record<string, unknown>) {
  const responseValidation = exactKeyValidation({
    allowedKeys: BACKGROUND_OPPORTUNITY_BRIEF_LIST_RESPONSE_ALLOWED_KEYS,
    value,
  });
  const briefValidations = Array.isArray(value.briefs)
    ? value.briefs.map((brief) =>
        isRecord(brief)
          ? validateRequesterOpportunityBriefCard(brief)
          : {
              extraKeys: [],
              missingKeys: [...BACKGROUND_OPPORTUNITY_BRIEF_CARD_ALLOWED_KEYS],
              status: "fail" as const,
              unsafeKeys: [],
            },
      )
    : [
        {
          extraKeys: [],
          missingKeys: ["briefs"],
          status: "fail" as const,
          unsafeKeys: [],
        },
      ];
  const failedBriefs = briefValidations.filter((validation) => validation.status === "fail");

  return {
    ...responseValidation,
    briefValidations,
    failedBriefCount: failedBriefs.length,
    status:
      responseValidation.status === "pass" && failedBriefs.length === 0
        ? ("pass" as const)
        : ("fail" as const),
  };
}

export function assertRequesterOpportunityBriefCard(
  card: BackgroundRequesterOpportunityBriefCard,
) {
  const validation = validateRequesterOpportunityBriefCard(card as unknown as Record<string, unknown>);

  if (validation.status === "fail") {
    throw new Error(
      `Opportunity brief card schema ${BACKGROUND_OPPORTUNITY_BRIEF_CARD_SCHEMA_VERSION} rejected keys: extra=${validation.extraKeys.join(",")}; missing=${validation.missingKeys.join(",")}; unsafe=${validation.unsafeKeys.join(",")}`,
    );
  }

  return card;
}

export function assertOpportunityBriefListResponse(
  response: BackgroundOpportunityBriefListResponse,
) {
  const validation = validateOpportunityBriefListResponse(
    response as unknown as Record<string, unknown>,
  );

  if (validation.status === "fail") {
    throw new Error(
      `Opportunity brief list schema ${BACKGROUND_OPPORTUNITY_BRIEF_LIST_RESPONSE_SCHEMA_VERSION} rejected the response.`,
    );
  }

  return response;
}

export function buildOpportunityBriefListResponse({
  briefs,
  privacyNotice,
  rollout,
}: {
  briefs: BackgroundRequesterOpportunityBriefCard[];
  privacyNotice: string;
  rollout: Record<string, unknown>;
}): BackgroundOpportunityBriefListResponse {
  return assertOpportunityBriefListResponse({
    briefs,
    privacyNotice,
    rollout,
    schemaVersion: BACKGROUND_OPPORTUNITY_BRIEF_LIST_RESPONSE_SCHEMA_VERSION,
  });
}

export function serializeOpportunityBriefCard(row: {
  confidence_band: string;
  delivery_state?: string | null;
  expires_at?: string | null;
  factor_codes: string[];
  hidden_fields_notice: string;
  human_review_required?: boolean | null;
  id: string;
  next_step_type: string;
  output_schema_version?: string | null;
  purpose_code?: string | null;
  purpose_policy_version?: string | null;
  redacted_fields?: string[] | null;
  redacted_receipt_id?: string | null;
  receipt_id?: string | null;
  reveal_consequence_notice: string;
  review_status?: string | null;
  safe_summary?: string | null;
  shared_counts?: Record<string, unknown> | null;
  status: string;
  title: string;
  why_text: string;
}): BackgroundRequesterOpportunityBriefCard {
  const dependencyState = getRequesterDependencyState(row);
  const purposeBinding = normalizeBackgroundPurposeBinding({
    purposeCode: row.purpose_code,
    purposePolicyVersion: row.purpose_policy_version ?? BACKGROUND_PURPOSE_POLICY_VERSION,
  });
  const card: BackgroundRequesterOpportunityBriefCard = {
    actions: allowedActionsForDependencyState(dependencyState),
    authorizationScope: "Participant-approved background delegate scope",
    blockerCodes: genericBlockerCodes(row),
    confidenceBand: row.confidence_band,
    deliveryState: normalizeOpportunityBriefDeliveryState(row.delivery_state ?? row.status),
    dependencyState,
    factorCodes: uniqueStrings(row.factor_codes),
    hiddenFieldsNotice: row.hidden_fields_notice || BACKGROUND_BRIEF_HIDDEN_FIELDS_NOTICE,
    humanReviewRequired: row.human_review_required ?? true,
    id: row.id,
    nextStep: formatOpportunityBriefNextStep(row.next_step_type),
    purposeLabel: formatBackgroundPurposeLabel(purposeBinding),
    receiptId: row.redacted_receipt_id ?? row.receipt_id ?? null,
    redactedFields: uniqueStrings(row.redacted_fields ?? []),
    redactionNotice: row.hidden_fields_notice || BACKGROUND_BRIEF_HIDDEN_FIELDS_NOTICE,
    revealConsequenceNotice: row.reveal_consequence_notice || BACKGROUND_BRIEF_REVEAL_NOTICE,
    reviewStatus: row.review_status ?? "human_review_required",
    safeSummary: compactText(row.safe_summary ?? row.why_text, 500),
    safetyBlockerCodes: row.review_status === "blocked" ? ["review_required"] : [],
    scannedSurfaces: ["broad_profile"],
    schemaVersion: BACKGROUND_OPPORTUNITY_BRIEF_CARD_SCHEMA_VERSION,
    status: row.status,
    title: compactText(row.title, 140),
    visibleCounts: normalizeRequesterVisibleCounts(row.shared_counts),
    why: compactText(row.why_text, 700),
  };

  return assertRequesterOpportunityBriefCard(card);
}

export function validateIntroPacketInput({
  purpose,
  requesterAnswers,
  requestedFieldKeys,
}: {
  purpose: string;
  requesterAnswers?: Record<string, unknown>;
  requestedFieldKeys: string[];
}) {
  const errors: string[] = [];
  const requestedFields = uniqueStrings(requestedFieldKeys);
  const fields = normalizeDisclosureFieldKeys(requestedFields).slice(0, 8);
  const supportedFields = new Set<string>(fields);
  const unsupportedFields = requestedFields.filter((field) => !supportedFields.has(field));
  const answerValidation = validateIntroRequesterAnswers(requesterAnswers);

  if (purpose.trim().length < 12) {
    errors.push("Add a concrete purpose for the reviewed introduction packet.");
  }

  if (unsupportedFields.length) {
    errors.push(
      `Unsupported disclosure field keys are not allowed: ${unsupportedFields.join(", ")}.`,
    );
  }

  if (!fields.length) {
    errors.push("Choose at least one field the reviewer should consider.");
  }

  errors.push(...answerValidation.errors);

  return {
    errors,
    requestedFieldKeys: fields,
    requesterAnswers: answerValidation.requesterAnswers,
  };
}

export function validateIntroRequesterAnswers(requesterAnswers?: Record<string, unknown>) {
  const errors: string[] = [];
  const normalized: Record<string, unknown> = {};
  const unsupportedKeys: string[] = [];

  if (!requesterAnswers) {
    return { errors, requesterAnswers: normalized };
  }

  for (const [key, value] of Object.entries(requesterAnswers)) {
    if (!INTRO_REQUESTER_ANSWER_KEY_SET.has(key)) {
      unsupportedKeys.push(key);
      continue;
    }

    if (key === "firstQuestion") {
      const normalizedValue = normalizeRequesterAnswerValue(value);

      if (normalizedValue === null || Array.isArray(normalizedValue)) {
        errors.push("firstQuestion must be a bounded string, number, or boolean.");
        continue;
      }

      normalized.firstQuestion = normalizedValue;
      continue;
    }

    normalized[key] = normalizeRequesterAnswerObject({
      allowedKeys: key === "privacyConstraints" ? PRIVACY_CONSTRAINT_KEY_SET : TRADE_SHAPE_KEY_SET,
      errors,
      namespace: key,
      value,
    });
  }

  if (unsupportedKeys.length) {
    errors.push(`Unsupported requester answer keys are not allowed: ${unsupportedKeys.join(", ")}.`);
  }

  return { errors, requesterAnswers: normalized };
}

export function buildIntroPacketRow({
  counterpartyProfileId,
  matchId,
  opportunityBriefId,
  purpose,
  purposeCode,
  purposePolicyVersion,
  requestedFieldKeys,
  requesterAnswers,
  requesterProfileId,
}: {
  counterpartyProfileId?: string | null;
  matchId?: string | null;
  opportunityBriefId?: string | null;
  purpose: string;
  purposeCode?: BackgroundPurposeCode | string | null;
  purposePolicyVersion?: string | null;
  requestedFieldKeys: string[];
  requesterAnswers?: Record<string, unknown>;
  requesterProfileId: string;
}): IntroPacketInsert {
  const validation = validateIntroPacketInput({ purpose, requesterAnswers, requestedFieldKeys });

  if (validation.errors.length) {
    throw new Error(validation.errors.join(" "));
  }

  const purposeBinding = normalizeBackgroundPurposeBinding({
    purposeCode,
    purposePolicyVersion: purposePolicyVersion ?? BACKGROUND_PURPOSE_POLICY_VERSION,
  });

  return {
    counterparty_profile_id: counterpartyProfileId ?? null,
    match_id: matchId ?? null,
    mutual_questions: [...BACKGROUND_INTRO_PACKET_DEFAULT_QUESTIONS],
    opportunity_brief_id: opportunityBriefId ?? null,
    purpose: compactText(purpose, 700),
    purpose_code: purposeBinding.purposeCode,
    purpose_policy_version: purposeBinding.purposePolicyVersion,
    requested_field_keys: validation.requestedFieldKeys,
    requester_answers: validation.requesterAnswers,
    requester_profile_id: requesterProfileId,
    reveal_capsule:
      "Reviewer should prepare only field-bound details after both sides consent; no contact details are sent automatically.",
    review_state: "requested",
  };
}

export function buildBackgroundDelegateReceiptRow({
  blockerCount,
  factorCount,
  profileId,
  publicSummary,
  purposeCode,
  purposePolicyVersion,
  receiptKind,
  subjectId,
  subjectKind,
}: {
  blockerCount?: number;
  factorCount?: number;
  profileId: string;
  publicSummary: string;
  purposeCode?: string | null;
  purposePolicyVersion?: string | null;
  receiptKind: DelegateReceiptInsert["receipt_kind"];
  subjectId?: string | null;
  subjectKind: DelegateReceiptInsert["subject_kind"];
}): DelegateReceiptInsert {
  const purposeBinding = normalizeBackgroundPurposeBinding({
    purposeCode,
    purposePolicyVersion: purposePolicyVersion ?? BACKGROUND_PURPOSE_POLICY_VERSION,
  });

  return {
    blocker_count_bucket: bucketVisibleCount(blockerCount ?? Number.NaN),
    factor_count_bucket: bucketVisibleCount(factorCount ?? Number.NaN),
    profile_id: profileId,
    public_summary: compactText(publicSummary, 500),
    purpose_code: purposeBinding.purposeCode,
    purpose_policy_version: purposeBinding.purposePolicyVersion,
    receipt_kind: receiptKind,
    redacted_payload: {
      disclosureState: "redacted",
      privateDetailsReturned: false,
      schemaVersion: "background-delegate-receipt-v1",
    },
    subject_id: subjectId ?? null,
    subject_kind: subjectKind,
  };
}

export function normalizeSourceSummaryRetentionDays(value: string | number | null | undefined) {
  const parsed = Number(value ?? 90);

  return SOURCE_RETENTION_DAY_SET.has(parsed)
    ? (parsed as (typeof BACKGROUND_SOURCE_RETENTION_DAY_OPTIONS)[number])
    : 90;
}

export function getBackgroundSourceRetentionExpiresAt(
  value: string | number | null | undefined,
  now = new Date(),
) {
  return addDays(now, normalizeSourceSummaryRetentionDays(value));
}

export function buildSourceSummaryRows({
  allowedFieldKeys,
  label,
  now = new Date(),
  profileId,
  purpose,
  retentionDays,
  sourceConnectionId,
  sourceType = "manual",
}: {
  allowedFieldKeys: string[];
  label: string;
  now?: Date;
  profileId: string;
  purpose: string;
  retentionDays: string | number;
  sourceConnectionId?: string | null;
  sourceType?: SourceSummaryInsert["source_type"];
}): {
  receipt: GrantReceiptInsert;
  sourceSummary: SourceSummaryInsert;
  validationErrors: string[];
} {
  const fieldKeys = normalizeBackgroundSourcePermissionFields(allowedFieldKeys);
  const normalizedRetentionDays = normalizeSourceSummaryRetentionDays(retentionDays);
  const expiresAt = getBackgroundSourceRetentionExpiresAt(normalizedRetentionDays, now);
  const validationErrors: string[] = [];

  if (!label.trim()) {
    validationErrors.push("Source summary label is required.");
  }

  if (!purpose.trim() || purpose.trim().length < 12) {
    validationErrors.push("Describe the purpose for using this summary.");
  }

  if (!fieldKeys.length) {
    validationErrors.push("Choose at least one broad field this summary may influence.");
  }

  return {
    receipt: {
      audience_stage: "consent",
      expires_at: expiresAt,
      field_keys: fieldKeys,
      profile_id: profileId,
      purpose: compactText(purpose, 700),
      receipt_kind: "source_summary",
      status: "active",
    },
    sourceSummary: {
      allowed_field_keys: fieldKeys,
      label: compactText(label, 160),
      profile_id: profileId,
      purpose: compactText(purpose, 700),
      raw_ingestion_allowed: false,
      retention_expires_at: expiresAt,
      source_connection_id: sourceConnectionId ?? null,
      source_type: sourceType,
      status: "active",
    },
    validationErrors,
  };
}

export function getGrantReceiptStatus({
  expiresAt,
  revokedAt,
  now = new Date(),
}: {
  expiresAt?: string | null;
  now?: Date;
  revokedAt?: string | null;
}): "active" | "expired" | "revoked" {
  if (revokedAt) {
    return "revoked";
  }

  if (expiresAt && Date.parse(expiresAt) <= now.getTime()) {
    return "expired";
  }

  return "active";
}

export function buildProfileInterviewAnswerRow({
  answer,
  broadPreviewUpdate,
  privateIntentUpdate,
  profileId,
  questionKey,
  questionText,
  status = "saved",
  uncertaintyFlags = [],
}: {
  answer: string;
  broadPreviewUpdate?: string;
  privateIntentUpdate?: string;
  profileId: string;
  questionKey: string;
  questionText?: string;
  status?: ProfileInterviewAnswerInsert["status"];
  uncertaintyFlags?: string[];
}): ProfileInterviewAnswerInsert {
  return {
    answer: compactText(answer, 900),
    broad_preview_update: compactText(broadPreviewUpdate ?? "", 420),
    private_intent_update: compactText(privateIntentUpdate ?? "", 900),
    profile_id: profileId,
    question_key: compactText(questionKey || "manual_interview_answer", 120),
    question_text: compactText(questionText ?? "", 500),
    status,
    uncertainty_flags: uniqueStrings(uncertaintyFlags).slice(0, 8),
  };
}
