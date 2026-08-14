import assert from "node:assert/strict";
import test from "node:test";

import { NextRequest, NextResponse } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

test("a refreshed auth cookie survives a compatibility redirect", async () => {
  const request = new NextRequest("https://moraltrade.org/offers");
  const response = await updateSession(request, {
    environment: {
      publishableKey: "test-publishable-key",
      url: "https://project.supabase.co",
    },
    createSessionClient(_url, _key, options) {
      return {
        auth: {
          async getClaims() {
            options.cookies.setAll([
              {
                name: "sb-test-auth-token",
                value: "refreshed",
                options: { httpOnly: true, path: "/", sameSite: "lax" },
              },
            ]);
            return { data: { claims: { sub: "test-user" } }, error: null };
          },
        },
      };
    },
    responseFactory(currentRequest) {
      const destination = currentRequest.nextUrl.clone();
      destination.pathname = "/discover";
      return NextResponse.redirect(destination);
    },
  });

  assert.equal(response.headers.get("location"), "https://moraltrade.org/discover");
  assert.equal(response.cookies.get("sb-test-auth-token")?.value, "refreshed");
});

test("session refresh timeout preserves the selected response", async () => {
  const request = new NextRequest("https://moraltrade.org/create");
  const response = await updateSession(request, {
    environment: {
      publishableKey: "test-publishable-key",
      url: "https://project.supabase.co",
    },
    createSessionClient() {
      return {
        auth: {
          getClaims() {
            return new Promise(() => undefined);
          },
        },
      };
    },
    refreshTimeoutMs: 1,
    responseFactory(currentRequest) {
      const destination = currentRequest.nextUrl.clone();
      destination.pathname = "/trades/new";
      return NextResponse.rewrite(destination);
    },
  });

  assert.equal(
    response.headers.get("x-middleware-rewrite"),
    "https://moraltrade.org/trades/new",
  );
});
