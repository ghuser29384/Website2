import { NextResponse } from "next/server";

import { isCronRequestAuthorized } from "@/lib/cron";
import type { Database } from "@/lib/supabase/database.types";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type PaymentScheduleRow = Database["public"]["Tables"]["agreement_payment_schedules"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

function formatMoney(amountCents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}

function advanceDueDate(schedule: PaymentScheduleRow) {
  const dueDate = new Date(schedule.next_due_at);
  const step = schedule.cadence_interval_value;

  if (schedule.cadence_interval_unit === "month") {
    dueDate.setMonth(dueDate.getMonth() + step);
  } else if (schedule.cadence_interval_unit === "year") {
    dueDate.setFullYear(dueDate.getFullYear() + step);
  } else {
    dueDate.setDate(dueDate.getDate() + step);
  }

  return dueDate.toISOString();
}

async function processPaymentReminders(request: Request) {
  if (!isCronRequestAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("agreement_payment_schedules")
    .select("*")
    .eq("status", "active")
    .lte("next_due_at", now)
    .order("next_due_at", { ascending: true })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const schedules = (data ?? []) as PaymentScheduleRow[];
  const profileIds = [
    ...new Set(schedules.flatMap((schedule) => [schedule.payer_id, schedule.payee_id])),
  ];
  const { data: profiles, error: profileError } = profileIds.length
    ? await supabase.from("profiles").select("*").in("id", profileIds)
    : { data: [] as ProfileRow[], error: null };

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const profileMap = new Map(((profiles ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]));
  let remindersQueued = 0;

  for (const schedule of schedules) {
    const payer = profileMap.get(schedule.payer_id);
    const payee = profileMap.get(schedule.payee_id);
    const amount = formatMoney(schedule.amount_cents, schedule.currency);
    const nextDueAt = advanceDueDate(schedule);

    if (payer?.email) {
      await supabase.from("email_outbox").insert({
        profile_id: payer.id,
        recipient_email: payer.email,
        subject: "Moral Trade payment reminder",
        body: `A negotiated payment of ${amount} is due for one of your Moral Trade agreements. Sign in to review the agreement, pay through Stripe, or record a change.`,
      });
      remindersQueued += 1;
    }

    if (payee?.email) {
      await supabase.from("email_outbox").insert({
        profile_id: payee.id,
        recipient_email: payee.email,
        subject: "Moral Trade payment schedule update",
        body: `A scheduled ${amount} payment is due from your counterparty. Sign in to review the agreement record.`,
      });
      remindersQueued += 1;
    }

    await supabase
      .from("agreement_payment_schedules")
      .update({
        last_reminded_at: now,
        next_due_at: nextDueAt,
      })
      .eq("id", schedule.id);
  }

  return NextResponse.json({
    schedulesProcessed: schedules.length,
    remindersQueued,
  });
}

export async function GET(request: Request) {
  return processPaymentReminders(request);
}

export async function POST(request: Request) {
  return processPaymentReminders(request);
}
