import { NextResponse } from "next/server";

import {
  buildOfferSavedSearchPayload,
  normalizeOfferSavedSearchDraft,
  validateOfferSavedSearchPayload,
} from "@/lib/offer-saved-searches";
import {
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SavedSearchInsert = Database["public"]["Tables"]["saved_searches"]["Insert"];

export async function POST(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "saved_search_write");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited saved search writes return no storage result until the window resets.",
      "private, no-store",
    );
  }

  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        checkedAt: new Date().toISOString(),
        error: "invalid_json",
        blockers: ["invalid_json:saved_search_create_request"],
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
        status: 400,
      },
    );
  }

  const draft = normalizeOfferSavedSearchDraft(body);
  const validatedPayload = buildOfferSavedSearchPayload({
    draft,
    mode: "validated",
  });
  const draftValidation = validateOfferSavedSearchPayload(validatedPayload);

  if (draftValidation.status === "fail") {
    return NextResponse.json(
      {
        ok: false,
        checkedAt: new Date().toISOString(),
        ...validatedPayload,
        validation: draftValidation,
        blockers: draftValidation.blockers,
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
          ...draftValidation,
          status: "fail",
          blockers: ["supabase_unconfigured:saved_search_write"],
        },
        blockers: ["supabase_unconfigured:saved_search_write"],
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
    const payload = buildOfferSavedSearchPayload({
      draft,
      mode: "auth_required",
    });
    const validation = validateOfferSavedSearchPayload(payload);

    return NextResponse.json(
      {
        ok: false,
        checkedAt: new Date().toISOString(),
        ...payload,
        validation,
        blockers: ["authentication_required:saved_search_write"],
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
        status: 401,
      },
    );
  }

  const insert: SavedSearchInsert = {
    cadence: draft.cadence,
    causes: draft.causes,
    filters_json: draft.filters,
    label: draft.label,
    min_score: draft.minScore,
    notify_on_live_match: draft.notifyOnLiveMatch,
    profile_id: user.id,
    query: draft.query,
    source_route: draft.sourceRoute,
    status: "active",
  };
  const { data, error } = await supabase
    .from("saved_searches")
    .insert(insert)
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        checkedAt: new Date().toISOString(),
        ...validatedPayload,
        validation: {
          ...draftValidation,
          status: "fail",
          blockers: ["database_insert_failed:saved_search_write"],
        },
        blockers: ["database_insert_failed:saved_search_write"],
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
        status: 500,
      },
    );
  }

  const payload = buildOfferSavedSearchPayload({
    draft,
    id: data.id,
    mode: "created",
  });
  const validation = validateOfferSavedSearchPayload(payload);

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
