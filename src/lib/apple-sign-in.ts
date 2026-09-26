import type { AuthMode } from "@/lib/auth-routes";
import { getSafeInternalPath } from "@/lib/paths";

export const APPLE_SIGN_IN_SCRIPT_URL =
  "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";
export const DEFAULT_APPLE_SERVICES_ID = "org.moraltrade.web";

export type AppleSignInName = {
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
};

export type AppleSignInResponse = {
  authorization?: {
    id_token?: string | null;
    state?: string | null;
  } | null;
  id_token?: string | null;
  state?: string | null;
  error?: string | null;
  user?: {
    email?: string | null;
    name?: AppleSignInName | null;
  } | null;
};

function normalizeNamePart(value: string | null | undefined) {
  const normalized = value?.trim().replace(/\s+/g, " ") ?? "";
  return normalized.slice(0, 100);
}

export function getAppleIdentityToken(response: AppleSignInResponse) {
  return response.authorization?.id_token?.trim() || response.id_token?.trim() || null;
}

export function getAppleAuthorizationState(response: AppleSignInResponse) {
  return response.authorization?.state?.trim() || response.state?.trim() || null;
}

export function getAppleUserMetadata(response: AppleSignInResponse) {
  const givenName = normalizeNamePart(response.user?.name?.firstName);
  const middleName = normalizeNamePart(response.user?.name?.middleName);
  const familyName = normalizeNamePart(response.user?.name?.lastName);
  const fullName = [givenName, middleName, familyName].filter(Boolean).join(" ");

  if (!fullName) {
    return null;
  }

  return {
    full_name: fullName,
    ...(givenName ? { given_name: givenName } : {}),
    ...(familyName ? { family_name: familyName } : {}),
  };
}

export function buildAppleCompletionPath(mode: AuthMode, returnTo: string) {
  const searchParams = new URLSearchParams({
    mode,
    next: getSafeInternalPath(returnTo, mode === "signup" ? "/onboarding" : "/dashboard"),
    provider: "apple-js",
  });

  return `/auth/confirm?${searchParams.toString()}`;
}

export function getAppleSignInErrorMessage(error: unknown) {
  const errorCode =
    typeof error === "object" && error !== null && "error" in error
      ? String((error as { error?: unknown }).error ?? "")
      : "";
  const message = error instanceof Error ? error.message : String(error ?? "");
  const combined = `${errorCode} ${message}`.toLowerCase();

  if (
    combined.includes("popup_closed_by_user") ||
    combined.includes("user_cancelled_authorize") ||
    combined.includes("access_denied") ||
    combined.includes("cancel")
  ) {
    return "Sign-in was cancelled. Try again when you are ready.";
  }

  return "We could not complete Apple sign-in. Try again or use email.";
}
