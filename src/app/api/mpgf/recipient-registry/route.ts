import { NextResponse } from "next/server";

import { MPGF_PUBLIC_GOODS_API_HEADERS } from "@/lib/mpgf/public-goods-api";
import {
  buildMpgfCrecV1125NoSideEffectPostApi,
  getMpgfCrecV1125RecipientRegistryApi,
} from "@/lib/mpgf/public-goods-crecm-route-contract";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(getMpgfCrecV1125RecipientRegistryApi(), {
    headers: MPGF_PUBLIC_GOODS_API_HEADERS,
  });
}

export async function POST() {
  return NextResponse.json(
    buildMpgfCrecV1125NoSideEffectPostApi({
      operation: "recipient_registry_intake",
      route: "/api/mpgf/recipient-registry",
    }),
    { status: 202, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
  );
}
