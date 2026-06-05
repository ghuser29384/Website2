import { NextResponse } from "next/server";

import {
  BACKGROUND_ENCRYPTED_TEXT_PLACEHOLDER,
  BACKGROUND_FIELD_ENCRYPTION_VERSION,
  encryptBackgroundSensitiveText,
} from "@/lib/background-field-encryption";
import { serializeBackgroundNetworkingRolloutSurface } from "@/lib/background-rollout";
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
      "Rate-limited wish dialogue messages create no state change until the window resets.",
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

  const message = stringField(body.message ?? body.text);

  if (message.length < 4) {
    return privateJson({ error: "Add a short wish message before drafting a proposal." }, 400);
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

  let ciphertext = "";

  try {
    ciphertext = encryptBackgroundSensitiveText(
      message,
      "background_wish_dialogue_messages.body",
    );
  } catch {
    return privateJson(
      { error: "Background field encryption must be configured before saving wish dialogue text." },
      503,
    );
  }

  const { data: saved, error: messageError } = await supabase
    .from("background_wish_dialogue_messages")
    .insert({
      actor: "user",
      body: BACKGROUND_ENCRYPTED_TEXT_PLACEHOLDER,
      body_ciphertext: ciphertext,
      body_encryption_version: BACKGROUND_FIELD_ENCRYPTION_VERSION,
      profile_id: user.id,
      session_id: session.id,
    })
    .select("id, created_at")
    .maybeSingle();

  if (messageError || !saved) {
    return privateJson({ error: messageError?.message ?? "Unable to save wish dialogue message." }, 500);
  }

  await supabase
    .from("background_wish_dialogue_sessions")
    .update({ state: "draft" })
    .eq("id", session.id)
    .eq("profile_id", user.id);

  return privateJson({
    messageId: saved.id,
    rawTranscriptStored: false,
    rollout: serializeBackgroundNetworkingRolloutSurface("background_wish_interview_enabled"),
    stateMutation: "wish_dialogue_message_saved",
  });
}
