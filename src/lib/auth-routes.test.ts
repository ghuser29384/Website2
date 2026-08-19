import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAuthPath,
  buildSupabaseAuthCallbackUrl,
  getEnabledOAuthProvidersFromSettings,
  getAuthDefaultReturnTo,
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

test("new accounts start in Walkthrough and returning accounts start in Feed", () => {
  assert.equal(getAuthDefaultReturnTo("signup"), "/walkthrough");
  assert.equal(getAuthDefaultReturnTo("login"), "/feed");
  assert.equal(getAuthReturnTo({}, "signup"), "/walkthrough");
  assert.equal(getAuthReturnTo({}, "login"), "/feed");
});

test("auth redirect preservation accepts only internal next or returnTo paths", () => {
  assert.equal(getAuthReturnTo({ returnTo: "/offers/new" }, "login"), "/offers/new");
  assert.equal(
    getAuthReturnTo({ next: "/dashboard?tab=settings" }, "login"),
    "/dashboard?tab=settings",
  );
  assert.equal(
    getAuthReturnTo({ returnTo: "https://external.example" }, "login"),
    "/feed",
  );
  assert.equal(getAuthReturnTo({ next: "//external.example/path" }, "signup"), "/walkthrough");
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
      returnTo: "/dashboard",
      route: "/login",
    }),
    "/login?mode=login&returnTo=%2Fdashboard",
  );
  assert.equal(
    buildAuthPath({
      mode: "signup",
      returnTo: "/walkthrough",
      route: "/signup",
    }),
    "/signup?mode=signup",
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

test("oauth callback URL preserves safe return targets", () => {
  assert.equal(
    buildSupabaseAuthCallbackUrl("https://www.moraltrade.org", "/offers/new"),
    "https://www.moraltrade.org/auth/confirm?next=%2Foffers%2Fnew",
  );
  assert.equal(
    buildSupabaseAuthCallbackUrl("https://www.moraltrade.org", "/onboarding", "signup"),
    "https://www.moraltrade.org/auth/confirm?next=%2Fonboarding&mode=signup",
  );
});

test("oauth callbacks use mode-specific safe fallbacks", () => {
  const signupCallback = new URL(
    buildSupabaseAuthCallbackUrl(
      "https://www.moraltrade.org",
      "https://external.example/not-internal",
      "signup",
    ),
  );
  const loginCallback = new URL(
    buildSupabaseAuthCallbackUrl(
      "https://www.moraltrade.org",
      "https://external.example/not-internal",
      "login",
    ),
  );

  assert.equal(signupCallback.pathname, "/auth/confirm");
  assert.equal(signupCallback.searchParams.get("mode"), "signup");
  assert.equal(signupCallback.searchParams.get("next"), "/walkthrough");
  assert.equal(loginCallback.searchParams.get("mode"), "login");
  assert.equal(loginCallback.searchParams.get("next"), "/feed");
});
