import { NextResponse } from "next/server";

import {
  buildOfferFollowPayload,
  isPublicLiveOfferId,
  normalizeOfferFollowAction,
  validateOfferFollowPayload,
} from "@/lib/offer-follows";
import {
  getRequestRateLimitKey,
  getRetryAfterSeconds,
  takeRateLimitSlot,
} from "@/lib/rate-limit";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface OfferFollowRouteContext {
  params: Promise<{
    offerId: string;
  }>;
}

export async function POST(request: Request, context: OfferFollowRouteContext) {
  const rateLimit = takeRateLimitSlot(
    getRequestRateLimitKey(request, "offer_follow_write"),
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
        blockers: ["rate_limit_exceeded:offer_follow_write"],
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
  let body: Record<string, unknown> = {};

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const action = normalizeOfferFollowAction(body.action);
  const validatedPayload = buildOfferFollowPayload({
    action,
    mode: "validated",
    offerId,
  });
  const initialValidation = validateOfferFollowPayload(validatedPayload);

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
          blockers: ["supabase_unconfigured:offer_follow_write"],
        },
        blockers: ["supabase_unconfigured:offer_follow_write"],
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
    const payload = buildOfferFollowPayload({
      action,
      mode: "auth_required",
      offerId,
    });
    const validation = validateOfferFollowPayload(payload);

    return NextResponse.json(
      {
        ok: false,
        checkedAt: new Date().toISOString(),
        ...payload,
        validation,
        blockers: ["authentication_required:offer_follow_write"],
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
        status: 401,
      },
    );
  }

  const { data: offer, error: offerError } = await supabase
    .from("offers")
    .select("id, owner_id, status")
    .eq("id", offerId)
    .maybeSingle();

  if (offerError || !offer) {
    return NextResponse.json(
      {
        ok: false,
        checkedAt: new Date().toISOString(),
        ...validatedPayload,
        validation: {
          ...initialValidation,
          status: "fail",
          blockers: ["offer_not_found:offer_follow_write"],
        },
        blockers: ["offer_not_found:offer_follow_write"],
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
        status: 404,
      },
    );
  }

  if (offer.owner_id === user.id) {
    return NextResponse.json(
      {
        ok: false,
        checkedAt: new Date().toISOString(),
        ...validatedPayload,
        validation: {
          ...initialValidation,
          status: "fail",
          blockers: ["own_offer_forbidden:offer_follow_write"],
        },
        blockers: ["own_offer_forbidden:offer_follow_write"],
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
        status: 403,
      },
    );
  }

  if (offer.status !== "open") {
    return NextResponse.json(
      {
        ok: false,
        checkedAt: new Date().toISOString(),
        ...validatedPayload,
        validation: {
          ...initialValidation,
          status: "fail",
          blockers: ["offer_not_live:offer_follow_write"],
        },
        blockers: ["offer_not_live:offer_follow_write"],
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
        status: 409,
      },
    );
  }

  const { data: existing, error: existingError } = await supabase
    .from("offer_carts")
    .select("*")
    .eq("offer_id", offerId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json(
      {
        ok: false,
        checkedAt: new Date().toISOString(),
        ...validatedPayload,
        validation: {
          ...initialValidation,
          status: "fail",
          blockers: ["database_read_failed:offer_follow_write"],
        },
        blockers: ["database_read_failed:offer_follow_write"],
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
        status: 500,
      },
    );
  }

  if (existing && (action === "follow" || action === "toggle")) {
    const mode = action === "toggle" ? "unfollowed" : "already_followed";

    if (action === "toggle") {
      const { error } = await supabase
        .from("offer_carts")
        .delete()
        .eq("offer_id", offerId)
        .eq("user_id", user.id);

      if (error) {
        return NextResponse.json(
          {
            ok: false,
            checkedAt: new Date().toISOString(),
            ...validatedPayload,
            validation: {
              ...initialValidation,
              status: "fail",
              blockers: ["database_delete_failed:offer_follow_write"],
            },
            blockers: ["database_delete_failed:offer_follow_write"],
          },
          {
            headers: {
              "Cache-Control": "private, no-store",
            },
            status: 500,
          },
        );
      }
    }

    const payload = buildOfferFollowPayload({
      action,
      createdAt: action === "toggle" ? null : existing.created_at,
      isFollowing: action !== "toggle",
      mode,
      offerId,
    });
    const validation = validateOfferFollowPayload(payload);

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

  if (existing && action === "unfollow") {
    const { error } = await supabase
      .from("offer_carts")
      .delete()
      .eq("offer_id", offerId)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          checkedAt: new Date().toISOString(),
          ...validatedPayload,
          validation: {
            ...initialValidation,
            status: "fail",
            blockers: ["database_delete_failed:offer_follow_write"],
          },
          blockers: ["database_delete_failed:offer_follow_write"],
        },
        {
          headers: {
            "Cache-Control": "private, no-store",
          },
          status: 500,
        },
      );
    }

    const payload = buildOfferFollowPayload({
      action,
      isFollowing: false,
      mode: "unfollowed",
      offerId,
    });
    const validation = validateOfferFollowPayload(payload);

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

  if (!existing && action === "unfollow") {
    const payload = buildOfferFollowPayload({
      action,
      isFollowing: false,
      mode: "not_following",
      offerId,
    });
    const validation = validateOfferFollowPayload(payload);

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

  const { data: created, error } = await supabase
    .from("offer_carts")
    .insert({
      offer_id: offerId,
      user_id: user.id,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        checkedAt: new Date().toISOString(),
        ...validatedPayload,
        validation: {
          ...initialValidation,
          status: "fail",
          blockers: ["database_insert_failed:offer_follow_write"],
        },
        blockers: ["database_insert_failed:offer_follow_write"],
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
        status: 500,
      },
    );
  }

  const payload = buildOfferFollowPayload({
    action,
    createdAt: created.created_at,
    isFollowing: true,
    mode: "followed",
    offerId,
  });
  const validation = validateOfferFollowPayload(payload);

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
      status: 201,
    },
  );
}
