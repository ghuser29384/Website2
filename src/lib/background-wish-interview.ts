import { buildProfileInterviewAnswerRow } from "@/lib/background-opportunity-briefs";
import {
  buildBackgroundRefinementAnalyticsEvent,
  type BackgroundRefinementItem,
} from "@/lib/background-refinement";
import {
  getBackgroundSourcePermissionExpiry,
  normalizeBackgroundSourcePermissionFields,
  type BackgroundSourcePermissionField,
} from "@/lib/background-source-permissions";
import type { Database } from "@/lib/supabase/database.types";

export const BACKGROUND_WISH_INTERVIEW_MODEL_NAME = "deterministic-wish-interview-v1";
export const BACKGROUND_WISH_INTERVIEW_SESSION_VERSION =
  "background-wish-interview-session-v1";
export const BACKGROUND_WISH_INTERVIEW_DEFAULT_CONSENT_VERSION =
  "background-wish-interview-consent-v1";
export const BACKGROUND_WISH_INTERVIEW_SIGNAL_RETENTION_DAYS = 90;

export const BACKGROUND_WISH_INTERVIEW_FORBIDDEN_DELTA_KEYS = [
  "contact_details",
  "raw_profile_notes",
  "raw_source_notes",
  "payment_private_payload",
  "protected_trait_inference",
] as const;

type BackgroundProfileSignalInsert =
  Database["public"]["Tables"]["background_profile_signals"]["Insert"];
type ProfileInterviewAnswerInsert =
  Database["public"]["Tables"]["background_profile_interview_answers"]["Insert"];

export type BackgroundWishInterviewSessionStatus =
  | "draft"
  | "awaiting_review"
  | "applied"
  | "discarded"
  | "expired";

export type BackgroundWishInterviewAnswerLengthBucket =
  | "empty"
  | "short"
  | "medium"
  | "long";

export interface BackgroundWishInterviewQuestion {
  answerKind: BackgroundRefinementItem["answerKind"];
  confidenceBefore: BackgroundRefinementItem["confidenceBefore"];
  fieldKey: BackgroundSourcePermissionField;
  options: string[];
  prompt: string;
  privacyStage: "registry" | "consent";
  questionKey: string;
  refinementVersion: BackgroundRefinementItem["refinementVersion"];
  whyAsked: string;
}

export interface BackgroundWishInterviewAnswerState {
  answerKind: BackgroundWishInterviewQuestion["answerKind"];
  answerLengthBucket: BackgroundWishInterviewAnswerLengthBucket;
  answerTextStoredInSession: false;
  deltaStatus: "draft" | "awaiting_review" | "applied";
  fieldKey: BackgroundSourcePermissionField;
  questionKey: string;
  selectedOptionCount: number;
  selectedOptions: string[];
}

export interface BackgroundWishInterviewSessionState extends Record<string, unknown> {
  allowedDeltaKeys: BackgroundSourcePermissionField[];
  analytics: ReturnType<typeof buildBackgroundRefinementAnalyticsEvent>;
  answers: BackgroundWishInterviewAnswerState[];
  consentVersion: string;
  forbiddenDeltaKeys: readonly (typeof BACKGROUND_WISH_INTERVIEW_FORBIDDEN_DELTA_KEYS)[number][];
  hiddenInferenceCreated: false;
  liveAiMutation: false;
  privateProfileId: string;
  profileMutationApplied: false;
  proposedDeltaKeys: BackgroundSourcePermissionField[];
  publicPreviewMutationRequiresApproval: true;
  questionCursor: number;
  questions: BackgroundWishInterviewQuestion[];
  rawSourceAccess: false;
  rawTranscriptStored: false;
  sessionStatus: BackgroundWishInterviewSessionStatus;
  signalRecomputeRecommended: boolean;
  version: typeof BACKGROUND_WISH_INTERVIEW_SESSION_VERSION;
}

export interface BackgroundWishInterviewAnswerDraft {
  answerState: BackgroundWishInterviewAnswerState;
  row: ProfileInterviewAnswerInsert;
}

export interface BackgroundWishInterviewApplyValidation {
  approvedDeltaKeys: BackgroundSourcePermissionField[];
  errors: string[];
  rejectedDeltaKeys: string[];
}

function cleanText(value = "", maxLength = 900) {
  const compact = value.replace(/\s+/g, " ").trim();

  if (compact.length <= maxLength) {
    return compact;
  }

  return `${compact.slice(0, maxLength - 1).trim()}...`;
}

function cleanList(values: string[] = []) {
  return [...new Set(values.map((value) => cleanText(value, 80)).filter(Boolean))];
}

function normalizeOption(value: string) {
  return value.trim().toLowerCase();
}

function getPrivacyStage(fieldKey: BackgroundSourcePermissionField) {
  return fieldKey === "cause_priorities" ||
    fieldKey === "capability_tags" ||
    fieldKey === "verification_preferences"
    ? "registry"
    : "consent";
}

function getWhyAsked(item: Pick<BackgroundRefinementItem, "confidenceBefore" | "fieldKey">) {
  if (item.confidenceBefore === "low") {
    return "This profile slot is missing or low-confidence, so a reviewed answer can improve deterministic matching.";
  }

  return "This profile slot is underspecified, so a reviewed answer can reduce false-positive matches.";
}

function getAnswerLengthBucket(answer: string): BackgroundWishInterviewAnswerLengthBucket {
  if (!answer) {
    return "empty";
  }

  if (answer.length <= 80) {
    return "short";
  }

  if (answer.length <= 320) {
    return "medium";
  }

  return "long";
}

function answerValuesFromBody(value: unknown) {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

export function buildBackgroundWishInterviewQuestionKey({
  fieldKey,
  sessionId,
}: {
  fieldKey: string;
  sessionId: string;
}) {
  return cleanText(`wish_interview:${sessionId}:${fieldKey}`, 120);
}

export function buildBackgroundWishInterviewQuestions({
  items,
  sessionId,
}: {
  items: BackgroundRefinementItem[];
  sessionId: string;
}): BackgroundWishInterviewQuestion[] {
  return items.map((item) => ({
    answerKind: item.answerKind,
    confidenceBefore: item.confidenceBefore,
    fieldKey: item.fieldKey,
    options: cleanList(item.options),
    prompt: item.prompt,
    privacyStage: getPrivacyStage(item.fieldKey),
    questionKey: buildBackgroundWishInterviewQuestionKey({
      fieldKey: item.fieldKey,
      sessionId,
    }),
    refinementVersion: item.refinementVersion,
    whyAsked: getWhyAsked(item),
  }));
}

export function buildBackgroundWishInterviewSessionState({
  consentVersion = BACKGROUND_WISH_INTERVIEW_DEFAULT_CONSENT_VERSION,
  items,
  privateProfileId,
  sessionId,
}: {
  consentVersion?: string;
  items: BackgroundRefinementItem[];
  privateProfileId: string;
  sessionId: string;
}): BackgroundWishInterviewSessionState {
  const questions = buildBackgroundWishInterviewQuestions({ items, sessionId });
  const allowedDeltaKeys = normalizeBackgroundSourcePermissionFields(
    questions.map((question) => question.fieldKey),
  );

  return {
    allowedDeltaKeys,
    analytics: buildBackgroundRefinementAnalyticsEvent({
      items: questions,
      status: questions.length ? "active" : "completed",
    }),
    answers: [],
    consentVersion: cleanText(consentVersion, 80) || BACKGROUND_WISH_INTERVIEW_DEFAULT_CONSENT_VERSION,
    forbiddenDeltaKeys: BACKGROUND_WISH_INTERVIEW_FORBIDDEN_DELTA_KEYS,
    hiddenInferenceCreated: false,
    liveAiMutation: false,
    privateProfileId,
    profileMutationApplied: false,
    proposedDeltaKeys: [],
    publicPreviewMutationRequiresApproval: true,
    questionCursor: 0,
    questions,
    rawSourceAccess: false,
    rawTranscriptStored: false,
    sessionStatus: questions.length ? "draft" : "awaiting_review",
    signalRecomputeRecommended: false,
    version: BACKGROUND_WISH_INTERVIEW_SESSION_VERSION,
  };
}

export function isBackgroundWishInterviewSessionState(
  value: unknown,
): value is BackgroundWishInterviewSessionState {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      (value as { version?: unknown }).version === BACKGROUND_WISH_INTERVIEW_SESSION_VERSION &&
      Array.isArray((value as { questions?: unknown }).questions) &&
      Array.isArray((value as { answers?: unknown }).answers),
  );
}

export function getCurrentBackgroundWishInterviewQuestion(
  state: Pick<BackgroundWishInterviewSessionState, "questionCursor" | "questions">,
) {
  return state.questions[state.questionCursor] ?? null;
}

function getSelectedOptions({
  answer,
  question,
  selectedOptions,
}: {
  answer: string;
  question: BackgroundWishInterviewQuestion;
  selectedOptions?: string[];
}) {
  if (question.answerKind !== "checklist") {
    return [];
  }

  const allowedByNormalized = new Map(
    question.options.map((option) => [normalizeOption(option), option]),
  );
  const rawValues = [
    ...answerValuesFromBody(selectedOptions),
    ...answer
      .split(/[,;\n]/)
      .map((entry) => entry.trim())
      .filter(Boolean),
  ];

  return cleanList(
    rawValues
      .map((value) => allowedByNormalized.get(normalizeOption(value)) ?? "")
      .filter(Boolean),
  ).slice(0, 8);
}

export function buildBackgroundWishInterviewAnswerDraft({
  answer,
  profileId,
  question,
  selectedOptions,
}: {
  answer?: string;
  profileId: string;
  question: BackgroundWishInterviewQuestion;
  selectedOptions?: string[];
}): BackgroundWishInterviewAnswerDraft | null {
  const answerText = cleanText(answer ?? "");
  const normalizedSelectedOptions = getSelectedOptions({
    answer: answerText,
    question,
    selectedOptions,
  });
  const storedAnswerText = answerText || normalizedSelectedOptions.join(", ");

  if (!storedAnswerText) {
    return null;
  }

  const row = buildProfileInterviewAnswerRow({
    answer: storedAnswerText,
    broadPreviewUpdate:
      question.privacyStage === "registry" ? normalizedSelectedOptions.join(", ") : "",
    privateIntentUpdate: question.privacyStage === "consent" ? storedAnswerText : "",
    profileId,
    questionKey: question.questionKey,
    questionText: question.prompt,
    status: "draft",
    uncertaintyFlags: [question.fieldKey, question.confidenceBefore],
  });

  return {
    answerState: {
      answerKind: question.answerKind,
      answerLengthBucket: getAnswerLengthBucket(storedAnswerText),
      answerTextStoredInSession: false,
      deltaStatus: "awaiting_review",
      fieldKey: question.fieldKey,
      questionKey: question.questionKey,
      selectedOptionCount: normalizedSelectedOptions.length,
      selectedOptions: normalizedSelectedOptions,
    },
    row,
  };
}

export function mergeBackgroundWishInterviewAnswerState({
  answerState,
  state,
}: {
  answerState: BackgroundWishInterviewAnswerState;
  state: BackgroundWishInterviewSessionState;
}): BackgroundWishInterviewSessionState {
  const answers = [
    ...state.answers.filter((answer) => answer.questionKey !== answerState.questionKey),
    answerState,
  ];
  const proposedDeltaKeys = normalizeBackgroundSourcePermissionFields(
    answers.map((answer) => answer.fieldKey),
  );
  const nextQuestionCursor = Math.min(state.questionCursor + 1, state.questions.length);
  const sessionStatus = nextQuestionCursor >= state.questions.length ? "awaiting_review" : "draft";

  return {
    ...state,
    analytics: buildBackgroundRefinementAnalyticsEvent({
      items: answers.map((answer) => ({ fieldKey: answer.fieldKey })),
      status: sessionStatus === "awaiting_review" ? "completed" : "active",
    }),
    answers,
    proposedDeltaKeys,
    questionCursor: nextQuestionCursor,
    sessionStatus,
    signalRecomputeRecommended: false,
  };
}

export function validateBackgroundWishInterviewApply({
  approvedDeltaKeys,
  state,
}: {
  approvedDeltaKeys?: string[];
  state: BackgroundWishInterviewSessionState;
}): BackgroundWishInterviewApplyValidation {
  const rawKeys = cleanList(approvedDeltaKeys ?? []);
  const rejectedDeltaKeys = rawKeys.filter((key) =>
    BACKGROUND_WISH_INTERVIEW_FORBIDDEN_DELTA_KEYS.includes(
      key as (typeof BACKGROUND_WISH_INTERVIEW_FORBIDDEN_DELTA_KEYS)[number],
    ),
  );
  const normalizedKeys = normalizeBackgroundSourcePermissionFields(rawKeys);
  const answeredKeys = new Set(state.answers.map((answer) => answer.fieldKey));
  const unreviewedKeys = normalizedKeys.filter((key) => !answeredKeys.has(key));
  const errors: string[] = [];

  if (rejectedDeltaKeys.length) {
    errors.push(
      `Disallowed interview delta keys cannot be applied: ${rejectedDeltaKeys.join(", ")}.`,
    );
  }

  if (unreviewedKeys.length) {
    errors.push(`Approved delta keys must first be answered in this session: ${unreviewedKeys.join(", ")}.`);
  }

  if (!normalizedKeys.length) {
    errors.push("At least one answered, allowed delta key is required.");
  }

  return {
    approvedDeltaKeys: normalizedKeys.filter((key) => answeredKeys.has(key)),
    errors,
    rejectedDeltaKeys,
  };
}

export function getBackgroundWishInterviewSignalExpiresAt(now = new Date()) {
  return getBackgroundSourcePermissionExpiry({
    now,
    retentionDays: BACKGROUND_WISH_INTERVIEW_SIGNAL_RETENTION_DAYS,
  });
}

export function buildBackgroundWishInterviewSignalRows({
  approvedDeltaKeys,
  expiresAt,
  profileId,
  state,
}: {
  approvedDeltaKeys: BackgroundSourcePermissionField[];
  expiresAt?: string | null;
  profileId: string;
  state: BackgroundWishInterviewSessionState;
}): BackgroundProfileSignalInsert[] {
  const approved = new Set(approvedDeltaKeys);
  const rows: BackgroundProfileSignalInsert[] = [];

  for (const answer of state.answers) {
    if (!approved.has(answer.fieldKey)) {
      continue;
    }

    const values = answer.selectedOptions.length
      ? answer.selectedOptions
      : answer.answerLengthBucket === "empty"
        ? []
        : [`reviewed_${answer.fieldKey}_provided`];

    for (const value of values) {
      rows.push({
        allowed_field_key: answer.fieldKey,
        confidence_band: "medium",
        expires_at: expiresAt ?? null,
        profile_id: profileId,
        sensitivity: answer.selectedOptions.length ? "broad" : "specific",
        signal_key: answer.fieldKey,
        signal_value: value,
        source: "interview",
        source_connection_id: null,
        source_summary_id: null,
        status: "active",
      });
    }
  }

  const seen = new Set<string>();

  return rows.filter((row) => {
    const key = `${row.allowed_field_key}:${row.signal_value}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function markBackgroundWishInterviewApplied({
  approvedDeltaKeys,
  profileSignalsCreated,
  state,
}: {
  approvedDeltaKeys: BackgroundSourcePermissionField[];
  profileSignalsCreated: number;
  state: BackgroundWishInterviewSessionState;
}): BackgroundWishInterviewSessionState {
  const approved = new Set(approvedDeltaKeys);

  return {
    ...state,
    analytics: buildBackgroundRefinementAnalyticsEvent({
      items: state.answers
        .filter((answer) => approved.has(answer.fieldKey))
        .map((answer) => ({ fieldKey: answer.fieldKey })),
      status: "completed",
    }),
    answers: state.answers.map((answer) =>
      approved.has(answer.fieldKey) ? { ...answer, deltaStatus: "applied" } : answer,
    ),
    profileMutationApplied: false,
    proposedDeltaKeys: approvedDeltaKeys,
    sessionStatus: "applied",
    signalRecomputeRecommended: profileSignalsCreated > 0,
  };
}
