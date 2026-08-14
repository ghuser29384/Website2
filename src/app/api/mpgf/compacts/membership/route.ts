import { NextResponse } from "next/server";

import { getViewer } from "@/lib/app-data";
import { MPGF_PUBLIC_GOODS_API_HEADERS } from "@/lib/mpgf/public-goods-api";
import {
  asMpgfPublicGoodsCompactRecord,
  parseMpgfPublicGoodsCompactAcknowledgements,
  parseMpgfPublicGoodsCompactConstitutionVersion,
  parseMpgfPublicGoodsCompactIdempotencyKey,
  parseMpgfPublicGoodsCompactPublicKey,
  parseMpgfPublicGoodsCompactSpendingCents,
} from "@/lib/mpgf/public-goods-compacts-input";
import {
  joinMpgfPublicGoodsCompact,
  requestMpgfPublicGoodsCompactExit,
} from "@/lib/mpgf/public-goods-compacts-service";

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

export async function POST(request: Request) {
  try {
    const record = await authenticatedRecord(request);
    const result = await joinMpgfPublicGoodsCompact({
      compactPublicKey: parseMpgfPublicGoodsCompactPublicKey(
        record.compactPublicKey,
      ),
      constitutionVersion: parseMpgfPublicGoodsCompactConstitutionVersion(
        record.constitutionVersion,
      ),
      acknowledgements: parseMpgfPublicGoodsCompactAcknowledgements(
        record.acknowledgements,
      ),
      declaredEligibleMonthlySpendingCents:
        parseMpgfPublicGoodsCompactSpendingCents(
          record.declaredEligibleMonthlySpendingCents,
        ),
      idempotencyKey: parseMpgfPublicGoodsCompactIdempotencyKey(
        record.idempotencyKey,
      ),
    });

    return json(result, 200);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return json(
        { ok: false, error: "Sign in to accept a public-goods compact." },
        401,
      );
    }

    return json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not accept the public-goods compact.",
      },
      400,
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const record = await authenticatedRecord(request);
    const result = await requestMpgfPublicGoodsCompactExit({
      compactPublicKey: parseMpgfPublicGoodsCompactPublicKey(
        record.compactPublicKey,
      ),
      idempotencyKey: parseMpgfPublicGoodsCompactIdempotencyKey(
        record.idempotencyKey,
      ),
    });

    return json(result, 200);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return json(
        { ok: false, error: "Sign in to change a public-goods compact membership." },
        401,
      );
    }

    return json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not change the public-goods compact membership.",
      },
      400,
    );
  }
}
