import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const workflow = readFileSync(
  join(
    process.cwd(),
    ".github/workflows/compact-authoritative-outflow-ledger-qa.yml",
  ),
  "utf8",
);

const adjacentCompactWorkflow = readFileSync(
  join(process.cwd(), ".github/workflows/mpgf-public-goods-compacts-qa.yml"),
  "utf8",
);

function adjacentPosition(marker: string): number {
  const index = adjacentCompactWorkflow.indexOf(marker);
  assert.notEqual(index, -1, `Missing adjacent Compact workflow phase: ${marker}`);
  return index;
}

function position(marker: string): number {
  const index = workflow.indexOf(marker);
  assert.notEqual(index, -1, `Missing workflow phase: ${marker}`);
  return index;
}

test("clean reconstruction proves legacy Compact behavior before ledger hardening", () => {
  const preLedgerApply = position(
    "Apply baseline and every production-compatible pre-ledger migration",
  );
  const legacyRegression = position(
    "Run legacy Compact regressions before ledger authority hardening",
  );
  const ledgerApply = position(
    "Apply the four authoritative-ledger migrations in order",
  );
  const finalLedgerSuites = position(
    "Run final authoritative-ledger lifecycle and authorization suites",
  );

  assert.ok(preLedgerApply < legacyRegression);
  assert.ok(legacyRegression < ledgerApply);
  assert.ok(ledgerApply < finalLedgerSuites);
  assert.match(
    workflow,
    /ledger_skips=20260816141500_compact_authoritative_outflow_ledger_v1\.sql,20260816141501_compact_authoritative_outflow_freeze_v1\.sql,20260816141502_compact_authoritative_outflow_hardening_v1\.sql,20260816141503_compact_authoritative_outflow_replay_fix_v1\.sql/,
  );
  assert.match(
    workflow,
    /SUPABASE_MIGRATION_SKIP_BASENAMES="\$\{qa_skips\},\$\{ledger_skips\}"/,
  );

  const applyBody = workflow.slice(ledgerApply, finalLedgerSuites);
  const migrationPositions = [
    "20260816141500_compact_authoritative_outflow_ledger_v1.sql",
    "20260816141501_compact_authoritative_outflow_freeze_v1.sql",
    "20260816141502_compact_authoritative_outflow_hardening_v1.sql",
    "20260816141503_compact_authoritative_outflow_replay_fix_v1.sql",
  ].map((migration) => {
    const index = applyBody.indexOf(migration);
    assert.notEqual(index, -1, `Missing ordered ledger migration: ${migration}`);
    return index;
  });
  assert.deepEqual(migrationPositions, [...migrationPositions].sort((a, b) => a - b));
});

test("isolated QA keeps both schema phases in one outer rollback", () => {
  const orderedLifecycle = position(
    "Execute ordered rollback-only legacy and authoritative-ledger lifecycles",
  );
  const rollbackProof = position("Prove rollback and zero fixture residue");
  const orderedBody = workflow.slice(orderedLifecycle, rollbackProof);

  assert.match(orderedBody, /begin;/);
  assert.match(orderedBody, /savepoint legacy_compact_lifecycle;/);
  assert.match(
    orderedBody,
    /rollback to savepoint legacy_compact_lifecycle;/,
  );
  assert.match(
    orderedBody,
    /mpgf_public_goods_compacts_historical_freeze\.sql/,
  );
  assert.match(
    orderedBody,
    /20260816141500_compact_authoritative_outflow_ledger_v1\.sql/,
  );
  assert.match(orderedBody, /savepoint authoritative_ledger_core;/);
  assert.match(
    orderedBody,
    /rollback to savepoint authoritative_ledger_core;/,
  );
  assert.match(orderedBody, /savepoint authoritative_ledger_authorization;/);
  assert.match(
    orderedBody,
    /rollback to savepoint authoritative_ledger_authorization;/,
  );
  assert.match(
    orderedBody,
    /compact_authoritative_outflow_ledger_authorization\.sql/,
  );
  assert.match(orderedBody, /\n          rollback;\n          SQL/);

  const legacyTest = orderedBody.indexOf(
    "mpgf_public_goods_compacts_lifecycle.sql",
  );
  const firstLedgerMigration = orderedBody.indexOf(
    "20260816141500_compact_authoritative_outflow_ledger_v1.sql",
  );
  const ledgerTest = orderedBody.indexOf(
    "compact_authoritative_outflow_ledger_core.sql",
  );
  assert.ok(legacyTest >= 0 && legacyTest < firstLedgerMigration);
  assert.ok(firstLedgerMigration < ledgerTest);
});

test("rollback suites are normalized without weakening their source envelopes", () => {
  assert.match(
    workflow,
    /expected one rollback-only transaction envelope/i,
  );
  assert.match(workflow, /unexpected nested begin/i);
  assert.match(workflow, /unexpected nested rollback/i);
  assert.match(
    workflow,
    /compact-outflow-rollback\/test-bodies\/compact_authoritative_outflow_ledger_core\.sql/,
  );
  assert.match(workflow, /test-body-manifest\.json/);
  assert.match(workflow, /sourceSha256/);
  assert.match(workflow, /bodySha256/);
});

test("adjacent Compact QA runs legacy regressions before ledger authority hardening", () => {
  const preLedgerApply = adjacentPosition(
    "Apply historical baseline and production-compatible pre-ledger migrations in order",
  );
  const legacyRegression = adjacentPosition(
    "Run legacy role, lifecycle, privacy, and no-money tests before ledger authority hardening",
  );
  const legacyConcurrency = adjacentPosition(
    "Run genuinely concurrent readiness freeze test before ledger authority hardening",
  );
  const ledgerApply = adjacentPosition(
    "Apply the four authoritative-ledger migrations after legacy Compact validation",
  );
  const finalTypes = adjacentPosition(
    "Generate and compare exact final runtime database types",
  );
  const finalNoMoney = adjacentPosition(
    "Prove final schema preserved no-activation and no-money boundaries",
  );

  assert.ok(preLedgerApply < legacyRegression);
  assert.ok(legacyRegression < legacyConcurrency);
  assert.ok(legacyConcurrency < ledgerApply);
  assert.ok(ledgerApply < finalTypes);
  assert.ok(finalTypes < finalNoMoney);
  assert.match(
    adjacentCompactWorkflow,
    /ledger_skips=20260816141500_compact_authoritative_outflow_ledger_v1\.sql,20260816141501_compact_authoritative_outflow_freeze_v1\.sql,20260816141502_compact_authoritative_outflow_hardening_v1\.sql,20260816141503_compact_authoritative_outflow_replay_fix_v1\.sql/,
  );
  assert.match(adjacentCompactWorkflow, /skipped_environment_bound_migration_count=12/);
  assert.match(
    adjacentCompactWorkflow,
    /test "\$\(wc -l < mpgf-compacts-clean-qa\/final-no-money\.txt\)" -eq 3/,
  );
});

test("piped validation gates propagate failures through tee", () => {
  for (const marker of [
    "Focused contracts",
    "Complete repository tests",
    "ESLint",
    "Strict TypeScript",
    "Production build",
    "Four-viewpoint browser contract",
    "Generate and compare public runtime types",
  ]) {
    const start = position(marker);
    const next = workflow.indexOf("\n      - name:", start + marker.length);
    const body = workflow.slice(start, next === -1 ? workflow.length : next);
    assert.match(body, /shell: bash/, `${marker} must use the Bash shell`);
    assert.match(
      body,
      /set -euo pipefail/,
      `${marker} must propagate a failing command through tee`,
    );
  }
});
