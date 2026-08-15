import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  FEATURE_HEAD,
  FEATURE_TREE,
  HARNESS_PATHS,
  QA_PROJECT_REF,
  SCENARIOS,
  classifyEnvironment,
  createPartnerMetadata,
  databaseUrlTargetsProject,
  emptyScenarioResults,
  redactEvidence,
} from "./pooled-settlement-qa-contract.mjs";

const harness = readFileSync(".github/scripts/pooled-settlement-qa-e2e.mjs", "utf8");
const workflow = readFileSync(
  ".github/workflows/pooled-settlement-authenticated-e2e-20260814.yml",
  "utf8",
);

const readyEnvironment = {
  NEXT_PUBLIC_SUPABASE_URL: `https://${QA_PROJECT_REF}.supabase.co`,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "qa-publishable-placeholder",
  SUPABASE_SERVICE_ROLE_KEY: "qa-service-placeholder",
  QA_SUPABASE_DB_URL: `postgresql://postgres:placeholder@db.${QA_PROJECT_REF}.supabase.co:5432/postgres?sslmode=require`,
  QA_TEST_PASSWORD: "long-qa-password-placeholder",
  QA_STRIPE_SECRET_KEY: "sk_test_placeholder",
  QA_STRIPE_PUBLISHABLE_KEY: "pk_test_placeholder",
  QA_STRIPE_WEBHOOK_SECRET: "whsec_placeholder",
  QA_EVERY_ORG_WEBHOOK_TOKEN: "qa-staging-webhook-token",
  QA_EVERY_ORG_WEBHOOK_PATH_SECRET: "p".repeat(32),
  QA_EVERY_ORG_PARTNER_METADATA_SECRET: "m".repeat(32),
};

test("preflight is fail-closed when the six QA provider secrets are absent", () => {
  const result = classifyEnvironment({
    ...readyEnvironment,
    QA_STRIPE_SECRET_KEY: "",
    QA_STRIPE_PUBLISHABLE_KEY: "",
    QA_STRIPE_WEBHOOK_SECRET: "",
    QA_EVERY_ORG_WEBHOOK_TOKEN: "",
    QA_EVERY_ORG_WEBHOOK_PATH_SECRET: "",
    QA_EVERY_ORG_PARTNER_METADATA_SECRET: "",
  });
  assert.equal(result.coreReady, true);
  assert.equal(result.authenticatedE2EReady, false);
  assert.equal(result.missingProvider.length, 6);
  assert.deepEqual(result.unsafe, []);
});

test("preflight accepts only the canonical QA target and test/staging credentials", () => {
  const result = classifyEnvironment(readyEnvironment);
  assert.equal(result.authenticatedE2EReady, true);
  assert.deepEqual(result.unsafe, []);

  const unsafe = classifyEnvironment({
    ...readyEnvironment,
    QA_STRIPE_SECRET_KEY: "sk_live_forbidden",
    NEXT_PUBLIC_SUPABASE_URL: "https://jnpoxvalyjtdghnperyu.supabase.co",
  });
  assert.equal(unsafe.authenticatedE2EReady, false);
  assert.ok(unsafe.unsafe.some((message) => /production Supabase/i.test(message)));
  assert.ok(unsafe.unsafe.some((message) => /test-mode key|live Stripe/i.test(message)));
});

test("database URL binding accepts direct and Supavisor QA URLs and rejects wrong targets", () => {
  const direct = `postgresql://postgres:placeholder@db.${QA_PROJECT_REF}.supabase.co:5432/postgres?sslmode=require`;
  const pooler = `postgresql://postgres.${QA_PROJECT_REF}:placeholder@aws-0-us-west-1.pooler.supabase.com:6543/postgres?sslmode=require`;
  assert.equal(databaseUrlTargetsProject(direct, QA_PROJECT_REF), true);
  assert.equal(databaseUrlTargetsProject(pooler, QA_PROJECT_REF), true);
  assert.equal(
    databaseUrlTargetsProject(
      "postgresql://postgres.jnpoxvalyjtdghnperyu:placeholder@aws-0-us-west-1.pooler.supabase.com:6543/postgres",
      QA_PROJECT_REF,
    ),
    false,
  );
  assert.equal(databaseUrlTargetsProject("not-a-database-url", QA_PROJECT_REF), false);
  assert.equal(classifyEnvironment({ ...readyEnvironment, QA_SUPABASE_DB_URL: pooler }).authenticatedE2EReady, true);
});

test("sanitized evidence redacts secrets, credentials, and signed material", () => {
  const redacted = redactEvidence({
    password: "never-record",
    nested: { authorization: "Bearer never-record", value: "sk_test_never-record" },
  });
  assert.equal(redacted.password, "[REDACTED]");
  assert.equal(redacted.nested.authorization, "[REDACTED]");
  assert.equal(redacted.nested.value, "[REDACTED]never-record");
});

test("Every.org partner metadata is deterministic and bound to bundle identity", () => {
  const input = {
    bundleId: "00000000-0000-4000-8000-000000000001",
    manifestHash: "a".repeat(64),
    partnerDonationId: "00000000-0000-4000-8000-000000000002",
    metadataSecret: "m".repeat(32),
  };
  const first = createPartnerMetadata(input);
  const second = createPartnerMetadata(input);
  assert.deepEqual(first, second);
  assert.match(first.signature, /^[0-9a-f]{64}$/);
  assert.notEqual(
    first.signature,
    createPartnerMetadata({ ...input, partnerDonationId: "00000000-0000-4000-8000-000000000003" }).signature,
  );
});

test("the report contract contains every numbered runbook scenario and blocked output is truthful", () => {
  assert.equal(SCENARIOS.length, 19);
  assert.deepEqual(SCENARIOS.map(({ id }) => id), Array.from({ length: 19 }, (_, index) => index + 1));
  const blocked = emptyScenarioResults();
  assert.equal(blocked.length, 19);
  assert.ok(blocked.every(({ status, actual }) => status === "blocked" && /Not run/i.test(actual)));
  for (const { id } of SCENARIOS.filter(({ id }) => ![12, 13, 14].includes(id))) {
    assert.match(harness, new RegExp(`scenario\\(${id}\\)\\.pass`));
  }
  assert.match(harness, /scenario\(id\)\.pass/);
  for (const id of [12, 13, 14]) assert.match(harness, new RegExp(`id: ${id}`));
});

test("the executable harness uses actual AAL2, responsive browsers, signed routes, and scoped cleanup", () => {
  assert.match(harness, /auth\.mfa\.enroll/);
  assert.match(harness, /auth\.mfa\.challenge/);
  assert.match(harness, /auth\.mfa\.verify/);
  assert.match(harness, /currentLevel, "aal2"/);
  assert.match(harness, /width: 1440/);
  assert.match(harness, /width: 390/);
  assert.match(harness, /generateTestHeaderString/);
  assert.match(harness, /\/api\/stripe\/webhook/);
  assert.match(harness, /staging\.every\.org/);
  assert.match(harness, /session_replication_role = replica/);
  assert.match(harness, /where id = any\(\$\{obligationIds\}\)/);
  assert.match(harness, /databaseUrlTargetsProject/);
  assert.match(harness, /baselinePoolCounts = baselineCounts/);
  assert.match(harness, /poolCountsEqual\(cleanupCounts, baselinePoolCounts\)/);
  assert.doesNotMatch(harness, /Object\.values\(cleanupCounts\)\.every\(\(count\) => count === 0\)/);
  assert.doesNotMatch(harness, /sk_live_|pk_live_|rk_live_/);
});

test("workflow is pinned to the validated feature parent and exposes no generic-secret fallback", () => {
  assert.match(workflow, new RegExp(FEATURE_HEAD));
  assert.match(workflow, new RegExp(FEATURE_TREE));
  for (const file of HARNESS_PATHS) assert.match(workflow, new RegExp(file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  for (const key of [
    "QA_STRIPE_SECRET_KEY",
    "QA_STRIPE_PUBLISHABLE_KEY",
    "QA_STRIPE_WEBHOOK_SECRET",
    "QA_EVERY_ORG_WEBHOOK_TOKEN",
    "QA_EVERY_ORG_WEBHOOK_PATH_SECRET",
    "QA_EVERY_ORG_PARTNER_METADATA_SECRET",
  ]) {
    assert.match(workflow, new RegExp(`secrets\\.${key}`));
  }
  assert.doesNotMatch(workflow, /secrets\.(STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET|EVERY_ORG_WEBHOOK_TOKEN)\b/);
  assert.match(workflow, /permissions:\s*\n\s*contents: read/);
  assert.match(workflow, /if: needs\.source\.outputs\.ready == 'true'/);
  assert.match(workflow, /secrets\.QA_SUPABASE_DB_URL/);
  assert.match(workflow, /secrets\.QA_TEST_PASSWORD/);
  assert.match(workflow, /https:\/\/hvmxfjjbdcgjjudmthdz\.supabase\.co/);
  assert.doesNotMatch(workflow, /secrets\.(QA_SUPABASE_URL|QA_DATABASE_URL|QA_E2E_PASSWORD)/);
});
