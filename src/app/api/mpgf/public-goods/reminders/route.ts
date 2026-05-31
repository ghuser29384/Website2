import { NextResponse } from "next/server";

import { isCronRequestAuthorized } from "@/lib/cron";
import { queueMpgfPublicGoodsReminderEmails } from "@/lib/mpgf/public-goods-reminders";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isAuthorized(request: Request) {
  const secret = process.env.MPGF_PUBLIC_GOODS_REMINDER_SECRET;

  if (secret) {
    const authorization = request.headers.get("authorization");
    const url = new URL(request.url);

    if (authorization === `Bearer ${secret}` || url.searchParams.get("secret") === secret) {
      return true;
    }
  }

  return isCronRequestAuthorized(request);
}

async function processPublicGoodsReminders(request: Request) {
  if (!process.env.MPGF_PUBLIC_GOODS_REMINDER_SECRET && !process.env.CRON_SECRET) {
    return NextResponse.json(
      { ok: false, error: "MPGF public-goods reminders are not configured." },
      { status: 503 },
    );
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized MPGF public-goods reminder request." }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const result = await queueMpgfPublicGoodsReminderEmails({
      dryRun: url.searchParams.get("dryRun") === "1",
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Could not queue MPGF public-goods reminders.",
      },
      { status: 400 },
    );
  }
}

export async function GET(request: Request) {
  return processPublicGoodsReminders(request);
}

export async function POST(request: Request) {
  return processPublicGoodsReminders(request);
}
