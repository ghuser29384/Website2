import { NextResponse } from "next/server";

import { MPGF_PUBLIC_GOODS_API_HEADERS } from "@/lib/mpgf/public-goods-api";
import { loadMpgfPhaseOneGovernanceState } from "@/lib/mpgf/phase-one-governance";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = await loadMpgfPhaseOneGovernanceState(
    url.searchParams.get("roundId"),
  );

  if (!state.available) {
    return NextResponse.json(
      { ok: false, error: state.unavailableReason },
      { status: 503, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }

  if (!state.round || !state.results) {
    return NextResponse.json(
      { ok: false, error: "MPGF phase-one results have not been published." },
      { status: 404, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      round: state.round,
      results: state.results,
      policy: state.policy,
    },
    { headers: MPGF_PUBLIC_GOODS_API_HEADERS },
  );
}
