import { NextResponse } from "next/server";

import {
  buildIntroPacketRow,
  validateIntroPacketInput,
} from "@/lib/background-opportunity-briefs";
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

function stringList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string").map((entry) => entry.trim()).filter(Boolean)
    : [];
}

function privateJson(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    headers: { "Cache-Control": "private, no-store" },
    status,
  });
}

export async function POST(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "background_intro_packet_write");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited intro packet requests return no review packet until the window resets.",
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

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return privateJson({ error: "Invalid JSON body." }, 400);
  }

  if (!isRecord(body)) {
    return privateJson({ error: "JSON object is required." }, 400);
  }

  const purpose = stringField(body.purpose);
  const requestedFieldKeys = stringList(body.requestedFieldKeys);
  const validation = validateIntroPacketInput({ purpose, requestedFieldKeys });

  if (validation.errors.length) {
    return privateJson({ error: validation.errors.join(" ") }, 400);
  }

  const packet = buildIntroPacketRow({
    counterpartyProfileId: stringField(body.counterpartyProfileId) || null,
    matchId: stringField(body.matchId) || null,
    opportunityBriefId: stringField(body.opportunityBriefId) || null,
    purpose,
    requestedFieldKeys,
    requesterAnswers: {
      ...(isRecord(body.requesterAnswers) ? body.requesterAnswers : {}),
      firstQuestion: stringField(
        body.firstQuestion ?? body.first_question ?? body.anonymousQuestion ?? body.anonymous_question,
      ),
    },
    requesterProfileId: user.id,
  });
  const { data, error } = await supabase
    .from("background_intro_packets")
    .insert(packet)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return privateJson({ error: error?.message ?? "Unable to create intro packet." }, 500);
  }

  if (packet.opportunity_brief_id) {
    await supabase
      .from("background_opportunity_briefs")
      .update({ status: "packet_requested" })
      .eq("id", packet.opportunity_brief_id)
      .eq("profile_id", user.id);
  }

  try {
    const serviceClient = createServiceClient();
    await serviceClient.from("match_audit_events").insert({
      actor_profile_id: user.id,
      event_type: "intro_packet_requested",
      match_id: packet.match_id,
      metadata: {
        introPacketId: data.id,
        requestedFieldCount: validation.requestedFieldKeys.length,
      },
      summary: "Participant requested a reviewed introduction packet; no outreach was sent.",
    });
  } catch {
    // Service-role audit is best effort; RLS-protected packet creation already succeeded.
  }

  return privateJson({
    introPacketId: data.id,
    stateMutation: "reviewed_intro_packet_requested",
    outreachSent: false,
  });
}
