import { getSafeInternalPath } from "@/lib/paths";

export type AuthMode = "login" | "signup";
export type AuthMethod = "providers" | "email";
export type OAuthProvider =
  | "google"
  | "apple"
  | "facebook"
  | "github"
  | "discord"
  | "x"
  | "twitter"
  | "linkedin"
  | "linkedin_oidc"
  | "azure"
  | "gitlab"
  | "bitbucket"
  | "figma"
  | "kakao"
  | "keycloak"
  | "notion"
  | "slack"
  | "slack_oidc"
  | "spotify"
  | "twitch"
  | "workos"
  | "zoom"
  | "fly";

export const OAUTH_PROVIDERS: OAuthProvider[] = [
  "google",
  "apple",
  "facebook",
  "github",
  "discord",
  "x",
  "twitter",
  "linkedin_oidc",
  "linkedin",
  "azure",
  "gitlab",
  "bitbucket",
  "figma",
  "kakao",
  "keycloak",
  "notion",
  "slack_oidc",
  "slack",
  "spotify",
  "twitch",
  "workos",
  "zoom",
  "fly",
];

const oauthProviderLabels: Record<OAuthProvider, string> = {
  apple: "Apple",
  azure: "Microsoft",
  bitbucket: "Bitbucket",
  discord: "Discord",
  facebook: "Facebook",
  figma: "Figma",
  fly: "Fly.io",
  github: "GitHub",
  gitlab: "GitLab",
  google: "Google",
  kakao: "Kakao",
  keycloak: "Keycloak",
  linkedin: "LinkedIn",
  linkedin_oidc: "LinkedIn OIDC",
  notion: "Notion",
  slack: "Slack",
  slack_oidc: "Slack OIDC",
  spotify: "Spotify",
  twitch: "Twitch",
  twitter: "Twitter",
  workos: "WorkOS",
  x: "X",
  zoom: "Zoom",
};

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
  return OAUTH_PROVIDERS.find((provider) => provider === value) ?? null;
}

export function getOAuthProviderLabel(provider: OAuthProvider) {
  return oauthProviderLabels[provider];
}

export function getEnabledOAuthProvidersFromSettings(
  external: Partial<Record<OAuthProvider, boolean>> | null | undefined,
) {
  return OAUTH_PROVIDERS.filter((provider) => external?.[provider] === true);
}

export function getAuthDefaultReturnTo(mode: AuthMode) {
  return mode === "signup" ? "/walkthrough" : "/feed";
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
  const fallback = getAuthDefaultReturnTo(mode ?? "login");
  callbackUrl.searchParams.set("next", getSafeInternalPath(returnTo, fallback));
  if (mode) {
    callbackUrl.searchParams.set("mode", mode);
  }
  return callbackUrl.toString();
}
