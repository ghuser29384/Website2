import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname !== "/offers" || request.nextUrl.searchParams.has("view")) {
    return NextResponse.next();
  }

  const liveDirectoryUrl = request.nextUrl.clone();
  liveDirectoryUrl.searchParams.set("view", "live");

  return NextResponse.redirect(liveDirectoryUrl);
}

export const config = {
  matcher: ["/offers"],
};
