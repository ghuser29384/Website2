import type { DiscoverSearchOfferKind } from "@/lib/discover-search";

export type DiscoverSourceStatus = "live" | "unavailable" | "not_requested";

/** Missing sources are never silently reported as a complete empty directory. */
export function discoverOffersAvailability(
  individual: DiscoverSourceStatus,
  coFunds: DiscoverSourceStatus,
  kind: DiscoverSearchOfferKind,
): "live" | "partial" | "unavailable" {
  const requested = kind === "individual" ? [individual]
    : kind === "co-fund" ? [coFunds] : [individual, coFunds];
  if (requested.every((source) => source === "live")) return "live";
  return requested.some((source) => source === "live") ? "partial" : "unavailable";
}

export function discoverPageNumber(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 1
    ? Math.min(value, 100) : 1;
}

export function discoverResultPage<T>(items: readonly T[], requestedPage: unknown) {
  const page = discoverPageNumber(requestedPage);
  const pageSize = 50;
  const offset = (page - 1) * pageSize;
  return {
    items: items.slice(offset, offset + pageSize),
    page,
    pageSize,
    total: items.length,
    hasMore: offset + pageSize < items.length,
    truncated: items.length > pageSize,
  };
}
