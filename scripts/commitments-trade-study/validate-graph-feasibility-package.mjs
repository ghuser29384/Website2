import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  diagnoseSyntheticGraph,
  generateSyntheticSnapshot,
  sha256,
  validateSyntheticSpec,
} from "./graph-feasibility-core.mjs";
import {
  generateCommittedReport,
  PATHS,
  rawSha256,
} from "./graph-feasibility.mjs";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(MODULE_DIR, "../..");
const PACKAGE_DIR = path.dirname(PATHS.contract);
const STUDY_DIR = path.dirname(PACKAGE_DIR);
const REFERENCES = Object.freeze({
  studyInstance: path.join(STUDY_DIR, "study-instance.json"),
  precisionReport: path.join(STUDY_DIR, "precision-report.json"),
  planningValidator: path.join(MODULE_DIR, "validate-planning-package.mjs"),
  precisionRunner: path.join(MODULE_DIR, "precision.mjs"),
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function assertExactKeys(value, expected, label) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  assert(JSON.stringify(actual) === JSON.stringify(wanted), `${label} key set mismatch.`);
}

function rawHashFromText(text) {
  return `sha256:${crypto.createHash("sha256").update(text, "utf8").digest("hex")}`;
}

function runExistingPlanningChecks() {
  for (const [label, command, args] of [
    ["planning validator", REFERENCES.planningValidator, []],
    ["precision report", REFERENCES.precisionRunner, ["--check"]],
  ]) {
    if (!fs.existsSync(command)) continue;
    const result = spawnSync(process.execPath, [command, ...args], {
      cwd: ROOT,
      encoding: "utf8",
    });
    if (result.status !== 0) {
      process.stderr.write(result.stdout ?? "");
      process.stderr.write(result.stderr ?? "");
      throw new Error(`Existing ${label} failed before graph-feasibility validation.`);
    }
  }
}

function validateContract(contract, snapshotSchema, spec) {
  assertExactKeys(
    contract,
    [
      "schemaVersion",
      "status",
      "boundStudyKey",
      "boundStudyInstancePayloadHash",
      "boundPrecisionReportPayloadHash",
      "boundProtocolPayloadHash",
      "boundTemplatePayloadHash",
      "snapshotSchemaHash",
      "diagnosticCodeHash",
      "runnerCodeHash",
      "syntheticSpecPayloadHash",
      "privacyBoundary",
      "clusterDefinition",
      "frozenPlanningEnvelope",
      "decisionPolicy",
      "realGraphDiagnosticsStatus",
      "executionAuthorized",
      "realUserAssignmentAllowed",
      "contractPayloadHash",
    ],
    "graph-feasibility contract",
  );
  assert(contract.schemaVersion === "commitments-trade-graph-feasibility-contract-v1", "contract schemaVersion mismatch.");
  assert(contract.status === "synthetic_implementation_only", "contract status must remain synthetic-only.");
  assert(contract.boundStudyKey === "synthetic:trade-bilateral-encouragement-planning-v1", "boundStudyKey mismatch.");
  assert(contract.boundStudyInstancePayloadHash === "sha256:1e31b1db59899fbf07fbf8b6219c8699f0c6b0ddbeb6e8717f989487660aaba2", "study-instance binding mismatch.");
  assert(contract.boundPrecisionReportPayloadHash === "sha256:3ff2613f93d166e5e06a5bf8cfcaf029cd49d4e56690e345f676a51f982f6b4f", "precision-report binding mismatch.");
  assert(contract.boundProtocolPayloadHash === "sha256:cd663ae722ee028ddfe3e1b866acab9ef79b5fcf5b5418d053bd3687eca3881a", "protocol binding mismatch.");
  assert(contract.boundTemplatePayloadHash === "sha256:cf0a7a96294b431dcd79879fa01b7d1031ea50a842cebca6986e13351bcbb1e1", "template binding mismatch.");
  assert(contract.snapshotSchemaHash === sha256(snapshotSchema), "snapshot schema hash mismatch.");
  assert(contract.diagnosticCodeHash === rawSha256(PATHS.core), "diagnostic code hash mismatch.");
  assert(contract.runnerCodeHash === rawSha256(PATHS.runner), "runner code hash mismatch.");
  assert(contract.syntheticSpecPayloadHash === spec.specPayloadHash, "synthetic spec binding mismatch.");
  assert(contract.privacyBoundary.repositoryInputs === "synthetic_only", "repository inputs must remain synthetic-only.");
  assert(contract.privacyBoundary.rawIdentifiersPermitted === false, "Raw identifiers must remain prohibited.");
  assert(contract.privacyBoundary.reversibleMappingPermitted === false, "Reversible mappings must remain prohibited.");
  assert(contract.privacyBoundary.aggregateReportOnly === true, "Only aggregate reports may leave the protected boundary.");
  assert(contract.clusterDefinition.method === "weakly_connected_components_of_frozen_eligible_directed_dyads", "cluster method mismatch.");
  assert(contract.clusterDefinition.partitioningAuthorized === false, "Unreviewed partitioning must remain prohibited.");
  assert(JSON.stringify(contract.frozenPlanningEnvelope) === JSON.stringify(spec.planningEnvelope), "Contract and spec planning envelopes differ.");
  assert(contract.decisionPolicy.compatibleSyntheticFixtureDoesNotCompleteRealDiagnostics === true, "Synthetic compatibility must not complete real diagnostics.");
  assert(contract.decisionPolicy.anyRealDistributionMismatchRequiresNewPrecisionSimulation === true, "Real distribution mismatch must require a new precision simulation.");
  assert(contract.decisionPolicy.assignmentGenerationPermitted === false, "Assignment generation must remain prohibited.");
  assert(contract.decisionPolicy.assignmentSeedGenerationPermitted === false, "Assignment seed generation must remain prohibited.");
  assert(contract.realGraphDiagnosticsStatus === "required_not_completed", "Real graph diagnostics must remain incomplete.");
  assert(contract.executionAuthorized === false, "executionAuthorized must remain false.");
  assert(contract.realUserAssignmentAllowed === false, "realUserAssignmentAllowed must remain false.");
  const withoutHash = structuredClone(contract);
  delete withoutHash.contractPayloadHash;
  assert(contract.contractPayloadHash === sha256(withoutHash), "contractPayloadHash mismatch.");
}

function validateSnapshotSchema(schema) {
  assert(schema.$schema === "https://json-schema.org/draft/2020-12/schema", "Unexpected JSON Schema draft.");
  assert(schema.additionalProperties === false, "Snapshot schema must reject additional top-level fields.");
  assert(schema.properties.subjectMode.const === "synthetic_only", "Snapshot schema must remain synthetic-only.");
  assert(schema.properties.instrumentationEnvironment.const === "qa", "Snapshot schema must remain QA-only.");
  assert(schema.properties.eligibilityFrozen.const === false, "Synthetic schema must not claim frozen real eligibility.");
  assert(schema.properties.containsRealUserData.const === false, "Snapshot schema must reject real user data.");
  assert(schema.properties.identifierPolicy.properties.reversibleMappingPresent.const === false, "Schema must reject reversible mappings.");
  assert(schema.properties.identifierPolicy.properties.rawIdentifierFieldsPresent.const === false, "Schema must reject raw identifiers.");
}

function validateReport(report, contract, spec, snapshotSchema) {
  const regenerated = generateCommittedReport();
  assert(JSON.stringify(report) === JSON.stringify(regenerated), "Committed report differs from deterministic regeneration.");
  assert(report.contractPayloadHash === contract.contractPayloadHash, "Report contract binding mismatch.");
  assert(report.specPayloadHash === spec.specPayloadHash, "Report spec binding mismatch.");
  assert(report.snapshotSchemaHash === sha256(snapshotSchema), "Report schema binding mismatch.");
  assert(report.diagnosticCodeHash === rawSha256(PATHS.core), "Report diagnostic code hash mismatch.");
  assert(report.runnerCodeHash === rawSha256(PATHS.runner), "Report runner code hash mismatch.");
  const withoutHash = structuredClone(report);
  delete withoutHash.reportPayloadHash;
  assert(report.reportPayloadHash === sha256(withoutHash), "reportPayloadHash mismatch.");
  assert(report.structuralDetermination === "compatible_with_frozen_precision_envelope", "Synthetic fixture should satisfy the frozen structural envelope.");
  assert(report.graphSummary.weaklyConnectedComponentCount === 3200, "Expected 3200 synthetic components.");
  assert(report.graphSummary.eligibleDirectedDyadCount === 25600, "Expected 25,600 synthetic dyads.");
  assert(report.graphSummary.nodeCount === 28800, "Expected 28,800 synthetic nodes.");
  assert(report.graphSummary.meanEligibleDyadsPerCluster === 8, "Expected mean cluster size of eight dyads.");
  assert(report.graphSummary.maximumEligibleDyadsPerCluster === 12, "Unexpected maximum synthetic cluster size.");
  assert(report.graphSummary.componentCountByStratum.length === 4, "Expected four frozen strata.");
  assert(report.graphSummary.componentCountByStratum.every((entry) => entry.componentCount === 800), "Expected 800 components in each stratum.");
  assert(Object.values(report.privacyChecks).every(Boolean), "A privacy check failed.");
  assert(Object.values(report.designSupportChecks).every(Boolean), "A structural support check failed.");
  assert(report.realGraphDiagnosticsStatus === "required_not_completed", "Real graph diagnostics were incorrectly completed.");
  assert(report.assignmentGenerated === false, "Assignment generation was enabled.");
  assert(report.assignmentSeedGenerated === false, "Assignment seed generation was enabled.");
  assert(report.executionAuthorized === false, "Report authorized execution.");
  assert(report.realUserAssignmentAllowed === false, "Report allowed real-user assignment.");
  assert(report.executionDecision.determination === "no_launch", "Report must remain no-launch.");
}

function expectRejected(label, operation) {
  let rejected = false;
  try {
    operation();
  } catch {
    rejected = true;
  }
  assert(rejected, `Negative self-test failed to reject ${label}.`);
}

function withRecomputedSpecHash(spec) {
  const copy = structuredClone(spec);
  delete copy.specPayloadHash;
  copy.specPayloadHash = sha256(copy);
  return copy;
}

function runNegativeSelfTests(spec) {
  const baseSnapshot = generateSyntheticSnapshot(spec);

  expectRejected("non-synthetic subject mode", () => {
    const copy = structuredClone(spec);
    copy.subjectMode = "pseudonymous_real";
    copy.specPayloadHash = sha256(Object.fromEntries(Object.entries(copy).filter(([key]) => key !== "specPayloadHash")));
    validateSyntheticSpec(copy);
  });

  expectRejected("real-user marker", () => {
    const copy = structuredClone(baseSnapshot);
    copy.containsRealUserData = true;
    diagnoseSyntheticGraph(copy, spec.planningEnvelope);
  });

  expectRejected("raw email field", () => {
    const copy = structuredClone(baseSnapshot);
    copy.nodes[0].email = "synthetic@example.invalid";
    diagnoseSyntheticGraph(copy, spec.planningEnvelope);
  });

  expectRejected("non-synthetic identifier", () => {
    const copy = structuredClone(baseSnapshot);
    copy.nodes[0].nodeKey = "user:123";
    diagnoseSyntheticGraph(copy, spec.planningEnvelope);
  });

  expectRejected("reversible mapping", () => {
    const copy = structuredClone(baseSnapshot);
    copy.identifierPolicy.reversibleMappingPresent = true;
    diagnoseSyntheticGraph(copy, spec.planningEnvelope);
  });

  expectRejected("self-loop dyad", () => {
    const copy = structuredClone(baseSnapshot);
    copy.dyads[0].targetNodeKey = copy.dyads[0].sourceNodeKey;
    diagnoseSyntheticGraph(copy, spec.planningEnvelope);
  });

  expectRejected("duplicate directed dyad", () => {
    const copy = structuredClone(baseSnapshot);
    copy.dyads[1].sourceNodeKey = copy.dyads[0].sourceNodeKey;
    copy.dyads[1].targetNodeKey = copy.dyads[0].targetNodeKey;
    diagnoseSyntheticGraph(copy, spec.planningEnvelope);
  });

  const insufficientSpec = withRecomputedSpecHash({
    ...structuredClone(spec),
    strata: spec.strata.map((entry) => ({ ...entry, componentCount: 4 })),
  });
  const insufficient = diagnoseSyntheticGraph(
    generateSyntheticSnapshot(insufficientSpec),
    insufficientSpec.planningEnvelope,
  );
  assert(insufficient.designSupportChecks.minimumIndependentClustersMet === false, "Insufficient-cluster diagnostic did not fail closed.");
  assert(insufficient.structuralDetermination === "requires_new_precision_or_partition_review", "Insufficient clusters did not require review.");

  const oversizedSpec = withRecomputedSpecHash({
    ...structuredClone(spec),
    strata: [
      {
        stratumFixtureKey: "oversized_high_mixed",
        componentCount: 3200,
        dyadsPerComponent: 41,
        baselineCompletionRiskBand: "high",
        opportunityTypeBand: "mixed_resources",
      },
    ],
  });
  const oversized = diagnoseSyntheticGraph(
    generateSyntheticSnapshot(oversizedSpec),
    oversizedSpec.planningEnvelope,
  );
  assert(oversized.designSupportChecks.maximumEligibleDyadsPerClusterWithinFrozenMaximum === false, "Oversized components did not fail closed.");
  assert(oversized.structuralDetermination === "requires_new_precision_or_partition_review", "Oversized components did not require review.");

  const incompleteBlockSpec = withRecomputedSpecHash({
    ...structuredClone(spec),
    strata: spec.strata.map((entry, index) => ({
      ...entry,
      componentCount: index === 0 ? 801 : entry.componentCount,
    })),
  });
  const incomplete = diagnoseSyntheticGraph(
    generateSyntheticSnapshot(incompleteBlockSpec),
    incompleteBlockSpec.planningEnvelope,
  );
  assert(incomplete.designSupportChecks.allStrataDivisibleByRequiredArmCount === false, "Incomplete blocks did not fail closed.");
  assert(incomplete.structuralDetermination === "requires_new_precision_or_partition_review", "Incomplete blocks did not require review.");
}

function validateNoAssignmentSurface() {
  const coreText = fs.readFileSync(PATHS.core, "utf8");
  const runnerText = fs.readFileSync(PATHS.runner, "utf8");
  const combined = `${coreText}\n${runnerText}`;
  for (const prohibited of [
    "assignTradeClusters(",
    "assignmentManifest",
    "createPrng(",
    "Math.random(",
    "randomBytes(",
  ]) {
    assert(!combined.includes(prohibited), `Graph-feasibility implementation contains prohibited assignment or entropy surface: ${prohibited}`);
  }
  assert(rawHashFromText(coreText) === rawSha256(PATHS.core), "Core raw hash helper mismatch.");
  assert(rawHashFromText(runnerText) === rawSha256(PATHS.runner), "Runner raw hash helper mismatch.");
}

function validateBoundFiles(contract) {
  if (fs.existsSync(REFERENCES.studyInstance)) {
    const study = readJson(REFERENCES.studyInstance);
    assert(study.studyKey === contract.boundStudyKey, "Bound studyKey differs from committed study instance.");
    assert(study.studyInstancePayloadHash === contract.boundStudyInstancePayloadHash, "Bound study-instance hash differs from committed study instance.");
    assert(study.graphDiagnostics.status === "required_not_completed", "Synthetic graph package must not complete real graph diagnostics.");
    assert(study.executionAuthorized === false && study.realUserAssignmentAllowed === false, "Bound study instance escaped no-launch boundary.");
  }
  if (fs.existsSync(REFERENCES.precisionReport)) {
    const precision = readJson(REFERENCES.precisionReport);
    assert(precision.reportPayloadHash === contract.boundPrecisionReportPayloadHash, "Bound precision hash differs from committed precision report.");
    assert(precision.executionDecision.determination === "no_launch", "Bound precision report must remain no-launch.");
  }
}

function main() {
  runExistingPlanningChecks();
  const contract = readJson(PATHS.contract);
  const snapshotSchema = readJson(PATHS.snapshotSchema);
  const spec = readJson(PATHS.spec);
  const report = readJson(PATHS.report);

  validateSyntheticSpec(spec);
  validateSnapshotSchema(snapshotSchema);
  validateContract(contract, snapshotSchema, spec);
  validateBoundFiles(contract);
  validateReport(report, contract, spec, snapshotSchema);
  validateNoAssignmentSurface();
  runNegativeSelfTests(spec);

  process.stdout.write(`${JSON.stringify({
    ok: true,
    contractPayloadHash: contract.contractPayloadHash,
    specPayloadHash: spec.specPayloadHash,
    reportPayloadHash: report.reportPayloadHash,
    snapshotPayloadHash: report.snapshotPayloadHash,
    weaklyConnectedComponentCount: report.graphSummary.weaklyConnectedComponentCount,
    structuralDetermination: report.structuralDetermination,
    realGraphDiagnosticsStatus: report.realGraphDiagnosticsStatus,
    executionDecision: report.executionDecision.determination,
    assignmentGenerated: report.assignmentGenerated,
    realUserAssignmentAllowed: report.realUserAssignmentAllowed,
  })}\n`);
}

main();
