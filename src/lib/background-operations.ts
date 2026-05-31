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
    metadata,
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
      metadata,
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
    .insert({
      metadata,
      profile_id: profileId,
      severity,
      signal_type: signalType,
      summary,
    })
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
