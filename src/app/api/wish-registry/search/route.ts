import { NextResponse } from "next/server";

import {
  getRequestRateLimitKey,
  getRetryAfterSeconds,
  takeRateLimitSlot,
} from "@/lib/rate-limit";
import { hasSupabaseEnv } from "@/lib/supabase/config";
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

  try {
    const results = await searchWishRegistryPreviews({
      cause,
      limit,
      opennessToPayment: url.searchParams.get("payment") === "1",
      opennessToPledges: url.searchParams.get("pledges") === "1",
      query,
    });

    return NextResponse.json({
      results,
      privacyNotice:
        "Only broad preview fields are returned. Exact wishes, asks, constraints, contact details, and private sources are never exposed by this endpoint.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Registry search failed." },
      { status: 500 },
    );
  }
}
