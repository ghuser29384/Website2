import { NextResponse } from "next/server";

import { isCronRequestAuthorized } from "@/lib/cron";
import { processPerformanceBondScheduledTransitions } from "@/lib/performance-bonds";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function processPerformanceBondJob(request: Request) {
  if (!isCronRequestAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processPerformanceBondScheduledTransitions({
      supabase: createServiceClient(),
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to process pledge performance bond scheduled transitions.",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return processPerformanceBondJob(request);
}

export async function POST(request: Request) {
  return processPerformanceBondJob(request);
}
