import { NextResponse } from "next/server";

import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

import { POST as approveSourceSummaryPost } from "../../../../../source-summaries/[id]/approve/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function privateJson(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    headers: { "Cache-Control": "private, no-store" },
    status,
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; summaryId: string }> },
) {
  const { id, summaryId } = await params;

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

  const { data: shadowRun, error } = await supabase
    .from("background_shadow_runs")
    .select("id, source_connection_id")
    .eq("id", summaryId)
    .eq("profile_id", user.id)
    .eq("purpose", "signal_extraction")
    .eq("was_promoted", false)
    .maybeSingle();

  if (error || !shadowRun) {
    return privateJson({ error: error?.message ?? "Draft summary was not found." }, 404);
  }

  if (shadowRun.source_connection_id !== id) {
    return privateJson(
      { error: "Draft summary does not belong to the requested source connection." },
      400,
    );
  }

  return approveSourceSummaryPost(request, {
    params: Promise.resolve({ id: summaryId }),
  });
}
