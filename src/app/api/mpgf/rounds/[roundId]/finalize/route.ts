import { NextResponse } from "next/server";

import { MPGF_PUBLIC_GOODS_API_HEADERS } from "@/lib/mpgf/public-goods-api";
import { getMpgfPublicGoodsFinalizationReportApi } from "@/lib/mpgf/public-goods-finalization";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function finalizationSecret() {
  return process.env.MPGF_ALLOCATION_SECRET ?? process.env.MPGF_PUBLIC_GOODS_ROUND_CLOSE_SECRET ?? process.env.CRON_SECRET;
}

function isAuthorized(request: Request) {
  const secret = finalizationSecret();

  if (!secret) {
    return false;
  }

  const url = new URL(request.url);
  const authorization = request.headers.get("authorization");

  return authorization === `Bearer ${secret}` || url.searchParams.get("secret") === secret;
}

export async function POST(request: Request, { params }: { params: Promise<{ roundId: string }> }) {
  if (!finalizationSecret()) {
    return NextResponse.json(
      { ok: false, error: "MPGF public-goods finalization is not configured." },
      { status: 503, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }

  if (!isAuthorized(request)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized MPGF public-goods finalization request." },
      { status: 401, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }

  const { roundId } = await params;
  const result = getMpgfPublicGoodsFinalizationReportApi(roundId, true);

  if (!result) {
    return NextResponse.json(
      { ok: false, error: "MPGF public-goods finalization target not found." },
      { status: 404, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }

  return NextResponse.json(result, { headers: MPGF_PUBLIC_GOODS_API_HEADERS });
}
