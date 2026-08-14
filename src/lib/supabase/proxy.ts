import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  ANALYTICS_OPT_OUT_COOKIE_NAME,
  ATTRIBUTION_COOKIE_NAME,
  ATTRIBUTION_MAX_AGE_SECONDS,
  createAnonymousId,
  encodeAttribution,
  isAnalyticsOptedOut,
  parseAttributionCookie,
} from "@/lib/growth";
import {
  getSupabaseEnv,
  hasSupabaseEnv,
  isEvidencePaymentQaPreviewHost,
} from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";

const SESSION_REFRESH_TIMEOUT_MS = 1_500;
const UTM_PARAM_NAMES = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "ref",
  "referral",
  "partner",
] as const;

function hasAttributionParams(request: NextRequest) {
  return UTM_PARAM_NAMES.some((param) => request.nextUrl.searchParams.has(param));
}

function getPartnerSlugFromPath(request: NextRequest) {
  const match = request.nextUrl.pathname.match(/^\/cohort\/([^/?#]+)/);

  return match?.[1] ?? null;
}

function attachAttributionCookie(request: NextRequest, response: NextResponse) {
  if (isAnalyticsOptedOut(request.cookies.get(ANALYTICS_OPT_OUT_COOKIE_NAME)?.value)) {
    response.cookies.set(ATTRIBUTION_COOKIE_NAME, "", {
      maxAge: 0,
      path: "/",
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
    });

    return response;
  }

  const existing = parseAttributionCookie(request.cookies.get(ATTRIBUTION_COOKIE_NAME)?.value);
  const currentPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  const shouldRefresh = hasAttributionParams(request) || !existing;

  if (!shouldRefresh) {
    return response;
  }

  const payload = {
    anonymousId: existing?.anonymousId ?? createAnonymousId(),
    firstPath: existing?.firstPath || currentPath,
    lastPath: currentPath,
    referrer: request.headers.get("referer") ?? existing?.referrer ?? "",
    utmSource:
      request.nextUrl.searchParams.get("utm_source") ?? existing?.utmSource ?? "",
    utmMedium:
      request.nextUrl.searchParams.get("utm_medium") ?? existing?.utmMedium ?? "",
    utmCampaign:
      request.nextUrl.searchParams.get("utm_campaign") ?? existing?.utmCampaign ?? "",
    utmContent:
      request.nextUrl.searchParams.get("utm_content") ?? existing?.utmContent ?? "",
    utmTerm: request.nextUrl.searchParams.get("utm_term") ?? existing?.utmTerm ?? "",
    referralCode:
      request.nextUrl.searchParams.get("ref") ??
      request.nextUrl.searchParams.get("referral") ??
      existing?.referralCode ??
      "",
    partnerSlug:
      request.nextUrl.searchParams.get("partner") ??
      getPartnerSlugFromPath(request) ??
      existing?.partnerSlug ??
      "",
    firstSeenAt: existing?.firstSeenAt ?? new Date().toISOString(),
  };

  response.cookies.set(ATTRIBUTION_COOKIE_NAME, encodeAttribution(payload), {
    httpOnly: false,
    maxAge: ATTRIBUTION_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
  });

  return response;
}

function attachDataPlaneHeaders(response: NextResponse, hostname: string) {
  if (isEvidencePaymentQaPreviewHost(hostname)) {
    response.headers.set("x-moral-trade-data-plane", "isolated-qa");
    if (process.env.VERCEL_GIT_COMMIT_SHA) {
      response.headers.set(
        "x-moral-trade-release-sha",
        process.env.VERCEL_GIT_COMMIT_SHA,
      );
    }
  }

  return response;
}

type SessionCookie = {
  name: string;
  value: string;
  options?: Parameters<NextResponse["cookies"]["set"]>[2];
};

type SessionClientFactory = (
  url: string,
  publishableKey: string,
  options: {
    cookies: {
      getAll: () => ReturnType<NextRequest["cookies"]["getAll"]>;
      setAll: (cookies: SessionCookie[]) => void;
    };
  },
) => { auth: { getClaims: () => Promise<unknown> } };

interface UpdateSessionOptions {
  createSessionClient?: SessionClientFactory;
  environment?: { publishableKey: string; url: string } | null;
  refreshTimeoutMs?: number;
  responseFactory?: (request: NextRequest) => NextResponse;
}

export async function updateSession(
  request: NextRequest,
  options: UpdateSessionOptions = {},
) {
  const responseFactory =
    options.responseFactory ?? ((currentRequest) => NextResponse.next({ request: currentRequest }));
  let response = responseFactory(request);
  const requestHostname = request.headers.get("host") ?? request.nextUrl.hostname;
  const environment =
    options.environment === undefined
      ? hasSupabaseEnv(requestHostname)
        ? getSupabaseEnv(requestHostname)
        : null
      : options.environment;

  if (!environment) {
    return attachDataPlaneHeaders(
      attachAttributionCookie(request, response),
      requestHostname,
    );
  }

  const { url, publishableKey } = environment;
  const createSessionClient =
    options.createSessionClient ??
    (createServerClient<Database> as unknown as SessionClientFactory);
  const supabase = createSessionClient(
    url,
    publishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = responseFactory(request);

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  try {
    await Promise.race([
      supabase.auth.getClaims(),
      new Promise((resolve) => {
        setTimeout(resolve, options.refreshTimeoutMs ?? SESSION_REFRESH_TIMEOUT_MS);
      }),
    ]);
  } catch (error) {
    console.warn("[supabase] Proxy session refresh failed; downstream auth remains authoritative.", {
      message: error instanceof Error ? error.message : "Unknown session refresh error",
    });
  }

  return attachDataPlaneHeaders(
    attachAttributionCookie(request, response),
    requestHostname,
  );
}
