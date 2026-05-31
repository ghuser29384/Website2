import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSafeWishNotificationEmailCopy,
  shouldQueueSafeWishNotificationEmail,
} from "@/lib/background-notifications";

test("safe background notification emails omit notification body details", () => {
  const copy = buildSafeWishNotificationEmailCopy(
    {
      kind: "match",
    },
    "https://moraltrade.test",
  );

  assert.equal(copy.subject, "Moral Trade: possible counterparty update");
  assert.match(copy.body, /dashboard/);
  assert.match(copy.body, /leaves out exact wishes/);
  assert.doesNotMatch(copy.body, /secret@example\.com/i);
  assert.doesNotMatch(copy.body, /private query label/i);
});

test("safe background notification email subjects are generic by channel", () => {
  assert.equal(
    buildSafeWishNotificationEmailCopy({ kind: "consent" }, "https://moraltrade.test").subject,
    "Moral Trade: consent update",
  );
  assert.equal(
    buildSafeWishNotificationEmailCopy({ kind: "safety" }, "https://moraltrade.test").subject,
    "Moral Trade: review update",
  );
  assert.equal(
    buildSafeWishNotificationEmailCopy({ kind: "system" }, "https://moraltrade.test").subject,
    "Moral Trade: background networking update",
  );
});

test("match discovery emails require an explicit immediate email preference", () => {
  const now = new Date("2026-05-31T15:00:00.000Z");

  assert.equal(
    shouldQueueSafeWishNotificationEmail({
      emailEnabledFallback: true,
      eventKind: "match_suggestions",
      now,
      recipientEmail: "participant@example.com",
    }),
    false,
  );
  assert.equal(
    shouldQueueSafeWishNotificationEmail({
      eventKind: "match_suggestions",
      now,
      preference: {
        channel: "email_digest",
        digest_cadence: "daily",
        enabled: true,
        event_kind: "match_suggestions",
        profile_id: "profile-1",
      },
      recipientEmail: "participant@example.com",
    }),
    false,
  );
  assert.equal(
    shouldQueueSafeWishNotificationEmail({
      eventKind: "match_suggestions",
      now,
      preference: {
        channel: "email_digest",
        digest_cadence: "immediate",
        enabled: true,
        event_kind: "match_suggestions",
        profile_id: "profile-1",
      },
      recipientEmail: "participant@example.com",
    }),
    true,
  );
});

test("state-change emails may use the legacy explicit email fallback", () => {
  assert.equal(
    shouldQueueSafeWishNotificationEmail({
      emailEnabledFallback: true,
      eventKind: "consent_decisions",
      now: new Date("2026-05-31T15:00:00.000Z"),
      recipientEmail: "participant@example.com",
    }),
    true,
  );
  assert.equal(
    shouldQueueSafeWishNotificationEmail({
      emailEnabledFallback: true,
      eventKind: "consent_decisions",
      now: new Date("2026-05-31T15:00:00.000Z"),
      recipientEmail: "",
    }),
    false,
  );
});
