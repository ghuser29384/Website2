import { NextResponse } from "next/server";

import { getConditionalPaymentReadiness } from "@/lib/payments/conditional-readiness";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const readiness = await getConditionalPaymentReadiness();
  return NextResponse.json(readiness, {
    status: readiness.canSettle ? 200 : 503,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
