import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import {
  BACKGROUND_QUERY_DAILY_LIMITS,
  decideBackgroundQueryBudget,
  getBackgroundQueryCost,
  getBackgroundQueryWindowStart,
  type BackgroundQueryScope,
} from "@/lib/background-query-budget";
import type { MatchExplanationSnapshotPayload } from "@/lib/background-explanations";
import type { Database } from "@/lib/supabase/database.types";

type SupabaseDatabaseClient = SupabaseClient<Database>;
type BackgroundQueryEventRow = Database["public"]["Tables"]["background_query_events"]["Row"];
type BackgroundQueryEventInsert = Database["public"]["Tables"]["background_query_events"]["Insert"];
type MatchExplanationSnapshotInsert =
  Database["public"]["Tables"]["match_explanation_snapshots"]["Insert"];
type BackgroundOpportunityBriefInsert =
  Database["public"]["Tables"]["background_opportunity_briefs"]["Insert"];
type RiskSignalInsert = Database["public"]["Tables"]["risk_signals"]["Insert"];

type BackgroundSafeLogValue = boolean | number | string | string[] | null;

export const MATCH_EXPLANATION_SNAPSHOT_DEDUPE_COLUMNS = [
  "match_id",
  "profile_id",
  "explanation_version",
  "workflow_stage",
  "confidence_band",
  "score_bucket",
  "source_run_kind",
  "source_run_id",
].join(",");

const BACKGROUND_LOG_METADATA_ALLOWED_KEYS = new Set<string>([
  "anomalyLevel",
  "anomalyScore",
  "cadence",
  "candidateBucket",
  "candidateCount",
  "confidenceScore",
  "delegateMode",
  "delegateId",
  "floorApplied",
  "hasProfile",
  "hasSynthesis",
  "limit",
  "matchesCreated",
  "matchesRefreshed",
  "missingFieldCount",
  "planId",
  "pendingRequestCount",
  "recentSimilarCount",
  "recentRequestCount",
  "remaining",
  "requestId",
  "requestedFieldCount",
  "requestedStage",
  "resultBucket",
  "resultCount",
  "route",
  "runReason",
  "scope",
  "searchId",
  "searchScope",
  "severity",
  "specificity",
  "strategyId",
  "strategyKind",
  "synthesisVersion",
  "sourceCount",
  "similarPendingCount",
  "similarRequestCount",
  "used",
  "wasLimited",
] as const);

const BACKGROUND_LOG_METADATA_SENSITIVE_KEY_PATTERN =
  /(wish|ask|constraint|contact|email|phone|address|private|raw|message|note|missingFields|confidenceBreakdown|sourceNote|sourceText|evidence|receipt|counterparty|prompt|query|searchText|summaryText|body|text)/i;
const BACKGROUND_LOG_METADATA_SENSITIVE_VALUE_PATTERN =
  /\b(exact\s+private\s+wish|private\s+wish|source\s+note|raw\s+note|contact\s+details|sensitive\s+constraint|private\s+feed|counterparty)\b/i;

function sanitizeBackgroundMetadataKey(key: string) {
  return key.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 64);
}

function sanitizeBackgroundRoute(value: string) {
  try {
    const url = new URL(value, "https://www.moraltrade.org");
    return url.pathname.slice(0, 120);
  } catch {
    return value.split(/[?#]/)[0]?.slice(0, 120) || "/";
  }
}

function isSensitiveBackgroundLogValue(value: string) {
  return (
    BACKGROUND_LOG_METADATA_SENSITIVE_VALUE_PATTERN.test(value) ||
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(value) ||
    /\+?\d[\d\s().-]{7,}\d/.test(value) ||
    /https?:\/\/\S+/i.test(value)
  );
}

function cleanBackgroundLogScalar(
  key: string,
  value: unknown,
): { rejected: boolean; value: BackgroundSafeLogValue | undefined } {
  if (value === null || typeof value === "boolean") {
    return { rejected: false, value };
  }

  if (typeof value === "number") {
    return { rejected: !Number.isFinite(value), value: Number.isFinite(value) ? value : undefined };
  }

  if (typeof value !== "string") {
    return { rejected: true, value: undefined };
  }

  const compact = value.replace(/\s+/g, " ").trim();

  if (key === "route") {
    return { rejected: false, value: sanitizeBackgroundRoute(compact) };
  }

  if (isSensitiveBackgroundLogValue(compact)) {
    return { rejected: true, value: undefined };
  }

  return { rejected: false, value: compact.slice(0, 120) };
}

export function sanitizeBackgroundLogMetadata(metadata: Record<string, unknown>) {
  const safeMetadata: Record<string, BackgroundSafeLogValue> = {};
  const omittedKeys: string[] = [];
  const rejectedPrivateKeys: string[] = [];

  for (const [rawKey, rawValue] of Object.entries(metadata)) {
    const key = sanitizeBackgroundMetadataKey(rawKey);

    if (!key) {
      continue;
    }

    if (!BACKGROUND_LOG_METADATA_ALLOWED_KEYS.has(key)) {
      if (
        BACKGROUND_LOG_METADATA_SENSITIVE_KEY_PATTERN.test(key) ||
        (typeof rawValue === "string" && isSensitiveBackgroundLogValue(rawValue))
      ) {
        rejectedPrivateKeys.push(key);
      } else {
        omittedKeys.push(key);
      }
      continue;
    }

    if (Array.isArray(rawValue)) {
      const cleaned = rawValue
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.replace(/\s+/g, " ").trim())
        .filter((entry) => entry && !isSensitiveBackgroundLogValue(entry))
        .filter((entry, index, entries) => entries.indexOf(entry) === index)
        .slice(0, 12);

      safeMetadata[key] = cleaned;
      continue;
    }

    const cleaned = cleanBackgroundLogScalar(key, rawValue);

    if (cleaned.rejected) {
      rejectedPrivateKeys.push(key);
    } else if (cleaned.value !== undefined) {
      safeMetadata[key] = cleaned.value;
    }
  }

  if (rejectedPrivateKeys.length) {
    safeMetadata.rawPayloadRejected = true;
    safeMetadata.rejectedPrivateMetadataKeys = [...new Set(rejectedPrivateKeys)].slice(0, 12);
  }

  if (omittedKeys.length) {
    safeMetadata.omittedMetadataKeys = [...new Set(omittedKeys)].slice(0, 12);
  }

  return safeMetadata;
}

export function sanitizeBackgroundRiskSignalSummary(summary: string) {
  if (isSensitiveBackgroundLogValue(summary)) {
    return "Background risk signal recorded with private details redacted before logging.";
  }

  return summary.replace(/\s+/g, " ").trim().slice(0, 240);
}

export function buildPrivacySafeRiskSignalInsert({
  metadata = {},
  summary = "Background risk signal recorded.",
  ...input
}: RiskSignalInsert): RiskSignalInsert {
  return {
    ...input,
    metadata: sanitizeBackgroundLogMetadata(metadata),
    summary: sanitizeBackgroundRiskSignalSummary(summary),
  };
}

export interface BackgroundBudgetReservation {
  error: PostgrestError | Error | null;
  eventId: string | null;
  limit: number;
  limited: boolean;
  remaining: number;
  used: number;
}

export async function reserveBackgroundQueryBudget({
  cost,
  metadata = {},
  profileId,
  queryFingerprint,
  scope,
  supabase,
}: {
  cost?: number;
  metadata?: Record<string, unknown>;
  profileId: string | null;
  queryFingerprint: string;
  scope: BackgroundQueryScope;
  supabase: SupabaseDatabaseClient;
}): Promise<BackgroundBudgetReservation> {
  const normalizedCost = cost ?? getBackgroundQueryCost(scope);
  const limit = BACKGROUND_QUERY_DAILY_LIMITS[scope];

  if (!profileId) {
    return {
      error: null,
      eventId: null,
      limit,
      limited: false,
      remaining: limit,
      used: 0,
    };
  }

  const { data, error } = await supabase
    .from("background_query_events")
    .select("cost, created_at, was_limited")
    .eq("profile_id", profileId)
    .eq("scope", scope)
    .gte("created_at", getBackgroundQueryWindowStart());

  if (error) {
    return {
      error,
      eventId: null,
      limit,
      limited: false,
      remaining: limit,
      used: 0,
    };
  }

  const decision = decideBackgroundQueryBudget({
    cost: normalizedCost,
    events: (data ?? []) as Pick<BackgroundQueryEventRow, "cost" | "created_at" | "was_limited">[],
    limit,
  });
  const insertPayload: BackgroundQueryEventInsert = {
    cost: decision.limited ? 0 : normalizedCost,
    daily_limit: limit,
    metadata: sanitizeBackgroundLogMetadata(metadata),
    profile_id: profileId,
    query_fingerprint: queryFingerprint,
    remaining_after: decision.remaining,
    scope,
    used_before: decision.used,
    was_limited: decision.limited,
  };
  const { data: inserted, error: insertError } = await supabase
    .from("background_query_events")
    .insert(insertPayload)
    .select("id")
    .maybeSingle();

  return {
    ...decision,
    error: insertError,
    eventId: inserted?.id ?? null,
  };
}

export async function completeBackgroundQueryEvent({
  candidateCount,
  eventId,
  metadata = {},
  resultCount,
  supabase,
}: {
  candidateCount: number;
  eventId: string | null;
  metadata?: Record<string, unknown>;
  resultCount: number;
  supabase: SupabaseDatabaseClient;
}) {
  if (!eventId) {
    return null;
  }

  const { error } = await supabase
    .from("background_query_events")
    .update({
      candidate_count: Math.max(0, candidateCount),
      metadata: sanitizeBackgroundLogMetadata(metadata),
      result_count: Math.max(0, resultCount),
    })
    .eq("id", eventId);

  return error;
}

export async function recordBackgroundQueryRiskSignal({
  eventId,
  metadata = {},
  profileId,
  severity = "medium",
  signalType,
  summary,
  supabase,
}: {
  eventId?: string | null;
  metadata?: Record<string, unknown>;
  profileId: string;
  severity?: Database["public"]["Tables"]["risk_signals"]["Insert"]["severity"];
  signalType: string;
  summary: string;
  supabase: SupabaseDatabaseClient;
}) {
  const { data, error } = await supabase
    .from("risk_signals")
    .insert(
      buildPrivacySafeRiskSignalInsert({
        metadata,
        profile_id: profileId,
        severity,
        signal_type: signalType,
        summary,
      }),
    )
    .select("id")
    .maybeSingle();

  if (!error && data?.id && eventId) {
    await supabase
      .from("background_query_events")
      .update({ risk_signal_id: data.id })
      .eq("id", eventId);
  }

  return error;
}

export async function insertMatchExplanationSnapshots({
  snapshots,
  supabase,
}: {
  snapshots: MatchExplanationSnapshotPayload[];
  supabase: SupabaseDatabaseClient;
}) {
  if (!snapshots.length) {
    return null;
  }

  const rows = snapshots.map((snapshot) => snapshot satisfies MatchExplanationSnapshotInsert);
  const { error } = await supabase.from("match_explanation_snapshots").upsert(rows, {
    ignoreDuplicates: true,
    onConflict: MATCH_EXPLANATION_SNAPSHOT_DEDUPE_COLUMNS,
  });

  return error;
}

export async function upsertBackgroundOpportunityBriefs({
  briefs,
  supabase,
}: {
  briefs: BackgroundOpportunityBriefInsert[];
  supabase: SupabaseDatabaseClient;
}) {
  if (!briefs.length) {
    return null;
  }

  const { error } = await supabase.from("background_opportunity_briefs").upsert(briefs, {
    ignoreDuplicates: false,
    onConflict: "profile_id,match_id",
  });

  return error;
}
