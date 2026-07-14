import { NextResponse } from "next/server";

import { getViewer } from "@/lib/app-data";
import { cancelConditionalMandate } from "@/lib/payments/conditional-mandates";
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
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("returnTo", "/donation-offsets/payments");
      return NextResponse.redirect(loginUrl, 303);
    }

    const formData = await request.formData();
    const mandateId = formText(formData, "mandate_id");
    if (!/^[0-9a-f-]{36}$/i.test(mandateId)) {
      throw new Error("A valid payment mandate ID is required.");
    }

    await cancelConditionalMandate({
      mandateId,
      profileId: viewer.authUser.id,
    });
    return NextResponse.redirect(workspaceUrl(request, { status: "cancelled" }), 303);
  } catch (error) {
    return NextResponse.redirect(
      workspaceUrl(request, { error: paymentErrorMessage(error) }),
      303,
    );
  }
}
