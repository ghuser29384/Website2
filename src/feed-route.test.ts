import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const nextConfig = readFileSync("next.config.ts", "utf8");
const siteNavigation = readFileSync("src/lib/site.ts", "utf8");

test("the personalized feed has a stable public route and primary navigation entry", () => {
  assert.match(nextConfig, /source: "\/feed"/);
  assert.match(nextConfig, /destination: "\/moral-trade-live\.html"/);
  assert.match(siteNavigation, /href: "\/feed", label: "Feed"/);
});

test("production canonicalizes the apex host so Supabase sessions do not split by host", () => {
  assert.match(nextConfig, /type: "host", value: "moraltrade\.org"/);
  assert.match(nextConfig, /destination: "https:\/\/www\.moraltrade\.org\/:path\*"/);
  assert.match(nextConfig, /permanent: true/);
});
