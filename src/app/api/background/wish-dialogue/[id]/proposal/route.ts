import { NextResponse } from "next/server";

import { decryptBackgroundSensitiveText } from "@/lib/background-field-encryption";
import { serializeBackgroundNetworkingRolloutSurface } from "@/lib/background-rollout";
import {
  BACKGROUND_WISH_DIALOGUE_MODEL_NAME,
  buildBackgroundWishDialogueProposal,
} from "@/lib/background-wish-dialogue";
import {
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BackgroundWishFieldProposalInsert =
  Database["public"]["Tables"]["background_wish_field_proposals"]["Insert"];

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
      "Rate-limited wish proposal requests create no proposal until the window resets.",
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

  const { data: messages, error: messagesError } = await supabase
    .from("background_wish_dialogue_messages")
    .select("actor, body_ciphertext")
    .eq("session_id", session.id)
    .eq("profile_id", user.id)
    .order("created_at", { ascending: true });

  if (messagesError) {
    return privateJson({ error: messagesError.message }, 500);
  }

  const decryptedMessages = (messages ?? [])
    .map((message) => ({
      role: message.actor,
      text: decryptBackgroundSensitiveText(
        message.body_ciphertext,
        "background_wish_dialogue_messages.body",
      ),
    }))
    .filter((message) => message.text && !/\[encrypted private field unavailable\]/i.test(message.text));

  if (!decryptedMessages.length) {
    return privateJson({ error: "Add a wish dialogue message before drafting a proposal." }, 400);
  }

  const proposal = buildBackgroundWishDialogueProposal({
    messages: decryptedMessages,
  });
  const proposalInsert: BackgroundWishFieldProposalInsert = {
    explanation: [...proposal.participantExplanation],
    profile_id: user.id,
    proposal: proposal as unknown as Record<string, unknown>,
    session_id: session.id,
    uncertainty_flags: [...proposal.uncertaintyFlags],
  };
  const { data: proposalRow, error: proposalError } = await supabase
    .from("background_wish_field_proposals")
    .insert(proposalInsert)
    .select("id, created_at")
    .maybeSingle();

  if (proposalError || !proposalRow) {
    return privateJson({ error: proposalError?.message ?? "Unable to save wish proposal." }, 500);
  }

  await supabase
    .from("background_wish_dialogue_sessions")
    .update({ state: "proposed" })
    .eq("id", session.id)
    .eq("profile_id", user.id);

  return privateJson({
    modelName: BACKGROUND_WISH_DIALOGUE_MODEL_NAME,
    profileMutationApplied: false,
    proposal,
    proposalId: proposalRow.id,
    rollout: serializeBackgroundNetworkingRolloutSurface("background_wish_interview_enabled"),
    stateMutation: "wish_dialogue_proposal_created",
  });
}
