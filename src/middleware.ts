import { NextResponse, type NextRequest } from "next/server";

import { getPrivateNoStoreHeaders } from "@/lib/background-privacy-controls";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const headers = getPrivateNoStoreHeaders(request.nextUrl.pathname);

  if (!headers) {
    return response;
  }

  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/api/profile/:path*", "/api/jobs/:path*"],
};
