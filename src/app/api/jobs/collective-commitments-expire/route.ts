import { NextResponse } from "next/server";

import { isCronRequestAuthorized } from "@/lib/cron";
import { expireDueCollectiveCommitments } from "@/lib/collective-commitments/service";

export const runtime = "nodejs";
export const maxDuration = 60;

async function run(request: Request) {
  if (!isCronRequestAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await expireDueCollectiveCommitments();
    return NextResponse.json({ ...result, identitiesPublished: false });
  } catch (error) {
    console.error("[collective-commitments-expire] Expiry job failed safely", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Collective-commitment expiry failed safely; no publication action was taken." },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
