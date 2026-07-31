import { type NextRequest, NextResponse } from "next/server";

import {
  buildEveryOrgSearchUrl,
  EVERY_ORG_NONPROFIT_SOURCE,
  mapEveryOrgSearchResults,
} from "@/lib/every-org-nonprofit";
import { normalizeNonprofitSearchQuery } from "@/lib/nonprofit-search";

export const runtime = "nodejs";

const MINIMUM_QUERY_LENGTH = 2;
const MAXIMUM_RESULTS = 20;
const REQUEST_TIMEOUT_MS = 4_000;
const SUCCESS_CACHE_CONTROL =
  "public, max-age=120, s-maxage=1800, stale-while-revalidate=86400";
const UNAVAILABLE_CACHE_CONTROL = "private, no-store";

function response(body: unknown, status = 200, cacheControl = SUCCESS_CACHE_CONTROL) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": cacheControl },
  });
}

export async function GET(request: NextRequest) {
  const query = normalizeNonprofitSearchQuery(request.nextUrl.searchParams.get("q"));
  const apiKey = String(process.env.EVERY_ORG_PUBLIC_API_KEY ?? "").trim();

  if (query.length < MINIMUM_QUERY_LENGTH) {
    return response({
      query,
      results: [],
      source: EVERY_ORG_NONPROFIT_SOURCE,
      configured: Boolean(apiKey),
    });
  }

  if (!apiKey) {
    return response(
      {
        query,
        results: [],
        source: EVERY_ORG_NONPROFIT_SOURCE,
        configured: false,
        error: "Every.org nonprofit search is not configured.",
      },
      503,
      UNAVAILABLE_CACHE_CONTROL,
    );
  }

  try {
    const providerResponse = await fetch(
      buildEveryOrgSearchUrl(query, apiKey, MAXIMUM_RESULTS),
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "MoralTrade.org Donation Upgrade nonprofit search",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    );
    if (!providerResponse.ok) {
      throw new Error(`Every.org returned ${providerResponse.status}.`);
    }

    return response({
      query,
      results: mapEveryOrgSearchResults(await providerResponse.json(), MAXIMUM_RESULTS),
      source: EVERY_ORG_NONPROFIT_SOURCE,
      configured: true,
    });
  } catch (error) {
    console.warn("[donation-upgrade] Every.org nonprofit search failed.", {
      message: error instanceof Error ? error.message : "unknown provider error",
    });
    return response(
      {
        query,
        results: [],
        source: EVERY_ORG_NONPROFIT_SOURCE,
        configured: true,
        error: "Every.org nonprofit search is temporarily unavailable.",
      },
      502,
      UNAVAILABLE_CACHE_CONTROL,
    );
  }
}
