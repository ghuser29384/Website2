import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAuthPath,
  buildSupabaseAuthCallbackUrl,
  getEnabledOAuthProviders,
  getAuthReturnTo,
  isOAuthProviderEnabled,
  normalizeAuthMethod,
  normalizeAuthMode,
  normalizeOAuthProvider,
} from "@/lib/auth-routes";

function withAuthProviderEnv<T>(
  env: { AUTH_GOOGLE_ENABLED?: string; AUTH_APPLE_ENABLED?: string },
  callback: () => T,
) {
  const previousGoogle = process.env.AUTH_GOOGLE_ENABLED;
  const previousApple = process.env.AUTH_APPLE_ENABLED;

  if (env.AUTH_GOOGLE_ENABLED === undefined) {
    delete process.env.AUTH_GOOGLE_ENABLED;
  } else {
    process.env.AUTH_GOOGLE_ENABLED = env.AUTH_GOOGLE_ENABLED;
  }

  if (env.AUTH_APPLE_ENABLED === undefined) {
    delete process.env.AUTH_APPLE_ENABLED;
  } else {
    process.env.AUTH_APPLE_ENABLED = env.AUTH_APPLE_ENABLED;
  }

  try {
    return callback();
  } finally {
    if (previousGoogle === undefined) {
      delete process.env.AUTH_GOOGLE_ENABLED;
    } else {
      process.env.AUTH_GOOGLE_ENABLED = previousGoogle;
    }

    if (previousApple === undefined) {
      delete process.env.AUTH_APPLE_ENABLED;
    } else {
      process.env.AUTH_APPLE_ENABLED = previousApple;
    }
  }
}

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
  assert.equal(getAuthReturnTo({ returnTo: "https://evil.example" }, "login"), "/dashboard");
  assert.equal(getAuthReturnTo({ next: "//evil.example/path" }, "signup"), "/onboarding");
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
    "/login?mode=login",
  );
});

test("oauth provider normalization only permits configured provider names", () => {
  assert.equal(normalizeOAuthProvider("google"), "google");
  assert.equal(normalizeOAuthProvider("apple"), "apple");
  assert.equal(normalizeOAuthProvider("github"), null);
  assert.equal(normalizeOAuthProvider(undefined), null);
});

test("oauth providers fail closed unless explicitly enabled by deployment env", () => {
  withAuthProviderEnv({}, () => {
    assert.equal(isOAuthProviderEnabled("google"), false);
    assert.equal(isOAuthProviderEnabled("apple"), false);
    assert.deepEqual(getEnabledOAuthProviders(), []);
  });

  withAuthProviderEnv({ AUTH_GOOGLE_ENABLED: "true", AUTH_APPLE_ENABLED: "1" }, () => {
    assert.equal(isOAuthProviderEnabled("google"), true);
    assert.equal(isOAuthProviderEnabled("apple"), true);
    assert.deepEqual(getEnabledOAuthProviders(), ["google", "apple"]);
  });

  withAuthProviderEnv({ AUTH_GOOGLE_ENABLED: "false", AUTH_APPLE_ENABLED: "yes" }, () => {
    assert.equal(isOAuthProviderEnabled("google"), false);
    assert.equal(isOAuthProviderEnabled("apple"), true);
    assert.deepEqual(getEnabledOAuthProviders(), ["apple"]);
  });
});

test("oauth callback URL preserves safe return target", () => {
  assert.equal(
    buildSupabaseAuthCallbackUrl("https://www.moraltrade.org", "/offers/new"),
    "https://www.moraltrade.org/auth/confirm?next=%2Foffers%2Fnew",
  );
  assert.equal(
    buildSupabaseAuthCallbackUrl("https://www.moraltrade.org", "/onboarding", "signup"),
    "https://www.moraltrade.org/auth/confirm?next=%2Fonboarding&mode=signup",
  );
  assert.equal(
    buildSupabaseAuthCallbackUrl("https://www.moraltrade.org", "https://evil.example"),
    "https://www.moraltrade.org/auth/confirm?next=%2Fdashboard",
  );
});
