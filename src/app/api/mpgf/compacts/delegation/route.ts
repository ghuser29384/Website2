import { NextResponse } from "next/server";

import { getViewer } from "@/lib/app-data";
import { MPGF_PUBLIC_GOODS_API_HEADERS } from "@/lib/mpgf/public-goods-api";
import {
  asMpgfPublicGoodsCompactRecord,
  parseMpgfPublicGoodsCompactElectorateKey,
  parseMpgfPublicGoodsCompactIdempotencyKey,
  parseMpgfPublicGoodsCompactMembershipId,
  parseMpgfPublicGoodsCompactPublicKey,
} from "@/lib/mpgf/public-goods-compacts-input";
import {
  clearMpgfPublicGoodsCompactDelegation,
  setMpgfPublicGoodsCompactDelegation,
} from "@/lib/mpgf/public-goods-compacts-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function json(payload: unknown, status: number) {
  return NextResponse.json(payload, {
    status,
    headers: MPGF_PUBLIC_GOODS_API_HEADERS,
  });
}

async function authenticatedRecord(request: Request) {
  if (!(await getViewer())) {
    throw new Error("UNAUTHENTICATED");
  }

  return asMpgfPublicGoodsCompactRecord(await request.json());
}

export async function PUT(request: Request) {
  try {
    const record = await authenticatedRecord(request);
    const result = await setMpgfPublicGoodsCompactDelegation({
      compactPublicKey: parseMpgfPublicGoodsCompactPublicKey(
        record.compactPublicKey,
      ),
      electorateKey: parseMpgfPublicGoodsCompactElectorateKey(
        record.electorateKey,
      ),
      delegateeMembershipId: parseMpgfPublicGoodsCompactMembershipId(
        record.delegateeMembershipId,
      ),
      idempotencyKey: parseMpgfPublicGoodsCompactIdempotencyKey(
        record.idempotencyKey,
      ),
    });

    return json(result, 200);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return json(
        { ok: false, error: "Sign in to delegate a compact voting credit." },
        401,
      );
    }

    return json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not set the compact delegation.",
      },
      400,
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const record = await authenticatedRecord(request);
    const result = await clearMpgfPublicGoodsCompactDelegation({
      compactPublicKey: parseMpgfPublicGoodsCompactPublicKey(
        record.compactPublicKey,
      ),
      electorateKey: parseMpgfPublicGoodsCompactElectorateKey(
        record.electorateKey,
      ),
      idempotencyKey: parseMpgfPublicGoodsCompactIdempotencyKey(
        record.idempotencyKey,
      ),
    });

    return json(result, 200);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return json(
        { ok: false, error: "Sign in to revoke a compact delegation." },
        401,
      );
    }

    return json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not revoke the compact delegation.",
      },
      400,
    );
  }
}
