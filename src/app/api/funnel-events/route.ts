import { NextResponse, type NextRequest } from "next/server";

import {
  ATTRIBUTION_COOKIE_NAME,
  isFunnelEventType,
  parseAttributionCookie,
} from "@/lib/growth";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

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

  const attribution = parseAttributionCookie(
    request.cookies.get(ATTRIBUTION_COOKIE_NAME)?.value,
  );
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const profileId = data.user?.id ?? null;
  const metadata =
    payload.metadata && typeof payload.metadata === "object"
      ? (payload.metadata as Record<string, unknown>)
      : {};

  const { error } = await (supabase as any).from("funnel_events").insert({
    anonymous_id: attribution?.anonymousId ?? "",
    event_type: eventType,
    metadata,
    partner_slug: attribution?.partnerSlug ?? "",
    path: cleanText(payload.path, 1_000),
    profile_id: profileId,
    referral_code: attribution?.referralCode ?? "",
    referrer: cleanText(payload.referrer, 1_000) || attribution?.referrer || "",
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
