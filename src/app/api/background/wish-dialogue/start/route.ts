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

export async function POST(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(
    request,
    "background_wish_interview_write",
  );

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited wish dialogue starts create no draft session until the window resets.",
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return privateJson({ error: "Authentication required." }, 401);
  }

  const { data: session, error: sessionError } = await supabase
    .from("background_wish_dialogue_sessions")
    .insert({ profile_id: user.id, state: "draft" })
    .select("id, state, created_at")
    .maybeSingle();

  if (sessionError || !session) {
    return privateJson({ error: sessionError?.message ?? "Unable to create wish dialogue." }, 500);
  }

  const initialMessage = stringField(body.message ?? body.text);

  if (initialMessage) {
    let ciphertext = "";

    try {
      ciphertext = encryptBackgroundSensitiveText(
        initialMessage,
        "background_wish_dialogue_messages.body",
      );
    } catch {
      return privateJson(
        { error: "Background field encryption must be configured before saving wish dialogue text." },
        503,
      );
    }

    const { error: messageError } = await supabase.from("background_wish_dialogue_messages").insert({
      actor: "user",
      body: BACKGROUND_ENCRYPTED_TEXT_PLACEHOLDER,
      body_ciphertext: ciphertext,
      body_encryption_version: BACKGROUND_FIELD_ENCRYPTION_VERSION,
      profile_id: user.id,
      session_id: session.id,
    });

    if (messageError) {
      return privateJson({ error: messageError.message }, 500);
    }
  }

  return privateJson({
    sessionId: session.id,
    state: session.state,
    rawTranscriptStored: false,
    liveProfileMutation: false,
    rollout: serializeBackgroundNetworkingRolloutSurface("background_wish_interview_enabled"),
    stateMutation: "wish_dialogue_session_created",
  });
}
