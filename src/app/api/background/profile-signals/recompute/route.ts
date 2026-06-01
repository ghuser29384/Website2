import { NextResponse } from "next/server";

import {
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BackgroundProfileSignalRow =
  Database["public"]["Tables"]["background_profile_signals"]["Row"];
type BackgroundSourceSummaryRow =
  Database["public"]["Tables"]["background_source_summaries"]["Row"];
type SourceConnectionRow = Database["public"]["Tables"]["source_connections"]["Row"];

function privateJson(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    headers: { "Cache-Control": "private, no-store" },
    status,
  });
}

function isExpired(value: string | null | undefined, nowMs: number) {
  if (!value) {
    return false;
  }

  const parsed = Date.parse(value);

  return Number.isFinite(parsed) && parsed <= nowMs;
}

export async function POST(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(
    request,
    "background_source_summary_write",
  );

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited profile signal recomputation creates no state change until the window resets.",
      "private, no-store",
    );
  }

  if (!hasSupabaseEnv()) {
    return privateJson({ error: "Supabase is not configured." }, 503);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return privateJson({ error: "Authentication required." }, 401);
  }

  const [
    { data: signals, error: signalError },
    { data: summaries, error: summaryError },
    { data: connections, error: connectionError },
  ] = await Promise.all([
    supabase
      .from("background_profile_signals")
      .select("*")
      .eq("profile_id", user.id)
      .eq("status", "active"),
    supabase
      .from("background_source_summaries")
      .select("id, status, retention_expires_at")
      .eq("profile_id", user.id),
    supabase
      .from("source_connections")
      .select("id, access_status, retention_expires_at")
      .eq("profile_id", user.id),
  ]);

  if (signalError || summaryError || connectionError) {
    return privateJson(
      {
        error:
          signalError?.message ??
          summaryError?.message ??
          connectionError?.message ??
          "Unable to load profile signals.",
      },
      500,
    );
  }

  const now = new Date();
  const nowMs = now.getTime();
  const summaryById = new Map(
    ((summaries ?? []) as Pick<
      BackgroundSourceSummaryRow,
      "id" | "status" | "retention_expires_at"
    >[]).map((summary) => [summary.id, summary]),
  );
  const connectionById = new Map(
    ((connections ?? []) as Pick<
      SourceConnectionRow,
      "id" | "access_status" | "retention_expires_at"
    >[]).map((connection) => [connection.id, connection]),
  );
  const expiredIds: string[] = [];
  const revokedIds: string[] = [];
  const staleIds: string[] = [];

  for (const signal of (signals ?? []) as BackgroundProfileSignalRow[]) {
    const summary = signal.source_summary_id ? summaryById.get(signal.source_summary_id) : null;
    const connection = signal.source_connection_id
      ? connectionById.get(signal.source_connection_id)
      : null;

    if (
      isExpired(signal.expires_at, nowMs) ||
      (summary && isExpired(summary.retention_expires_at, nowMs)) ||
      (connection && isExpired(connection.retention_expires_at, nowMs))
    ) {
      expiredIds.push(signal.id);
      continue;
    }

    if (summary?.status === "revoked" || connection?.access_status === "revoked") {
      revokedIds.push(signal.id);
      continue;
    }

    if (summary && summary.status !== "active") {
      staleIds.push(signal.id);
    }
  }

  const results = [];
  const updatedAt = now.toISOString();

  if (expiredIds.length) {
    results.push(
      await supabase
        .from("background_profile_signals")
        .update({ status: "expired", updated_at: updatedAt })
        .in("id", expiredIds)
        .eq("profile_id", user.id),
    );
  }

  if (revokedIds.length) {
    results.push(
      await supabase
        .from("background_profile_signals")
        .update({ status: "revoked", updated_at: updatedAt })
        .in("id", revokedIds)
        .eq("profile_id", user.id),
    );
  }

  if (staleIds.length) {
    results.push(
      await supabase
        .from("background_profile_signals")
        .update({ status: "stale", updated_at: updatedAt })
        .in("id", staleIds)
        .eq("profile_id", user.id),
    );
  }

  const failed = results.find((result) => result.error);

  if (failed?.error) {
    return privateJson({ error: failed.error.message }, 500);
  }

  return privateJson({
    expired: expiredIds.length,
    revoked: revokedIds.length,
    stale: staleIds.length,
    stateMutation: "profile_signals_recomputed",
  });
}
