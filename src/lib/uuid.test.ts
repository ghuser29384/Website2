import assert from "node:assert/strict";
import test from "node:test";

import { isPostgresUuid } from "@/lib/uuid";

test("PostgreSQL UUID validation accepts canonical hexadecimal identifiers", () => {
  assert.equal(isPostgresUuid("1c6b0e57-bfed-3f29-c51f-6f8c23d1960b"), true);
  assert.equal(isPostgresUuid("1C6B0E57-BFED-3F29-C51F-6F8C23D1960B"), true);
  assert.equal(isPostgresUuid("00000000-0000-0000-0000-000000000000"), true);
});

test("PostgreSQL UUID validation rejects route-shaped and malformed values", () => {
  for (const value of [
    "null",
    "undefined",
    "new",
    "1c6b0e57bfed3f29c51f6f8c23d1960b",
    "1c6b0e57-bfed-3f29-c51f-6f8c23d1960",
    "{1c6b0e57-bfed-3f29-c51f-6f8c23d1960b}",
    "1c6b0e57-bfed-3f29-c51f-6f8c23d1960b/credibility",
    " 1c6b0e57-bfed-3f29-c51f-6f8c23d1960b",
  ]) {
    assert.equal(isPostgresUuid(value), false, value);
  }
});
