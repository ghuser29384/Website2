import assert from "node:assert/strict";
import test from "node:test";

import { shouldSendBackgroundNotificationImmediately } from "@/lib/background-notification-policy";

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
