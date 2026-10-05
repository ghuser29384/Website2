import { NextResponse } from "next/server";

import { getViewer } from "@/lib/app-data";
import { MPGF_PUBLIC_GOODS_API_HEADERS } from "@/lib/mpgf/public-goods-api";
import {
  submitMpgfPhaseOneBallot,
} from "@/lib/mpgf/phase-one-governance";
import {
  asMpgfPhaseOneRecord,
  parseMpgfPhaseOneIdempotencyKey,
  parseMpgfPhaseOneProjectIds,
  parseMpgfPhaseOneUuid,
} from "@/lib/mpgf/phase-one-governance-input";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const viewer = await getViewer();

  if (!viewer) {
    return NextResponse.json({ ok: false, error: "Sign in to submit an MPGF governance ballot." }, { status: 401 });
  }

  try {
    const record = asMpgfPhaseOneRecord(await request.json());
    const ballot = await submitMpgfPhaseOneBallot({
      roundId: parseMpgfPhaseOneUuid(record.roundId, "Round ID"),
      projectIds: parseMpgfPhaseOneProjectIds(record.projectIds),
      idempotencyKey: parseMpgfPhaseOneIdempotencyKey(
        record.idempotencyKey,
      ),
    });

    return NextResponse.json(ballot, {
      status: 200,
      headers: MPGF_PUBLIC_GOODS_API_HEADERS,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not submit MPGF governance ballot." },
      { status: 400, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }
}
