import assert from "node:assert/strict";
import test from "node:test";

import {
  actionsMateriallyMatch,
  startGroupContributionEnhancement,
} from "./group-contribution-client";

test("action matching recognizes materially identical requested and offered actions", () => {
  assert.equal(
    actionsMateriallyMatch(
      "Avoid meat for one meal per week",
      "Not eat meat for one meal each week",
    ),
    true,
  );
});

test("action matching rejects unrelated actions", () => {
  assert.equal(
    actionsMateriallyMatch(
      "Avoid meat for one meal per week",
      "Research technical AI alignment for two hours",
    ),
    false,
  );
});

test("client enhancement is a no-op outside a browser", () => {
  assert.doesNotThrow(() => startGroupContributionEnhancement());
});
