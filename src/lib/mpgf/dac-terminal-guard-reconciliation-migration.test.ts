import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath =
  "supabase/migrations/20260815011000_mpgf_dac_terminal_guard_reconciliation.sql";

async function read(path: string) {
  return readFile(path, "utf8");
}

test("terminal guard reconciliation makes finalized DAC campaigns irreversible after additive replay", async () => {
  const migration = await read(migrationPath);

  assert.match(migration, /^begin;/);
  assert.match(migration, /commit;\s*$/);
  assert.match(
    migration,
    /create or replace function public\.mpgf_guard_published_pool_campaign\(\)/,
  );
  assert.match(
    migration,
    /Published pool campaign status may change only through an authorized service lifecycle/,
  );
  assert.match(
    migration,
    /A finalized DAC campaign cannot return to a nonterminal state/,
  );
  assert.match(
    migration,
    /A DAC campaign can be finalized only through the audited terminal-outcome function/,
  );
  assert.match(
    migration,
    /drop trigger if exists mpgf_public_goods_campaigns_published_terms_guard/,
  );
  assert.match(
    migration,
    /before update or delete on public\.mpgf_public_goods_campaigns[\s\S]*execute function public\.mpgf_guard_published_pool_campaign\(\)/,
  );
});

test("terminal guard reconciliation is payment-inert and changes no rows", async () => {
  const migration = await read(migrationPath);

  assert.doesNotMatch(
    migration,
    /insert\s+into|update\s+public\.|delete\s+from|payment_intent|stripe|mandate|\bauthorize\b|\bauthorization\b|\bcapture\b|\bsettle\b|\brefund\b|\bpayout\b/i,
  );
});
