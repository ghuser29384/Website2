import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import {
  buildAuthIdentityHmac,
  buildProviderDedupeTokens,
  evaluateOnePersonCapability,
  evaluateOnePersonConfiguration,
  parseOnePersonAccountSnapshot,
  parseOnePersonProviderPayload,
  verifyOnePersonWebhookSignature,
  type OnePersonAccountConfig,
  type OnePersonAccountSnapshot,
} from "./one-person-account";

const key = "qa-dedupe-key-that-is-at-least-thirty-two-characters";

function config(overrides: Partial<OnePersonAccountConfig> = {}): OnePersonAccountConfig {
  return {
    registrationEnforcementEnabled: false,
    participationEnforcementEnabled: false,
    manualIdentityLinkingEnabled: false,
    providerMode: "qa_mock",
    providerName: "MoralTrade QA",
    providerWebhookSecret: "qa-webhook-secret-that-is-at-least-thirty-two-characters",
    dedupeKey: key,
    dedupeTokenVersion: 1,
    verificationUrlTemplate: "https://identity.example/verify/{session_id}",
    sessionTtlMinutes: 45,
    registrationGrantTtlMinutes: 20,
    webhookToleranceSeconds: 300,
    qaSecret: "qa-secret-that-is-at-least-thirty-two-characters",
    ...overrides,
  };
}

function account(overrides: Partial<OnePersonAccountSnapshot> = {}): OnePersonAccountSnapshot {
  return {
    available: true,
    profileId: "11111111-1111-4111-8111-111111111111",
    accountKind: "human",
    accountStatus: "active",
    verificationStatus: "verified",
    ageClass: "adult",
    guardianConsentStatus: "not_required",
    ordinaryCooldownUntil: null,
    highRiskCooldownUntil: null,
    credentialExpiresAt: "2099-01-01T00:00:00.000Z",
    providerName: "MoralTrade QA",
    registrationEnforcementEnabled: true,
    participationEnforcementEnabled: true,
    providerMode: "qa_mock",
    providerReady: true,
    ...overrides,
  };
}

test("configuration fails closed when enforcement has no provider", () => {
  const result = evaluateOnePersonConfiguration(
    config({ providerMode: "disabled", registrationEnforcementEnabled: true }),
  );
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some((blocker) => blocker.includes("disabled")));
});

test("QA configuration requires independent secrets", () => {
  const result = evaluateOnePersonConfiguration(config({ qaSecret: "short", dedupeKey: "short" }));
  assert.equal(result.ready, false);
  assert.ok(result.blockers.length >= 2);
});

test("provider-domain separation yields different deduplication tokens", () => {
  const payload = {
    dedupeReferences: [{ namespace: "provider_subject" as const, reference: "opaque-person-123" }],
  };
  const left = buildProviderDedupeTokens(payload, key, "provider-a");
  const right = buildProviderDedupeTokens(payload, key, "provider-b");
  assert.notEqual(left[0]?.token, right[0]?.token);
});

test("authentication identity HMAC is provider scoped", () => {
  assert.notEqual(
    buildAuthIdentityHmac("google", "identity-123", key),
    buildAuthIdentityHmac("apple", "identity-123", key),
  );
});

test("signed webhook accepts an exact fresh body and rejects mutation", () => {
  const body = JSON.stringify({ event: "verified" });
  const timestamp = "1893456000";
  const secret = "signed-webhook-secret-that-is-at-least-thirty-two-characters";
  const signature = `sha256=${createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex")}`;
  assert.equal(
    verifyOnePersonWebhookSignature({
      body,
      now: Number(timestamp) * 1000,
      secret,
      signatureHeader: signature,
      timestampHeader: timestamp,
      toleranceSeconds: 300,
    }),
    true,
  );
  assert.equal(
    verifyOnePersonWebhookSignature({
      body: `${body} `,
      now: Number(timestamp) * 1000,
      secret,
      signatureHeader: signature,
      timestampHeader: timestamp,
      toleranceSeconds: 300,
    }),
    false,
  );
});

test("signed webhook rejects stale replay", () => {
  const body = "{}";
  const timestamp = "1893456000";
  const secret = "signed-webhook-secret-that-is-at-least-thirty-two-characters";
  const signature = `sha256=${createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex")}`;
  assert.equal(
    verifyOnePersonWebhookSignature({
      body,
      now: (Number(timestamp) + 301) * 1000,
      secret,
      signatureHeader: signature,
      timestampHeader: timestamp,
      toleranceSeconds: 300,
    }),
    false,
  );
});

test("provider payload requires stable references and deletion deadline", () => {
  assert.throws(() =>
    parseOnePersonProviderPayload({
      eventId: "provider-event-1",
      sessionId: "11111111-1111-4111-8111-111111111111",
      providerSessionReference: "provider-session-1",
      result: "verified",
      assuranceTier: "document_liveness",
      ageClass: "adult",
      dedupeReferences: [],
      duplicateCheckResult: "clear",
      verifiedAt: "2026-07-31T00:00:00.000Z",
      rawDataDeletionDueAt: null,
    }),
  );
});

test("verified adult can use a consequential capability", () => {
  const decision = evaluateOnePersonCapability({ action: "agreement", account: account() });
  assert.equal(decision.allowed, true);
  assert.equal(decision.reasonCode, "verified_adult");
});

test("legacy account retains low-risk access but cannot publish when enforcement is on", () => {
  const legacy = account({ verificationStatus: "legacy_unverified", ageClass: "unknown" });
  assert.equal(evaluateOnePersonCapability({ action: "private_draft", account: legacy }).allowed, true);
  assert.equal(evaluateOnePersonCapability({ action: "publish", account: legacy }).allowed, false);
});

test("guardian-consented minor may participate but cannot use financial capabilities", () => {
  const minor = account({ ageClass: "minor_13_17", guardianConsentStatus: "active" });
  assert.equal(evaluateOnePersonCapability({ action: "participate", account: minor }).allowed, true);
  assert.equal(evaluateOnePersonCapability({ action: "financial", account: minor }).allowed, false);
});

test("recovery cooldown blocks high-risk actions", () => {
  const recovering = account({
    accountStatus: "recovery_cooldown",
    ordinaryCooldownUntil: "2099-01-01T00:00:00.000Z",
    highRiskCooldownUntil: "2099-01-08T00:00:00.000Z",
  });
  const decision = evaluateOnePersonCapability(
    { action: "organization_control", account: recovering },
    Date.parse("2026-07-31T00:00:00.000Z"),
  );
  assert.equal(decision.allowed, false);
  assert.equal(decision.reasonCode, "high_risk_recovery_cooldown");
});

test("service principals cannot exercise human capabilities", () => {
  const service = account({ accountKind: "service" });
  assert.equal(evaluateOnePersonCapability({ action: "vote", account: service }).allowed, false);
});

test("account snapshot parser rejects malformed public projections", () => {
  assert.equal(parseOnePersonAccountSnapshot({ accountKind: "unknown" }), null);
});
