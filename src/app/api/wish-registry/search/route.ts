import {
  completeBackgroundQueryEvent,
  recordBackgroundQueryRiskSignal,
  reserveBackgroundQueryBudget,
} from "@/lib/background-operations";
import {
  countRegistrySearchSpecificity,
  getBackgroundQueryWindowStart,
  getBackgroundQueryFingerprint,
  scoreRegistrySearchAnomaly,
  shouldApplySparseResultPrivacyFloor,
} from "@/lib/background-query-budget";
import {
  buildMoralTradeApiJsonResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { searchWishRegistryPreviews } from "@/lib/wish-registry";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!hasSupabaseEnv()) {
    return buildMoralTradeApiJsonResponse(
      { error: "Supabase is not configured." },
      "no_store_dynamic",
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "wish_registry_search");

  if (rateLimit.limited) {
    return buildMoralTradeApiJsonResponse(
      { error: "Too many registry searches. Try again shortly." },
      "no_store_dynamic",
      {
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
        status: 429,
      },
    );
  }

  const cause = url.searchParams.get("cause") ?? "";
  const query = url.searchParams.get("q") ?? "";
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? 20) || 20));
  const opennessToPayment = url.searchParams.get("payment") === "1";
  const opennessToPledges = url.searchParams.get("pledges") === "1";
  const participantKind = url.searchParams.get("participant") ?? "";
  const privacyStage = url.searchParams.get("privacy") ?? "";
  const region = url.searchParams.get("region") ?? "";
  let profileId: string | null = null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    profileId = user?.id ?? null;
  } catch {
    profileId = null;
  }

  let serviceClient: ReturnType<typeof createServiceClient> | null = null;

  try {
    serviceClient = createServiceClient();
  } catch {
    serviceClient = null;
  }

  const queryFingerprint = getBackgroundQueryFingerprint({
    cause,
    limit,
    opennessToPayment,
    opennessToPledges,
    participantKind,
    privacyStage,
    query,
    region,
  });
  const budgetReservation = serviceClient
    ? await reserveBackgroundQueryBudget({
        metadata: { route: "/api/wish-registry/search" },
        profileId,
        queryFingerprint,
        scope: "registry_search",
        supabase: serviceClient,
      })
    : {
        error: null,
        eventId: null,
        limit: 80,
        limited: false,
        remaining: 80,
        used: 0,
      };

  if (budgetReservation.limited && profileId && serviceClient) {
    await recordBackgroundQueryRiskSignal({
      eventId: budgetReservation.eventId,
      metadata: {
        limit: budgetReservation.limit,
        scope: "registry_search",
        used: budgetReservation.used,
      },
      profileId,
      signalType: "background_query_budget_pressure",
      summary:
        "Registry search was blocked because this profile reached its daily background query budget.",
      supabase: serviceClient,
    });

    return buildMoralTradeApiJsonResponse(
      { error: "Daily registry search budget reached. Try again after the budget window resets." },
      "no_store_dynamic",
      { status: 429 },
    );
  }

  try {
    const results = await searchWishRegistryPreviews({
      cause,
      limit,
      opennessToPayment,
      opennessToPledges,
      participantKind,
      privacyStage,
      query,
      region,
    });
    const specificity = countRegistrySearchSpecificity({
      cause,
      opennessToPayment,
      opennessToPledges,
      participantKind,
      privacyStage,
      query,
      region,
    });
    const floorApplied = shouldApplySparseResultPrivacyFloor({
      resultCount: results.length,
      specificity,
    });
    let recentSimilarCount = 0;

    if (serviceClient && profileId) {
      const { count } = await serviceClient
        .from("background_query_events")
        .select("id", { count: "exact", head: true })
        .eq("profile_id", profileId)
        .eq("scope", "registry_search")
        .eq("query_fingerprint", queryFingerprint)
        .gte("created_at", getBackgroundQueryWindowStart());
      recentSimilarCount = count ?? 0;
    }

    const anomaly = scoreRegistrySearchAnomaly({
      floorApplied,
      recentSimilarCount,
      resultCount: results.length,
      specificity,
      wasLimited: budgetReservation.limited,
    });

    if (serviceClient) {
      await completeBackgroundQueryEvent({
        candidateCount: results.length,
        eventId: budgetReservation.eventId,
        metadata: {
          anomalyLevel: anomaly.level,
          anomalyScore: anomaly.score,
          floorApplied,
          recentSimilarCount,
          resultBucket: results.length >= 10 ? "10+" : String(results.length),
          specificity,
        },
        resultCount: floorApplied ? 0 : results.length,
        supabase: serviceClient,
      });
    }

    if (floorApplied && profileId && serviceClient) {
      await recordBackgroundQueryRiskSignal({
        eventId: budgetReservation.eventId,
        metadata: {
          anomalyLevel: anomaly.level,
          anomalyScore: anomaly.score,
          recentSimilarCount,
          scope: "registry_search",
          specificity,
        },
        profileId,
        severity: anomaly.level === "high" ? "high" : anomaly.level === "medium" ? "medium" : "low",
        signalType: "sparse_registry_search",
        summary:
          "A highly specific registry search returned too few broad previews, so results were withheld to reduce enumeration risk.",
        supabase: serviceClient,
      });
    } else if (
      profileId &&
      serviceClient &&
      (anomaly.level === "medium" || anomaly.level === "high")
    ) {
      await recordBackgroundQueryRiskSignal({
        eventId: budgetReservation.eventId,
        metadata: {
          anomalyLevel: anomaly.level,
          anomalyScore: anomaly.score,
          recentSimilarCount,
          resultBucket: results.length >= 10 ? "10+" : String(results.length),
          scope: "registry_search",
          specificity,
        },
        profileId,
        severity: anomaly.level,
        signalType: "narrow_registry_search_pattern",
        summary:
          "Repeated or highly specific registry searches are creating enumeration pressure and should be reviewed.",
        supabase: serviceClient,
      });
    }

    return buildMoralTradeApiJsonResponse({
      results: floorApplied ? [] : results,
      privacyNotice:
        floorApplied
          ? "Broaden the search to protect sparse profiles. Only broad preview fields are returned, and exact wishes, asks, constraints, contact details, and private sources are never exposed by this endpoint."
          : "Only broad preview fields are returned. Exact wishes, asks, constraints, contact details, and private sources are never exposed by this endpoint.",
    });
  } catch (error) {
    return buildMoralTradeApiJsonResponse(
      { error: error instanceof Error ? error.message : "Registry search failed." },
      "no_store_dynamic",
      { status: 500 },
    );
  }
}
