import { NextResponse } from "next/server";

import {
  bucketMpgfPublicGoodsAmountCents,
  recordMpgfPublicGoodsAnalyticsEvent,
  type MpgfPublicGoodsAnalyticsEventJson,
  type MpgfPublicGoodsAnalyticsEventType,
} from "@/lib/mpgf/public-goods-analytics";
import type { MpgfPublicGoodsCaptureMode, MpgfPublicGoodsVisibilityMode } from "@/lib/mpgf/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function analyticsSecret() {
  return process.env.MPGF_ANALYTICS_SECRET ?? process.env.CRON_SECRET ?? process.env.MPGF_RECONCILIATION_SECRET;
}

function isAuthorized(request: Request) {
  const secret = analyticsSecret();

  if (!secret) {
    return false;
  }

  const url = new URL(request.url);
  const authorization = request.headers.get("authorization");

  return authorization === `Bearer ${secret}` || url.searchParams.get("secret") === secret;
}

function readString(record: Record<string, unknown>, key: string) {
  const value = record[key];

  return typeof value === "string" ? value : undefined;
}

function readBoolean(record: Record<string, unknown>, key: string) {
  return record[key] === true;
}

function readAmountBucket(record: Record<string, unknown>) {
  const amountCents = record.amountCents;

  if (typeof amountCents === "number" && Number.isInteger(amountCents) && amountCents >= 0) {
    return bucketMpgfPublicGoodsAmountCents(amountCents);
  }

  return undefined;
}

function parseEventJson(record: Record<string, unknown>): MpgfPublicGoodsAnalyticsEventJson {
  const visibilityMode = readString(record, "visibilityMode");
  const captureMode = readString(record, "captureMode");
  const eventJson: MpgfPublicGoodsAnalyticsEventJson = {
    amountBucket: readAmountBucket(record),
    isRecurring: readBoolean(record, "isRecurring"),
    thresholdPassed: record.thresholdPassed === true ? true : record.thresholdPassed === false ? false : undefined,
    campaignStatus: readString(record, "campaignStatus"),
    reviewStatus: readString(record, "reviewStatus"),
    proofStatus: readString(record, "proofStatus"),
    publicEvidenceSource: readString(record, "publicEvidenceSource"),
    surface: "protected_job",
    cohort: readString(record, "cohort"),
    variant: readString(record, "variant"),
  };

  if (visibilityMode === "private_amount" || visibilityMode === "public_supporter" || visibilityMode === "public_reason") {
    eventJson.visibilityMode = visibilityMode as MpgfPublicGoodsVisibilityMode;
  }

  if (captureMode === "external_handoff" || captureMode === "stored_payment_method" || captureMode === "signed_intent") {
    eventJson.captureMode = captureMode as MpgfPublicGoodsCaptureMode;
  }

  return Object.fromEntries(
    Object.entries(eventJson).filter(([, value]) => value !== undefined),
  ) as MpgfPublicGoodsAnalyticsEventJson;
}

function parsePayload(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    throw new Error("MPGF public-goods analytics expects a JSON object.");
  }

  const record = payload as Record<string, unknown>;
  const eventType = readString(record, "eventType") as MpgfPublicGoodsAnalyticsEventType | undefined;

  if (!eventType) {
    throw new Error("eventType is required.");
  }

  return {
    eventType,
    userId: readString(record, "userId"),
    campaignId: readString(record, "campaignId"),
    experimentAssignmentId: readString(record, "experimentAssignmentId"),
    dryRun: readBoolean(record, "dryRun"),
    eventJson: parseEventJson(record),
  };
}

export async function POST(request: Request) {
  if (!analyticsSecret()) {
    return NextResponse.json(
      { ok: false, error: "MPGF public-goods analytics is not configured." },
      { status: 503 },
    );
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized MPGF public-goods analytics request." }, { status: 401 });
  }

  try {
    const result = await recordMpgfPublicGoodsAnalyticsEvent(parsePayload(await request.json()));

    return NextResponse.json({
      ok: result.ok,
      status: result.status,
      eventType: result.row.event_type,
      campaignId: result.row.campaign_id,
      userRefHash: result.row.user_ref_hash,
      eventJson: result.row.event_json,
      warning: result.warning,
    }, { status: result.status === "not_configured" ? 503 : 200 });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Could not record MPGF public-goods analytics event.",
      },
      { status: 400 },
    );
  }
}
