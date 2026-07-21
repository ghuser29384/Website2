import assert from "node:assert/strict";
import test from "node:test";

import {
  NOW_PROFILE_PRIORITY_SEARCH_LABEL,
  normalizeNowProfilePriorityCauses,
} from "@/lib/profile-priority-search";

test("normalizes Now profile priorities to supported unique cause areas", () => {
  assert.equal(NOW_PROFILE_PRIORITY_SEARCH_LABEL, "Now profile priorities");
  assert.deepEqual(
    normalizeNowProfilePriorityCauses([
      "Animal welfare",
      "Climate",
      "Animal welfare",
      "Unknown cause",
      " Global poverty ",
      null,
    ]),
    ["Animal welfare", "Climate", "Global poverty"],
  );
});
