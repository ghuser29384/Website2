import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  X_OAUTH_COOKIE_CONSENT,
  X_OAUTH_COOKIE_PROFILE_ID,
  X_OAUTH_COOKIE_RETURN_TO,
  X_OAUTH_COOKIE_STATE,
  X_OAUTH_COOKIE_VERIFIER,
  XProfileConnectorError,
  exchangeXAuthorizationCode,
  fetchXAuthenticatedUser,
  getSafeXProfileConnectorReturnPath,
  getXProfileConnectorAvailability,
  getXProfileConnectorConfig,
  isMatchingXOAuthState,
  persistXProfileConnection,
  revokeXOAuthToken,
} from "@/lib/x-profile-connector";

export const dynamic = "force-dynamic";

const X_PRIORITY_CONSENT_VALUE = "priority-suggestions";

function clearOAuthCookies(response: NextResponse, request: NextRequest) {
  const cookieOptions = {
    httpOnly: true,
    maxAge: 0,
    path: "/api/profile-sources/x",
    sameSite: "lax" as const,
    secure: request.nextUrl.protocol === "https:",
  };

  response.cookies.set(X_OAUTH_COOKIE_STATE, "", cookieOptions);
  response.cookies.set(X_OAUTH_COOKIE_VERIFIER, "", cookieOptions);
  response.cookies.set(X_OAUTH_COOKIE_RETURN_TO, "", cookieOptions);
  response.cookies.set(X_OAUTH_COOKIE_PROFILE_ID, "", cookieOptions);
  response.cookies.set(X_OAUTH_COOKIE_CONSENT, "", cookieOptions);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function redirectWithBanner({
  message,
  request,
  returnTo,
  tone,
}: {
  message: string;
  request: NextRequest;
  returnTo: string;
  tone: "error" | "message";
}) {
  const url = new URL(returnTo, request.nextUrl.origin);
  url.searchParams.delete(tone === "error" ? "message" : "error");
  url.searchParams.set(tone, message);
  url.searchParams.set("sources", "x");
  return clearOAuthCookies(NextResponse.redirect(url), request);
}

export async function GET(request: NextRequest) {
  const returnTo = getSafeXProfileConnectorReturnPath(
    request.cookies.get(X_OAUTH_COOKIE_RETURN_TO)?.value,
    "/complete-profile",
  );
  const providerErrorCode = request.nextUrl.searchParams.get("error") ?? "";
  const providerErrorDescription = request.nextUrl.searchParams.get("error_description") ?? "";

  if (providerErrorCode || providerErrorDescription) {
    const cancelled = providerErrorCode.toLowerCase() === "access_denied";
    return redirectWithBanner({
      message: cancelled
        ? "X connection was cancelled. Your profile was not changed."
        : "X could not complete the authorization. Try again when you are ready.",
      request,
      returnTo,
      tone: cancelled ? "message" : "error",
    });
  }

  const expectedState = request.cookies.get(X_OAUTH_COOKIE_STATE)?.value ?? "";
  const receivedState = request.nextUrl.searchParams.get("state") ?? "";
  const codeVerifier = request.cookies.get(X_OAUTH_COOKIE_VERIFIER)?.value ?? "";
  const code = request.nextUrl.searchParams.get("code") ?? "";
  const consent = request.cookies.get(X_OAUTH_COOKIE_CONSENT)?.value ?? "";

  if (
    !code ||
    !codeVerifier ||
    consent !== X_PRIORITY_CONSENT_VALUE ||
    !isMatchingXOAuthState(expectedState, receivedState)
  ) {
    return redirectWithBanner({
      message: "The X authorization could not be verified. Start the connection again.",
      request,
      returnTo,
      tone: "error",
    });
  }

  const availability = getXProfileConnectorAvailability();
  if (!availability.enabled) {
    return redirectWithBanner({
      message: "X account connection is not enabled on this deployment.",
      request,
      returnTo,
      tone: "error",
    });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirectWithBanner({
      message: "Sign in again, then restart the X connection.",
      request,
      returnTo,
      tone: "error",
    });
  }

  const expectedProfileId = request.cookies.get(X_OAUTH_COOKIE_PROFILE_ID)?.value ?? "";
  if (!expectedProfileId || expectedProfileId !== user.id) {
    return redirectWithBanner({
      message: "The Moral Trade account changed during authorization. Start the X connection again.",
      request,
      returnTo,
      tone: "error",
    });
  }

  const config = getXProfileConnectorConfig();
  let issuedTokens: Awaited<ReturnType<typeof exchangeXAuthorizationCode>> | null = null;

  try {
    issuedTokens = await exchangeXAuthorizationCode({
      code,
      codeVerifier,
      config,
    });
    const identity = await fetchXAuthenticatedUser({ accessToken: issuedTokens.accessToken });
    await persistXProfileConnection({
      identity,
      profileId: user.id,
      supabase,
      tokens: issuedTokens,
    });

    revalidatePath("/complete-profile");
    revalidatePath("/dashboard");
    revalidatePath("/profile");

    return redirectWithBanner({
      message: `X connected as @${identity.username}. No X activity has been imported or applied to your sparks.`,
      request,
      returnTo,
      tone: "message",
    });
  } catch (error) {
    if (issuedTokens) {
      await Promise.allSettled([
        revokeXOAuthToken({ config, token: issuedTokens.refreshToken }),
        revokeXOAuthToken({ config, token: issuedTokens.accessToken }),
      ]);
    }

    console.error("X profile connection failed.", {
      code: error instanceof XProfileConnectorError ? error.code : "unexpected_error",
    });

    return redirectWithBanner({
      message:
        "Moral Trade could not save the X connection securely. No X activity was imported; try again later.",
      request,
      returnTo,
      tone: "error",
    });
  }
}
