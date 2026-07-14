import { NextResponse } from "next/server";

import { MPGF_PUBLIC_GOODS_API_HEADERS } from "@/lib/mpgf/public-goods-api";
import {
  buildMpgfCrecV1125RoundNotFound,
  getMpgfCrecV1125ContributorBenefitApi,
} from "@/lib/mpgf/public-goods-crecm-route-contract";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ roundId: string }> }) {
  const { roundId } = await params;
  const result = getMpgfCrecV1125ContributorBenefitApi({
    benefitKind: "coordination_credits",
    route: "/api/mpgf/rounds/:roundId/coordination-credits",
    roundId,
  });

  return NextResponse.json(result ?? buildMpgfCrecV1125RoundNotFound(roundId), {
    status: result ? 200 : 404,
    headers: MPGF_PUBLIC_GOODS_API_HEADERS,
  });
}
