import { NextResponse } from "next/server";

import { getViewer } from "@/lib/app-data";
import { MPGF_PUBLIC_GOODS_API_HEADERS } from "@/lib/mpgf/public-goods-api";
import {
  cancelMpgfPhaseOnePledge,
  confirmMpgfPhaseOnePledge,
} from "@/lib/mpgf/phase-one-governance";
import {
  asMpgfPhaseOneRecord,
  parseMpgfPhaseOneAmountCents,
  parseMpgfPhaseOneIdempotencyKey,
  parseMpgfPhaseOneUuid,
} from "@/lib/mpgf/phase-one-governance-input";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function requireViewer() {
  return Boolean(await getViewer());
}

export async function POST(request: Request) {
  if (!(await requireViewer())) {
    return NextResponse.json(
      { ok: false, error: "Sign in to confirm an MPGF phase-one pledge." },
      { status: 401, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }

  try {
    const record = asMpgfPhaseOneRecord(await request.json());
    const result = await confirmMpgfPhaseOnePledge({
      roundId: parseMpgfPhaseOneUuid(record.roundId, "Round ID"),
      amountCents: parseMpgfPhaseOneAmountCents(record.amountCents),
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
            : "Could not confirm the MPGF phase-one pledge.",
      },
      { status: 400, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }
}

export async function DELETE(request: Request) {
  if (!(await requireViewer())) {
    return NextResponse.json(
      { ok: false, error: "Sign in to cancel an MPGF phase-one pledge." },
      { status: 401, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }

  try {
    const record = asMpgfPhaseOneRecord(await request.json());
    const result = await cancelMpgfPhaseOnePledge({
      roundId: parseMpgfPhaseOneUuid(record.roundId, "Round ID"),
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
            : "Could not cancel the MPGF phase-one pledge.",
      },
      { status: 400, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }
}
