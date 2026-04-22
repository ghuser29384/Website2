import { NextResponse } from "next/server";

import { isCronRequestAuthorized } from "@/lib/cron";
import type { Database } from "@/lib/supabase/database.types";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type SavedSearchRow = Database["public"]["Tables"]["saved_searches"]["Row"];
type WishProfilePreviewRow = Database["public"]["Views"]["wish_profile_previews"]["Row"];

function normalizeToken(value: string) {
  return value.trim().toLowerCase();
}

function getTokens(value: string) {
  return [
    ...new Set(
      value
        .toLowerCase()
        .split(/\W+/)
        .map((token) => token.trim())
        .filter((token) => token.length > 4),
    ),
  ].slice(0, 20);
}

function isSearchDue(search: SavedSearchRow, now: Date) {
  if (search.cadence === "manual") {
    return false;
  }

  if (!search.last_scanned_at) {
    return true;
  }

  const lastScannedAt = new Date(search.last_scanned_at);
  const elapsedMs = now.getTime() - lastScannedAt.getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  if (search.cadence === "daily") {
    return elapsedMs >= dayMs;
  }

  if (search.cadence === "monthly") {
    return elapsedMs >= 30 * dayMs;
  }

  return elapsedMs >= 7 * dayMs;
}

function getOrderedProfilePair(profileId: string, counterpartyId: string) {
  return profileId < counterpartyId
    ? { profileAId: profileId, profileBId: counterpartyId, viewerIsProfileA: true }
    : { profileAId: counterpartyId, profileBId: profileId, viewerIsProfileA: false };
}

async function processSavedSearches(request: Request) {
  if (!isCronRequestAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date();
  const [{ data: searches, error: searchError }, { data: previews, error: previewError }] =
    await Promise.all([
      supabase
        .from("saved_searches")
        .select("*")
        .eq("status", "active")
        .neq("cadence", "manual")
        .order("last_scanned_at", { ascending: true, nullsFirst: true })
        .limit(100),
      supabase.from("wish_profile_previews").select("*").limit(500),
    ]);

  if (searchError || previewError) {
    return NextResponse.json(
      { error: searchError?.message ?? previewError?.message },
      { status: 500 },
    );
  }

  const dueSearches = ((searches ?? []) as SavedSearchRow[]).filter((search) =>
    isSearchDue(search, now),
  );
  const previewRows = (previews ?? []) as WishProfilePreviewRow[];
  const previewMap = new Map(previewRows.map((preview) => [preview.profile_id, preview]));
  let searchesProcessed = 0;
  let candidatesScanned = 0;
  let matchesCreated = 0;
  let matchesRefreshed = 0;

  for (const search of dueSearches) {
    const currentPreview = previewMap.get(search.profile_id);
    if (!currentPreview) {
      await supabase
        .from("saved_searches")
        .update({ last_scanned_at: now.toISOString() })
        .eq("id", search.id);
      continue;
    }

    const queryTokens = getTokens(`${search.query} ${search.causes.join(" ")}`);
    let runCreated = 0;
    let runRefreshed = 0;
    let runCandidates = 0;

    for (const preview of previewRows) {
      if (preview.profile_id === search.profile_id || !preview.background_search_enabled) {
        continue;
      }

      runCandidates += 1;
      const sharedCauses = search.causes.filter((cause) =>
        (preview.causes ?? []).map(normalizeToken).includes(normalizeToken(cause)),
      );
      const previewTokens = new Set(getTokens(`${preview.public_preview} ${preview.causes.join(" ")}`));
      const sharedTokens = queryTokens.filter((token) => previewTokens.has(token)).slice(0, 5);
      const score = Math.min(
        100,
        sharedCauses.length * 35 + sharedTokens.length * 8 + (preview.openness_to_payment ? 8 : 0),
      );

      if (score < search.min_score || (!sharedCauses.length && !sharedTokens.length)) {
        continue;
      }

      const { profileAId, profileBId, viewerIsProfileA } = getOrderedProfilePair(
        search.profile_id,
        preview.profile_id,
      );
      const dedupeKey = [
        profileAId,
        profileBId,
        normalizeToken(sharedCauses[0] ?? sharedTokens[0] ?? search.label),
      ].join(":");
      const { data: existingMatch } = await supabase
        .from("match_suggestions")
        .select("id, status")
        .eq("dedupe_key", dedupeKey)
        .maybeSingle();

      if (existingMatch?.status === "dismissed" || existingMatch?.status === "archived") {
        continue;
      }

      const reasonForSearchOwner = sharedCauses.length
        ? `Your saved search "${search.label}" matched a counterparty preview around ${sharedCauses.join(", ")}.`
        : `Your saved search "${search.label}" matched a counterparty preview with shared terms: ${sharedTokens.join(", ")}.`;
      const reasonForCounterparty = sharedCauses.length
        ? `A saved search from another participant matched your public preview around ${sharedCauses.join(", ")}.`
        : "A saved search from another participant matched your public preview.";
      const { error: upsertError } = await supabase.from("match_suggestions").upsert(
        {
          profile_a_id: profileAId,
          profile_b_id: profileBId,
          profile_a_entry_id: null,
          profile_b_entry_id: null,
          reason_for_a: viewerIsProfileA ? reasonForSearchOwner : reasonForCounterparty,
          reason_for_b: viewerIsProfileA ? reasonForCounterparty : reasonForSearchOwner,
          score,
          match_basis: [
            sharedCauses.length ? `Shared causes: ${sharedCauses.join(", ")}` : "",
            sharedTokens.length ? `Shared terms: ${sharedTokens.join(", ")}` : "",
            `Generated by saved search: ${search.label}`,
          ].filter(Boolean),
          shared_causes: sharedCauses,
          suggested_first_step:
            "If both sides opt in, exchange a bounded proposal: action, duration, cost, verification, and exit condition.",
          risk_notes:
            "Rule-based saved-search suggestion only. Review consent, legality, privacy, and verification before acting.",
          generated_by: "saved-search-cron",
          status: "suggested",
          dedupe_key: dedupeKey,
          last_scored_at: now.toISOString(),
        },
        { onConflict: "dedupe_key" },
      );

      if (upsertError) {
        continue;
      }

      if (existingMatch) {
        runRefreshed += 1;
      } else {
        runCreated += 1;
        await supabase.from("wish_notifications").insert([
          {
            profile_id: search.profile_id,
            kind: "match",
            title: "A potential moral trade was found",
            body: reasonForSearchOwner,
          },
          {
            profile_id: preview.profile_id,
            kind: "match",
            title: "A potential moral trade was found",
            body: reasonForCounterparty,
          },
        ]);
      }
    }

    await supabase.from("background_match_runs").insert({
      profile_id: search.profile_id,
      status: "completed",
      run_reason: `saved-search:${search.id}`,
      candidates_scanned: runCandidates,
      matches_created: runCreated,
      matches_refreshed: runRefreshed,
      completed_at: now.toISOString(),
    });
    await supabase
      .from("saved_searches")
      .update({ last_scanned_at: now.toISOString() })
      .eq("id", search.id);

    searchesProcessed += 1;
    candidatesScanned += runCandidates;
    matchesCreated += runCreated;
    matchesRefreshed += runRefreshed;
  }

  return NextResponse.json({
    searchesProcessed,
    candidatesScanned,
    matchesCreated,
    matchesRefreshed,
  });
}

export async function GET(request: Request) {
  return processSavedSearches(request);
}

export async function POST(request: Request) {
  return processSavedSearches(request);
}
