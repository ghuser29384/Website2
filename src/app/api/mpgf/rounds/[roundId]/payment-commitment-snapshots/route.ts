import { NextResponse } from "next/server";

import { MPGF_PUBLIC_GOODS_API_HEADERS } from "@/lib/mpgf/public-goods-api";
import {
  buildMpgfCrecV1125NoSideEffectPostApi,
  buildMpgfCrecV1125RoundNotFound,
  getMpgfCrecV1125PaymentCommitmentSnapshotsApi,
} from "@/lib/mpgf/public-goods-crecm-route-contract";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ roundId: string }> }) {
  const { roundId } = await params;
  const result = getMpgfCrecV1125PaymentCommitmentSnapshotsApi(roundId);

  return NextResponse.json(result ?? buildMpgfCrecV1125RoundNotFound(roundId), {
    status: result ? 200 : 404,
    headers: MPGF_PUBLIC_GOODS_API_HEADERS,
  });
}

export async function POST(_request: Request, { params }: { params: Promise<{ roundId: string }> }) {
  const { roundId } = await params;

  return NextResponse.json(
    buildMpgfCrecV1125NoSideEffectPostApi({
      operation: "payment_commitment_snapshot_intake",
      route: "/api/mpgf/rounds/:roundId/payment-commitment-snapshots",
      roundId,
    }),
    { status: 202, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
  );
}
