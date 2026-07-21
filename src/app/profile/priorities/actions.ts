"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireViewer } from "@/lib/app-data";
import { getSafeInternalPath } from "@/lib/paths";
import {
  NOW_PROFILE_PRIORITY_SEARCH_LABEL,
  normalizeNowProfilePriorityCauses,
} from "@/lib/profile-priority-search";
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
    "/moral-trade-live.html#now",
  );

  if (!hasSupabaseEnv()) {
    redirectWithMessage(returnTo, "error", "Account storage is unavailable.");
  }

  const viewer = await requireViewer(returnTo);
  const causes = normalizeNowProfilePriorityCauses(formData.getAll("cause_area"));

  if (!causes.length) {
    redirectWithMessage(returnTo, "error", "Choose at least one cause area.");
  }

  const supabase = await createClient();
  const { data: existingSearch, error: lookupError } = await supabase
    .from("saved_searches")
    .select("id")
    .eq("profile_id", viewer.authUser.id)
    .eq("label", NOW_PROFILE_PRIORITY_SEARCH_LABEL)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lookupError) {
    console.error("[profile-priorities] Failed to load the Now priority search", {
      message: lookupError.message,
      profileId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", "We could not load your saved priorities.");
  }

  const searchPayload = {
    cadence: "manual" as const,
    causes,
    min_score: 50,
    query: "",
    status: "active" as const,
    updated_at: new Date().toISOString(),
  };
  const writeResult = existingSearch
    ? await supabase.from("saved_searches").update(searchPayload).eq("id", existingSearch.id)
    : await supabase.from("saved_searches").insert({
        ...searchPayload,
        label: NOW_PROFILE_PRIORITY_SEARCH_LABEL,
        profile_id: viewer.authUser.id,
      });

  if (writeResult.error) {
    console.error("[profile-priorities] Failed to save the Now priority search", {
      message: writeResult.error.message,
      profileId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", "We could not save your priorities.");
  }

  revalidatePath("/profile/priorities");
  revalidatePath("/moral-trade-live.html");
  redirectWithMessage(successTo, "message", "Priorities saved. Now is personalized.");
}
