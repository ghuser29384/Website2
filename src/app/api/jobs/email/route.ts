import { processEmailOutbox } from "@/lib/email-outbox-job";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return processEmailOutbox(request);
}

export async function POST(request: Request) {
  return processEmailOutbox(request);
}
