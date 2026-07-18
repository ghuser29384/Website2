import assert from "node:assert/strict";
import test from "node:test";

import { isWithinReminderQuietHours } from "@/lib/trade-reminder-worker";

test("defers reminders across overnight quiet hours", () => {
  assert.equal(
    isWithinReminderQuietHours({
      now: new Date("2026-07-18T03:30:00.000Z"),
      timezone: "UTC",
      enabled: true,
      start: "22:00",
      end: "07:00",
    }),
    true,
  );
  assert.equal(
    isWithinReminderQuietHours({
      now: new Date("2026-07-18T12:30:00.000Z"),
      timezone: "UTC",
      enabled: true,
      start: "22:00",
      end: "07:00",
    }),
    false,
  );
});

test("handles same-day quiet hours and disabled mode", () => {
  const now = new Date("2026-07-18T14:30:00.000Z");
  assert.equal(
    isWithinReminderQuietHours({
      now,
      timezone: "UTC",
      enabled: true,
      start: "13:00",
      end: "15:00",
    }),
    true,
  );
  assert.equal(
    isWithinReminderQuietHours({
      now,
      timezone: "UTC",
      enabled: false,
      start: "13:00",
      end: "15:00",
    }),
    false,
  );
});
