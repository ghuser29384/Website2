import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getViewer } from "@/lib/app-data";
import {
  BACKGROUND_ENCRYPTED_TEXT_UNAVAILABLE,
  decryptBackgroundSensitiveText,
  normalizeEncryptedFieldMap,
} from "@/lib/background-field-encryption";
import {
  applyKnownFeasibilityToHybridFeed,
  buildHybridLiveNowFeed,
  emptyHybridLiveNowFeedDiagnostics,
} from "@/lib/live-now-hybrid-feed";
import {
  buildLiveNowRecentChanges,
  buildWeightedCauseSignals,
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
import { presentRoutePlanner } from "@/lib/route-planner-presentation";
import {
  buildRoutePlanner,
  classifyRoutePrivacyScope,
} from "@/lib/route-recommendations";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const OFFER_BATCH_SIZE = 1_000;
const OWNED_OPPORTUNITY_LIMIT = 6;
const INTERACTION_LIMIT = 500;
const OFFER_PUBLIC_SELECT =
  "id,owner_id,owner_alias,mode,offered_cause,requested_cause,compromise_cause,offer_action,request_action,verification,duration,trust_level,maximum_burden,privacy_scope,status,workflow_status,published_at,closed_at,deleted_at,created_at,updated_at,terms_version";
const OWNED_OFFER_SELECT = `${OFFER_PUBLIC_SELECT},no_trade_baseline`;
const ROUTE_PROFILE_SELECT =
  "profile_id,goal,cause_priorities,money_budget_cents,time_budget_minutes,action_budget_count,horizon,route_formats,evidence_preference,uncertainty_preference,interaction_preference,privacy_preference,planned_donation_baseline,planned_donation_cents,otherwise_baseline,pairwise_answers,interview_answers,sensitive_ciphertexts,sensitive_encryption_version,created_at,updated_at";
const GOAL_FIELD = "route_recommendation_profiles.goal";
const CAUSE_PRIORITIES_FIELD = "route_recommendation_profiles.cause_priorities";
const OTHERWISE_BASELINE_FIELD = "route_recommendation_profiles.otherwise_baseline";

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
  no_trade_baseline?: string;
  privacy_scope: string;
  status: string;
  workflow_status: string;
  published_at: string | null;
  closed_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  terms_version: number;
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
    .some(({ name }: { name: string }) => /^sb-.+-auth-token(?:\.\d+)?$/.test(name));
}

function text(value: string | null | undefined, maximum = 240) {
  return (value ?? "").trim().slice(0, maximum);
}

function object(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function safePrivateText(value: string, maximum: number) {
  if (!value || value === BACKGROUND_ENCRYPTED_TEXT_UNAVAILABLE) return "";
  return value.trim().slice(0, maximum);
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => text(item, 120))
    .filter(Boolean);
}

function decryptRouteProfile(value: unknown) {
  const row = object(value);
  const ciphertexts = normalizeEncryptedFieldMap(row.sensitive_ciphertexts);
  const decrypted = (fieldKey: string, fallback: unknown, maximum: number) =>
    safePrivateText(
      ciphertexts[fieldKey]
        ? decryptBackgroundSensitiveText(ciphertexts[fieldKey], fieldKey)
        : typeof fallback === "string"
          ? fallback
          : "",
      maximum,
    );
  let causePriorities = asStringArray(row.cause_priorities);
  if (ciphertexts[CAUSE_PRIORITIES_FIELD]) {
    try {
      causePriorities = asStringArray(
        JSON.parse(decrypted(CAUSE_PRIORITIES_FIELD, "", 4_000)),
      );
    } catch {
      causePriorities = [];
    }
  }

  return {
    ...row,
    goal: decrypted(GOAL_FIELD, row.goal, 180),
    cause_priorities: causePriorities,
    otherwise_baseline: decrypted(OTHERWISE_BASELINE_FIELD, row.otherwise_baseline, 700),
    sensitive_ciphertexts: undefined,
  };
}

function isPublishedLiveOffer(row: OfferInventoryRow) {
  return (
    row.status === "open" &&
    row.workflow_status === "published" &&
    Boolean(row.published_at) &&
    row.closed_at === null &&
    row.deleted_at === null
  );
}

function isOpenDonationPool(row: DonationPoolRow, checkedAt: Date) {
  if (!["open", "assurance_pending"].includes(row.status)) return false;
  if (!row.assurance_deadline_at) return true;
  const deadline = Date.parse(row.assurance_deadline_at);
  return Number.isFinite(deadline) && deadline > checkedAt.getTime();
}

function poolDurationDays(deadline: string | null, checkedAt: Date) {
  if (!deadline) return null;
  const timestamp = Date.parse(deadline);
  if (!Number.isFinite(timestamp)) return null;
  return Math.max(0, Math.ceil((timestamp - checkedAt.getTime()) / 86_400_000));
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

function buildOwnedOpportunity(offer: OfferInventoryRow) {
  const opportunityType: RecommendationOpportunityType =
    offer.mode === "offset" ? "donation_redirect" : "offer";
  return {
    id: offer.id,
    opportunityType,
    href: `/trades/${encodeURIComponent(offer.id)}/manage`,
    ctaLabel: "Manage & invite",
    sourceLabel: opportunityType === "donation_redirect" ? "Your donation redirect" : "Your live offer",
    ownerAlias: text(offer.owner_alias, 100) || "You",
    offeredCause: text(offer.offered_cause, 120),
    requestedCause: text(offer.requested_cause, 120),
    offerAction: text(offer.offer_action, 420),
    requestAction: text(offer.request_action, 420),
    verification: text(offer.verification, 320),
    duration: text(offer.duration, 160),
    summary: text(offer.no_trade_baseline, 320),
    updatedAt: offer.updated_at,
  };
}

function buildPoolCandidate(
  pool: DonationPoolRow,
  charity: RegisteredCharityRow | undefined,
  checkedAt: Date,
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
      durationDays: poolDurationDays(pool.assurance_deadline_at, checkedAt),
      privacyLevel: "public-safe",
      invitationBacked: false,
    },
  };
}

function emptyPayload(
  status: "profile_incomplete" | "signed_out" | "unavailable",
  authenticated: boolean,
) {
  const generatedAt = new Date().toISOString();
  const routePlanner = presentRoutePlanner(
    buildRoutePlanner({ profile: null, recommendations: [], checkedAt: generatedAt }),
  );
  return {
    authenticated,
    generatedAt,
    matchingOfferCount: 0,
    matchingOpportunityCount: 0,
    feedOpportunityCount: 0,
    feedDiagnostics: emptyHybridLiveNowFeedDiagnostics(new Date(generatedAt), 0),
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
    ownedOpportunities: [],
    ownedOpportunityCount: 0,
    routePlanner: {
      ...routePlanner,
      status:
        status === "signed_out"
          ? "signed_out"
          : status === "unavailable"
            ? "unavailable"
            : "incomplete",
    },
    status,
  };
}

async function loadPublishedOfferCandidates(
  typedSupabase: any,
  userId: string,
) {
  const candidates: LiveNowOfferCandidate[] = [];
  for (let offset = 0; ; offset += OFFER_BATCH_SIZE) {
    const offersResult = await typedSupabase
      .from("offers")
      .select(OFFER_PUBLIC_SELECT)
      .eq("status", "open")
      .eq("workflow_status", "published")
      .not("published_at", "is", null)
      .is("closed_at", null)
      .is("deleted_at", null)
      .neq("owner_id", userId)
      .order("updated_at", { ascending: false })
      .order("id", { ascending: true })
      .range(offset, offset + OFFER_BATCH_SIZE - 1);

    if (offersResult.error) throw offersResult.error;
    const batch = (offersResult.data ?? []) as OfferInventoryRow[];
    const liveBatch = batch.filter(isPublishedLiveOffer);
    if (liveBatch.length !== batch.length) {
      console.error("[live-now] Dropped rows that failed the published-live offer guard", {
        droppedCount: batch.length - liveBatch.length,
        userId,
      });
    }
    candidates.push(
      ...liveBatch.map((offer) => {
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
          sourceRevision: offer.terms_version,
          opportunityType,
          sourceLabel: opportunityType === "donation_redirect" ? "Donation redirect" : undefined,
          summary: text(
            offer.compromise_cause && offer.compromise_cause !== "Not needed"
              ? offer.compromise_cause
              : `${offer.requested_cause} ↔ ${offer.offered_cause}`,
            240,
          ),
          benefitCauses: uniqueProfileCauses(
            [offer.offered_cause],
            offer.compromise_cause && offer.compromise_cause !== "Not needed"
              ? [offer.compromise_cause]
              : [],
          ),
          actionCauses: uniqueProfileCauses([offer.requested_cause]),
          metadata: {
            maximumBurden: text(offer.maximum_burden, 180),
            privacyLevel: classifyRoutePrivacyScope(offer.privacy_scope),
            invitationBacked: false,
          },
        } satisfies LiveNowOfferCandidate;
      }),
    );
    if (batch.length < OFFER_BATCH_SIZE) break;
  }
  return candidates;
}

export async function GET() {
  const cookieStore = await cookies();
  if (!hasSupabaseEnv() || !hasSupabaseAuthCookie(cookieStore)) {
    return privateJson(emptyPayload("signed_out", false));
  }

  const viewer = await getViewer();
  if (!viewer) return privateJson(emptyPayload("signed_out", false));

  const supabase = await createClient();
  const typedSupabase = supabase as any;
  const userId = viewer.authUser.id;
  const checkedAt = new Date();
  const [
    wishProfileResult,
    savedSearchesResult,
    onboardingResult,
    synthesisResult,
    routeProfileResult,
    preferenceResult,
    interactionsResult,
    ownedOffersResult,
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
      .select(ROUTE_PROFILE_SELECT)
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
    typedSupabase
      .from("offers")
      .select(OWNED_OFFER_SELECT)
      .eq("status", "open")
      .eq("workflow_status", "published")
      .not("published_at", "is", null)
      .is("closed_at", null)
      .is("deleted_at", null)
      .eq("owner_id", userId)
      .order("updated_at", { ascending: false })
      .order("id", { ascending: true })
      .limit(OWNED_OPPORTUNITY_LIMIT),
  ]);

  const ownedOpportunities = ownedOffersResult.error
    ? []
    : ((ownedOffersResult.data ?? []) as OfferInventoryRow[])
        .filter(isPublishedLiveOffer)
        .map(buildOwnedOpportunity);

  if (wishProfileResult.error) {
    console.error("[live-now] Failed to load profile priorities", {
      message: wishProfileResult.error.message,
      userId,
    });
    return privateJson({
      ...emptyPayload("unavailable", true),
      ownedOpportunities,
      ownedOpportunityCount: ownedOpportunities.length,
    });
  }

  for (const [label, result] of [
    ["saved-search causes", savedSearchesResult],
    ["weighted priorities", onboardingResult],
    ["profile synthesis", synthesisResult],
    ["route recommendation profile", routeProfileResult],
    ["recommendation preferences", preferenceResult],
    ["recommendation interactions", interactionsResult],
    ["owned live listings", ownedOffersResult],
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
    : (savedSearchesResult.data ?? []).flatMap(
        (search: { causes?: string[] | null }) => search.causes ?? [],
      );
  const priorityAllocations = onboardingResult.error
    ? []
    : asPriorityAllocations(onboardingResult.data?.priority_allocations);
  const runtimeRouteProfile = routeProfileResult.error
    ? null
    : decryptRouteProfile(routeProfileResult.data);
  const declaredPriorities = uniqueProfileCauses(
    synthesisResult.error ? [] : asStringArray(synthesisResult.data?.cause_priorities),
    runtimeRouteProfile ? asStringArray(runtimeRouteProfile.cause_priorities) : [],
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
    const routePlanner = presentRoutePlanner(
      buildRoutePlanner({
        profile: runtimeRouteProfile,
        recommendations: [],
        checkedAt,
      }),
    );
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
      ownedOpportunities,
      ownedOpportunityCount: ownedOpportunities.length,
      routePlanner: routeProfileResult.error
        ? { ...routePlanner, status: "unavailable" }
        : routePlanner,
    });
  }

  const [poolsResult, charitiesResult] = await Promise.all([
    typedSupabase
      .from("donation_offset_pools")
      .select(
        "id,created_by,name,description,compromise_charity_id,offset_ratio,verification_method,assurance_minimum_cents,assurance_deadline_at,side_a_label,side_b_label,status,created_at,updated_at",
      )
      .neq("created_by", userId)
      .in("status", ["open", "assurance_pending"])
      .eq("moderation_status", "clear")
      .or(`assurance_deadline_at.is.null,assurance_deadline_at.gt.${checkedAt.toISOString()}`)
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
  const routeInventoryUnavailable = Boolean(poolsResult.error || charitiesResult.error);

  let candidates: LiveNowOfferCandidate[];
  try {
    candidates = await loadPublishedOfferCandidates(typedSupabase, userId);
  } catch (error) {
    console.error("[live-now] Failed to load open opportunity inventory", {
      message: error instanceof Error ? error.message : String(error),
      userId,
    });
    return privateJson({
      ...emptyPayload("unavailable", true),
      ownedOpportunities,
      ownedOpportunityCount: ownedOpportunities.length,
    });
  }

  const charityById = new Map(
    ((charitiesResult.data ?? []) as RegisteredCharityRow[]).map((charity) => [charity.id, charity]),
  );
  if (!poolsResult.error) {
    candidates.push(
      ...((poolsResult.data ?? []) as DonationPoolRow[])
        .filter((pool) => isOpenDonationPool(pool, checkedAt))
        .map((pool) =>
          buildPoolCandidate(pool, charityById.get(pool.compromise_charity_id), checkedAt),
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
  // The hybrid builder retains rankLiveNowOffers as its lexical and action-learning prior,
  // then adds public-only semantic retrieval and reciprocal acceptance estimates.
  let hybridFeed = await buildHybridLiveNowFeed({
    candidates,
    profile,
    now: checkedAt,
  });
  const feasibilityProbe = buildRoutePlanner({
    profile: runtimeRouteProfile,
    recommendations: hybridFeed.directRecommendations,
    checkedAt,
    fallbackCauses: causes,
  });
  if (!routeProfileResult.error && feasibilityProbe.missingProfileFields.length === 0) {
    hybridFeed = applyKnownFeasibilityToHybridFeed(
      hybridFeed,
      feasibilityProbe.blockedSources,
    );
  }
  const recommendations = hybridFeed.recommendations.slice(0, 12);
  const routePlannerResult = presentRoutePlanner(
    buildRoutePlanner({
      profile: runtimeRouteProfile,
      recommendations: hybridFeed.directRecommendations,
      checkedAt,
      fallbackCauses: causes,
    }),
  );
  const routePlanner = routeProfileResult.error || routeInventoryUnavailable
    ? { ...routePlannerResult, status: "unavailable" as const }
    : routePlannerResult;
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
  const semanticSignalSource = hybridFeed.diagnostics.retrievalMode === "lexical_only"
    ? null
    : hybridFeed.diagnostics.retrievalMode === "deterministic_fallback"
      ? "Local semantic fallback"
      : "Public semantic embeddings";

  return privateJson({
    authenticated: true,
    generatedAt: checkedAt.toISOString(),
    matchingOfferCount: hybridFeed.diagnostics.directCount,
    matchingOpportunityCount: hybridFeed.diagnostics.directCount,
    feedOpportunityCount: recommendations.length,
    feedDiagnostics: hybridFeed.diagnostics,
    profile: {
      causes,
      weightedCauses: causeSignals,
      openToPayment: wishProfile?.openness_to_payment ?? null,
      openToPledges: wishProfile?.openness_to_pledges ?? null,
      signalSources: semanticSignalSource
        ? [...signalSources, semanticSignalSource]
        : signalSources,
      learningEnabled,
      explorationPercent,
      browsingSignalCount,
      actionFeedbackCount,
    },
    recentChanges: buildLiveNowRecentChanges(hybridFeed.directRecommendations),
    recommendations,
    ownedOpportunities,
    ownedOpportunityCount: ownedOpportunities.length,
    routePlanner,
    status: recommendations.length ? "ready" : "no_matches",
  });
}
