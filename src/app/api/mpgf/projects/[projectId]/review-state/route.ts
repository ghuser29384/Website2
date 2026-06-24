import { NextResponse } from "next/server";

import { MPGF_PUBLIC_GOODS_API_HEADERS } from "@/lib/mpgf/public-goods-api";
import { getMpgfCrecV1125ProjectReviewStateApi } from "@/lib/mpgf/public-goods-crecm-route-contract";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const result = getMpgfCrecV1125ProjectReviewStateApi(projectId);

  return NextResponse.json(result, {
    status: result.ok ? 200 : 404,
    headers: MPGF_PUBLIC_GOODS_API_HEADERS,
  });
}
