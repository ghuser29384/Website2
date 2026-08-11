import { NextRequest, NextResponse } from "next/server";

import { getViewer } from "@/lib/app-data";
import { persistCreateSubmission } from "@/lib/create-interface/persistence";
import { validateAccountParticipantTargets } from "@/lib/create-interface/participant-target-server";
import { validateCreatePayload } from "@/lib/create-interface/validation";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function response(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function POST(request: NextRequest) {
  const requestOrigin = request.headers.get("origin");
  if (requestOrigin && requestOrigin !== request.nextUrl.origin) {
    return response({ ok: false, message: "Cross-origin Create submissions are not accepted." }, 403);
  }

  const viewer = await getViewer();
  if (!viewer) {
    return response(
      {
        ok: false,
        requiresAuth: true,
        message: "Sign in to submit this Create record. Your entered terms remain in this browser.",
        loginUrl: "/login?returnTo=%2Ftrades%2Fnew%3Fresume%3Dcreate",
      },
      401,
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return response({ ok: false, message: "The Create submission was not valid JSON." }, 400);
  }

  try {
    const validated = validateCreatePayload(raw);
    const supabase = createServiceClient();
    await validateAccountParticipantTargets({
      supabase,
      actorId: viewer.authUser.id,
      validated,
    });
    const submission = await persistCreateSubmission({
      supabase,
      actorId: viewer.authUser.id,
      validated,
      origin: request.nextUrl.origin,
    });
    return response({ ok: true, submission }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "The Create submission could not be saved.";
    const status = /no longer eligible|no longer available|changed after selection|remove and reselect/i.test(message)
      ? 409
      : /required|invalid|must|unsupported|exceeds|cannot|between|future|formula|threshold/i.test(message)
        ? 400
        : 500;
    console.error("[create-interface] submission failed", {
      message,
      userId: viewer.authUser.id,
    });
    return response({ ok: false, message }, status);
  }
}
