import assert from "node:assert/strict";
import test from "node:test";

import {
  assertBackgroundNotificationCopyIsSafe,
  buildBackgroundHelperRunFingerprint,
  buildBackgroundHelperRunRow,
  buildBackgroundOpportunityNotificationCopy,
  buildBackgroundSourceSyncJobRow,
  nextBackgroundHelperRunDelaySeconds,
  normalizeBackgroundHelperRunTriggerKind,
} from "@/lib/background-helper-runs";

test("helper-run fingerprints are stable and do not store raw queries", () => {
  const first = buildBackgroundHelperRunFingerprint({
    profileId: "profile-1",
    query: { cause: "animal welfare", filters: ["remote", "receipts"] },
    triggerKind: "manual_scan",
    windowKey: "2026-06-05",
  });
  const second = buildBackgroundHelperRunFingerprint({
    profileId: "profile-1",
    query: { filters: ["remote", "receipts"], cause: "animal welfare" },
    triggerKind: "manual_scan",
    windowKey: "2026-06-05",
  });
  const row = buildBackgroundHelperRunRow({
    profileId: "profile-1",
    query: { cause: "animal welfare" },
    triggerKind: "manual_scan",
    windowKey: "2026-06-05",
  });

  assert.equal(first, second);
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.equal(row.profile_id, "profile-1");
  assert.equal(row.trigger_kind, "manual_scan");
  assert.equal("query" in row, false);
});

test("helper-run retry delay uses capped full jitter", () => {
  assert.equal(nextBackgroundHelperRunDelaySeconds({ attempts: 0, random: () => 0 }), 1);
  assert.equal(nextBackgroundHelperRunDelaySeconds({ attempts: 1, random: () => 0.5 }), 15);
  assert.equal(nextBackgroundHelperRunDelaySeconds({ attempts: 20, random: () => 1 }), 3600);
});

test("helper-run trigger and source sync rows normalize bg17 scope", () => {
  assert.equal(normalizeBackgroundHelperRunTriggerKind("new_summary"), "new_summary");
  assert.equal(normalizeBackgroundHelperRunTriggerKind("raw_feed_scan"), null);

  const row = buildBackgroundSourceSyncJobRow({
    profileId: "profile-1",
    sourceConnectionId: "source-1",
  });

  assert.equal(row.profile_id, "profile-1");
  assert.equal(row.source_connection_id, "source-1");
  assert.equal(row.state, "queued");
});

test("helper opportunity notification copy is generic and safe", () => {
  const copy = buildBackgroundOpportunityNotificationCopy();
  const rendered = `${copy.subject}\n${copy.title}\n${copy.body}`;

  assert.equal(assertBackgroundNotificationCopyIsSafe(copy), true);
  assert.match(rendered, /privacy-safe opportunity brief/i);
  assert.doesNotMatch(rendered, /exact private wish|alice@example\.org|source note:/i);
});
