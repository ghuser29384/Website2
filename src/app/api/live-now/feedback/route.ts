import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getViewer } from "@/lib/app-data";
import { getAtlasField } from "@/lib/bottleneck-atlas";
import {
  getActionDescriptor,
  isRecommendationEventType,
  isRecommendationOpportunityType,
  type RecommendationEventType,
  type RecommendationOpportunityType,
} from "@/lib/recommendation-learning";
import {
  OPPORTUNITY_SYNTHESIS_VERSION,
  SYNTHESIZED_OPPORTUNITY_PREFIX,
  parseSynthesizedOpportunityId,
} from "@/lib/opportunity-synthesis";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_EVENTS_PER_REQUEST = 20;
const MAX_DWELL_MS = 30 * 60 * 1_000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PASSIVE_EVENT_TYPES = new Set<RecommendationEventType>([
  "impression",
  "open",
  "dwell",
  "cause_view",
]);
const SYNTHESIZED_CANDIDATE_EVENT_TYPES = new Set<RecommendationEventType>([
  "impression",
  "open",
  "dwell",
  "save",
  "unsave",
  "hide",
  "not_for_me",
  "easy",
  "hard",
]);
const SAFE_SURFACES = new Set([
  "home_feed",
  "offer_detail",
  "donation_redirect",
  "donation_pool",
  "cause_directory",
]);

interface FeedbackEventInput {
  opportunityType?: unknown;
  opportunityId?: unknown;
  eventType?: unknown;
  dwellMs?: unknown;
  idempotencyKey?: unknown;
  metadata?: unknown;
}

interface NormalizedFeedbackEvent {
  opportunityType: RecommendationOpportunityType;
  opportunityId: string;
  eventType: RecommendationEventType;
  dwellMs: number;
  idempotencyKey: string;
  metadata: { surface?: string; rank?: number };
}

interface OfferSignalRow {
  id: string;
  mode: "offset" | "payment" | "pledge";
  offered_cause: string;
  requested_cause: string;
  compromise_cause: string;
  request_action: string;
}

interface PoolSignalRow {
  id: string;
  name: string;
  compromise_charity_id: string;
  side_a_label: string;
  side_b_label: string;
}

interface CharitySignalRow {
  id: string;
  name: string;
  cause_area: string;
  consensus_label: string;
}

interface RecommendationInteractionInsertRow {
  profile_id: string;
  opportunity_type: RecommendationOpportunityType;
  opportunity_id: string;
  event_type: RecommendationEventType;
  benefit_causes: string[];
  action_causes: string[];
  action_key: string;
  action_label: string;
  inferred_difficulty: number | null;
  dwell_ms: number;
  idempotency_key: string;
  metadata: { surface?: string; rank?: number; model_version: string };
  occurred_at: string;
}

function privateJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      Vary: "Cookie",
    },
  });
}

function privateNoContent() {
  return new NextResponse(null, {
    status: 204,
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

function cleanText(value: unknown, maximum: number) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function normalizeMetadata(value: unknown) {
  if (!value || typeof value !== "object") return {};
  const metadata = value as Record<string, unknown>;
  const surface = cleanText(metadata.surface, 40);
  const rank = Number(metadata.rank);
  return {
    ...(SAFE_SURFACES.has(surface) ? { surface } : {}),
    ...(Number.isInteger(rank) && rank >= 0 && rank <= 1_000 ? { rank } : {}),
  };
}

function normalizeEvent(value: FeedbackEventInput): NormalizedFeedbackEvent | null {
  if (!isRecommendationOpportunityType(value.opportunityType)) return null;
  if (!isRecommendationEventType(value.eventType)) return null;
  const opportunityId = cleanText(value.opportunityId, 160);
  const idempotencyKey = cleanText(value.idempotencyKey, 160);
  if (!opportunityId || !idempotencyKey) return null;
  if (value.opportunityType === "cause_topic" && value.eventType !== "cause_view") return null;
  if (value.opportunityType !== "cause_topic" && value.eventType === "cause_view") return null;

  return {
    opportunityType: value.opportunityType,
    opportunityId,
    eventType: value.eventType,
    dwellMs: Math.max(0, Math.min(MAX_DWELL_MS, Math.floor(Number(value.dwellMs) || 0))),
    idempotencyKey,
    metadata: normalizeMetadata(value.metadata),
  };
}

function isAnonymousPassiveFeedback(body: Record<string, unknown>) {
  if (Object.keys(body).some((key) => key !== "events")) return false;
  if (
    !Array.isArray(body.events) ||
    body.events.length === 0 ||
    body.events.length > MAX_EVENTS_PER_REQUEST
  ) {
    return false;
  }

  return body.events.every((event) => {
    if (!event || typeof event !== "object") return false;
    const normalized = normalizeEvent(event as FeedbackEventInput);
    return Boolean(normalized && PASSIVE_EVENT_TYPES.has(normalized.eventType));
  });
}

function safeCause(value: string | null | undefined) {
  return (value ?? "").trim().slice(0, 120);
}

function uniqueCauses(...groups: Array<readonly string[] | null | undefined>) {
  const seen = new Set<string>();
  const causes: string[] = [];
  for (const value of groups.flatMap((group) => group ?? [])) {
    const cause = safeCause(value);
    const key = cause.toLowerCase();
    if (!cause || seen.has(key)) continue;
    seen.add(key);
    causes.push(cause);
  }
  return causes.slice(0, 12);
}

async function requireFeedbackViewer() {
  if (!hasSupabaseEnv()) return null;
  const cookieStore = await cookies();
  if (!hasSupabaseAuthCookie(cookieStore)) return null;
  return getViewer();
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  let invalidJson = false;
  try {
    const parsed = await request.json();
    body = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    body = {};
    invalidJson = true;
  }

  const viewer = await requireFeedbackViewer();
  if (!viewer) {
    if (!invalidJson && isAnonymousPassiveFeedback(body)) return privateNoContent();
    return privateJson({ authenticated: false }, 401);
  }
  if (invalidJson) return privateJson({ error: "Invalid JSON payload." }, 400);

  const supabase = await createClient();
  const typedSupabase = supabase as any;
  const profileId = viewer.authUser.id;
  const requestedLearningEnabled =
    typeof body.learningEnabled === "boolean" ? body.learningEnabled : null;
  const requestedExploration = Number(body.explorationPercent);
  const explorationPercent = Number.isInteger(requestedExploration)
    ? Math.max(0, Math.min(30, requestedExploration))
    : null;

  if (requestedLearningEnabled !== null || explorationPercent !== null) {
    const { error: preferenceError } = await typedSupabase
      .from("recommendation_preferences")
      .upsert(
        {
          profile_id: profileId,
          ...(requestedLearningEnabled !== null
            ? { learn_from_browsing: requestedLearningEnabled }
            : {}),
          ...(explorationPercent !== null ? { exploration_percent: explorationPercent } : {}),
        },
        { onConflict: "profile_id" },
      );

    if (preferenceError) {
      console.error("[live-now-feedback] Failed to save learning preferences", {
        message: preferenceError.message,
        profileId,
      });
      return privateJson({ error: "Learning preferences could not be saved." }, 503);
    }
  }

  const { data: preferenceData, error: preferenceReadError } = await typedSupabase
    .from("recommendation_preferences")
    .select("learn_from_browsing,exploration_percent")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (preferenceReadError) {
    console.error("[live-now-feedback] Failed to read learning preferences", {
      message: preferenceReadError.message,
      profileId,
    });
  }
  const learningEnabled =
    requestedLearningEnabled ?? preferenceData?.learn_from_browsing ?? true;

  const rawEvents = Array.isArray(body.events) ? body.events.slice(0, MAX_EVENTS_PER_REQUEST) : [];
  const normalizedEvents = rawEvents
    .filter((event): event is FeedbackEventInput => Boolean(event) && typeof event === "object")
    .map(normalizeEvent)
    .filter((event): event is NormalizedFeedbackEvent => Boolean(event))
    .filter((event) => learningEnabled || !PASSIVE_EVENT_TYPES.has(event.eventType));

  if (!normalizedEvents.length) {
    return privateJson({
      authenticated: true,
      acceptedEventCount: 0,
      learningEnabled,
      explorationPercent: preferenceData?.exploration_percent ?? explorationPercent ?? 12,
    });
  }

  const offerIds = [...new Set(
    normalizedEvents
      .filter(
        (event) =>
          (event.opportunityType === "offer" || event.opportunityType === "donation_redirect") &&
          !event.opportunityId.startsWith(SYNTHESIZED_OPPORTUNITY_PREFIX) &&
          UUID_PATTERN.test(event.opportunityId),
      )
      .map((event) => event.opportunityId),
  )];
  const poolIds = [...new Set(
    normalizedEvents
      .filter(
        (event) =>
          event.opportunityType === "donation_pool" && UUID_PATTERN.test(event.opportunityId),
      )
      .map((event) => event.opportunityId),
  )];

  const [offersResult, poolsResult] = await Promise.all([
    offerIds.length
      ? supabase
          .from("offers")
          .select("id,mode,offered_cause,requested_cause,compromise_cause,request_action")
          .in("id", offerIds)
      : Promise.resolve({ data: [] as OfferSignalRow[], error: null }),
    poolIds.length
      ? typedSupabase
          .from("donation_offset_pools")
          .select("id,name,compromise_charity_id,side_a_label,side_b_label")
          .in("id", poolIds)
      : Promise.resolve({ data: [] as PoolSignalRow[], error: null }),
  ]);

  if (offersResult.error || poolsResult.error) {
    console.error("[live-now-feedback] Failed to resolve opportunity metadata", {
      offerError: offersResult.error?.message,
      poolError: poolsResult.error?.message,
      profileId,
    });
    return privateJson({ error: "Opportunity feedback could not be resolved." }, 503);
  }

  const pools = (poolsResult.data ?? []) as PoolSignalRow[];
  const charityIds = [...new Set(pools.map((pool) => pool.compromise_charity_id).filter(Boolean))];
  const charitiesResult = charityIds.length
    ? await typedSupabase
        .from("registered_charities")
        .select("id,name,cause_area,consensus_label")
        .in("id", charityIds)
    : { data: [] as CharitySignalRow[], error: null };
  if (charitiesResult.error) {
    console.error("[live-now-feedback] Failed to resolve pool destinations", {
      message: charitiesResult.error.message,
      profileId,
    });
  }

  const offerById = new Map(
    ((offersResult.data ?? []) as OfferSignalRow[]).map((offer) => [offer.id, offer]),
  );
  const poolById = new Map(pools.map((pool) => [pool.id, pool]));
  const charityById = new Map(
    ((charitiesResult.data ?? []) as CharitySignalRow[]).map((charity) => [charity.id, charity]),
  );
  const occurredAt = new Date().toISOString();
  const rows = normalizedEvents.flatMap<RecommendationInteractionInsertRow>((event) => {
    if (event.opportunityType === "cause_topic") {
      const cause = safeCause(event.opportunityId.replace(/-/g, " "));
      if (!cause) return [];
      return [
        {
          profile_id: profileId,
          opportunity_type: "cause_topic",
          opportunity_id: event.opportunityId,
          event_type: event.eventType,
          benefit_causes: [cause],
          action_causes: [],
          action_key: "",
          action_label: "",
          inferred_difficulty: null,
          dwell_ms: event.dwellMs,
          idempotency_key: event.idempotencyKey,
          metadata: { ...event.metadata, model_version: "adaptive-moral-feed-v1" },
          occurred_at: occurredAt,
        },
      ];
    }

    const synthesized = parseSynthesizedOpportunityId(event.opportunityId);
    if (synthesized) {
      const canonicalType: RecommendationOpportunityType =
        synthesized.template.id === "reciprocal-donation-redirect"
          ? "donation_redirect"
          : "offer";
      if (event.opportunityType !== canonicalType) return [];
      if (!SYNTHESIZED_CANDIDATE_EVENT_TYPES.has(event.eventType)) return [];

      const sourceCauses = synthesized.template.sourceFieldIds.flatMap((fieldId) => {
        const field = getAtlasField(fieldId);
        return field ? [field.name, ...field.aliases.slice(0, 2)] : [];
      });
      const benefitCauses = uniqueCauses(
        [synthesized.matchedCause, synthesized.template.offeredCause],
        sourceCauses,
      );
      const actionCauses = uniqueCauses(
        [synthesized.template.requestedCause],
        sourceCauses,
      );
      const descriptor = getActionDescriptor({
        actionText: synthesized.template.firstPartyGives,
        actionCause: actionCauses[0] ?? synthesized.template.requestedCause,
        mode: canonicalType === "donation_redirect" ? "offset" : "pledge",
        opportunityType: canonicalType,
      });
      return [
        {
          profile_id: profileId,
          opportunity_type: canonicalType,
          opportunity_id: event.opportunityId,
          event_type: event.eventType,
          benefit_causes: benefitCauses,
          action_causes: actionCauses,
          action_key: descriptor.key,
          action_label: descriptor.label,
          inferred_difficulty: descriptor.defaultDifficulty,
          dwell_ms: event.dwellMs,
          idempotency_key: event.idempotencyKey,
          metadata: {
            ...event.metadata,
            model_version: OPPORTUNITY_SYNTHESIS_VERSION,
          },
          occurred_at: occurredAt,
        },
      ];
    }

    if (event.opportunityType === "donation_pool") {
      const pool = poolById.get(event.opportunityId);
      if (!pool) return [];
      const charity = charityById.get(pool.compromise_charity_id);
      const benefitCauses = uniqueCauses(
        charity?.cause_area ? [charity.cause_area] : [],
        charity?.consensus_label ? [charity.consensus_label] : [],
        charity?.name ? [charity.name] : [],
      );
      const actionCauses = uniqueCauses([pool.side_a_label, pool.side_b_label]);
      const descriptor = getActionDescriptor({
        actionText: `Join ${pool.name} with a planned donation`,
        actionCause: actionCauses[0] ?? "Donation redirect",
        mode: "offset",
        opportunityType: "donation_pool",
      });
      return [
        {
          profile_id: profileId,
          opportunity_type: "donation_pool",
          opportunity_id: pool.id,
          event_type: event.eventType,
          benefit_causes: benefitCauses,
          action_causes: actionCauses,
          action_key: descriptor.key,
          action_label: descriptor.label,
          inferred_difficulty: descriptor.defaultDifficulty,
          dwell_ms: event.dwellMs,
          idempotency_key: event.idempotencyKey,
          metadata: { ...event.metadata, model_version: "adaptive-moral-feed-v1" },
          occurred_at: occurredAt,
        },
      ];
    }

    const offer = offerById.get(event.opportunityId);
    if (!offer) return [];
    const canonicalType: RecommendationOpportunityType =
      offer.mode === "offset" ? "donation_redirect" : "offer";
    const benefitCauses = uniqueCauses(
      [offer.offered_cause],
      offer.compromise_cause && offer.compromise_cause !== "Not needed"
        ? [offer.compromise_cause]
        : [],
    );
    const actionCauses = uniqueCauses([offer.requested_cause]);
    const descriptor = getActionDescriptor({
      actionText: offer.request_action || offer.requested_cause,
      actionCause: actionCauses[0] ?? offer.requested_cause,
      mode: offer.mode,
      opportunityType: canonicalType,
    });
    return [
      {
        profile_id: profileId,
        opportunity_type: canonicalType,
        opportunity_id: offer.id,
        event_type: event.eventType,
        benefit_causes: benefitCauses,
        action_causes: actionCauses,
        action_key: descriptor.key,
        action_label: descriptor.label,
        inferred_difficulty: descriptor.defaultDifficulty,
        dwell_ms: event.dwellMs,
        idempotency_key: event.idempotencyKey,
        metadata: { ...event.metadata, model_version: "adaptive-moral-feed-v1" },
        occurred_at: occurredAt,
      },
    ];
  });

  if (!rows.length) {
    return privateJson({
      authenticated: true,
      acceptedEventCount: 0,
      learningEnabled,
      explorationPercent: preferenceData?.exploration_percent ?? explorationPercent ?? 12,
    });
  }

  const { error: insertError } = await typedSupabase
    .from("recommendation_interactions")
    .upsert(rows, {
      onConflict: "profile_id,idempotency_key",
      ignoreDuplicates: true,
    });

  if (insertError) {
    console.error("[live-now-feedback] Failed to persist opportunity feedback", {
      message: insertError.message,
      profileId,
    });
    return privateJson({ error: "Opportunity feedback could not be saved." }, 503);
  }

  return privateJson({
    authenticated: true,
    acceptedEventCount: rows.length,
    learningEnabled,
    explorationPercent: preferenceData?.exploration_percent ?? explorationPercent ?? 12,
  });
}

export async function DELETE() {
  const viewer = await requireFeedbackViewer();
  if (!viewer) return privateJson({ authenticated: false }, 401);

  const supabase = await createClient();
  const { error } = await (supabase as any)
    .from("recommendation_interactions")
    .delete()
    .eq("profile_id", viewer.authUser.id);

  if (error) {
    console.error("[live-now-feedback] Failed to clear learned signals", {
      message: error.message,
      profileId: viewer.authUser.id,
    });
    return privateJson({ error: "Learned signals could not be cleared." }, 503);
  }

  return privateJson({ authenticated: true, cleared: true });
}
