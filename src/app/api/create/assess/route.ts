import { NextRequest, NextResponse } from "next/server";

import { getViewer } from "@/lib/app-data";
import { validateCreatePayload } from "@/lib/create-interface/validation";
import { assessHarmfulOffer } from "@/lib/moral-trade/harmful-offer-assessment";
import { presentHarmfulOfferAssessment } from "@/lib/moral-trade/harmful-offer-presentation";
import { claimHarmfulOfferAssessmentRateLimit } from "@/lib/moral-trade/harmful-offer-rate-limit";
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
    return response({ ok: false, message: "Cross-origin assessments are not accepted." }, 403);
  }

  const viewer = await getViewer();
  if (!viewer) {
    return response(
      {
        ok: false,
        requiresAuth: true,
        message: "Sign in to run the private automatic assessment.",
        loginUrl: "/login?returnTo=%2Ftrades%2Fnew%3Fresume%3Dcreate",
      },
      401,
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return response({ ok: false, message: "The assessment request was not valid JSON." }, 400);
  }

  try {
    const validated = validateCreatePayload(raw);
    const supabase = createServiceClient();
    const allowed = await claimHarmfulOfferAssessmentRateLimit({
      supabase,
      actorId: viewer.authUser.id,
      scope: "live_draft",
    });
    if (!allowed) {
      return response(
        {
          ok: false,
          rateLimited: true,
          message: "Automatic assessment is temporarily limited. The final submission will remain private for review if an automatic result is unavailable.",
        },
        429,
      );
    }

    const assessment = await assessHarmfulOffer(validated.source, {
      trigger: "live_draft",
      includeModel: true,
    });
    return response({
      ok: true,
      harmAssessment: presentHarmfulOfferAssessment(assessment),
    });
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "The automatic assessment could not be completed.";
    const status = /required|invalid|must|unsupported|exceeds|cannot|between|future|formula|threshold/i.test(message)
      ? 400
      : 500;
    console.error("[create-interface] live harm assessment failed", {
      message,
      userId: viewer.authUser.id,
    });
    return response({ ok: false, message }, status);
  }
}
