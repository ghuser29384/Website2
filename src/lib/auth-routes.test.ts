import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAuthPath,
  buildSupabaseAuthCallbackUrl,
  getEnabledOAuthProvidersFromSettings,
  getAuthReturnTo,
  normalizeAuthMethod,
  normalizeAuthMode,
  normalizeOAuthProvider,
} from "@/lib/auth-routes";

test("auth route helpers render login and signup modes", () => {
  assert.equal(normalizeAuthMode("login"), "login");
  assert.equal(normalizeAuthMode("signup"), "signup");
  assert.equal(normalizeAuthMode("create"), "signup");
  assert.equal(normalizeAuthMode("unexpected", "signup"), "signup");
  assert.equal(normalizeAuthMethod("email"), "email");
  assert.equal(normalizeAuthMethod("oauth"), "providers");
});

test("auth redirect preservation accepts only internal next or returnTo paths", () => {
  assert.equal(getAuthReturnTo({ returnTo: "/offers/new" }, "login"), "/offers/new");
  assert.equal(getAuthReturnTo({ next: "/dashboard?tab=settings" }, "login"), "/dashboard?tab=settings");
  assert.equal(getAuthReturnTo({ returnTo: "https://evil.example" }, "login"), "/feed");
  assert.equal(getAuthReturnTo({ next: "//evil.example/path" }, "signup"), "/walkthrough");
});

test("auth paths preserve mode, method, and return target", () => {
  assert.equal(
    buildAuthPath({
      method: "email",
      mode: "signup",
      returnTo: "/offers/new",
      route: "/signup",
    }),
    "/signup?mode=signup&method=email&returnTo=%2Foffers%2Fnew",
  );
  assert.equal(
    buildAuthPath({
      mode: "login",
      returnTo: "/feed",
      route: "/login",
    }),
    "/login?mode=login",
  );
});

test("oauth provider normalization only permits configured provider names", () => {
  assert.equal(normalizeOAuthProvider("google"), "google");
  assert.equal(normalizeOAuthProvider("apple"), "apple");
  assert.equal(normalizeOAuthProvider("github"), "github");
  assert.equal(normalizeOAuthProvider("facebook"), "facebook");
  assert.equal(normalizeOAuthProvider("x"), "x");
  assert.equal(normalizeOAuthProvider(undefined), null);
});

test("oauth providers are derived from Supabase Auth external settings", () => {
  assert.deepEqual(getEnabledOAuthProvidersFromSettings(null), []);
  assert.deepEqual(
    getEnabledOAuthProvidersFromSettings({
      apple: true,
      discord: true,
      facebook: true,
      github: true,
      google: true,
      x: true,
    }),
    ["google", "apple", "facebook", "github", "discord", "x"],
  );
  assert.deepEqual(getEnabledOAuthProvidersFromSettings({ google: false, apple: true }), ["apple"]);
});

test("oauth callback URL preserves safe return target", () => {
  assert.equal(
    buildSupabaseAuthCallbackUrl("https://www.moraltrade.org", "/offers/new"),
    "https://www.moraltrade.org/auth/confirm?next=%2Foffers%2Fnew",
  );
  assert.equal(
    buildSupabaseAuthCallbackUrl("https://www.moraltrade.org", "/walkthrough", "signup"),
    "https://www.moraltrade.org/auth/confirm?next=%2Fwalkthrough&mode=signup",
  );
  assert.equal(
    buildSupabaseAuthCallbackUrl("https://www.moraltrade.org", "https://evil.example"),
    "https://www.moraltrade.org/auth/confirm?next=%2Ffeed",
  );
});
