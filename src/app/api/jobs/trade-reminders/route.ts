import { NextResponse } from "next/server";

import { isCronRequestAuthorized } from "@/lib/cron";
import { getSiteUrl } from "@/lib/supabase/config";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

async function processTradeReminders(request: Request) {
  if (!isCronRequestAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient() as any;
  const now = new Date();
  const today = dateOnly(now);
  const threeDaysFromNow = new Date(now);
  threeDaysFromNow.setUTCDate(threeDaysFromNow.getUTCDate() + 3);
  const dueThrough = dateOnly(threeDaysFromNow);

  const { data: agreements, error } = await supabase
    .from("agreements")
    .select("id,proposer_id,responder_id,evidence_due_at,lifecycle_status")
    .in("lifecycle_status", ["active", "evidence_due"])
    .not("evidence_due_at", "is", null)
    .lte("evidence_due_at", dueThrough)
    .order("evidence_due_at", { ascending: true })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const profileIds = [
    ...new Set(
      (agreements ?? []).flatMap((agreement: any) => [
        String(agreement.proposer_id),
        String(agreement.responder_id),
      ]),
    ),
  ];
  const { data: profiles } = profileIds.length
    ? await supabase.from("profiles").select("id,email").in("id", profileIds)
    : { data: [] };
  const emailById = new Map<string, string>(
    (profiles ?? []).map((profile: any): [string, string] => [
      String(profile.id),
      String(profile.email ?? ""),
    ]),
  );

  let notificationsCreated = 0;
  let emailsQueued = 0;
  let agreementsMarkedDue = 0;

  for (const agreement of agreements ?? []) {
    const dueDate = String(agreement.evidence_due_at);
    const isOverdue = dueDate < today;
    const href = `/trade-agreements/${agreement.id}`;
    const absoluteUrl = new URL(href, getSiteUrl()).toString();

    if (isOverdue && agreement.lifecycle_status === "active") {
      const update = await supabase
        .from("agreements")
        .update({ lifecycle_status: "evidence_due", updated_at: now.toISOString() })
        .eq("id", agreement.id)
        .eq("lifecycle_status", "active");
      if (!update.error) agreementsMarkedDue += 1;
    }

    for (const userId of [String(agreement.proposer_id), String(agreement.responder_id)]) {
      const dedupeKey = `evidence_due:${agreement.id}:${userId}:${dueDate}`;
      const notification = await supabase
        .from("trade_notifications")
        .insert({
          user_id: userId,
          notification_type: isOverdue ? "evidence_overdue" : "evidence_due_soon",
          title: isOverdue ? "Evidence is overdue" : "Evidence is due soon",
          body: isOverdue
            ? "The agreement evidence due date has passed. Submit evidence, amend the terms, or use the published exit rule."
            : `Evidence is due on ${dueDate}. Review the evidence requirements and submit a file, link, or attestation.`,
          href,
          dedupe_key: dedupeKey,
        })
        .select("id")
        .maybeSingle();

      if (notification.error || !notification.data?.id) {
        continue;
      }
      notificationsCreated += 1;

      const recipientEmail = emailById.get(userId)?.trim() ?? "";
      if (!recipientEmail) continue;
      const queued = await supabase.from("email_outbox").insert({
        profile_id: userId,
        recipient_email: recipientEmail,
        subject: isOverdue
          ? "Moral Trade: evidence is overdue"
          : "Moral Trade: evidence is due soon",
        body: `A private agreement action needs review. Sign in at ${absoluteUrl}. This email does not include participant names, private terms, payment information, or evidence.`,
        status: "queued",
        provider: "core_trade_reminder",
      });
      if (!queued.error) emailsQueued += 1;
    }
  }

  return NextResponse.json({
    scanned: agreements?.length ?? 0,
    notificationsCreated,
    emailsQueued,
    agreementsMarkedDue,
    window: { today, dueThrough },
  });
}

export async function GET(request: Request) {
  return processTradeReminders(request);
}

export async function POST(request: Request) {
  return processTradeReminders(request);
}
