import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath =
  "supabase/migrations/20260812073000_mpgf_dac_terminal_event_constraint_reconciliation.sql";
const terminalMigrationPath =
  "supabase/migrations/20260807050000_mpgf_dac_success_lapse.sql";

async function read(path: string) {
  return readFile(path, "utf8");
}

test("latest reconciliation migration preserves the complete terminal lifecycle vocabulary", async () => {
  const [migration, terminalMigration] = await Promise.all([
    read(migrationPath),
    read(terminalMigrationPath),
  ]);

  assert.match(migration, /^begin;/);
  assert.match(migration, /commit;\s*$/);
  assert.match(
    migration,
    /drop constraint if exists mpgf_pool_lifecycle_events_event_type_check/,
  );
  assert.match(
    migration,
    /add constraint mpgf_pool_lifecycle_events_event_type_check[\s\S]*'review_started'[\s\S]*'pool_published'[\s\S]*'pool_succeeded'[\s\S]*'pool_lapsed'/,
  );
  assert.match(
    migration,
    /exactly-once succeeded\/lapsed DAC lifecycle events/,
  );

  for (const eventType of ["pool_succeeded", "pool_lapsed"]) {
    assert.ok(
      terminalMigration.includes(`'${eventType}'`),
      `The reconciliation must preserve the terminal migration event ${eventType}.`,
    );
  }
});

test("reconciliation is schema-only and cannot create payment or settlement behavior", async () => {
  const migration = await read(migrationPath);

  assert.doesNotMatch(
    migration,
    /insert\s+into|update\s+public\.|delete\s+from|payment_intent|stripe|mandate|authorize|capture|settle|payout/i,
  );
});
