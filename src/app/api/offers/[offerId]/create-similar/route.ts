import { NextResponse } from "next/server";

import { getOfferById } from "@/lib/app-data";
import {
  buildOfferCreateSimilarPayload,
  validateOfferCreateSimilarPayload,
} from "@/lib/offer-create-similar";
import { isPublicLiveOfferId } from "@/lib/offer-follows";
import {
  getRequestRateLimitKey,
  getRetryAfterSeconds,
  takeRateLimitSlot,
} from "@/lib/rate-limit";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface OfferCreateSimilarRouteContext {
  params: Promise<{
    offerId: string;
  }>;
}

export async function POST(request: Request, context: OfferCreateSimilarRouteContext) {
  const rateLimit = takeRateLimitSlot(
    getRequestRateLimitKey(request, "offer_create_similar"),
    {
      limit: 30,
      windowMs: 60_000,
    },
  );

  if (rateLimit.limited) {
    return NextResponse.json(
      {
        ok: false,
        checkedAt: new Date().toISOString(),
        error: "rate_limited",
        blockers: ["rate_limit_exceeded:offer_create_similar"],
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
          "Retry-After": String(getRetryAfterSeconds(rateLimit.resetAt)),
        },
        status: 429,
      },
    );
  }

  const { offerId } = await context.params;
  const validatedPayload = buildOfferCreateSimilarPayload({
    mode: "validated",
    offerId,
  });
  const initialValidation = validateOfferCreateSimilarPayload(validatedPayload);

  if (!isPublicLiveOfferId(offerId)) {
    return NextResponse.json(
      {
        ok: false,
        checkedAt: new Date().toISOString(),
        ...validatedPayload,
        validation: initialValidation,
        blockers: initialValidation.blockers,
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
        status: 400,
      },
    );
  }

  if (!hasSupabaseEnv()) {
    return NextResponse.json(
      {
        ok: false,
        checkedAt: new Date().toISOString(),
        ...validatedPayload,
        validation: {
          ...initialValidation,
          status: "fail",
          blockers: ["supabase_unconfigured:offer_create_similar"],
        },
        blockers: ["supabase_unconfigured:offer_create_similar"],
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
        status: 503,
      },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const payload = buildOfferCreateSimilarPayload({
      mode: "auth_required",
      offerId,
    });
    const validation = validateOfferCreateSimilarPayload(payload);

    return NextResponse.json(
      {
        ok: false,
        checkedAt: new Date().toISOString(),
        ...payload,
        validation,
        blockers: ["authentication_required:offer_create_similar"],
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
        status: 401,
      },
    );
  }

  const offer = await getOfferById(offerId);

  if (!offer) {
    const payload = buildOfferCreateSimilarPayload({
      mode: "source_unavailable",
      offerId,
      sourceStatus: "missing",
    });
    const validation = validateOfferCreateSimilarPayload(payload);

    return NextResponse.json(
      {
        ok: false,
        checkedAt: new Date().toISOString(),
        ...payload,
        validation: {
          ...validation,
          status: "fail",
          blockers: ["offer_not_found:offer_create_similar"],
        },
        blockers: ["offer_not_found:offer_create_similar"],
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
        status: 404,
      },
    );
  }

  if (offer.status !== "open") {
    const payload = buildOfferCreateSimilarPayload({
      mode: "source_unavailable",
      offer,
      offerId,
      sourceStatus: "not_live",
    });
    const validation = validateOfferCreateSimilarPayload(payload);

    return NextResponse.json(
      {
        ok: false,
        checkedAt: new Date().toISOString(),
        ...payload,
        validation: {
          ...validation,
          status: "fail",
          blockers: ["offer_not_live:offer_create_similar"],
        },
        blockers: ["offer_not_live:offer_create_similar"],
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
        status: 409,
      },
    );
  }

  const payload = buildOfferCreateSimilarPayload({
    mode: "ready",
    offer,
    offerId,
  });
  const validation = validateOfferCreateSimilarPayload(payload);

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
        "Cache-Control": "private, no-store",
      },
    },
  );
}
