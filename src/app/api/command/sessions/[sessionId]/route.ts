import { NextResponse } from "next/server";

import { getViewer } from "@/lib/app-data";
import { getCommandSession, updateCommandSession } from "@/lib/command/persistence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ sessionId: string }>;
}

function privateJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store", Vary: "Cookie" },
  });
}

export async function GET(_request: Request, context: RouteContext) {
  const viewer = await getViewer();
  if (!viewer) return privateJson({ ok: false, error: "Authentication required." }, 401);
  const { sessionId } = await context.params;
  try {
    const session = await getCommandSession(viewer.authUser.id, sessionId);
    if (!session) return privateJson({ ok: false, error: "Command session not found." }, 404);
    return privateJson({ ok: true, session });
  } catch (error) {
    console.error("[command] Failed to load session", error);
    return privateJson({ ok: false, error: "The Command session could not be loaded." }, 503);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const viewer = await getViewer();
  if (!viewer) return privateJson({ ok: false, error: "Authentication required." }, 401);
  const { sessionId } = await context.params;
  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    body = parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return privateJson({ ok: false, error: "Invalid JSON payload." }, 400);
  }
  const state = body.state === "active" || body.state === "archived" ? body.state : undefined;
  const title = typeof body.title === "string" ? body.title.slice(0, 120) : undefined;
  if (!state && title === undefined) {
    return privateJson({ ok: false, error: "No supported session change was provided." }, 400);
  }
  try {
    const session = await updateCommandSession({
      profileId: viewer.authUser.id,
      sessionId,
      state,
      title,
    });
    return privateJson({ ok: true, session });
  } catch (error) {
    console.error("[command] Failed to update session", error);
    return privateJson({ ok: false, error: "The Command session could not be updated." }, 503);
  }
}
