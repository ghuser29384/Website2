import { NextResponse } from "next/server";

import {
  buildMoralTradeApiRateLimitBlocker,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  PROFILE_SOURCE_SENSITIVE_TEXT_FIELDS,
  PROFILE_SYNTHESIS_SENSITIVE_TEXT_FIELDS,
  SOURCE_CONNECTION_SENSITIVE_TEXT_FIELDS,
  WISH_PROFILE_SENSITIVE_TEXT_FIELDS,
  overlayBackgroundRecordSensitiveText,
  overlayEncryptedWishEntryBody,
} from "@/lib/background-field-encryption";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export const runtime = "nodejs";

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
  headers: Record<string, string> = {},
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      ...headers,
    },
  });
}

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "profile_portability");

  if (rateLimit.limited) {
    return jsonResponse(
      {
        ok: false,
        checkedAt: new Date().toISOString(),
        error: "rate_limited",
        rateLimit: {
          limit: rateLimit.limit,
          remaining: rateLimit.remaining,
          resetAt: new Date(rateLimit.resetAt).toISOString(),
          surface: rateLimit.surface,
          windowMs: rateLimit.windowMs,
        },
        fallback:
          "Rate-limited profile export fails closed without reading or exporting viewer-owned records.",
        blockers: [buildMoralTradeApiRateLimitBlocker(rateLimit.surface)],
      },
      429,
      {
        "Retry-After": String(rateLimit.retryAfterSeconds),
      },
    );
  }

  if (!hasSupabaseEnv()) {
    return jsonResponse({ error: "Supabase is not configured." }, 503);
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return jsonResponse({ error: "Authentication required." }, 401);
  }

  const profileId = user.id;
  const [
    profile,
    wishProfile,
    wishEntries,
    personalDelegate,
    sourceConnections,
    profileSources,
    backgroundProfileSignals,
    backgroundShadowRuns,
    profileSynthesis,
    intentClaims,
    helperStrategies,
    helperRuns,
    introductionTasks,
    savedSearches,
    backgroundNotificationPreferences,
    profileDataRightRequests,
    privacyGrants,
    privacyAccessRequests,
    brokerageBounties,
    collectives,
    collectiveMemberships,
    collectiveDecisions,
    collectiveDecisionResponses,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", profileId).maybeSingle(),
    supabase.from("wish_profiles").select("*").eq("profile_id", profileId).maybeSingle(),
    supabase.from("wish_entries").select("*").eq("profile_id", profileId),
    supabase.from("personal_delegates").select("*").eq("profile_id", profileId).maybeSingle(),
    supabase.from("source_connections").select("*").eq("profile_id", profileId),
    supabase.from("profile_sources").select("*").eq("profile_id", profileId),
    supabase.from("background_profile_signals").select("*").eq("profile_id", profileId),
    supabase.from("background_shadow_runs").select("*").eq("profile_id", profileId),
    supabase.from("profile_syntheses").select("*").eq("profile_id", profileId).maybeSingle(),
    supabase.from("background_intent_claims").select("*").eq("profile_id", profileId),
    supabase.from("helper_strategies").select("*").eq("profile_id", profileId),
    supabase.from("helper_runs").select("*").eq("profile_id", profileId),
    supabase.from("match_introduction_tasks").select("*").eq("profile_id", profileId),
    supabase.from("saved_searches").select("*").eq("profile_id", profileId),
    supabase.from("background_notification_preferences").select("*").eq("profile_id", profileId),
    supabase.from("profile_data_right_requests").select("*").eq("profile_id", profileId),
    supabase.from("privacy_grants").select("*").eq("profile_id", profileId),
    supabase
      .from("privacy_access_requests")
      .select("*")
      .or(`owner_profile_id.eq.${profileId},requester_profile_id.eq.${profileId}`),
    supabase.from("brokerage_bounties").select("*").eq("profile_id", profileId),
    supabase.from("collectives").select("*").eq("owner_id", profileId),
    supabase.from("collective_members").select("*").eq("profile_id", profileId),
    supabase.from("collective_decisions").select("*").eq("created_by", profileId),
    supabase.from("collective_decision_responses").select("*").eq("profile_id", profileId),
  ]);

  const firstError = [
    profile.error,
    wishProfile.error,
    wishEntries.error,
    personalDelegate.error,
    sourceConnections.error,
    profileSources.error,
    backgroundProfileSignals.error,
    backgroundShadowRuns.error,
    profileSynthesis.error,
    intentClaims.error,
    helperStrategies.error,
    helperRuns.error,
    introductionTasks.error,
    savedSearches.error,
    backgroundNotificationPreferences.error,
    profileDataRightRequests.error,
    privacyGrants.error,
    privacyAccessRequests.error,
    brokerageBounties.error,
    collectives.error,
    collectiveMemberships.error,
    collectiveDecisions.error,
    collectiveDecisionResponses.error,
  ].find(Boolean);

  if (firstError) {
    return jsonResponse({ error: firstError.message }, 500);
  }

  const exportedWishProfile = wishProfile.data
    ? overlayBackgroundRecordSensitiveText(
        wishProfile.data,
        WISH_PROFILE_SENSITIVE_TEXT_FIELDS,
      )
    : null;
  const exportedWishEntries = (wishEntries.data ?? []).map((entry) =>
    overlayEncryptedWishEntryBody(entry),
  );
  const exportedSourceConnections = (sourceConnections.data ?? []).map((connection) =>
    overlayBackgroundRecordSensitiveText(connection, SOURCE_CONNECTION_SENSITIVE_TEXT_FIELDS),
  );
  const exportedProfileSources = (profileSources.data ?? []).map((source) =>
    overlayBackgroundRecordSensitiveText(source, PROFILE_SOURCE_SENSITIVE_TEXT_FIELDS),
  );
  const exportedProfileSynthesis = profileSynthesis.data
    ? overlayBackgroundRecordSensitiveText(
        profileSynthesis.data,
        PROFILE_SYNTHESIS_SENSITIVE_TEXT_FIELDS,
      )
    : null;

  return jsonResponse({
    exportedAt: new Date().toISOString(),
    profile: profile.data,
    wishProfile: exportedWishProfile,
    wishEntries: exportedWishEntries,
    personalDelegate: personalDelegate.data,
    sourceConnections: exportedSourceConnections,
    profileSources: exportedProfileSources,
    backgroundProfileSignals: backgroundProfileSignals.data ?? [],
    backgroundShadowRuns: backgroundShadowRuns.data ?? [],
    profileSynthesis: exportedProfileSynthesis,
    backgroundIntentClaims: intentClaims.data ?? [],
    helperStrategies: helperStrategies.data ?? [],
    helperRuns: helperRuns.data ?? [],
    introductionTasks: introductionTasks.data ?? [],
    savedSearches: savedSearches.data ?? [],
    backgroundNotificationPreferences: backgroundNotificationPreferences.data ?? [],
    profileDataRightRequests: profileDataRightRequests.data ?? [],
    privacyGrants: privacyGrants.data ?? [],
    privacyAccessRequests: privacyAccessRequests.data ?? [],
    brokerageBounties: brokerageBounties.data ?? [],
    collectives: collectives.data ?? [],
    collectiveMemberships: collectiveMemberships.data ?? [],
    collectiveDecisions: collectiveDecisions.data ?? [],
    collectiveDecisionResponses: collectiveDecisionResponses.data ?? [],
    schemaUrl: "/api/profile/schema",
    importUrl: "/api/profile/import",
    privacyNotice:
      "This export contains only records readable by the signed-in profile. It does not include other users' private wish data.",
  });
}
