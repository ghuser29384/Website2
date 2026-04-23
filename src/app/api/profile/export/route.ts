import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export const runtime = "nodejs";

export async function GET() {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const profileId = user.id;
  const [
    profile,
    wishProfile,
    wishEntries,
    personalDelegate,
    sourceConnections,
    profileSources,
    profileSynthesis,
    helperStrategies,
    helperRuns,
    savedSearches,
    privacyGrants,
    brokerageBounties,
    collectives,
    collectiveMemberships,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", profileId).maybeSingle(),
    supabase.from("wish_profiles").select("*").eq("profile_id", profileId).maybeSingle(),
    supabase.from("wish_entries").select("*").eq("profile_id", profileId),
    supabase.from("personal_delegates").select("*").eq("profile_id", profileId).maybeSingle(),
    supabase.from("source_connections").select("*").eq("profile_id", profileId),
    supabase.from("profile_sources").select("*").eq("profile_id", profileId),
    supabase.from("profile_syntheses").select("*").eq("profile_id", profileId).maybeSingle(),
    supabase.from("helper_strategies").select("*").eq("profile_id", profileId),
    supabase.from("helper_runs").select("*").eq("profile_id", profileId),
    supabase.from("saved_searches").select("*").eq("profile_id", profileId),
    supabase.from("privacy_grants").select("*").eq("profile_id", profileId),
    supabase.from("brokerage_bounties").select("*").eq("profile_id", profileId),
    supabase.from("collectives").select("*").eq("owner_id", profileId),
    supabase.from("collective_members").select("*").eq("profile_id", profileId),
  ]);

  const firstError = [
    profile.error,
    wishProfile.error,
    wishEntries.error,
    personalDelegate.error,
    sourceConnections.error,
    profileSources.error,
    profileSynthesis.error,
    helperStrategies.error,
    helperRuns.error,
    savedSearches.error,
    privacyGrants.error,
    brokerageBounties.error,
    collectives.error,
    collectiveMemberships.error,
  ].find(Boolean);

  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 500 });
  }

  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    profile: profile.data,
    wishProfile: wishProfile.data,
    wishEntries: wishEntries.data ?? [],
    personalDelegate: personalDelegate.data,
    sourceConnections: sourceConnections.data ?? [],
    profileSources: profileSources.data ?? [],
    profileSynthesis: profileSynthesis.data,
    helperStrategies: helperStrategies.data ?? [],
    helperRuns: helperRuns.data ?? [],
    savedSearches: savedSearches.data ?? [],
    privacyGrants: privacyGrants.data ?? [],
    brokerageBounties: brokerageBounties.data ?? [],
    collectives: collectives.data ?? [],
    collectiveMemberships: collectiveMemberships.data ?? [],
    privacyNotice:
      "This export contains only records readable by the signed-in profile. It does not include other users' private wish data.",
  });
}
