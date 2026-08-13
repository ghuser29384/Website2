import fs from "node:fs";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const PKG = "docs/commitments/impact-identification/study-candidates/trade-bilateral-encouragement-planning-v1/real-graph-readiness";
const path = name => `${PKG}/${name}`;
const P = {
  workflow: ".github/workflows/commitments-trade-real-graph-readiness-gates.yml",
  readme: path("README.md"),
  aggregateSchema: path("aggregate-readiness-report.schema.v1.json"),
  evidence: path("current-readiness-evidence.2026-08-13.json"),
  protectedSchema: path("protected-data-run-contract.schema.v1.json"),
  contract: path("real-graph-readiness-contract.v1.json"),
  manifest: path("real-graph-readiness-manifest.v1.json"),
  fixtures: path("synthetic-readiness-fixtures.v1.json"),
  primaryValidator: "scripts/commitments-trade-study/validate-real-graph-readiness-package.mjs",
  integrityValidator: "scripts/commitments-trade-study/validate-real-graph-readiness-integrity.mjs",
  matcher: "src/lib/core-trade-base.ts",
  study: "docs/commitments/impact-identification/study-candidates/trade-bilateral-encouragement-planning-v1/study-instance.json",
  precision: "docs/commitments/impact-identification/study-candidates/trade-bilateral-encouragement-planning-v1/precision-report.json",
  protocol: "docs/commitments/impact-identification/master-protocol.v2.json",
  template: "docs/commitments/impact-identification/study-templates/trade.v2.json",
  mapping: "docs/commitments/impact-identification/evidence-to-product-mapping.v2.json",
  graph: "docs/commitments/impact-identification/study-candidates/trade-bilateral-encouragement-planning-v1/graph-feasibility/graph-feasibility-contract.json",
};

const read = file => fs.readFileSync(`${ROOT}/${file}`, "utf8");
const load = file => JSON.parse(read(file));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const digest = input => `sha256:${crypto.createHash("sha256").update(input).digest("hex")}`;
const rawHash = file => digest(fs.readFileSync(`${ROOT}/${file}`));
const canonical = value => Array.isArray(value)
  ? value.map(canonical)
  : value && typeof value === "object"
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
    : value;
const payloadHash = (value, field) => {
  const copy = structuredClone(value);
  delete copy[field];
  return digest(JSON.stringify(canonical(copy)));
};
const exactKeys = (object, keys, label) => {
  assert(JSON.stringify(Object.keys(object).sort()) === JSON.stringify([...keys].sort()), `${label} keys drifted`);
};

const evidence = load(P.evidence);
const contract = load(P.contract);
const fixtures = load(P.fixtures);
const manifest = load(P.manifest);

assert(evidence.evidencePayloadHash === payloadHash(evidence, "evidencePayloadHash"), "evidence payload hash mismatch");
assert(contract.contractPayloadHash === payloadHash(contract, "contractPayloadHash"), "contract payload hash mismatch");
assert(fixtures.fixturesPayloadHash === payloadHash(fixtures, "fixturesPayloadHash"), "fixtures payload hash mismatch");
assert(manifest.manifestPayloadHash === payloadHash(manifest, "manifestPayloadHash"), "manifest payload hash mismatch");

const bindings = {
  boundStudyInstancePayloadHash: load(P.study).studyInstancePayloadHash,
  boundPrecisionReportPayloadHash: load(P.precision).reportPayloadHash,
  boundProtocolPayloadHash: load(P.protocol).payloadSha256,
  boundTemplatePayloadHash: load(P.template).payloadSha256,
  boundGraphFeasibilityContractPayloadHash: load(P.graph).contractPayloadHash,
  boundEvidenceToProductMappingHash: load(P.mapping).payloadSha256,
  aggregateReportSchemaRawSha256: rawHash(P.aggregateSchema),
  protectedRunSchemaRawSha256: rawHash(P.protectedSchema),
  currentEvidencePayloadHash: evidence.evidencePayloadHash,
  syntheticFixturesPayloadHash: fixtures.fixturesPayloadHash,
};
for (const [key, expected] of Object.entries(bindings)) {
  assert(contract[key] === expected, `contract binding drifted: ${key}`);
}

function dyadCount(fixture) {
  let count = 0;
  for (const offer of fixture.offers) for (const candidate of fixture.offers) {
    if (candidate.workflowStatus !== "published" || candidate.status !== "open") continue;
    if (candidate.mode !== offer.mode || candidate.ownerKey === offer.ownerKey || candidate.offerKey === offer.offerKey) continue;
    if (candidate.offeredCause.toLowerCase() === offer.requestedCause.toLowerCase()
      && candidate.requestedCause.toLowerCase() === offer.offeredCause.toLowerCase()) count += 1;
  }
  return count;
}
for (const fixture of fixtures.fixtures) {
  assert(fixture.fixtureKey.startsWith("synthetic:"), "non-synthetic fixture");
  assert(fixture.expectedExecutionDecision === "no_launch" && fixture.realGraphRelabelingPermitted === false, "fixture launch boundary");
  assert(dyadCount(fixture) === fixture.expectedPartialRuntimeDirectedDyadCount, `fixture dyad count drifted: ${fixture.fixtureKey}`);
}
const pair = fixtures.fixtures.find(item => item.fixtureKey.endsWith("minimal-reciprocal-pair"));
assert(pair?.expectedPartialRuntimeDirectedDyadCount === 2, "reciprocal pair control");
const large = fixtures.fixtures.find(item => item.syntheticGraphSummary?.independentClusterCount === 3200);
assert(large?.expectedDataReadiness === "synthetic_only_not_real_evidence" && large.realGraphRelabelingPermitted === false, "synthetic graph relabeling");

const matcherBlob = execFileSync("git", ["hash-object", P.matcher], { cwd: ROOT, encoding: "utf8" }).trim();
assert(matcherBlob === contract.observedRuntimeMatcher.gitBlobSha && matcherBlob === evidence.sourceBoundary.runtimeMatcherBlobSha, "matcher Git blob mismatch");
const matcher = read(P.matcher);
for (const fragment of [
  "export async function listReciprocalMatches",
  '.eq("workflow_status", "published")',
  '.eq("status", "open")',
  '.eq("mode", offer.mode)',
  '.neq("owner_id", offer.owner_id)',
  '.neq("id", offer.id)',
  '.ilike("offered_cause", offer.requested_cause)',
  '.ilike("requested_cause", offer.offered_cause)',
]) assert(matcher.includes(fragment), `matcher fragment missing: ${fragment}`);

const expectedFiles = [
  P.workflow, P.readme, P.aggregateSchema, P.evidence, P.protectedSchema,
  P.contract, P.fixtures, P.primaryValidator, P.integrityValidator,
];
exactKeys(manifest.files, expectedFiles, "manifest file map");
for (const file of expectedFiles) assert(manifest.files[file] === rawHash(file), `manifest raw hash mismatch: ${file}`);

assert(evidence.environments.every(item => item.eligibleDirectedDyadCount === 0), "current graph must remain empty");
assert(evidence.authoritativeResult.realGraphDiagnosticsStatus === "blocked_not_run", "real diagnostics must remain blocked");
assert(evidence.authoritativeResult.executionDecision === "no_launch", "execution must remain blocked");
assert(contract.canonicalEligibilitySourceStatus === "required_not_completed", "canonical eligibility must remain incomplete");
assert(contract.prohibitedGraphSources.includes("recommendation_graph_edges"), "recommendation graph exclusion");
assert(contract.executionAuthorized === false && contract.realUserAssignmentAllowed === false
  && contract.studyRegistrationAuthorized === false && contract.deploymentAuthorized === false, "execution boundary");

process.stdout.write(`${JSON.stringify({
  ok: true,
  evidencePayloadHash: evidence.evidencePayloadHash,
  contractPayloadHash: contract.contractPayloadHash,
  manifestPayloadHash: manifest.manifestPayloadHash,
  fixtureDyadCountsVerified: fixtures.fixtures.length,
  exactFileHashesVerified: expectedFiles.length,
  executionDecision: "no_launch",
})}\n`);
