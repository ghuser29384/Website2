import assert from "node:assert/strict";
import test from "node:test";

import {
  canBackgroundCollectiveMember,
  getDefaultBackgroundCollectivePermissions,
  normalizeBackgroundCollectivePermissions,
} from "@/lib/background-collective-auth";

test("collective owners get all background delegation permissions", () => {
  assert.equal(
    canBackgroundCollectiveMember({ role: "owner" }, "approve_contact_disclosure"),
    true,
  );
  assert.ok(getDefaultBackgroundCollectivePermissions("owner").includes("change_discoverability"));
});

test("collective delegates need explicit permissions and owner step-up for contact disclosure", () => {
  const delegate = {
    permissions: ["request_intro", "approve_contact_disclosure"],
    role: "delegate",
  };

  assert.equal(canBackgroundCollectiveMember(delegate, "request_intro"), true);
  assert.equal(canBackgroundCollectiveMember(delegate, "approve_contact_disclosure"), false);
  assert.equal(
    canBackgroundCollectiveMember(
      { ...delegate, ownerStepUpConfirmed: true },
      "approve_contact_disclosure",
    ),
    true,
  );
});

test("collective permission normalization rejects unsupported actions", () => {
  assert.deepEqual(
    normalizeBackgroundCollectivePermissions(["request_intro", "raw_feed_access", "request_intro"]),
    ["request_intro"],
  );
});
