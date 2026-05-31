import { NextResponse } from "next/server";

import { persistMpgfPublicGoodsExperimentAssignment } from "@/lib/mpgf/public-goods-experiments";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function experimentSecret() {
  return process.env.MPGF_PUBLIC_GOODS_EXPERIMENT_SECRET ?? process.env.MPGF_ANALYTICS_SECRET ?? process.env.CRON_SECRET;
}

function isAuthorized(request: Request) {
  const secret = experimentSecret();

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

function readVariants(record: Record<string, unknown>) {
  const value = record.variants;

  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function parsePayload(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    throw new Error("MPGF public-goods experiment assignment expects a JSON object.");
  }

  const record = payload as Record<string, unknown>;

  return {
    userId: readString(record, "userId") ?? "",
    profileId: readString(record, "profileId"),
    experimentKey: readString(record, "experimentKey") ?? "",
    variants: readVariants(record),
    dryRun: record.dryRun === true,
  };
}

export async function POST(request: Request) {
  if (!experimentSecret()) {
    return NextResponse.json(
      { ok: false, error: "MPGF public-goods experiment assignment is not configured." },
      { status: 503 },
    );
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized MPGF public-goods experiment request." }, { status: 401 });
  }

  try {
    const result = await persistMpgfPublicGoodsExperimentAssignment(parsePayload(await request.json()));

    return NextResponse.json(
      {
        ok: result.ok,
        status: result.status,
        assignmentId: result.assignment.id,
        persistedId: result.persistedId,
        userRefHash: result.assignment.userRefHash,
        experimentKey: result.assignment.experimentKey,
        variant: result.assignment.variant,
        analyticsPolicy: result.assignment.analyticsPolicy,
        warnings: result.warnings,
      },
      { status: result.status === "not_configured" ? 503 : 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Could not assign MPGF public-goods experiment.",
      },
      { status: 400 },
    );
  }
}
