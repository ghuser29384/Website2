import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment value: ${name}`);
  return value;
}

function safe(value, pattern, label) {
  if (!pattern.test(value)) throw new Error(`Unsafe ${label}: ${value}`);
  return value;
}

function uuidFor(seed, label) {
  const bytes = Buffer.from(createHash("sha256").update(`${seed}|${label}`).digest().subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const repository = safe(required("GITHUB_REPOSITORY"), /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/, "repository");
const runId = safe(required("GITHUB_RUN_ID"), /^[1-9][0-9]{0,19}$/, "run id");
const runAttempt = safe(required("GITHUB_RUN_ATTEMPT"), /^[1-9][0-9]{0,5}$/, "run attempt");
const workflowRef = safe(required("GITHUB_WORKFLOW_REF"), /^[A-Za-z0-9_./@-]{1,300}$/, "workflow ref");
const outputDir = required("I782_STATE_DIR");
mkdirSync(outputDir, { recursive: true, mode: 0o700 });

const seed = `${repository}|${workflowRef}|${runId}|${runAttempt}|issue782-canonical-production-uat-v1`;
const digest = createHash("sha256").update(seed).digest("hex");
const handle = `i782-${digest.slice(0, 12)}`;
const emailDomain = "qa.invalid";

const roles = ["creator", "reviewer", "pledger", "outsider", "probe_pre", "probe_canonical"];
const roleEmails = Object.fromEntries(
  roles.map((role) => [role, `${handle}-${role.replaceAll("_", "-")}@${emailDomain}`]),
);
for (const email of Object.values(roleEmails)) {
  safe(email, /^[a-z0-9][a-z0-9.-]{0,62}@[a-z0-9.-]+\.invalid$/, "synthetic email");
}

const objectLabels = [
  "proposal_open",
  "proposal_success",
  "proposal_lapse",
  "submission_open",
  "submission_success",
  "submission_lapse",
];
const objectIds = Object.fromEntries(objectLabels.map((label) => [label, uuidFor(seed, label)]));
const compact = digest.slice(0, 16);
const strings = {
  matchPool: `${handle}-match`,
  round: `${handle}-round`,
  slugOpen: `${handle}-open`,
  slugSuccess: `${handle}-succeeded`,
  slugLapse: `${handle}-lapsed`,
  submissionKeyOpen: `${handle}-submission-open`,
  submissionKeySuccess: `${handle}-submission-success`,
  submissionKeyLapse: `${handle}-submission-lapse`,
  destinationOpen: `${handle}-recipient-open`,
  destinationSuccess: `${handle}-recipient-success`,
  destinationLapse: `${handle}-recipient-lapse`,
  threshold: `${handle}-threshold-1`,
  ownershipTag: `issue782:${repository}:${runId}:${runAttempt}:${compact}`,
};
for (const [key, value] of Object.entries(strings)) {
  safe(value, /^[A-Za-z0-9:._/-]{1,180}$/, `derived string ${key}`);
}

const planned = {
  schemaVersion: 1,
  repository,
  workflowRef,
  runId,
  runAttempt,
  namespaceHandle: handle,
  namespaceSha256: digest,
  roles: Object.fromEntries(
    roles.map((role) => [role, { email: roleEmails[role], userId: null, creation: "supabase-admin-api" }]),
  ),
  objectIds,
  strings,
  createdAt: new Date().toISOString(),
};

const plannedPath = join(outputDir, "ownership-planned.json");
writeFileSync(plannedPath, `${JSON.stringify(planned, null, 2)}\n`, { mode: 0o600 });
const redacted = {
  schemaVersion: 1,
  repository,
  runId,
  runAttempt,
  namespaceHandle: handle,
  namespaceSha256: digest,
  roleCount: roles.length,
  objectIdCount: Object.keys(objectIds).length,
  ownershipManifestCreatedBeforeMutation: true,
  createdAt: planned.createdAt,
};
writeFileSync(join(outputDir, "ownership-redacted.json"), `${JSON.stringify(redacted, null, 2)}\n`, { mode: 0o600 });

const env = {
  I782_NAMESPACE: handle,
  I782_NAMESPACE_SHA256: digest,
  I782_PLANNED_MANIFEST: plannedPath,
  I782_CREATOR_EMAIL: roleEmails.creator,
  I782_REVIEWER_EMAIL: roleEmails.reviewer,
  I782_PLEDGER_EMAIL: roleEmails.pledger,
  I782_OUTSIDER_EMAIL: roleEmails.outsider,
  I782_PROBE_PRE_EMAIL: roleEmails.probe_pre,
  I782_PROBE_CANONICAL_EMAIL: roleEmails.probe_canonical,
};
const githubEnv = required("GITHUB_ENV");
for (const [key, value] of Object.entries(env)) {
  appendFileSync(githubEnv, `${key}=${value}\n`);
}
console.log(JSON.stringify(redacted));
