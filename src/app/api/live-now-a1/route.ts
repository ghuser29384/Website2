import { NextResponse } from "next/server";

import { GET as getReciprocalLiveNow } from "@/app/api/live-now/route";
import { getViewer } from "@/lib/app-data";
import { buildHybridLiveNowFeed } from "@/lib/live-now-hybrid-feed";
import { loadAdditionalPublicMechanisms } from "@/lib/live-now-additional-mechanisms";
import {
  buildLearnedActionPreferences,
  buildOpportunityFeedbackState,
  type RecommendationEventType,
  type RecommendationInteractionSignal,
  type RecommendationOpportunityType,
} from "@/lib/recommendation-learning";
import type {
  LiveNowCauseSignal,
  LiveNowCauseSignalSource,
} from "@/lib/live-now-recommendations";
import {
  applyParetoLearningToLiveNowPayload,
  type ParetoRuntimePayload,
} from "@/lib/pareto-feed-runtime";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

type UnifiedRecommendation = Record<string, unknown> & { id: string };

function privateJson(body: unknown) {
  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      Vary: "Cookie",
    },
  });
}

function safeCount(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : 0;
}

function record(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function causeSignalSource(value: unknown): LiveNowCauseSignalSource {
  return value === "explicit_priority" ||
    value === "profile_priority" ||
    value === "saved_search" ||
    value === "browsing"
    ? value
    : "profile_priority";
}

function classPriority(value: unknown) {
  return value === "direct" ? 4 : value === "near" ? 3 : value === "adjacent" ? 2 : 1;
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").slice(0, 12)
    : [];
}

function normalizeInteraction(row: Record<string, unknown>): RecommendationInteractionSignal {
  const inferredDifficulty = Number(row.inferred_difficulty);
  return {
    opportunityType: String(row.opportunity_type ?? "offer") as RecommendationOpportunityType,
    opportunityId: String(row.opportunity_id ?? "").slice(0, 160),
    eventType: String(row.event_type ?? "open") as RecommendationEventType,
    benefitCauses: stringArray(row.benefit_causes),
    actionCauses: stringArray(row.action_causes),
    actionKey: String(row.action_key ?? "").slice(0, 120),
    actionLabel: String(row.action_label ?? "").slice(0, 160),
    inferredDifficulty: Number.isFinite(inferredDifficulty) ? inferredDifficulty : null,
    dwellMs: Math.max(0, Number(row.dwell_ms) || 0),
    occurredAt: String(row.occurred_at ?? ""),
  };
}

async function loadAdditionalPreferenceState(service: any, profileId: string) {
  const select =
    "opportunity_type,opportunity_id,event_type,benefit_causes,action_causes,action_key,action_label,inferred_difficulty,dwell_ms,occurred_at";
  const [explicitResult, exclusionsResult] = await Promise.all([
    service
      .from("recommendation_interactions")
      .select(select)
      .eq("profile_id", profileId)
      .in("event_type", ["easy", "hard", "hide", "not_for_me", "propose", "accept", "complete"])
      .order("occurred_at", { ascending: false })
      .limit(500),
    service
      .from("recommendation_interactions")
      .select(select)
      .eq("profile_id", profileId)
      .in("event_type", ["hide", "not_for_me"])
      .order("occurred_at", { ascending: false })
      .limit(1_000),
  ]);

  if (exclusionsResult.error) {
    return {
      available: false as const,
      actionPreferences: new Map(),
      hiddenOpportunityKeys: new Set<string>(),
      error: exclusionsResult.error.message,
    };
  }

  const explicitSignals = explicitResult.error
    ? []
    : ((explicitResult.data ?? []) as Record<string, unknown>[]).map(normalizeInteraction);
  const exclusionSignals = ((exclusionsResult.data ?? []) as Record<string, unknown>[]).map(
    normalizeInteraction,
  );
  return {
    available: true as const,
    actionPreferences: buildLearnedActionPreferences(explicitSignals),
    hiddenOpportunityKeys: buildOpportunityFeedbackState(exclusionSignals).hiddenOpportunityKeys,
    error: explicitResult.error ? explicitResult.error.message : null,
  };
}

async function augmentWithAdditionalMechanisms({
  payload,
  profileId,
  service,
}: {
  payload: ParetoRuntimePayload;
  profileId: string;
  service: any;
}): Promise<ParetoRuntimePayload> {
  const [additional, preferenceState] = await Promise.all([
    loadAdditionalPublicMechanisms({ service, profileId }),
    loadAdditionalPreferenceState(service, profileId),
  ]);
  if (!preferenceState.available) {
    const diagnostics = record(payload.feedDiagnostics);
    return {
      ...payload,
      feedDiagnostics: {
        ...diagnostics,
        additionalMechanismCounts: additional.counts,
        mechanismIngestionErrors: [
          ...additional.errors,
          `explicit_exclusions:${preferenceState.error ?? "unavailable"}`,
        ],
      },
    };
  }
  if (!additional.candidates.length) {
    const diagnostics = record(payload.feedDiagnostics);
    return {
      ...payload,
      feedDiagnostics: {
        ...diagnostics,
        additionalMechanismCounts: additional.counts,
        mechanismIngestionErrors: [
        ...additional.errors,
        ...(preferenceState.error ? [`explicit_feedback:${preferenceState.error}`] : []),
      ],
      },
    };
  }

  const profileValue = record(payload.profile);
  const causes = Array.isArray(profileValue.causes)
    ? profileValue.causes.filter(
        (value): value is string => typeof value === "string" && Boolean(value.trim()),
      )
    : [];
  const weightedCauses: LiveNowCauseSignal[] = Array.isArray(profileValue.weightedCauses)
    ? profileValue.weightedCauses
        .filter(
          (value): value is Record<string, unknown> =>
            Boolean(value) && typeof value === "object",
        )
        .map((value) => ({
          cause: String(value.cause ?? "").trim(),
          weight: Number(value.weight ?? 0),
          source: causeSignalSource(value.source),
          rank: Number.isFinite(Number(value.rank)) ? Number(value.rank) : null,
        }))
        .filter((value) => value.cause)
    : [];

  if (!causes.length && !weightedCauses.length) return payload;
  const now = new Date(String(payload.generatedAt ?? Date.now()));
  const feed = await buildHybridLiveNowFeed({
    candidates: additional.candidates,
    profile: {
      causes,
      causeSignals: weightedCauses,
      openToPayment:
        typeof profileValue.openToPayment === "boolean" ? profileValue.openToPayment : null,
      openToPledges:
        typeof profileValue.openToPledges === "boolean" ? profileValue.openToPledges : null,
      actionPreferences: preferenceState.actionPreferences,
      hiddenOpportunityKeys: preferenceState.hiddenOpportunityKeys,
      // Additional mechanism types do not share the canonical offer bookmark
      // store. Their cards omit Save until a real mechanism-specific bookmark
      // path exists.
      savedOpportunityKeys: new Set(),
      explorationPercent: safeCount(profileValue.explorationPercent || 12),
    },
    now: Number.isFinite(now.getTime()) ? now : new Date(),
  });

  const baseRecommendations: UnifiedRecommendation[] = Array.isArray(payload.recommendations)
    ? payload.recommendations.map(
        (value) => ({ ...value }) as unknown as UnifiedRecommendation,
      )
    : [];
  const additionalRecommendations: UnifiedRecommendation[] = feed.recommendations.map(
    (value) => ({ ...value }) as unknown as UnifiedRecommendation,
  );
  const merged = new Map<string, UnifiedRecommendation>();
  for (const recommendation of [...baseRecommendations, ...additionalRecommendations]) {
    const key = `${String(recommendation.opportunityType ?? "offer")}:${recommendation.id}`;
    if (!key.endsWith(":")) merged.set(key, recommendation);
  }
  const recommendations = [...merged.values()]
    .sort(
      (left, right) =>
        classPriority(right.matchClass) - classPriority(left.matchClass) ||
        Number(right.reciprocalScore ?? 0) - Number(left.reciprocalScore ?? 0) ||
        left.id.localeCompare(right.id),
    )
    .slice(0, 12);

  const baseDiagnostics = record(payload.feedDiagnostics);
  const directCount = safeCount(baseDiagnostics.directCount) + feed.diagnostics.directCount;
  return {
    ...payload,
    matchingOfferCount: directCount,
    matchingOpportunityCount: directCount,
    feedOpportunityCount: recommendations.length,
    recommendations:
      recommendations as unknown as NonNullable<ParetoRuntimePayload["recommendations"]>,
    status: recommendations.length ? "ready" : payload.status,
    feedDiagnostics: {
      ...baseDiagnostics,
      checkedInventoryCount:
        safeCount(baseDiagnostics.checkedInventoryCount) +
        feed.diagnostics.checkedInventoryCount,
      eligibleCount: safeCount(baseDiagnostics.eligibleCount) + feed.diagnostics.eligibleCount,
      retrievalPoolCount:
        safeCount(baseDiagnostics.retrievalPoolCount) + feed.diagnostics.retrievalPoolCount,
      semanticCandidateCount:
        safeCount(baseDiagnostics.semanticCandidateCount) +
        feed.diagnostics.semanticCandidateCount,
      directCount,
      nearMatchCount:
        safeCount(baseDiagnostics.nearMatchCount) + feed.diagnostics.nearMatchCount,
      adjacentCount:
        safeCount(baseDiagnostics.adjacentCount) + feed.diagnostics.adjacentCount,
      discoveryCount:
        safeCount(baseDiagnostics.discoveryCount) + feed.diagnostics.discoveryCount,
      selectedCount: recommendations.length,
      additionalMechanismCounts: additional.counts,
      mechanismIngestionErrors: additional.errors,
      unifiedMechanismInventoryVersion: "public-executable-v1",
    },
  };
}

async function attachExternalCandidateDiagnostics(
  payload: ParetoRuntimePayload,
  profileId: string,
  service: any,
): Promise<ParetoRuntimePayload> {
  const now = new Date().toISOString();
  const count = async (query: any) => {
    try {
      const result = await query;
      return result.error ? 0 : safeCount(result.count);
    } catch {
      return 0;
    }
  };

  const [
    offerTotal,
    offerOwned,
    redirectPoolTotal,
    redirectPoolOwned,
    donationUpgradeTotal,
    donationUpgradeOwned,
    publicGoodsTotal,
    publicGoodsOwned,
  ] = await Promise.all([
    count(
      service
        .from("offers")
        .select("id", { count: "exact", head: true })
        .eq("status", "open")
        .eq("workflow_status", "published")
        .not("published_at", "is", null)
        .is("closed_at", null)
        .is("deleted_at", null),
    ),
    count(
      service
        .from("offers")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", profileId)
        .eq("status", "open")
        .eq("workflow_status", "published")
        .not("published_at", "is", null)
        .is("closed_at", null)
        .is("deleted_at", null),
    ),
    count(
      service
        .from("donation_offset_pools")
        .select("id", { count: "exact", head: true })
        .in("status", ["open", "assurance_pending"])
        .eq("moderation_status", "clear")
        .or(`assurance_deadline_at.is.null,assurance_deadline_at.gt.${now}`),
    ),
    count(
      service
        .from("donation_offset_pools")
        .select("id", { count: "exact", head: true })
        .eq("created_by", profileId)
        .in("status", ["open", "assurance_pending"])
        .eq("moderation_status", "clear")
        .or(`assurance_deadline_at.is.null,assurance_deadline_at.gt.${now}`),
    ),
    count(
      service
        .from("conditional_redirect_offers")
        .select("id", { count: "exact", head: true })
        .eq("status", "open")
        .eq("livemode", true)
        .gt("deadline_at", now),
    ),
    count(
      service
        .from("conditional_redirect_offers")
        .select("id", { count: "exact", head: true })
        .eq("creator_profile_id", profileId)
        .eq("status", "open")
        .eq("livemode", true)
        .gt("deadline_at", now),
    ),
    count(
      service
        .from("mpgf_pool_proposals")
        .select("id", { count: "exact", head: true })
        .eq("status", "approved_as_candidate")
        .not("public_goods_threshold_amount_cents", "is", null)
        .or(`public_goods_deadline_at.is.null,public_goods_deadline_at.gt.${now}`),
    ),
    count(
      service
        .from("mpgf_pool_proposals")
        .select("id", { count: "exact", head: true })
        .eq("proposer_id", profileId)
        .eq("status", "approved_as_candidate")
        .not("public_goods_threshold_amount_cents", "is", null)
        .or(`public_goods_deadline_at.is.null,public_goods_deadline_at.gt.${now}`),
    ),
  ]);

  const mechanismInventory = {
    bilateral_and_redirect_offers: offerTotal,
    donation_redirect_pools: redirectPoolTotal,
    donation_upgrades: donationUpgradeTotal,
    moral_public_goods_pools: publicGoodsTotal,
  };
  const platformInventoryCount = Object.values(mechanismInventory).reduce(
    (sum, value) => sum + value,
    0,
  );
  const viewerOwnedExcludedCount =
    offerOwned + redirectPoolOwned + donationUpgradeOwned + publicGoodsOwned;
  const externalInventoryCount = Math.max(
    0,
    platformInventoryCount - viewerOwnedExcludedCount,
  );
  const existingDiagnostics = record(payload.feedDiagnostics);

  return {
    ...payload,
    feedDiagnostics: {
      ...existingDiagnostics,
      platformInventoryCount,
      viewerOwnedExcludedCount,
      externalInventoryCount,
      evaluatedCandidateCount: safeCount(existingDiagnostics.checkedInventoryCount),
      mechanismInventory,
      inventorySemanticsVersion: "external-candidate-funnel-v1",
    },
  };
}

export async function GET() {
  const baseResponse = await getReciprocalLiveNow();
  if (!baseResponse.ok) return baseResponse;

  let payload: ParetoRuntimePayload;
  try {
    payload = (await baseResponse.json()) as ParetoRuntimePayload;
  } catch {
    return baseResponse;
  }

  if (payload.authenticated !== true || !Array.isArray(payload.recommendations)) {
    return privateJson(payload);
  }
  const viewer = await getViewer();
  if (!viewer) return privateJson(payload);

  const service = createServiceClient() as any;
  const unified = await augmentWithAdditionalMechanisms({
    payload,
    profileId: viewer.authUser.id,
    service,
  });
  const diagnosed = await attachExternalCandidateDiagnostics(
    unified,
    viewer.authUser.id,
    service,
  );

  try {
    const enriched = await applyParetoLearningToLiveNowPayload({
      payload: diagnosed,
      profileId: viewer.authUser.id,
    });
    return privateJson(enriched);
  } catch (error) {
    console.error("[pareto-feed] Runtime enrichment failed safely", {
      message: error instanceof Error ? error.message : String(error),
    });
    return privateJson({
      ...diagnosed,
      learningDiagnostics: {
        activeModelKey: "pareto-heuristic-v1",
        candidateModelKey: null,
        coldStart: true,
        directMatchesRandomized: false,
        exposureWriteStatus: "failed",
        experiment: {
          affectedCandidateKey: null,
          arm: "not_assigned",
          assignmentProbability: 0.05,
          enabled: false,
          jointPropensity: 0,
          stableBucket: 0,
          stoppedByGuardrail: false,
        },
        guardrailReasons: ["runtime_enrichment_unavailable"],
        mode: "heuristic",
        objective: "pareto_safe_additionality",
        privateProfileProseProcessed: false,
        requestId: "",
        sensitiveAttributesUsed: false,
      },
    });
  }
}
