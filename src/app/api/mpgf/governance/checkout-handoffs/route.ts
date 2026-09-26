import { NextResponse } from "next/server";

import { getViewer } from "@/lib/app-data";
import { MPGF_PUBLIC_GOODS_API_HEADERS } from "@/lib/mpgf/public-goods-api";
import { confirmMpgfPhaseOneCheckoutHandoff } from "@/lib/mpgf/phase-one-governance";
import {
  asMpgfPhaseOneRecord,
  parseMpgfPhaseOneAmountCents,
  parseMpgfPhaseOneIdempotencyKey,
  parseMpgfPhaseOneResultHash,
  parseMpgfPhaseOneUuid,
} from "@/lib/mpgf/phase-one-governance-input";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await getViewer())) {
    return NextResponse.json(
      {
        ok: false,
        error: "Sign in to confirm an external MPGF checkout handoff.",
      },
      { status: 401, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }

  try {
    const record = asMpgfPhaseOneRecord(await request.json());
    const result = await confirmMpgfPhaseOneCheckoutHandoff({
      roundId: parseMpgfPhaseOneUuid(record.roundId, "Round ID"),
      projectId: parseMpgfPhaseOneUuid(record.projectId, "Project ID"),
      amountCents: parseMpgfPhaseOneAmountCents(record.amountCents),
      resultHash: parseMpgfPhaseOneResultHash(record.resultHash),
      idempotencyKey: parseMpgfPhaseOneIdempotencyKey(
        record.idempotencyKey,
      ),
    });

    return NextResponse.json(result, {
      headers: MPGF_PUBLIC_GOODS_API_HEADERS,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not confirm the external MPGF checkout handoff.",
      },
      { status: 400, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }
}
