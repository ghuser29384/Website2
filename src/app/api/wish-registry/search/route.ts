import { NextResponse } from "next/server";

import {
  getRequestRateLimitKey,
  getRetryAfterSeconds,
  takeRateLimitSlot,
} from "@/lib/rate-limit";
import {
  completeBackgroundQueryEvent,
  recordBackgroundQueryRiskSignal,
  reserveBackgroundQueryBudget,
} from "@/lib/background-operations";
import {
  countRegistrySearchSpecificity,
  getBackgroundQueryFingerprint,
  shouldApplySparseResultPrivacyFloor,
} from "@/lib/background-query-budget";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { searchWishRegistryPreviews } from "@/lib/wish-registry";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const url = new URL(request.url);
  const rateLimit = takeRateLimitSlot(getRequestRateLimitKey(request, "wish-registry-search"), {
    limit: 60,
    windowMs: 60_000,
  });

  if (rateLimit.limited) {
    return NextResponse.json(
      { error: "Too many registry searches. Try again shortly." },
      {
        headers: {
          "Retry-After": String(getRetryAfterSeconds(rateLimit.resetAt)),
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

    return NextResponse.json(
      { error: "Daily registry search budget reached. Try again after the budget window resets." },
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

    if (serviceClient) {
      await completeBackgroundQueryEvent({
        candidateCount: results.length,
        eventId: budgetReservation.eventId,
        metadata: {
          floorApplied,
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
          scope: "registry_search",
          specificity,
        },
        profileId,
        severity: "low",
        signalType: "sparse_registry_search",
        summary:
          "A highly specific registry search returned too few broad previews, so results were withheld to reduce enumeration risk.",
        supabase: serviceClient,
      });
    }

    return NextResponse.json({
      results: floorApplied ? [] : results,
      privacyNotice:
        floorApplied
          ? "Broaden the search to protect sparse profiles. Only broad preview fields are returned, and exact wishes, asks, constraints, contact details, and private sources are never exposed by this endpoint."
          : "Only broad preview fields are returned. Exact wishes, asks, constraints, contact details, and private sources are never exposed by this endpoint.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Registry search failed." },
      { status: 500 },
    );
  }
}
