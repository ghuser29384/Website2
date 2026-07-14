import { NextResponse } from "next/server";

import { getViewer } from "@/lib/app-data";
import { MPGF_PUBLIC_GOODS_API_HEADERS } from "@/lib/mpgf/public-goods-api";
import {
  type MpgfPublicGoodsSponsorPoolSourceType,
  recordMpgfPublicGoodsSponsorPoolDeposit,
} from "@/lib/mpgf/public-goods-sponsor-flywheel";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function stringField(record: Record<string, unknown>, key: string, fallback = "") {
  const value = record[key];

  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function sourceType(value: unknown): MpgfPublicGoodsSponsorPoolSourceType {
  return value === "recurring_member_tithe" ||
    value === "donation_offset_surplus" ||
    value === "trade_surplus_tithe"
    ? value
    : "direct_sponsor_deposit";
}

export async function POST(request: Request, { params }: { params: Promise<{ poolId: string }> }) {
  const viewer = await getViewer();

  if (!viewer) {
    return NextResponse.json({ ok: false, error: "Sign in to record an MPGF sponsor-pool deposit." }, { status: 401 });
  }

  try {
    const { poolId } = await params;
    const payload = await request.json();

    if (!payload || typeof payload !== "object") {
      throw new Error("MPGF sponsor-pool deposits expect a JSON object.");
    }

    const record = payload as Record<string, unknown>;
    const amountCents = Number(record.amountCents);
    const receipt = recordMpgfPublicGoodsSponsorPoolDeposit({
      privateSourceRef: stringField(record, "privateSourceRef", `${poolId}:${viewer.authUser.id}:${Date.now()}`),
      sourceType: sourceType(record.sourceType),
      amountCents: Number.isInteger(amountCents) ? amountCents : 0,
      publicMemo: stringField(record, "publicMemo"),
    });

    if (receipt.poolId !== poolId) {
      return NextResponse.json(
        { ok: false, error: "MPGF sponsor-pool deposit target not found." },
        { status: 404, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
      );
    }

    return NextResponse.json(receipt, { status: 202, headers: MPGF_PUBLIC_GOODS_API_HEADERS });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not record MPGF sponsor-pool deposit." },
      { status: 400, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }
}
