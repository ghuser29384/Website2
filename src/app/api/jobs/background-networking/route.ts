import { NextResponse } from "next/server";

import { runBackgroundNetworkingMaintenanceJob } from "@/lib/background-jobs";
import { isCronRequestAuthorized } from "@/lib/cron";
import { getSiteUrl } from "@/lib/supabase/config";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function processBackgroundNetworkingJob(request: Request) {
  if (!isCronRequestAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const result = await runBackgroundNetworkingMaintenanceJob({
    siteUrl: getSiteUrl(),
    supabase,
  });

  return NextResponse.json({
    ...result,
    rawPrivateTextProcessed: false,
    autonomousOutreachSent: false,
  });
}

export async function GET(request: Request) {
  return processBackgroundNetworkingJob(request);
}

export async function POST(request: Request) {
  return processBackgroundNetworkingJob(request);
}
