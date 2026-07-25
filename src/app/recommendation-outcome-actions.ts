"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireViewer } from "@/lib/app-data";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EXTERNALITY_CONCERNS = new Set(["none", "low", "medium", "high"]);

function read(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function integer(formData: FormData, key: string, minimum: number, maximum: number) {
  const value = Number(read(formData, key));
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`Choose a valid value for ${key.replaceAll("_", " ")}.`);
  }
  return value;
}

function redirectWithMessage(agreementId: string, key: "error" | "message", message: string): never {
  const target = new URL(`/trade-agreements/${agreementId}`, "https://www.moraltrade.org");
  target.searchParams.set(key, message);
  target.hash = "completion";
  redirect(`${target.pathname}${target.search}${target.hash}`);
}

export async function submitRecommendationOutcomeFeedbackAction(formData: FormData) {
  const agreementId = read(formData, "agreement_id");
  if (!UUID_PATTERN.test(agreementId)) {
    throw new Error("Agreement identifier is invalid.");
  }

  const viewer = await requireViewer(`/trade-agreements/${agreementId}`);
  const supabase = await createClient();
  const typedSupabase = supabase as any;
  const agreementResult = await typedSupabase
    .from("agreements")
    .select("id,proposer_id,responder_id,status,lifecycle_status")
    .eq("id", agreementId)
    .maybeSingle();

  if (agreementResult.error || !agreementResult.data) {
    redirectWithMessage(agreementId, "error", "The completed agreement could not be loaded.");
  }
  const agreement = agreementResult.data as Record<string, unknown>;
  const participantIds = new Set([
    String(agreement.proposer_id ?? ""),
    String(agreement.responder_id ?? ""),
  ]);
  if (!participantIds.has(viewer.authUser.id)) {
    redirectWithMessage(agreementId, "error", "Only agreement participants can submit outcome feedback.");
  }
  const lifecycle = String(agreement.lifecycle_status ?? agreement.status ?? "");
  if (lifecycle !== "completed") {
    redirectWithMessage(agreementId, "error", "Outcome feedback opens after both parties confirm completion.");
  }

  const ownLightsGain = integer(formData, "own_lights_gain", 1, 5);
  const satisfaction = integer(formData, "satisfaction", 1, 5);
  const wouldHappenWithout = integer(
    formData,
    "would_happen_without_trade_percent",
    0,
    100,
  );
  const externalityConcern = read(formData, "externality_concern");
  if (!EXTERNALITY_CONCERNS.has(externalityConcern)) {
    redirectWithMessage(agreementId, "error", "Choose an externality concern level.");
  }
  const notes = read(formData, "notes").slice(0, 2_000);

  const result = await typedSupabase
    .from("recommendation_outcome_feedback")
    .upsert(
      {
        agreement_id: agreementId,
        profile_id: viewer.authUser.id,
        own_lights_gain: ownLightsGain,
        satisfaction,
        would_happen_without_trade_percent: wouldHappenWithout,
        externality_concern: externalityConcern,
        notes,
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "agreement_id,profile_id" },
    );

  if (result.error) {
    console.error("[recommendation-outcome] Failed to save completed-trade feedback", {
      agreementId,
      message: result.error.message,
      profileId: viewer.authUser.id,
    });
    redirectWithMessage(
      agreementId,
      "error",
      "Outcome feedback could not be saved. The agreement record was not changed.",
    );
  }

  revalidatePath(`/trade-agreements/${agreementId}`);
  redirectWithMessage(
    agreementId,
    "message",
    "Private outcome feedback saved. It will improve future matching after calibration gates pass.",
  );
}
