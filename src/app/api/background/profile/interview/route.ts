import { NextResponse } from "next/server";

import {
  prepareRecordSensitiveTextFields,
} from "@/lib/background-field-encryption";
import { buildProfileInterviewAnswerRow } from "@/lib/background-opportunity-briefs";
import {
  buildBackgroundDisabledLaneResponse,
  evaluateBackgroundPolicyDecision,
} from "@/lib/background-phase-gates";
import {
  buildBackgroundRefinementItems,
  buildGuidedWishProfileDraft,
} from "@/lib/background-refinement";
import { serializeBackgroundNetworkingRolloutSurface } from "@/lib/background-rollout";
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
    ? value.filter((entry): entry is string => typeof entry === "string").map((entry) => entry.trim()).filter(Boolean)
    : [];
}

function privateJson(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    headers: { "Cache-Control": "private, no-store" },
    status,
  });
}

async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user };
}

export async function GET() {
  if (!hasSupabaseEnv()) {
    return privateJson({ error: "Supabase is not configured." }, 503);
  }

  const { supabase, user } = await getUser();

  if (!user) {
    return privateJson({ error: "Authentication required." }, 401);
  }

  const policyDecision = evaluateBackgroundPolicyDecision({
    actionKind: "background.structured_wish_interview.read",
    actorRole: "participant",
    laneKey: "structured_wish_interview",
    outputSchemaVersion: "background-structured-wish-interview-response-v1",
  });

  if (policyDecision.verdict !== "allow") {
    return privateJson(buildBackgroundDisabledLaneResponse(policyDecision), 403);
  }

  const { data: profile, error } = await supabase
    .from("wish_profiles")
    .select(
      "causes, capabilities, verification_preferences, constraints, brokerage_preference, public_preview, uncertainty_notes, manual_source_review_enabled",
    )
    .eq("profile_id", user.id)
    .maybeSingle();

  if (error) {
    return privateJson({ error: error.message }, 500);
  }

  return privateJson({
    assistantMode: "shadow_first_user_approved_only",
    guidedWishProfileDraft: buildGuidedWishProfileDraft({
      broadPreview: profile?.public_preview ?? "",
      capabilities: profile?.capabilities ?? "",
      constraints: profile?.constraints ?? "",
      exactAsk: profile?.brokerage_preference ?? "",
      passiveModeEnabled: profile?.manual_source_review_enabled ?? false,
      uncertainty: {
        uncertaintyNotes: profile?.uncertainty_notes ?? "",
      },
      verificationPreferences: profile?.verification_preferences
        ? [profile.verification_preferences]
        : [],
    }),
    items: buildBackgroundRefinementItems({
      causeAreas: profile?.causes ?? [],
      exclusions: profile?.constraints ? [profile.constraints] : [],
      offeredCapabilities: profile?.capabilities ? [profile.capabilities] : [],
      requestedCounterpartyKinds: profile?.brokerage_preference
        ? [profile.brokerage_preference]
        : [],
      verificationPreferences: profile?.verification_preferences
        ? [profile.verification_preferences]
        : [],
    }),
    privacyNotice:
      "Refinement questions are generated from missing explicit fields. Answers stay private until separately approved for preview or matching signals.",
    policyDecisionId: policyDecision.policyDecisionId,
    rollout: serializeBackgroundNetworkingRolloutSurface("background_wish_interview_enabled"),
  });
}

export async function POST(request: Request) {
  if (!hasSupabaseEnv()) {
    return privateJson({ error: "Supabase is not configured." }, 503);
  }

  const { supabase, user } = await getUser();

  if (!user) {
    return privateJson({ error: "Authentication required." }, 401);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return privateJson({ error: "Invalid JSON body." }, 400);
  }

  if (!isRecord(body) || !stringField(body.answer)) {
    return privateJson({ error: "answer is required." }, 400);
  }

  const row = buildProfileInterviewAnswerRow({
    answer: stringField(body.answer),
    broadPreviewUpdate: stringField(body.broadPreviewUpdate),
    privateIntentUpdate: stringField(body.privateIntentUpdate),
    profileId: user.id,
    questionKey: stringField(body.questionKey),
    questionText: stringField(body.questionText),
    uncertaintyFlags: stringList(body.uncertaintyFlags),
  });
  const policyDecision = evaluateBackgroundPolicyDecision({
    actionKind: "background.structured_wish_interview.answer",
    actorRole: "participant",
    idempotencyKey: `${user.id}:${row.question_key}`,
    laneKey: "structured_wish_interview",
    outputSchemaVersion: "background-structured-wish-interview-response-v1",
  });

  if (policyDecision.verdict !== "allow") {
    return privateJson(buildBackgroundDisabledLaneResponse(policyDecision), 403);
  }

  let encryptedFields: ReturnType<typeof prepareRecordSensitiveTextFields>;

  try {
    encryptedFields = prepareRecordSensitiveTextFields({
      answer: row.answer ?? "",
      private_intent_update: row.private_intent_update ?? "",
    });
  } catch {
    return privateJson(
      { error: "Background field encryption must be configured before saving interview answers." },
      503,
    );
  }

  const { data, error } = await supabase
    .from("background_profile_interview_answers")
    .upsert(
      {
        ...row,
        answer: encryptedFields.plaintextFields.answer,
        private_intent_update: encryptedFields.plaintextFields.private_intent_update,
        sensitive_ciphertexts: encryptedFields.ciphertexts,
        sensitive_encryption_version: encryptedFields.version,
      },
      { onConflict: "profile_id,question_key" },
    )
    .select("id, updated_at")
    .maybeSingle();

  if (error || !data) {
    return privateJson({ error: error?.message ?? "Unable to save interview answer." }, 500);
  }

  return privateJson({
    id: data.id,
    policyDecisionId: policyDecision.policyDecisionId,
    rollout: serializeBackgroundNetworkingRolloutSurface("background_wish_interview_enabled"),
    stateMutation: "profile_interview_answer_saved",
    updatedAt: data.updated_at,
  });
}
