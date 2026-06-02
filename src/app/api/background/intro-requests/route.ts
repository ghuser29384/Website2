import { NextResponse } from "next/server";

import {
  buildIntroPacketRow,
  validateIntroPacketInput,
} from "@/lib/background-opportunity-briefs";
import {
  evaluateBackgroundIntroRequestCadence,
  getBackgroundIntroRequestWindowStart,
} from "@/lib/background-intro-requests";
import { recordBackgroundQueryRiskSignal } from "@/lib/background-operations";
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

function stringList(...values: unknown[]) {
  return values
    .flatMap((value) =>
      Array.isArray(value)
        ? value.filter((entry): entry is string => typeof entry === "string")
        : typeof value === "string"
          ? [value]
          : [],
    )
    .map((entry) => entry.trim())
    .filter(Boolean)
    .filter((entry, index, entries) => entries.indexOf(entry) === index);
}

function privateJson(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    headers: { "Cache-Control": "private, no-store" },
    status,
  });
}

async function recordIntroProbePressure({
  matchId,
  metadata,
  profileId,
}: {
  matchId?: string | null;
  metadata: Record<string, unknown>;
  profileId: string;
}) {
  try {
    const serviceClient = createServiceClient();

    await recordBackgroundQueryRiskSignal({
      metadata,
      profileId,
      severity: "medium",
      signalType: "intro_request_probe_pressure",
      summary:
        "An intro-request pattern approached or crossed the repeated-target privacy threshold.",
      supabase: serviceClient,
    });

    if (matchId) {
      await serviceClient.from("match_audit_events").insert({
        actor_profile_id: profileId,
        event_type: "intro_request_probe_pressure",
        match_id: matchId,
        metadata,
        summary: "Intro-request probing pressure was logged with counts only.",
      });
    }
  } catch {
    // Risk logging is best effort when service-role credentials are unavailable.
  }
}

export async function POST(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "background_intro_packet_write");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited intro requests create no review packet until the window resets.",
      "private, no-store",
    );
  }

  if (!hasSupabaseEnv()) {
    return privateJson({ error: "Supabase is not configured." }, 503);
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return privateJson({ error: "Authentication required." }, 401);
  }

  const opportunityBriefId = stringField(body.opportunityBriefId ?? body.opportunity_brief_id);
  let matchId = stringField(body.matchId ?? body.match_id) || null;
  let counterpartyProfileId =
    stringField(body.targetProfileId ?? body.counterpartyProfileId ?? body.counterparty_profile_id) ||
    null;

  if (opportunityBriefId) {
    const { data: brief, error: briefError } = await supabase
      .from("background_opportunity_briefs")
      .select("id, match_id, candidate_profile_id")
      .eq("id", opportunityBriefId)
      .eq("profile_id", user.id)
      .maybeSingle();

    if (briefError || !brief) {
      return privateJson({ error: briefError?.message ?? "Opportunity brief was not found." }, 404);
    }

    matchId = matchId ?? brief.match_id;
    counterpartyProfileId = counterpartyProfileId ?? brief.candidate_profile_id;
  }

  if (counterpartyProfileId === user.id) {
    return privateJson({ error: "Intro requests cannot target your own profile." }, 400);
  }

  const purpose = stringField(body.purpose);
  const requestedFieldKeys = stringList(
    body.requestedFieldKeys,
    body.requested_field_keys,
    body.requestedFields,
    body.requested_fields,
  );
  const validation = validateIntroPacketInput({ purpose, requestedFieldKeys });

  if (validation.errors.length) {
    return privateJson({ error: validation.errors.join(" ") }, 400);
  }

  if (counterpartyProfileId) {
    const { data: recentRequests, error: recentRequestsError } = await supabase
      .from("background_intro_packets")
      .select("created_at, review_state")
      .eq("requester_profile_id", user.id)
      .eq("counterparty_profile_id", counterpartyProfileId)
      .gte("created_at", getBackgroundIntroRequestWindowStart())
      .order("created_at", { ascending: false })
      .limit(10);

    if (recentRequestsError) {
      return privateJson({ error: recentRequestsError.message }, 500);
    }

    const cadence = evaluateBackgroundIntroRequestCadence({
      recentRequests: recentRequests ?? [],
    });

    if (cadence.riskLevel !== "none") {
      await recordIntroProbePressure({
        matchId,
        metadata: {
          openRequestCount: cadence.openRequestCount,
          recentRequestCount: cadence.recentRequestCount,
          requestedFieldCount: validation.requestedFieldKeys.length,
        },
        profileId: user.id,
      });
    }

    if (!cadence.allowed) {
      return privateJson({ error: cadence.blockers.join(" ") }, 429);
    }
  }

  const packet = buildIntroPacketRow({
    counterpartyProfileId,
    matchId,
    opportunityBriefId: opportunityBriefId || null,
    purpose,
    requestedFieldKeys: validation.requestedFieldKeys,
    requesterAnswers: {
      firstQuestion: stringField(
        body.firstQuestion ?? body.first_question ?? body.anonymousQuestion ?? body.anonymous_question,
      ),
      privacyConstraints: isRecord(body.privacyConstraints ?? body.privacy_constraints)
        ? (body.privacyConstraints ?? body.privacy_constraints)
        : {},
      proposedTradeShape: isRecord(body.proposedTradeShape ?? body.proposed_trade_shape)
        ? (body.proposedTradeShape ?? body.proposed_trade_shape)
        : {},
    },
    requesterProfileId: user.id,
  });
  const { data, error } = await supabase
    .from("background_intro_packets")
    .insert(packet)
    .select("id, sla_due_at")
    .maybeSingle();

  if (error || !data) {
    return privateJson({ error: error?.message ?? "Unable to create intro request." }, 500);
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
      event_type: "intro_request_submitted",
      match_id: packet.match_id,
      metadata: {
        introRequestId: data.id,
        requestedFieldCount: validation.requestedFieldKeys.length,
      },
      summary:
        "Participant requested a reviewed introduction; no outreach or contact disclosure was sent.",
    });
  } catch {
    // Service-role audit is best effort; RLS-protected packet creation already succeeded.
  }

  return privateJson({
    introRequestId: data.id,
    outreachSent: false,
    privateDetailsReturned: false,
    slaDueAt: data.sla_due_at,
    stateMutation: "reviewed_intro_request_submitted",
  });
}
