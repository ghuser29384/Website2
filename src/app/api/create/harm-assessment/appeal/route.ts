import { NextRequest, NextResponse } from "next/server";

import { getViewer } from "@/lib/app-data";
import { claimHarmfulOfferAssessmentRateLimit } from "@/lib/moral-trade/harmful-offer-rate-limit";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface AppealRpcRow {
  appeal_id: string;
  appeal_status: "pending";
  created_at: string;
}

function response(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(request: NextRequest) {
  const requestOrigin = request.headers.get("origin");
  if (requestOrigin && requestOrigin !== request.nextUrl.origin) {
    return response({ ok: false, message: "Cross-origin appeal requests are not accepted." }, 403);
  }

  const viewer = await getViewer();
  if (!viewer) {
    return response({ ok: false, requiresAuth: true, message: "Sign in to request reconsideration." }, 401);
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return response({ ok: false, message: "The appeal request was not valid JSON." }, 400);
  }
  if (!raw || typeof raw !== "object") {
    return response({ ok: false, message: "The appeal request must be an object." }, 400);
  }

  const input = raw as Record<string, unknown>;
  const assessmentId = input.assessmentId;
  const appealKind = input.appealKind;
  const statement = typeof input.statement === "string" ? input.statement.trim() : "";
  const evidence = input.evidence ?? {};
  if (!isUuid(assessmentId)) {
    return response({ ok: false, message: "The assessment receipt is invalid." }, 400);
  }
  if (!["ordinary", "new_evidence", "procedural_error"].includes(String(appealKind))) {
    return response({ ok: false, message: "The appeal kind is invalid." }, 400);
  }
  if (statement.length < 20 || statement.length > 4_000) {
    return response({ ok: false, message: "Explain the reconsideration request in 20 to 4,000 characters." }, 400);
  }
  if (
    (!Array.isArray(evidence) && (!evidence || typeof evidence !== "object")) ||
    Buffer.byteLength(JSON.stringify(evidence), "utf8") > 24_000
  ) {
    return response({ ok: false, message: "The appeal evidence is invalid or too large." }, 400);
  }

  try {
    const supabase = createServiceClient();
    const allowed = await claimHarmfulOfferAssessmentRateLimit({
      supabase,
      actorId: viewer.authUser.id,
      scope: "appeal",
    });
    if (!allowed) {
      return response(
        {
          ok: false,
          rateLimited: true,
          message: "Reconsideration requests are temporarily limited. The existing private hold remains in place.",
        },
        429,
      );
    }

    const { data, error } = await supabase.rpc(
      "moral_trade_request_harm_assessment_appeal_service" as never,
      {
        p_actor_id: viewer.authUser.id,
        p_assessment_id: assessmentId,
        p_appeal_kind: appealKind,
        p_statement: statement,
        p_evidence: evidence,
      } as never,
    );
    if (error) throw new Error(error.message);
    const row = (Array.isArray(data) ? data[0] : data) as AppealRpcRow | null;
    if (!row?.appeal_id || row.appeal_status !== "pending") {
      throw new Error("The appeal request did not return a durable receipt.");
    }

    return response(
      {
        ok: true,
        appeal: {
          id: row.appeal_id,
          status: row.appeal_status,
          createdAt: row.created_at,
          title: "Reconsideration requested.",
          message:
            "The proposal remains private and non-binding. Applicable deadlines are paused and no money will be charged while a different reviewer considers the request.",
        },
      },
      201,
    );
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "The reconsideration request could not be saved.";
    const status = /invalid|required|ordinary appeal|new evidence|procedural|not eligible|not found|different reviewer/i.test(message)
      ? 400
      : 500;
    console.error("[harm-assessment] appeal request failed", {
      message,
      userId: viewer.authUser.id,
    });
    return response({ ok: false, message }, status);
  }
}
