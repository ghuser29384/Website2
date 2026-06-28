import { getSafeInternalPath } from "@/lib/paths";

export type AuthMode = "login" | "signup";
export type AuthMethod = "providers" | "email";
export type OAuthProvider = "google" | "apple";

export function normalizeAuthMode(
  value: string | null | undefined,
  fallback: AuthMode = "login",
): AuthMode {
  return value === "signup" || value === "create" ? "signup" : fallback;
}

export function normalizeAuthMethod(
  value: string | null | undefined,
): AuthMethod {
  return value === "email" ? "email" : "providers";
}

export function normalizeOAuthProvider(
  value: string | null | undefined,
): OAuthProvider | null {
  return value === "google" || value === "apple" ? value : null;
}

export function getAuthDefaultReturnTo(mode: AuthMode) {
  return mode === "signup" ? "/onboarding" : "/dashboard";
}

export function readSearchParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

export function getAuthReturnTo(
  searchParams: Record<string, string | string[] | undefined>,
  mode: AuthMode,
) {
  return getSafeInternalPath(
    readSearchParam(searchParams, "returnTo") ?? readSearchParam(searchParams, "next"),
    getAuthDefaultReturnTo(mode),
  );
}

export function buildAuthPath({
  method,
  mode,
  returnTo,
  route = "/login",
}: {
  method?: AuthMethod;
  mode: AuthMode;
  returnTo: string;
  route?: "/login" | "/signup";
}) {
  const target = new URL(route, "https://www.moraltrade.org");

  if (route === "/login" || mode === "signup") {
    target.searchParams.set("mode", mode);
  }

  if (method) {
    target.searchParams.set("method", method);
  }

  const fallback = getAuthDefaultReturnTo(mode);
  const safeReturnTo = getSafeInternalPath(returnTo, fallback);
  if (safeReturnTo !== fallback) {
    target.searchParams.set("returnTo", safeReturnTo);
  }

  return `${target.pathname}${target.search}`;
}

export function buildSupabaseAuthCallbackUrl(
  origin: string,
  returnTo: string,
  mode?: AuthMode,
) {
  const callbackUrl = new URL("/auth/confirm", origin);
  callbackUrl.searchParams.set("next", getSafeInternalPath(returnTo, "/dashboard"));
  if (mode) {
    callbackUrl.searchParams.set("mode", mode);
  }
  return callbackUrl.toString();
}
