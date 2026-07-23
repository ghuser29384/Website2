import { NextResponse } from "next/server";

import { getViewer } from "@/lib/app-data";
import { confirmCommandTool } from "@/lib/command/service";
import { takeMoralTradeApiRateLimitSlot } from "@/lib/moral-trade/api-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ toolCallId: string }>;
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
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "participant_confirmation_enforce");
  if (rateLimit.limited) {
    return privateJson(
      { ok: false, error: "Too many confirmation attempts. Try again shortly." },
      429,
      { "Retry-After": String(rateLimit.retryAfterSeconds) },
    );
  }
  const viewer = await getViewer();
  if (!viewer) return privateJson({ ok: false, error: "Authentication required." }, 401);
  const { toolCallId } = await context.params;
  let confirmation = "";
  try {
    const body = await request.json();
    confirmation = typeof body?.confirmation === "string" ? body.confirmation : "";
  } catch {
    return privateJson({ ok: false, error: "Invalid JSON payload." }, 400);
  }
  try {
    const response = await confirmCommandTool({
      profileId: viewer.authUser.id,
      toolCallId,
      confirmation,
    });
    return privateJson(response, response.ok ? 200 : 422);
  } catch (error) {
    console.error("[command] Confirmation failed", error);
    return privateJson(
      { ok: false, error: "Confirmation could not be processed. No action was taken." },
      503,
    );
  }
}
