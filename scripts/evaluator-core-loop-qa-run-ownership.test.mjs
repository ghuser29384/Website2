#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const paths = {
  cleanup: "supabase/tests/evaluator_core_loop_browser_cleanup.sql",
  fixture: "supabase/tests/evaluator_core_loop_browser_fixture.sql",
  preflight: "supabase/tests/evaluator_core_loop_browser_preflight.sql",
  authorization: "supabase/tests/evaluator_core_loop_evidence_authorization.sql",
  browser: "tests/evaluator-core-loop-authenticated.spec.ts",
  namespace: "scripts/evidence-payment-qa-namespace.mjs",
  workflow: ".github/workflows/evidence-payment-release-qa.yml",
};

function source(path) {
  return readFileSync(path, "utf8");
}

function stripSqlComments(sql) {
  return sql
    .replace(/--[^\n]*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
}

const staticIdentityPattern =
  /(?:81000000-|82000000-|83000000-|evaluator-core-loop-[a-z-]+@qa\.invalid)/i;
const requiredRoleBindings = [
  "EVIDENCE_PAYMENT_QA_PAYER_ID",
  "EVIDENCE_PAYMENT_QA_PAYEE_ID",
  "EVIDENCE_PAYMENT_QA_REVIEWER_ID",
  "EVIDENCE_PAYMENT_QA_APPEAL_REVIEWER_ID",
  "EVIDENCE_PAYMENT_QA_OUTSIDER_ID",
  "EVIDENCE_PAYMENT_QA_ADMIN_ID",
];
const requiredEmailBindings = [
  "EVIDENCE_PAYMENT_QA_PAYER_EMAIL",
  "EVIDENCE_PAYMENT_QA_PAYEE_EMAIL",
  "EVIDENCE_PAYMENT_QA_REVIEWER_EMAIL",
  "EVIDENCE_PAYMENT_QA_APPEAL_REVIEWER_EMAIL",
  "EVIDENCE_PAYMENT_QA_OUTSIDER_EMAIL",
  "EVIDENCE_PAYMENT_QA_ADMIN_EMAIL",
];

test("all evaluator fixture surfaces are free of permanent static identities", () => {
  for (const path of [
    paths.preflight,
    paths.fixture,
    paths.cleanup,
    paths.authorization,
    paths.browser,
  ]) {
    assert.doesNotMatch(source(path), staticIdentityPattern, path);
  }
});

test("the namespace binds six unique roles and a dedicated milestone appeal", () => {
  const namespace = source(paths.namespace);
  for (const role of [
    '["payer", "PAYER"]',
    '["payee", "PAYEE"]',
    '["reviewer", "REVIEWER"]',
    '["appeal-reviewer", "APPEAL_REVIEWER"]',
    '["outsider", "OUTSIDER"]',
    '["administrator", "ADMIN"]',
  ]) {
    assert.ok(namespace.includes(role), `missing namespace role ${role}`);
  }
  assert.match(namespace, /\["milestone-appeal", "MILESTONE_APPEAL_ID"\]/);
});

test("preflight is read-only and exact", () => {
  const preflight = stripSqlComments(source(paths.preflight));
  assert.doesNotMatch(preflight, /\b(?:insert|update|delete|truncate|alter|drop|create)\b/i);
  for (const binding of [...requiredRoleBindings, "EVIDENCE_PAYMENT_QA_OFFER_ID"]) {
    assert.ok(source(paths.preflight).includes(binding), `preflight missing ${binding}`);
  }
  assert.doesNotMatch(preflight, /\blike\b|\border\s+by\b|\blimit\b/i);
});

test("fixture creates only exact run-owned identities and never repairs old state", () => {
  const fixture = stripSqlComments(source(paths.fixture));
  assert.doesNotMatch(fixture, /\bdelete\b|\btruncate\b|\bdrop\b/i);
  for (const binding of [...requiredRoleBindings, ...requiredEmailBindings]) {
    assert.ok(source(paths.fixture).includes(binding), `fixture missing ${binding}`);
  }
  assert.match(fixture, /qa_namespace/i);
  assert.match(fixture, /maximum financial amount is \$0/i);
});

test("cleanup is exact, idempotent, and cannot discover another run", () => {
  const cleanup = stripSqlComments(source(paths.cleanup));
  for (const binding of [...requiredRoleBindings, ...requiredEmailBindings, "EVIDENCE_PAYMENT_QA_OFFER_ID"]) {
    assert.ok(source(paths.cleanup).includes(binding), `cleanup missing ${binding}`);
  }
  assert.doesNotMatch(cleanup, /\blike\b|\bilike\b|\border\s+by\b|\blimit\b|\boffset\b/i);
  assert.doesNotMatch(cleanup, /substring|left\s*\(|right\s*\(|split_part|regexp/i);
  assert.match(cleanup, /performanceBonds/);
  assert.match(cleanup, /externalPaymentReceipts/);
});

test("authorization proves distinct initial and appeal reviewer states", () => {
  const authorization = source(paths.authorization);
  for (const binding of requiredRoleBindings) {
    assert.ok(authorization.includes(binding), `authorization missing ${binding}`);
  }
  assert.match(authorization, /EVIDENCE_PAYMENT_QA_MILESTONE_APPEAL_ID/);
  assert.match(authorization, /distinctReviewerIds/);
  assert.match(authorization, /revokedAppealReviewerAal2/);
  assert.match(authorization, /retainedInitialReviewerAal2AfterDecision/);
  assert.match(authorization, /rollback;/i);
});

test("browser flow consumes run-owned bindings and keeps reviewers distinct", () => {
  const browser = source(paths.browser);
  for (const binding of [
    ...requiredRoleBindings,
    ...requiredEmailBindings,
    "EVIDENCE_PAYMENT_QA_OFFER_ID",
  ]) {
    assert.ok(browser.includes(binding), `browser test missing ${binding}`);
  }
  assert.match(browser, /appealReviewer/);
  assert.match(browser, /not\.toBe\(IDS\.reviewer\)/);
});

test("workflow remains isolated-QA-only and contains no production or provider rail", () => {
  const workflow = source(paths.workflow);
  assert.match(workflow, /EXPECTED_QA_REF:\s*hvmxfjjbdcgjjudmthdz/);
  assert.match(workflow, /QA_SUPABASE_DB_URL/);
  assert.doesNotMatch(workflow, /vercel\s+(?:deploy|promote)|stripe|every\.org|production deployment/i);
  assert.match(workflow, /permissions:\s*\n\s*contents:\s*read/);
});
