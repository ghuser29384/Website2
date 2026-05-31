export const BACKGROUND_CONCIERGE_APPEAL_STATUSES = [
  "none",
  "requested",
  "under_review",
  "resolved",
  "dismissed",
] as const;

export const BACKGROUND_CONCIERGE_APPEALABLE_REQUEST_STATUSES = ["declined", "closed"] as const;
export const BACKGROUND_CONCIERGE_OPEN_APPEAL_STATUSES = ["requested", "under_review"] as const;

export type BackgroundConciergeAppealStatus =
  (typeof BACKGROUND_CONCIERGE_APPEAL_STATUSES)[number];

export interface BackgroundConciergeAppealValidationInput {
  appealStatus?: string | null;
  reason?: string;
  requestStatus?: string | null;
}

export function normalizeBackgroundConciergeAppealStatus(
  value: string | null | undefined,
): BackgroundConciergeAppealStatus {
  return (BACKGROUND_CONCIERGE_APPEAL_STATUSES as readonly string[]).includes(value ?? "")
    ? (value as BackgroundConciergeAppealStatus)
    : "none";
}

export function isBackgroundConciergeAppealOpen(value: string | null | undefined) {
  return (BACKGROUND_CONCIERGE_OPEN_APPEAL_STATUSES as readonly string[]).includes(value ?? "");
}

export function isBackgroundConciergeRequestAppealable(value: string | null | undefined) {
  return (BACKGROUND_CONCIERGE_APPEALABLE_REQUEST_STATUSES as readonly string[]).includes(
    value ?? "",
  );
}

export function validateBackgroundConciergeAppealRequest({
  appealStatus,
  reason = "",
  requestStatus,
}: BackgroundConciergeAppealValidationInput) {
  const errors: string[] = [];
  const normalizedAppealStatus = normalizeBackgroundConciergeAppealStatus(appealStatus);
  const normalizedReason = reason.trim().slice(0, 1000);

  if (!isBackgroundConciergeRequestAppealable(requestStatus)) {
    errors.push("Appeals are available after a concierge request is declined or closed.");
  }

  if (isBackgroundConciergeAppealOpen(normalizedAppealStatus)) {
    errors.push("This concierge request already has an appeal under review.");
  }

  if (normalizedReason.length < 12) {
    errors.push("Add a brief reason explaining what should be reviewed.");
  }

  return {
    errors,
    reason: normalizedReason,
  };
}
