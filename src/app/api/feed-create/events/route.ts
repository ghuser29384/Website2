import { NextRequest, NextResponse } from "next/server";

import { getViewer } from "@/lib/app-data";
import {
  isValidFeedCreateRequest,
  recordFeedCreateEvent,
  type FeedCreateEventType,
  type FeedCreateRequest,
} from "@/lib/feed-create/phase1";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CLIENT_EVENT_TYPES = new Set<FeedCreateEventType>([
  "action_shown",
  "action_clicked",
]);

function privateJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function text(value: unknown, maximum: number) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function firstForwardedValue(value: string | null) {
  return value?.split(",")[0]?.trim() ?? "";
}

function parseOrigin(value: string | null) {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function effectiveRequestOrigin(request: Request) {
  const requestUrl = new URL(request.url);
  const forwardedProtocol = firstForwardedValue(
    request.headers.get("x-forwarded-proto"),
  );
  const protocol =
    forwardedProtocol === "http" || forwardedProtocol === "https"
      ? `${forwardedProtocol}:`
      : requestUrl.protocol;
  const host =
    firstForwardedValue(request.headers.get("x-forwarded-host")) ||
    firstForwardedValue(request.headers.get("host"));
  if (!host) return null;

  try {
    return new URL(`${protocol}//${host}`).origin;
  } catch {
    return null;
  }
}

function isSameOriginMutation(request: Request) {
  const acceptedOrigins = new Set([new URL(request.url).origin]);
  const effectiveOrigin = effectiveRequestOrigin(request);
  if (effectiveOrigin) acceptedOrigins.add(effectiveOrigin);

  const rawOrigin = request.headers.get("origin");
  const rawReferer = request.headers.get("referer");
  const fetchSite = request.headers.get("sec-fetch-site");

  if (fetchSite && !["same-origin", "none"].includes(fetchSite)) return false;
  if (rawOrigin) {
    const origin = parseOrigin(rawOrigin);
    return origin !== null && acceptedOrigins.has(origin);
  }
  if (rawReferer) {
    const refererOrigin = parseOrigin(rawReferer);
    return refererOrigin !== null && acceptedOrigins.has(refererOrigin);
  }
  return true;
}

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) {
    return privateJson({ ok: false, message: "Cross-origin events are not accepted." }, 403);
  }

  const viewer = await getViewer();
  if (!viewer) return privateJson({ ok: false, requiresAuth: true }, 401);

  let raw: Record<string, unknown>;
  try {
    const parsed = await request.json();
    raw = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return privateJson({ ok: false, message: "The event body was not valid JSON." }, 400);
  }

  const eventType = text(raw.eventType, 40) as FeedCreateEventType;
  const sourceRevision = Number(raw.sourceRevision);
  const sourceRequest: FeedCreateRequest = {
    opportunityType: text(raw.opportunityType, 40) as "offer",
    opportunityId: text(raw.opportunityId, 160),
    exposureRequestId: text(raw.exposureRequestId, 160),
    sourceRevision,
  };
  if (!CLIENT_EVENT_TYPES.has(eventType) || !isValidFeedCreateRequest(sourceRequest)) {
    return privateJson({ ok: false, message: "The Feed-to-Create event is invalid." }, 400);
  }

  const eventId = await recordFeedCreateEvent({
    actorId: viewer.authUser.id,
    eventType,
    request: sourceRequest,
  });
  if (!eventId) {
    return privateJson(
      { ok: false, message: "The event could not be verified against this Feed receipt." },
      409,
    );
  }

  return privateJson({ ok: true, eventId }, 202);
}
