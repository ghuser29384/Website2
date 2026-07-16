import { NextResponse } from "next/server";

import { getMoralTradeFundingReadiness } from "@/lib/funding";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET() {
  return NextResponse.json(getMoralTradeFundingReadiness(), {
    headers: {
      "cache-control": "no-store",
    },
  });
}
