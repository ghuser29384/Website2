import { NextResponse } from "next/server";

import { listOpenOffersPreview } from "@/lib/app-data";
import {
  buildPublicOffersCollectionPayload,
  getPublicOffersLiveModeFromSearchParams,
  validatePublicOffersCollectionPayload,
} from "@/lib/public-offers";
import {
  getRequestRateLimitKey,
  getRetryAfterSeconds,
  takeRateLimitSlot,
} from "@/lib/rate-limit";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeRateLimitSlot(
    getRequestRateLimitKey(request, "offer_collection_read"),
    {
      limit: 120,
      windowMs: 60_000,
    },
  );

  if (rateLimit.limited) {
    return NextResponse.json(
      {
        ok: false,
        checkedAt: new Date().toISOString(),
        error: "rate_limited",
        blockers: ["rate_limit_exceeded:offer_collection_read"],
      },
      {
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": String(getRetryAfterSeconds(rateLimit.resetAt)),
        },
        status: 429,
      },
    );
  }

  const searchParams = new URL(request.url).searchParams;
  const liveMode = getPublicOffersLiveModeFromSearchParams(searchParams);
  const liveOffers = hasSupabaseEnv() ? await listOpenOffersPreview(120, liveMode) : [];
  const payload = buildPublicOffersCollectionPayload({
    liveOffers,
    searchParams,
  });
  const validation = validatePublicOffersCollectionPayload(payload);

  return NextResponse.json(
    {
      ok: validation.status === "pass",
      checkedAt: new Date().toISOString(),
      ...payload,
      validation,
      blockers: validation.blockers,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
