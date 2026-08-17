import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const workflow = readFileSync(
  join(root, ".github/workflows/compact-authoritative-outflow-ledger-qa.yml"),
  "utf8",
);

function position(marker: string): number {
  const index = workflow.indexOf(marker);
  assert.notEqual(index, -1, `Missing workflow phase: ${marker}`);
  return index;
}

test("clean reconstruction proves legacy Compact behavior before ledger hardening", () => {
  const preLedgerApply = position(
    "- name: Apply pre-ledger production-compatible migrations",
  );
  const legacyRegression = position(
    "- name: Validate original Compact lifecycle before ledger hardening",
  );
  const ledgerApply = position("- name: Apply authoritative ledger migrations");
  const finalLedgerSuites = position(
    "- name: Lint final schema and execute authoritative ledger lifecycle",
  );

  assert.ok(preLedgerApply < legacyRegression);
  assert.ok(legacyRegression < ledgerApply);
  assert.ok(ledgerApply < finalLedgerSuites);
  assert.match(
    workflow,
    /ledger_skips=20260816141500_compact_authoritative_outflow_ledger_v1\.sql,20260816141501_compact_authoritative_outflow_freeze_v1\.sql,20260816141502_compact_authoritative_outflow_hardening_v1\.sql,20260816141503_compact_authoritative_outflow_replay_fix_v1\.sql/,
  );
});

test("isolated QA keeps legacy and ledger phases inside one outer rollback", () => {
  const stagedLifecycle = position("- name: Execute rollback-only staged lifecycle");
  const rollbackProof = position("- name: Prove rollback and zero residue");
  const body = workflow.slice(stagedLifecycle, rollbackProof);

  assert.match(body, /begin;/);
  assert.match(body, /savepoint compact_pre_ledger_contract;/);
  assert.match(body, /rollback to savepoint compact_pre_ledger_contract;/);
  const legacyTest = body.indexOf("mpgf_public_goods_compacts_lifecycle.sql");
  const firstLedgerMigration = body.indexOf(
    "20260816141500_compact_authoritative_outflow_ledger_v1.sql",
  );
  const ledgerTest = body.indexOf(
    "compact_authoritative_outflow_ledger_core.sql",
  );
  assert.ok(legacyTest >= 0 && legacyTest < firstLedgerMigration);
  assert.ok(firstLedgerMigration < ledgerTest);
  assert.match(body, /\n          rollback;\n          SQL/);
});

test("profile fixtures tolerate the synchronous auth-to-profile trigger", () => {
  for (const file of [
    "supabase/tests/compact_authoritative_outflow_ledger_core.sql",
    "supabase/tests/compact_authoritative_outflow_ledger_authorization.sql",
  ]) {
    const source = readFileSync(join(root, file), "utf8");
    assert.match(
      source,
      /insert into public\.profiles[\s\S]*on conflict \(id\) do update set/,
    );
  }
});

test("exact-head workflow permanently runs phase-order contract and captures SQL stderr", () => {
  assert.match(
    workflow,
    /src\/lib\/mpgf\/compact-authoritative-outflow-phase-order-contract\.test\.ts/,
  );
  assert.match(workflow, /wc -l < \/tmp\/actual\.txt\)" -eq 15/);
  assert.match(
    workflow,
    /psql "\$DB_URL" --no-psqlrc --set ON_ERROR_STOP=1 2>&1 <<'SQL'/,
  );
  assert.match(
    workflow,
    /psql "\$QA_DB_URL" --no-psqlrc --set ON_ERROR_STOP=1 2>&1 <<'SQL'/,
  );
});
