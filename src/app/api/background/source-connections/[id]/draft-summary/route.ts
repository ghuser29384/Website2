import { NextResponse } from "next/server";

import {
  BACKGROUND_SOURCE_ASSIST_MODEL_NAME,
  buildReviewedSourceDraftSummary,
} from "@/lib/background-source-assist";
import { hasActiveBackgroundSourcePermission } from "@/lib/background-source-permissions";
import { serializeBackgroundNetworkingRolloutSurface } from "@/lib/background-rollout";
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

function stringField(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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
      "Rate-limited source summary drafts persist no shadow output until the window resets.",
      "private, no-store",
    );
  }

  if (!hasSupabaseEnv()) {
    return privateJson({ error: "Supabase is not configured." }, 503);
  }

  const { id } = await params;
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return privateJson({ error: "Invalid JSON body." }, 400);
  }

  if (!isRecord(body)) {
    return privateJson({ error: "JSON object is required." }, 400);
  }

  const rawText = stringField(body.rawText ?? body.raw_text);

  if (rawText.length < 24) {
    return privateJson({ error: "Add enough source text to draft a reviewable summary." }, 400);
  }

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
          "Source connection must be active, field-scoped, unexpired, and raw-ingestion-disabled before drafting a summary.",
      },
      400,
    );
  }

  const draft = buildReviewedSourceDraftSummary({
    allowedFieldKeys: sourceConnection.allowed_field_keys ?? [],
    rawText,
  });

  const { data: shadowRun, error: shadowError } = await supabase
    .from("background_shadow_runs")
    .insert({
      model_name: BACKGROUND_SOURCE_ASSIST_MODEL_NAME,
      output_json: {
        allowedFieldKeys: draft.allowedFieldKeys,
        allowedUse: draft.allowedUse,
        assistVersion: draft.assistVersion,
        extractedSignals: draft.extractedSignals,
        redactionReport: draft.redactionReport,
        summaryText: draft.summaryText,
      },
      profile_id: user.id,
      purpose: "signal_extraction",
      source_connection_id: sourceConnection.id,
      was_promoted: false,
    })
    .select("id, created_at")
    .maybeSingle();

  if (shadowError || !shadowRun) {
    return privateJson({ error: shadowError?.message ?? "Unable to save shadow run." }, 500);
  }

  return privateJson({
    allowedUse: draft.allowedUse,
    draftSummary: draft.summaryText,
    extractedSignals: draft.extractedSignals,
    rawTextPersisted: false,
    redactionReport: draft.redactionReport,
    rollout: serializeBackgroundNetworkingRolloutSurface("background_source_summary_enabled"),
    shadowRunId: shadowRun.id,
    stateMutation: "source_summary_shadow_drafted",
  });
}
