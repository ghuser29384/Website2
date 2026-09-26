import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  EVIDENCE_PAYMENT_QA_REF,
  buildEvidencePaymentQaNamespace,
  runCli,
} from "./evidence-payment-qa-namespace.mjs";

const BASE_INPUT = {
  repository: "ghuser29384/Website2",
  workflowRef:
    "ghuser29384/Website2/.github/workflows/evidence-payment-release-qa.yml@refs/pull/721/merge",
  runId: "31899900001",
  runAttempt: "1",
  qaRef: EVIDENCE_PAYMENT_QA_REF,
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

test("derivation is deterministic, complete, valid, and collision-free", () => {
  const first = buildEvidencePaymentQaNamespace(BASE_INPUT);
  const second = buildEvidencePaymentQaNamespace(BASE_INPUT);
  assert.deepEqual(second, first);
  assert.equal(first.schemaVersion, 2);
  assert.match(first.namespace.handle, /^epqa-[0-9a-f]{24}$/);
  assert.match(first.namespace.sha256, /^[0-9a-f]{64}$/);
  assert.equal(Object.keys(first.roles).length, 6);
  assert.ok(Object.keys(first.objects).length >= 34);

  const ids = [
    ...Object.values(first.roles).map((role) => role.id),
    ...Object.values(first.objects),
  ];
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, UUID_PATTERN);

  const emails = Object.values(first.roles).map((role) => role.email);
  assert.equal(new Set(emails).size, emails.length);
  for (const email of emails) {
    assert.match(email, /^epqa-[0-9a-f]{20}-[a-z-]+@qa\.invalid$/);
    assert.doesNotMatch(email, /^evidence-payment-/);
    assert.ok(email.length <= 254);
  }
});

test("run, attempt, repository, and workflow identity independently change the namespace", () => {
  const baseline = buildEvidencePaymentQaNamespace(BASE_INPUT);
  for (const patch of [
    { runId: "31899900002" },
    { runAttempt: "2" },
    { repository: "ghuser29384/Website3" },
    {
      workflowRef:
        "ghuser29384/Website2/.github/workflows/other-writer.yml@refs/pull/721/merge",
    },
  ]) {
    const candidate = buildEvidencePaymentQaNamespace({ ...BASE_INPUT, ...patch });
    assert.notEqual(candidate.namespace.sha256, baseline.namespace.sha256);
    assert.notEqual(candidate.roles.payer.id, baseline.roles.payer.id);
    assert.notEqual(candidate.roles.payer.email, baseline.roles.payer.email);
  }
});

test("malformed or non-QA metadata fails closed before output", () => {
  for (const patch of [
    { repository: "ghuser29384/Website2;rm" },
    { workflowRef: "workflow.yml\nENV=owned" },
    { runId: "1$(touch-pwned)" },
    { runAttempt: "0" },
    { qaRef: "abcdefghijklmnopqrst" },
  ]) {
    assert.throws(
      () => buildEvidencePaymentQaNamespace({ ...BASE_INPUT, ...patch }),
      /namespace preflight failed/,
    );
  }
});

test("CLI persists a reproducible non-secret manifest and GitHub environment", () => {
  const directory = mkdtempSync(join(tmpdir(), "evidence-payment-namespace-"));
  const manifestPath = join(directory, "manifest.json");
  const githubEnvPath = join(directory, "github-env");
  const environment = {
    GITHUB_REPOSITORY: BASE_INPUT.repository,
    GITHUB_WORKFLOW_REF: BASE_INPUT.workflowRef,
    GITHUB_RUN_ID: BASE_INPUT.runId,
    GITHUB_RUN_ATTEMPT: BASE_INPUT.runAttempt,
    EXPECTED_QA_REF: BASE_INPUT.qaRef,
  };

  const first = runCli(
    ["--manifest", manifestPath, "--github-env", githubEnvPath],
    environment,
  );
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  assert.deepEqual(manifest, first);
  assert.doesNotMatch(JSON.stringify(manifest), /password|token|cookie|secret/i);

  const envText = readFileSync(githubEnvPath, "utf8");
  assert.match(envText, /EVIDENCE_PAYMENT_QA_NAMESPACE_HANDLE=epqa-/);
  assert.match(envText, /EVIDENCE_PAYMENT_QA_PAYER_EMAIL=epqa-/);
  assert.match(envText, /EVIDENCE_PAYMENT_QA_ADMIN_FALLBACK_PAYOUT_ID=/);
  assert.doesNotMatch(envText, /password|token|cookie|secret/i);

  const second = runCli(
    ["--manifest", manifestPath, "--github-env", githubEnvPath],
    environment,
  );
  assert.deepEqual(second, first);
});
