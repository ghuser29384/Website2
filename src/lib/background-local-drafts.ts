export const BACKGROUND_LOCAL_DRAFT_MAX_BODY_CHARACTERS = 2000;

export const BACKGROUND_LOCAL_DRAFT_SYNC_STATUSES = [
  "draft",
  "queued",
  "syncing",
  "synced",
  "failed",
] as const;

export type BackgroundLocalDraftSyncStatus =
  (typeof BACKGROUND_LOCAL_DRAFT_SYNC_STATUSES)[number];

export interface BackgroundLocalDraftSyncResult {
  draftId: string;
  message: string;
  ok: boolean;
  syncedAt?: string;
}

export function normalizeBackgroundLocalDraftBody(value: string) {
  return value.trim().slice(0, BACKGROUND_LOCAL_DRAFT_MAX_BODY_CHARACTERS);
}

export function canSyncBackgroundLocalDraft(status: string) {
  return status === "draft" || status === "queued" || status === "failed";
}

export function formatBackgroundLocalDraftSyncStatus(status: string) {
  switch (status) {
    case "queued":
      return "Queued for sync";
    case "syncing":
      return "Syncing";
    case "synced":
      return "Synced";
    case "failed":
      return "Retry needed";
    case "draft":
    default:
      return "Local only";
  }
}
