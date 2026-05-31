import { NextResponse } from "next/server";

import { getViewer } from "@/lib/app-data";
import { MPGF_PUBLIC_GOODS_API_HEADERS } from "@/lib/mpgf/public-goods-api";
import { commitMpgfPublicGoodsTradeSurplus } from "@/lib/mpgf/public-goods-sponsor-flywheel";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function stringField(record: Record<string, unknown>, key: string, fallback = "") {
  const value = record[key];

  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export async function POST(request: Request) {
  const viewer = await getViewer();

  if (!viewer) {
    return NextResponse.json({ ok: false, error: "Sign in to commit MPGF trade surplus." }, { status: 401 });
  }

  try {
    const payload = await request.json();

    if (!payload || typeof payload !== "object") {
      throw new Error("MPGF trade-surplus commitments expect a JSON object.");
    }

    const record = payload as Record<string, unknown>;
    const amountCents = Number(record.amountCents);
    const commitment = commitMpgfPublicGoodsTradeSurplus({
      privateTradeOrOffsetRef: stringField(record, "privateTradeOrOffsetRef", `trade-surplus:${viewer.authUser.id}:${Date.now()}`),
      sourceType: record.sourceType === "donation_offset_surplus" ? "donation_offset_surplus" : "trade_surplus_tithe",
      amountCents: Number.isInteger(amountCents) ? amountCents : 0,
    });

    return NextResponse.json(commitment, { status: 202, headers: MPGF_PUBLIC_GOODS_API_HEADERS });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not commit MPGF trade surplus." },
      { status: 400, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }
}
