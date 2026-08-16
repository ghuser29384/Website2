#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const EVIDENCE_PAYMENT_QA_REF = "hvmxfjjbdcgjjudmthdz";

const REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const WORKFLOW_REF_PATTERN = /^[A-Za-z0-9_.@/+\-]+$/;
const POSITIVE_INTEGER_PATTERN = /^[1-9][0-9]{0,19}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const EMAIL_PATTERN = /^[a-z0-9-]+@qa\.invalid$/;
const ENV_KEY_PATTERN = /^[A-Z][A-Z0-9_]*$/;

const ROLE_DEFINITIONS = [
  ["payer", "PAYER"],
  ["payee", "PAYEE"],
  ["reviewer", "REVIEWER"],
  ["appeal-reviewer", "APPEAL_REVIEWER"],
  ["outsider", "OUTSIDER"],
  ["administrator", "ADMIN"],
];

const OBJECT_DEFINITIONS = [
  ["private-account-payer", "PRIVATE_ACCOUNT_PAYER_ID"],
  ["private-account-payee", "PRIVATE_ACCOUNT_PAYEE_ID"],
  ["offer", "OFFER_ID"],
  ["offer-response", "OFFER_RESPONSE_ID"],
  ["agreement", "AGREEMENT_ID"],
  ["admin-fallback-agreement", "ADMIN_FALLBACK_AGREEMENT_ID"],
  ["agreement-version", "AGREEMENT_VERSION_ID"],
  ["admin-fallback-agreement-version", "ADMIN_FALLBACK_AGREEMENT_VERSION_ID"],
  ["milestone", "MILESTONE_ID"],
  ["admin-fallback-milestone", "ADMIN_FALLBACK_MILESTONE_ID"],
  ["evidence-bundle", "EVIDENCE_BUNDLE_ID"],
  ["admin-fallback-evidence-bundle", "ADMIN_FALLBACK_EVIDENCE_BUNDLE_ID"],
  ["evidence-item-initial", "EVIDENCE_ITEM_INITIAL_ID"],
  ["evidence-item-correction", "EVIDENCE_ITEM_CORRECTION_ID"],
  ["milestone-review", "MILESTONE_REVIEW_ID"],
  ["admin-fallback-milestone-review", "ADMIN_FALLBACK_MILESTONE_REVIEW_ID"],
  ["payout", "PAYOUT_ID"],
  ["admin-fallback-payout", "ADMIN_FALLBACK_PAYOUT_ID"],
  ["payment-intent", "PAYMENT_INTENT_ID"],
  ["payment-receipt-initial", "PAYMENT_RECEIPT_INITIAL_ID"],
  ["payment-receipt-correction", "PAYMENT_RECEIPT_CORRECTION_ID"],
  ["payment-review-case", "PAYMENT_REVIEW_CASE_ID"],
  ["payment-review-decision", "PAYMENT_REVIEW_DECISION_ID"],
  ["payment-appeal", "PAYMENT_APPEAL_ID"],
  ["payment-appeal-decision", "PAYMENT_APPEAL_DECISION_ID"],
  ["performance-bond", "PERFORMANCE_BOND_ID"],
  ["notification-1", "NOTIFICATION_1_ID"],
  ["notification-2", "NOTIFICATION_2_ID"],
  ["event-1", "EVENT_1_ID"],
  ["event-2", "EVENT_2_ID"],
  ["email-outbox-1", "EMAIL_OUTBOX_1_ID"],
];

function fail(message) {
  throw new Error(`Evidence-payment QA namespace preflight failed: ${message}`);
}

function requireString(value, name, pattern, maximumLength) {
  if (typeof value !== "string" || value.length === 0) {
    fail(`${name} is required.`);
  }
  if (value.length > maximumLength) {
    fail(`${name} exceeds ${maximumLength} characters.`);
  }
  if (!pattern.test(value)) {
    fail(`${name} contains unsupported characters or has invalid syntax.`);
  }
  return value;
}

function deterministicUuid(canonical, label) {
  const bytes = createHash("sha256")
    .update(canonical, "utf8")
    .update("\u001f", "utf8")
    .update(label, "utf8")
    .digest()
    .subarray(0, 16);

  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function assertUnique(values, description) {
  if (new Set(values).size !== values.length) {
    fail(`${description} contain a deterministic collision.`);
  }
}

export function buildEvidencePaymentQaNamespace(input) {
  const repository = requireString(
    input.repository,
    "repository",
    REPOSITORY_PATTERN,
    200,
  ).toLowerCase();
  const workflowRef = requireString(
    input.workflowRef,
    "workflow identity",
    WORKFLOW_REF_PATTERN,
    512,
  );
  const runId = requireString(
    input.runId,
    "run_id",
    POSITIVE_INTEGER_PATTERN,
    20,
  );
  const runAttempt = requireString(
    input.runAttempt,
    "run_attempt",
    POSITIVE_INTEGER_PATTERN,
    20,
  );
  const qaRef = requireString(input.qaRef, "QA project ref", /^[a-z]{20}$/, 20);

  if (qaRef !== EVIDENCE_PAYMENT_QA_REF) {
    fail(`QA project ref must be exactly ${EVIDENCE_PAYMENT_QA_REF}.`);
  }

  const canonical = [
    "moral-trade-evidence-payment-qa-v1",
    repository,
    workflowRef,
    runId,
    runAttempt,
    qaRef,
  ].join("\u001f");
  const namespaceHash = createHash("sha256").update(canonical, "utf8").digest("hex");
  const handle = `epqa-${namespaceHash.slice(0, 24)}`;

  const roles = {};
  const environment = {
    EVIDENCE_PAYMENT_QA_NAMESPACE_HANDLE: handle,
    EVIDENCE_PAYMENT_QA_NAMESPACE_HASH: namespaceHash,
    EVIDENCE_PAYMENT_QA_REPOSITORY: repository,
    EVIDENCE_PAYMENT_QA_WORKFLOW_REF: workflowRef,
    EVIDENCE_PAYMENT_QA_RUN_ID: runId,
    EVIDENCE_PAYMENT_QA_RUN_ATTEMPT: runAttempt,
    EVIDENCE_PAYMENT_QA_REF: qaRef,
  };

  for (const [role, envRole] of ROLE_DEFINITIONS) {
    const id = deterministicUuid(canonical, `auth-user:${role}`);
    const email = `evidence-payment-${role}-${namespaceHash.slice(0, 20)}@qa.invalid`;
    if (!UUID_PATTERN.test(id)) fail(`derived ${role} UUID is invalid.`);
    if (!EMAIL_PATTERN.test(email) || email.length > 254) {
      fail(`derived ${role} email is invalid.`);
    }
    roles[role] = { id, profileId: id, email };
    environment[`EVIDENCE_PAYMENT_QA_${envRole}_ID`] = id;
    environment[`EVIDENCE_PAYMENT_QA_${envRole}_PROFILE_ID`] = id;
    environment[`EVIDENCE_PAYMENT_QA_${envRole}_EMAIL`] = email;
  }

  const objects = {};
  for (const [label, envSuffix] of OBJECT_DEFINITIONS) {
    const id = deterministicUuid(canonical, `object:${label}`);
    if (!UUID_PATTERN.test(id)) fail(`derived ${label} UUID is invalid.`);
    objects[label] = id;
    environment[`EVIDENCE_PAYMENT_QA_${envSuffix}`] = id;
  }

  assertUnique(
    [...Object.values(roles).map((role) => role.id), ...Object.values(objects)],
    "derived UUIDs",
  );
  assertUnique(Object.values(roles).map((role) => role.email), "derived emails");

  for (const [key, value] of Object.entries(environment)) {
    if (!ENV_KEY_PATTERN.test(key)) fail(`invalid environment key ${key}.`);
    if (typeof value !== "string" || value.length === 0 || /[\r\n\0]/.test(value)) {
      fail(`unsafe environment value for ${key}.`);
    }
  }

  return {
    schemaVersion: 1,
    namespace: {
      handle,
      sha256: namespaceHash,
      repository,
      workflowRef,
      runId,
      runAttempt,
      qaRef,
    },
    roles,
    objects,
    environment,
  };
}

function parseArguments(argv) {
  const parsed = {
    manifestPath: "evidence-payment-namespace.json",
    githubEnvPath: process.env.GITHUB_ENV ?? "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--manifest") {
      parsed.manifestPath = argv[++index] ?? fail("--manifest requires a path.");
    } else if (token === "--github-env") {
      parsed.githubEnvPath = argv[++index] ?? fail("--github-env requires a path.");
    } else {
      fail(`unknown argument ${token}.`);
    }
  }

  if (!parsed.githubEnvPath) fail("GITHUB_ENV or --github-env is required.");
  if (/\0|\r|\n/.test(parsed.manifestPath) || /\0|\r|\n/.test(parsed.githubEnvPath)) {
    fail("output paths contain control characters.");
  }
  return parsed;
}

function writeManifest(path, manifest) {
  const outputPath = resolve(path);
  mkdirSync(dirname(outputPath), { recursive: true });
  const serialized = `${JSON.stringify(manifest, null, 2)}\n`;

  try {
    const existing = readFileSync(outputPath, "utf8");
    if (existing !== serialized) {
      fail("an existing namespace manifest disagrees with immutable run metadata.");
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    writeFileSync(outputPath, serialized, { encoding: "utf8", mode: 0o600, flag: "wx" });
  }
}

function appendGithubEnvironment(path, environment) {
  const lines = Object.entries(environment)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  writeFileSync(resolve(path), `${lines}\n`, { encoding: "utf8", flag: "a" });
}

export function runCli(argv = process.argv.slice(2), environment = process.env) {
  const options = parseArguments(argv);
  const manifest = buildEvidencePaymentQaNamespace({
    repository: environment.GITHUB_REPOSITORY,
    workflowRef: environment.GITHUB_WORKFLOW_REF,
    runId: environment.GITHUB_RUN_ID,
    runAttempt: environment.GITHUB_RUN_ATTEMPT,
    qaRef: environment.EXPECTED_QA_REF,
  });

  writeManifest(options.manifestPath, manifest);
  appendGithubEnvironment(options.githubEnvPath, manifest.environment);
  process.stdout.write(
    `${JSON.stringify({
      schemaVersion: manifest.schemaVersion,
      namespaceHandle: manifest.namespace.handle,
      namespaceSha256: manifest.namespace.sha256,
      repository: manifest.namespace.repository,
      workflowRef: manifest.namespace.workflowRef,
      runId: manifest.namespace.runId,
      runAttempt: manifest.namespace.runAttempt,
      qaRef: manifest.namespace.qaRef,
      roleCount: Object.keys(manifest.roles).length,
      objectCount: Object.keys(manifest.objects).length,
    })}\n`,
  );
  return manifest;
}

const invokedDirectly =
  typeof process.argv[1] === "string" &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (invokedDirectly) {
  try {
    runCli();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
