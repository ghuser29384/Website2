import crypto from "node:crypto";

const SNAPSHOT_SCHEMA_VERSION = "commitments-trade-graph-snapshot-v1";
const REPORT_SCHEMA_VERSION = "commitments-trade-graph-feasibility-report-v1";
const SYNTHETIC_KEY = /^synthetic:[A-Za-z0-9][A-Za-z0-9._:-]{0,191}$/;
const FORBIDDEN_IDENTIFIER_FIELDS = new Set([
  "accountId",
  "address",
  "authId",
  "displayName",
  "email",
  "externalId",
  "handle",
  "ip",
  "name",
  "phone",
  "profileUrl",
  "rawUserId",
  "userId",
  "username",
]);
const ALLOWED_RISK_BANDS = Object.freeze(["low", "medium", "high"]);
const ALLOWED_OPPORTUNITY_TYPES = Object.freeze([
  "action_for_action",
  "funding_for_action",
  "funding_for_funding",
  "mixed_resources",
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

export function sha256(value) {
  const text = typeof value === "string" ? value : canonicalJson(value);
  return `sha256:${crypto.createHash("sha256").update(text, "utf8").digest("hex")}`;
}

function round(value, digits = 12) {
  if (!Number.isFinite(value)) return value;
  return Number(value.toFixed(digits));
}

function assertExactKeys(value, expected, label) {
  const actualKeys = Object.keys(value).sort();
  const expectedKeys = [...expected].sort();
  assert(
    JSON.stringify(actualKeys) === JSON.stringify(expectedKeys),
    `${label} must contain exactly: ${expectedKeys.join(", ")}.`,
  );
}

function scanForbiddenFields(value, path = "$") {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      scanForbiddenFields(value[index], `${path}[${index}]`);
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, entry] of Object.entries(value)) {
    assert(!FORBIDDEN_IDENTIFIER_FIELDS.has(key), `Forbidden identifier field ${path}.${key}.`);
    scanForbiddenFields(entry, `${path}.${key}`);
  }
}

export function validateSyntheticSpec(spec) {
  assert(spec && typeof spec === "object" && !Array.isArray(spec), "spec must be an object.");
  assertExactKeys(
    spec,
    [
      "schemaVersion",
      "fixtureKey",
      "subjectMode",
      "instrumentationEnvironment",
      "eligibilityFrozen",
      "containsRealUserData",
      "identifierPolicy",
      "strata",
      "planningEnvelope",
      "executionAuthorized",
      "realUserAssignmentAllowed",
      "specPayloadHash",
    ],
    "synthetic graph spec",
  );
  assert(spec.schemaVersion === "commitments-trade-synthetic-graph-spec-v1", "spec schemaVersion mismatch.");
  assert(SYNTHETIC_KEY.test(spec.fixtureKey), "fixtureKey must be synthetic.");
  assert(spec.subjectMode === "synthetic_only", "subjectMode must remain synthetic_only.");
  assert(spec.instrumentationEnvironment === "qa", "instrumentationEnvironment must remain qa.");
  assert(spec.eligibilityFrozen === false, "The synthetic fixture must not claim frozen real eligibility.");
  assert(spec.containsRealUserData === false, "The synthetic fixture must not contain real user data.");
  assert(spec.executionAuthorized === false, "executionAuthorized must remain false.");
  assert(spec.realUserAssignmentAllowed === false, "realUserAssignmentAllowed must remain false.");
  assertExactKeys(
    spec.identifierPolicy,
    ["scheme", "reversibleMappingPresent", "rawIdentifierFieldsPresent"],
    "identifierPolicy",
  );
  assert(spec.identifierPolicy.scheme === "synthetic_prefixed", "Only synthetic-prefixed identifiers are permitted.");
  assert(spec.identifierPolicy.reversibleMappingPresent === false, "A reversible identifier mapping is prohibited.");
  assert(spec.identifierPolicy.rawIdentifierFieldsPresent === false, "Raw identifier fields are prohibited.");
  assert(Array.isArray(spec.strata) && spec.strata.length > 0, "strata must be non-empty.");
  const fixtureStrata = new Set();
  for (const stratum of spec.strata) {
    assertExactKeys(
      stratum,
      [
        "stratumFixtureKey",
        "componentCount",
        "dyadsPerComponent",
        "baselineCompletionRiskBand",
        "opportunityTypeBand",
      ],
      "stratum fixture",
    );
    assert(/^[a-z0-9][a-z0-9_:-]{0,127}$/.test(stratum.stratumFixtureKey), "Invalid stratumFixtureKey.");
    assert(!fixtureStrata.has(stratum.stratumFixtureKey), "stratumFixtureKey values must be unique.");
    fixtureStrata.add(stratum.stratumFixtureKey);
    assert(Number.isInteger(stratum.componentCount) && stratum.componentCount > 0, "componentCount must be positive.");
    assert(Number.isInteger(stratum.dyadsPerComponent) && stratum.dyadsPerComponent > 0, "dyadsPerComponent must be positive.");
    assert(ALLOWED_RISK_BANDS.includes(stratum.baselineCompletionRiskBand), "Invalid baselineCompletionRiskBand.");
    assert(ALLOWED_OPPORTUNITY_TYPES.includes(stratum.opportunityTypeBand), "Invalid opportunityTypeBand.");
  }
  assertExactKeys(
    spec.planningEnvelope,
    [
      "minimumIndependentClusters",
      "frozenMeanEligibleDyadsPerCluster",
      "maximumClusterSizeCoefficientOfVariation",
      "maximumEligibleDyadsPerCluster",
      "requiredArmCount",
    ],
    "planningEnvelope",
  );
  assert(Number.isInteger(spec.planningEnvelope.minimumIndependentClusters) && spec.planningEnvelope.minimumIndependentClusters > 0, "minimumIndependentClusters must be positive.");
  assert(Number.isFinite(spec.planningEnvelope.frozenMeanEligibleDyadsPerCluster) && spec.planningEnvelope.frozenMeanEligibleDyadsPerCluster > 0, "frozenMeanEligibleDyadsPerCluster must be positive.");
  assert(Number.isFinite(spec.planningEnvelope.maximumClusterSizeCoefficientOfVariation) && spec.planningEnvelope.maximumClusterSizeCoefficientOfVariation >= 0, "maximumClusterSizeCoefficientOfVariation is invalid.");
  assert(Number.isInteger(spec.planningEnvelope.maximumEligibleDyadsPerCluster) && spec.planningEnvelope.maximumEligibleDyadsPerCluster > 0, "maximumEligibleDyadsPerCluster must be positive.");
  assert(spec.planningEnvelope.requiredArmCount === 4, "requiredArmCount must remain four.");

  const withoutHash = structuredClone(spec);
  delete withoutHash.specPayloadHash;
  assert(spec.specPayloadHash === sha256(withoutHash), "specPayloadHash mismatch.");
}

export function generateSyntheticSnapshot(spec) {
  validateSyntheticSpec(spec);
  const nodes = [];
  const dyads = [];
  let dyadOrdinal = 0;

  for (const stratum of spec.strata) {
    for (let componentIndex = 0; componentIndex < stratum.componentCount; componentIndex += 1) {
      const componentKey = `${stratum.stratumFixtureKey}:${String(componentIndex).padStart(4, "0")}`;
      const componentNodes = [];
      for (let nodeIndex = 0; nodeIndex <= stratum.dyadsPerComponent; nodeIndex += 1) {
        const nodeKey = `synthetic:node:${componentKey}:${String(nodeIndex).padStart(2, "0")}`;
        componentNodes.push(nodeKey);
        nodes.push({ nodeKey });
      }
      for (let edgeIndex = 0; edgeIndex < stratum.dyadsPerComponent; edgeIndex += 1) {
        dyads.push({
          dyadKey: `synthetic:dyad:${String(dyadOrdinal).padStart(6, "0")}`,
          sourceNodeKey: componentNodes[edgeIndex],
          targetNodeKey: componentNodes[edgeIndex + 1],
          baselineCompletionRiskBand: stratum.baselineCompletionRiskBand,
          opportunityTypeBand: stratum.opportunityTypeBand,
        });
        dyadOrdinal += 1;
      }
    }
  }

  return {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    snapshotKey: spec.fixtureKey,
    subjectMode: spec.subjectMode,
    instrumentationEnvironment: spec.instrumentationEnvironment,
    eligibilityFrozen: spec.eligibilityFrozen,
    containsRealUserData: spec.containsRealUserData,
    identifierPolicy: structuredClone(spec.identifierPolicy),
    nodes,
    dyads,
  };
}

function validateSnapshot(snapshot) {
  assert(snapshot && typeof snapshot === "object" && !Array.isArray(snapshot), "snapshot must be an object.");
  assertExactKeys(
    snapshot,
    [
      "schemaVersion",
      "snapshotKey",
      "subjectMode",
      "instrumentationEnvironment",
      "eligibilityFrozen",
      "containsRealUserData",
      "identifierPolicy",
      "nodes",
      "dyads",
    ],
    "graph snapshot",
  );
  scanForbiddenFields(snapshot);
  assert(snapshot.schemaVersion === SNAPSHOT_SCHEMA_VERSION, "snapshot schemaVersion mismatch.");
  assert(SYNTHETIC_KEY.test(snapshot.snapshotKey), "snapshotKey must be synthetic.");
  assert(snapshot.subjectMode === "synthetic_only", "Only synthetic snapshots are accepted by this implementation.");
  assert(snapshot.instrumentationEnvironment === "qa", "Only QA instrumentation is accepted.");
  assert(snapshot.eligibilityFrozen === false, "Synthetic diagnostics must not claim frozen real eligibility.");
  assert(snapshot.containsRealUserData === false, "Real user data is prohibited.");
  assertExactKeys(
    snapshot.identifierPolicy,
    ["scheme", "reversibleMappingPresent", "rawIdentifierFieldsPresent"],
    "snapshot identifierPolicy",
  );
  assert(snapshot.identifierPolicy.scheme === "synthetic_prefixed", "Only synthetic-prefixed identifiers are accepted.");
  assert(snapshot.identifierPolicy.reversibleMappingPresent === false, "Reversible mappings are prohibited.");
  assert(snapshot.identifierPolicy.rawIdentifierFieldsPresent === false, "Raw identifier fields are prohibited.");
  assert(Array.isArray(snapshot.nodes) && snapshot.nodes.length > 0, "nodes must be non-empty.");
  assert(Array.isArray(snapshot.dyads) && snapshot.dyads.length > 0, "dyads must be non-empty.");

  const nodeKeys = new Set();
  for (const node of snapshot.nodes) {
    assertExactKeys(node, ["nodeKey"], "node");
    assert(SYNTHETIC_KEY.test(node.nodeKey), "nodeKey must be synthetic.");
    assert(!nodeKeys.has(node.nodeKey), "nodeKey values must be unique.");
    nodeKeys.add(node.nodeKey);
  }

  const dyadKeys = new Set();
  const directedPairs = new Set();
  for (const dyad of snapshot.dyads) {
    assertExactKeys(
      dyad,
      [
        "dyadKey",
        "sourceNodeKey",
        "targetNodeKey",
        "baselineCompletionRiskBand",
        "opportunityTypeBand",
      ],
      "dyad",
    );
    assert(SYNTHETIC_KEY.test(dyad.dyadKey), "dyadKey must be synthetic.");
    assert(SYNTHETIC_KEY.test(dyad.sourceNodeKey), "sourceNodeKey must be synthetic.");
    assert(SYNTHETIC_KEY.test(dyad.targetNodeKey), "targetNodeKey must be synthetic.");
    assert(nodeKeys.has(dyad.sourceNodeKey) && nodeKeys.has(dyad.targetNodeKey), "Every dyad endpoint must exist in nodes.");
    assert(dyad.sourceNodeKey !== dyad.targetNodeKey, "Self-loop dyads are prohibited.");
    assert(ALLOWED_RISK_BANDS.includes(dyad.baselineCompletionRiskBand), "Invalid dyad risk band.");
    assert(ALLOWED_OPPORTUNITY_TYPES.includes(dyad.opportunityTypeBand), "Invalid dyad opportunity type.");
    assert(!dyadKeys.has(dyad.dyadKey), "dyadKey values must be unique.");
    dyadKeys.add(dyad.dyadKey);
    const pairKey = `${dyad.sourceNodeKey}\u0000${dyad.targetNodeKey}`;
    assert(!directedPairs.has(pairKey), "Duplicate directed dyads are prohibited.");
    directedPairs.add(pairKey);
  }
}

class UnionFind {
  constructor(size) {
    this.parent = Array.from({ length: size }, (_, index) => index);
    this.rank = Array(size).fill(0);
  }

  find(index) {
    let current = index;
    while (this.parent[current] !== current) {
      this.parent[current] = this.parent[this.parent[current]];
      current = this.parent[current];
    }
    return current;
  }

  union(left, right) {
    let leftRoot = this.find(left);
    let rightRoot = this.find(right);
    if (leftRoot === rightRoot) return;
    if (this.rank[leftRoot] < this.rank[rightRoot]) [leftRoot, rightRoot] = [rightRoot, leftRoot];
    this.parent[rightRoot] = leftRoot;
    if (this.rank[leftRoot] === this.rank[rightRoot]) this.rank[leftRoot] += 1;
  }
}

function sizeBand(dyadCount) {
  if (dyadCount <= 4) return "small_1_4";
  if (dyadCount <= 10) return "medium_5_10";
  if (dyadCount <= 40) return "large_11_40";
  return "oversized_41_plus";
}

function riskBand(dyads) {
  let highest = 0;
  for (const dyad of dyads) {
    highest = Math.max(highest, ALLOWED_RISK_BANDS.indexOf(dyad.baselineCompletionRiskBand));
  }
  return ALLOWED_RISK_BANDS[highest];
}

function opportunityTypeBand(dyads) {
  const types = [...new Set(dyads.map((dyad) => dyad.opportunityTypeBand))].sort();
  return types.length === 1 ? types[0] : "mixed";
}

function populationCoefficientOfVariation(values) {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (mean === 0) return 0;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance) / mean;
}

export function diagnoseSyntheticGraph(snapshot, planningEnvelope) {
  validateSnapshot(snapshot);
  assert(planningEnvelope && typeof planningEnvelope === "object", "planningEnvelope is required.");

  const nodeIndex = new Map(snapshot.nodes.map((node, index) => [node.nodeKey, index]));
  const unionFind = new UnionFind(snapshot.nodes.length);
  for (const dyad of snapshot.dyads) {
    unionFind.union(nodeIndex.get(dyad.sourceNodeKey), nodeIndex.get(dyad.targetNodeKey));
  }

  const components = new Map();
  for (const node of snapshot.nodes) {
    const root = unionFind.find(nodeIndex.get(node.nodeKey));
    const component = components.get(root) ?? { nodeKeys: [], dyads: [] };
    component.nodeKeys.push(node.nodeKey);
    components.set(root, component);
  }
  for (const dyad of snapshot.dyads) {
    const root = unionFind.find(nodeIndex.get(dyad.sourceNodeKey));
    const component = components.get(root);
    component.dyads.push(dyad);
  }

  const componentSummaries = [...components.values()].map((component) => {
    const dyadCount = component.dyads.length;
    const stratumKey = [
      `size:${sizeBand(dyadCount)}`,
      `risk:${riskBand(component.dyads)}`,
      `type:${opportunityTypeBand(component.dyads)}`,
    ].join("|");
    return {
      nodeCount: component.nodeKeys.length,
      eligibleDyadCount: dyadCount,
      stratumKey,
    };
  });
  componentSummaries.sort((left, right) =>
    left.stratumKey.localeCompare(right.stratumKey) ||
    left.eligibleDyadCount - right.eligibleDyadCount ||
    left.nodeCount - right.nodeCount,
  );

  const componentSizes = componentSummaries.map((component) => component.eligibleDyadCount);
  const totalDyads = componentSizes.reduce((sum, value) => sum + value, 0);
  const componentCountByStratumMap = new Map();
  for (const component of componentSummaries) {
    componentCountByStratumMap.set(
      component.stratumKey,
      (componentCountByStratumMap.get(component.stratumKey) ?? 0) + 1,
    );
  }
  const componentCountByStratum = [...componentCountByStratumMap.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([stratumKey, componentCount]) => ({ stratumKey, componentCount }));

  const weaklyConnectedComponentCount = componentSummaries.length;
  const meanEligibleDyadsPerCluster = totalDyads / weaklyConnectedComponentCount;
  const clusterSizeCoefficientOfVariation = populationCoefficientOfVariation(componentSizes);
  const maximumEligibleDyadsPerCluster = Math.max(...componentSizes);
  const largestClusterShareOfDyads = maximumEligibleDyadsPerCluster / totalDyads;

  const designSupportChecks = {
    minimumIndependentClustersMet:
      weaklyConnectedComponentCount >= planningEnvelope.minimumIndependentClusters,
    frozenMeanEligibleDyadsPerClusterMatched:
      Math.abs(meanEligibleDyadsPerCluster - planningEnvelope.frozenMeanEligibleDyadsPerCluster) < 1e-12,
    clusterSizeCoefficientOfVariationWithinFrozenMaximum:
      clusterSizeCoefficientOfVariation <= planningEnvelope.maximumClusterSizeCoefficientOfVariation,
    maximumEligibleDyadsPerClusterWithinFrozenMaximum:
      maximumEligibleDyadsPerCluster <= planningEnvelope.maximumEligibleDyadsPerCluster,
    allStrataDivisibleByRequiredArmCount:
      componentCountByStratum.every(
        (entry) => entry.componentCount % planningEnvelope.requiredArmCount === 0,
      ),
    weakComponentsContainEveryDyad: componentSummaries.reduce(
      (sum, component) => sum + component.eligibleDyadCount,
      0,
    ) === snapshot.dyads.length,
    noCrossClusterDyadsByConstruction: true,
  };

  const structuralDetermination = Object.values(designSupportChecks).every(Boolean)
    ? "compatible_with_frozen_precision_envelope"
    : "requires_new_precision_or_partition_review";

  return {
    graphSummary: {
      nodeCount: snapshot.nodes.length,
      eligibleDirectedDyadCount: snapshot.dyads.length,
      weaklyConnectedComponentCount,
      meanEligibleDyadsPerCluster: round(meanEligibleDyadsPerCluster),
      clusterSizeCoefficientOfVariation: round(clusterSizeCoefficientOfVariation),
      maximumEligibleDyadsPerCluster,
      largestClusterShareOfDyads: round(largestClusterShareOfDyads),
      componentCountByStratum,
    },
    privacyChecks: {
      subjectModeSyntheticOnly: snapshot.subjectMode === "synthetic_only",
      instrumentationEnvironmentQa: snapshot.instrumentationEnvironment === "qa",
      containsRealUserDataFalse: snapshot.containsRealUserData === false,
      reversibleMappingAbsent: snapshot.identifierPolicy.reversibleMappingPresent === false,
      rawIdentifierFieldsAbsent: snapshot.identifierPolicy.rawIdentifierFieldsPresent === false,
      allIdentifiersSyntheticPrefixed: true,
    },
    designSupportChecks,
    structuralDetermination,
  };
}

export function buildGraphFeasibilityReport({
  contract,
  spec,
  snapshot,
  diagnosticCodeHash,
  runnerCodeHash,
  snapshotSchemaHash,
}) {
  validateSyntheticSpec(spec);
  const diagnostics = diagnoseSyntheticGraph(snapshot, spec.planningEnvelope);
  const payload = {
    schemaVersion: REPORT_SCHEMA_VERSION,
    fixtureKey: spec.fixtureKey,
    boundStudyKey: contract.boundStudyKey,
    boundStudyInstancePayloadHash: contract.boundStudyInstancePayloadHash,
    boundPrecisionReportPayloadHash: contract.boundPrecisionReportPayloadHash,
    contractPayloadHash: contract.contractPayloadHash,
    specPayloadHash: spec.specPayloadHash,
    snapshotSchemaHash,
    diagnosticCodeHash,
    runnerCodeHash,
    snapshotPayloadHash: sha256(snapshot),
    subjectMode: spec.subjectMode,
    instrumentationEnvironment: spec.instrumentationEnvironment,
    eligibilityFrozen: spec.eligibilityFrozen,
    containsRealUserData: spec.containsRealUserData,
    graphSummary: diagnostics.graphSummary,
    privacyChecks: diagnostics.privacyChecks,
    designSupportChecks: diagnostics.designSupportChecks,
    structuralDetermination: diagnostics.structuralDetermination,
    realGraphDiagnosticsStatus: "required_not_completed",
    assignmentGenerated: false,
    assignmentSeedGenerated: false,
    executionAuthorized: false,
    realUserAssignmentAllowed: false,
    executionDecision: {
      determination: "no_launch",
      blockers: [
        "only a deterministic synthetic graph fixture has been analyzed",
        "no privacy-reviewed real eligible-population snapshot exists",
        "real graph partition and exposure-probability diagnostics remain incomplete",
        "independent ethics determination and consent or waiver decision remain incomplete",
        "no assignment entropy, assignment manifest, or real-user execution authorization exists",
      ],
    },
  };
  return { ...payload, reportPayloadHash: sha256(payload) };
}

export {
  ALLOWED_OPPORTUNITY_TYPES,
  ALLOWED_RISK_BANDS,
  FORBIDDEN_IDENTIFIER_FIELDS,
  REPORT_SCHEMA_VERSION,
  SNAPSHOT_SCHEMA_VERSION,
};
