export const FALLBACK_LIVESTREAM_EVIDENCE_TITLE = "Fallback livestream evidence";
export const FALLBACK_LIVESTREAM_OBSERVATION_LABEL = "Observed if no trade clears";
export const FALLBACK_LIVESTREAM_BRANCH_LABEL = "No-trade branch evidence";

export const FALLBACK_LIVESTREAM_STREAM_PROVIDERS = [
  "external_url",
  "youtube",
  "twitch",
  "zoom",
  "other",
] as const;

export const FALLBACK_LIVESTREAM_VISIBILITIES = [
  "private_review",
  "participants",
  "public_link",
] as const;

export const FALLBACK_LIVESTREAM_STATUSES = [
  "draft",
  "scheduled",
  "armed",
  "cancelled_trade_cleared",
  "due",
  "live_window",
  "recording_due",
  "submitted",
  "reviewed_observed",
  "reviewed_unclear",
  "missed",
  "cancelled",
] as const;

export const FALLBACK_LIVESTREAM_REVIEW_DECISIONS = [
  "observed",
  "unclear",
  "missed",
] as const;

export const FALLBACK_LIVESTREAM_FORBIDDEN_COPY = [
  "Counterfactual verified",
  "Natural baseline proven",
  "Verified intent",
  "Guaranteed counterfactual",
  "Counterfactual proof",
  "Public proof badge",
  "Success",
  "Hot",
  "Popular",
  "Best",
  "People like you",
] as const;

export type FallbackLivestreamStreamProvider =
  (typeof FALLBACK_LIVESTREAM_STREAM_PROVIDERS)[number];
export type FallbackLivestreamVisibility =
  (typeof FALLBACK_LIVESTREAM_VISIBILITIES)[number];
export type FallbackLivestreamEvidenceStatus =
  (typeof FALLBACK_LIVESTREAM_STATUSES)[number];
export type FallbackLivestreamReviewDecision =
  (typeof FALLBACK_LIVESTREAM_REVIEW_DECISIONS)[number];

export interface FallbackLivestreamEvidenceRouteLike {
  id: string;
  baseline_claim: string;
  fallback_action_statement: string;
  fallback_event_label: string;
  clearing_deadline_at: string | null;
  scheduled_start_at: string;
  scheduled_end_at: string;
  recording_due_at: string | null;
  stream_provider: string;
  stream_url: string;
  recording_url: string;
  challenge_code: string;
  challenge_issued_at: string;
  visibility: string;
  status: string;
  review_decision: string | null;
  reviewed_at: string | null;
  review_notes: string;
  submitted_at: string | null;
}

export interface FallbackLivestreamEvidenceDraftInput {
  enabled: boolean;
  baselineClaim: string;
  fallbackActionStatement: string;
  clearingDeadlineAt?: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  streamProvider: string;
  streamUrl?: string;
  recordingUrl?: string;
  visibility: string;
}

export interface FallbackLivestreamEvidenceDisplay {
  actionStatement: string;
  baselineClaim: string;
  branchLabel: string;
  canSubmitRecording: boolean;
  challengeCode: string;
  challengeInstruction: string;
  clearingDeadlineLabel: string;
  href: string;
  id: string;
  observationLabel: string;
  providerLabel: string;
  recordingDueLabel: string;
  recordingUrl: string | null;
  reviewSummary: string | null;
  scheduleLabel: string;
  status: FallbackLivestreamEvidenceStatus;
  statusLabel: string;
  streamUrl: string | null;
  submittedLabel: string | null;
  title: string;
  visibilityLabel: string;
}

const STATUS_LABELS = {
  armed: "Livestream scheduled",
  cancelled: "Cancelled",
  cancelled_trade_cleared: "Cancelled because trade cleared",
  draft: "Draft",
  due: "Fallback evidence due",
  live_window: "Live window",
  missed: "Missed",
  recording_due: "Recording due",
  reviewed_observed: "Observed no-trade branch reviewed",
  reviewed_unclear: "Evidence unclear",
  scheduled: "Livestream scheduled",
  submitted: "Evidence under review",
} as const satisfies Record<FallbackLivestreamEvidenceStatus, string>;

const STREAM_PROVIDER_LABELS = {
  external_url: "External stream URL",
  other: "Other external provider",
  twitch: "Twitch",
  youtube: "YouTube",
  zoom: "Zoom",
} as const satisfies Record<FallbackLivestreamStreamProvider, string>;

const VISIBILITY_LABELS = {
  participants: "Participants and reviewer",
  private_review: "Private reviewer access",
  public_link: "Public-link summary pending reviewer controls",
} as const satisfies Record<FallbackLivestreamVisibility, string>;

function isOneOf<const Values extends readonly string[]>(values: Values, value: string): value is Values[number] {
  return values.includes(value);
}

export function normalizeFallbackLivestreamStatus(value: string): FallbackLivestreamEvidenceStatus {
  return isOneOf(FALLBACK_LIVESTREAM_STATUSES, value) ? value : "draft";
}

export function normalizeFallbackLivestreamStreamProvider(value: string): FallbackLivestreamStreamProvider {
  return isOneOf(FALLBACK_LIVESTREAM_STREAM_PROVIDERS, value) ? value : "external_url";
}

export function normalizeFallbackLivestreamVisibility(value: string): FallbackLivestreamVisibility {
  return isOneOf(FALLBACK_LIVESTREAM_VISIBILITIES, value) ? value : "private_review";
}

export function normalizeFallbackLivestreamReviewDecision(
  value: string,
): FallbackLivestreamReviewDecision | null {
  return isOneOf(FALLBACK_LIVESTREAM_REVIEW_DECISIONS, value) ? value : null;
}

export function fallbackLivestreamStatusLabel(value: string) {
  return STATUS_LABELS[normalizeFallbackLivestreamStatus(value)];
}

export function fallbackLivestreamProviderLabel(value: string) {
  return STREAM_PROVIDER_LABELS[normalizeFallbackLivestreamStreamProvider(value)];
}

export function fallbackLivestreamVisibilityLabel(value: string) {
  return VISIBILITY_LABELS[normalizeFallbackLivestreamVisibility(value)];
}

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : new Date(timestamp);
}

function formatDateTime(value: string | null | undefined) {
  const parsed = parseDate(value);
  if (!parsed) return "Not set";

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function isHttpUrl(value: string | null | undefined) {
  if (!value) return true;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateFallbackLivestreamEvidenceDraft(
  input: FallbackLivestreamEvidenceDraftInput,
) {
  if (!input.enabled) {
    return [];
  }

  const errors: string[] = [];
  const baselineClaim = input.baselineClaim.trim();
  const fallbackActionStatement = input.fallbackActionStatement.trim();
  const scheduledStart = parseDate(input.scheduledStartAt);
  const scheduledEnd = parseDate(input.scheduledEndAt);
  const clearingDeadline = parseDate(input.clearingDeadlineAt);

  if (baselineClaim.length < 12) {
    errors.push("Describe the no-trade branch claim being observed.");
  }

  if (fallbackActionStatement.length < 12) {
    errors.push("Describe what the participant will stream or record if no trade clears.");
  }

  if (!scheduledStart || !scheduledEnd) {
    errors.push("Set a scheduled livestream start and end time.");
  } else if (scheduledStart >= scheduledEnd) {
    errors.push("The livestream end time must be after the start time.");
  }

  if (clearingDeadline && scheduledStart && clearingDeadline > scheduledStart) {
    errors.push("The trade-clearance deadline must be before the fallback livestream window.");
  }

  if (!isOneOf(FALLBACK_LIVESTREAM_STREAM_PROVIDERS, input.streamProvider)) {
    errors.push("Choose a supported external stream provider.");
  }

  if (!isOneOf(FALLBACK_LIVESTREAM_VISIBILITIES, input.visibility)) {
    errors.push("Choose who can see the fallback livestream evidence route.");
  }

  if (!isHttpUrl(input.streamUrl)) {
    errors.push("Use an http or https stream URL.");
  }

  if (!isHttpUrl(input.recordingUrl)) {
    errors.push("Use an http or https recording URL.");
  }

  return errors;
}

export function deriveFallbackLivestreamEvidenceStatus(
  route: FallbackLivestreamEvidenceRouteLike,
  now: Date = new Date(),
): FallbackLivestreamEvidenceStatus {
  const storedStatus = normalizeFallbackLivestreamStatus(route.status);

  if (
    storedStatus === "cancelled_trade_cleared" ||
    storedStatus === "cancelled" ||
    storedStatus === "submitted" ||
    storedStatus === "reviewed_observed" ||
    storedStatus === "reviewed_unclear" ||
    storedStatus === "missed"
  ) {
    return storedStatus;
  }

  if (route.recording_url.trim()) {
    return "submitted";
  }

  const start = parseDate(route.scheduled_start_at);
  const end = parseDate(route.scheduled_end_at);
  const recordingDueAt = parseDate(route.recording_due_at) ?? end;
  const clearingDeadline = parseDate(route.clearing_deadline_at);

  if (start && end && now >= start && now <= end) {
    return "live_window";
  }

  if (recordingDueAt && now >= recordingDueAt) {
    return "recording_due";
  }

  if (clearingDeadline && now >= clearingDeadline) {
    return "due";
  }

  return storedStatus === "draft" ? "draft" : "scheduled";
}

export function fallbackLivestreamReviewStatus(
  decision: FallbackLivestreamReviewDecision,
): FallbackLivestreamEvidenceStatus {
  if (decision === "observed") return "reviewed_observed";
  if (decision === "unclear") return "reviewed_unclear";
  return "missed";
}

export function buildFallbackLivestreamEvidenceDisplay(
  route: FallbackLivestreamEvidenceRouteLike,
  now: Date = new Date(),
): FallbackLivestreamEvidenceDisplay {
  const status = deriveFallbackLivestreamEvidenceStatus(route, now);
  const reviewSummary =
    route.review_decision && route.reviewed_at
      ? `${fallbackLivestreamStatusLabel(status)} ${formatDateTime(route.reviewed_at)}`
      : null;
  const submittedLabel = route.submitted_at
    ? `Recording submitted ${formatDateTime(route.submitted_at)}`
    : null;

  return {
    actionStatement: route.fallback_action_statement,
    baselineClaim: route.baseline_claim,
    branchLabel: route.fallback_event_label || FALLBACK_LIVESTREAM_BRANCH_LABEL,
    canSubmitRecording: status === "due" || status === "live_window" || status === "recording_due",
    challengeCode: route.challenge_code,
    challengeInstruction:
      "Show or say this challenge code during the stream or recording so reviewers can connect the artifact to this route.",
    clearingDeadlineLabel: formatDateTime(route.clearing_deadline_at),
    href: `/evidence/fallback-livestream/${route.id}`,
    id: route.id,
    observationLabel: FALLBACK_LIVESTREAM_OBSERVATION_LABEL,
    providerLabel: fallbackLivestreamProviderLabel(route.stream_provider),
    recordingDueLabel: formatDateTime(route.recording_due_at ?? route.scheduled_end_at),
    recordingUrl: route.recording_url.trim() || null,
    reviewSummary,
    scheduleLabel: `${formatDateTime(route.scheduled_start_at)} - ${formatDateTime(route.scheduled_end_at)}`,
    status,
    statusLabel: fallbackLivestreamStatusLabel(status),
    streamUrl: route.stream_url.trim() || null,
    submittedLabel,
    title: FALLBACK_LIVESTREAM_EVIDENCE_TITLE,
    visibilityLabel: fallbackLivestreamVisibilityLabel(route.visibility),
  };
}

function randomBytes(length: number) {
  const bytes = new Uint8Array(length);

  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
    return bytes;
  }

  for (let index = 0; index < length; index += 1) {
    bytes[index] = Math.floor(Math.random() * 256);
  }

  return bytes;
}

export function createFallbackLivestreamChallengeCode(bytes: Uint8Array = randomBytes(8)) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const chars = Array.from(bytes.slice(0, 8), (byte) => alphabet[byte % alphabet.length]);

  return `MT-FLE-${chars.slice(0, 4).join("")}-${chars.slice(4, 8).join("")}`;
}

export function assertNoForbiddenFallbackLivestreamCopy(strings: readonly string[]) {
  const haystack = strings.join("\n").toLowerCase();
  const match = FALLBACK_LIVESTREAM_FORBIDDEN_COPY.find((term) =>
    haystack.includes(term.toLowerCase()),
  );

  if (match) {
    throw new Error(`Fallback livestream copy contains a forbidden phrase: ${match}`);
  }
}
