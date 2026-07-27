import assert from "node:assert/strict";
import test from "node:test";

import {
  assertInstitutionalIntegrationConfigHasNoSecrets,
  isForbiddenInstitutionalWebhookAddress,
  validateInstitutionalWebhookInput,
} from "./institutional-webhooks";

test("integration configuration rejects secret-bearing keys and recognizable credentials", () => {
  assert.throws(() => assertInstitutionalIntegrationConfigHasNoSecrets({ apiKey: "not-even-needed" }), /contains a secret-like/i);
  assert.throws(() => assertInstitutionalIntegrationConfigHasNoSecrets({ headers: { value: "Bearer abcdefghijklmnopqrstuvwxyz" } }), /contains a secret-like/i);
  assert.doesNotThrow(() => assertInstitutionalIntegrationConfigHasNoSecrets({ region: "us", mode: "read_only", labels: ["deal"] }));
});

test("webhook events are restricted to the supported contract", () => {
  assert.deepEqual(validateInstitutionalWebhookInput({ events: ["deal.signed", "evidence.submitted"] }), ["deal.signed", "evidence.submitted"]);
  assert.throws(() => validateInstitutionalWebhookInput({ events: ["*", "user.password.changed"] }), /unsupported institutional webhook event/i);
});

test("private and special-purpose addresses are rejected", () => {
  for (const address of ["127.0.0.1", "10.0.0.1", "172.16.5.2", "192.168.1.2", "169.254.10.1", "::1", "fd00::1", "fe80::1"]) {
    assert.equal(isForbiddenInstitutionalWebhookAddress(address), true, address);
  }
  assert.equal(isForbiddenInstitutionalWebhookAddress("8.8.8.8"), false);
  assert.equal(isForbiddenInstitutionalWebhookAddress("2606:4700:4700::1111"), false);
});
