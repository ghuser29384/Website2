"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  getAccountActivationState,
  getWalkthroughActivationDestination,
} from "@/lib/account-activation";
import { getViewer } from "@/lib/app-data";
import { hasSupabaseAuthCookie } from "@/lib/supabase/auth-cookie";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createServiceClient } from "@/lib/supabase/server";
import {
  buildWalkthroughCompleteProfilePath,
  createWalkthroughProfileDraft,
  encodeWalkthroughProfileDraft,
  WALKTHROUGH_PROFILE_COOKIE_NAME,
  WALKTHROUGH_PROFILE_MAX_AGE_SECONDS,
} from "@/lib/walkthrough-profile";

function read(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function redirectWithError(message: string): never {
  redirect(`/walkthrough?error=${encodeURIComponent(message)}`);
}

export async function completeWalkthroughActivationAction(formData: FormData) {
  const draft = createWalkthroughProfileDraft({
    originalCause: read(formData, "walkthrough_cause"),
    causeArea: read(formData, "cause_area"),
    offerType: read(formData, "offer_type"),
    matchName: read(formData, "match_name"),
    matchGet: read(formData, "match_get"),
    matchGive: read(formData, "match_give"),
    participantKind: read(formData, "participant_kind"),
    primaryGoal: read(formData, "primary_goal"),
    firstAction: read(formData, "first_action"),
  });

  if (!draft) {
    redirectWithError("The starter profile draft could not be verified. Open a match and try again.");
  }

  const cookieStore = await cookies();
  cookieStore.set(WALKTHROUGH_PROFILE_COOKIE_NAME, encodeWalkthroughProfileDraft(draft), {
    httpOnly: true,
    maxAge: WALKTHROUGH_PROFILE_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  const authenticatedHint = hasSupabaseAuthCookie(cookieStore.getAll());

  if (!authenticatedHint) {
    redirect("/signup?method=email&returnTo=%2Fwalkthrough");
  }

  if (!hasSupabaseEnv()) {
    redirectWithError("Account storage is unavailable. Your setup stage was not changed.");
  }

  const viewer = await getViewer();

  if (!viewer) {
    redirectWithError("Your authenticated profile could not be loaded. Nothing was changed.");
  }
  const activationState = getAccountActivationState({
    authenticated: true,
    viewer,
  });
  const existingDestination = getWalkthroughActivationDestination(activationState);

  if (existingDestination) {
    redirect(existingDestination);
  }

  if (activationState.kind !== "available") {
    redirectWithError("Your persisted setup stage is unavailable. Nothing was changed.");
  }

  let transitionError: { message?: string } | null = null;
  let transitionedStage: string | null = null;

  try {
    const serviceSupabase = createServiceClient();
    const { data, error } = await serviceSupabase.rpc(
      "complete_walkthrough_activation_v1",
      {
        p_actor_profile_id: viewer.authUser.id,
        p_profile_id: viewer.authUser.id,
      },
    );
    transitionError = error;
    transitionedStage = data;
  } catch (error) {
    transitionError = {
      message: error instanceof Error ? error.message : "Unknown activation transition error",
    };
  }

  if (transitionError || transitionedStage !== "sparks_required") {
    console.error("Failed to persist walkthrough activation", {
      reason: transitionError ? "transition_error" : "unexpected_stage",
    });
    redirectWithError("Walkthrough completion was not saved. Review & refine to retry safely.");
  }

  redirect(buildWalkthroughCompleteProfilePath(draft));
}
