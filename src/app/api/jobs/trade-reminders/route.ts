import { NextResponse } from "next/server";

import { isCronRequestAuthorized } from "@/lib/cron";
import { processTradeReminders } from "@/lib/trade-reminder-worker";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function processReminderRequest(request: Request) {
  if (!isCronRequestAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const result = await processTradeReminders({
      dryRun: url.searchParams.get("dryRun") === "1",
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not process trade reminders.",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return processReminderRequest(request);
}

export async function POST(request: Request) {
  return processReminderRequest(request);
}
