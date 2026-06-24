import { NextResponse } from "next/server";

import { MPGF_PUBLIC_GOODS_API_HEADERS } from "@/lib/mpgf/public-goods-api";
import { buildMpgfCrecV1125NoSideEffectPostApi } from "@/lib/mpgf/public-goods-crecm-route-contract";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;

  return NextResponse.json(
    buildMpgfCrecV1125NoSideEffectPostApi({
      operation: "project_challenge_intake",
      projectId,
      route: "/api/mpgf/projects/:projectId/challenge",
    }),
    { status: 202, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
  );
}
