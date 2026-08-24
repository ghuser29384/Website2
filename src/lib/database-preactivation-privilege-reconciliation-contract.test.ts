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
const sequenceReconciliation = readFileSync(
  "scripts/database/preactivation-sequence-privilege-reconciliation.sql",
  "utf8",
);
const policyCatalog = readFileSync(
  "scripts/database/preactivation-policy-catalog.sql",
  "utf8",
);
const policyDefinitions = readFileSync(
  "scripts/database/preactivation-policy-definitions.sql",
  "utf8",
);
const generatorPreparation = readFileSync(
  "scripts/database/prepare-preactivation-generator.py",
  "utf8",
);
const validatorPreparation = readFileSync(
  "scripts/database/prepare-preactivation-validator.py",
  "utf8",
);

test("pre-activation generator appends authoritative privilege reconciliation before auth triggers", () => {
  assert.match(generator, /PRIVILEGE_RECONCILIATION=/);
  assert.match(generator, /SEQUENCE_PRIVILEGE_RECONCILIATION=/);
  assert.match(generator, /preactivation-privilege-reconciliation\.sql/);
  assert.match(generator, /preactivation-sequence-privilege-reconciliation\.sql/);
  assert.match(generator, /preactivation-policy-catalog\.sql/);
  assert.match(generator, /cat "\$PRIVILEGE_RECONCILIATION" >> "\$BASELINE_TMP"/);
  assert.match(generator, /cat "\$SEQUENCE_PRIVILEGE_RECONCILIATION" >> "\$BASELINE_TMP"/);
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

test("sequence privilege reconciliation preserves usage, select, and update without target-default leakage", () => {
  assert.match(sequenceReconciliation, /REVOKE ALL PRIVILEGES ON SEQUENCE/);
  assert.match(sequenceReconciliation, /has_sequence_privilege/);
  assert.match(sequenceReconciliation, /'USAGE'/);
  assert.match(sequenceReconciliation, /'SELECT'/);
  assert.match(sequenceReconciliation, /'UPDATE'/);
  assert.match(sequenceReconciliation, /PUBLIC, anon, authenticated, service_role/);
});

test("policy catalog treats policy role order as semantically irrelevant", () => {
  assert.match(policyCatalog, /string_agg\(role_name, ',' order by role_name\)/);
  assert.match(policyCatalog, /from unnest\(roles\) as role_name/);
  assert.match(policyCatalog, /where schemaname in \('public', 'moral_trade_private'\)/);
});

test("policy diagnostics preserve exact source and target definitions without user data", () => {
  assert.match(policyDefinitions, /coalesce\(qual, ''\) as using_expression/);
  assert.match(policyDefinitions, /coalesce\(with_check, ''\) as with_check_expression/);
  assert.match(policyDefinitions, /string_agg\(role_name, ',' order by role_name\)/);
  assert.match(generatorPreparation, /SOURCE_POLICY_DEFINITIONS/);
  assert.match(generatorPreparation, /source-policy-definitions\.tsv/);
  assert.match(validatorPreparation, /TARGET_POLICY_DEFINITIONS/);
  assert.match(validatorPreparation, /target-policy-definitions\.tsv/);
});
