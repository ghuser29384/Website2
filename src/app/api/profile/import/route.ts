import { NextResponse } from "next/server";

import { buildDeterministicSynthesis } from "@/lib/background-networking";
import {
  buildMoralTradeApiRateLimitBlocker,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/supabase/database.types";

export const runtime = "nodejs";

type WishProfileInsert = Database["public"]["Tables"]["wish_profiles"]["Insert"];
type WishEntryInsert = Database["public"]["Tables"]["wish_entries"]["Insert"];
type PersonalDelegateInsert = Database["public"]["Tables"]["personal_delegates"]["Insert"];
type SourceConnectionInsert = Database["public"]["Tables"]["source_connections"]["Insert"];
type ProfileSourceInsert = Database["public"]["Tables"]["profile_sources"]["Insert"];
type HelperStrategyInsert = Database["public"]["Tables"]["helper_strategies"]["Insert"];
type SavedSearchInsert = Database["public"]["Tables"]["saved_searches"]["Insert"];
type BrokerageBountyInsert = Database["public"]["Tables"]["brokerage_bounties"]["Insert"];
type BackgroundNotificationPreferenceInsert =
  Database["public"]["Tables"]["background_notification_preferences"]["Insert"];
type ImportTableMap = {
  background_notification_preferences: BackgroundNotificationPreferenceInsert;
  brokerage_bounties: BrokerageBountyInsert;
  helper_strategies: HelperStrategyInsert;
  profile_sources: ProfileSourceInsert;
  saved_searches: SavedSearchInsert;
  source_connections: SourceConnectionInsert;
};

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

export async function POST(request: Request) {
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
          "Rate-limited profile import fails closed without reading the import payload or writing viewer-owned records.",
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

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

  if (!body) {
    return jsonResponse({ error: "Invalid JSON payload." }, 400);
  }

  const replaceExisting = body.replaceExisting === true;
  const profileId = user.id;
  const importedCounts = {
    backgroundNotificationPreferences: 0,
    brokerageBounties: 0,
    helperStrategies: 0,
    personalDelegate: 0,
    profileSources: 0,
    savedSearches: 0,
    sourceConnections: 0,
    wishEntries: 0,
    wishProfile: 0,
  };

  if (replaceExisting) {
    await Promise.all([
      supabase.from("brokerage_bounties").delete().eq("profile_id", profileId),
      supabase.from("background_notification_preferences").delete().eq("profile_id", profileId),
      supabase.from("helper_strategies").delete().eq("profile_id", profileId),
      supabase.from("profile_sources").delete().eq("profile_id", profileId),
      supabase.from("saved_searches").delete().eq("profile_id", profileId),
      supabase.from("source_connections").delete().eq("profile_id", profileId),
      supabase.from("wish_entries").delete().eq("profile_id", profileId),
      supabase.from("wish_profiles").delete().eq("profile_id", profileId),
    ]);
  }

  const wishProfile = body.wishProfile as Record<string, unknown> | undefined;
  if (wishProfile) {
    const payload: WishProfileInsert = {
      profile_id: profileId,
      participant_kind:
        wishProfile.participant_kind === "collective" || wishProfile.participant_kind === "institution"
          ? (wishProfile.participant_kind as WishProfileInsert["participant_kind"])
          : "individual",
      collective_name: String(wishProfile.collective_name ?? ""),
      causes: Array.isArray(wishProfile.causes)
        ? wishProfile.causes.map((value) => String(value ?? "")).filter(Boolean)
        : [],
      location_city: String(wishProfile.location_city ?? "") || null,
      location_region: String(wishProfile.location_region ?? "") || null,
      capabilities: String(wishProfile.capabilities ?? ""),
      constraints: String(wishProfile.constraints ?? ""),
      verification_preferences: String(wishProfile.verification_preferences ?? ""),
      uncertainty_notes: String(wishProfile.uncertainty_notes ?? ""),
      openness_to_payment: wishProfile.openness_to_payment === true,
      openness_to_pledges: wishProfile.openness_to_pledges === true,
      background_search_enabled: wishProfile.background_search_enabled === true,
      manual_source_review_enabled: wishProfile.manual_source_review_enabled === true,
      notification_email_enabled: wishProfile.notification_email_enabled === true,
      notification_dashboard_enabled: wishProfile.notification_dashboard_enabled !== false,
      privacy_stage:
        wishProfile.privacy_stage === "strict" || wishProfile.privacy_stage === "limited"
          ? (wishProfile.privacy_stage as WishProfileInsert["privacy_stage"])
          : "broad",
      brokerage_preference: String(wishProfile.brokerage_preference ?? ""),
      match_frequency:
        wishProfile.match_frequency === "manual" || wishProfile.match_frequency === "monthly"
          ? (wishProfile.match_frequency as WishProfileInsert["match_frequency"])
          : "weekly",
      is_discoverable: wishProfile.is_discoverable === true,
      share_public_preview: wishProfile.share_public_preview === true,
      share_location: wishProfile.share_location === true,
      public_preview: String(wishProfile.public_preview ?? ""),
      safety_status: "clear",
      safety_notes: "",
    };

    const { error } = await supabase
      .from("wish_profiles")
      .upsert(payload, { onConflict: "profile_id" });

    if (error) {
      return jsonResponse({ error: error.message }, 500);
    }

    importedCounts.wishProfile = 1;
  }

  const wishEntries = Array.isArray(body.wishEntries) ? body.wishEntries : [];
  if (wishEntries.length) {
    const payload = wishEntries.map((entry) => {
      const row = entry as Record<string, unknown>;
      return {
        profile_id: profileId,
        entry_type:
          row.entry_type === "offer" || row.entry_type === "ask" ? row.entry_type : "wish",
        cause_area: String(row.cause_area ?? ""),
        title: String(row.title ?? ""),
        body: String(row.body ?? ""),
        trade_mode:
          row.trade_mode === "pledge" || row.trade_mode === "donation" || row.trade_mode === "payment"
            ? (row.trade_mode as WishEntryInsert["trade_mode"])
            : "open",
        visibility: row.visibility === "preview" || row.visibility === "public" ? "preview" : "private",
        safety_status: "clear",
      } satisfies WishEntryInsert;
    });

    const { error } = await supabase.from("wish_entries").insert(payload);
    if (error) {
      return jsonResponse({ error: error.message }, 500);
    }

    importedCounts.wishEntries = payload.length;
  }

  const personalDelegate = body.personalDelegate as Record<string, unknown> | undefined;
  if (personalDelegate) {
    const payload: PersonalDelegateInsert = {
      profile_id: profileId,
      label: String(personalDelegate.label ?? "Personal delegate"),
      goals: Array.isArray(personalDelegate.goals)
        ? personalDelegate.goals.map((value) => String(value ?? "")).filter(Boolean)
        : [],
      operating_mode:
        personalDelegate.operating_mode === "active" || personalDelegate.operating_mode === "paused"
          ? (personalDelegate.operating_mode as PersonalDelegateInsert["operating_mode"])
          : "passive",
      search_scope: String(personalDelegate.search_scope ?? ""),
      risk_tolerance:
        personalDelegate.risk_tolerance === "moderate" ||
        personalDelegate.risk_tolerance === "exploratory"
          ? (personalDelegate.risk_tolerance as PersonalDelegateInsert["risk_tolerance"])
          : "conservative",
      introduction_policy:
        personalDelegate.introduction_policy === "auto_draft_only"
          ? "auto_draft_only"
          : "ask_each_time",
      max_weekly_suggestions: Math.max(
        0,
        Math.min(50, Number(personalDelegate.max_weekly_suggestions ?? 5) || 5),
      ),
      status: personalDelegate.status === "paused" ? "paused" : "active",
    };

    const { error } = await supabase
      .from("personal_delegates")
      .upsert(payload, { onConflict: "profile_id" });

    if (error) {
      return jsonResponse({ error: error.message }, 500);
    }

    importedCounts.personalDelegate = 1;
  }

  async function importRows<K extends keyof ImportTableMap>({
    rows,
    mapRow,
    table,
    countKey,
  }: {
    countKey: keyof typeof importedCounts;
    mapRow: (row: Record<string, unknown>) => ImportTableMap[K];
    rows: unknown[];
    table: K;
  }) {
    if (!rows.length) {
      return null;
    }

    const payload = rows.map((row) => mapRow(row as Record<string, unknown>));
    let error: { message: string } | null = null;

    switch (table) {
      case "source_connections":
        ({ error } = await supabase
          .from("source_connections")
          .insert(payload as SourceConnectionInsert[]));
        break;
      case "profile_sources":
        ({ error } = await supabase
          .from("profile_sources")
          .insert(payload as ProfileSourceInsert[]));
        break;
      case "helper_strategies":
        ({ error } = await supabase
          .from("helper_strategies")
          .insert(payload as HelperStrategyInsert[]));
        break;
      case "saved_searches":
        ({ error } = await supabase
          .from("saved_searches")
          .insert(payload as SavedSearchInsert[]));
        break;
      case "brokerage_bounties":
        ({ error } = await supabase
          .from("brokerage_bounties")
          .insert(payload as BrokerageBountyInsert[]));
        break;
      case "background_notification_preferences":
        ({ error } = await supabase
          .from("background_notification_preferences")
          .upsert(payload as BackgroundNotificationPreferenceInsert[], {
            onConflict: "profile_id,event_kind,channel",
          }));
        break;
      default:
        error = { message: "Unsupported import table." };
    }

    if (error) {
      throw new Error(error.message);
    }

    importedCounts[countKey] = payload.length;
    return payload.length;
  }

  try {
    await importRows({
      rows: Array.isArray(body.sourceConnections) ? body.sourceConnections : [],
      table: "source_connections",
      countKey: "sourceConnections",
      mapRow: (row) => ({
        profile_id: profileId,
        provider:
          row.provider === "social" ||
          row.provider === "blog" ||
          row.provider === "email" ||
          row.provider === "calendar" ||
          row.provider === "chat_history" ||
          row.provider === "search_profile" ||
          row.provider === "other"
            ? (row.provider as SourceConnectionInsert["provider"])
            : "manual",
        label: String(row.label ?? ""),
        url: String(row.url ?? ""),
        access_status:
          row.access_status === "connected" ||
          row.access_status === "revoked" ||
          row.access_status === "needs_review"
            ? (row.access_status as SourceConnectionInsert["access_status"])
            : "not_connected",
        access_scope: String(row.access_scope ?? ""),
        consent_notes: String(row.consent_notes ?? ""),
        import_mode:
          row.import_mode === "manual_paste" ||
          row.import_mode === "rss_pull" ||
          row.import_mode === "forwarded_note"
            ? (row.import_mode as SourceConnectionInsert["import_mode"])
            : "manual_review",
        sync_frequency:
          row.sync_frequency === "weekly" || row.sync_frequency === "monthly"
            ? (row.sync_frequency as SourceConnectionInsert["sync_frequency"])
            : "manual",
        last_sync_summary: String(row.last_sync_summary ?? ""),
        last_import_item_count: Math.max(0, Number(row.last_import_item_count ?? 0) || 0),
        last_imported_at:
          typeof row.last_imported_at === "string" && row.last_imported_at
            ? row.last_imported_at
            : null,
      }),
    });

    await importRows({
      rows: Array.isArray(body.profileSources) ? body.profileSources : [],
      table: "profile_sources",
      countKey: "profileSources",
      mapRow: (row) => ({
        profile_id: profileId,
        source_type:
          row.source_type === "social" ||
          row.source_type === "blog" ||
          row.source_type === "chat_history" ||
          row.source_type === "email" ||
          row.source_type === "calendar" ||
          row.source_type === "other"
            ? (row.source_type as ProfileSourceInsert["source_type"])
            : "manual",
        label: String(row.label ?? ""),
        url: String(row.url ?? ""),
        access_level:
          row.access_level === "metadata_only" || row.access_level === "none"
            ? (row.access_level as ProfileSourceInsert["access_level"])
            : "manual_summary",
        content_kind:
          row.content_kind === "pasted_excerpt" ||
          row.content_kind === "public_post" ||
          row.content_kind === "email_note" ||
          row.content_kind === "chat_note" ||
          row.content_kind === "calendar_note"
            ? (row.content_kind as ProfileSourceInsert["content_kind"])
            : "manual_summary",
        notes: String(row.notes ?? ""),
        snapshot_excerpt: String(row.snapshot_excerpt ?? ""),
        captured_tags: Array.isArray(row.captured_tags)
          ? row.captured_tags.map((value) => String(value ?? "")).filter(Boolean)
          : [],
        needs_review: row.needs_review !== false,
        imported_at:
          typeof row.imported_at === "string" && row.imported_at ? row.imported_at : null,
        is_active: row.is_active !== false,
      }),
    });

    await importRows({
      rows: Array.isArray(body.helperStrategies) ? body.helperStrategies : [],
      table: "helper_strategies",
      countKey: "helperStrategies",
      mapRow: (row) => ({
        profile_id: profileId,
        helper_kind:
          row.helper_kind === "payment_compatibility" ||
          row.helper_kind === "geographic" ||
          row.helper_kind === "network_expansion" ||
          row.helper_kind === "saved_search" ||
          row.helper_kind === "risk_filter"
            ? (row.helper_kind as HelperStrategyInsert["helper_kind"])
            : "cause_overlap",
        label: String(row.label ?? ""),
        priority: Math.max(1, Math.min(5, Number(row.priority ?? 3) || 3)),
        min_score: Math.max(0, Math.min(100, Number(row.min_score ?? 55) || 55)),
        strategy_config:
          typeof row.strategy_config === "object" && row.strategy_config
            ? (row.strategy_config as Record<string, unknown>)
            : {},
        status: row.status === "paused" ? "paused" : "active",
      }),
    });

    await importRows({
      rows: Array.isArray(body.savedSearches) ? body.savedSearches : [],
      table: "saved_searches",
      countKey: "savedSearches",
      mapRow: (row) => ({
        profile_id: profileId,
        label: String(row.label ?? ""),
        query: String(row.query ?? ""),
        causes: Array.isArray(row.causes)
          ? row.causes.map((value) => String(value ?? "")).filter(Boolean)
          : [],
        cadence:
          row.cadence === "weekly" || row.cadence === "monthly"
            ? (row.cadence as SavedSearchInsert["cadence"])
            : "manual",
        filters_json:
          typeof row.filters_json === "object" && row.filters_json
            ? (row.filters_json as Json)
            : {},
        min_score: Math.max(0, Math.min(100, Number(row.min_score ?? 50) || 50)),
        notify_on_live_match: row.notify_on_live_match !== false,
        source_route:
          typeof row.source_route === "string" && row.source_route.startsWith("/offers")
            ? row.source_route.slice(0, 500)
            : "/dashboard",
        status: row.status === "paused" ? "paused" : "active",
      }),
    });

    await importRows({
      rows: Array.isArray(body.backgroundNotificationPreferences)
        ? body.backgroundNotificationPreferences
        : [],
      table: "background_notification_preferences",
      countKey: "backgroundNotificationPreferences",
      mapRow: (row) => ({
        profile_id: profileId,
        event_kind:
          row.event_kind === "consent_decisions" ||
          row.event_kind === "introduction_updates" ||
          row.event_kind === "grant_activity" ||
          row.event_kind === "operator_review" ||
          row.event_kind === "safety_review"
            ? (row.event_kind as BackgroundNotificationPreferenceInsert["event_kind"])
            : "match_suggestions",
        channel:
          row.channel === "email_digest" || row.channel === "web_push"
            ? (row.channel as BackgroundNotificationPreferenceInsert["channel"])
            : "in_app",
        enabled: row.enabled !== false,
        digest_cadence:
          row.digest_cadence === "immediate" ||
          row.digest_cadence === "weekly" ||
          row.digest_cadence === "none"
            ? (row.digest_cadence as BackgroundNotificationPreferenceInsert["digest_cadence"])
            : "daily",
      }),
    });

    await importRows({
      rows: Array.isArray(body.brokerageBounties) ? body.brokerageBounties : [],
      table: "brokerage_bounties",
      countKey: "brokerageBounties",
      mapRow: (row) => ({
        profile_id: profileId,
        label: String(row.label ?? ""),
        target_kind:
          row.target_kind === "group" ||
          row.target_kind === "institution" ||
          row.target_kind === "public_call"
            ? (row.target_kind as BrokerageBountyInsert["target_kind"])
            : "counterparty",
        cause_area: String(row.cause_area ?? ""),
        max_amount_cents: Math.max(0, Number(row.max_amount_cents ?? 0) || 0),
        currency: String(row.currency ?? "usd").toLowerCase(),
        reward_type:
          row.reward_type === "verified_trade" ||
          row.reward_type === "group_formation" ||
          row.reward_type === "research_lead"
            ? (row.reward_type as BrokerageBountyInsert["reward_type"])
            : "introduction",
        preferred_regions: Array.isArray(row.preferred_regions)
          ? row.preferred_regions.map((value) => String(value ?? "")).filter(Boolean)
          : [],
        success_condition: String(row.success_condition ?? ""),
        target_note: String(row.target_note ?? ""),
        status: row.status === "paused" ? "paused" : "active",
      }),
    });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Import failed." },
      500,
    );
  }

  const [
    { data: profileRow, error: profileError },
    { data: entryRows, error: entryError },
    { data: profileSourceRows, error: sourceError },
    { data: sourceConnectionRows, error: connectionError },
  ] = await Promise.all([
    supabase.from("wish_profiles").select("*").eq("profile_id", profileId).maybeSingle(),
    supabase.from("wish_entries").select("*").eq("profile_id", profileId),
    supabase.from("profile_sources").select("*").eq("profile_id", profileId),
    supabase.from("source_connections").select("*").eq("profile_id", profileId),
  ]);

  if (!profileError && !entryError && !sourceError && !connectionError && profileRow) {
    const synthesis = buildDeterministicSynthesis({
      connections: (sourceConnectionRows ?? []) as Database["public"]["Tables"]["source_connections"]["Row"][],
      entries: (entryRows ?? []) as Database["public"]["Tables"]["wish_entries"]["Row"][],
      profile: profileRow,
      profileSources: (profileSourceRows ?? []) as Database["public"]["Tables"]["profile_sources"]["Row"][],
    });

    await supabase.from("profile_syntheses").upsert(
      {
        profile_id: profileId,
        ...synthesis,
      },
      { onConflict: "profile_id" },
    );
  }

  return jsonResponse({
    importedCounts,
    importedFor: profileId,
    replaceExisting,
    status: "ok",
  });
}
