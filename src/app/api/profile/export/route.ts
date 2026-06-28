import { NextResponse } from "next/server";

import {
  buildMoralTradeApiRateLimitBlocker,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import { buildBackgroundProfilePackage } from "@/lib/background-profile-package";
import {
  PROFILE_SOURCE_SENSITIVE_TEXT_FIELDS,
  PROFILE_SYNTHESIS_SENSITIVE_TEXT_FIELDS,
  SOURCE_CONNECTION_SENSITIVE_TEXT_FIELDS,
  WISH_PROFILE_SENSITIVE_TEXT_FIELDS,
  overlayBackgroundRecordSensitiveText,
  overlayEncryptedWishEntryBody,
} from "@/lib/background-field-encryption";
import {
  evaluateBackgroundPolicyDecision,
  serializeBackgroundPolicyDecisionForResponse,
} from "@/lib/background-phase-gates";
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
  const activeFreezeResult = await supabase
    .from("profile_data_right_requests")
    .select("id, status")
    .eq("profile_id", profileId)
    .eq("scope", "background_networking")
    .eq("request_type", "restriction")
    .in("status", ["open", "in_review"]);
  const privacyFreezeActive = (activeFreezeResult.data ?? []).length > 0;
  const policyDecision = evaluateBackgroundPolicyDecision({
    actionKind: "background.participant_export.generate",
    actorRole: "participant",
    controlStates: { privacyFreezeActive },
    idempotencyKey: `${profileId}:background-participant-export:${new Date()
      .toISOString()
      .slice(0, 10)}`,
    laneKey: "participant_exports",
    outputSchemaVersion: "background-participant-export-response-v1",
  });

  if (activeFreezeResult.error) {
    return jsonResponse({ error: activeFreezeResult.error.message }, 500);
  }

  if (policyDecision.verdict !== "allow") {
    return jsonResponse(
      {
        error: "background_export_unavailable",
        policyDecision: serializeBackgroundPolicyDecisionForResponse(policyDecision),
        privacyNotice:
          "Background-networking exports are unavailable while a privacy freeze, hold, emergency stop, or stale policy gate is active.",
        schemaVersion: "background-participant-export-response-v1",
        state: policyDecision.verdict === "stale" ? "stale" : "unavailable",
      },
      409,
    );
  }

  const [
    profile,
    wishProfile,
    wishEntries,
    personalDelegate,
    sourceConnections,
    backgroundSourceSummaries,
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
    supabase
      .from("background_source_summaries")
      .select("id, source_type, allowed_field_keys, retention_expires_at, status, approved_at, summary_text, summary_version")
      .eq("profile_id", profileId),
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
    backgroundSourceSummaries.error,
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
  const exportedBackgroundProfileSignals = (backgroundProfileSignals.data ?? []).map(
    (signal) => ({
      allowed_field_key: signal.allowed_field_key,
      confirmed_at: signal.confirmed_at ?? null,
      lineage_status: signal.lineage_status ?? null,
      purpose_code: signal.purpose_code ?? null,
      purpose_policy_version: signal.purpose_policy_version ?? null,
      retention_expires_at: signal.expires_at ?? null,
      signal_value: signal.signal_value,
      source: signal.source,
      status: signal.status,
    }),
  );
  const exportedBackgroundShadowRuns = (backgroundShadowRuns.data ?? []).map((run) => ({
    created_at: run.created_at,
    id: run.id,
    purpose: run.purpose,
    was_promoted: run.was_promoted,
  }));
  const exportedHelperRuns = (helperRuns.data ?? []).map((run) => ({
    completed_at: run.completed_at,
    created_at: run.created_at,
    id: run.id,
    purpose_code: run.purpose_code ?? null,
    purpose_policy_version: run.purpose_policy_version ?? null,
    status: run.status,
  }));
  const exportedPrivacyGrants = (privacyGrants.data ?? []).map((grant) => ({
    access_level: grant.access_level,
    audience_stage: grant.audience_stage,
    created_at: grant.created_at,
    expires_at: grant.expires_at,
    field_key: grant.field_key,
    status: grant.status,
    updated_at: grant.updated_at,
  }));

  const exportedAt = new Date().toISOString();
  const backgroundProfilePackage = buildBackgroundProfilePackage({
    backgroundProfileSignals: exportedBackgroundProfileSignals,
    exportedAt,
    privacyGrants: exportedPrivacyGrants,
    sourceSummaries: backgroundSourceSummaries.data ?? [],
    subject: {
      id: profileId,
      kind: exportedWishProfile?.participant_kind === "collective" ? "collective" : "participant",
    },
    wishProfile: exportedWishProfile,
  });

  return jsonResponse({
    backgroundProfilePackage,
    exportedAt,
    profile: profile.data,
    schemaVersion: "background-participant-export-response-v1",
    wishProfile: exportedWishProfile,
    wishEntries: exportedWishEntries,
    personalDelegate: personalDelegate.data,
    sourceConnections: exportedSourceConnections,
    profileSources: exportedProfileSources,
    backgroundProfileSignals: exportedBackgroundProfileSignals,
    backgroundShadowRuns: exportedBackgroundShadowRuns,
    profileSynthesis: exportedProfileSynthesis,
    backgroundIntentClaims: intentClaims.data ?? [],
    helperStrategies: helperStrategies.data ?? [],
    helperRuns: exportedHelperRuns,
    introductionTasks: [],
    savedSearches: savedSearches.data ?? [],
    backgroundNotificationPreferences: backgroundNotificationPreferences.data ?? [],
    profileDataRightRequests: profileDataRightRequests.data ?? [],
    privacyGrants: exportedPrivacyGrants,
    privacyAccessRequests: [],
    brokerageBounties: brokerageBounties.data ?? [],
    collectives: collectives.data ?? [],
    collectiveMemberships: collectiveMemberships.data ?? [],
    collectiveDecisions: collectiveDecisions.data ?? [],
    collectiveDecisionResponses: collectiveDecisionResponses.data ?? [],
    schemaUrl: "/api/profile/schema",
    importUrl: "/api/profile/import",
    privacyNotice:
      "This export contains only participant-owned records and sanitized background-networking metadata. It excludes counterparty identifiers, hidden blockers, internal policy decisions, rare-combination internals, raw source text, and third-party private data.",
  });
}
