import { NextResponse, type NextRequest } from "next/server";

import {
  ATTRIBUTION_COOKIE_NAME,
  isFunnelEventType,
  parseAttributionCookie,
  sanitizeFunnelEventMetadata,
  sanitizeFunnelEventPath,
  sanitizeFunnelEventReferrer,
} from "@/lib/growth";
import {
  getRequestRateLimitKey,
  getRetryAfterSeconds,
  takeRateLimitSlot,
} from "@/lib/rate-limit";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function cleanText(value: unknown, maxLength = 500) {
  return String(value ?? "").trim().slice(0, maxLength);
}

export async function POST(request: NextRequest) {
  if (!hasSupabaseEnv()) {
    return new NextResponse(null, { status: 204 });
  }

  let payload: Record<string, unknown>;

  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const eventType = cleanText(payload.eventType);
  if (!isFunnelEventType(eventType)) {
    return NextResponse.json({ error: "Unknown funnel event type." }, { status: 400 });
  }

  const rateLimit = takeRateLimitSlot(getRequestRateLimitKey(request, "analytics-ingest"), {
    limit: 120,
    windowMs: 60_000,
  });

  if (rateLimit.limited) {
    return NextResponse.json(
      { error: "Too many analytics events. Try again shortly." },
      {
        headers: {
          "Retry-After": String(getRetryAfterSeconds(rateLimit.resetAt)),
        },
        status: 429,
      },
    );
  }

  const attribution = parseAttributionCookie(
    request.cookies.get(ATTRIBUTION_COOKIE_NAME)?.value,
  );
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const profileId = data.user?.id ?? null;
  const metadata =
    payload.metadata && typeof payload.metadata === "object"
      ? sanitizeFunnelEventMetadata(payload.metadata)
      : {};
  const requestReferrer = sanitizeFunnelEventReferrer(payload.referrer);
  const attributionReferrer = sanitizeFunnelEventReferrer(attribution?.referrer);

  const { error } = await (supabase as any).from("funnel_events").insert({
    anonymous_id: attribution?.anonymousId ?? "",
    event_type: eventType,
    metadata,
    partner_slug: attribution?.partnerSlug ?? "",
    path: sanitizeFunnelEventPath(payload.path) || "/",
    profile_id: profileId,
    referral_code: attribution?.referralCode ?? "",
    referrer: requestReferrer || attributionReferrer,
    utm_campaign: attribution?.utmCampaign ?? "",
    utm_content: attribution?.utmContent ?? "",
    utm_medium: attribution?.utmMedium ?? "",
    utm_source: attribution?.utmSource ?? "",
    utm_term: attribution?.utmTerm ?? "",
  });

  if (error) {
    console.error("[supabase] Failed to record funnel event", {
      eventType,
      message: error.message,
    });
    return new NextResponse(null, { status: 204 });
  }

  return NextResponse.json({ ok: true });
}
