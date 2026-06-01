import { NextResponse } from "next/server";

import {
  prepareRecordSensitiveTextFields,
} from "@/lib/background-field-encryption";
import { buildProfileInterviewAnswerRow } from "@/lib/background-opportunity-briefs";
import { buildBackgroundRefinementItems } from "@/lib/background-refinement";
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

  const { data: profile, error } = await supabase
    .from("wish_profiles")
    .select("causes, capabilities, verification_preferences, constraints, brokerage_preference")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (error) {
    return privateJson({ error: error.message }, 500);
  }

  return privateJson({
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
    stateMutation: "profile_interview_answer_saved",
    updatedAt: data.updated_at,
  });
}
