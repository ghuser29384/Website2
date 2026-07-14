import { NextResponse } from "next/server";

import {
  prepareRecordSensitiveTextFields,
} from "@/lib/background-field-encryption";
import {
  buildBackgroundWishInterviewAnswerDraft,
  getCurrentBackgroundWishInterviewQuestion,
  isBackgroundWishInterviewSessionState,
  mergeBackgroundWishInterviewAnswerState,
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

function stringField(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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
      "Rate-limited wish-interview answers create no private draft until the window resets.",
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
    .maybeSingle();

  if (shadowError || !shadowRun) {
    return privateJson({ error: shadowError?.message ?? "Wish-interview session was not found." }, 404);
  }

  if (shadowRun.was_promoted) {
    return privateJson({ error: "This wish-interview session has already been applied." }, 409);
  }

  if (!isBackgroundWishInterviewSessionState(shadowRun.output_json)) {
    return privateJson({ error: "Wish-interview session state is invalid." }, 400);
  }

  const question = getCurrentBackgroundWishInterviewQuestion(shadowRun.output_json);

  if (!question) {
    return privateJson({ error: "This wish-interview session is ready for review." }, 409);
  }

  const requestedQuestionKey = stringField(body.questionKey ?? body.question_key);

  if (requestedQuestionKey && requestedQuestionKey !== question.questionKey) {
    return privateJson({ error: "Question key does not match the current interview cursor." }, 409);
  }

  const draft = buildBackgroundWishInterviewAnswerDraft({
    answer: stringField(body.answer),
    profileId: user.id,
    question,
    selectedOptions: stringList(body.selectedOptions ?? body.selected_options ?? body.answerValues),
  });

  if (!draft) {
    return privateJson({ error: "answer or selectedOptions is required." }, 400);
  }

  let encryptedFields: ReturnType<typeof prepareRecordSensitiveTextFields>;

  try {
    encryptedFields = prepareRecordSensitiveTextFields({
      answer: draft.row.answer ?? "",
      private_intent_update: draft.row.private_intent_update ?? "",
    });
  } catch {
    return privateJson(
      { error: "Background field encryption must be configured before saving interview answers." },
      503,
    );
  }

  const { data: answerRow, error: answerError } = await supabase
    .from("background_profile_interview_answers")
    .upsert(
      {
        ...draft.row,
        answer: encryptedFields.plaintextFields.answer,
        private_intent_update: encryptedFields.plaintextFields.private_intent_update,
        sensitive_ciphertexts: encryptedFields.ciphertexts,
        sensitive_encryption_version: encryptedFields.version,
      },
      { onConflict: "profile_id,question_key" },
    )
    .select("id, updated_at")
    .maybeSingle();

  if (answerError || !answerRow) {
    return privateJson({ error: answerError?.message ?? "Unable to save interview answer." }, 500);
  }

  const nextState = mergeBackgroundWishInterviewAnswerState({
    answerState: draft.answerState,
    state: shadowRun.output_json,
  });

  const { error: updateError } = await supabase
    .from("background_shadow_runs")
    .update({ output_json: nextState })
    .eq("id", shadowRun.id)
    .eq("profile_id", user.id)
    .eq("was_promoted", false);

  if (updateError) {
    return privateJson({ error: updateError.message }, 500);
  }

  return privateJson({
    answerId: answerRow.id,
    answerTextStoredInSession: false,
    nextQuestion: getCurrentBackgroundWishInterviewQuestion(nextState),
    profileMutationApplied: false,
    proposedDeltaKeys: nextState.proposedDeltaKeys,
    rawTranscriptStored: false,
    rollout: serializeBackgroundNetworkingRolloutSurface("background_wish_interview_enabled"),
    sessionId: shadowRun.id,
    sessionStatus: nextState.sessionStatus,
    stateMutation: "wish_interview_answer_drafted",
    updatedAt: answerRow.updated_at,
  });
}
