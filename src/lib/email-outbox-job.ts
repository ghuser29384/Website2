import "server-only";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { processEmailOutboxCore, type EmailOutboxExecution } from "@/lib/email-outbox-core";
export type { EmailOutboxExecution } from "@/lib/email-outbox-core";

export function processEmailOutbox(request: Request, execution?: EmailOutboxExecution) {
  return processEmailOutboxCore(request, { createServiceClient, json: NextResponse.json }, execution);
}
