import assert from "node:assert/strict";
import test from "node:test";

import {
  AUTH_RESOLUTION_TIMEOUT_MS,
  resolveAuthUserWithDeadline,
} from "./auth-resolution";

test("the authenticated-user deadline tolerates ordinary cross-region latency", () => {
  assert.equal(AUTH_RESOLUTION_TIMEOUT_MS, 8_000);
});

test("auth resolution returns a verified user delivered before the deadline", async () => {
  const result = await resolveAuthUserWithDeadline(
    new Promise<{ data: { user: { id: string } }; error: null }>((resolve) => {
      setTimeout(() => resolve({ data: { user: { id: "viewer" } }, error: null }), 20);
    }),
    250,
  );

  assert.deepEqual(result, {
    data: { user: { id: "viewer" } },
    error: null,
    timedOut: false,
  });
});

test("auth resolution still fails closed when the hard deadline expires", async () => {
  const result = await resolveAuthUserWithDeadline<{ id: string }>(
    new Promise(() => {}),
    5,
  );

  assert.deepEqual(result, {
    data: { user: null },
    error: { message: "Timed out resolving authenticated user." },
    timedOut: true,
  });
});
