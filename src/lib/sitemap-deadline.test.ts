import assert from "node:assert/strict";
import { setImmediate } from "node:timers/promises";
import test from "node:test";

import sitemap from "@/app/sitemap";

test("sitemap retains public records when optional reads succeed", async (context) => {
  const requests: string[] = [];
  context.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    const url = String(input);
    requests.push(url);
    const id = url.includes("/offers?") ? "public-offer" : "public-person";
    return new Response(JSON.stringify([{ id, created_at: "2026-01-01T00:00:00Z" }]), {
      headers: { "Content-Type": "application/json" },
    });
  });
  const urls = (await sitemap()).map(entry => entry.url);
  assert.equal(requests.length, 2);
  assert.ok(urls.includes("https://www.moraltrade.org/offers/public-offer"));
  assert.ok(urls.includes("https://www.moraltrade.org/people/public-person"));
});

test("stalled sitemap reads return the existing static fallback at the public deadline", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  let requests = 0;
  context.mock.method(globalThis, "fetch", () => {
    requests += 1;
    return new Promise<Response>(() => {});
  });
  const pending = sitemap();
  await setImmediate();
  assert.equal(requests, 2);
  context.mock.timers.tick(4_000);
  const urls = (await pending).map(entry => entry.url);
  assert.ok(urls.includes("https://www.moraltrade.org/"));
  assert.ok(urls.includes("https://www.moraltrade.org/discover"));
  assert.ok(urls.every(url => !url.includes("/people/") && !/\/offers\/(?!examples\/|new$)/.test(url)));
});
