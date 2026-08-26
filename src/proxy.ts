import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  ACCOUNT_ACTIVATION_UNAVAILABLE_PATH,
  isAccountActivationStage,
  type AccountActivationState,
} from "@/lib/account-activation";
import { getPrivateNoStoreHeaders } from "@/lib/background-privacy-controls";
import { getSupabaseEnv, hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";
import { updateSession } from "@/lib/supabase/proxy";
import { isPostgresUuid } from "@/lib/uuid";

const STATIC_OFFER_SEGMENTS = new Set(["examples", "new", "plane"]);
const ACTIVATION_GUARDED_EXACT_PATHS = new Set([
  "/feed",
  "/dashboard",
  "/create",
  "/trades/new",
  "/offers",
  "/agreements",
  "/saved-offers",
  "/admin",
  "/mpgf/account",
  "/mpgf/admin",
]);
const ACTIVATION_GUARDED_PREFIXES = [
  "/dashboard/",
  "/trades/new/",
  "/offers/",
  "/agreements/",
  "/saved-offers/",
  "/admin/",
  "/mpgf/account/",
  "/mpgf/admin/",
];
const ACTIVATION_RESOLUTION_TIMEOUT_MS = 2_500;

function isPrefetch(request: NextRequest) {
  const purpose = [
    request.headers.get("purpose"),
    request.headers.get("sec-purpose"),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return request.headers.has("next-router-prefetch") || purpose.includes("prefetch");
}

function rewriteToUnifiedCreate(request: NextRequest) {
  const createUrl = request.nextUrl.clone();
  createUrl.pathname = "/trades/new";

  return NextResponse.rewrite(createUrl);
}

function getOfferRecordSegment(pathname: string) {
  if (!pathname.startsWith("/offers/")) {
    return null;
  }

  const [segment = ""] = pathname.slice("/offers/".length).split("/");

  if (!segment || STATIC_OFFER_SEGMENTS.has(segment)) {
    return null;
  }

  return segment;
}

function isInvalidOfferRecordPath(pathname: string) {
  const offerRecordSegment = getOfferRecordSegment(pathname);
  return offerRecordSegment !== null && !isPostgresUuid(offerRecordSegment);
}

function rewriteToInvalidOfferRecord(request: NextRequest) {
  const invalidOfferUrl = request.nextUrl.clone();
  invalidOfferUrl.pathname = "/invalid-offer-record";
  invalidOfferUrl.search = "";

  return NextResponse.rewrite(invalidOfferUrl, {
    status: 404,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

export function isActivationGuardedPath(pathname: string) {
  return (
    ACTIVATION_GUARDED_EXACT_PATHS.has(pathname) ||
    ACTIVATION_GUARDED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

export function getActivationGuardDestination(
  pathname: string,
  state: AccountActivationState,
) {
  if (!isActivationGuardedPath(pathname) || state.kind === "signed_out") {
    return null;
  }

  if (state.kind === "unavailable") {
    return ACCOUNT_ACTIVATION_UNAVAILABLE_PATH;
  }

  if (state.stage === "walkthrough_required") {
    return "/walkthrough";
  }

  if (state.stage === "sparks_required") {
    return "/complete-profile";
  }

  return null;
}

function hasSupabaseSessionCookie(request: NextRequest) {
  return request.cookies
    .getAll()
    .some(({ name }) => /^sb-[a-z0-9]+-auth-token(?:\.\d+)?$/i.test(name));
}

async function resolveActivationState(request: NextRequest): Promise<AccountActivationState> {
  if (!hasSupabaseSessionCookie(request)) {
    return { kind: "signed_out" };
  }

  const hostname = request.headers.get("host") ?? request.nextUrl.hostname;
  if (!hasSupabaseEnv(hostname)) {
    return { kind: "unavailable" };
  }

  const resolveFromDatabase = async (): Promise<AccountActivationState> => {
    try {
      const { url, publishableKey } = getSupabaseEnv(hostname);
      const supabase = createServerClient<Database>(url, publishableKey, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {
            // updateSession has already propagated refreshed cookies.
          },
        },
      });
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return { kind: "unavailable" };
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("activation_stage")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError || !profile || !isAccountActivationStage(profile.activation_stage)) {
        return { kind: "unavailable" };
      }

      return { kind: "available", stage: profile.activation_stage };
    } catch {
      return { kind: "unavailable" };
    }
  };

  return Promise.race([
    resolveFromDatabase(),
    new Promise<AccountActivationState>((resolve) => {
      setTimeout(
        () => resolve({ kind: "unavailable" }),
        ACTIVATION_RESOLUTION_TIMEOUT_MS,
      );
    }),
  ]);
}

function copySessionAndSafeHeaders(source: NextResponse, target: NextResponse) {
  for (const cookie of source.cookies.getAll()) {
    target.cookies.set(cookie);
  }

  for (const [name, value] of source.headers.entries()) {
    const normalized = name.toLowerCase();
    if (
      normalized === "location" ||
      normalized === "set-cookie" ||
      normalized === "content-length" ||
      normalized === "content-type" ||
      normalized.startsWith("x-middleware-")
    ) {
      continue;
    }
    target.headers.set(name, value);
  }

  return target;
}

function createActivationRedirect(
  request: NextRequest,
  response: NextResponse,
  destination: string,
) {
  const destinationUrl = request.nextUrl.clone();
  destinationUrl.pathname = destination;
  destinationUrl.search = "";
  const redirectResponse = copySessionAndSafeHeaders(
    response,
    NextResponse.redirect(destinationUrl),
  );
  redirectResponse.headers.set("Cache-Control", "private, no-store, max-age=0");
  redirectResponse.headers.set("X-Robots-Tag", "noindex, nofollow");
  return redirectResponse;
}

export function createCompatibilityResponse(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/create") {
    if (request.nextUrl.searchParams.get("mode") === "back") {
      return NextResponse.next({ request });
    }

    return rewriteToUnifiedCreate(request);
  }

  if (isInvalidOfferRecordPath(pathname)) {
    return rewriteToInvalidOfferRecord(request);
  }

  if (pathname !== "/offers") {
    return NextResponse.next({ request });
  }

  if (request.nextUrl.searchParams.size === 0) {
    if (isPrefetch(request)) {
      return NextResponse.next({ request });
    }

    const discoverUrl = request.nextUrl.clone();
    discoverUrl.pathname = "/discover";
    discoverUrl.searchParams.set("domain", "offers");
    discoverUrl.searchParams.set("view", "list");

    return NextResponse.redirect(discoverUrl);
  }

  if (
    request.nextUrl.searchParams.get("view") === "templates" ||
    request.nextUrl.searchParams.get("tab") === "templates"
  ) {
    return rewriteToUnifiedCreate(request);
  }

  if (request.nextUrl.searchParams.has("view")) {
    return NextResponse.next({ request });
  }

  const liveDirectoryUrl = request.nextUrl.clone();
  liveDirectoryUrl.searchParams.set("view", "live");

  return NextResponse.redirect(liveDirectoryUrl);
}

export async function proxy(request: NextRequest) {
  let response = await updateSession(request, {
    responseFactory: createCompatibilityResponse,
  });

  if (response.status < 400 && isActivationGuardedPath(request.nextUrl.pathname)) {
    const state = await resolveActivationState(request);
    const destination = getActivationGuardDestination(request.nextUrl.pathname, state);
    if (destination) {
      response = createActivationRedirect(request, response, destination);
    }
  }

  const privateHeaders = getPrivateNoStoreHeaders(request.nextUrl.pathname);
  if (privateHeaders) {
    for (const [name, value] of Object.entries(privateHeaders)) {
      response.headers.set(name, value);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
