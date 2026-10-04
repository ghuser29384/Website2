import { NextResponse } from "next/server";

import {
  getDirectDonationUpgradeConfig,
  searchEveryOrgNonprofits,
} from "@/lib/direct-donation-upgrade";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 60;
const buckets = new Map<string, { startedAt: number; count: number }>();

function clientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}

function rateLimited(key: string, now = Date.now()) {
  const current = buckets.get(key);
  if (!current || now - current.startedAt >= WINDOW_MS) {
    buckets.set(key, { startedAt: now, count: 1 });
    return false;
  }
  current.count += 1;
  if (buckets.size > 5_000) {
    for (const [candidate, bucket] of buckets) {
      if (now - bucket.startedAt >= WINDOW_MS) buckets.delete(candidate);
    }
  }
  return current.count > MAX_REQUESTS_PER_WINDOW;
}

function response(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(request: Request) {
  if (rateLimited(clientKey(request))) {
    return response({ error: "Too many nonprofit searches. Wait one minute and try again." }, 429);
  }

  const config = getDirectDonationUpgradeConfig();
  if (!config.readyForSearch) {
    return response(
      { error: config.blockers[0] ?? "Every.org nonprofit search is unavailable." },
      503,
    );
  }

  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) return response({ results: [] });
  if (query.length > 120) return response({ error: "The search query is too long." }, 400);

  try {
    const results = await searchEveryOrgNonprofits(query, config, 12);
    return response({ results });
  } catch (error) {
    console.error("[direct-donation-upgrade-search] Every.org search failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return response({ error: "Every.org nonprofit search is temporarily unavailable." }, 503);
  }
}
