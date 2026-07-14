import { NextResponse } from "next/server";

import {
  evaluateDeterministicMatch,
  getDeterministicSignalsFromSynthesis,
} from "@/lib/background-networking";
import { buildBackgroundOpportunityNotificationCopy } from "@/lib/background-helper-runs";
import {
  buildMatchExplanationSnapshot,
  buildPrivacySafeMatchAuditMetadata,
  buildPrivacySafeMatchAuditSummary,
} from "@/lib/background-explanations";
import {
  BACKGROUND_CANDIDATE_BUDGET_VERSION,
  evaluateCandidateExposureForBackgroundRun,
  normalizeBackgroundCandidateAudienceScope,
  type BackgroundCandidateExposureDecision,
} from "@/lib/background-candidate-exposure";
import {
  PROFILE_SYNTHESIS_SENSITIVE_TEXT_FIELDS,
  WISH_PROFILE_SENSITIVE_TEXT_FIELDS,
  overlayBackgroundRecordSensitiveText,
} from "@/lib/background-field-encryption";
import { insertWishNotificationsWithSafeEmail } from "@/lib/background-notifications";
import {
  completeBackgroundQueryEvent,
  insertMatchExplanationSnapshots,
  recordBackgroundQueryRiskSignal,
  reserveBackgroundQueryBudget,
  upsertBackgroundOpportunityBriefs,
} from "@/lib/background-operations";
import { buildOpportunityBriefRow } from "@/lib/background-opportunity-briefs";
import { getBackgroundQueryFingerprint } from "@/lib/background-query-budget";
import {
  BACKGROUND_PURPOSE_POLICY_VERSION,
  type BackgroundPurposeBinding,
} from "@/lib/background-purpose-registry";
import { isCronRequestAuthorized } from "@/lib/cron";
import type { Database } from "@/lib/supabase/database.types";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type SavedSearchRow = Database["public"]["Tables"]["saved_searches"]["Row"];
type WishProfilePreviewRow = Database["public"]["Views"]["wish_profile_previews"]["Row"];
type WishProfileRow = Database["public"]["Tables"]["wish_profiles"]["Row"];
type ProfileSynthesisRow = Database["public"]["Tables"]["profile_syntheses"]["Row"];
type MatchSuggestionInsert = Database["public"]["Tables"]["match_suggestions"]["Insert"];

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

async function reserveCandidateExposureSurface({
  candidateProfileId,
  decision,
  purposeBinding,
  supabase,
}: {
  candidateProfileId: string;
  decision: BackgroundCandidateExposureDecision;
  purposeBinding: BackgroundPurposeBinding;
  supabase: ReturnType<typeof createServiceClient>;
}) {
  if (!decision.allowed || !decision.budgetConfig) {
    return false;
  }

  const { data, error } = await supabase.rpc("reserve_background_candidate_exposure", {
    target_audience_scope: decision.normalizedAudienceScope,
    target_budget_version: decision.candidateBudgetVersion || BACKGROUND_CANDIDATE_BUDGET_VERSION,
    target_candidate_profile_id: candidateProfileId,
    target_cohort_scope_id: "",
    target_purpose_code: purposeBinding.purposeCode,
    target_purpose_policy_version: purposeBinding.purposePolicyVersion,
    target_surface_limit: decision.budgetConfig.surfaceLimit,
    target_window_days: decision.budgetConfig.windowDays,
  });

  if (error) {
    console.error("[background-networking] Failed to reserve saved-search candidate exposure", {
      candidateProfileId,
      error: error.message,
    });
    return false;
  }

  return Boolean(data?.[0]?.allowed);
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
    { data: candidateProfiles, error: candidateProfilesError },
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
    previewRows.length
      ? supabase
          .from("wish_profiles")
          .select("*")
          .in(
            "profile_id",
            previewRows.map((preview) => preview.profile_id),
          )
      : Promise.resolve({ data: [] as WishProfileRow[], error: null }),
  ]);

  if (ownerProfilesError || ownerSynthesesError || previewSynthesesError || candidateProfilesError) {
    return NextResponse.json(
      {
        error:
          ownerProfilesError?.message ??
          ownerSynthesesError?.message ??
          previewSynthesesError?.message ??
          candidateProfilesError?.message,
      },
      { status: 500 },
    );
  }

  const ownerProfileById = new Map(
    ((ownerProfiles ?? []) as WishProfileRow[]).map((profile) => [
      profile.profile_id,
      overlayBackgroundRecordSensitiveText(profile, WISH_PROFILE_SENSITIVE_TEXT_FIELDS),
    ]),
  );
  const ownerSynthesisById = new Map(
    ((ownerSyntheses ?? []) as ProfileSynthesisRow[]).map((synthesis) => [
      synthesis.profile_id,
      overlayBackgroundRecordSensitiveText(synthesis, PROFILE_SYNTHESIS_SENSITIVE_TEXT_FIELDS),
    ]),
  );
  const previewSynthesisById = new Map(
    ((previewSyntheses ?? []) as ProfileSynthesisRow[]).map((synthesis) => [
      synthesis.profile_id,
      overlayBackgroundRecordSensitiveText(synthesis, PROFILE_SYNTHESIS_SENSITIVE_TEXT_FIELDS),
    ]),
  );
  const candidateProfileById = new Map(
    ((candidateProfiles ?? []) as WishProfileRow[]).map((profile) => [profile.profile_id, profile]),
  );
  const purposeBinding: BackgroundPurposeBinding = {
    purposeCode: "moral_trade_offer",
    purposePolicyVersion: BACKGROUND_PURPOSE_POLICY_VERSION,
  };
  const audienceScope = normalizeBackgroundCandidateAudienceScope("cohort_only");

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
    const budgetReservation = await reserveBackgroundQueryBudget({
      metadata: {
        cadence: search.cadence,
        searchId: search.id,
      },
      profileId: search.profile_id,
      queryFingerprint: getBackgroundQueryFingerprint({
        causes: search.causes,
        minScore: search.min_score,
        query: search.query,
        searchId: search.id,
      }),
      scope: "saved_search_scan",
      supabase,
    });

    if (budgetReservation.limited) {
      await recordBackgroundQueryRiskSignal({
        eventId: budgetReservation.eventId,
        metadata: {
          limit: budgetReservation.limit,
          scope: "saved_search_scan",
          searchId: search.id,
          used: budgetReservation.used,
        },
        profileId: search.profile_id,
        signalType: "background_query_budget_pressure",
        summary:
          "A saved-search scan was skipped because this profile reached its daily background query budget.",
        supabase,
      });
      await supabase
        .from("saved_searches")
        .update({ last_scanned_at: now.toISOString() })
        .eq("id", search.id);
      searchesProcessed += 1;
      continue;
    }

    let runCreated = 0;
    let runRefreshed = 0;
    let runCandidates = 0;
    const explanationSnapshots: ReturnType<typeof buildMatchExplanationSnapshot>[] = [];
    const opportunityBriefs: Database["public"]["Tables"]["background_opportunity_briefs"]["Insert"][] = [];

    for (const preview of previewRows) {
      if (preview.profile_id === search.profile_id || !preview.background_search_enabled) {
        continue;
      }

      runCandidates += 1;
      const candidateExposureDecision = evaluateCandidateExposureForBackgroundRun({
        audienceScope,
        candidateProfile: candidateProfileById.get(preview.profile_id) ?? null,
        purposeBinding,
        surfaces: ["broad_profile"],
      });

      if (!candidateExposureDecision.allowed) {
        continue;
      }

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

      const exposureReserved = await reserveCandidateExposureSurface({
        candidateProfileId: preview.profile_id,
        decision: candidateExposureDecision,
        purposeBinding,
        supabase,
      });

      if (!exposureReserved) {
        continue;
      }

      const reasonForSearchOwner = `${evaluation.viewerReason} This came from one of your saved searches.`;
      const reasonForCounterparty =
        "A possible counterparty matched one of your broad registry previews through a saved-search scan. No exact wishes, private search text, or contact details were disclosed.";
      const matchBasis = [
        ...evaluation.compatibilityTags.map((tag) => `Compatibility tag: ${tag}`),
        "Saved search hit",
      ];
      const matchPayload: MatchSuggestionInsert = {
        background_owner_profile_id: search.profile_id,
        profile_a_id: profileAId,
        profile_b_id: profileBId,
        profile_a_entry_id: null,
        profile_b_entry_id: null,
        reason_for_a: viewerIsProfileA ? reasonForSearchOwner : reasonForCounterparty,
        reason_for_b: viewerIsProfileA ? reasonForCounterparty : reasonForSearchOwner,
        score: evaluation.score,
        match_basis: matchBasis,
        shared_causes: evaluation.sharedCauses,
        suggested_first_step: evaluation.suggestedFirstStep,
        risk_notes: evaluation.riskNotes,
        generated_by: "saved-search-cron",
        status: "suggested",
        dedupe_key: dedupeKey,
        last_scored_at: now.toISOString(),
      };
      const { data: upsertedMatch, error: upsertError } = await supabase
        .from("match_suggestions")
        .upsert(matchPayload, { onConflict: "dedupe_key" })
        .select("id, status")
        .maybeSingle();

      if (upsertError || !upsertedMatch) {
        continue;
      }

      const matchId = upsertedMatch.id;
      explanationSnapshots.push(
        buildMatchExplanationSnapshot({
          canRevealIdentity: false,
          counterpartyConsented: false,
          generatedBy: "saved-search-cron",
          matchBasis,
          matchId,
          profileId: search.profile_id,
          purposeCode: purposeBinding.purposeCode,
          purposePolicyVersion: purposeBinding.purposePolicyVersion,
          riskNotes: evaluation.riskNotes,
          score: evaluation.score,
          sharedCauses: evaluation.sharedCauses,
          sourceRunId: search.id,
          sourceRunKind: "saved_search_scan",
          status: upsertedMatch.status,
          suggestedFirstStep: evaluation.suggestedFirstStep,
          viewerConsented: false,
        }),
      );
      opportunityBriefs.push(
        buildOpportunityBriefRow({
          canRevealIdentity: false,
          candidateProfileId: preview.profile_id,
          counterpartyConsented: false,
          generatedBy: "saved-search-cron",
          matchBasis,
          matchId,
          profileId: search.profile_id,
          purposeCode: purposeBinding.purposeCode,
          purposePolicyVersion: purposeBinding.purposePolicyVersion,
          riskNotes: evaluation.riskNotes,
          score: evaluation.score,
          sharedCauses: evaluation.sharedCauses,
          status: upsertedMatch.status,
          suggestedFirstStep: evaluation.suggestedFirstStep,
          title: "Opportunity brief: saved-search lead",
          viewerConsented: false,
        }),
      );

      await supabase.from("match_audit_events").insert({
        match_id: matchId,
        actor_profile_id: search.profile_id,
        event_type: existingMatch ? "match_refreshed" : "match_created",
        summary: buildPrivacySafeMatchAuditSummary({
          score: evaluation.score,
          sourceLabel: "Saved-search scan",
        }),
        metadata: buildPrivacySafeMatchAuditMetadata({
          compatibilityTags: evaluation.compatibilityTags,
          runReason: "saved-search-cron",
          sharedCauseCount: evaluation.sharedCauses.length,
          sharedTokenCount: evaluation.sharedTokens.length,
        }),
      });

      if (existingMatch) {
        runRefreshed += 1;
      } else {
        runCreated += 1;
        const notificationCopy = buildBackgroundOpportunityNotificationCopy();
        const notificationResult = await insertWishNotificationsWithSafeEmail({
          notifications: {
            profile_id: search.profile_id,
            kind: "match",
            title: notificationCopy.title,
            body: notificationCopy.body,
            match_id: matchId,
          },
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

    const opportunityBriefError = await upsertBackgroundOpportunityBriefs({
      briefs: opportunityBriefs,
      supabase,
    });

    if (opportunityBriefError) {
      console.error("[background-networking] Failed to save saved-search opportunity briefs", {
        error: opportunityBriefError.message,
        searchId: search.id,
      });
    }

    const snapshotError = await insertMatchExplanationSnapshots({
      snapshots: explanationSnapshots,
      supabase,
    });

    if (snapshotError) {
      console.error("[background-networking] Failed to save saved-search explanation snapshots", {
        error: snapshotError.message,
        searchId: search.id,
      });
    }

    const budgetCompletionError = await completeBackgroundQueryEvent({
      candidateCount: runCandidates,
      eventId: budgetReservation.eventId,
      metadata: {
        matchesCreated: runCreated,
        matchesRefreshed: runRefreshed,
        searchId: search.id,
      },
      resultCount: runCreated + runRefreshed,
      supabase,
    });

    if (budgetCompletionError) {
      console.error("[background-networking] Failed to complete saved-search budget event", {
        error: budgetCompletionError.message,
        searchId: search.id,
      });
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
