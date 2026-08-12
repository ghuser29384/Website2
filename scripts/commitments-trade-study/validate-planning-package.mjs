import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { assignTradeClusters, sha256 } from "./assignment.mjs";
import { analyzeTradeStudy } from "./analysis.mjs";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(MODULE_DIR, "../..");
const CANDIDATE_DIR = path.join(
  ROOT,
  "docs/commitments/impact-identification/study-candidates/trade-bilateral-encouragement-planning-v1",
);
const PATHS = {
  schema: path.join(ROOT, "docs/commitments/impact-identification/study-instance.schema.v2.json"),
  template: path.join(ROOT, "docs/commitments/impact-identification/study-templates/trade.v2.json"),
  candidate: path.join(CANDIDATE_DIR, "study-instance.json"),
  envelope: path.join(CANDIDATE_DIR, "eligible-population-planning-envelope.json"),
  spec: path.join(CANDIDATE_DIR, "precision-spec.json"),
  report: path.join(CANDIDATE_DIR, "precision-report.json"),
  assignment: path.join(MODULE_DIR, "assignment.mjs"),
  analysis: path.join(MODULE_DIR, "analysis.mjs"),
  precision: path.join(MODULE_DIR, "precision.mjs"),
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function rawSha256(file) {
  return `sha256:${crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex")}`;
}

function validateCandidate(candidate, schema, template, envelope, spec, report) {
  const actualKeys = Object.keys(candidate).sort();
  const requiredKeys = [...schema.required].sort();
  assert(
    JSON.stringify(actualKeys) === JSON.stringify(requiredKeys),
    "Study candidate must contain exactly the study-instance schema required keys.",
  );
  assert(candidate.studyKey === "synthetic:trade-bilateral-encouragement-planning-v1", "studyKey mismatch.");
  assert(candidate.mechanismFamily === "trade", "mechanismFamily mismatch.");
  assert(candidate.studyVariant === "graph_cluster_role_2x2_encouragement", "studyVariant mismatch.");
  assert(candidate.protocolPayloadHash === "sha256:cd663ae722ee028ddfe3e1b866acab9ef79b5fcf5b5418d053bd3687eca3881a", "protocol hash mismatch.");
  assert(candidate.templateKey === template.templateKey, "templateKey mismatch.");
  assert(candidate.templatePayloadHash === template.payloadSha256, "templatePayloadHash mismatch.");
  assert(candidate.evidenceToProductMappingHash === "sha256:eb4aadae8491c1a6924fca03acdeb9157b07a1439098e736c88e549db16b59b8", "evidence mapping hash mismatch.");
  assert(candidate.eligiblePopulationSnapshotHash === sha256(envelope), "eligible-population planning-envelope hash mismatch.");
  assert(candidate.assignmentCodeHash === rawSha256(PATHS.assignment), "assignmentCodeHash mismatch.");
  assert(candidate.analysisCodeHash === rawSha256(PATHS.analysis), "analysisCodeHash mismatch.");

  const candidateWithoutSelfHash = structuredClone(candidate);
  delete candidateWithoutSelfHash.studyInstancePayloadHash;
  assert(
    candidate.studyInstancePayloadHash === sha256(candidateWithoutSelfHash),
    "studyInstancePayloadHash mismatch.",
  );

  assert(candidate.instrumentationEnvironment === "qa", "instrumentationEnvironment must remain qa.");
  assert(candidate.subjectMode === "synthetic_only", "subjectMode must remain synthetic_only.");
  assert(candidate.executionAuthorized === false, "executionAuthorized must remain false.");
  assert(candidate.realUserAssignmentAllowed === false, "realUserAssignmentAllowed must remain false.");
  assert(candidate.graphDiagnostics.status === "required_not_completed", "Real graph diagnostics must remain incomplete.");
  assert(candidate.precisionSimulation.status === "passed", "Precision simulation must be completed.");
  assert(candidate.precisionSimulation.noLaunchDetermination === "no_launch", "Precision simulation must remain no-launch.");
  assert(candidate.ethicsDetermination.status === "required_not_completed", "Independent ethics determination must remain incomplete.");
  assert(candidate.consentOrWaiver.independentlyApproved === false, "Consent or waiver must not be marked approved.");
  assert(candidate.primaryEstimand.estimandType === "assignment_policy_itt", "Primary estimand must remain assignment-policy ITT.");
  assert(candidate.primaryEstimand.claimScope === "policy_level", "Claim scope must remain policy-level.");
  assert(candidate.outcomeRegistry.some((entry) => JSON.stringify(entry) === JSON.stringify(candidate.primaryOutcome)), "outcomeRegistry must contain the primary outcome.");
  assert(candidate.blockingSafetyOutcomes.length === 7, "All seven safety vetoes are required.");
  assert(candidate.evidenceReferenceSchemes.length === 1 && candidate.evidenceReferenceSchemes[0] === "qa-evidence://synthetic/", "Only synthetic QA evidence is permitted.");

  assert(spec.executionAuthorized === false && spec.realUserAssignmentAllowed === false, "Precision spec must remain non-executing.");
  assert(report.simulationSpecHash === sha256(spec), "Precision report is bound to a different spec.");
  const reportWithoutSelfHash = structuredClone(report);
  delete reportWithoutSelfHash.reportPayloadHash;
  assert(report.reportPayloadHash === sha256(reportWithoutSelfHash), "reportPayloadHash mismatch.");
  assert(report.executionDecision.determination === "no_launch", "Precision report must remain no-launch.");
  assert(report.typeIErrorPointWithinTolerance === true, "Point-estimate type-I error diagnostic failed.");
  assert(report.typeIErrorMonteCarloUpperWithinTolerance === false, "Monte Carlo uncertainty warning unexpectedly disappeared; review is required before changing this invariant.");
  assert(report.smallestPlanningCandidate?.clustersPerArm === 800, "Expected conservative planning envelope of 800 clusters per arm.");
  assert(report.smallestPlanningCandidate?.totalClusters === 3200, "Expected 3200 total clusters in the conservative planning envelope.");
  assert(
    candidate.sensitivityAnalyses.includes(`bind interpretation to precision report ${report.reportPayloadHash}`),
    "Study candidate does not bind the exact precision report.",
  );
}

function runAssignmentSelfTest() {
  const clusters = [];
  for (const stratum of ["small", "large"]) {
    for (let index = 0; index < 8; index += 1) {
      clusters.push({
        clusterKey: `synthetic:${stratum}:${index}`,
        stratumKey: stratum,
        eligibleDyadCount: stratum === "small" ? 4 + index : 12 + index,
      });
    }
  }
  const snapshot = [...clusters]
    .map((entry) => ({ ...entry }))
    .sort((left, right) => left.clusterKey.localeCompare(right.clusterKey));
  const snapshotHash = sha256(snapshot);
  const seed = "synthetic:assignment-self-test-seed-v1";
  const first = assignTradeClusters({ clusters, seed, expectedSnapshotHash: snapshotHash });
  const second = assignTradeClusters({ clusters, seed, expectedSnapshotHash: snapshotHash });
  assert(JSON.stringify(first) === JSON.stringify(second), "Assignment is not deterministic for a frozen seed.");
  const counts = Object.fromEntries(first.arms.map((arm) => [arm, 0]));
  for (const assignment of first.assignments) counts[assignment.armKey] += 1;
  assert(Object.values(counts).every((count) => count === 4), "Blocked assignment is not arm-balanced.");
  assert(/^sha256:[0-9a-f]{64}$/.test(first.assignmentManifestHash), "Assignment manifest hash is invalid.");

  let rejected = false;
  try {
    assignTradeClusters({ clusters, seed, expectedSnapshotHash: `sha256:${"0".repeat(64)}` });
  } catch {
    rejected = true;
  }
  assert(rejected, "Assignment must reject a changed eligible-population snapshot.");
}

function runAnalysisSelfTest() {
  const records = [];
  const outcomes = {
    neither_role: 1,
    role_a_only: 2,
    role_b_only: 2,
    both_roles: 3,
  };
  for (const [armKey, outcome] of Object.entries(outcomes)) {
    for (let index = 0; index < 12; index += 1) {
      records.push({
        clusterKey: `synthetic:${armKey}:${index}`,
        armKey,
        observedDyadCount: 10,
        reviewedOutcomeTotal: outcome,
      });
    }
  }
  const result = analyzeTradeStudy(records, {
    seed: "synthetic:analysis-self-test-seed-v1",
    permutations: 1000,
  });
  assert(Math.abs(result.estimate.estimate - 0.2) < 1e-12, "Known policy ITT estimate mismatch.");
  assert(result.estimate.claimScope === "policy_level", "Analysis claim scope escaped policy level.");
  assert(result.estimate.participantSpecificCreditAuthorized === false, "Participant-specific credit was enabled.");
  assert(result.estimate.additiveParticipantAttributionAuthorized === false, "Additive participant attribution was enabled.");
  assert(result.evidenceBoundary.doesNotSupport.includes("participant_direct_causal_attribution"), "Analysis evidence boundary is incomplete.");
}

function runNegativeSelfTests(candidate, schema, template, envelope, spec, report) {
  for (const [label, mutate] of [
    ["execution authorization", (copy) => { copy.executionAuthorized = true; }],
    ["real-user assignment", (copy) => { copy.realUserAssignmentAllowed = true; }],
    ["participant-level estimand", (copy) => { copy.primaryEstimand.claimScope = "participant_level"; }],
    ["precision launch", (copy) => { copy.precisionSimulation.noLaunchDetermination = "eligible_for_separate_execution_review"; }],
    ["ethics approval", (copy) => { copy.ethicsDetermination.status = "approved_for_separate_execution_review"; }],
  ]) {
    const copy = structuredClone(candidate);
    mutate(copy);
    let rejected = false;
    try {
      validateCandidate(copy, schema, template, envelope, spec, report);
    } catch {
      rejected = true;
    }
    assert(rejected, `Negative self-test failed to reject ${label}.`);
  }
}

function main() {
  const acceptedValidatorPath = path.join(
    ROOT,
    "scripts/validate-commitments-impact-study-instance.mjs",
  );
  if (fs.existsSync(acceptedValidatorPath)) {
    const baseValidation = spawnSync(
      process.execPath,
      [acceptedValidatorPath],
      { cwd: ROOT, encoding: "utf8" },
    );
    if (baseValidation.status !== 0) {
      process.stderr.write(baseValidation.stdout ?? "");
      process.stderr.write(baseValidation.stderr ?? "");
      throw new Error("Accepted study-instance validator failed before candidate validation.");
    }
  }

  const schema = readJson(PATHS.schema);
  const template = readJson(PATHS.template);
  const candidate = readJson(PATHS.candidate);
  const envelope = readJson(PATHS.envelope);
  const spec = readJson(PATHS.spec);
  const report = readJson(PATHS.report);

  validateCandidate(candidate, schema, template, envelope, spec, report);
  runAssignmentSelfTest();
  runAnalysisSelfTest();
  runNegativeSelfTests(candidate, schema, template, envelope, spec, report);

  process.stdout.write(
    `${JSON.stringify({
      ok: true,
      studyInstancePayloadHash: candidate.studyInstancePayloadHash,
      precisionReportPayloadHash: report.reportPayloadHash,
      assignmentCodeHash: candidate.assignmentCodeHash,
      analysisCodeHash: candidate.analysisCodeHash,
      executionAuthorized: false,
      realUserAssignmentAllowed: false,
    })}\n`,
  );
}

main();
