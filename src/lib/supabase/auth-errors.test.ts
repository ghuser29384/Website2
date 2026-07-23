import assert from "node:assert/strict";
import test from "node:test";

import { isExpectedMissingSessionError } from "./auth-errors";

test("classifies the ordinary signed-out Supabase error as expected", () => {
  assert.equal(
    isExpectedMissingSessionError({
      name: "AuthSessionMissingError",
      message: "Auth session missing!",
    }),
    true,
  );
  assert.equal(
    isExpectedMissingSessionError({
      code: "auth_session_missing",
      message: "Session missing",
    }),
    true,
  );
});

test("does not suppress unexpected authentication failures", () => {
  assert.equal(
    isExpectedMissingSessionError({
      code: "refresh_token_already_used",
      message: "Refresh token already used",
      name: "AuthApiError",
    }),
    false,
  );
  assert.equal(isExpectedMissingSessionError(null), false);
});
