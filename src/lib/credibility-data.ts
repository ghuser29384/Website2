import {
  CREDIBILITY_CATEGORIES,
  CREDIBILITY_DIMENSIONS,
  CREDIBILITY_ROLES,
  DEFAULT_CREDIBILITY_MODEL,
  calculateCredibility,
  type CredibilityAggregateRow,
  type CredibilityCategory,
  type CredibilityContext,
  type CredibilityDimension,
  type CredibilityEligibility,
  type CredibilityModel,
  type CredibilityRole,
  type CredibilitySummary,
} from "@/lib/credibility";
import { getSupabaseEnv } from "@/lib/supabase/config";

interface CredibilityModelRecord {
  version: string;
  prior_success: number | string;
  prior_failure: number | string;
  lower_quantile: number | string;
  minimum_effective_observations: number | string;
  recency_half_life_days: number | string;
  dimension_weights: unknown;
  context_weights: unknown;
}

interface CredibilityAggregateRecord {
  profile_id: string;
  role: string;
  category: string;
  dimension: string;
  weighted_success: number | string;
  weighted_failure: number | string;
  effective_observations: number | string;
  event_count: number | string;
  independent_counterparties: number | string;
  last_event_at: string | null;
  as_of_at: string;
  model_version: string;
}

interface CredibilityStatusRecord {
  profile_id: string;
  eligibility_state: string;
}

function numeric(value: unknown, fallback: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function objectRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function isRole(value: string): value is CredibilityRole {
  return (CREDIBILITY_ROLES as readonly string[]).includes(value);
}

function isCategory(value: string): value is CredibilityCategory {
  return (CREDIBILITY_CATEGORIES as readonly string[]).includes(value);
}

function isDimension(value: string): value is CredibilityDimension {
  return (CREDIBILITY_DIMENSIONS as readonly string[]).includes(value);
}

function isEligibility(value: string): value is CredibilityEligibility {
  return value === "eligible" || value === "review_required" || value === "restricted";
}

async function publicRest<T>(path: string, searchParams: Record<string, string>) {
  const { url, publishableKey } = getSupabaseEnv();
  const endpoint = new URL(`/rest/v1/${path}`, url);
  Object.entries(searchParams).forEach(([key, value]) => endpoint.searchParams.set(key, value));

  const response = await fetch(endpoint, {
    headers: {
      Accept: "application/json",
      apikey: publishableKey,
      Authorization: `Bearer ${publishableKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Credibility read failed with status ${response.status}.`);
  }

  return (await response.json()) as T;
}

function modelFromRecord(record: CredibilityModelRecord): CredibilityModel {
  const dimensionWeights = objectRecord(record.dimension_weights);
  const contextWeights = objectRecord(record.context_weights);

  return {
    version: record.version || DEFAULT_CREDIBILITY_MODEL.version,
    priorSuccess: numeric(record.prior_success, DEFAULT_CREDIBILITY_MODEL.priorSuccess),
    priorFailure: numeric(record.prior_failure, DEFAULT_CREDIBILITY_MODEL.priorFailure),
    lowerQuantile: numeric(record.lower_quantile, DEFAULT_CREDIBILITY_MODEL.lowerQuantile),
    minimumEffectiveObservations: numeric(
      record.minimum_effective_observations,
      DEFAULT_CREDIBILITY_MODEL.minimumEffectiveObservations,
    ),
    recencyHalfLifeDays: numeric(
      record.recency_half_life_days,
      DEFAULT_CREDIBILITY_MODEL.recencyHalfLifeDays,
    ),
    dimensionWeights: {
      fulfilment: numeric(
        dimensionWeights.fulfilment,
        DEFAULT_CREDIBILITY_MODEL.dimensionWeights.fulfilment,
      ),
      evidence_integrity: numeric(
        dimensionWeights.evidence_integrity,
        DEFAULT_CREDIBILITY_MODEL.dimensionWeights.evidence_integrity,
      ),
      settlement: numeric(
        dimensionWeights.settlement,
        DEFAULT_CREDIBILITY_MODEL.dimensionWeights.settlement,
      ),
      dispute_conduct: numeric(
        dimensionWeights.dispute_conduct,
        DEFAULT_CREDIBILITY_MODEL.dimensionWeights.dispute_conduct,
      ),
      responsiveness: numeric(
        dimensionWeights.responsiveness,
        DEFAULT_CREDIBILITY_MODEL.dimensionWeights.responsiveness,
      ),
    },
    contextWeights: {
      exact: numeric(contextWeights.exact, DEFAULT_CREDIBILITY_MODEL.contextWeights.exact),
      sameRole: numeric(
        contextWeights.same_role,
        DEFAULT_CREDIBILITY_MODEL.contextWeights.sameRole,
      ),
      sameCategory: numeric(
        contextWeights.same_category,
        DEFAULT_CREDIBILITY_MODEL.contextWeights.sameCategory,
      ),
      unrelated: numeric(
        contextWeights.unrelated,
        DEFAULT_CREDIBILITY_MODEL.contextWeights.unrelated,
      ),
    },
  };
}

function aggregateFromRecord(record: CredibilityAggregateRecord): CredibilityAggregateRow | null {
  if (!isRole(record.role) || !isCategory(record.category) || !isDimension(record.dimension)) {
    return null;
  }

  return {
    profileId: record.profile_id,
    role: record.role,
    category: record.category,
    dimension: record.dimension,
    weightedSuccess: numeric(record.weighted_success, 0),
    weightedFailure: numeric(record.weighted_failure, 0),
    effectiveObservations: numeric(record.effective_observations, 0),
    eventCount: numeric(record.event_count, 0),
    independentCounterparties: numeric(record.independent_counterparties, 0),
    lastEventAt: record.last_event_at,
    asOfAt: record.as_of_at,
    modelVersion: record.model_version,
  };
}

export async function getActiveCredibilityModel() {
  try {
    const records = await publicRest<CredibilityModelRecord[]>("credibility_model_versions", {
      status: "eq.active",
      select:
        "version,prior_success,prior_failure,lower_quantile,minimum_effective_observations,recency_half_life_days,dimension_weights,context_weights",
      order: "activated_at.desc.nullslast,created_at.desc",
      limit: "1",
    });

    return records[0] ? modelFromRecord(records[0]) : DEFAULT_CREDIBILITY_MODEL;
  } catch {
    return DEFAULT_CREDIBILITY_MODEL;
  }
}

export async function listPublicCredibilityRows(profileIds: string[]) {
  const uniqueProfileIds = [...new Set(profileIds.filter(Boolean))];
  if (!uniqueProfileIds.length) {
    return [];
  }

  try {
    const records = await publicRest<CredibilityAggregateRecord[]>(
      "credibility_public_aggregates",
      {
        profile_id: `in.(${uniqueProfileIds.join(",")})`,
        select:
          "profile_id,role,category,dimension,weighted_success,weighted_failure,effective_observations,event_count,independent_counterparties,last_event_at,as_of_at,model_version",
      },
    );

    return records
      .map(aggregateFromRecord)
      .filter((record): record is CredibilityAggregateRow => Boolean(record));
  } catch {
    return [];
  }
}

export async function listPublicCredibilityStatuses(profileIds: string[]) {
  const uniqueProfileIds = [...new Set(profileIds.filter(Boolean))];
  const statuses = new Map<string, CredibilityEligibility>();

  if (!uniqueProfileIds.length) {
    return statuses;
  }

  try {
    uniqueProfileIds.forEach((profileId) => statuses.set(profileId, "eligible"));
    const records = await publicRest<CredibilityStatusRecord[]>("credibility_profile_status", {
      profile_id: `in.(${uniqueProfileIds.join(",")})`,
      select: "profile_id,eligibility_state",
    });
    records.forEach((record) => {
      if (isEligibility(record.eligibility_state)) {
        statuses.set(record.profile_id, record.eligibility_state);
      }
    });
  } catch {
    uniqueProfileIds.forEach((profileId) => statuses.set(profileId, "review_required"));
  }

  return statuses;
}

export async function getPublicCredibilitySummary(
  profileId: string,
  context: CredibilityContext = {},
): Promise<CredibilitySummary> {
  const [model, rows, statuses] = await Promise.all([
    getActiveCredibilityModel(),
    listPublicCredibilityRows([profileId]),
    listPublicCredibilityStatuses([profileId]),
  ]);

  return calculateCredibility(rows, model, statuses.get(profileId) ?? "eligible", context);
}

export async function listPublicCredibilitySummaries(profileIds: string[]) {
  const uniqueProfileIds = [...new Set(profileIds.filter(Boolean))];
  const [model, rows, statuses] = await Promise.all([
    getActiveCredibilityModel(),
    listPublicCredibilityRows(uniqueProfileIds),
    listPublicCredibilityStatuses(uniqueProfileIds),
  ]);
  const rowsByProfile = new Map<string, CredibilityAggregateRow[]>();

  rows.forEach((row) => {
    const profileRows = rowsByProfile.get(row.profileId) ?? [];
    profileRows.push(row);
    rowsByProfile.set(row.profileId, profileRows);
  });

  return new Map(
    uniqueProfileIds.map((profileId) => [
      profileId,
      calculateCredibility(
        rowsByProfile.get(profileId) ?? [],
        model,
        statuses.get(profileId) ?? "eligible",
      ),
    ]),
  );
}
