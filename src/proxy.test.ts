import assert from "node:assert/strict";
import test from "node:test";

import { NextRequest } from "next/server";

import { config, proxy, WALKTHROUGH_SEEN_COOKIE } from "@/proxy";

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

test("a first human homepage visit redirects to the mandatory walkthrough", () => {
  const response = proxy(makeRequest("/?utm_source=invite"));

  assert.equal(response.status, 307);
  assert.equal(
    response.headers.get("location"),
    "https://moraltrade.org/walkthrough?utm_source=invite",
  );
  assert.equal(response.cookies.get(WALKTHROUGH_SEEN_COOKIE)?.value, "1");
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});

test("a returning visitor receives the live personalized homepage", () => {
  const response = proxy(
    makeRequest("/?utm_source=invite", { cookie: `${WALKTHROUGH_SEEN_COOKIE}=1` }),
  );

  assert.equal(response.status, 200);
  assert.equal(
    response.headers.get("x-middleware-rewrite"),
    "https://moraltrade.org/moral-trade-live.html?utm_source=invite",
  );
  assert.equal(response.headers.get("location"), null);
  assert.equal(response.cookies.get(WALKTHROUGH_SEEN_COOKIE), undefined);
});

test("opening the walkthrough directly records the visit without redirecting", () => {
  const response = proxy(makeRequest("/walkthrough"));

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-middleware-next"), "1");
  assert.equal(response.cookies.get(WALKTHROUGH_SEEN_COOKIE)?.value, "1");
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});

test("bots and prefetches receive the live homepage without consuming the walkthrough", () => {
  const botResponse = proxy(
    makeRequest("/", { "user-agent": "Googlebot/2.1 (+http://www.google.com/bot.html)" }),
  );
  const prefetchResponse = proxy(
    makeRequest("/", { "next-router-prefetch": "1", purpose: "prefetch" }),
  );

  for (const response of [botResponse, prefetchResponse]) {
    assert.equal(response.status, 200);
    assert.equal(
      response.headers.get("x-middleware-rewrite"),
      "https://moraltrade.org/moral-trade-live.html",
    );
    assert.equal(response.headers.get("location"), null);
    assert.equal(response.cookies.get(WALKTHROUGH_SEEN_COOKIE), undefined);
  }
});

test("the default Create route is replaced by the unified Create interface", () => {
  const response = proxy(makeRequest("/create?source=topbar&resume=create"));

  assert.equal(response.status, 200);
  assert.equal(
    response.headers.get("x-middleware-rewrite"),
    "https://moraltrade.org/trades/new?source=topbar&resume=create",
  );
  assert.equal(response.headers.get("location"), null);
});

test("the reviewed career-backing lane remains available", () => {
  const response = proxy(makeRequest("/create?source=walkthrough&mode=back"));

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-middleware-next"), "1");
  assert.equal(response.headers.get("x-middleware-rewrite"), null);
});

test("a human queryless offers navigation transfers to Discover", () => {
  const response = proxy(makeRequest("/offers"));

  assert.equal(response.status, 307);
  assert.equal(
    response.headers.get("location"),
    "https://moraltrade.org/discover?domain=offers&view=list",
  );
});

test("a queryless offers prefetch stays on the source route", () => {
  const response = proxy(
    makeRequest("/offers", { "next-router-prefetch": "1", purpose: "prefetch" }),
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-middleware-next"), "1");
  assert.equal(response.headers.get("location"), null);
  assert.equal(response.headers.get("x-middleware-rewrite"), null);
});

test("query-driven offer searches continue to default to the live list", () => {
  const response = proxy(makeRequest("/offers?search=Climate"));

  assert.equal(response.status, 307);
  assert.equal(
    response.headers.get("location"),
    "https://moraltrade.org/offers?search=Climate&view=live",
  );
});

test("the Create Offer template page is replaced by the unified Create interface", () => {
  const response = proxy(makeRequest("/offers?view=templates&utm_source=legacy"));

  assert.equal(response.status, 200);
  assert.equal(
    response.headers.get("x-middleware-rewrite"),
    "https://moraltrade.org/trades/new?view=templates&utm_source=legacy",
  );
  assert.equal(response.headers.get("location"), null);
});

test("legacy template tabs are also replaced by the unified Create interface", () => {
  const response = proxy(makeRequest("/offers?tab=templates&utm_source=legacy"));

  assert.equal(response.status, 200);
  assert.equal(
    response.headers.get("x-middleware-rewrite"),
    "https://moraltrade.org/trades/new?tab=templates&utm_source=legacy",
  );
  assert.equal(response.headers.get("location"), null);
});

test("non-template explicit offer views pass through without redirecting", () => {
  const response = proxy(makeRequest("/offers?view=live"));

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-middleware-next"), "1");
  assert.equal(response.headers.get("location"), null);
});

test("invalid offer record identifiers fail closed before the dynamic route", () => {
  for (const path of [
    "/offers/null",
    "/offers/undefined?source=legacy",
    "/offers/not-a-uuid/credibility",
  ]) {
    const response = proxy(makeRequest(path));

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

test("valid offer record identifiers and static offer routes pass through", () => {
  for (const path of [
    "/offers/1c6b0e57-bfed-3f29-c51f-6f8c23d1960b",
    "/offers/1c6b0e57-bfed-3f29-c51f-6f8c23d1960b/credibility",
    "/offers/new",
    "/offers/examples",
  ]) {
    const response = proxy(makeRequest(path));

    assert.equal(response.status, 200, path);
    assert.equal(response.headers.get("x-middleware-next"), "1", path);
    assert.equal(response.headers.get("x-middleware-rewrite"), null, path);
  }
});

test("the proxy matcher covers nested offer record paths", () => {
  assert.ok(config.matcher.includes("/offers/:path*"));
});
