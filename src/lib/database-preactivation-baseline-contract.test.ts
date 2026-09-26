import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

function findTopLevelApplicationDataStatements(sql: string): string[] {
  const dollarQuote = /\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/g;
  const topLevelDml = /^\s*(COPY|INSERT\s+INTO|UPDATE|DELETE\s+FROM|TRUNCATE(?:\s+TABLE)?)\s+(?:ONLY\s+)?(?:(?:"public"|"moral_trade_private")|(?:public|moral_trade_private))\./i;
  let activeDollarQuote: string | null = null;
  const violations: string[] = [];
  for (const [index, line] of sql.split(/\r?\n/).entries()) {
    if (activeDollarQuote === null) {
      const match = topLevelDml.exec(line);
      if (match) violations.push(`line ${index + 1}: ${match[1].toUpperCase()}`);
    }
    dollarQuote.lastIndex = 0;
    for (const match of line.matchAll(dollarQuote)) {
      const token = match[0];
      if (activeDollarQuote === null) activeDollarQuote = token;
      else if (token === activeDollarQuote) activeDollarQuote = null;
    }
  }
  assert.equal(activeDollarQuote, null, "dollar-quoted body must terminate");
  return violations;
}

const root = "supabase/baseline/pre_activation";
const manifest = JSON.parse(readFileSync(`${root}/manifest.json`, "utf8")) as {
  baseline_id: string;
  boundary: string;
  cutover: { next_migration: string; legacy_migrations_replayed_after_baseline: string[] };
  files: Record<string, string>;
  scope: { excludes: string[]; cross_schema_objects: string[] };
};

function digest(path: string) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

test("pre-activation baseline manifest binds every authoritative artifact", () => {
  assert.match(manifest.baseline_id, /^moraltrade-pre-activation-production-/);
  assert.equal(manifest.boundary, "pre_activation");
  assert.equal(manifest.cutover.next_migration, "20260814042516_account_activation_stage.sql");
  assert.deepEqual(manifest.cutover.legacy_migrations_replayed_after_baseline, []);
  for (const [name, expected] of Object.entries(manifest.files)) {
    assert.equal(digest(`${root}/${name}`), expected, name);
  }
});

test("pre-activation baseline is data-free, guarded, portable, and activation-free", () => {
  const sql = readFileSync(`${root}/schema.sql`, "utf8");
  assert.match(sql, /Pre-activation baseline requires an empty application schema/);
  assert.match(sql, /set local check_function_bodies = false;/);
  assert.deepEqual(findTopLevelApplicationDataStatements(sql), []);
  assert.doesNotMatch(sql, /activation_stage/);
  assert.doesNotMatch(sql, /complete_(?:walkthrough|profile)_activation_v1/);
  assert.doesNotMatch(sql, /^\\(?:un)?restrict\b/m);
  assert.match(sql, /CREATE TRIGGER on_auth_profile_created/i);
  assert.match(sql, /ON auth\.users/i);
  assert.doesNotMatch(sql, /postgres(?:ql)?:\/\//);
  assert.doesNotMatch(sql, /eyJ[A-Za-z0-9_-]{20,}/);
  assert.ok(manifest.scope.excludes.includes("table data"));
  assert.ok(manifest.scope.excludes.includes("Auth user data"));
  assert.ok(manifest.scope.cross_schema_objects.includes("application-owned triggers on auth.users"));
});
