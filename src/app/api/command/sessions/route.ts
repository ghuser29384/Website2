import { NextResponse } from "next/server";

import { getViewer } from "@/lib/app-data";
import { createCommandSession, listCommandSessions } from "@/lib/command/persistence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function privateJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store", Vary: "Cookie" },
  });
}

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return privateJson({ ok: false, error: "Authentication required." }, 401);
  try {
    const sessions = await listCommandSessions(viewer.authUser.id);
    return privateJson({ ok: true, sessions });
  } catch (error) {
    console.error("[command] Failed to list sessions", error);
    return privateJson({ ok: false, error: "Command history is temporarily unavailable." }, 503);
  }
}

export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return privateJson({ ok: false, error: "Authentication required." }, 401);
  let prompt = "";
  try {
    const body = await request.json();
    prompt = typeof body?.prompt === "string" ? body.prompt : "";
  } catch {
    // An empty body creates a blank session.
  }
  try {
    const session = await createCommandSession(viewer.authUser.id, prompt);
    return privateJson({ ok: true, session }, 201);
  } catch (error) {
    console.error("[command] Failed to create session", error);
    return privateJson({ ok: false, error: "A private Command session could not be created." }, 503);
  }
}
