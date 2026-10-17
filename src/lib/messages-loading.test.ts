import assert from "node:assert/strict";
import { test } from "node:test";

import { withMessagesDeadline } from "./messages-loading";

test("messages return completed data without changing it", async () => {
  const data = { threads: [{ id: "private-thread" }] };
  assert.equal(await withMessagesDeadline(async () => data), data);
});

test("a stalled messages read rejects instead of leaving a blank route", async () => {
  await assert.rejects(
    withMessagesDeadline(() => new Promise(() => {}), 10),
    /Messages loading timed out/,
  );
});

test("auth redirects and failed reads propagate without becoming empty data", async () => {
  for (const error of [new Error("NEXT_REDIRECT"), new Error("read unavailable")]) {
    await assert.rejects(withMessagesDeadline(async () => { throw error; }), (actual) => actual === error);
  }
});

test("a late failure after the deadline remains handled", async () => {
  let rejectRead!: (reason: Error) => void;
  const read = new Promise<never>((_, reject) => { rejectRead = reject; });
  await assert.rejects(withMessagesDeadline(() => read, 10), /timed out/);
  rejectRead(new Error("late upstream failure"));
  await new Promise((resolve) => setImmediate(resolve));
});
