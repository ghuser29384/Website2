import { NextResponse, type NextRequest } from "next/server";

import {
  ANALYTICS_OPT_OUT_COOKIE_NAME,
  ATTRIBUTION_COOKIE_NAME,
  buildPrivacySafeFunnelEventRecord,
  isAnalyticsOptedOut,
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

function analyticsNoContent() {
  return new NextResponse(null, {
    headers: {
      "Cache-Control": MORAL_TRADE_API_CACHE_CONTROL_HEADERS.no_store_dynamic,
    },
    status: 204,
  });
}

function rejectAnalyticsPayload(reason: "invalid_json" | "unknown_event_type") {
  console.info("[analytics] Event rejected without affecting the product flow", {
    classification: "user_error",
    eventId: "analytics.ingest_rejected",
    reason,
  });

  return analyticsNoContent();
}

export async function POST(request: NextRequest) {
  if (isAnalyticsOptedOut(request.cookies.get(ANALYTICS_OPT_OUT_COOKIE_NAME)?.value)) {
    return analyticsNoContent();
  }

  if (!hasSupabaseEnv()) {
    return analyticsNoContent();
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
    return rejectAnalyticsPayload("invalid_json");
  }

  const eventType = cleanText(payload.eventType);
  if (!isFunnelEventType(eventType)) {
    return rejectAnalyticsPayload("unknown_event_type");
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
    console.error("[analytics] Failed to persist funnel event", {
      classification: "internal_error",
      eventId: "analytics.persist_failed",
      eventType,
      message: error.message,
    });
    return analyticsNoContent();
  }

  return buildMoralTradeApiJsonResponse({ ok: true });
}
