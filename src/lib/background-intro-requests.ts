import {
  BACKGROUND_RECOMMENDED_ACCESS_TOKEN_MAX_AGE_SECONDS,
  type BackgroundAccountSecuritySummary,
} from "@/lib/background-account-security";

export const BACKGROUND_INTRO_REQUEST_WORKFLOW_VERSION =
  "background-intro-requests-v1";

export const BACKGROUND_INTRO_REQUEST_WINDOW_DAYS = 7;
export const BACKGROUND_INTRO_REQUEST_SIMILAR_WEEKLY_LIMIT = 3;
export const BACKGROUND_INTRO_REQUEST_OPEN_LIMIT = 2;

export const BACKGROUND_INTRO_REQUEST_APPEAL_STATUSES = [
  "none",
  "requested",
  "under_review",
  "resolved",
  "dismissed",
] as const;

export const BACKGROUND_INTRO_REQUEST_CONTACT_APPROVAL_STATUSES = [
  "not_requested",
  "requester_approved",
  "counterparty_approved",
  "mutual_approved",
  "withdrawn",
] as const;

export type BackgroundIntroRequestAppealStatus =
  (typeof BACKGROUND_INTRO_REQUEST_APPEAL_STATUSES)[number];

export type BackgroundIntroRequestContactApprovalStatus =
  (typeof BACKGROUND_INTRO_REQUEST_CONTACT_APPROVAL_STATUSES)[number];

export type BackgroundIntroRequestReviewState =
  | "draft"
  | "requested"
  | "under_review"
  | "approved"
  | "changes_requested"
  | "declined"
  | "sent";

export interface BackgroundIntroRequestCadenceRow {
  created_at: string;
  review_state: BackgroundIntroRequestReviewState | string;
}

export interface BackgroundIntroRequestCadenceDecision {
  allowed: boolean;
  blockers: string[];
  openRequestCount: number;
  recentRequestCount: number;
  riskLevel: "none" | "low" | "medium";
}

export function getBackgroundIntroRequestWindowStart(now = new Date()) {
  return new Date(now.getTime() - BACKGROUND_INTRO_REQUEST_WINDOW_DAYS * 24 * 60 * 60 * 1000)
    .toISOString();
}

export function compactBackgroundIntroText(value: string, maxLength = 1000) {
  const compact = value.replace(/\s+/g, " ").trim();

  return compact.length <= maxLength ? compact : `${compact.slice(0, maxLength - 1).trim()}...`;
}

export function normalizeBackgroundIntroAppealStatus(
  value: string | null | undefined,
): BackgroundIntroRequestAppealStatus {
  return (BACKGROUND_INTRO_REQUEST_APPEAL_STATUSES as readonly string[]).includes(value ?? "")
    ? (value as BackgroundIntroRequestAppealStatus)
    : "none";
}

export function normalizeBackgroundIntroContactApprovalStatus(
  value: string | null | undefined,
): BackgroundIntroRequestContactApprovalStatus {
  return (BACKGROUND_INTRO_REQUEST_CONTACT_APPROVAL_STATUSES as readonly string[]).includes(
    value ?? "",
  )
    ? (value as BackgroundIntroRequestContactApprovalStatus)
    : "not_requested";
}

export function evaluateBackgroundIntroRequestCadence({
  recentRequests,
}: {
  recentRequests: BackgroundIntroRequestCadenceRow[];
}): BackgroundIntroRequestCadenceDecision {
  const openRequests = recentRequests.filter((request) =>
    ["requested", "under_review", "approved"].includes(request.review_state),
  );
  const blockers: string[] = [];

  if (openRequests.length >= BACKGROUND_INTRO_REQUEST_OPEN_LIMIT) {
    blockers.push("Too many unresolved intro requests are already open for this profile.");
  }

  if (recentRequests.length >= BACKGROUND_INTRO_REQUEST_SIMILAR_WEEKLY_LIMIT) {
    blockers.push("Too many intro requests were sent to this profile this week.");
  }

  const pressureScore =
    (openRequests.length >= BACKGROUND_INTRO_REQUEST_OPEN_LIMIT - 1 ? 1 : 0) +
    (recentRequests.length >= BACKGROUND_INTRO_REQUEST_SIMILAR_WEEKLY_LIMIT - 1 ? 1 : 0);

  return {
    allowed: blockers.length === 0,
    blockers,
    openRequestCount: openRequests.length,
    recentRequestCount: recentRequests.length,
    riskLevel: blockers.length ? "medium" : pressureScore > 0 ? "low" : "none",
  };
}

export function validateBackgroundIntroAppealRequest({
  appealStatus,
  reason,
  reviewState,
}: {
  appealStatus?: string | null;
  reason: string;
  reviewState?: string | null;
}) {
  const errors: string[] = [];
  const normalizedAppealStatus = normalizeBackgroundIntroAppealStatus(appealStatus);
  const normalizedReason = compactBackgroundIntroText(reason, 1000);

  if (!["changes_requested", "declined"].includes(reviewState ?? "")) {
    errors.push("Intro request appeals are available after reviewer changes or decline.");
  }

  if (["requested", "under_review"].includes(normalizedAppealStatus)) {
    errors.push("This intro request already has an appeal under review.");
  }

  if (normalizedReason.length < 12) {
    errors.push("Add a brief reason explaining what should be reviewed.");
  }

  return {
    errors,
    reason: normalizedReason,
  };
}

export function isBackgroundIntroContactApprovalAllowed(reviewState?: string | null) {
  return reviewState === "approved" || reviewState === "sent";
}

export function summarizeBackgroundIntroContactApprovalStatus({
  counterpartyApprovedAt,
  requesterApprovedAt,
}: {
  counterpartyApprovedAt?: string | null;
  requesterApprovedAt?: string | null;
}): BackgroundIntroRequestContactApprovalStatus {
  if (requesterApprovedAt && counterpartyApprovedAt) {
    return "mutual_approved";
  }

  if (requesterApprovedAt) {
    return "requester_approved";
  }

  if (counterpartyApprovedAt) {
    return "counterparty_approved";
  }

  return "not_requested";
}

export function validateBackgroundContactApprovalStepUp(
  summary: BackgroundAccountSecuritySummary,
) {
  const errors: string[] = [];
  const age = summary.session.accessTokenAgeSeconds;

  if (summary.currentLevel !== "aal2") {
    errors.push("Contact approval requires an active authenticator MFA step-up.");
  }

  if (age === null || age > BACKGROUND_RECOMMENDED_ACCESS_TOKEN_MAX_AGE_SECONDS) {
    errors.push("Contact approval requires a fresh one-hour session token window.");
  }

  return {
    errors,
  };
}
