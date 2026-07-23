import "server-only";

import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function loadSmartQueryCausePriorities(viewerId: string | null | undefined) {
  if (!viewerId || !hasSupabaseEnv()) return [] as string[];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("route_recommendation_profiles")
    .select("cause_priorities")
    .eq("profile_id", viewerId)
    .maybeSingle();

  if (error) {
    console.error("[smart-query] Failed to load viewer cause priorities for local ranking", {
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return data?.cause_priorities ?? [];
}
