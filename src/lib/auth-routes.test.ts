import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSupabaseAuthCallbackUrl,
  getAuthDefaultReturnTo,
  getAuthReturnTo,
} from "@/lib/auth-routes";

test("new accounts start in the walkthrough and returning accounts start in Feed", () => {
  assert.equal(getAuthDefaultReturnTo("signup"), "/walkthrough");
  assert.equal(getAuthDefaultReturnTo("login"), "/feed");
  assert.equal(getAuthReturnTo({}, "signup"), "/walkthrough");
  assert.equal(getAuthReturnTo({}, "login"), "/feed");
});

test("auth callbacks use the mode-specific safe fallback", () => {
  const signupCallback = new URL(
    buildSupabaseAuthCallbackUrl(
      "https://www.moraltrade.org",
      "https://example.invalid/not-internal",
      "signup",
    ),
  );
  const loginCallback = new URL(
    buildSupabaseAuthCallbackUrl(
      "https://www.moraltrade.org",
      "https://example.invalid/not-internal",
      "login",
    ),
  );

  assert.equal(signupCallback.pathname, "/auth/confirm");
  assert.equal(signupCallback.searchParams.get("mode"), "signup");
  assert.equal(signupCallback.searchParams.get("next"), "/walkthrough");
  assert.equal(loginCallback.searchParams.get("mode"), "login");
  assert.equal(loginCallback.searchParams.get("next"), "/feed");
});
