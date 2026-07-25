import { type NextRequest, NextResponse } from "next/server";

import {
  buildOpenAlexFunderSearchUrl,
  buildOpenAlexInstitutionSearchUrl,
  buildProPublicaSearchUrl,
  buildWikidataSearchUrl,
  mapOpenAlexFunders,
  mapOpenAlexInstitutions,
  mapProPublicaOrganizations,
  mapWikidataOrganizations,
  mergeOrganizationSuggestions,
  NONPROFIT_SEARCH_SOURCE,
  normalizeNonprofitSearchQuery,
  OPENALEX_FUNDER_SOURCE,
  OPENALEX_INSTITUTION_SOURCE,
  PROPUBLICA_SEARCH_SOURCE,
  WIKIDATA_SEARCH_SOURCE,
  type NonprofitSuggestion,
} from "@/lib/nonprofit-search";

export const runtime = "nodejs";

const MINIMUM_QUERY_LENGTH = 2;
const MAXIMUM_RESULTS = 60;
const MAXIMUM_PROVIDER_RESULTS = 30;
const PROVIDER_TIMEOUT_MS = 3_800;
const SUCCESS_CACHE_CONTROL =
  "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800";
const FALLBACK_CACHE_CONTROL = "public, max-age=0, s-maxage=60, stale-while-revalidate=300";
const USER_AGENT = "MoralTrade.org organization autocomplete (contact@moraltrade.org)";

interface SearchProvider {
  source: string;
  url: string;
  map: (payload: unknown) => NonprofitSuggestion[];
}

function json(body: unknown, cacheControl: string) {
  return NextResponse.json(body, {
    headers: {
      "Cache-Control": cacheControl,
    },
  });
}

async function searchProvider(provider: SearchProvider) {
  const response = await fetch(provider.url, {
    headers: {
      Accept: "application/json",
      "Api-User-Agent": USER_AGENT,
      "User-Agent": USER_AGENT,
    },
    next: { revalidate: 86_400 },
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`${provider.source} returned ${response.status}`);
  }

  return provider.map(await response.json());
}

export async function GET(request: NextRequest) {
  const query = normalizeNonprofitSearchQuery(request.nextUrl.searchParams.get("q"));

  if (query.length < MINIMUM_QUERY_LENGTH) {
    return json(
      {
        query,
        results: [],
        source: NONPROFIT_SEARCH_SOURCE,
        sources: [],
        unavailableSources: [],
      },
      SUCCESS_CACHE_CONTROL,
    );
  }

  const providers: SearchProvider[] = [
    {
      source: PROPUBLICA_SEARCH_SOURCE,
      url: buildProPublicaSearchUrl(query),
      map: (payload) =>
        mapProPublicaOrganizations(payload, MAXIMUM_PROVIDER_RESULTS, query),
    },
    {
      source: WIKIDATA_SEARCH_SOURCE,
      url: buildWikidataSearchUrl(query, MAXIMUM_PROVIDER_RESULTS),
      map: (payload) => mapWikidataOrganizations(payload, query, MAXIMUM_PROVIDER_RESULTS),
    },
    {
      source: OPENALEX_INSTITUTION_SOURCE,
      url: buildOpenAlexInstitutionSearchUrl(query, MAXIMUM_PROVIDER_RESULTS),
      map: (payload) => mapOpenAlexInstitutions(payload, query, MAXIMUM_PROVIDER_RESULTS),
    },
    {
      source: OPENALEX_FUNDER_SOURCE,
      url: buildOpenAlexFunderSearchUrl(query, MAXIMUM_PROVIDER_RESULTS),
      map: (payload) => mapOpenAlexFunders(payload, query, MAXIMUM_PROVIDER_RESULTS),
    },
  ];

  const settled = await Promise.allSettled(providers.map((provider) => searchProvider(provider)));
  const resultGroups: NonprofitSuggestion[][] = [];
  const sources: string[] = [];
  const unavailableSources: string[] = [];

  settled.forEach((result, index) => {
    const provider = providers[index];
    if (result.status === "fulfilled") {
      resultGroups.push(result.value);
      sources.push(provider.source);
      return;
    }

    unavailableSources.push(provider.source);
    console.warn(`[Moral Trade] ${provider.source} search is temporarily unavailable.`, result.reason);
  });

  const results = mergeOrganizationSuggestions(resultGroups, MAXIMUM_RESULTS);
  const sourceUnavailable = sources.length === 0;

  return json(
    {
      query,
      results,
      source: NONPROFIT_SEARCH_SOURCE,
      sources,
      unavailableSources,
      sourceUnavailable,
    },
    sourceUnavailable ? FALLBACK_CACHE_CONTROL : SUCCESS_CACHE_CONTROL,
  );
}
