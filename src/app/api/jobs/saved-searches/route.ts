import { NextResponse } from "next/server";

import {
  evaluateDeterministicMatch,
  getDeterministicSignalsFromSynthesis,
} from "@/lib/background-networking";
import { insertWishNotificationsWithSafeEmail } from "@/lib/background-notifications";
import { isCronRequestAuthorized } from "@/lib/cron";
import type { Database } from "@/lib/supabase/database.types";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type SavedSearchRow = Database["public"]["Tables"]["saved_searches"]["Row"];
type WishProfilePreviewRow = Database["public"]["Views"]["wish_profile_previews"]["Row"];
type WishProfileRow = Database["public"]["Tables"]["wish_profiles"]["Row"];
type ProfileSynthesisRow = Database["public"]["Tables"]["profile_syntheses"]["Row"];

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
  const dueProfileIds = [...new Set(dueSearches.map((search) => search.profile_id))];

  const [
    { data: ownerProfiles, error: ownerProfilesError },
    { data: ownerSyntheses, error: ownerSynthesesError },
    { data: previewSyntheses, error: previewSynthesesError },
  ] = await Promise.all([
    dueProfileIds.length
      ? supabase.from("wish_profiles").select("*").in("profile_id", dueProfileIds)
      : Promise.resolve({ data: [] as WishProfileRow[], error: null }),
    dueProfileIds.length
      ? supabase.from("profile_syntheses").select("*").in("profile_id", dueProfileIds)
      : Promise.resolve({ data: [] as ProfileSynthesisRow[], error: null }),
    previewRows.length
      ? supabase
          .from("profile_syntheses")
          .select("*")
          .in(
            "profile_id",
            previewRows.map((preview) => preview.profile_id),
          )
      : Promise.resolve({ data: [] as ProfileSynthesisRow[], error: null }),
  ]);

  if (ownerProfilesError || ownerSynthesesError || previewSynthesesError) {
    return NextResponse.json(
      {
        error:
          ownerProfilesError?.message ??
          ownerSynthesesError?.message ??
          previewSynthesesError?.message,
      },
      { status: 500 },
    );
  }

  const ownerProfileById = new Map(
    ((ownerProfiles ?? []) as WishProfileRow[]).map((profile) => [profile.profile_id, profile]),
  );
  const ownerSynthesisById = new Map(
    ((ownerSyntheses ?? []) as ProfileSynthesisRow[]).map((synthesis) => [
      synthesis.profile_id,
      synthesis,
    ]),
  );
  const previewSynthesisById = new Map(
    ((previewSyntheses ?? []) as ProfileSynthesisRow[]).map((synthesis) => [
      synthesis.profile_id,
      synthesis,
    ]),
  );

  let searchesProcessed = 0;
  let candidatesScanned = 0;
  let matchesCreated = 0;
  let matchesRefreshed = 0;

  for (const search of dueSearches) {
    const ownerProfile = ownerProfileById.get(search.profile_id);

    if (!ownerProfile) {
      await supabase
        .from("saved_searches")
        .update({ last_scanned_at: now.toISOString() })
        .eq("id", search.id);
      continue;
    }

    const ownerSignals = getDeterministicSignalsFromSynthesis(
      ownerSynthesisById.get(search.profile_id) ?? null,
    );
    let runCreated = 0;
    let runRefreshed = 0;
    let runCandidates = 0;

    for (const preview of previewRows) {
      if (preview.profile_id === search.profile_id || !preview.background_search_enabled) {
        continue;
      }

      runCandidates += 1;
      const evaluation = evaluateDeterministicMatch({
        counterparty: preview,
        counterpartySignals: getDeterministicSignalsFromSynthesis(
          previewSynthesisById.get(preview.profile_id) ?? null,
        ),
        runLabel: `saved-search:${search.id}`,
        viewer: {
          askText: search.query,
          askTerms: ownerSignals?.askTerms,
          brokeragePreference: ownerProfile.brokerage_preference,
          capabilityTags: ownerSignals?.capabilityTags,
          causes: search.causes.length ? search.causes : ownerProfile.causes,
          collectiveName: ownerProfile.collective_name,
          locationCity: ownerProfile.location_city,
          locationRegion: ownerProfile.location_region,
          offerTerms: ownerSignals?.offerTerms,
          offerText: ownerProfile.capabilities,
          openToPayment: ownerProfile.openness_to_payment,
          openToPledges: ownerProfile.openness_to_pledges,
          participantKind: ownerProfile.participant_kind,
          privacyStage: ownerProfile.privacy_stage,
          publicPreview: ownerProfile.public_preview,
          signals: ownerSignals,
          sourceCount: ownerSignals?.sourceCount,
          wishText: search.query,
        },
      });

      if (evaluation.score < search.min_score) {
        continue;
      }

      const { profileAId, profileBId, viewerIsProfileA } = getOrderedProfilePair(
        search.profile_id,
        preview.profile_id,
      );
      const dedupeKey = [
        profileAId,
        profileBId,
        search.id,
        preview.profile_id,
      ].join(":");
      const { data: existingMatch } = await supabase
        .from("match_suggestions")
        .select("id, status")
        .eq("dedupe_key", dedupeKey)
        .maybeSingle();

      if (existingMatch?.status === "dismissed" || existingMatch?.status === "archived") {
        continue;
      }

      const reasonForSearchOwner = `${evaluation.viewerReason} This came from one of your saved searches.`;
      const reasonForCounterparty =
        "A possible counterparty matched one of your broad registry previews through a saved-search scan. No exact wishes, private search text, or contact details were disclosed.";
      const { error: upsertError } = await supabase.from("match_suggestions").upsert(
        {
          profile_a_id: profileAId,
          profile_b_id: profileBId,
          profile_a_entry_id: null,
          profile_b_entry_id: null,
          reason_for_a: viewerIsProfileA ? reasonForSearchOwner : reasonForCounterparty,
          reason_for_b: viewerIsProfileA ? reasonForCounterparty : reasonForSearchOwner,
          score: evaluation.score,
          match_basis: [
            ...evaluation.compatibilityTags.map((tag) => `Compatibility tag: ${tag}`),
            "Saved search hit",
          ],
          shared_causes: evaluation.sharedCauses,
          suggested_first_step: evaluation.suggestedFirstStep,
          risk_notes: evaluation.riskNotes,
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
        const notificationResult = await insertWishNotificationsWithSafeEmail({
          notifications: [
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
          ],
          supabase,
        });

        if (notificationResult.notificationError || notificationResult.emailError) {
          console.error("[background-networking] Failed to notify saved-search match participants", {
            emailError: notificationResult.emailError?.message ?? null,
            matchDedupeKey: dedupeKey,
            notificationError: notificationResult.notificationError?.message ?? null,
          });
        }
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
