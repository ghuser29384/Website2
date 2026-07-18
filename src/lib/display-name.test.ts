import assert from "node:assert/strict";
import test from "node:test";

import { getDisplayNameParts } from "@/lib/display-name";

test("display name parts use the first name and outer initials", () => {
  assert.deepEqual(getDisplayNameParts("Alex Johnson"), {
    firstName: "Alex",
    initials: "AJ",
  });

  assert.deepEqual(getDisplayNameParts("Alex Morgan Johnson"), {
    firstName: "Alex",
    initials: "AJ",
  });
});

test("display name parts normalize whitespace", () => {
  assert.deepEqual(getDisplayNameParts("  Alex   Johnson  "), {
    firstName: "Alex",
    initials: "AJ",
  });
});

test("display name parts support single and non-Latin names", () => {
  assert.deepEqual(getDisplayNameParts("Prince"), {
    firstName: "Prince",
    initials: "P",
  });

  assert.deepEqual(getDisplayNameParts("李 雷"), {
    firstName: "李",
    initials: "李雷",
  });
});

test("display name parts return null values when no name is available", () => {
  assert.deepEqual(getDisplayNameParts(null), {
    firstName: null,
    initials: null,
  });

  assert.deepEqual(getDisplayNameParts("   "), {
    firstName: null,
    initials: null,
  });
});
