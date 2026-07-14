import assert from "node:assert/strict";
import test from "node:test";

import {
  BACKGROUND_OPPORTUNITY_NOTIFICATION,
  shouldSendBackgroundNotificationImmediately,
  shouldSendBriefNow,
} from "@/lib/background-notification-policy";

test("opportunity notification copy uses the bg76 generic safe contract", () => {
  assert.deepEqual(BACKGROUND_OPPORTUNITY_NOTIFICATION, {
    body:
      "A privacy-safe opportunity brief is ready for your review. Exact wishes and contact details remain hidden until the appropriate consent stage.",
    title: "New broad-overlap opportunity",
  });
  assert.doesNotMatch(BACKGROUND_OPPORTUNITY_NOTIFICATION.body, /private ask|source note|contact:\s/i);
});

test("discovery notifications default to digest unless explicitly immediate", () => {
  assert.equal(
    shouldSendBackgroundNotificationImmediately({
      channel: "email_digest",
      digestCadence: "daily",
      enabled: true,
      eventKind: "match_suggestions",
      now: new Date("2026-05-31T14:00:00Z"),
    }),
    false,
  );
  assert.equal(
    shouldSendBackgroundNotificationImmediately({
      channel: "email_digest",
      digestCadence: "immediate",
      enabled: true,
      eventKind: "match_suggestions",
      now: new Date("2026-05-31T14:00:00Z"),
    }),
    true,
  );
});
test("state-change notifications may send immediately without private content", () => {
  assert.equal(
    shouldSendBackgroundNotificationImmediately({
      channel: "email_digest",
      digestCadence: "daily",
      enabled: true,
      eventKind: "consent_decisions",
      now: new Date("2026-05-31T14:00:00Z"),
    }),
    true,
  );
});

test("quiet hours and daily caps suppress discovery immediacy", () => {
  assert.equal(
    shouldSendBackgroundNotificationImmediately({
      channel: "email_digest",
      digestCadence: "immediate",
      enabled: true,
      eventKind: "match_suggestions",
      now: new Date("2026-05-31T23:00:00"),
      quietHoursEnd: 8,
      quietHoursStart: 22,
    }),
    false,
  );
  assert.equal(
    shouldSendBackgroundNotificationImmediately({
      channel: "email_digest",
      dailyCap: 1,
      digestCadence: "immediate",
      enabled: true,
      eventKind: "match_suggestions",
      immediateSentToday: 1,
      now: new Date("2026-05-31T14:00:00Z"),
    }),
    false,
  );
});

test("source cooldowns suppress repeated discovery notifications", () => {
  assert.equal(
    shouldSendBackgroundNotificationImmediately({
      channel: "email_digest",
      digestCadence: "immediate",
      enabled: true,
      eventKind: "match_suggestions",
      lastSourceNotificationAt: "2026-05-31T12:00:00.000Z",
      now: new Date("2026-05-31T18:00:00.000Z"),
      sourceCooldownHours: 24,
    }),
    false,
  );
  assert.equal(
    shouldSendBackgroundNotificationImmediately({
      channel: "email_digest",
      digestCadence: "immediate",
      enabled: true,
      eventKind: "match_suggestions",
      lastSourceNotificationAt: "2026-05-30T12:00:00.000Z",
      now: new Date("2026-05-31T18:00:00.000Z"),
      sourceCooldownHours: 24,
    }),
    true,
  );
});

test("opportunity brief notifications never send private detail immediately", () => {
  const result = shouldSendBriefNow({
    confidenceBand: "High",
    containsPrivateWishText: true,
    digestEnabled: false,
    immediateHighConfidenceEnabled: true,
    reviewStatus: "review_cleared",
    riskLevel: "low",
  });

  assert.equal(result.allowed, false);
  assert.equal(result.deliveryMode, "none");
  assert.match(result.reason, /private/i);
});

test("opportunity brief notifications respect quiet hours and daily caps", () => {
  const quietHoursDecision = shouldSendBriefNow({
    confidenceBand: "High",
    digestEnabled: true,
    immediateHighConfidenceEnabled: true,
    nowLocalTime: "23:15",
    quietHours: { end: "08:00", start: "22:00" },
    reviewStatus: "review_cleared",
    riskLevel: "low",
  });
  const capDecision = shouldSendBriefNow({
    confidenceBand: "High",
    dailyCap: 1,
    digestEnabled: true,
    immediateHighConfidenceEnabled: true,
    reviewStatus: "review_cleared",
    riskLevel: "low",
    sentToday: 1,
  });

  assert.deepEqual(
    { allowed: quietHoursDecision.allowed, deliveryMode: quietHoursDecision.deliveryMode },
    { allowed: true, deliveryMode: "digest" },
  );
  assert.deepEqual(
    { allowed: capDecision.allowed, deliveryMode: capDecision.deliveryMode },
    { allowed: true, deliveryMode: "digest" },
  );
});

test("opportunity brief notifications send immediately only after review-cleared high confidence", () => {
  assert.deepEqual(
    shouldSendBriefNow({
      confidenceBand: "Moderate",
      digestEnabled: true,
      immediateHighConfidenceEnabled: true,
      reviewStatus: "review_cleared",
      riskLevel: "low",
    }).deliveryMode,
    "digest",
  );
  assert.deepEqual(
    shouldSendBriefNow({
      confidenceBand: "High",
      digestEnabled: true,
      immediateHighConfidenceEnabled: true,
      reviewStatus: "review_cleared",
      riskLevel: "low",
    }).deliveryMode,
    "immediate",
  );
});
