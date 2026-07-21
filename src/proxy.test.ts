import assert from "node:assert/strict";
import test from "node:test";

import { NextRequest } from "next/server";

import { proxy, WALKTHROUGH_SEEN_COOKIE } from "@/proxy";

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

test("a first human homepage visit redirects once to the walkthrough", () => {
  const response = proxy(makeRequest("/?utm_source=invite"));

  assert.equal(response.status, 307);
  assert.equal(
    response.headers.get("location"),
    "https://moraltrade.org/walkthrough?utm_source=invite&first_visit=1",
  );
  assert.equal(response.cookies.get(WALKTHROUGH_SEEN_COOKIE)?.value, "1");
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});

test("a returning visitor receives the exact live homepage", () => {
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

test("the legacy queryless offers entry opens Discover", () => {
  const response = proxy(makeRequest("/offers"));

  assert.equal(response.status, 307);
  assert.equal(
    response.headers.get("location"),
    "https://moraltrade.org/discover?domain=offers&view=list",
  );
});

test("query-driven offer searches continue to default to the live list", () => {
  const response = proxy(makeRequest("/offers?search=Climate"));

  assert.equal(response.status, 307);
  assert.equal(
    response.headers.get("location"),
    "https://moraltrade.org/offers?search=Climate&view=live",
  );
});

test("explicit offer views pass through without redirecting", () => {
  const response = proxy(makeRequest("/offers?view=templates"));

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-middleware-next"), "1");
  assert.equal(response.headers.get("location"), null);
});

test("legacy template tabs canonicalize to the real template library", () => {
  const response = proxy(makeRequest("/offers?tab=templates&utm_source=legacy"));

  assert.equal(response.status, 307);
  assert.equal(
    response.headers.get("location"),
    "https://moraltrade.org/offers?utm_source=legacy&view=templates",
  );
});
