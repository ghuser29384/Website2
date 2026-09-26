import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  ANALYSIS_PLAN_SCHEMA_VERSION,
  EXPORT_SCHEMA_VERSION,
  buildCalibrationAnalysisReport,
  buildTemporalSplit,
  computeBinaryMetrics,
  computeConfusionMatrix,
  computeFractionalMetrics,
  deriveMaterialUpheld,
  isPrimaryProbabilityAudit,
  parseCalibrationExport,
  runCalibrationAnalysis,
  sha256Hex,
  validateAnalysisPlan,
  type AnalysisPlan,
  type CalibrationObservation,
  type WeightedBinaryPoint,
} from "./evidence-credibility-calibration-analysis";

const CANDIDATES = [
  "unweighted_global",
  "role_dimension_smoothed",
  "confidence_direct",
  "confidence_isotonic",
  "provenance_smoothed",
  "current_heuristic_isotonic",
  "confidence_provenance_interaction_ridge",
];

function token(value: string) {
  return sha256Hex(value);
}

function testPlan(overrides: Partial<AnalysisPlan> = {}): AnalysisPlan {
  const plan: AnalysisPlan = {
    schemaVersion: ANALYSIS_PLAN_SCHEMA_VERSION,
    analysisPlanVersion: "evidence-credibility-calibration-analysis-test-v1",
    analysisPlanSha256: token("synthetic plan document"),
    exportSchemaVersion: EXPORT_SCHEMA_VERSION,
    primaryMaterialTolerance: 0.05,
    sensitivityMaterialTolerances: [0.025, 0.1],
    logLossClip: 0.01,
    calibrationBins: [0, 0.2, 0.4, 0.6, 0.8, 1],
    primaryCohort: {
      selectedReasons: [
        "random_selected",
        "mandatory_zero_confidence_or_review_required",
      ],
      requireCompleteBlinding: true,
      requireOriginalEligibleForModelComparison: true,
    },
    weighting: {
      method: "hajek_inverse_probability",
      maxInverseProbabilityWeight: null,
    },
    split: {
      targetHoldoutFraction: 0.25,
      minimumHoldoutRows: 6,
      maximumHoldoutFraction: 0.4,
      minimumFitRows: 12,
      primaryGrouping: "agreement_pair_reviewer",
      sensitivityGroupings: [
        "agreement",
        "agreement_pair",
        "agreement_reviewer",
      ],
    },
    uncertainty: {
      method: "agreement_cluster_percentile_bootstrap",
      repetitions: 100,
      confidenceLevel: 0.95,
      seed: "synthetic-bootstrap-seed",
    },
    candidateModels: CANDIDATES,
    candidateSelection: {
      method: "deterministic_grouped_cross_validation",
      folds: 4,
      brierTieTolerance: 0.002,
      seed: "synthetic-candidate-selection-seed",
    },
    roleDimensionPriorEffectiveN: 20,
    provenancePriorEffectiveN: 20,
    subgroupMinimumRawN: 4,
    activationGates: {
      minimumResolvedOverall: 24,
      minimumDistinctParameterLabels: 2,
      maximumOverallCalibrationError: 0.1,
      maximumSubgroupCalibrationError: 0.15,
      maximumBrierWorsening: 0.01,
      maximumSubgroupBrierWorsening: 0.05,
    },
  };
  return { ...plan, ...overrides };
}

function dateFor(index: number) {
  const date = new Date(Date.UTC(2026, 0, 1 + index));
  return date.toISOString().slice(0, 10);
}

function makeObservation(
  index: number,
  options: Partial<CalibrationObservation> = {},
): CalibrationObservation {
  const band = ([0, 25, 50, 75, 100] as const)[index % 5];
  const probability = band / 100;
  const upheld = (index * 37) % 100 < probability * 100;
  const originalOutcome = 0.5 + ((index % 3) - 1) * 0.1;
  const finalOutcome = upheld ? originalOutcome + (index % 2 ? 0.01 : 0) : originalOutcome + 0.2;
  const finalStatus = "eligible";
  const observation: CalibrationObservation = {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    observationToken: token(`observation-${index}`),
    agreementGroupToken: token(`agreement-${Math.floor(index / 2)}`),
    decisionChainGroupToken: token(`chain-${Math.floor(index / 2)}-${index}`),
    subjectGroupToken: token(`subject-${index % 11}`),
    counterpartyGroupToken: token(`counterparty-${index % 13}`),
    participantPairGroupToken: token(`pair-${Math.floor(index / 4)}`),
    originalReviewerGroupToken: token(`reviewer-${Math.floor(index / 6)}`),
    auditReviewerGroupToken: token(`audit-reviewer-${index % 7}`),
    samplingRunGroupToken: token("sampling-run"),
    targetType: index % 4 === 0 ? "settlement_decision" : "evidence_decision",
    dimension: index % 4 === 0 ? "settlement" : "fulfilment",
    category: index % 3 === 0 ? "donation" : "service",
    role: index % 2 === 0 ? "committer" : "counterparty",
    modelVersion: "v2-evidence-decision-shadow",
    samplingPolicyVersion: "blind-audit-v1",
    samplingSeedCommitment: token("sampling-seed"),
    samplingStratum: `stratum-${band}`,
    samplingKind: "random",
    inclusionProbability: index % 3 === 0 ? 0.2 : 0.1,
    samplingRandomUnit:
      (((index * 7919) % 10000) / 10000) *
      (index % 3 === 0 ? 0.2 : 0.1),
    selectedReason: "random_selected",
    sourcePathway: "terminal_review",
    originalStatus: "eligible",
    originalOutcome,
    originalConfidenceBand: band,
    originalProvenanceClass: (
      [
        "platform_observed",
        "authenticated_provider",
        "independent_third_party",
        "bilateral_confirmation",
        "self_report",
      ] as const
    )[index % 5],
    originalAdjudicationClass: "neutral_review_final",
    originalFinalityReason: "review_final",
    originalIntegrityFinding: "not_assessed",
    originalResponsivenessFinding: "on_time",
    originalDisputeConductFinding: "not_assessed",
    additionalityStatus: "not_evaluated",
    provenanceWeight: [1, 1, 1, 0.6, 0.2][index % 5],
    decisionConfidenceWeight: probability,
    contextSimilarity: 1,
    stakeWeight: index % 6 === 0 ? 1.4 : 1,
    counterpartySequenceAtDecision: 1 + (index % 5),
    recencyHalfLifeDays: 365,
    eventAgeDaysAtDecision: 0,
    recencyWeightAtDecision: 1,
    provisionalEventWeightAtDecision:
      probability * [1, 1, 1, 0.6, 0.2][index % 5] * (1 / Math.sqrt(1 + (index % 5))) * (index % 6 === 0 ? 1.4 : 1),
    decisionDateUtc: dateFor(index),
    auditCompletedDateUtc: dateFor(index + 3),
    predictionSnapshotHash: token(`snapshot-${index}`),
    labelTier: "blinded_random_rereview",
    blindingMode: "technical_complete",
    blindingComplete: true,
    finalStatus,
    finalOutcome,
    finalFinalityReason: "review_final",
    finalIntegrityFinding: "not_assessed",
    finalResponsivenessFinding: "on_time",
    finalDisputeConductFinding: "not_assessed",
    materiallyUpheld: upheld,
    absoluteError: Math.abs(originalOutcome - finalOutcome),
    labelHash: token(`label-${index}`),
  };
  const merged = { ...observation, ...options };
  merged.materiallyUpheld = deriveMaterialUpheld(merged, 0.05);
  merged.absoluteError =
    merged.originalOutcome === null || merged.finalOutcome === null
      ? null
      : Math.abs(merged.originalOutcome - merged.finalOutcome);
  return merged;
}

function buildExport(rows: CalibrationObservation[], plan: AnalysisPlan) {
  const observationLines = rows.map((observation, index) => {
    const observationCanonical = JSON.stringify(observation);
    return {
      recordType: "observation" as const,
      rowNumber: index + 1,
      rowHash: sha256Hex(observationCanonical),
      observation,
      observationCanonical,
    };
  });
  const rowsDigest = sha256Hex(observationLines.map((row) => row.rowHash).join("|"));
  const canonicalManifest = {
    exportSchemaVersion: EXPORT_SCHEMA_VERSION,
    analysisPlanVersion: plan.analysisPlanVersion,
    analysisPlanHash: plan.analysisPlanSha256,
    sourceCutoffAt: "2026-06-01T00:00:00+00:00",
    pseudonymizationKeyCommitment: token("pseudonymization-key"),
    rowCount: rows.length,
    rowsDigest,
    rawEvidenceIncluded: false,
    rawIdentityIncluded: false,
    exactPaymentDataIncluded: false,
    shadowOnly: true,
  };
  const manifestCanonical = JSON.stringify(canonicalManifest);
  const manifest = {
    recordType: "manifest" as const,
    exportId: "00000000-0000-4000-8000-000000000001",
    ...canonicalManifest,
    manifestHash: sha256Hex(manifestCanonical),
    manifestCanonical,
    createdAt: "2026-06-01T00:00:01+00:00",
  };
  return [manifest, ...observationLines].map((line) => JSON.stringify(line)).join("\n");
}

test("the machine-readable plan matches the exact frozen protocol document", async () => {
  const [planText, documentText] = await Promise.all([
    readFile(
      join(
        process.cwd(),
        "analysis/evidence-credibility-calibration-v1/plan.json",
      ),
      "utf8",
    ),
    readFile(
      join(
        process.cwd(),
        "docs/moral-trade/evidence-credibility-calibration-analysis-plan-v1.md",
      ),
      "utf8",
    ),
  ]);
  const plan = JSON.parse(planText) as AnalysisPlan;
  validateAnalysisPlan(plan);
  assert.equal(plan.analysisPlanSha256, sha256Hex(documentText));
  assert.equal(plan.analysisPlanVersion, "evidence-credibility-calibration-analysis-v1.0.0");
  assert.equal(plan.split.primaryGrouping, "agreement_pair_reviewer");
  assert.equal(
    plan.candidateSelection.method,
    "deterministic_grouped_cross_validation",
  );
});

test("canonical export integrity is verified before records are accepted", () => {
  const plan = testPlan();
  const text = buildExport(Array.from({ length: 24 }, (_, index) => makeObservation(index)), plan);
  const parsed = parseCalibrationExport(text, plan);
  assert.equal(parsed.rows.length, 24);
  assert.equal(parsed.manifest.analysisPlanHash, plan.analysisPlanSha256);

  const lines = text.split("\n");
  const tampered = JSON.parse(lines[4]) as Record<string, unknown>;
  tampered.observationCanonical = `${String(tampered.observationCanonical)} `;
  lines[4] = JSON.stringify(tampered);
  assert.throws(
    () => parseCalibrationExport(lines.join("\n"), plan),
    /canonical SHA-256 check/,
  );
});

test("selected-draw semantics and bounded frozen factors fail closed", () => {
  const plan = testPlan();
  const invalidMandatory = makeObservation(7, {
    samplingKind: "mandatory",
    inclusionProbability: 0.5,
    samplingRandomUnit: 0.1,
    selectedReason: "mandatory_administrative_correction",
    sourcePathway: "administrative_correction",
  });
  assert.throws(
    () => parseCalibrationExport(buildExport([invalidMandatory], plan), plan),
    /Mandatory audit observations must have inclusion probability 1/,
  );

  const invalidWeight = makeObservation(8, { recencyWeightAtDecision: 1.01 });
  assert.throws(
    () => parseCalibrationExport(buildExport([invalidWeight], plan), plan),
    /recencyWeightAtDecision must be in \[0, 1\]/,
  );
});

test("stored material-uphold and absolute-error labels must match frozen derivation", () => {
  const plan = testPlan();
  const text = buildExport([makeObservation(1)], plan);
  const lines = text.split("\n");
  const line = JSON.parse(lines[1]) as {
    observation: CalibrationObservation;
    observationCanonical: string;
    rowHash: string;
  };
  line.observation.materiallyUpheld = !line.observation.materiallyUpheld;
  line.observationCanonical = JSON.stringify(line.observation);
  line.rowHash = sha256Hex(line.observationCanonical);
  lines[1] = JSON.stringify(line);
  const manifest = JSON.parse(lines[0]) as Record<string, unknown>;
  const rowsDigest = sha256Hex(line.rowHash);
  const canonical = JSON.parse(String(manifest.manifestCanonical)) as Record<string, unknown>;
  canonical.rowsDigest = rowsDigest;
  manifest.rowsDigest = rowsDigest;
  manifest.manifestCanonical = JSON.stringify(canonical);
  manifest.manifestHash = sha256Hex(String(manifest.manifestCanonical));
  lines[0] = JSON.stringify(manifest);
  assert.throws(
    () => parseCalibrationExport(lines.join("\n"), plan),
    /material-uphold label inconsistent/,
  );
});

test("the primary probability audit includes the census zero-confidence stratum but excludes dispute-selected supplements", () => {
  const plan = testPlan();
  const zeroConfidence = makeObservation(50, {
    originalConfidenceBand: 0,
    decisionConfidenceWeight: 0,
    samplingKind: "mandatory",
    inclusionProbability: 1,
    selectedReason: "mandatory_zero_confidence_or_review_required",
  });
  const administrativeCorrection = makeObservation(51, {
    samplingKind: "mandatory",
    inclusionProbability: 1,
    selectedReason: "mandatory_administrative_correction",
    sourcePathway: "administrative_correction",
  });
  const fabrication = makeObservation(52, {
    samplingKind: "mandatory",
    inclusionProbability: 1,
    selectedReason: "mandatory_deliberate_fabrication",
    originalIntegrityFinding: "deliberate_fabrication",
  });
  assert.equal(isPrimaryProbabilityAudit(zeroConfidence, plan), true);
  assert.equal(isPrimaryProbabilityAudit(administrativeCorrection, plan), false);
  assert.equal(isPrimaryProbabilityAudit(fabrication, plan), false);
});

test("deterministic temporal splits prevent agreement, pair, and reviewer leakage", () => {
  const plan = testPlan();
  const rows = Array.from({ length: 32 }, (_, index) => makeObservation(index));
  const primary = buildTemporalSplit(rows, plan, "agreement");
  assert.equal(primary.eligible, true);
  assert.ok(primary.fit.length >= plan.split.minimumFitRows);
  assert.ok(primary.holdout.length >= plan.split.minimumHoldoutRows);
  const fitAgreements = new Set(primary.fit.map((row) => row.agreementGroupToken));
  assert.equal(primary.holdout.some((row) => fitAgreements.has(row.agreementGroupToken)), false);
  assert.deepEqual(
    buildTemporalSplit(rows, plan, "agreement").holdoutRowTokens,
    primary.holdoutRowTokens,
  );

  const strict = buildTemporalSplit(
    rows,
    plan,
    "agreement_pair_reviewer",
  );
  assert.equal(strict.eligible, true);
  const strictPairs = new Set(
    strict.fit.map((row) => row.participantPairGroupToken),
  );
  const strictReviewers = new Set(
    strict.fit.map((row) => row.originalReviewerGroupToken),
  );
  assert.equal(
    strict.holdout.some((row) =>
      strictPairs.has(row.participantPairGroupToken),
    ),
    false,
  );
  assert.equal(
    strict.holdout.some((row) =>
      strictReviewers.has(row.originalReviewerGroupToken),
    ),
    false,
  );

  const pair = buildTemporalSplit(rows, plan, "agreement_pair");
  assert.equal(pair.eligible, true);
  const fitPairs = new Set(pair.fit.map((row) => row.participantPairGroupToken));
  assert.equal(pair.holdout.some((row) => fitPairs.has(row.participantPairGroupToken)), false);

  const reviewer = buildTemporalSplit(rows, plan, "agreement_reviewer");
  assert.equal(reviewer.eligible, true);
  const fitReviewers = new Set(reviewer.fit.map((row) => row.originalReviewerGroupToken));
  assert.equal(
    reviewer.holdout.some((row) => fitReviewers.has(row.originalReviewerGroupToken)),
    false,
  );
});

test("weighted binary calibration metrics match hand calculations", () => {
  const plan = testPlan();
  const row = makeObservation(0);
  const points: WeightedBinaryPoint[] = [
    { prediction: 0.8, outcome: 1, weight: 1, cluster: "a", row },
    { prediction: 0.2, outcome: 0, weight: 1, cluster: "b", row },
  ];
  const metrics = computeBinaryMetrics(points, plan);
  assert.ok(metrics.brier !== null);
  assert.ok(metrics.logLoss !== null);
  assert.ok(metrics.expectedCalibrationError !== null);
  assert.ok(Math.abs(metrics.brier - 0.04) < 1e-12);
  assert.ok(Math.abs(metrics.logLoss + Math.log(0.8)) < 1e-12);
  assert.ok(Math.abs(metrics.observedRate! - 0.5) < 1e-12);
  assert.ok(Math.abs(metrics.meanPrediction! - 0.5) < 1e-12);
  assert.ok(Math.abs(metrics.expectedCalibrationError - 0.2) < 1e-12);
});

test("fractional and categorical metrics preserve direction and disagreement", () => {
  const plan = testPlan();
  const rows = [
    makeObservation(0, { originalOutcome: 0.5, finalOutcome: 0.5 }),
    makeObservation(1, { originalOutcome: 0.8, finalOutcome: 0.6 }),
    makeObservation(2, { originalOutcome: 0.2, finalOutcome: 0.3 }),
  ];
  for (const row of rows) {
    row.materiallyUpheld = deriveMaterialUpheld(row, plan.primaryMaterialTolerance);
    row.absoluteError = Math.abs(row.originalOutcome! - row.finalOutcome!);
  }
  const fractional = computeFractionalMetrics(rows, plan);
  assert.equal(fractional.rawN, 3);
  assert.ok(fractional.meanAbsoluteError !== null && fractional.meanAbsoluteError > 0);
  assert.ok(fractional.overEstimationRate !== null && fractional.overEstimationRate > 0);
  assert.ok(fractional.underEstimationRate !== null && fractional.underEstimationRate > 0);

  const categoricalRows = [
    makeObservation(3, { originalStatus: "eligible", finalStatus: "eligible" }),
    makeObservation(4, { originalStatus: "eligible", finalStatus: "review_required" }),
    makeObservation(5, { originalStatus: "review_required", finalStatus: "review_required" }),
  ];
  const matrix = computeConfusionMatrix(
    categoricalRows,
    (row) => row.originalStatus,
    (row) => row.finalStatus,
    plan,
  );
  assert.equal(matrix.rawN, 3);
  assert.equal(matrix.counts.eligible.eligible, 1);
  assert.equal(matrix.counts.eligible.review_required, 1);
  assert.ok(matrix.cohensKappa !== null);
});

test("full synthetic analysis is deterministic and never authorizes activation", () => {
  const plan = testPlan();
  const text = buildExport(Array.from({ length: 40 }, (_, index) => makeObservation(index)), plan);
  const parsed = parseCalibrationExport(text, plan);
  const first = buildCalibrationAnalysisReport(
    parsed,
    plan,
    "a".repeat(40),
    "2026-08-12T00:00:00.000Z",
  );
  const second = buildCalibrationAnalysisReport(
    parsed,
    plan,
    "a".repeat(40),
    "2026-08-12T00:00:00.000Z",
  );
  assert.equal(first.activationAuthorized, false);
  assert.equal(first.candidates.length, CANDIDATES.length);
  assert.equal(first.candidateSelection.candidates.length, CANDIDATES.length);
  assert.equal(
    first.selectedCandidateId,
    first.candidateSelection.selectedCandidateId,
  );
  const serialized = JSON.stringify(first);
  assert.doesNotMatch(serialized, /"observationToken"/);
  assert.doesNotMatch(serialized, /"predictions"/);
  assert.doesNotMatch(serialized, /"fit":\[/);
  assert.doesNotMatch(serialized, /"holdout":\[/);
  assert.equal(first.selectedCandidateId, second.selectedCandidateId);
  assert.deepEqual(
    first.candidateBrierDifferencesVsBaseline,
    second.candidateBrierDifferencesVsBaseline,
  );
  assert.equal(
    first.activationGates.find((gate) => gate.id === "activation_boundary")?.status,
    "human_review_required",
  );
});

test("end-to-end runner requires explicit held-out acknowledgement and writes hashed outputs", async () => {
  const directory = await mkdtemp(join(tmpdir(), "moral-trade-calibration-"));
  try {
    const planDocument = join(directory, "plan.md");
    const planJson = join(directory, "plan.json");
    const input = join(directory, "export.jsonl");
    const output = join(directory, "report");
    const documentText = "synthetic plan document";
    const plan = testPlan({ analysisPlanSha256: sha256Hex(documentText) });
    await Promise.all([
      writeFile(planDocument, documentText, "utf8"),
      writeFile(planJson, `${JSON.stringify(plan, null, 2)}\n`, "utf8"),
      writeFile(
        input,
        buildExport(
          Array.from({ length: 40 }, (_, index) => makeObservation(index)),
          plan,
        ),
        "utf8",
      ),
    ]);

    await assert.rejects(
      () =>
        runCalibrationAnalysis({
          inputPath: input,
          outputDirectory: output,
          planJsonPath: planJson,
          planDocumentPath: planDocument,
          codeCommit: "b".repeat(40),
          acknowledgeHeldoutOpen: false,
        }),
      /explicit --acknowledge-heldout-open/,
    );

    const report = await runCalibrationAnalysis({
      inputPath: input,
      outputDirectory: output,
      planJsonPath: planJson,
      planDocumentPath: planDocument,
      codeCommit: "b".repeat(40),
      acknowledgeHeldoutOpen: true,
      generatedAtUtc: "2026-08-12T00:00:00.000Z",
    });
    assert.equal(report.activationAuthorized, false);
    const manifest = JSON.parse(
      await readFile(join(output, "analysis-manifest.json"), "utf8"),
    ) as Record<string, unknown>;
    assert.equal(manifest.activationAuthorized, false);
    assert.match(String(manifest.reportJsonSha256), /^[0-9a-f]{64}$/);
    assert.match(String(manifest.reportMarkdownSha256), /^[0-9a-f]{64}$/);
    assert.match(String(manifest.reliabilitySvgSha256), /^[0-9a-f]{64}$/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
