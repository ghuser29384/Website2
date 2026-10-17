import fs from "node:fs";
import crypto from "node:crypto";

const root = "docs/commitments/impact-identification/study-candidates/trade-bilateral-encouragement-planning-v1/real-graph-readiness";
const load = name => JSON.parse(fs.readFileSync(`${root}/${name}`, "utf8"));
const hash = value => `sha256:${crypto.createHash("sha256").update(JSON.stringify(value, Object.keys(value).sort())).digest("hex")}`;
const assert = (value, message) => { if (!value) throw new Error(message); };

const evidence = load("current-readiness-evidence.2026-08-13.json");
const contract = load("real-graph-readiness-contract.v1.json");
const fixtures = load("synthetic-readiness-fixtures.v1.json");
const future = load("protected-data-run-contract.schema.v1.json");

assert(evidence.evidenceMethod.kind === "supabase_table_metadata_only", "metadata-only evidence required");
assert(evidence.evidenceMethod.rowLevelQueryPerformed === false, "row-level query prohibited");
assert(evidence.evidenceMethod.rowLevelExportPerformed === false, "row-level export prohibited");
assert(evidence.environments.every(item => item.eligibleDirectedDyadCount === 0), "current eligible graph must be empty");
assert(evidence.authoritativeResult.dataReadiness === "insufficient_real_eligible_graph", "readiness status");
assert(evidence.authoritativeResult.realGraphDiagnosticsStatus === "blocked_not_run", "diagnostics status");
assert(evidence.authoritativeResult.executionDecision === "no_launch", "launch boundary");
assert(evidence.authoritativeResult.assignmentGenerated === false, "assignment boundary");
assert(evidence.authoritativeResult.assignmentSeedGenerated === false, "seed boundary");
assert(evidence.sourceBoundary.recommendationGraphEdgesCanonical === false, "recommendation graph exclusion");
assert(contract.canonicalEligibilitySourceStatus === "required_not_completed", "canonical source boundary");
assert(contract.currentReadinessState.eligibleDirectedDyadCount === 0, "contract graph count");
assert(contract.executionAuthorized === false, "execution boundary");
assert(contract.realUserAssignmentAllowed === false, "real-user boundary");
assert(contract.studyRegistrationAuthorized === false, "registration boundary");
assert(contract.deploymentAuthorized === false, "deployment boundary");
assert(fixtures.status === "synthetic_only", "fixture boundary");
assert(fixtures.fixtures.length === 6, "fixture coverage");
assert(fixtures.fixtures.every(item => item.expectedExecutionDecision === "no_launch" && item.realGraphRelabelingPermitted === false), "fixture no-launch boundary");
assert(future.additionalProperties === false, "future-run schema must fail closed");
assert(future.properties.pseudonymization.properties.method.const === "hmac_sha256", "pseudonymization method");
assert(future.properties.pseudonymization.properties.unkeyedHashPermitted.const === false, "unkeyed hashes prohibited");
assert(future.properties.outputBoundary.properties.aggregateOnly.const === true, "aggregate-only output");
assert(future.properties.outputBoundary.properties.nodeListIncluded.const === false, "node-list output prohibited");
assert(future.properties.outputBoundary.properties.edgeListIncluded.const === false, "edge-list output prohibited");
assert(future.properties.executionBoundary.properties.realUserAssignmentAllowed.const === false, "future assignment boundary");
assert(future.properties.executionBoundary.properties.pr534ActivationAllowed.const === false, "PR 534 boundary");

process.stdout.write(`${JSON.stringify({ok:true, eligibleDirectedDyadCount:0, realGraphDiagnosticsStatus:"blocked_not_run", executionDecision:"no_launch"})}\n`);
