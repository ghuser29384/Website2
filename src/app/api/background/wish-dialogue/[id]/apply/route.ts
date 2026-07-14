import { NextResponse } from "next/server";

import { serializeBackgroundNetworkingRolloutSurface } from "@/lib/background-rollout";
import {
  buildBackgroundWishDialogueSignalRows,
  getBackgroundWishDialogueSignalExpiresAt,
  normalizeBackgroundWishDialogueProposal,
  validateBackgroundWishDialogueProposalForApply,
} from "@/lib/background-wish-dialogue";
import {
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

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
  const rateLimit = takeMoralTradeApiRateLimitSlot(
    request,
    "background_wish_interview_write",
  );

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited wish proposal apply requests create no profile signals until the window resets.",
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

  const { id } = await params;
  const proposalId = stringField(body.proposalId ?? body.proposal_id);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return privateJson({ error: "Authentication required." }, 401);
  }

  const { data: session, error: sessionError } = await supabase
    .from("background_wish_dialogue_sessions")
    .select("id, state")
    .eq("id", id)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (sessionError || !session) {
    return privateJson({ error: sessionError?.message ?? "Wish dialogue was not found." }, 404);
  }

  if (session.state === "applied" || session.state === "abandoned") {
    return privateJson({ error: "This wish dialogue is closed." }, 400);
  }

  let query = supabase
    .from("background_wish_field_proposals")
    .select("id, proposal")
    .eq("session_id", session.id)
    .eq("profile_id", user.id)
    .eq("approved", false)
    .order("created_at", { ascending: false })
    .limit(1);

  if (proposalId) {
    query = query.eq("id", proposalId);
  }

  const { data: proposals, error: proposalError } = await query;
  const proposalRow = proposals?.[0];

  if (proposalError || !proposalRow) {
    return privateJson({ error: proposalError?.message ?? "Wish proposal was not found." }, 404);
  }

  const proposal = normalizeBackgroundWishDialogueProposal(proposalRow.proposal);
  const validation = validateBackgroundWishDialogueProposalForApply(proposal);

  if (validation.errors.length) {
    return privateJson({ error: validation.errors.join(" ") }, 400);
  }

  const expiresAt = getBackgroundWishDialogueSignalExpiresAt();
  const signalRows = buildBackgroundWishDialogueSignalRows({
    expiresAt,
    profileId: user.id,
    proposal,
  });

  if (signalRows.length) {
    const { error: signalError } = await supabase.from("background_profile_signals").insert(signalRows);

    if (signalError) {
      return privateJson({ error: signalError.message }, 500);
    }
  }

  await Promise.all([
    supabase
      .from("background_wish_field_proposals")
      .update({ approved: true })
      .eq("id", proposalRow.id)
      .eq("profile_id", user.id),
    supabase
      .from("background_wish_dialogue_sessions")
      .update({ state: "applied" })
      .eq("id", session.id)
      .eq("profile_id", user.id),
  ]);

  return privateJson({
    livePublicPreviewMutation: false,
    profileSignalsCreated: signalRows.length,
    proposalId: proposalRow.id,
    rollout: serializeBackgroundNetworkingRolloutSurface("background_wish_interview_enabled"),
    stateMutation: "wish_dialogue_proposal_applied",
  });
}
