import {
  buildMatchExplanation,
  type MatchExplanationInput,
} from "@/lib/background-explanations";
import {
  BACKGROUND_SOURCE_RETENTION_DAY_OPTIONS,
  normalizeBackgroundSourcePermissionFields,
} from "@/lib/background-source-permissions";
import { normalizeDisclosureFieldKeys } from "@/lib/background-disclosure";
import type { Database } from "@/lib/supabase/database.types";

type OpportunityBriefInsert =
  Database["public"]["Tables"]["background_opportunity_briefs"]["Insert"];
type IntroPacketInsert =
  Database["public"]["Tables"]["background_intro_packets"]["Insert"];
type SourceSummaryInsert =
  Database["public"]["Tables"]["background_source_summaries"]["Insert"];
type GrantReceiptInsert =
  Database["public"]["Tables"]["background_grant_receipts"]["Insert"];
type ProfileInterviewAnswerInsert =
  Database["public"]["Tables"]["background_profile_interview_answers"]["Insert"];

export const BACKGROUND_OPPORTUNITY_BRIEF_VERSION = "background-opportunity-brief-v1";

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

const MAX_TEXT_LENGTH = 900;
const SOURCE_RETENTION_DAY_SET = new Set<number>(BACKGROUND_SOURCE_RETENTION_DAY_OPTIONS);

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
  title = "Opportunity brief",
  ...input
}: MatchExplanationInput & {
  candidateProfileId?: string | null;
  expiresAt?: string;
  hasOpenClarification?: boolean;
  matchId: string;
  profileId: string;
  title?: string;
}): OpportunityBriefInsert {
  const explanation = buildMatchExplanation(input);
  const nextStepType = normalizeOpportunityBriefNextStep({
    hasOpenClarification,
    viewerConsented: input.viewerConsented,
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
    profile_id: profileId,
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

export function serializeOpportunityBriefCard(row: {
  confidence_band: string;
  delivery_state?: string | null;
  factor_codes: string[];
  hidden_fields_notice: string;
  human_review_required?: boolean | null;
  id: string;
  next_step_type: string;
  profile_id: string;
  redacted_fields?: string[] | null;
  reveal_consequence_notice: string;
  review_status?: string | null;
  safe_summary?: string | null;
  shared_counts?: Record<string, unknown> | null;
  status: string;
  title: string;
  why_text: string;
}) {
  return {
    actions: [...BACKGROUND_OPPORTUNITY_BRIEF_ACTIONS],
    confidenceBand: row.confidence_band,
    deliveryState: normalizeOpportunityBriefDeliveryState(row.delivery_state ?? row.status),
    factorCodes: uniqueStrings(row.factor_codes),
    hiddenFieldsNotice: row.hidden_fields_notice || BACKGROUND_BRIEF_HIDDEN_FIELDS_NOTICE,
    humanReviewRequired: row.human_review_required ?? true,
    id: row.id,
    nextStep: formatOpportunityBriefNextStep(row.next_step_type),
    profileId: row.profile_id,
    redactedFields: uniqueStrings(row.redacted_fields ?? []),
    redactionNotice: row.hidden_fields_notice || BACKGROUND_BRIEF_HIDDEN_FIELDS_NOTICE,
    revealConsequenceNotice: row.reveal_consequence_notice || BACKGROUND_BRIEF_REVEAL_NOTICE,
    reviewStatus: row.review_status ?? "human_review_required",
    safeSummary: compactText(row.safe_summary ?? row.why_text, 500),
    sharedCounts: row.shared_counts ?? {},
    status: row.status,
    title: compactText(row.title, 140),
    why: compactText(row.why_text, 700),
  };
}

export function validateIntroPacketInput({
  purpose,
  requestedFieldKeys,
}: {
  purpose: string;
  requestedFieldKeys: string[];
}) {
  const errors: string[] = [];
  const fields = normalizeDisclosureFieldKeys(uniqueStrings(requestedFieldKeys)).slice(0, 8);

  if (purpose.trim().length < 12) {
    errors.push("Add a concrete purpose for the reviewed introduction packet.");
  }

  if (!fields.length) {
    errors.push("Choose at least one field the reviewer should consider.");
  }

  return { errors, requestedFieldKeys: fields };
}

export function buildIntroPacketRow({
  counterpartyProfileId,
  matchId,
  opportunityBriefId,
  purpose,
  requestedFieldKeys,
  requesterAnswers,
  requesterProfileId,
}: {
  counterpartyProfileId?: string | null;
  matchId?: string | null;
  opportunityBriefId?: string | null;
  purpose: string;
  requestedFieldKeys: string[];
  requesterAnswers?: Record<string, unknown>;
  requesterProfileId: string;
}): IntroPacketInsert {
  const validation = validateIntroPacketInput({ purpose, requestedFieldKeys });

  if (validation.errors.length) {
    throw new Error(validation.errors.join(" "));
  }

  return {
    counterparty_profile_id: counterpartyProfileId ?? null,
    match_id: matchId ?? null,
    mutual_questions: [...BACKGROUND_INTRO_PACKET_DEFAULT_QUESTIONS],
    opportunity_brief_id: opportunityBriefId ?? null,
    purpose: compactText(purpose, 700),
    requested_field_keys: validation.requestedFieldKeys,
    requester_answers: requesterAnswers ?? {},
    requester_profile_id: requesterProfileId,
    reveal_capsule:
      "Reviewer should prepare only field-bound details after both sides consent; no contact details are sent automatically.",
    review_state: "requested",
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
