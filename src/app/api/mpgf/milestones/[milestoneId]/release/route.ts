import { NextResponse } from "next/server";

import {
  buildDemoMpgfPublicGoodsMilestoneReleaseDecision,
  persistMpgfPublicGoodsMilestoneRelease,
} from "@/lib/mpgf/public-goods-milestones";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function milestoneSecret() {
  return process.env.MPGF_PUBLIC_GOODS_MILESTONE_SECRET ?? process.env.MPGF_RECONCILIATION_SECRET ?? process.env.CRON_SECRET;
}

function isAuthorized(request: Request) {
  const secret = milestoneSecret();

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

function readOrdinal(record: Record<string, unknown>) {
  const value = record.milestoneOrdinal;

  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : undefined;
}

function parsePayload(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    throw new Error("MPGF public-goods milestone release expects a JSON object.");
  }

  const record = payload as Record<string, unknown>;

  return {
    campaignId: readString(record, "campaignId"),
    milestoneOrdinal: readOrdinal(record),
    reviewerId: readString(record, "reviewerId"),
    evidenceSummary: readString(record, "evidenceSummary"),
    reviewStateConfirmed: readBoolean(record, "reviewStateConfirmed"),
    incidentStatus: readString(record, "incidentStatus") === "frozen" ? "frozen" as const : "clear" as const,
    dryRun: readBoolean(record, "dryRun"),
  };
}

export async function POST(request: Request, { params }: { params: Promise<{ milestoneId: string }> }) {
  if (!milestoneSecret()) {
    return NextResponse.json(
      { ok: false, error: "MPGF public-goods milestone release is not configured." },
      { status: 503 },
    );
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized MPGF public-goods milestone request." }, { status: 401 });
  }

  try {
    const payload = parsePayload(await request.json());
    const { milestoneId } = await params;
    const ordinalFromPath = Number(milestoneId.split("-").at(-1));
    const decision = buildDemoMpgfPublicGoodsMilestoneReleaseDecision({
      campaignId: payload.campaignId,
      milestoneOrdinal: payload.milestoneOrdinal ?? (Number.isInteger(ordinalFromPath) ? ordinalFromPath : undefined),
      reviewerId: payload.reviewerId,
      evidenceSummary: payload.evidenceSummary,
      reviewStateConfirmed: payload.reviewStateConfirmed,
      incidentStatus: payload.incidentStatus,
    });
    const result = await persistMpgfPublicGoodsMilestoneRelease({
      decision,
      dryRun: payload.dryRun,
    });

    return NextResponse.json(
      {
        ok: result.ok,
        status: result.status,
        warnings: result.warnings,
        campaignId: result.decision.campaignId,
        milestoneId: result.decision.milestone.id,
        releaseStatus: result.decision.status,
        releaseAmountCents: result.decision.releaseAmountCents,
        blockerCodes: result.decision.blockerCodes,
        webhookCanAuthorizeFinalPayout: result.decision.webhookCanAuthorizeFinalPayout,
        requiresPartnerExecution: result.decision.requiresPartnerExecution,
      },
      { status: result.status === "not_configured" ? 503 : 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Could not authorize MPGF public-goods milestone release.",
      },
      { status: 400 },
    );
  }
}
