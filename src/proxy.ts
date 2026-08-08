import type { NextRequest } from "next/server";
import { NextResponse, userAgent } from "next/server";

import { WALKTHROUGH_SEEN_COOKIE_NAME } from "@/lib/walkthrough-state";

export const WALKTHROUGH_SEEN_COOKIE = WALKTHROUGH_SEEN_COOKIE_NAME;

const WALKTHROUGH_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

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

function isHumanNavigation(request: NextRequest) {
  return request.method === "GET" && !isPrefetch(request) && !userAgent(request).isBot;
}

function markWalkthroughSeen(response: NextResponse, request: NextRequest) {
  response.cookies.set({
    name: WALKTHROUGH_SEEN_COOKIE,
    value: "1",
    httpOnly: true,
    maxAge: WALKTHROUGH_COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
  });
  response.headers.set("Cache-Control", "private, no-store");

  return response;
}

function rewriteToLiveHome(request: NextRequest) {
  const liveUrl = request.nextUrl.clone();
  liveUrl.pathname = "/moral-trade-live.html";

  return NextResponse.rewrite(liveUrl);
}

function rewriteToUnifiedCreate(request: NextRequest) {
  const createUrl = request.nextUrl.clone();
  createUrl.pathname = "/trades/new";

  return NextResponse.rewrite(createUrl);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const shouldRecordVisit =
    isHumanNavigation(request) && !request.cookies.has(WALKTHROUGH_SEEN_COOKIE);

  if (pathname === "/") {
    if (shouldRecordVisit) {
      const walkthroughUrl = request.nextUrl.clone();
      walkthroughUrl.pathname = "/walkthrough";

      return markWalkthroughSeen(NextResponse.redirect(walkthroughUrl), request);
    }

    return rewriteToLiveHome(request);
  }

  if (pathname === "/walkthrough") {
    const response = NextResponse.next();
    return shouldRecordVisit ? markWalkthroughSeen(response, request) : response;
  }

  if (pathname === "/create") {
    if (request.nextUrl.searchParams.get("mode") === "back") {
      return NextResponse.next();
    }

    return rewriteToUnifiedCreate(request);
  }

  if (pathname !== "/offers") {
    return NextResponse.next();
  }

  if (request.nextUrl.searchParams.size === 0) {
    return NextResponse.next();
  }

  if (
    request.nextUrl.searchParams.get("view") === "templates" ||
    request.nextUrl.searchParams.get("tab") === "templates"
  ) {
    return rewriteToUnifiedCreate(request);
  }

  if (request.nextUrl.searchParams.has("view")) {
    return NextResponse.next();
  }

  const liveDirectoryUrl = request.nextUrl.clone();
  liveDirectoryUrl.searchParams.set("view", "live");

  return NextResponse.redirect(liveDirectoryUrl);
}

export const config = {
  matcher: ["/", "/walkthrough", "/create", "/offers"],
};
