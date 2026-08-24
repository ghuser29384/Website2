import assert from "node:assert/strict";
import test from "node:test";

import { getEveryOrgApiBase } from "@/lib/direct-donation-upgrade";

test("Every.org API hosts remain isolated by provider environment", () => {
  assert.equal(
    getEveryOrgApiBase("staging"),
    "https://partners-staging.every.org/v0.2",
  );
  assert.equal(getEveryOrgApiBase("live"), "https://partners.every.org/v0.2");
  assert.throws(
    () => getEveryOrgApiBase("disabled"),
    /unavailable while Direct Donation Upgrades are disabled/,
  );
});
