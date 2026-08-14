import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  BOUND_BASE_COMMIT,
  DECISION_SCHEMA_VERSION,
  EVALUATOR_VERSION,
  INPUT_SCHEMA_VERSION,
  POLICY_SOURCE_MANIFEST_HASH,
  evaluateReciprocalTradeResearchEligibility
} from "./reciprocal-trade-research-eligibility.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const PACKAGE = "docs/commitments/impact-identification/study-candidates/trade-bilateral-encouragement-planning-v1/canonical-eligibility";
const PATHS = {
  readme: `${PACKAGE}/README.md`,
  sourceMap: `${PACKAGE}/policy-source-map.v1.md`,
  policy: `${PACKAGE}/policy-source-manifest.v1.json`,
  inputSchema: `${PACKAGE}/eligibility-input.schema.v1.json`,
  decisionSchema: `${PACKAGE}/eligibility-decision.schema.v1.json`,
  gaps: `${PACKAGE}/eligibility-gap-register.v1.json`,
  fixtures: `${PACKAGE}/synthetic-eligibility-fixtures.v1.json`,
  canonical: `${PACKAGE}/canonical-eligibility-manifest.v1.json`,
  evaluator: "scripts/commitments-trade-study/reciprocal-trade-research-eligibility.mjs",
  evaluatorTest: "scripts/commitments-trade-study/reciprocal-trade-research-eligibility.test.mjs",
  validator: "scripts/commitments-trade-study/validate-reciprocal-trade-research-eligibility.mjs",
  workflow: ".github/workflows/commitments-trade-canonical-eligibility-gates.yml",
  frozenReadiness: "docs/commitments/impact-identification/study-candidates/trade-bilateral-encouragement-planning-v1/real-graph-readiness/current-readiness-evidence.2026-08-13.json"
};

function read(path) {
  return readFileSync(resolve(ROOT, path), "utf8");
}

function load(path) {
  return JSON.parse(read(path));
}

function rawSha256(path) {
  return createHash("sha256").update(readFileSync(resolve(ROOT, path))).digest("hex");
}

function gitBlobSha1(path) {
  return execFileSync("git", ["hash-object", path], { cwd: ROOT, encoding: "utf8" }).trim();
}

function clone(value) {
  return structuredClone(value);
}

function applyOperations(base, operations) {
  const value = clone(base);
  for (const operation of operations) {
    const segments = operation.path.split(".");
    let parent = value;
    for (const segment of segments.slice(0, -1)) parent = parent[segment];
    const leaf = segments.at(-1);
    if (operation.op === "remove") delete parent[leaf];
    else if (operation.op === "set") parent[leaf] = clone(operation.value);
    else assert.fail(`Unknown operation ${operation.op}`);
  }
  return value;
}

function assertUnique(values, label) {
  assert.equal(new Set(values).size, values.length, `${label} must be unique`);
}

const policy = load(PATHS.policy);
const inputSchema = load(PATHS.inputSchema);
const decisionSchema = load(PATHS.decisionSchema);
const gaps = load(PATHS.gaps);
const fixtures = load(PATHS.fixtures);
const canonical = load(PATHS.canonical);

assert.equal(rawSha256(PATHS.policy), POLICY_SOURCE_MANIFEST_HASH.slice("sha256:".length));
assert.equal(policy.boundBaseCommit, BOUND_BASE_COMMIT);
assert.equal(policy.evaluatorVersion, EVALUATOR_VERSION);
assert.equal(policy.inputSchemaVersion, INPUT_SCHEMA_VERSION);
assert.equal(policy.decisionSchemaVersion, DECISION_SCHEMA_VERSION);
assert.equal(policy.canonicalEligibilitySourceStatus, "blocked_source_conflict");
assert.equal(policy.authorization.protectedDataExportAuthorized, false);
assert.equal(policy.authorization.realRowsMayBeRead, false);
assert.equal(policy.authorization.realGraphMayBeBuilt, false);
assert.equal(policy.authorization.runtimeWiringAuthorized, false);
assert.equal(policy.authorization.assignmentAuthorized, false);
assert.equal(policy.authorization.executionDecision, "no_launch");
assert.ok(policy.activeConflicts.length >= 4);
assertUnique(policy.sources.map((source) => source.sourceId), "source IDs");
assertUnique(policy.testBindings.map((binding) => binding.testId), "test IDs");

for (const binding of [...policy.sources, ...policy.testBindings]) {
  assert.match(binding.path, /^(src|supabase|scripts|docs)\//, binding.path);
  assert.match(binding.gitBlobSha1, /^[a-f0-9]{40}$/, binding.path);
  assert.match(binding.rawSha256, /^[a-f0-9]{64}$/, binding.path);
  assert.equal(gitBlobSha1(binding.path), binding.gitBlobSha1, `${binding.path}: Git blob`);
  assert.equal(rawSha256(binding.path), binding.rawSha256, `${binding.path}: raw SHA-256`);
}

const expectedGateIds = [
  "offer_identity_lifecycle",
  "reciprocal_matching",
  "moderation_harm_baseline",
  "legality_policy_participant",
  "consent_privacy_directed_roles",
  "blocks_restrictions",
  "agreement_engagement_conflicts",
  "study_provenance_integrity"
];
assert.deepEqual(policy.gates.map((gate) => gate.gateId), expectedGateIds);
for (const gate of policy.gates) {
  assert.ok(gate.reasonCodes.length > 0, gate.gateId);
  assert.ok(gate.sourceIds.length > 0, gate.gateId);
  assert.ok(gate.inputFields.length > 0, gate.gateId);
  assert.match(gate.failClosed, /fail|ineligible|eligible|Only|must/i, gate.gateId);
  assert.ok(gate.effectiveTimeSemantics.length > 0, gate.gateId);
  assert.ok(gate.tests.length > 0, gate.gateId);
  assert.ok(gate.testIds.length > 0, gate.gateId);
  for (const sourceId of gate.sourceIds) assert.ok(policy.sources.some((source) => source.sourceId === sourceId), `${gate.gateId}: ${sourceId}`);
  for (const testId of gate.testIds) assert.ok(policy.testBindings.some((binding) => binding.testId === testId), `${gate.gateId}: ${testId}`);
}

assert.equal(inputSchema.additionalProperties, false);
assert.equal(inputSchema.properties.schemaVersion.const, INPUT_SCHEMA_VERSION);
assert.equal(inputSchema.properties.evaluatorVersion.const, EVALUATOR_VERSION);
assert.equal(inputSchema.properties.policySourceManifestHash.const, POLICY_SOURCE_MANIFEST_HASH);
assert.equal(inputSchema.properties.provenance.$ref, "#/$defs/provenance");
for (const definition of ["studyAuthorization", "provenance", "gateEvidence", "offer", "consent", "restriction", "engagement", "pair"]) {
  assert.equal(inputSchema.$defs[definition].additionalProperties, false, definition);
}
assert.equal(inputSchema.$defs.provenance.properties.boundBaseCommit.const, BOUND_BASE_COMMIT);
assert.equal(inputSchema.$defs.offer.properties.causeCollation.const, "postgres-ilike-printable-ascii-v1");
assert.equal(inputSchema.$defs.consent.properties.purposeCode.const, "reciprocal_trade_research_eligibility_v1");
assert.equal(inputSchema.$defs.consent.properties.privacyScope.const, "research_eligibility_normalized_pair_only");

assert.equal(decisionSchema.additionalProperties, false);
assert.equal(decisionSchema.properties.schemaVersion.const, DECISION_SCHEMA_VERSION);
assert.equal(decisionSchema.properties.evaluatorVersion.const, EVALUATOR_VERSION);
assert.equal(decisionSchema.properties.policySourceManifestHash.const, POLICY_SOURCE_MANIFEST_HASH);
assert.equal(decisionSchema.properties.canonicalEligibilitySourceStatus.const, "blocked_source_conflict");
assert.equal(decisionSchema.properties.realGraphDiagnosticsStatus.const, "blocked_not_run");
assert.equal(decisionSchema.properties.executionDecision.const, "no_launch");
assert.equal(decisionSchema.properties.assignmentGenerated.const, false);
assert.equal(decisionSchema.properties.assignmentSeedGenerated.const, false);
assert.deepEqual(decisionSchema.properties.participantLevelCausalClaim, { type: "null" });

assert.equal(gaps.boundBaseCommit, BOUND_BASE_COMMIT);
assert.equal(gaps.canonicalEligibilitySourceStatus, "blocked_source_conflict");
assert.equal(gaps.allProtectedEvaluationBlocked, true);
assert.ok(gaps.gaps.length >= 8);
assertUnique(gaps.gaps.map((gap) => gap.gapId), "gap IDs");
for (const gap of gaps.gaps) {
  assert.match(gap.status, /^open_/);
  assert.equal(gap.protectedEvaluationAuthorized, false);
  assert.ok(gap.requiredResolution.length > 0);
}

assert.equal(fixtures.syntheticOnly, true);
assert.equal(fixtures.nonExecuting, true);
assert.equal(fixtures.containsProductionOrQaRows, false);
assert.ok(fixtures.cases.length >= 50);
assert.ok(fixtures.cases.some((entry) => entry.id === "fully-eligible-reciprocal-pair" && entry.expectedEligible));
assert.ok(fixtures.cases.some((entry) => entry.id === "synthetic-3200-cluster-control"));
for (const fixtureCase of fixtures.cases) {
  const input = applyOperations(fixtures.baseInput, fixtureCase.operations);
  const first = evaluateReciprocalTradeResearchEligibility(input);
  const second = evaluateReciprocalTradeResearchEligibility(input);
  assert.deepEqual(first, second, `${fixtureCase.id}: deterministic`);
  assert.equal(first.eligible, fixtureCase.expectedEligible, fixtureCase.id);
  assert.deepEqual(first.reasonCodes, fixtureCase.expectedReasonCodes, fixtureCase.id);
  assert.deepEqual(first.unknownBlockers, fixtureCase.expectedUnknownBlockers ?? [], `${fixtureCase.id}: unknown`);
  assert.deepEqual(first.staleSourceBlockers, fixtureCase.expectedStaleSourceBlockers ?? [], `${fixtureCase.id}: stale`);
  const serialized = JSON.stringify(first);
  for (const canary of fixtureCase.decisionMustExclude ?? []) assert.equal(serialized.includes(canary), false, `${fixtureCase.id}: ${canary}`);
  if (!first.eligible && input.pair && typeof input.pair === "object") {
    input.pair.blockStatus = "blocked_both";
    assert.equal(evaluateReciprocalTradeResearchEligibility(input).eligible, false, `${fixtureCase.id}: monotonic`);
  }
}

const clusterControl = applyOperations(fixtures.baseInput, fixtures.cases.find((entry) => entry.id === "synthetic-3200-cluster-control").operations);
assert.equal(clusterControl.provenance.syntheticClusterCount, 3200);
assert.equal(clusterControl.provenance.sourceKind, "synthetic_fixture");
assert.equal(clusterControl.provenance.containsRealRows, false);
assert.equal(evaluateReciprocalTradeResearchEligibility(clusterControl).eligible, true);

const evaluatorSource = read(PATHS.evaluator);
const forbiddenEvaluatorPatterns = [
  [/^\s*import\s/m, "imports"],
  [/\b(process|Deno|Bun)\b/, "environment/runtime globals"],
  [/\b(fetch|XMLHttpRequest|WebSocket|EventSource)\b/, "network clients"],
  [/(createClient\s*\(|from\s+["'](?:@supabase|pg)[^"']*["']|postgres\s*\()/i, "database clients"],
  [/\b(readFile|writeFile|appendFile|openSync|createReadStream)\b/, "filesystem I/O"],
  [/\b(console\.|print\(|alert\()/, "row logging"],
  [/\b(Math\.random|randomBytes|randomUUID|getRandomValues)\b/, "randomness"],
  [/\b(Date\.now|new\s+Date\s*\()/, "system clock"],
  [/\b(setTimeout|setInterval|queueMicrotask)\b/, "asynchronous side effects"],
  [/\b(child_process|execSync|spawnSync)\b/, "process side effects"],
  [/\b(expected_additional|direct_causal_attribution)\b/, "participant causal claims"]
];
for (const [pattern, label] of forbiddenEvaluatorPatterns) assert.doesNotMatch(evaluatorSource, pattern, label);
assert.match(evaluatorSource, /export function evaluateReciprocalTradeResearchEligibility/);
assert.match(evaluatorSource, /participantLevelCausalClaim: null/);
assert.match(evaluatorSource, /assignmentGenerated: false/);
assert.match(evaluatorSource, /assignmentSeedGenerated: false/);

assert.equal(gitBlobSha1(PATHS.frozenReadiness), "4c24168eef2b890ccf9bc26ffb2bd24e7685328f");
assert.equal(rawSha256(PATHS.frozenReadiness), "54e878c35a5bfff2324bdf1a101f4fb6791dcc7fa4cac002d5af5d4366605492");

assert.equal(canonical.boundBaseCommit, BOUND_BASE_COMMIT);
assert.equal(canonical.policySourceManifestHash, POLICY_SOURCE_MANIFEST_HASH);
assert.equal(canonical.canonicalEligibilitySourceStatus, "blocked_source_conflict");
assert.equal(canonical.realGraphDiagnosticsStatus, "blocked_not_run");
assert.equal(canonical.executionDecision, "no_launch");
assert.equal(canonical.releaseClassification, "research_validation_only_no_runtime_effect");
assert.equal(canonical.realDataAccessed, false);
assert.equal(canonical.databaseActionOccurred, false);
assert.equal(canonical.deploymentOccurred, false);
assert.equal(canonical.assignmentGenerated, false);
assert.equal(canonical.participantContacted, false);
assertUnique(canonical.artifacts.map((artifact) => artifact.path), "canonical artifact paths");
for (const artifact of canonical.artifacts) {
  assert.equal(rawSha256(artifact.path), artifact.rawSha256, `${artifact.path}: raw SHA-256`);
  assert.equal(gitBlobSha1(artifact.path), artifact.gitBlobSha1, `${artifact.path}: Git blob`);
}
assert.deepEqual([...canonical.expectedChangedFiles].sort(), [
  PATHS.workflow,
  PATHS.readme,
  PATHS.sourceMap,
  PATHS.policy,
  PATHS.inputSchema,
  PATHS.decisionSchema,
  PATHS.gaps,
  PATHS.fixtures,
  PATHS.canonical,
  PATHS.evaluator,
  PATHS.evaluatorTest,
  PATHS.validator
].sort());

const aggregateText = [read(PATHS.readme), read(PATHS.sourceMap), read(PATHS.canonical)].join("\n");
for (const required of [
  "blocked_source_conflict",
  "blocked_not_run",
  "no_launch",
  "No production or QA row",
  "not empirical calibration",
  "PR #534"
]) assert.ok(aggregateText.includes(required), required);

console.log(JSON.stringify({
  status: "canonical_eligibility_candidate_valid",
  boundBaseCommit: BOUND_BASE_COMMIT,
  evaluatorVersion: EVALUATOR_VERSION,
  policySourceManifestHash: POLICY_SOURCE_MANIFEST_HASH,
  sourceBindingsVerified: policy.sources.length,
  testBindingsVerified: policy.testBindings.length,
  gatesVerified: policy.gates.length,
  gapsRemaining: gaps.gaps.length,
  syntheticCasesVerified: fixtures.cases.length,
  protectedDataAuthorized: false,
  realGraphDiagnosticsStatus: "blocked_not_run",
  executionDecision: "no_launch"
}, null, 2));
