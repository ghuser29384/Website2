import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const bridge = readFileSync("public/moral-trade-live-account.js", "utf8");
const shell = readFileSync("public/moral-trade-live.html", "utf8");
const route = readFileSync("src/app/api/live-account/route.ts", "utf8");

const retiredPlaceholders = [
  /Alex Johnson/,
  /Good (?:morning|afternoon|evening), Alex\./,
  /\$250 · 6h · 12 trips/,
  /Frontier Bio Ethics Council/,
  /Moral Trade v1\.4/,
  /96% on time/,
];

test("the live shell bootstraps authenticated account data before rendering", () => {
  assert.match(shell, /fetch\('\/api\/live-account'/);
  assert.match(shell, /__MT_LIVE_ACCOUNT_BOOTSTRAP__/);
  assert.match(shell, /moral-trade-live-account\.js/);
  assert.match(shell, /source\.replace\('<\/head>'/);
  assert.match(shell, /moral-trade-live-verification\.js/);

  for (const placeholder of retiredPlaceholders) {
    assert.doesNotMatch(shell, placeholder);
    assert.doesNotMatch(bridge, placeholder);
    assert.doesNotMatch(route, placeholder);
  }
});

test("the live account endpoint reads real profile and agreement state", () => {
  assert.match(route, /hasSupabaseEnv\(\)/);
  assert.match(route, /hasSupabaseAuthCookie\(cookieStore\)/);
  assert.match(route, /getViewer\(\)/);
  assert.match(route, /from\("agreements"\)/);
  assert.match(route, /eq\("status", "completed"\)/);
  assert.match(route, /from\("profile_payment_accounts"\)/);
  assert.match(route, /from\("wish_profiles"\)/);
  assert.match(route, /Cache-Control[\s\S]*private, no-store/);
});

test("the bridge removes the escrow claim and uses truthful missing states", () => {
  assert.match(bridge, /findLabel: "Escrow account"/);
  assert.match(bridge, /label: "Payment account"/);
  assert.match(bridge, /No default resolver selected/);
  assert.match(bridge, /Not configured/);
  assert.match(bridge, /Sign in to view account details/);
});
