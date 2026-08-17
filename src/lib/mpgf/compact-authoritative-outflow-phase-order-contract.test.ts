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
    /grep -Ev '\/2026081614150\[0-3\]_compact_authoritative_outflow_\.\*\\\.sql\$'/,
  );
  assert.match(workflow, /test "\$\(wc -l < compact-outflow-clean\/ledger-migrations\.txt\)" -eq 4/);
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
});
