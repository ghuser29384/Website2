import assert from "node:assert/strict";
import test from "node:test";

import {
  BACKGROUND_PURPOSE_POLICY_VERSION,
  formatBackgroundPurposeLabel,
  normalizeBackgroundPurposeBinding,
  normalizeBackgroundPurposeCode,
  validateBackgroundPurposeBindings,
} from "@/lib/background-purpose-registry";

test("background purpose registry rejects broad catch-all purpose labels", () => {
  assert.equal(normalizeBackgroundPurposeCode("general networking"), null);
  assert.equal(normalizeBackgroundPurposeCode("anything_useful"), null);
  assert.equal(normalizeBackgroundPurposeCode("research collaboration"), "research_collaboration");
});

test("background purpose bindings require the active purpose policy version", () => {
  assert.deepEqual(
    normalizeBackgroundPurposeBinding({
      purposeCode: "pledge_swap",
      purposePolicyVersion: BACKGROUND_PURPOSE_POLICY_VERSION,
    }),
    {
      purposeCode: "pledge_swap",
      purposePolicyVersion: BACKGROUND_PURPOSE_POLICY_VERSION,
    },
  );
  assert.deepEqual(
    normalizeBackgroundPurposeBinding({
      purposeCode: "pledge_swap",
      purposePolicyVersion: "old-policy",
    }),
    {
      purposeCode: "moral_trade_offer",
      purposePolicyVersion: BACKGROUND_PURPOSE_POLICY_VERSION,
    },
  );
});

test("purpose registry labels stay broad and versioned", () => {
  assert.equal(
    formatBackgroundPurposeLabel({
      purposeCode: "moral_public_good",
      purposePolicyVersion: BACKGROUND_PURPOSE_POLICY_VERSION,
    }),
    "Moral public good",
  );

  const validation = validateBackgroundPurposeBindings([
    {
      purposeCode: "moral_public_good",
      purposePolicyVersion: BACKGROUND_PURPOSE_POLICY_VERSION,
    },
    { purposeCode: "general_networking", purposePolicyVersion: BACKGROUND_PURPOSE_POLICY_VERSION },
  ]);

  assert.equal(validation.normalized.length, 1);
  assert.ok(validation.errors.some((error) => /Unsupported or overbroad/.test(error)));
});
