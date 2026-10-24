import { randomUUID } from "node:crypto";

import { isCronRequestAuthorized } from "@/lib/cron";
import { hasEmailEnv, sendEmail } from "@/lib/email";
import { evaluateMoralTradeEmailOutboxSafety } from "@/lib/moral-trade/email-copy";

interface ClaimedEmail {
  id: string;
  recipient_email: string;
  subject: string;
  body: string;
  provider: string;
  attempt_count: number;
  idempotency_key: string | null;
}

// Internal server callers only; HTTP wrappers never accept this from a request.
export interface EmailOutboxExecution {
  createClient: () => unknown;
  workerToken: string;
  signal: AbortSignal;
  check: () => void;
}

export async function processEmailOutboxCore(
  request: Request,
  dependencies: { createServiceClient: () => unknown; json: typeof Response.json },
  execution?: EmailOutboxExecution,
) {
  if (!isCronRequestAuthorized(request)) {
    return dependencies.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasEmailEnv()) {
    return dependencies.json(
      { error: "Email provider is not configured. Set RESEND_API_KEY and EMAIL_FROM." },
      { status: 503 },
    );
  }

  execution?.check();
  const supabase = (execution ? execution.createClient() : dependencies.createServiceClient()) as any;
  const workerToken = execution?.workerToken ?? randomUUID();
  const { data, error } = await supabase.rpc("claim_email_outbox_v2", {
    p_limit: 25,
    p_worker_token: workerToken,
  });

  execution?.check();
  if (error) {
    return dependencies.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  let failed = 0;
  let retrying = 0;
  let suppressed = 0;

  for (const email of (data ?? []) as ClaimedEmail[]) {
    execution?.check();
    const safety = evaluateMoralTradeEmailOutboxSafety({
      body: email.body,
      provider: email.provider,
      subject: email.subject,
    });

    if (safety.status === "suppress") {
      const { data: didSuppress, error: suppressError } = await supabase.rpc(
        "suppress_email_outbox_v2",
        {
          p_email_id: email.id,
          p_reason: safety.blockers.join("; "),
          p_worker_token: workerToken,
        },
      );
      execution?.check();
      if (suppressError || !didSuppress) failed += 1;
      else suppressed += 1;
      continue;
    }

    try {
      const providerResult = await sendEmail({
        ...(execution ? { signal: execution.signal } : {}),
        idempotencyKey: email.idempotency_key ?? `email-outbox:${email.id}`,
        to: email.recipient_email,
        subject: email.subject,
        text: email.body,
      });

      execution?.check();
      const { data: didComplete, error: completeError } = await supabase.rpc(
        "complete_email_outbox_v2",
        {
          p_email_id: email.id,
          p_provider_message_id: providerResult.id ?? "",
          p_worker_token: workerToken,
        },
      );
      execution?.check();
      if (completeError || !didComplete) {
        throw new Error(completeError?.message ?? "Email lease was no longer current.");
      }
      sent += 1;
    } catch (deliveryError) {
      // Leave ambiguous sends under their existing lease when execution expires.
      execution?.check();
      const message =
        deliveryError instanceof Error ? deliveryError.message : "Unknown email error.";
      const { data: nextStatus, error: retryError } = await supabase.rpc(
        "retry_email_outbox_v2",
        {
          p_email_id: email.id,
          p_error: message,
          p_worker_token: workerToken,
        },
      );
      execution?.check();
      if (retryError || !nextStatus || nextStatus === "failed") failed += 1;
      else retrying += 1;
    }
  }

  return dependencies.json({
    claimed: (data ?? []).length,
    failed,
    retrying,
    sent,
    suppressed,
  });
}
