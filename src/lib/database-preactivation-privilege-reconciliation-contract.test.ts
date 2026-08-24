import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const generator = readFileSync(
  "scripts/database/generate-preactivation-baseline.sh",
  "utf8",
);
const reconciliation = readFileSync(
  "scripts/database/preactivation-privilege-reconciliation.sql",
  "utf8",
);

test("pre-activation generator appends authoritative privilege reconciliation before auth triggers", () => {
  assert.match(generator, /PRIVILEGE_RECONCILIATION=/);
  assert.match(generator, /preactivation-privilege-reconciliation\.sql/);
  assert.match(generator, /cat "\$PRIVILEGE_RECONCILIATION" >> "\$BASELINE_TMP"/);
  assert.match(generator, /-- Reconcile application privileges after portable no-owner replay\./);
  assert.doesNotMatch(generator, /E'\\\\n'/);
  assert.match(generator, /E'\\n'/);
});

test("privilege reconciliation fails closed and covers schema, relation, column, and function rights", () => {
  assert.match(reconciliation, /REVOKE ALL PRIVILEGES ON SCHEMA/);
  assert.match(reconciliation, /REVOKE ALL PRIVILEGES ON TABLE/);
  assert.match(reconciliation, /REVOKE %s \(%s\) ON TABLE/);
  assert.match(reconciliation, /REVOKE ALL PRIVILEGES ON FUNCTION/);
  assert.match(reconciliation, /has_schema_privilege/);
  assert.match(reconciliation, /has_table_privilege/);
  assert.match(reconciliation, /has_column_privilege/);
  assert.match(reconciliation, /has_function_privilege/);
  assert.match(reconciliation, /PUBLIC, anon, authenticated, service_role/);
  assert.match(reconciliation, /order by phase, object_key, role_order, privilege_order, statement/);
});
