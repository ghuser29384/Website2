"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireViewer } from "@/lib/app-data";
import { getSafeInternalPath } from "@/lib/paths";
import {
  buildPersistedProfilePriorities,
  getRankedProfileCauseAreas,
  getRankedProfilePriorityLabels,
  normalizeProfilePriorityAllocation,
} from "@/lib/profile-priorities";
import { NOW_PROFILE_PRIORITY_SEARCH_LABEL } from "@/lib/profile-priority-search";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

function readOptional(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function redirectWithMessage(
  path: string,
  key: "error" | "message",
  message: string,
): never {
  const target = new URL(path, "https://www.moraltrade.org");
  target.searchParams.set(key, message);
  redirect(`${target.pathname}${target.search}${target.hash}`);
}

export async function saveProfilePrioritySearchAction(formData: FormData) {
  const returnTo = getSafeInternalPath(
    readOptional(formData, "return_to"),
    "/profile/priorities",
  );
  const successTo = getSafeInternalPath(
    readOptional(formData, "success_to"),
    "/feed",
  );

  if (!hasSupabaseEnv()) {
    redirectWithMessage(returnTo, "error", "Account storage is unavailable.");
  }

  const allocation = normalizeProfilePriorityAllocation(
    readOptional(formData, "priority_allocation"),
  );
  if (!allocation) {
    redirectWithMessage(
      returnTo,
      "error",
      "Assign at least five of your 100 sparks before saving.",
    );
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const typedSupabase = supabase as any;
  const priorityAllocations = buildPersistedProfilePriorities(allocation);
  const causes = getRankedProfileCauseAreas(allocation);
  const causePriorities = getRankedProfilePriorityLabels(allocation);
  const updatedAt = new Date().toISOString();

  const { data: updatedOnboarding, error: onboardingUpdateError } = await typedSupabase
    .from("cohort_onboarding_profiles")
    .update({
      cause_areas: causes,
      priority_allocations: priorityAllocations,
      updated_at: updatedAt,
    })
    .eq("profile_id", viewer.authUser.id)
    .select("profile_id")
    .maybeSingle();

  if (onboardingUpdateError) {
    console.error("[profile-priorities] Failed to update the saved spark allocation", {
      message: onboardingUpdateError.message,
      profileId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", "We could not save your priority allocation.");
  }

  if (!updatedOnboarding) {
    const { error: onboardingInsertError } = await typedSupabase
      .from("cohort_onboarding_profiles")
      .insert({
        cause_areas: causes,
        completed_at: updatedAt,
        first_action: "Review matching opportunities",
        participant_kind: "individual",
        primary_goal: "Personalize live opportunities",
        priority_allocations: priorityAllocations,
        profile_id: viewer.authUser.id,
        referral_source: "Profile priorities",
        status: "completed",
        updated_at: updatedAt,
      });

    if (onboardingInsertError) {
      console.error("[profile-priorities] Failed to create the saved spark allocation", {
        message: onboardingInsertError.message,
        profileId: viewer.authUser.id,
      });
      redirectWithMessage(returnTo, "error", "We could not save your priority allocation.");
    }
  }

  const { error: synthesisError } = await typedSupabase
    .from("profile_syntheses")
    .upsert(
      {
        cause_priorities: causePriorities,
        profile_id: viewer.authUser.id,
      },
      { onConflict: "profile_id" },
    );
  if (synthesisError) {
    console.error("[profile-priorities] Failed to synchronize ranked priority labels", {
      message: synthesisError.message,
      profileId: viewer.authUser.id,
    });
  }

  const { error: wishProfileError } = await typedSupabase
    .from("wish_profiles")
    .update({ causes })
    .eq("profile_id", viewer.authUser.id);
  if (wishProfileError) {
    console.error("[profile-priorities] Failed to synchronize broad profile causes", {
      message: wishProfileError.message,
      profileId: viewer.authUser.id,
    });
  }

  const { data: existingSearch, error: searchLookupError } = await supabase
    .from("saved_searches")
    .select("id")
    .eq("profile_id", viewer.authUser.id)
    .eq("label", NOW_PROFILE_PRIORITY_SEARCH_LABEL)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (searchLookupError) {
    console.error("[profile-priorities] Failed to load the Now priority search", {
      message: searchLookupError.message,
      profileId: viewer.authUser.id,
    });
  } else {
    const searchPayload = {
      cadence: "manual" as const,
      causes,
      min_score: 50,
      query: "",
      status: "active" as const,
      updated_at: updatedAt,
    };
    const searchWriteResult = existingSearch
      ? await supabase.from("saved_searches").update(searchPayload).eq("id", existingSearch.id)
      : await supabase.from("saved_searches").insert({
          ...searchPayload,
          label: NOW_PROFILE_PRIORITY_SEARCH_LABEL,
          profile_id: viewer.authUser.id,
        });

    if (searchWriteResult.error) {
      console.error("[profile-priorities] Failed to synchronize the Now priority search", {
        message: searchWriteResult.error.message,
        profileId: viewer.authUser.id,
      });
    }
  }

  for (const path of [
    "/profile/priorities",
    "/profile",
    "/dashboard",
    "/feed",
    "/moral-trade-live.html",
  ]) {
    revalidatePath(path);
  }

  redirectWithMessage(
    successTo,
    "message",
    "Priorities saved. Your feed now uses the new 100-spark allocation.",
  );
}
