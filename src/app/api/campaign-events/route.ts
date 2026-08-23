import { createHash } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/server";

const CAMPAIGN = "donation_upgrade_billboard_2026";
const EVENT_TYPES = new Set(["landing_view", "create_click"]);
const VARIANTS = new Set(["changes_where", "changes_first", "counterfactual_ea"]);
const SOURCES = new Set(["billboard"]);
const MEDIA = new Set(["out_of_home"]);
const MAX_BODY_BYTES = 2_048;

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function response(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, {
    headers: { "cache-control": "no-store" },
    status,
  });
}

export async function POST(request: NextRequest) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && !["same-origin", "same-site", "none"].includes(fetchSite)) {
    return response({ error: "Cross-site campaign events are not accepted." }, 403);
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return response({ error: "JSON is required." }, 415);
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return response({ error: "Campaign event is too large." }, 413);
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return response({ error: "Invalid JSON." }, 400);
  }

  const anonymousId = String(body.anonymousId ?? "");
  const campaign = String(body.campaign ?? "");
  const eventType = String(body.eventType ?? "");
  const medium = String(body.medium ?? "");
  const source = String(body.source ?? "");
  const variant = String(body.variant ?? "");

  if (
    !isUuid(anonymousId) ||
    campaign !== CAMPAIGN ||
    !EVENT_TYPES.has(eventType) ||
    !VARIANTS.has(variant) ||
    !SOURCES.has(source) ||
    !MEDIA.has(medium)
  ) {
    return response({ error: "Unsupported campaign event." }, 400);
  }

  const anonymousIdHash = createHash("sha256").update(anonymousId).digest("hex");
  const idempotencyKey = [campaign, variant, eventType, anonymousIdHash].join(":");

  try {
    const supabase = createServiceClient() as any;
    const { error } = await supabase.from("campaign_events").upsert(
      {
        anonymous_id_hash: anonymousIdHash,
        campaign,
        event_type: eventType,
        idempotency_key: idempotencyKey,
        medium,
        source,
        variant,
      },
      { ignoreDuplicates: true, onConflict: "idempotency_key" },
    );

    if (error) {
      return response({ error: "Event storage unavailable." }, 503);
    }
  } catch {
    return response({ error: "Event storage unavailable." }, 503);
  }

  return response({ ok: true }, 201);
}
