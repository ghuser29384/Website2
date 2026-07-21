import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getViewer } from "@/lib/app-data";
import {
  buildLiveNowRecentChanges,
  buildWeightedCauseSignals,
  rankLiveNowOffers,
  uniqueProfileCauses,
  type LiveNowOfferCandidate,
  type LiveNowPriorityAllocation,
} from "@/lib/live-now-recommendations";
import {
  buildBrowsingCauseWeights,
  buildLearnedActionPreferences,
  buildOpportunityFeedbackState,
  type RecommendationEventType,
  type RecommendationInteractionSignal,
  type RecommendationOpportunityType,
} from "@/lib/recommendation-learning";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const OFFER_BATCH_SIZE = 1_000;
const OFFER_SELECT =
  "id,owner_id,owner_alias,mode,offered_cause,requested_cause,compromise_cause,offer_action,request_action,verification,duration,trust_level,maximum_burden,no_trade_baseline,created_at,updated_at";
const INTERACTION_LIMIT = 500;

interface RecommendationPreferenceRow {
  learn_from_browsing: boolean;
  exploration_percent: number;
}

interface RecommendationInteractionRow {
  opportunity_type: RecommendationOpportunityType;
  opportunity_id: string;
  event_type: RecommendationEventType;
  benefit_causes: string[];
  action_causes: string[];
  action_key: string;
  action_label: string;
  inferred_difficulty: number | string | null;
  dwell_ms: number;
  occurred_at: string;
}

interface DonationPoolRow {
  id: string;
  created_by: string;
  name: string;
  description: string;
  compromise_charity_id: string;
  offset_ratio: number | string;
  verification_method: string;
  assurance_minimum_cents: number;
  assurance_deadline_at: string | null;
  side_a_label: string;
  side_b_label: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface RegisteredCharityRow {
  id: string;
  name: string;
  cause_area: string;
  consensus_label: string;
  summary: string;
}

interface OfferInventoryRow {
  id: string;
  owner_id: string;
  owner_alias: string;
  mode: "pledge" | "offset" | "payment";
  offered_cause: string;
  requested_cause: string;
  compromise_cause: string;
  offer_action: string;
  request_action: string;
  verification: string;
  duration: string;
  trust_level: number;
  maximum_burden: string;
  no_trade_baseline: string;
  created_at: string;
  updated_at: string;
}

function privateJson(body: unknown) {
  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      Vary: "Cookie",
    },
  });
}

function hasSupabaseAuthCookie(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return cookieStore
    .getAll()
    .some(({ name }) => /^sb-.+-auth-token(?:\.\d+)?$/.test(name));
}

function text(value: string | null | undefined, maximum = 240) {
  return (value ?? "").trim().slice(0, maximum);
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => text(item, 120))
    .filter(Boolean);
}

function asPriorityAllocations(value: unknown) {
  if (!Array.isArray(value)) return [] as LiveNowPriorityAllocation[];
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      label: typeof item.label === "string" ? item.label : null,
      causeArea: typeof item.causeArea === "string" ? item.causeArea : null,
      share: typeof item.share === "number" ? item.share : Number(item.share),
      sparks: typeof item.sparks === "number" ? item.sparks : Number(item.sparks),
      rank: typeof item.rank === "number" ? item.rank : Number(item.rank),
    }))
    .filter((item) => item.label || item.causeArea);
}

function normalizeInteraction(row: RecommendationInteractionRow): RecommendationInteractionSignal {
  const inferredDifficulty = Number(row.inferred_difficulty);
  return {
    opportunityType: row.opportunity_type,
    opportunityId: text(row.opportunity_id, 160),
    eventType: row.event_type,
    benefitCauses: asStringArray(row.benefit_causes),
    actionCauses: asStringArray(row.action_causes),
    actionKey: text(row.action_key, 120),
    actionLabel: text(row.action_label, 160),
    inferredDifficulty: Number.isFinite(inferredDifficulty) ? inferredDifficulty : null,
    dwellMs: Math.max(0, Number(row.dwell_ms) || 0),
    occurredAt: row.occurred_at,
  };
}

function formatPoolDuration(deadline: string | null) {
  if (!deadline) return "Open while the pool remains active";
  const timestamp = Date.parse(deadline);
  if (!Number.isFinite(timestamp)) return "Open while the pool remains active";
  return `Assurance deadline ${new Date(timestamp).toISOString().slice(0, 10)}`;
}

function buildPoolCandidate(
  pool: DonationPoolRow,
  charity: RegisteredCharityRow | undefined,
): LiveNowOfferCandidate {
  const destinationName = charity?.name || pool.compromise_charity_id;
  const benefitCause =
    charity?.cause_area || charity?.consensus_label || destinationName || "Shared moral public good";
  const minimum = Math.max(0, Number(pool.assurance_minimum_cents) || 0);
  const minimumLabel = minimum
    ? ` The pool activates after $${Math.round(minimum / 100).toLocaleString("en-US")} is committed.`
    : "";

  return {
    id: pool.id,
    ownerId: pool.created_by,
    ownerAlias: "Donation redirect pool",
    mode: "offset",
    offeredCause: benefitCause,
    requestedCause: `${text(pool.side_a_label, 120)} or ${text(pool.side_b_label, 120)}`,
    compromiseCause: benefitCause,
    offerAction:
      text(pool.description, 320) ||
      `Matched planned donations are redirected to ${destinationName}.${minimumLabel}`,
    requestAction: `Join the ${text(pool.name, 120)} pool with a planned donation on either side.`,
    verification: text(pool.verification_method, 160) || "Review the pool evidence terms",
    duration: formatPoolDuration(pool.assurance_deadline_at),
    trustLevel: 3,
    createdAt: pool.created_at,
    updatedAt: pool.updated_at,
    opportunityType: "donation_pool",
    href: `/donation-offsets?pool=${encodeURIComponent(pool.id)}`,
    ctaLabel: "Review redirect pool",
    sourceLabel: "Donation redirect pool",
    summary: charity?.summary || text(pool.description, 240),
    benefitCauses: uniqueProfileCauses(
      [benefitCause],
      charity?.consensus_label ? [charity.consensus_label] : [],
      charity?.name ? [charity.name] : [],
    ),
    actionCauses: uniqueProfileCauses([pool.side_a_label, pool.side_b_label]),
    metadata: {
      assuranceMinimumCents: minimum,
      offsetRatio: Number(pool.offset_ratio) || 1,
      destinationName,
    },
  };
}

function emptyPayload(
  status: "profile_incomplete" | "signed_out" | "unavailable",
  authenticated: boolean,
) {
  return {
    authenticated,
    generatedAt: new Date().toISOString(),
    matchingOfferCount: 0,
    matchingOpportunityCount: 0,
    profile: {
      causes: [] as string[],
      weightedCauses: [] as Array<{
        cause: string;
        weight: number;
        source: string;
        rank: number | null;
      }>,
      openToPayment: null,
      openToPledges: null,
      signalSources: [] as string[],
      learningEnabled: true,
      explorationPercent: 12,
      browsingSignalCount: 0,
      actionFeedbackCount: 0,
    },
    recentChanges: [],
    recommendations: [],
    status,
  };
}

export async function GET() {
  const cookieStore = await cookies();
  if (!hasSupabaseEnv() || !hasSupabaseAuthCookie(cookieStore)) {
    return privateJson(emptyPayload("signed_out", false));
  }

  const viewer = await getViewer();
  if (!viewer) {
    return privateJson(emptyPayload("signed_out", false));
  }

  const supabase = await createClient();
  const userId = viewer.authUser.id;
  const typedSupabase = supabase as any;
  const [
    wishProfileResult,
    savedSearchesResult,
    onboardingResult,
    synthesisResult,
    routeProfileResult,
    preferenceResult,
    interactionsResult,
  ] = await Promise.all([
    supabase
      .from("wish_profiles")
      .select("causes,openness_to_payment,openness_to_pledges")
      .eq("profile_id", userId)
      .maybeSingle(),
    supabase
      .from("saved_searches")
      .select("causes")
      .eq("profile_id", userId)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(24),
    typedSupabase
      .from("cohort_onboarding_profiles")
      .select("priority_allocations")
      .eq("profile_id", userId)
      .maybeSingle(),
    supabase
      .from("profile_syntheses")
      .select("cause_priorities")
      .eq("profile_id", userId)
      .maybeSingle(),
    typedSupabase
      .from("route_recommendation_profiles")
      .select("cause_priorities")
      .eq("profile_id", userId)
      .maybeSingle(),
    typedSupabase
      .from("recommendation_preferences")
      .select("learn_from_browsing,exploration_percent")
      .eq("profile_id", userId)
      .maybeSingle(),
    typedSupabase
      .from("recommendation_interactions")
      .select(
        "opportunity_type,opportunity_id,event_type,benefit_causes,action_causes,action_key,action_label,inferred_difficulty,dwell_ms,occurred_at",
      )
      .eq("profile_id", userId)
      .order("occurred_at", { ascending: false })
      .limit(INTERACTION_LIMIT),
  ]);

  if (wishProfileResult.error) {
    console.error("[live-now] Failed to load profile priorities", {
      message: wishProfileResult.error.message,
      userId,
    });
    return privateJson(emptyPayload("unavailable", true));
  }

  for (const [label, result] of [
    ["saved-search causes", savedSearchesResult],
    ["weighted priorities", onboardingResult],
    ["profile synthesis", synthesisResult],
    ["route recommendation profile", routeProfileResult],
    ["recommendation preferences", preferenceResult],
    ["recommendation interactions", interactionsResult],
  ] as const) {
    if (result.error) {
      console.error(`[live-now] Failed to load ${label}`, {
        message: result.error.message,
        userId,
      });
    }
  }

  const wishProfile = wishProfileResult.data;
  const savedSearchCauses = savedSearchesResult.error
    ? []
    : (savedSearchesResult.data ?? []).flatMap((search) => search.causes ?? []);
  const priorityAllocations = onboardingResult.error
    ? []
    : asPriorityAllocations(onboardingResult.data?.priority_allocations);
  const declaredPriorities = uniqueProfileCauses(
    synthesisResult.error ? [] : asStringArray(synthesisResult.data?.cause_priorities),
    routeProfileResult.error ? [] : asStringArray(routeProfileResult.data?.cause_priorities),
  );
  const preference = (preferenceResult.error
    ? null
    : preferenceResult.data) as RecommendationPreferenceRow | null;
  const learningEnabled = preference?.learn_from_browsing ?? true;
  const explorationPercent = Math.max(
    0,
    Math.min(30, Number(preference?.exploration_percent ?? 12) || 12),
  );
  const interactionSignals = interactionsResult.error
    ? []
    : ((interactionsResult.data ?? []) as RecommendationInteractionRow[]).map(normalizeInteraction);
  const browsingCauses = learningEnabled
    ? buildBrowsingCauseWeights(interactionSignals)
    : [];
  const causeSignals = buildWeightedCauseSignals({
    priorityAllocations,
    declaredPriorities,
    profileCauses: wishProfile?.causes ?? [],
    savedSearchCauses,
    browsingCauses,
  });
  const causes = causeSignals.map((signal) => signal.cause);
  const signalSources = [
    priorityAllocations.length ? "Weighted profile priorities" : null,
    declaredPriorities.length || wishProfile?.causes?.length ? "Profile priorities" : null,
    savedSearchCauses.length ? "Saved searches" : null,
    browsingCauses.length && learningEnabled ? "Recent browsing" : null,
    interactionSignals.some((signal) => signal.eventType === "easy" || signal.eventType === "hard")
      ? "Action difficulty feedback"
      : null,
  ].filter((source): source is string => Boolean(source));

  if (!causes.length) {
    return privateJson({
      ...emptyPayload("profile_incomplete", true),
      profile: {
        causes,
        weightedCauses: causeSignals,
        openToPayment: wishProfile?.openness_to_payment ?? null,
        openToPledges: wishProfile?.openness_to_pledges ?? null,
        signalSources,
        learningEnabled,
        explorationPercent,
        browsingSignalCount: 0,
        actionFeedbackCount: 0,
      },
    });
  }

  const [poolsResult, charitiesResult] = await Promise.all([
    typedSupabase
      .from("donation_offset_pools")
      .select(
        "id,created_by,name,description,compromise_charity_id,offset_ratio,verification_method,assurance_minimum_cents,assurance_deadline_at,side_a_label,side_b_label,status,created_at,updated_at",
      )
      .neq("created_by", userId)
      .neq("status", "closed")
      .eq("moderation_status", "clear")
      .order("updated_at", { ascending: false })
      .limit(250),
    typedSupabase
      .from("registered_charities")
      .select("id,name,cause_area,consensus_label,summary")
      .eq("is_active", true)
      .eq("selectable", true)
      .limit(500),
  ]);

  if (poolsResult.error) {
    console.error("[live-now] Failed to load donation redirect pools", {
      message: poolsResult.error.message,
      userId,
    });
  }
  if (charitiesResult.error) {
    console.error("[live-now] Failed to load registered charity causes", {
      message: charitiesResult.error.message,
      userId,
    });
  }

  const candidates: LiveNowOfferCandidate[] = [];
  for (let offset = 0; ; offset += OFFER_BATCH_SIZE) {
    const offersResult = await typedSupabase
      .from("offers")
      .select(OFFER_SELECT)
      .eq("status", "open")
      .neq("owner_id", userId)
      .order("updated_at", { ascending: false })
      .order("id", { ascending: true })
      .range(offset, offset + OFFER_BATCH_SIZE - 1);

    if (offersResult.error) {
      console.error("[live-now] Failed to load open opportunity inventory", {
        message: offersResult.error.message,
        userId,
      });
      return privateJson(emptyPayload("unavailable", true));
    }

    const batch = (offersResult.data ?? []) as OfferInventoryRow[];
    candidates.push(
      ...batch.map((offer) => {
        const opportunityType: RecommendationOpportunityType =
          offer.mode === "offset" ? "donation_redirect" : "offer";
        return {
          id: offer.id,
          ownerId: offer.owner_id,
          ownerAlias: text(offer.owner_alias, 100) || "Participant",
          mode: offer.mode,
          offeredCause: text(offer.offered_cause, 120),
          requestedCause: text(offer.requested_cause, 120),
          compromiseCause: text(offer.compromise_cause, 120),
          offerAction: text(offer.offer_action, 320),
          requestAction: text(offer.request_action, 320),
          verification: text(offer.verification, 320),
          duration: text(offer.duration, 160),
          trustLevel: offer.trust_level,
          createdAt: offer.created_at,
          updatedAt: offer.updated_at,
          opportunityType,
          sourceLabel: opportunityType === "donation_redirect" ? "Donation redirect" : undefined,
          summary: text(offer.no_trade_baseline, 240),
          benefitCauses: uniqueProfileCauses(
            [offer.offered_cause],
            offer.compromise_cause && offer.compromise_cause !== "Not needed"
              ? [offer.compromise_cause]
              : [],
          ),
          actionCauses: uniqueProfileCauses([offer.requested_cause]),
          metadata: {
            maximumBurden: text(offer.maximum_burden, 180),
          },
        } satisfies LiveNowOfferCandidate;
      }),
    );

    if (batch.length < OFFER_BATCH_SIZE) break;
  }

  const charityById = new Map(
    ((charitiesResult.data ?? []) as RegisteredCharityRow[]).map((charity) => [charity.id, charity]),
  );
  if (!poolsResult.error) {
    candidates.push(
      ...((poolsResult.data ?? []) as DonationPoolRow[]).map((pool) =>
        buildPoolCandidate(pool, charityById.get(pool.compromise_charity_id)),
      ),
    );
  }

  const actionLearningSignals = learningEnabled
    ? interactionSignals
    : interactionSignals.filter(
        (signal) => !["impression", "open", "dwell", "cause_view"].includes(signal.eventType),
      );
  const actionPreferences = buildLearnedActionPreferences(actionLearningSignals);
  const feedbackState = buildOpportunityFeedbackState(interactionSignals);
  const profile = {
    causes,
    causeSignals,
    openToPayment: wishProfile?.openness_to_payment ?? null,
    openToPledges: wishProfile?.openness_to_pledges ?? null,
    actionPreferences,
    hiddenOpportunityKeys: feedbackState.hiddenOpportunityKeys,
    savedOpportunityKeys: feedbackState.savedOpportunityKeys,
    explorationPercent,
  };
  const ranked = rankLiveNowOffers(candidates, profile);
  const recommendations = ranked.slice(0, 12);
  const browsingSignalCount = learningEnabled
    ? interactionSignals.filter((signal) =>
        ["cause_view", "open", "dwell", "save", "unsave", "hide", "not_for_me"].includes(
          signal.eventType,
        ),
      ).length
    : 0;
  const actionFeedbackCount = interactionSignals.filter((signal) =>
    ["easy", "hard", "save", "hide", "not_for_me", "propose", "accept", "complete"].includes(
      signal.eventType,
    ),
  ).length;

  return privateJson({
    authenticated: true,
    generatedAt: new Date().toISOString(),
    matchingOfferCount: ranked.length,
    matchingOpportunityCount: ranked.length,
    profile: {
      causes,
      weightedCauses: causeSignals,
      openToPayment: wishProfile?.openness_to_payment ?? null,
      openToPledges: wishProfile?.openness_to_pledges ?? null,
      signalSources,
      learningEnabled,
      explorationPercent,
      browsingSignalCount,
      actionFeedbackCount,
    },
    recentChanges: buildLiveNowRecentChanges(ranked),
    recommendations,
    status: recommendations.length ? "ready" : "no_matches",
  });
}
