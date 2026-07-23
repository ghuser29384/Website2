import { type NextRequest, NextResponse } from "next/server";

import {
  buildProPublicaSearchUrl,
  mapProPublicaOrganizations,
  NONPROFIT_SEARCH_SOURCE,
  normalizeNonprofitSearchQuery,
} from "@/lib/nonprofit-search";

export const runtime = "nodejs";

const MINIMUM_QUERY_LENGTH = 2;
const MAXIMUM_RESULTS = 25;
const SUCCESS_CACHE_CONTROL =
  "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800";
const FALLBACK_CACHE_CONTROL = "public, max-age=0, s-maxage=60, stale-while-revalidate=300";

function json(body: unknown, cacheControl: string) {
  return NextResponse.json(body, {
    headers: {
      "Cache-Control": cacheControl,
    },
  });
}

export async function GET(request: NextRequest) {
  const query = normalizeNonprofitSearchQuery(request.nextUrl.searchParams.get("q"));

  if (query.length < MINIMUM_QUERY_LENGTH) {
    return json(
      {
        query,
        results: [],
        source: NONPROFIT_SEARCH_SOURCE,
      },
      SUCCESS_CACHE_CONTROL,
    );
  }

  try {
    const response = await fetch(buildProPublicaSearchUrl(query), {
      headers: {
        Accept: "application/json",
        "User-Agent": "MoralTrade.org nonprofit autocomplete",
      },
      next: { revalidate: 86_400 },
      signal: AbortSignal.timeout(4_500),
    });

    if (!response.ok) {
      throw new Error(`Nonprofit Explorer returned ${response.status}`);
    }

    const payload = await response.json();
    return json(
      {
        query,
        results: mapProPublicaOrganizations(payload, MAXIMUM_RESULTS),
        source: NONPROFIT_SEARCH_SOURCE,
      },
      SUCCESS_CACHE_CONTROL,
    );
  } catch (error) {
    console.warn("[Moral Trade] Broad nonprofit search is temporarily unavailable.", error);
    return json(
      {
        query,
        results: [],
        source: NONPROFIT_SEARCH_SOURCE,
        sourceUnavailable: true,
      },
      FALLBACK_CACHE_CONTROL,
    );
  }
}
