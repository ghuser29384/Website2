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
    "https://moraltrade.org/walkthrough?utm_source=invite",
  );
  assert.equal(response.cookies.get(WALKTHROUGH_SEEN_COOKIE)?.value, "1");
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});

test("a returning visitor receives the normal homepage", () => {
  const response = proxy(
    makeRequest("/", { cookie: `${WALKTHROUGH_SEEN_COOKIE}=1` }),
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-middleware-next"), "1");
  assert.equal(response.headers.get("location"), null);
});

test("opening the walkthrough directly records the visit without redirecting", () => {
  const response = proxy(makeRequest("/walkthrough"));

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-middleware-next"), "1");
  assert.equal(response.cookies.get(WALKTHROUGH_SEEN_COOKIE)?.value, "1");
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});

test("bots and prefetches do not consume the first-visit walkthrough", () => {
  const botResponse = proxy(
    makeRequest("/", { "user-agent": "Googlebot/2.1 (+http://www.google.com/bot.html)" }),
  );
  const prefetchResponse = proxy(
    makeRequest("/", { "next-router-prefetch": "1", purpose: "prefetch" }),
  );

  for (const response of [botResponse, prefetchResponse]) {
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-middleware-next"), "1");
    assert.equal(response.cookies.get(WALKTHROUGH_SEEN_COOKIE), undefined);
  }
});

test("the offers directory still defaults to its live view", () => {
  const response = proxy(makeRequest("/offers"));

  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "https://moraltrade.org/offers?view=live");
});
