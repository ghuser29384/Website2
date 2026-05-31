import { NextResponse } from "next/server";

import { getViewer } from "@/lib/app-data";
import { createMpgfPublicGoodsChallenge } from "@/lib/mpgf/public-goods-challenges";
import { MPGF_PUBLIC_GOODS_API_HEADERS } from "@/lib/mpgf/public-goods-api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function stringField(record: Record<string, unknown>, key: string, fallback = "") {
  const value = record[key];

  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export async function POST(request: Request) {
  const viewer = await getViewer();

  if (!viewer) {
    return NextResponse.json({ ok: false, error: "Sign in to open an MPGF challenge." }, { status: 401 });
  }

  try {
    const payload = await request.json();

    if (!payload || typeof payload !== "object") {
      throw new Error("MPGF challenges expect a JSON object.");
    }

    const record = payload as Record<string, unknown>;
    const challenge = createMpgfPublicGoodsChallenge({
      campaignId: stringField(record, "campaignId"),
      challengerId: viewer.authUser.id,
      reason: record.reasonCode,
      publicSummary: stringField(record, "publicSummary"),
      roundId: stringField(record, "roundId") || undefined,
    });

    return NextResponse.json(challenge, { status: 202, headers: MPGF_PUBLIC_GOODS_API_HEADERS });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not open MPGF challenge." },
      { status: 400, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }
}
