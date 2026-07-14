import { NextResponse } from "next/server";

import { buildBackgroundSourceSyncJobRow } from "@/lib/background-helper-runs";
import { serializeBackgroundNetworkingRolloutSurface } from "@/lib/background-rollout";
import { hasActiveBackgroundSourcePermission } from "@/lib/background-source-permissions";
import {
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SourceConnectionRow = Database["public"]["Tables"]["source_connections"]["Row"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function privateJson(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    headers: { "Cache-Control": "private, no-store" },
    status,
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(
    request,
    "background_source_summary_write",
  );

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited reviewed-summary sync requests enqueue no work until the window resets.",
      "private, no-store",
    );
  }

  if (!hasSupabaseEnv()) {
    return privateJson({ error: "Supabase is not configured." }, 503);
  }

  let body: unknown = {};

  try {
    body = await request.json();
  } catch {
    body = {};
  }

  if (!isRecord(body)) {
    return privateJson({ error: "JSON object is required." }, 400);
  }

  if (typeof body.rawText === "string" || typeof body.raw_text === "string") {
    return privateJson(
      {
        error:
          "This connector lane queues a reviewed-summary sync only; use the manual source-summary draft route for request-scoped raw text review.",
      },
      400,
    );
  }

  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return privateJson({ error: "Authentication required." }, 401);
  }

  const { data: sourceConnection, error: sourceConnectionError } = await supabase
    .from("source_connections")
    .select("id, profile_id, access_status, allowed_field_keys, retention_expires_at, raw_ingestion_allowed")
    .eq("id", id)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (sourceConnectionError || !sourceConnection) {
    return privateJson(
      { error: sourceConnectionError?.message ?? "Source connection was not found." },
      404,
    );
  }

  if (
    sourceConnection.raw_ingestion_allowed ||
    !hasActiveBackgroundSourcePermission(sourceConnection as SourceConnectionRow)
  ) {
    return privateJson(
      {
        error:
          "Source connection must be active, field-scoped, unexpired, and raw-ingestion-disabled before queueing a reviewed-summary sync.",
      },
      400,
    );
  }

  const { data: job, error: jobError } = await supabase
    .from("background_source_sync_jobs")
    .insert(
      buildBackgroundSourceSyncJobRow({
        profileId: user.id,
        sourceConnectionId: sourceConnection.id,
      }),
    )
    .select("id, state, next_run_at")
    .maybeSingle();

  if (jobError || !job) {
    return privateJson({ error: jobError?.message ?? "Unable to queue reviewed-summary sync." }, 500);
  }

  return privateJson(
    {
      jobId: job.id,
      rawIngestionAllowed: false,
      rawTextPersisted: false,
      rollout: serializeBackgroundNetworkingRolloutSurface("background_source_summary_enabled"),
      state: job.state,
      nextRunAt: job.next_run_at,
      stateMutation: "reviewed_summary_sync_queued",
    },
    202,
  );
}
