import assert from "node:assert/strict";
import test from "node:test";

import { NextRequest } from "next/server";

import { config, proxy } from "@/proxy";

const desktopUserAgent =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36";

function makeRequest(path: string, headers: Record<string, string> = {}) {
  return new NextRequest(`https://moraltrade.org${path}`, {
    headers: {
      "user-agent": desktopUserAgent,
      ...headers,
    },
  });
}

test("activation and unavailable routes reach App Router handlers without cookie authority", async () => {
  for (const path of [
    "/?utm_source=invite",
    "/walkthrough",
    "/account-state-unavailable",
  ]) {
    const response = await proxy(makeRequest(path, { cookie: "mt_walkthrough_seen=1" }));

    assert.equal(response.status, 200, path);
    assert.equal(response.headers.get("x-middleware-next"), "1", path);
    assert.equal(response.headers.get("x-middleware-rewrite"), null, path);
    assert.equal(response.headers.get("location"), null, path);
    assert.equal(response.cookies.get("mt_walkthrough_seen"), undefined, path);
    assert.equal(response.headers.get("cache-control"), "private, no-store, max-age=0", path);
  }
});

test("the default Create route is replaced by the unified Create interface", async () => {
  const response = await proxy(makeRequest("/create?source=topbar&resume=create"));

  assert.equal(response.status, 200);
  assert.equal(
    response.headers.get("x-middleware-rewrite"),
    "https://moraltrade.org/trades/new?source=topbar&resume=create",
  );
  assert.equal(response.headers.get("location"), null);
});

test("the reviewed career-backing lane remains available", async () => {
  const response = await proxy(makeRequest("/create?source=walkthrough&mode=back"));

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-middleware-next"), "1");
  assert.equal(response.headers.get("x-middleware-rewrite"), null);
});

test("a human queryless offers navigation transfers to Discover", async () => {
  const response = await proxy(makeRequest("/offers"));

  assert.equal(response.status, 307);
  assert.equal(
    response.headers.get("location"),
    "https://moraltrade.org/discover?domain=offers&view=list",
  );
});

test("a queryless offers prefetch stays on the source route", async () => {
  const response = await proxy(
    makeRequest("/offers", { "next-router-prefetch": "1", purpose: "prefetch" }),
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-middleware-next"), "1");
  assert.equal(response.headers.get("location"), null);
  assert.equal(response.headers.get("x-middleware-rewrite"), null);
});

test("query-driven offer searches continue to default to the live list", async () => {
  const response = await proxy(makeRequest("/offers?search=Climate"));

  assert.equal(response.status, 307);
  assert.equal(
    response.headers.get("location"),
    "https://moraltrade.org/offers?search=Climate&view=live",
  );
});

test("the Create Offer template page is replaced by the unified Create interface", async () => {
  const response = await proxy(makeRequest("/offers?view=templates&utm_source=legacy"));

  assert.equal(response.status, 200);
  assert.equal(
    response.headers.get("x-middleware-rewrite"),
    "https://moraltrade.org/trades/new?view=templates&utm_source=legacy",
  );
  assert.equal(response.headers.get("location"), null);
});

test("legacy template tabs are also replaced by the unified Create interface", async () => {
  const response = await proxy(makeRequest("/offers?tab=templates&utm_source=legacy"));

  assert.equal(response.status, 200);
  assert.equal(
    response.headers.get("x-middleware-rewrite"),
    "https://moraltrade.org/trades/new?tab=templates&utm_source=legacy",
  );
  assert.equal(response.headers.get("location"), null);
});

test("non-template explicit offer views pass through without redirecting", async () => {
  const response = await proxy(makeRequest("/offers?view=live"));

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-middleware-next"), "1");
  assert.equal(response.headers.get("location"), null);
});

test("invalid offer record identifiers fail closed before the dynamic route", async () => {
  for (const path of [
    "/offers/null",
    "/offers/undefined?source=legacy",
    "/offers/not-a-uuid/credibility",
  ]) {
    const response = await proxy(makeRequest(path));

    assert.equal(response.status, 404, path);
    assert.equal(
      response.headers.get("x-middleware-rewrite"),
      "https://moraltrade.org/invalid-offer-record",
      path,
    );
    assert.equal(response.headers.get("cache-control"), "private, no-store", path);
    assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow", path);
  }
});

test("valid offer record identifiers and static offer routes pass through", async () => {
  for (const path of [
    "/offers/1c6b0e57-bfed-3f29-c51f-6f8c23d1960b",
    "/offers/1c6b0e57-bfed-3f29-c51f-6f8c23d1960b/credibility",
    "/offers/new",
    "/offers/examples",
    "/offers/plane",
  ]) {
    const response = await proxy(makeRequest(path));

    assert.equal(response.status, 200, path);
    assert.equal(response.headers.get("x-middleware-next"), "1", path);
    assert.equal(response.headers.get("x-middleware-rewrite"), null, path);
  }
});

test("the one proxy matcher covers session refresh and nested route compatibility", () => {
  assert.deepEqual(config.matcher, [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ]);
});
