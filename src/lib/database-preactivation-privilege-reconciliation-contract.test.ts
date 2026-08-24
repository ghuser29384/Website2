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
const policyProbes = readFileSync(
  "scripts/database/preactivation-policy-probes.sql",
  "utf8",
);
const policyEquivalence = readFileSync(
  "scripts/database/preactivation-policy-equivalence.sql",
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

test("source-policy probes compare policies after both are parsed by the target PostgreSQL version", () => {
  assert.match(policyProbes, /create policy %I on %I\.%I as %s for %s to %s%s%s;/);
  assert.match(policyProbes, /__mt_baseline_probe_/);
  assert.match(policyProbes, /md5\(schemaname \|\| E'\\x1f'/);
  assert.match(policyProbes, /string_agg/);
  assert.match(policyEquivalence, /missing_or_different_probe/);
  assert.match(policyEquivalence, /unexpected_probe/);
  assert.match(policyEquivalence, /a\.qual is distinct from p\.qual/);
  assert.match(policyEquivalence, /a\.with_check is distinct from p\.with_check/);
});

test("generator and validator exclude version-sensitive policy deparsing from the main catalog", () => {
  assert.match(generatorPreparation, /SOURCE_POLICY_PROBES/);
  assert.match(generatorPreparation, /source_policy_probes\.sql/);
  assert.match(generatorPreparation, /grep -v \$'\^POLICY\\\\t'/);
  assert.match(generatorPreparation, /policy_probe_rows/);
  assert.match(validatorPreparation, /POLICY_EQUIVALENCE_SQL/);
  assert.match(validatorPreparation, /policy-equivalence\.tsv/);
  assert.match(validatorPreparation, /policy_probe_residue/);
  assert.match(validatorPreparation, /test ! -s "\$POLICY_EQUIVALENCE"/);
});
