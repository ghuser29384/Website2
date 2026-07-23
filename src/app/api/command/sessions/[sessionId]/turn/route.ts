import { NextResponse } from "next/server";

import { getViewer } from "@/lib/app-data";
import { processCommandTurn } from "@/lib/command/service";
import { takeMoralTradeApiRateLimitSlot } from "@/lib/moral-trade/api-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ sessionId: string }>;
}

function privateJson(body: unknown, status = 200, headers?: HeadersInit) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      Vary: "Cookie",
      ...Object.fromEntries(new Headers(headers)),
    },
  });
}

export async function POST(request: Request, context: RouteContext) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "copilot_draft_review");
  if (rateLimit.limited) {
    return privateJson(
      { ok: false, error: "Too many Command requests. Try again shortly." },
      429,
      { "Retry-After": String(rateLimit.retryAfterSeconds) },
    );
  }
  const viewer = await getViewer();
  if (!viewer) return privateJson({ ok: false, error: "Authentication required." }, 401);
  const { sessionId } = await context.params;
  let message = "";
  try {
    const body = await request.json();
    message = typeof body?.message === "string" ? body.message : "";
  } catch {
    return privateJson({ ok: false, error: "Invalid JSON payload." }, 400);
  }
  if (!message.trim()) return privateJson({ ok: false, error: "A command is required." }, 400);
  try {
    const response = await processCommandTurn({
      profileId: viewer.authUser.id,
      sessionId,
      message,
    });
    return privateJson(response, response.ok ? 200 : 422);
  } catch (error) {
    console.error("[command] Turn failed", error);
    return privateJson(
      {
        ok: false,
        error: "Command could not complete this turn. No external or financial action was taken.",
      },
      503,
    );
  }
}
