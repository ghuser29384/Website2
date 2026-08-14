import { NextResponse } from "next/server";

import { getViewer } from "@/lib/app-data";
import { MPGF_PUBLIC_GOODS_API_HEADERS } from "@/lib/mpgf/public-goods-api";
import { loadMpgfPhaseOneParticipantState } from "@/lib/mpgf/phase-one-governance";
import { parseMpgfPhaseOneUuid } from "@/lib/mpgf/phase-one-governance-input";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!(await getViewer())) {
    return NextResponse.json(
      { ok: false, error: "Sign in to view private MPGF participant state." },
      { status: 401, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }

  try {
    const url = new URL(request.url);
    const roundId = parseMpgfPhaseOneUuid(
      url.searchParams.get("roundId"),
      "Round ID",
    );
    const state = await loadMpgfPhaseOneParticipantState(roundId);

    if (!state) {
      return NextResponse.json(
        { ok: false, error: "MPGF phase-one participant state is unavailable." },
        { status: 503, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
      );
    }

    return NextResponse.json(
      { ok: true, participant: state },
      { headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not load private MPGF participant state.",
      },
      { status: 400, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }
}
