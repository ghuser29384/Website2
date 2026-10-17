import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath =
  "supabase/migrations/20260812074500_mpgf_dac_terminal_schema_reconciliation.sql";
const terminalMigrationPath =
  "supabase/migrations/20260807050000_mpgf_dac_success_lapse.sql";

async function read(path: string) {
  return readFile(path, "utf8");
}

function constraintBlock(source: string, constraintName: string) {
  const marker = `add constraint ${constraintName}`;
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `Expected migration to add ${constraintName}.`);
  const remainder = source.slice(start);
  const end = remainder.indexOf(";\n");
  assert.ok(end >= 0, `Expected ${constraintName} to end with a semicolon.`);
  return remainder.slice(0, end + 1);
}

test("terminal schema reconciliation restores every state used by DAC finalization", async () => {
  const [migration, terminalMigration] = await Promise.all([
    read(migrationPath),
    read(terminalMigrationPath),
  ]);

  assert.match(migration, /^begin;/);
  assert.match(migration, /commit;\s*$/);

  for (const constraintName of [
    "mpgf_pool_proposals_status_check",
    "mpgf_pool_proposals_lock_complete",
    "mpgf_pool_lifecycle_events_event_type_check",
    "mpgf_dac_pledge_events_type_valid",
  ]) {
    assert.ok(
      migration.includes(`drop constraint if exists ${constraintName}`),
      `Expected migration to replace ${constraintName} idempotently.`,
    );
  }

  const statusConstraint = constraintBlock(
    migration,
    "mpgf_pool_proposals_status_check",
  );
  assert.match(statusConstraint, /'approved_as_candidate'/);
  assert.match(statusConstraint, /'succeeded'/);
  assert.match(statusConstraint, /'lapsed'/);

  const lockConstraint = constraintBlock(
    migration,
    "mpgf_pool_proposals_lock_complete",
  );
  assert.match(
    lockConstraint,
    /status in \('approved_as_candidate', 'succeeded', 'lapsed'\)/,
  );
  for (const frozenField of [
    "approved_terms_version",
    "operative_terms_sha256",
    "terms_locked_at",
    "reviewed_by",
    "reviewed_at",
  ]) {
    assert.ok(
      lockConstraint.includes(frozenField),
      `Expected terminal lock constraint to require ${frozenField}.`,
    );
  }

  const lifecycleConstraint = constraintBlock(
    migration,
    "mpgf_pool_lifecycle_events_event_type_check",
  );
  assert.match(lifecycleConstraint, /'pool_published'/);
  assert.match(lifecycleConstraint, /'pool_succeeded'/);
  assert.match(lifecycleConstraint, /'pool_lapsed'/);

  const pledgeEventConstraint = constraintBlock(
    migration,
    "mpgf_dac_pledge_events_type_valid",
  );
  assert.match(pledgeEventConstraint, /'pledge_created'/);
  assert.match(pledgeEventConstraint, /'eligibility_reviewed'/);
  assert.match(pledgeEventConstraint, /'pledge_expired'/);

  for (const terminalToken of [
    "'succeeded'",
    "'lapsed'",
    "'pool_succeeded'",
    "'pool_lapsed'",
    "'pledge_expired'",
  ]) {
    assert.ok(
      terminalMigration.includes(terminalToken),
      `The reconciliation must preserve terminal token ${terminalToken}.`,
    );
  }
});

test("terminal schema reconciliation is schema-only and cannot execute money movement", async () => {
  const migration = await read(migrationPath);

  assert.doesNotMatch(
    migration,
    /insert\s+into|update\s+public\.|delete\s+from|payment_intent|stripe|mandate|authorize|capture|settle|refund|payout/i,
  );
});
