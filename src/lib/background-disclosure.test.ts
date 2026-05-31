import test from "node:test";
import assert from "node:assert/strict";

import {
  formatDisclosureFieldLabel,
  getDefaultGrantExpiryDays,
  normalizeDisclosureFieldKeys,
  requiresContactDisclosureStepUp,
  validateDisclosureRequest,
} from "@/lib/background-disclosure";

test("normalizes disclosure fields to the supported lattice", () => {
  assert.deepEqual(
    normalizeDisclosureFieldKeys(["exact_wish", "unknown", "exact_wish", "contact_email"]),
    ["exact_wish", "contact_email"],
  );
  assert.equal(formatDisclosureFieldLabel("source_summary"), "Manual source summary");
});

test("disclosure validation enforces purpose, stage, and max reveal level", () => {
  const earlyContact = validateDisclosureRequest({
    accessLevel: "contact",
    fieldKeys: ["contact_email"],
    purpose: "Coordinate a mutually approved intro.",
    stage: "consent",
  });

  assert.ok(earlyContact.errors.some((error) => error.includes("introduced")));

  const tooBroad = validateDisclosureRequest({
    accessLevel: "contact",
    fieldKeys: ["exact_wish"],
    purpose: "",
    stage: "introduced",
  });

  assert.ok(tooBroad.errors.some((error) => error.includes("narrow purpose")));
  assert.ok(tooBroad.errors.some((error) => error.includes("cannot be granted")));
});

test("grant expiry defaults stay short before introductions", () => {
  assert.equal(getDefaultGrantExpiryDays("registry"), 14);
  assert.equal(getDefaultGrantExpiryDays("consent"), 30);
  assert.equal(getDefaultGrantExpiryDays("introduced"), 90);
});

test("contact disclosure grants require MFA step-up", () => {
  assert.equal(
    requiresContactDisclosureStepUp({
      accessLevel: "specific",
      fieldKeys: ["exact_wish"],
    }),
    false,
  );
  assert.equal(
    requiresContactDisclosureStepUp({
      accessLevel: "specific",
      fieldKeys: ["contact_email"],
    }),
    true,
  );
  assert.equal(
    requiresContactDisclosureStepUp({
      accessLevel: "contact",
      fieldKeys: ["exact_wish"],
    }),
    true,
  );
});
