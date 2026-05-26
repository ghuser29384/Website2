import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  ATTRIBUTION_COOKIE_NAME,
  ATTRIBUTION_MAX_AGE_SECONDS,
  createAnonymousId,
  encodeAttribution,
  parseAttributionCookie,
} from "@/lib/growth";
import { hasSupabaseEnv } from "@/lib/supabase/config";
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

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  if (!hasSupabaseEnv()) {
    return attachAttributionCookie(request, response);
  }

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  await Promise.race([
    supabase.auth.getClaims(),
    new Promise((resolve) => {
      setTimeout(resolve, SESSION_REFRESH_TIMEOUT_MS);
    }),
  ]);

  return attachAttributionCookie(request, response);
}
