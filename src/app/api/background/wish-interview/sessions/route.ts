import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import {
  BACKGROUND_WISH_INTERVIEW_DEFAULT_CONSENT_VERSION,
  BACKGROUND_WISH_INTERVIEW_MODEL_NAME,
  buildBackgroundWishInterviewSessionState,
  getCurrentBackgroundWishInterviewQuestion,
} from "@/lib/background-wish-interview";
import {
  buildBackgroundRefinementItems,
  buildGuidedWishProfileDraft,
} from "@/lib/background-refinement";
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
      "Rate-limited wish-interview session requests create no private draft until the window resets.",
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

  const { data: profile, error } = await supabase
    .from("wish_profiles")
    .select(
      "profile_id, causes, capabilities, verification_preferences, constraints, brokerage_preference, public_preview, uncertainty_notes, manual_source_review_enabled",
    )
    .eq("profile_id", user.id)
    .maybeSingle();

  if (error) {
    return privateJson({ error: error.message }, 500);
  }

  if (!profile) {
    return privateJson({ error: "Create a wish profile before starting a guided interview." }, 404);
  }

  const sessionId = randomUUID();
  const items = buildBackgroundRefinementItems({
    causeAreas: profile.causes ?? [],
    exclusions: profile.constraints ? [profile.constraints] : [],
    offeredCapabilities: profile.capabilities ? [profile.capabilities] : [],
    requestedCounterpartyKinds: profile.brokerage_preference
      ? [profile.brokerage_preference]
      : [],
    verificationPreferences: profile.verification_preferences
      ? [profile.verification_preferences]
      : [],
  });
  const sessionState = buildBackgroundWishInterviewSessionState({
    consentVersion:
      stringField(body.consentVersion ?? body.consent_version) ||
      BACKGROUND_WISH_INTERVIEW_DEFAULT_CONSENT_VERSION,
    items,
    privateProfileId: profile.profile_id,
    sessionId,
  });

  const { data: shadowRun, error: shadowError } = await supabase
    .from("background_shadow_runs")
    .insert({
      id: sessionId,
      model_name: BACKGROUND_WISH_INTERVIEW_MODEL_NAME,
      output_json: sessionState,
      profile_id: user.id,
      purpose: "clarification_draft",
      was_promoted: false,
    })
    .select("id, created_at")
    .maybeSingle();

  if (shadowError || !shadowRun) {
    return privateJson({ error: shadowError?.message ?? "Unable to create interview session." }, 500);
  }

  return privateJson({
    assistantMode: "shadow_first_user_approved_only",
    guidedWishProfileDraft: buildGuidedWishProfileDraft({
      broadPreview: profile.public_preview ?? "",
      capabilities: profile.capabilities ?? "",
      constraints: profile.constraints ?? "",
      exactAsk: profile.brokerage_preference ?? "",
      passiveModeEnabled: profile.manual_source_review_enabled ?? false,
      uncertainty: { uncertaintyNotes: profile.uncertainty_notes ?? "" },
      verificationPreferences: profile.verification_preferences
        ? [profile.verification_preferences]
        : [],
    }),
    hiddenInferenceCreated: false,
    liveAiMutation: false,
    profileMutationApplied: false,
    question: getCurrentBackgroundWishInterviewQuestion(sessionState),
    rawTranscriptStored: false,
    rollout: serializeBackgroundNetworkingRolloutSurface("background_wish_interview_enabled"),
    sessionId: shadowRun.id,
    sessionStatus: sessionState.sessionStatus,
    stateMutation: "wish_interview_session_created",
  });
}
