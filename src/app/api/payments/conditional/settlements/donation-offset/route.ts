import { NextResponse } from "next/server";

import { evaluateAdminOperatorAccess } from "@/lib/admin";
import { getViewer } from "@/lib/app-data";
import { loadBackgroundAccountSecuritySummary } from "@/lib/background-account-security";
import { attemptDonationOffsetSettlement } from "@/lib/payments/donation-offset-settlement";
import {
  assertSameOriginPaymentPost,
  formText,
  paymentErrorMessage,
} from "@/lib/payments/http";

export const runtime = "nodejs";

function workspaceUrl(request: Request, parameters: Record<string, string>) {
  const url = new URL("/donation-offsets/payments", request.url);
  for (const [key, value] of Object.entries(parameters)) {
    url.searchParams.set(key, value);
  }
  return url;
}

export async function POST(request: Request) {
  try {
    assertSameOriginPaymentPost(request);
    const viewer = await getViewer();
    if (!viewer) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const mfaSummary = await loadBackgroundAccountSecuritySummary();
    const access = evaluateAdminOperatorAccess({
      email: viewer.authUser.email,
      mfaSummary,
    });
    if (!access.allowed) {
      return NextResponse.json({ error: access.message, reason: access.reason }, { status: 403 });
    }

    const formData = await request.formData();
    const matchId = formText(formData, "match_id");
    if (!/^[0-9a-f-]{36}$/i.test(matchId)) {
      throw new Error("A valid donation-offset match ID is required.");
    }

    const result = await attemptDonationOffsetSettlement(matchId);
    if (request.headers.get("accept")?.includes("application/json")) {
      return NextResponse.json(result, {
        status: result.status === "transferred" ? 200 : result.status === "blocked" ? 503 : 202,
      });
    }

    return NextResponse.redirect(
      workspaceUrl(request, {
        settlement: result.status,
        match_id: matchId,
        message: result.message,
      }),
      303,
    );
  } catch (error) {
    if (request.headers.get("accept")?.includes("application/json")) {
      return NextResponse.json({ error: paymentErrorMessage(error) }, { status: 400 });
    }
    return NextResponse.redirect(
      workspaceUrl(request, { error: paymentErrorMessage(error) }),
      303,
    );
  }
}
