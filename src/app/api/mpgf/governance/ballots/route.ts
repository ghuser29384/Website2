import { NextResponse } from "next/server";

import { getViewer } from "@/lib/app-data";
import { MPGF_PUBLIC_GOODS_API_HEADERS } from "@/lib/mpgf/public-goods-api";
import {
  type MpgfPublicGoodsGovernanceCategory,
  createMpgfPublicGoodsGovernanceBallot,
} from "@/lib/mpgf/public-goods-governance-ballots";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function stringField(record: Record<string, unknown>, key: string, fallback = "") {
  const value = record[key];

  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function weightsByCategory(record: Record<string, unknown>) {
  const rawWeights = record.weightsByCategory;
  const source = rawWeights && typeof rawWeights === "object" ? rawWeights as Record<string, unknown> : record;
  const categories: MpgfPublicGoodsGovernanceCategory[] = [
    "global_health",
    "existential_risk",
    "animal_welfare",
    "public_interest_knowledge",
    "sponsor_reserve",
  ];

  return Object.fromEntries(categories.map((category) => [category, Number(source[category])]));
}

export async function POST(request: Request) {
  const viewer = await getViewer();

  if (!viewer) {
    return NextResponse.json({ ok: false, error: "Sign in to submit an MPGF governance ballot." }, { status: 401 });
  }

  try {
    const payload = await request.json();

    if (!payload || typeof payload !== "object") {
      throw new Error("MPGF governance ballots expect a JSON object.");
    }

    const record = payload as Record<string, unknown>;
    const ballot = createMpgfPublicGoodsGovernanceBallot({
      voterId: viewer.authUser.id,
      roundId: stringField(record, "roundId") || undefined,
      weightsByCategory: weightsByCategory(record),
      idempotencyKey: stringField(record, "idempotencyKey"),
    });

    return NextResponse.json(ballot, { status: 202, headers: MPGF_PUBLIC_GOODS_API_HEADERS });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not submit MPGF governance ballot." },
      { status: 400, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }
}
