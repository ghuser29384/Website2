import { NextResponse } from "next/server";

import { getViewer } from "@/lib/app-data";
import { MPGF_PUBLIC_GOODS_API_HEADERS } from "@/lib/mpgf/public-goods-api";
import { asMpgfPublicGoodsCompactRecord, parseMpgfPublicGoodsCompactAllocationBps, parseMpgfPublicGoodsCompactIdempotencyKey } from "@/lib/mpgf/public-goods-compacts-input";
import { setMpgfPublicGoodsCompactAllocation } from "@/lib/mpgf/public-goods-compacts-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PUT(request: Request) {
  try {
    if (!(await getViewer())) return NextResponse.json({ ok: false, error: "Sign in to allocate your Compact obligation." }, { status: 401, headers: MPGF_PUBLIC_GOODS_API_HEADERS });
    const record = asMpgfPublicGoodsCompactRecord(await request.json());
    const result = await setMpgfPublicGoodsCompactAllocation({
      allocationBps: parseMpgfPublicGoodsCompactAllocationBps(record.allocationBps),
      idempotencyKey: parseMpgfPublicGoodsCompactIdempotencyKey(record.idempotencyKey),
    });
    return NextResponse.json(result, { status: 200, headers: MPGF_PUBLIC_GOODS_API_HEADERS });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Could not save the Compact allocation." }, { status: 400, headers: MPGF_PUBLIC_GOODS_API_HEADERS });
  }
}
