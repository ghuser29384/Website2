import { NextResponse } from "next/server";

import { getViewer } from "@/lib/app-data";
import {
  CONDITIONAL_PAYMENT_TERMS_VERSION,
  createDonationOffsetMandateCheckout,
} from "@/lib/payments/conditional-mandates";
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
    const matchId = formText(formData, "match_id");
    const consent = formText(formData, "consent");
    const termsVersion = formText(formData, "terms_version");

    if (consent !== "on") {
      throw new Error("Confirm the conditional charge and compensating-refund terms before continuing.");
    }
    if (termsVersion !== CONDITIONAL_PAYMENT_TERMS_VERSION) {
      throw new Error("The payment terms changed. Reload the page and review the current version.");
    }

    const result = await createDonationOffsetMandateCheckout({
      matchId,
      profileId: viewer.authUser.id,
      origin: new URL(request.url).origin,
      consentTermsVersion: termsVersion,
    });

    if (result.checkoutUrl) {
      return NextResponse.redirect(result.checkoutUrl, 303);
    }

    return NextResponse.redirect(
      workspaceUrl(request, {
        status: result.alreadyReady ? "already-ready" : result.status,
        mandate_id: result.mandateId,
      }),
      303,
    );
  } catch (error) {
    return NextResponse.redirect(
      workspaceUrl(request, { error: paymentErrorMessage(error) }),
      303,
    );
  }
}
