import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  X_OAUTH_COOKIE_CONSENT,
  X_OAUTH_COOKIE_MAX_AGE_SECONDS,
  X_OAUTH_COOKIE_PROFILE_ID,
  X_OAUTH_COOKIE_RETURN_TO,
  X_OAUTH_COOKIE_STATE,
  X_OAUTH_COOKIE_VERIFIER,
  buildXAuthorizationUrl,
  createXOAuthAttempt,
  getSafeXProfileConnectorReturnPath,
  getXProfileConnectorAvailability,
  getXProfileConnectorConfig,
} from "@/lib/x-profile-connector";

export const dynamic = "force-dynamic";

const X_PRIORITY_CONSENT_VALUE = "priority-suggestions";

function redirectWithError(request: NextRequest, returnTo: string, message: string) {
  const url = new URL(returnTo, request.nextUrl.origin);
  url.searchParams.delete("message");
  url.searchParams.set("error", message);
  url.searchParams.set("sources", "x");
  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return new NextResponse("Invalid request origin.", { status: 403 });
  }

  const formData = await request.formData();
  const returnTo = getSafeXProfileConnectorReturnPath(
    typeof formData.get("return_to") === "string" ? String(formData.get("return_to")) : "",
    "/complete-profile",
  );
  const consent = formData.get("consent");
  const availability = getXProfileConnectorAvailability();

  if (!availability.enabled) {
    return redirectWithError(
      request,
      returnTo,
      "X account connection is not enabled on this deployment.",
    );
  }

  if (consent !== X_PRIORITY_CONSENT_VALUE) {
    return redirectWithError(
      request,
      returnTo,
      "Confirm the read-only X permission before connecting.",
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const resumeUrl = new URL(returnTo, request.nextUrl.origin);
    resumeUrl.searchParams.set("sources", "x");
    const loginUrl = new URL("/login", request.nextUrl.origin);
    loginUrl.searchParams.set(
      "returnTo",
      `${resumeUrl.pathname}${resumeUrl.search}${resumeUrl.hash}`,
    );
    return NextResponse.redirect(loginUrl, 303);
  }

  const config = getXProfileConnectorConfig();
  const attempt = createXOAuthAttempt();
  const authorizationUrl = buildXAuthorizationUrl({ attempt, config });
  const response = NextResponse.redirect(authorizationUrl, 303);
  const cookieOptions = {
    httpOnly: true,
    maxAge: X_OAUTH_COOKIE_MAX_AGE_SECONDS,
    path: "/api/profile-sources/x",
    sameSite: "lax" as const,
    secure: request.nextUrl.protocol === "https:",
  };

  response.cookies.set(X_OAUTH_COOKIE_STATE, attempt.state, cookieOptions);
  response.cookies.set(X_OAUTH_COOKIE_VERIFIER, attempt.verifier, cookieOptions);
  response.cookies.set(X_OAUTH_COOKIE_RETURN_TO, returnTo, cookieOptions);
  response.cookies.set(X_OAUTH_COOKIE_PROFILE_ID, user.id, cookieOptions);
  response.cookies.set(X_OAUTH_COOKIE_CONSENT, X_PRIORITY_CONSENT_VALUE, cookieOptions);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
