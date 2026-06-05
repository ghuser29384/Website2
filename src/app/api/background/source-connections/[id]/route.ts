import { NextResponse } from "next/server";

import {
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function privateJson(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    headers: { "Cache-Control": "private, no-store" },
    status,
  });
}

export async function DELETE(
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
      "Rate-limited source connection revocations create no state change until the window resets.",
      "private, no-store",
    );
  }

  if (!hasSupabaseEnv()) {
    return privateJson({ error: "Supabase is not configured." }, 503);
  }

  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return privateJson({ error: "Authentication required." }, 401);
  }

  const now = new Date().toISOString();
  const { count, error } = await supabase
    .from("source_connections")
    .update(
      {
        access_status: "revoked",
        ai_shadow_mode_allowed: false,
        allowed_field_keys: [],
        raw_ingestion_allowed: false,
        retention_expires_at: now,
        sync_frequency: "manual",
        updated_at: now,
      },
      { count: "exact" },
    )
    .eq("id", id)
    .eq("profile_id", user.id);

  if (error) {
    return privateJson({ error: error.message }, 500);
  }

  if (!count) {
    return privateJson({ error: "Source connection was not found." }, 404);
  }

  await Promise.all([
    supabase
      .from("background_source_summaries")
      .update({ status: "revoked", updated_at: now })
      .eq("profile_id", user.id)
      .eq("source_connection_id", id),
    supabase
      .from("background_profile_signals")
      .update({ status: "revoked", updated_at: now })
      .eq("profile_id", user.id)
      .eq("source_connection_id", id)
      .eq("status", "active"),
    supabase
      .from("background_source_sync_jobs")
      .update({ state: "cancelled", updated_at: now })
      .eq("profile_id", user.id)
      .eq("source_connection_id", id)
      .in("state", ["queued", "running", "retry"]),
  ]);

  return privateJson({
    id,
    stateMutation: "source_connection_revoked",
    downstreamSignalsExcluded: true,
  });
}
