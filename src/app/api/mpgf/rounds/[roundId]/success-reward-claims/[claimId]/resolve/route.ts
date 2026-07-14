import { NextResponse } from "next/server";

import { MPGF_PUBLIC_GOODS_API_HEADERS } from "@/lib/mpgf/public-goods-api";
import { buildMpgfCrecV1125NoSideEffectPostApi } from "@/lib/mpgf/public-goods-crecm-route-contract";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ roundId: string; claimId: string }> },
) {
  const { claimId, roundId } = await params;

  return NextResponse.json(
    buildMpgfCrecV1125NoSideEffectPostApi({
      claimId,
      operation: "success_reward_claim_resolve",
      route: "/api/mpgf/rounds/:roundId/success-reward-claims/:claimId/resolve",
      roundId,
    }),
    { status: 202, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
  );
}
