import type { NextRequest } from "next/server";
import { NextResponse, userAgent } from "next/server";

export const WALKTHROUGH_SEEN_COOKIE = "mt_walkthrough_seen";

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

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const shouldRecordVisit =
    isHumanNavigation(request) && !request.cookies.has(WALKTHROUGH_SEEN_COOKIE);

  if (pathname === "/") {
    if (shouldRecordVisit) {
      const walkthroughUrl = request.nextUrl.clone();
      walkthroughUrl.pathname = "/walkthrough";
      walkthroughUrl.searchParams.set("first_visit", "1");

      return markWalkthroughSeen(NextResponse.redirect(walkthroughUrl), request);
    }

    const liveUrl = request.nextUrl.clone();
    liveUrl.pathname = "/moral-trade-live.html";

    return NextResponse.rewrite(liveUrl);
  }

  if (pathname === "/walkthrough") {
    const response = NextResponse.next();
    return shouldRecordVisit ? markWalkthroughSeen(response, request) : response;
  }

  if (request.nextUrl.pathname !== "/offers" || request.nextUrl.searchParams.has("view")) {
    return NextResponse.next();
  }

  const liveDirectoryUrl = request.nextUrl.clone();
  liveDirectoryUrl.searchParams.set("view", "live");

  return NextResponse.redirect(liveDirectoryUrl);
}

export const config = {
  matcher: ["/", "/walkthrough", "/offers"],
};
