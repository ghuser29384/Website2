import { NextResponse } from "next/server";

import {
  buildReminderCalendarIcs,
  loadReminderCalendarItemsByToken,
} from "@/lib/trade-reminders";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface CalendarFeedRouteProps {
  params: Promise<{ token: string[] }>;
}

export async function GET(_request: Request, { params }: CalendarFeedRouteProps) {
  const { token: tokenSegments } = await params;
  const rawToken = tokenSegments.join("/");
  const token = rawToken.endsWith(".ics") ? rawToken.slice(0, -4) : rawToken;

  try {
    const items = await loadReminderCalendarItemsByToken(token);
    if (!items) {
      return new NextResponse("Calendar feed not found or disabled.", {
        status: 404,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const calendar = buildReminderCalendarIcs({ items });
    return new NextResponse(calendar, {
      status: 200,
      headers: {
        "Cache-Control": "private, max-age=300, stale-while-revalidate=300",
        "Content-Disposition": 'inline; filename="moral-trade-reminders.ics"',
        "Content-Type": "text/calendar; charset=utf-8",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Could not build the calendar feed." },
      { status: 500 },
    );
  }
}
