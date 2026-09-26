import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAppleCompletionPath,
  getAppleAuthorizationState,
  getAppleIdentityToken,
  getAppleSignInErrorMessage,
  getAppleUserMetadata,
} from "@/lib/apple-sign-in";

test("Apple sign-in response helpers accept direct and event response shapes", () => {
  assert.equal(getAppleIdentityToken({ id_token: " direct-token " }), "direct-token");
  assert.equal(
    getAppleIdentityToken({ authorization: { id_token: " event-token " } }),
    "event-token",
  );
  assert.equal(
    getAppleAuthorizationState({ authorization: { state: " expected-state " } }),
    "expected-state",
  );
  assert.equal(getAppleIdentityToken({}), null);
});

test("Apple sign-in metadata normalizes the one-time name response", () => {
  assert.deepEqual(
    getAppleUserMetadata({
      user: {
        name: {
          firstName: "  Ada ",
          middleName: "  Lovelace  ",
          lastName: " Byron ",
        },
      },
    }),
    {
      full_name: "Ada Lovelace Byron",
      given_name: "Ada",
      family_name: "Byron",
    },
  );
  assert.equal(getAppleUserMetadata({ user: { name: null } }), null);
});

test("Apple completion route preserves only safe internal destinations", () => {
  assert.equal(
    buildAppleCompletionPath("login", "/offers/new"),
    "/auth/confirm?mode=login&next=%2Foffers%2Fnew&provider=apple-js",
  );
  assert.equal(
    buildAppleCompletionPath("signup", "https://evil.example"),
    "/auth/confirm?mode=signup&next=%2Fonboarding&provider=apple-js",
  );
});

test("Apple sign-in errors distinguish cancellation from operational failure", () => {
  assert.equal(
    getAppleSignInErrorMessage({ error: "popup_closed_by_user" }),
    "Sign-in was cancelled. Try again when you are ready.",
  );
  assert.equal(
    getAppleSignInErrorMessage(new Error("Bad ID token")),
    "We could not complete Apple sign-in. Try again or use email.",
  );
});
