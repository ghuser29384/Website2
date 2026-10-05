import fs from "node:fs";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const PKG = "docs/commitments/impact-identification/study-candidates/trade-bilateral-encouragement-planning-v1/real-graph-readiness";
const pkg = (name) => `${PKG}/${name}`;
const PATHS = {
  readme: pkg("README.md"),
  aggregateSchema: pkg("aggregate-readiness-report.schema.v1.json"),
  evidence: pkg("current-readiness-evidence.2026-08-13.json"),
  protectedSchema: pkg("protected-data-run-contract.schema.v1.json"),
  contract: pkg("real-graph-readiness-contract.v1.json"),
  manifest: pkg("real-graph-readiness-manifest.v1.json"),
  fixtures: pkg("synthetic-readiness-fixtures.v1.json"),
  matcher: "src/lib/core-trade-base.ts",
  study: "docs/commitments/impact-identification/study-candidates/trade-bilateral-encouragement-planning-v1/study-instance.json",
  precision: "docs/commitments/impact-identification/study-candidates/trade-bilateral-encouragement-planning-v1/precision-report.json",
  protocol: "docs/commitments/impact-identification/master-protocol.v2.json",
  template: "docs/commitments/impact-identification/study-templates/trade.v2.json",
  mapping: "docs/commitments/impact-identification/evidence-to-product-mapping.v2.json",
  graph: "docs/commitments/impact-identification/study-candidates/trade-bilateral-encouragement-planning-v1/graph-feasibility/graph-feasibility-contract.json",
};

const read = (path) => fs.readFileSync(`${ROOT}/${path}`, "utf8");
const load = (path) => JSON.parse(read(path));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const sha256 = (input) => `sha256:${crypto.createHash("sha256").update(input).digest("hex")}`;
const rawHash = (path) => sha256(fs.readFileSync(`${ROOT}/${path}`));
const canonicalize = (value) => Array.isArray(value)
  ? value.map(canonicalize)
  : value && typeof value === "object"
    ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]))
    : value;
const payloadHash = (value, field) => {
  const copy = structuredClone(value);
  delete copy[field];
  return sha256(JSON.stringify(canonicalize(copy)));
};
const exactKeys = (object, keys, label) => {
  assert(
    JSON.stringify(Object.keys(object).sort()) === JSON.stringify([...keys].sort()),
    `${label} keys drifted`,
  );
};

const evidence = load(PATHS.evidence);
const contract = load(PATHS.contract);
const fixtures = load(PATHS.fixtures);
const manifest = load(PATHS.manifest);

assert(evidence.evidencePayloadHash === payloadHash(evidence, "evidencePayloadHash"), "evidence payload hash mismatch");
assert(contract.contractPayloadHash === payloadHash(contract, "contractPayloadHash"), "contract payload hash mismatch");
assert(fixtures.fixturesPayloadHash === payloadHash(fixtures, "fixturesPayloadHash"), "fixtures payload hash mismatch");
assert(manifest.manifestPayloadHash === payloadHash(manifest, "manifestPayloadHash"), "manifest payload hash mismatch");

const expectedBindings = {
  boundStudyInstancePayloadHash: load(PATHS.study).studyInstancePayloadHash,
  boundPrecisionReportPayloadHash: load(PATHS.precision).reportPayloadHash,
  boundProtocolPayloadHash: load(PATHS.protocol).payloadSha256,
  boundTemplatePayloadHash: load(PATHS.template).payloadSha256,
  boundGraphFeasibilityContractPayloadHash: load(PATHS.graph).contractPayloadHash,
  boundEvidenceToProductMappingHash: load(PATHS.mapping).payloadSha256,
  aggregateReportSchemaRawSha256: rawHash(PATHS.aggregateSchema),
  protectedRunSchemaRawSha256: rawHash(PATHS.protectedSchema),
  currentEvidencePayloadHash: evidence.evidencePayloadHash,
  syntheticFixturesPayloadHash: fixtures.fixturesPayloadHash,
};
for (const [key, expected] of Object.entries(expectedBindings)) {
  assert(contract[key] === expected, `contract binding drifted: ${key}`);
}

function partialRuntimeDyadCount(fixture) {
  let count = 0;
  for (const offer of fixture.offers) {
    for (const candidate of fixture.offers) {
      if (candidate.workflowStatus !== "published" || candidate.status !== "open") continue;
      if (candidate.mode !== offer.mode) continue;
      if (candidate.ownerKey === offer.ownerKey || candidate.offerKey === offer.offerKey) continue;
      if (candidate.offeredCause.toLowerCase() !== offer.requestedCause.toLowerCase()) continue;
      if (candidate.requestedCause.toLowerCase() !== offer.offeredCause.toLowerCase()) continue;
      count += 1;
    }
  }
  return count;
}

assert(fixtures.status === "synthetic_only" && fixtures.fixtures.length === 6, "fixture set drifted");
for (const fixture of fixtures.fixtures) {
  assert(fixture.fixtureKey.startsWith("synthetic:"), "non-synthetic fixture key");
  assert(fixture.expectedExecutionDecision === "no_launch", "fixture launch boundary drifted");
  assert(fixture.realGraphRelabelingPermitted === false, "synthetic fixture relabeled as real");
  assert(
    partialRuntimeDyadCount(fixture) === fixture.expectedPartialRuntimeDirectedDyadCount,
    `fixture dyad count drifted: ${fixture.fixtureKey}`,
  );
}
const reciprocalPair = fixtures.fixtures.find((item) => item.fixtureKey.endsWith("minimal-reciprocal-pair"));
assert(reciprocalPair?.expectedPartialRuntimeDirectedDyadCount === 2, "minimal reciprocal-pair control drifted");
const largeSynthetic = fixtures.fixtures.find((item) => item.syntheticGraphSummary?.independentClusterCount === 3200);
assert(
  largeSynthetic?.expectedDataReadiness === "synthetic_only_not_real_evidence"
    && largeSynthetic.realGraphRelabelingPermitted === false,
  "3,200-cluster synthetic control drifted",
);

const matcherBlob = execFileSync("git", ["hash-object", PATHS.matcher], { cwd: ROOT, encoding: "utf8" }).trim();
assert(matcherBlob === contract.observedRuntimeMatcher.gitBlobSha, "contract matcher Git blob mismatch");
assert(matcherBlob === evidence.sourceBoundary.runtimeMatcherBlobSha, "evidence matcher Git blob mismatch");
const matcherSource = read(PATHS.matcher);
for (const fragment of [
  "export async function listReciprocalMatches",
  '.eq("workflow_status", "published")',
  '.eq("status", "open")',
  '.eq("mode", offer.mode)',
  '.neq("owner_id", offer.owner_id)',
  '.neq("id", offer.id)',
  '.ilike("offered_cause", offer.requested_cause)',
  '.ilike("requested_cause", offer.offered_cause)',
]) {
  assert(matcherSource.includes(fragment), `matcher fragment missing: ${fragment}`);
}

const immutableFiles = [
  PATHS.readme,
  PATHS.aggregateSchema,
  PATHS.evidence,
  PATHS.protectedSchema,
  PATHS.contract,
  PATHS.fixtures,
];
exactKeys(manifest.files, immutableFiles, "manifest file map");
for (const path of immutableFiles) {
  assert(manifest.files[path] === rawHash(path), `manifest raw hash mismatch: ${path}`);
}

assert(evidence.environments.every((item) => item.eligibleDirectedDyadCount === 0), "current graph must remain empty");
assert(evidence.authoritativeResult.realGraphDiagnosticsStatus === "blocked_not_run", "real diagnostics must remain blocked");
assert(evidence.authoritativeResult.executionDecision === "no_launch", "execution must remain no-launch");
assert(contract.canonicalEligibilitySourceStatus === "required_not_completed", "canonical eligibility must remain incomplete");
assert(contract.prohibitedGraphSources.includes("recommendation_graph_edges"), "recommendation graph exclusion missing");
assert(contract.executionAuthorized === false, "execution was authorized");
assert(contract.realUserAssignmentAllowed === false, "real-user assignment was authorized");
assert(contract.studyRegistrationAuthorized === false, "study registration was authorized");
assert(contract.deploymentAuthorized === false, "deployment was authorized");

process.stdout.write(`${JSON.stringify({
  ok: true,
  evidencePayloadHash: evidence.evidencePayloadHash,
  contractPayloadHash: contract.contractPayloadHash,
  manifestPayloadHash: manifest.manifestPayloadHash,
  fixtureDyadCountsVerified: fixtures.fixtures.length,
  immutableFileHashesVerified: immutableFiles.length,
  eligibleDirectedDyadCount: 0,
  realGraphDiagnosticsStatus: "blocked_not_run",
  executionDecision: "no_launch",
})}\n`);
