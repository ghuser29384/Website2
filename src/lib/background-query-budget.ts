import { createHash } from "node:crypto";

export type BackgroundQueryScope =
  | "manual_scan"
  | "profile_save_scan"
  | "saved_search_scan"
  | "delegate_scan"
  | "registry_search";

export interface BackgroundQueryBudgetEvent {
  cost: number;
  created_at: string;
  was_limited: boolean;
}

export interface BackgroundQueryBudgetDecision {
  limit: number;
  limited: boolean;
  remaining: number;
  used: number;
}

export const BACKGROUND_QUERY_DAILY_LIMITS: Record<BackgroundQueryScope, number> = {
  delegate_scan: 60,
  manual_scan: 30,
  profile_save_scan: 40,
  registry_search: 80,
  saved_search_scan: 80,
};

export const BACKGROUND_QUERY_COSTS: Record<BackgroundQueryScope, number> = {
  delegate_scan: 3,
  manual_scan: 5,
  profile_save_scan: 4,
  registry_search: 1,
  saved_search_scan: 2,
};

export function getBackgroundQueryFingerprint(parts: Record<string, unknown>) {
  const stableJson = JSON.stringify(
    Object.keys(parts)
      .sort()
      .reduce<Record<string, unknown>>((accumulator, key) => {
        accumulator[key] = parts[key];
        return accumulator;
      }, {}),
  );

  return createHash("sha256").update(stableJson).digest("hex").slice(0, 32);
}

export function getBackgroundQueryCost(scope: BackgroundQueryScope) {
  return BACKGROUND_QUERY_COSTS[scope];
}

export function getBackgroundQueryWindowStart(now = new Date()) {
  return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
}

export function decideBackgroundQueryBudget({
  cost,
  events,
  limit,
}: {
  cost: number;
  events: BackgroundQueryBudgetEvent[];
  limit: number;
}): BackgroundQueryBudgetDecision {
  const used = events
    .filter((event) => !event.was_limited)
    .reduce((total, event) => total + Math.max(0, event.cost), 0);
  const remainingBefore = Math.max(0, limit - used);
  const limited = used + cost > limit;

  return {
    limit,
    limited,
    remaining: limited ? remainingBefore : Math.max(0, remainingBefore - cost),
    used,
  };
}

export function countRegistrySearchSpecificity({
  cause = "",
  opennessToPayment = false,
  opennessToPledges = false,
  participantKind = "",
  privacyStage = "",
  query = "",
  region = "",
}: {
  cause?: string;
  opennessToPayment?: boolean;
  opennessToPledges?: boolean;
  participantKind?: string;
  privacyStage?: string;
  query?: string;
  region?: string;
}) {
  const queryTokenCount = query
    .toLowerCase()
    .split(/\W+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 3).length;
  const filterCount = [
    cause,
    region,
    participantKind,
    privacyStage,
    opennessToPayment ? "payment" : "",
    opennessToPledges ? "pledges" : "",
  ].filter(Boolean).length;

  return queryTokenCount + filterCount;
}

export function shouldApplySparseResultPrivacyFloor({
  resultCount,
  specificity,
}: {
  resultCount: number;
  specificity: number;
}) {
  return resultCount > 0 && resultCount < 3 && specificity >= 3;
}
