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

  return NextResponse.json(state, {
    status: state.available ? 200 : 503,
    headers: MPGF_PUBLIC_GOODS_API_HEADERS,
  });
}
