import { NextResponse } from "next/server";

import { isCronRequestAuthorized } from "@/lib/cron";
import { hasEmailEnv, sendEmail } from "@/lib/email";
import type { Database } from "@/lib/supabase/database.types";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type EmailOutboxRow = Database["public"]["Tables"]["email_outbox"]["Row"];

async function processEmailOutbox(request: Request) {
  if (!isCronRequestAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasEmailEnv()) {
    return NextResponse.json(
      { error: "Email provider is not configured. Set RESEND_API_KEY and EMAIL_FROM." },
      { status: 503 },
    );
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("email_outbox")
    .select("*")
    .eq("status", "queued")
    .neq("recipient_email", "")
    .order("created_at", { ascending: true })
    .limit(25);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  let failed = 0;

  for (const email of (data ?? []) as EmailOutboxRow[]) {
    try {
      await sendEmail({
        to: email.recipient_email,
        subject: email.subject,
        text: email.body,
      });

      const { error: updateError } = await supabase
        .from("email_outbox")
        .update({
          status: "sent",
          provider: "resend",
          sent_at: new Date().toISOString(),
          last_error: "",
        })
        .eq("id", email.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      sent += 1;
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : "Unknown email error.";

      await supabase
        .from("email_outbox")
        .update({
          status: "failed",
          provider: "resend",
          attempt_count: email.attempt_count + 1,
          last_error: message.slice(0, 500),
        })
        .eq("id", email.id);
    }
  }

  return NextResponse.json({
    processed: sent + failed,
    sent,
    failed,
  });
}

export async function GET(request: Request) {
  return processEmailOutbox(request);
}

export async function POST(request: Request) {
  return processEmailOutbox(request);
}
