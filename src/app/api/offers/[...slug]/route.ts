import { NextResponse } from "next/server";

import { getOfferById } from "@/lib/app-data";
import {
  buildPublicOfferDetailPayload,
  getPublicOfferSlugFromSegments,
  validatePublicOfferDetailPayload,
} from "@/lib/public-offers";
import {
  getRequestRateLimitKey,
  getRetryAfterSeconds,
  takeRateLimitSlot,
} from "@/lib/rate-limit";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

interface PublicOfferDetailRouteContext {
  params: Promise<{
    slug?: string[];
  }>;
}

export async function GET(request: Request, context: PublicOfferDetailRouteContext) {
  const rateLimit = takeRateLimitSlot(
    getRequestRateLimitKey(request, "offer_detail_read"),
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
        blockers: ["rate_limit_exceeded:offer_detail_read"],
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

  const { slug: segments = [] } = await context.params;
  const slug = getPublicOfferSlugFromSegments(segments);
  let payload = buildPublicOfferDetailPayload({
    liveOffers: [],
    slug,
  });

  if (!payload.item && hasSupabaseEnv() && slug && !slug.startsWith("examples/")) {
    const liveOffer = await getOfferById(slug);
    payload = buildPublicOfferDetailPayload({
      liveOffers: liveOffer?.status === "open" ? [liveOffer] : [],
      slug,
    });
  }

  const validation = validatePublicOfferDetailPayload(payload);
  const status = payload.item ? 200 : 404;

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
      status,
    },
  );
}
