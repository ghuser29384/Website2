import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getPrivateNoStoreHeaders } from "@/lib/background-privacy-controls";
import { updateSession } from "@/lib/supabase/proxy";
import { isPostgresUuid } from "@/lib/uuid";

const STATIC_OFFER_SEGMENTS = new Set(["examples", "new", "plane"]);

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
  const response = await updateSession(request, {
    responseFactory: createCompatibilityResponse,
  });
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
