import { NextResponse, type NextRequest } from "next/server";

import {
  ATTRIBUTION_COOKIE_NAME,
  buildPrivacySafeFunnelEventRecord,
  isFunnelEventType,
  parseAttributionCookie,
} from "@/lib/growth";
import {
  MORAL_TRADE_API_CACHE_CONTROL_HEADERS,
  buildMoralTradeApiJsonResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function cleanText(value: unknown, maxLength = 500) {
  return String(value ?? "").trim().slice(0, maxLength);
}

export async function POST(request: NextRequest) {
  if (!hasSupabaseEnv()) {
    return new NextResponse(null, {
      headers: {
        "Cache-Control": MORAL_TRADE_API_CACHE_CONTROL_HEADERS.no_store_dynamic,
      },
      status: 204,
    });
  }

  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "analytics_ingest");

  if (rateLimit.limited) {
    return buildMoralTradeApiJsonResponse(
      { error: "Too many analytics events. Try again shortly." },
      "no_store_dynamic",
      {
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
        status: 429,
      },
    );
  }

  let payload: Record<string, unknown>;

  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return buildMoralTradeApiJsonResponse(
      { error: "Invalid JSON payload." },
      "no_store_dynamic",
      { status: 400 },
    );
  }

  const eventType = cleanText(payload.eventType);
  if (!isFunnelEventType(eventType)) {
    return buildMoralTradeApiJsonResponse(
      { error: "Unknown funnel event type." },
      "no_store_dynamic",
      { status: 400 },
    );
  }

  const attribution = parseAttributionCookie(
    request.cookies.get(ATTRIBUTION_COOKIE_NAME)?.value,
  );
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const profileId = data.user?.id ?? null;
  const eventRecord = buildPrivacySafeFunnelEventRecord({
    attribution,
    eventType,
    metadata: payload.metadata,
    path: payload.path,
    profileId,
    referrer: payload.referrer,
  });

  const { error } = await (supabase as any).from("funnel_events").insert(eventRecord);

  if (error) {
    console.error("[supabase] Failed to record funnel event", {
      eventType,
      message: error.message,
    });
    return new NextResponse(null, {
      headers: {
        "Cache-Control": MORAL_TRADE_API_CACHE_CONTROL_HEADERS.no_store_dynamic,
      },
      status: 204,
    });
  }

  return buildMoralTradeApiJsonResponse({ ok: true });
}
