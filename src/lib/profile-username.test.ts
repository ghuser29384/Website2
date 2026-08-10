import assert from "node:assert/strict";
import test from "node:test";

import {
  buildUsernameCompletionPath,
  normalizeProfileUsername,
  profileNeedsUsername,
  validateProfileUsername,
} from "./profile-username";

test("normalizes a selected public username without inventing one", () => {
  assert.equal(normalizeProfileUsername("  @Alex-Morgan  "), "alex-morgan");
  assert.deepEqual(validateProfileUsername("Alex-Morgan"), {
    ok: true,
    username: "alex-morgan",
  });
  assert.equal(normalizeProfileUsername(null), "");
});

test("rejects malformed and reserved usernames", () => {
  assert.equal(validateProfileUsername("a").ok, false);
  assert.equal(validateProfileUsername("two words").ok, false);
  assert.equal(validateProfileUsername("two--hyphens").ok, false);
  assert.equal(validateProfileUsername("-leading").ok, false);
  assert.equal(validateProfileUsername("admin").ok, false);
});

test("requires existing accounts to choose rather than receive a generated username", () => {
  assert.equal(profileNeedsUsername({ username: null }), true);
  assert.equal(profileNeedsUsername({ username: "" }), true);
  assert.equal(profileNeedsUsername({ username: "ellen-sun" }), false);
});

test("builds a bounded return path for username completion", () => {
  assert.equal(
    buildUsernameCompletionPath("/trades/new?resume=create"),
    "/complete-profile?username_required=1&next=%2Ftrades%2Fnew%3Fresume%3Dcreate",
  );
});
