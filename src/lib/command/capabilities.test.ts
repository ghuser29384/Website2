import assert from "node:assert/strict";
import test from "node:test";

import {
  COMMAND_CAPABILITIES,
  getCommandCapability,
  validateCommandCapabilityArguments,
} from "@/lib/command/capabilities";

test("every Command capability declares a complete permission contract", () => {
  assert.ok(COMMAND_CAPABILITIES.length >= 18);
  const keys = new Set<string>();
  for (const capability of COMMAND_CAPABILITIES) {
    assert.ok(!keys.has(capability.key), `duplicate capability ${capability.key}`);
    keys.add(capability.key);
    assert.ok(capability.title);
    assert.ok(capability.description);
    assert.ok(capability.authorization);
    assert.equal(typeof capability.reversible, "boolean");
    assert.ok(capability.inputSchema);
    assert.ok(capability.consequence.public);
    assert.ok(capability.consequence.financial);
    assert.ok(capability.consequence.privacy);
    assert.ok(capability.consequence.legal);
  }
});

test("permission tiers require the correct confirmation posture", () => {
  for (const capability of COMMAND_CAPABILITIES) {
    if (capability.permissionTier === "read_only") {
      assert.equal(capability.confirmationLevel, "none");
      assert.equal(capability.executionMode, "immediate");
    }
    if (capability.permissionTier === "external_consequential") {
      assert.equal(capability.confirmationLevel, "confirm");
      assert.equal(capability.executionMode, "confirmed_handoff");
    }
    if (capability.permissionTier === "financial_strong_confirmation") {
      assert.equal(capability.confirmationLevel, "type_exact_phrase");
      assert.equal(capability.executionMode, "strong_confirmed_handoff");
      assert.equal(capability.reversible, false);
    }
    if (capability.permissionTier === "prohibited") {
      assert.equal(capability.executionMode, "blocked");
    }
  }
});

test("typed inputs reject missing or unexpected fields", () => {
  assert.equal(
    validateCommandCapabilityArguments("search_offers", {
      query: "animal welfare",
      mode: null,
      limit: 8,
    }).ok,
    true,
  );
  assert.deepEqual(
    validateCommandCapabilityArguments("search_offers", {
      query: "animal welfare",
      hiddenDatabaseQuery: "select *",
    }).errors,
    ["Unexpected field: hiddenDatabaseQuery", "Missing field: mode", "Missing field: limit"],
  );
  assert.equal(getCommandCapability("authorize_payment")?.permissionTier, "financial_strong_confirmation");
});
