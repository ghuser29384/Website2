import { NextResponse } from "next/server";

import { validateBackgroundIntroAppealRequest } from "@/lib/background-intro-requests";
import {
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "background_intro_packet_write");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited intro request appeals create no state change until the window resets.",
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return privateJson({ error: "Authentication required." }, 401);
  }

  const { data: introRequest, error: requestError } = await supabase
    .from("background_intro_packets")
    .select("id, requester_profile_id, counterparty_profile_id, match_id, review_state, appeal_status")
    .eq("id", id)
    .maybeSingle();

  if (requestError || !introRequest) {
    return privateJson({ error: requestError?.message ?? "Intro request was not found." }, 404);
  }

  const isParticipant =
    introRequest.requester_profile_id === user.id ||
    introRequest.counterparty_profile_id === user.id;

  if (!isParticipant) {
    return privateJson({ error: "You can only appeal your own intro requests." }, 403);
  }

  const validation = validateBackgroundIntroAppealRequest({
    appealStatus: introRequest.appeal_status,
    reason: stringField(body.reason ?? body.appealReason ?? body.appeal_reason),
    reviewState: introRequest.review_state,
  });

  if (validation.errors.length) {
    return privateJson({ error: validation.errors.join(" ") }, 400);
  }

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("background_intro_packets")
    .update({
      appeal_reason: validation.reason,
      appeal_resolution_note: "",
      appeal_resolved_at: null,
      appeal_status: "requested",
      appealed_at: now,
      review_state: "under_review",
      updated_at: now,
    })
    .eq("id", introRequest.id);

  if (updateError) {
    return privateJson({ error: updateError.message }, 500);
  }

  try {
    const serviceClient = createServiceClient();
    await serviceClient.from("match_audit_events").insert({
      actor_profile_id: user.id,
      event_type: "intro_request_appeal_requested",
      match_id: introRequest.match_id,
      metadata: {
        appealStatus: "requested",
        introRequestId: introRequest.id,
        previousReviewState: introRequest.review_state,
      },
      summary: "Participant requested operator appeal of an intro request decision.",
    });
  } catch {
    // Service-role audit is best effort; participant-visible appeal state was recorded.
  }

  return privateJson({
    appealStatus: "requested",
    introRequestId: introRequest.id,
    outreachSent: false,
    stateMutation: "intro_request_appeal_requested",
  });
}
