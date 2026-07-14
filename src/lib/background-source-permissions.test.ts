import assert from "node:assert/strict";
import test from "node:test";

import {
  BACKGROUND_SOURCE_RETENTION_DAY_OPTIONS,
  formatBackgroundSourcePermissionFieldLabel,
  hasActiveBackgroundSourcePermission,
  normalizeBackgroundSourcePermissionFields,
  resolveBackgroundSourceSummaryFieldScope,
  validateBackgroundSourceSummaryRetentionScope,
  validateBackgroundSourcePermission,
} from "@/lib/background-source-permissions";

test("source permission fields normalize to the supported connector lattice", () => {
  assert.deepEqual(
    normalizeBackgroundSourcePermissionFields([
      "cause_priorities",
      "unknown",
      "cause_priorities",
      "verification_preferences",
    ]),
    ["cause_priorities", "verification_preferences"],
  );
  assert.equal(formatBackgroundSourcePermissionFieldLabel("cause_priorities"), "Cause priorities");
});

test("active external source permissions require scope, consent notes, fields, and retention", () => {
  const invalid = validateBackgroundSourcePermission({
    accessScope: "all",
    accessStatus: "connected",
    allowedFieldKeys: [],
    consentNotes: "too short",
    provider: "email",
    retentionDays: "14",
  });
  const valid = validateBackgroundSourcePermission({
    accessScope: "Manual summary only",
    accessStatus: "needs_review",
    allowedFieldKeys: ["cause_priorities", "capability_tags"],
    consentNotes: "Use only the summary approved on this screen.",
    now: new Date("2026-05-31T00:00:00Z"),
    provider: "blog",
    retentionDays: 90,
  });

  assert.ok(invalid.errors.some((error) => error.includes("access scope")));
  assert.ok(invalid.errors.some((error) => error.includes("consent notes")));
  assert.ok(invalid.errors.some((error) => error.includes("broad field")));
  assert.ok(invalid.errors.some((error) => error.includes("retention window")));
  assert.deepEqual(valid.errors, []);
  assert.equal(valid.retentionExpiresAt, "2026-08-29T00:00:00.000Z");
});

test("source connector permissions forbid raw ingestion and revoke AI shadow mode with access", () => {
  const result = validateBackgroundSourcePermission({
    accessStatus: "revoked",
    aiShadowModeAllowed: true,
    allowedFieldKeys: ["cause_priorities"],
    rawIngestionAllowed: true,
    retentionDays: BACKGROUND_SOURCE_RETENTION_DAY_OPTIONS[0],
  });

  assert.equal(result.rawIngestionAllowed, false);
  assert.ok(result.errors.some((error) => error.includes("Raw connector ingestion")));
  assert.ok(result.errors.some((error) => error.includes("revoked or expired source")));
});

test("source permissions are active only while scoped, unexpired, and not revoked", () => {
  const now = new Date("2026-05-31T00:00:00Z");

  assert.equal(
    hasActiveBackgroundSourcePermission(
      {
        access_status: "connected",
        allowed_field_keys: ["cause_priorities"],
        retention_expires_at: "2026-06-01T00:00:00.000Z",
      },
      now,
    ),
    true,
  );
  assert.equal(
    hasActiveBackgroundSourcePermission(
      {
        access_status: "revoked",
        allowed_field_keys: ["cause_priorities"],
        retention_expires_at: "2026-06-01T00:00:00.000Z",
      },
      now,
    ),
    false,
  );
  assert.equal(
    hasActiveBackgroundSourcePermission(
      {
        access_status: "expired",
        allowed_field_keys: ["cause_priorities"],
        retention_expires_at: "2026-06-01T00:00:00.000Z",
      },
      now,
    ),
    false,
  );
  assert.equal(
    hasActiveBackgroundSourcePermission(
      {
        access_status: "connected",
        allowed_field_keys: ["cause_priorities"],
        retention_expires_at: "2026-05-30T00:00:00.000Z",
      },
      now,
    ),
    false,
  );
});

test("source summary field scope stays inside active connection permissions", () => {
  const now = new Date("2026-05-31T00:00:00Z");
  const scoped = resolveBackgroundSourceSummaryFieldScope({
    now,
    requestedFieldKeys: ["cause_priorities", "verification_preferences", "unknown"],
    sourceConnection: {
      access_status: "connected",
      allowed_field_keys: ["cause_priorities", "capability_tags"],
      retention_expires_at: "2026-06-01T00:00:00.000Z",
    },
  });
  const expired = resolveBackgroundSourceSummaryFieldScope({
    now,
    requestedFieldKeys: ["cause_priorities"],
    sourceConnection: {
      access_status: "connected",
      allowed_field_keys: ["cause_priorities"],
      retention_expires_at: "2026-05-30T00:00:00.000Z",
    },
  });

  assert.deepEqual(scoped.allowedFieldKeys, ["cause_priorities"]);
  assert.ok(scoped.errors.some((error) => error.includes("Verification preferences")));
  assert.ok(expired.errors.some((error) => error.includes("inactive")));
});

test("source summary field scope allows manual summaries without a selected connection", () => {
  const scope = resolveBackgroundSourceSummaryFieldScope({
    requestedFieldKeys: ["cause_priorities", "capability_tags", "unknown"],
  });

  assert.deepEqual(scope.allowedFieldKeys, ["cause_priorities", "capability_tags"]);
  assert.deepEqual(scope.errors, []);
});

test("source summary retention cannot outlive selected source permission", () => {
  assert.deepEqual(
    validateBackgroundSourceSummaryRetentionScope({
      sourceConnection: {
        access_status: "connected",
        allowed_field_keys: ["cause_priorities"],
        retention_expires_at: "2026-06-30T00:00:00.000Z",
      },
      summaryRetentionExpiresAt: "2026-08-29T00:00:00.000Z",
    }),
    ["Source-summary retention cannot outlive the selected source connection permission."],
  );

  assert.deepEqual(
    validateBackgroundSourceSummaryRetentionScope({
      sourceConnection: {
        access_status: "connected",
        allowed_field_keys: ["cause_priorities"],
        retention_expires_at: "2026-06-30T00:00:00.000Z",
      },
      summaryRetentionExpiresAt: "2026-06-30T00:00:00.000Z",
    }),
    [],
  );
});
