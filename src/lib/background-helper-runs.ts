import { createHash } from "node:crypto";

import { BACKGROUND_OPPORTUNITY_NOTIFICATION } from "@/lib/background-notification-policy";
import type { Database } from "@/lib/supabase/database.types";

export const BACKGROUND_HELPER_RUN_VERSION = "background-helper-run-v1";
export const BACKGROUND_HELPER_NOTIFICATION_VERSION =
  "background-helper-notification-copy-v1";

export const BACKGROUND_HELPER_RUN_TRIGGER_KINDS = [
  "saved_search",
  "new_summary",
  "manual_scan",
  "scheduled_digest",
] as const;

export type BackgroundHelperRunTriggerKind =
  (typeof BACKGROUND_HELPER_RUN_TRIGGER_KINDS)[number];

type BackgroundHelperRunInsert =
  Database["public"]["Tables"]["background_helper_runs"]["Insert"];
type BackgroundSourceSyncJobInsert =
  Database["public"]["Tables"]["background_source_sync_jobs"]["Insert"];

const TRIGGER_KIND_SET = new Set<string>(BACKGROUND_HELPER_RUN_TRIGGER_KINDS);

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }

  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
    .join(",")}}`;
}

export function normalizeBackgroundHelperRunTriggerKind(
  value?: string | null,
): BackgroundHelperRunTriggerKind | null {
  return value && TRIGGER_KIND_SET.has(value) ? (value as BackgroundHelperRunTriggerKind) : null;
}

export function buildBackgroundHelperRunFingerprint({
  profileId,
  query,
  triggerKind,
  windowKey,
}: {
  profileId: string;
  query?: unknown;
  triggerKind: BackgroundHelperRunTriggerKind;
  windowKey?: string;
}) {
  return createHash("sha256")
    .update(
      stableJson({
        profileId,
        query: query ?? {},
        triggerKind,
        windowKey: windowKey ?? "current",
        version: BACKGROUND_HELPER_RUN_VERSION,
      }),
    )
    .digest("hex");
}

export function nextBackgroundHelperRunDelaySeconds({
  attempts,
  random = Math.random,
}: {
  attempts: number;
  random?: () => number;
}) {
  const safeAttempts = Number.isFinite(attempts) && attempts > 0 ? Math.floor(attempts) : 0;
  const capped = Math.min(3_600, 15 * 2 ** safeAttempts);

  return Math.max(1, Math.floor(random() * capped));
}

export function getBackgroundHelperRunNextRunAt({
  attempts,
  now = new Date(),
  random,
}: {
  attempts: number;
  now?: Date;
  random?: () => number;
}) {
  return new Date(
    now.getTime() +
      nextBackgroundHelperRunDelaySeconds({
        attempts,
        random,
      }) *
        1_000,
  ).toISOString();
}

export function buildBackgroundHelperRunRow({
  profileId,
  query,
  triggerKind,
  windowKey,
}: {
  profileId: string;
  query?: unknown;
  triggerKind: BackgroundHelperRunTriggerKind;
  windowKey?: string;
}): BackgroundHelperRunInsert {
  return {
    profile_id: profileId,
    query_fingerprint: buildBackgroundHelperRunFingerprint({
      profileId,
      query,
      triggerKind,
      windowKey,
    }),
    state: "queued",
    trigger_kind: triggerKind,
  };
}

export function buildBackgroundSourceSyncJobRow({
  profileId,
  sourceConnectionId,
}: {
  profileId: string;
  sourceConnectionId: string;
}): BackgroundSourceSyncJobInsert {
  return {
    profile_id: profileId,
    source_connection_id: sourceConnectionId,
    state: "queued",
  };
}

export function buildBackgroundOpportunityNotificationCopy() {
  return {
    body: BACKGROUND_OPPORTUNITY_NOTIFICATION.body,
    notificationVersion: BACKGROUND_HELPER_NOTIFICATION_VERSION,
    subject: "Moral Trade: background opportunity ready",
    title: BACKGROUND_OPPORTUNITY_NOTIFICATION.title,
  };
}

export function assertBackgroundNotificationCopyIsSafe(copy: {
  body: string;
  subject: string;
  title: string;
}) {
  const rendered = `${copy.subject}\n${copy.title}\n${copy.body}`;
  const forbidden = [
    /exact private wish/i,
    /private ask:\s*\S/i,
    /source note:\s*\S/i,
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
    /\+?\d[\d\s().-]{7,}\d/,
  ];

  return forbidden.every((pattern) => !pattern.test(rendered));
}
