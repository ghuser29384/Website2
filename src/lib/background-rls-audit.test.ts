import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getBackgroundRlsAuditContract,
  validateBackgroundRlsAuditContract,
  validateBackgroundRlsAuditSchema,
} from "@/lib/background-rls-audit";

const schemaSql = readFileSync(
  new URL("../../supabase/schema.sql", import.meta.url),
  "utf8",
);

test("background RLS audit contract covers private, participant, and audit tables", () => {
  const contract = getBackgroundRlsAuditContract();
  const tableNames = contract.tableRequirements.map((requirement) => requirement.table);

  assert.ok(tableNames.includes("wish_profiles"));
  assert.ok(tableNames.includes("match_suggestions"));
  assert.ok(tableNames.includes("privacy_grants"));
  assert.ok(tableNames.includes("match_audit_events"));
  assert.ok(tableNames.includes("source_connections"));
  assert.ok(tableNames.includes("background_intent_claims"));
  assert.ok(tableNames.includes("background_match_feedback"));
  assert.ok(contract.tableRequirements.length >= 20);
  assert.ok(contract.sensitiveStorageRequirements.length >= 5);
  assert.ok(contract.contractTests.includes("background_rls_audit_schema_smoke"));
  assert.equal(validateBackgroundRlsAuditContract(contract).status, "pass");
});

test("background RLS audit passes against the repository Supabase schema", () => {
  const validation = validateBackgroundRlsAuditSchema(schemaSql);

  assert.equal(validation.status, "pass");
  assert.deepEqual(validation.blockers, []);
  assert.ok(validation.rlsFindings.every((finding) => finding.status === "pass"));
  assert.ok(
    validation.sensitiveStorageFindings.every((finding) => finding.status === "pass"),
  );
});

test("background RLS audit fails when a private table loses row-level security", () => {
  const weakenedSchema = schemaSql.replace(
    "alter table public.privacy_grants enable row level security;",
    "-- privacy_grants RLS removed for regression test;",
  );
  const validation = validateBackgroundRlsAuditSchema(weakenedSchema);

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.includes("privacy_grants:rls-disabled"));
});

test("background RLS audit fails when participant policies are removed", () => {
  const weakenedSchema = schemaSql.replace(
    /create policy "match_suggestions_select_participants"[\s\S]*?\n\);/,
    "create policy \"match_suggestions_select_participants\"\non public.match_suggestions\nfor select\nto authenticated\nusing (true);",
  );
  const validation = validateBackgroundRlsAuditSchema(weakenedSchema);

  assert.equal(validation.status, "fail");
  assert.ok(
    validation.blockers.some((blocker) =>
      blocker.includes("match_suggestions:missing-policy-fragment:public.viewer_can_see_match_identity(id)"),
    ),
  );
});

test("background RLS audit fails when sensitive ciphertext storage is removed", () => {
  const weakenedSchema = schemaSql
    .replace("  body_ciphertext text not null default '',\n", "")
    .replace(
      "alter table public.wish_entries add column if not exists body_ciphertext text not null default '';\n",
      "",
    );
  const validation = validateBackgroundRlsAuditSchema(weakenedSchema);

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.includes("wish_entries:missing-sensitive-column:body_ciphertext"));
});
