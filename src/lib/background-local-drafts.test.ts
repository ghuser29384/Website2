import assert from "node:assert/strict";
import test from "node:test";

import {
  BACKGROUND_LOCAL_DRAFT_MAX_BODY_CHARACTERS,
  canSyncBackgroundLocalDraft,
  formatBackgroundLocalDraftSyncStatus,
  normalizeBackgroundLocalDraftBody,
} from "@/lib/background-local-drafts";

test("local background drafts trim and cap private draft text", () => {
  const normalized = normalizeBackgroundLocalDraftBody(`  ${"draft ".repeat(600)}  `);

  assert.equal(normalized.length, BACKGROUND_LOCAL_DRAFT_MAX_BODY_CHARACTERS);
  assert.ok(normalized.startsWith("draft"));
  assert.ok(!normalized.startsWith(" "));
});

test("local background draft retry states only sync explicit draft queue states", () => {
  assert.equal(canSyncBackgroundLocalDraft("draft"), true);
  assert.equal(canSyncBackgroundLocalDraft("queued"), true);
  assert.equal(canSyncBackgroundLocalDraft("failed"), true);
  assert.equal(canSyncBackgroundLocalDraft("syncing"), false);
  assert.equal(canSyncBackgroundLocalDraft("synced"), false);
});

test("local background draft sync status labels are user-safe", () => {
  assert.equal(formatBackgroundLocalDraftSyncStatus("draft"), "Local only");
  assert.equal(formatBackgroundLocalDraftSyncStatus("queued"), "Queued for sync");
  assert.equal(formatBackgroundLocalDraftSyncStatus("failed"), "Retry needed");
});
