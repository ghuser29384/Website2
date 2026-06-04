import { NextResponse } from "next/server";

import {
  buildBackgroundWishInterviewSignalRows,
  getBackgroundWishInterviewSignalExpiresAt,
  isBackgroundWishInterviewSessionState,
  markBackgroundWishInterviewApplied,
  validateBackgroundWishInterviewApply,
} from "@/lib/background-wish-interview";
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

function stringList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
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
      "Rate-limited wish-interview apply requests create no profile signals until the window resets.",
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

  const { data: shadowRun, error: shadowError } = await supabase
    .from("background_shadow_runs")
    .select("id, output_json, was_promoted")
    .eq("id", id)
    .eq("profile_id", user.id)
    .eq("purpose", "clarification_draft")
    .eq("was_promoted", false)
    .maybeSingle();

  if (shadowError || !shadowRun) {
    return privateJson({ error: shadowError?.message ?? "Wish-interview session was not found." }, 404);
  }

  if (!isBackgroundWishInterviewSessionState(shadowRun.output_json)) {
    return privateJson({ error: "Wish-interview session state is invalid." }, 400);
  }

  const validation = validateBackgroundWishInterviewApply({
    approvedDeltaKeys: stringList(
      body.approvedDeltaKeys ?? body.approved_delta_keys ?? body.fieldKeys,
    ),
    state: shadowRun.output_json,
  });

  if (validation.errors.length) {
    return privateJson({ error: validation.errors.join(" "), rejectedDeltaKeys: validation.rejectedDeltaKeys }, 400);
  }

  const signalRows = buildBackgroundWishInterviewSignalRows({
    approvedDeltaKeys: validation.approvedDeltaKeys,
    expiresAt: getBackgroundWishInterviewSignalExpiresAt(),
    profileId: user.id,
    state: shadowRun.output_json,
  });

  if (signalRows.length) {
    const { error: signalError } = await supabase
      .from("background_profile_signals")
      .insert(signalRows);

    if (signalError) {
      return privateJson({ error: signalError.message }, 500);
    }
  }

  const questionKeys = shadowRun.output_json.answers
    .filter((answer) => validation.approvedDeltaKeys.includes(answer.fieldKey))
    .map((answer) => answer.questionKey);

  if (questionKeys.length) {
    const { error: answerError } = await supabase
      .from("background_profile_interview_answers")
      .update({ status: "saved" })
      .eq("profile_id", user.id)
      .in("question_key", questionKeys);

    if (answerError) {
      return privateJson({ error: answerError.message }, 500);
    }
  }

  const nextState = markBackgroundWishInterviewApplied({
    approvedDeltaKeys: validation.approvedDeltaKeys,
    profileSignalsCreated: signalRows.length,
    state: shadowRun.output_json,
  });

  const { error: updateError } = await supabase
    .from("background_shadow_runs")
    .update({
      output_json: nextState,
      was_promoted: true,
    })
    .eq("id", shadowRun.id)
    .eq("profile_id", user.id)
    .eq("was_promoted", false);

  if (updateError) {
    return privateJson({ error: updateError.message }, 500);
  }

  return privateJson({
    approvedDeltaKeys: validation.approvedDeltaKeys,
    hiddenInferenceCreated: false,
    liveAiMutation: false,
    profileMutationApplied: false,
    profileSignalsCreated: signalRows.length,
    rawTranscriptStored: false,
    rollout: serializeBackgroundNetworkingRolloutSurface("background_wish_interview_enabled"),
    sessionId: shadowRun.id,
    sessionStatus: nextState.sessionStatus,
    signalRecomputeRecommended: signalRows.length > 0,
    stateMutation: "wish_interview_structured_delta_applied",
  });
}
