import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export const ANALYSIS_PLAN_SCHEMA_VERSION =
  "evidence-credibility-calibration-analysis-plan-v1" as const;
export const EXPORT_SCHEMA_VERSION = "v1-blind-audit-jsonl" as const;

const HEX_64 = /^[0-9a-f]{64}$/;
const HEX_40 = /^[0-9a-f]{40}$/;
const UUID_PATTERN =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i;
const UUID_EXACT_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const URL_PATTERN = /https?:\/\//i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const CONFIDENCE_BANDS = [0, 25, 50, 75, 100] as const;
export type ConfidenceBand = (typeof CONFIDENCE_BANDS)[number];

export const PROVENANCE_CLASSES = [
  "platform_observed",
  "authenticated_provider",
  "independent_third_party",
  "bilateral_confirmation",
  "self_report",
] as const;
export type ProvenanceClass = (typeof PROVENANCE_CLASSES)[number];

export type SamplingKind = "random" | "mandatory";
export const SELECTED_REASONS = [
  "mandatory_deliberate_fabrication",
  "mandatory_administrative_correction",
  "mandatory_zero_confidence_or_review_required",
  "random_selected",
] as const;
export type SelectedReason = (typeof SELECTED_REASONS)[number];

export const SOURCE_PATHWAYS = [
  "administrative_correction",
  "appeal",
  "provider_reconciliation",
  "terminal_review",
] as const;
export type SourcePathway = (typeof SOURCE_PATHWAYS)[number];

export const TARGET_TYPES = ["evidence_decision", "settlement_decision"] as const;
export type TargetType = (typeof TARGET_TYPES)[number];

export const DECISION_STATUSES = [
  "eligible",
  "excluded",
  "review_required",
] as const;
export type DecisionStatus = (typeof DECISION_STATUSES)[number];
export type SplitName = "fit" | "holdout";
export type GroupingMode =
  | "agreement"
  | "agreement_pair"
  | "agreement_reviewer"
  | "agreement_pair_reviewer";

export interface AnalysisPlan {
  schemaVersion: typeof ANALYSIS_PLAN_SCHEMA_VERSION;
  analysisPlanVersion: string;
  analysisPlanSha256: string;
  exportSchemaVersion: typeof EXPORT_SCHEMA_VERSION;
  primaryMaterialTolerance: number;
  sensitivityMaterialTolerances: number[];
  logLossClip: number;
  calibrationBins: number[];
  primaryCohort: {
    selectedReasons: Array<
      "random_selected" | "mandatory_zero_confidence_or_review_required"
    >;
    requireCompleteBlinding: true;
    requireOriginalEligibleForModelComparison: true;
  };
  weighting: {
    method: "hajek_inverse_probability";
    maxInverseProbabilityWeight: number | null;
  };
  split: {
    targetHoldoutFraction: number;
    minimumHoldoutRows: number;
    maximumHoldoutFraction: number;
    minimumFitRows: number;
    primaryGrouping: "agreement_pair_reviewer";
    sensitivityGroupings: Array<
      "agreement" | "agreement_pair" | "agreement_reviewer"
    >;
  };
  uncertainty: {
    method: "agreement_cluster_percentile_bootstrap";
    repetitions: number;
    confidenceLevel: number;
    seed: string;
  };
  candidateModels: string[];
  candidateSelection: {
    method: "deterministic_grouped_cross_validation";
    folds: number;
    brierTieTolerance: number;
    seed: string;
  };
  roleDimensionPriorEffectiveN: number;
  provenancePriorEffectiveN: number;
  subgroupMinimumRawN: number;
  activationGates: {
    minimumResolvedOverall: number;
    minimumDistinctParameterLabels: number;
    maximumOverallCalibrationError: number;
    maximumSubgroupCalibrationError: number;
    maximumBrierWorsening: number;
    maximumSubgroupBrierWorsening: number;
  };
}

export interface ExportManifestLine {
  recordType: "manifest";
  exportId: string;
  exportSchemaVersion: string;
  analysisPlanVersion: string;
  analysisPlanHash: string;
  sourceCutoffAt: string;
  pseudonymizationKeyCommitment: string;
  rowCount: number;
  rowsDigest: string;
  manifestHash: string;
  manifestCanonical: string;
  createdAt: string;
  rawEvidenceIncluded: false;
  rawIdentityIncluded: false;
  exactPaymentDataIncluded: false;
  shadowOnly: true;
}

export interface CalibrationObservation {
  schemaVersion: string;
  observationToken: string;
  agreementGroupToken: string;
  decisionChainGroupToken: string;
  subjectGroupToken: string;
  counterpartyGroupToken: string | null;
  participantPairGroupToken: string;
  originalReviewerGroupToken: string | null;
  auditReviewerGroupToken: string;
  samplingRunGroupToken: string;
  targetType: TargetType;
  dimension: "fulfilment" | "settlement";
  category: string;
  role: string;
  modelVersion: string;
  samplingPolicyVersion: string;
  samplingSeedCommitment: string;
  samplingStratum: string;
  samplingKind: SamplingKind;
  inclusionProbability: number;
  samplingRandomUnit: number;
  selectedReason: SelectedReason;
  sourcePathway: SourcePathway;
  originalStatus: DecisionStatus;
  originalOutcome: number | null;
  originalConfidenceBand: ConfidenceBand;
  originalProvenanceClass: ProvenanceClass;
  originalAdjudicationClass: string;
  originalFinalityReason: string;
  originalIntegrityFinding: string;
  originalResponsivenessFinding: string;
  originalDisputeConductFinding: string;
  additionalityStatus: "not_evaluated";
  provenanceWeight: number;
  decisionConfidenceWeight: number;
  contextSimilarity: number;
  stakeWeight: number;
  counterpartySequenceAtDecision: number;
  recencyHalfLifeDays: number;
  eventAgeDaysAtDecision: number;
  recencyWeightAtDecision: number;
  provisionalEventWeightAtDecision: number | null;
  decisionDateUtc: string;
  auditCompletedDateUtc: string;
  predictionSnapshotHash: string;
  labelTier: string;
  blindingMode: string;
  blindingComplete: boolean;
  finalStatus: DecisionStatus;
  finalOutcome: number | null;
  finalFinalityReason: string;
  finalIntegrityFinding: string;
  finalResponsivenessFinding: string;
  finalDisputeConductFinding: string;
  materiallyUpheld: boolean;
  absoluteError: number | null;
  labelHash: string;
}

export interface ExportObservationLine {
  recordType: "observation";
  rowNumber: number;
  rowHash: string;
  observation: CalibrationObservation;
  observationCanonical: string;
}

export interface ParsedCalibrationExport {
  manifest: ExportManifestLine;
  rows: ExportObservationLine[];
  exportFileSha256: string;
}

export interface TemporalSplit {
  cutoffDateUtc: string | null;
  targetHoldoutFraction: number;
  actualHoldoutFraction: number;
  fit: CalibrationObservation[];
  holdout: CalibrationObservation[];
  fitRowTokens: string[];
  holdoutRowTokens: string[];
  groupingMode: GroupingMode;
  eligible: boolean;
  reason: string | null;
}

export interface TemporalSplitSummary {
  cutoffDateUtc: string | null;
  targetHoldoutFraction: number;
  actualHoldoutFraction: number;
  fitRows: number;
  holdoutRows: number;
  fitObservationSetDigest: string;
  holdoutObservationSetDigest: string;
  groupingMode: GroupingMode;
  eligible: boolean;
  reason: string | null;
}

export interface WeightedBinaryPoint {
  prediction: number;
  outcome: 0 | 1;
  weight: number;
  cluster: string;
  row: CalibrationObservation;
}

export interface WeightedMetricSummary {
  rawN: number;
  effectiveN: number;
  weightSum: number;
  value: number | null;
}

export interface CalibrationBin {
  lower: number;
  upper: number;
  rawN: number;
  effectiveN: number;
  meanPrediction: number;
  observedRate: number;
  absoluteGap: number;
}

export interface BinaryMetrics {
  rawN: number;
  effectiveN: number;
  weightSum: number;
  brier: number | null;
  logLoss: number | null;
  observedRate: number | null;
  meanPrediction: number | null;
  absoluteCalibrationError: number | null;
  calibrationIntercept: number | null;
  calibrationSlope: number | null;
  expectedCalibrationError: number | null;
  maximumCalibrationError: number | null;
  bins: CalibrationBin[];
}

export interface FractionalMetrics {
  rawN: number;
  effectiveN: number;
  meanAbsoluteError: number | null;
  rootMeanSquaredError: number | null;
  signedError: number | null;
  overEstimationRate: number | null;
  underEstimationRate: number | null;
  exactAgreementRate: number | null;
  toleranceAgreementRates: Record<string, number | null>;
}

export interface ConfusionMatrix {
  labels: string[];
  counts: Record<string, Record<string, number>>;
  weightedCounts: Record<string, Record<string, number>>;
  rawN: number;
  effectiveN: number;
  observedAgreement: number | null;
  expectedAgreement: number | null;
  cohensKappa: number | null;
  classConditionalErrorRates: Record<string, number | null>;
}

export interface CandidateReport {
  id: string;
  description: string;
  complexityRank: number;
  nativeCoverage: number;
  metrics: BinaryMetrics;
  fitDetails: Record<string, unknown>;
}

interface CandidateEvaluation extends CandidateReport {
  predictions: Array<{
    observationToken: string;
    prediction: number;
    outcome: 0 | 1;
    weight: number;
    cluster: string;
  }>;
}

export interface BootstrapInterval {
  estimate: number | null;
  lower: number | null;
  upper: number | null;
  repetitions: number;
  confidenceLevel: number;
}

export interface ReadinessAssessment {
  stage: 0 | 1 | 2 | 3;
  resolvedOverall: number;
  primaryProbabilityAuditCompleteBlinding: number;
  fitRows: number;
  holdoutRows: number;
  reasons: string[];
}

export interface ActivationGateResult {
  id: string;
  status: "pass" | "fail" | "not_assessable" | "human_review_required";
  detail: string;
}

export interface CalibrationAnalysisReport {
  reportSchemaVersion: "evidence-credibility-calibration-report-v1";
  generatedAtUtc: string;
  analysisPlanVersion: string;
  analysisPlanSha256: string;
  exportId: string;
  exportFileSha256: string;
  exportManifestHash: string;
  exportRowsDigest: string;
  sourceCutoffAt: string;
  codeCommit: string;
  activationAuthorized: false;
  integrity: {
    verified: true;
    rowCount: number;
    canonicalRowsVerified: number;
  };
  cohorts: {
    all: number;
    randomSelected: number;
    mandatorySelected: number;
    probabilityAuditCompleteBlinding: number;
    originalEligibleProbabilityAuditCompleteBlinding: number;
  };
  split: {
    primary: TemporalSplitSummary;
    agreementOnlySensitivity: TemporalSplitSummary;
    participantPairSensitivity: TemporalSplitSummary;
    reviewerSensitivity: TemporalSplitSummary;
  };
  readiness: ReadinessAssessment;
  parameterSupport: {
    confidenceBands: Record<string, { rawN: number; effectiveN: number }>;
    provenanceClasses: Record<string, { rawN: number; effectiveN: number }>;
  };
  confidenceCalibrationByBand: Record<string, BinaryMetrics>;
  confidenceCalibrationOverall: BinaryMetrics;
  holdoutConfidenceCalibrationByBand: Record<string, BinaryMetrics>;
  holdoutConfidenceCalibrationOverall: BinaryMetrics;
  holdoutConfidenceUpholdIntervals: Record<string, BootstrapInterval>;
  fractionalCompletion: FractionalMetrics;
  fractionalErrorSubgroups: Record<
    string,
    Record<string, FractionalMetrics>
  >;
  categorical: Record<string, ConfusionMatrix>;
  pathwayDiagnostics: {
    bySourcePathway: Record<
      string,
      {
        rawN: number;
        materialUpholdRate: number | null;
        materialOverturnRate: number | null;
        meanAbsoluteError: number | null;
      }
    >;
    appealOverturned: { rawN: number; rateWithinAppealPathway: number | null };
    administrativeCorrection: {
      rawN: number;
      rateAmongAllResolved: number | null;
    };
  };
  falsePositiveDeliberateFabrication: {
    originalPositiveN: number;
    falsePositiveN: number;
    rate: number | null;
  };
  candidateSelection: {
    method: "deterministic_grouped_cross_validation";
    requestedFolds: number;
    realizedFolds: number;
    seed: string;
    candidates: CandidateReport[];
    selectedCandidateId: string | null;
  };
  candidates: CandidateReport[];
  selectedCandidateId: string | null;
  candidateBrierDifferencesVsBaseline: Record<string, BootstrapInterval>;
  candidateLogLossDifferencesVsBaseline: Record<string, BootstrapInterval>;
  subgroupChecks: Record<string, Record<string, {
    rawN: number;
    effectiveN: number;
    baselineBrier: number | null;
    selectedBrier: number | null;
    selectedMinusBaselineBrier: number | null;
    selectedCalibrationError: number | null;
  }>>;
  activationGates: ActivationGateResult[];
  limitations: string[];
}

const OBSERVATION_KEYS = [
  "schemaVersion",
  "observationToken",
  "agreementGroupToken",
  "decisionChainGroupToken",
  "subjectGroupToken",
  "counterpartyGroupToken",
  "participantPairGroupToken",
  "originalReviewerGroupToken",
  "auditReviewerGroupToken",
  "samplingRunGroupToken",
  "targetType",
  "dimension",
  "category",
  "role",
  "modelVersion",
  "samplingPolicyVersion",
  "samplingSeedCommitment",
  "samplingStratum",
  "samplingKind",
  "inclusionProbability",
  "samplingRandomUnit",
  "selectedReason",
  "sourcePathway",
  "originalStatus",
  "originalOutcome",
  "originalConfidenceBand",
  "originalProvenanceClass",
  "originalAdjudicationClass",
  "originalFinalityReason",
  "originalIntegrityFinding",
  "originalResponsivenessFinding",
  "originalDisputeConductFinding",
  "additionalityStatus",
  "provenanceWeight",
  "decisionConfidenceWeight",
  "contextSimilarity",
  "stakeWeight",
  "counterpartySequenceAtDecision",
  "recencyHalfLifeDays",
  "eventAgeDaysAtDecision",
  "recencyWeightAtDecision",
  "provisionalEventWeightAtDecision",
  "decisionDateUtc",
  "auditCompletedDateUtc",
  "predictionSnapshotHash",
  "labelTier",
  "blindingMode",
  "blindingComplete",
  "finalStatus",
  "finalOutcome",
  "finalFinalityReason",
  "finalIntegrityFinding",
  "finalResponsivenessFinding",
  "finalDisputeConductFinding",
  "materiallyUpheld",
  "absoluteError",
  "labelHash",
] as const;

const MANIFEST_CANONICAL_KEYS = [
  "exportSchemaVersion",
  "analysisPlanVersion",
  "analysisPlanHash",
  "sourceCutoffAt",
  "pseudonymizationKeyCommitment",
  "rowCount",
  "rowsDigest",
  "rawEvidenceIncluded",
  "rawIdentityIncluded",
  "exactPaymentDataIncluded",
  "shadowOnly",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertCondition(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) throw new Error(message);
}

function assertExactKeys(
  record: Record<string, unknown>,
  expected: readonly string[],
  context: string,
) {
  const actual = Object.keys(record).sort();
  const wanted = [...expected].sort();
  assertCondition(
    actual.length === wanted.length &&
      actual.every((key, index) => key === wanted[index]),
    `${context} has an unexpected or missing field set.`,
  );
}

function assertString(value: unknown, name: string): asserts value is string {
  assertCondition(typeof value === "string" && value.length > 0, `${name} must be a non-empty string.`);
}

function assertFiniteNumber(
  value: unknown,
  name: string,
): asserts value is number {
  assertCondition(typeof value === "number" && Number.isFinite(value), `${name} must be a finite number.`);
}

function assertNullableFiniteNumber(
  value: unknown,
  name: string,
): asserts value is number | null {
  assertCondition(value === null || (typeof value === "number" && Number.isFinite(value)), `${name} must be null or a finite number.`);
}

function assertHex64(value: unknown, name: string): asserts value is string {
  assertCondition(typeof value === "string" && HEX_64.test(value), `${name} must be 64 lowercase hexadecimal characters.`);
}

function assertTokenOrNull(
  value: unknown,
  name: string,
): asserts value is string | null {
  assertCondition(value === null || (typeof value === "string" && HEX_64.test(value)), `${name} must be null or a 64-character token.`);
}

function assertDate(value: unknown, name: string): asserts value is string {
  assertCondition(typeof value === "string" && DATE_PATTERN.test(value), `${name} must be a UTC calendar date.`);
  const parsed = Date.parse(`${value}T00:00:00.000Z`);
  assertCondition(Number.isFinite(parsed), `${name} must be a valid UTC calendar date.`);
}

function assertNoDirectIdentifiers(value: unknown, path = "record") {
  if (typeof value === "string") {
    assertCondition(!UUID_PATTERN.test(value), `${path} contains a raw UUID.`);
    assertCondition(!EMAIL_PATTERN.test(value), `${path} contains an email address.`);
    assertCondition(!URL_PATTERN.test(value), `${path} contains a URL.`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoDirectIdentifiers(item, `${path}[${index}]`));
    return;
  }
  if (isRecord(value)) {
    for (const [key, nested] of Object.entries(value)) {
      assertNoDirectIdentifiers(nested, `${path}.${key}`);
    }
  }
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function parseJsonLine(line: string, lineNumber: number): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(line);
    assertCondition(isRecord(parsed), `JSONL line ${lineNumber} must contain an object.`);
    return parsed;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`JSONL line ${lineNumber} is invalid: ${detail}`);
  }
}

function parseManifest(
  value: Record<string, unknown>,
  plan: AnalysisPlan,
): ExportManifestLine {
  const expectedKeys = [
    "recordType",
    "exportId",
    "exportSchemaVersion",
    "analysisPlanVersion",
    "analysisPlanHash",
    "sourceCutoffAt",
    "pseudonymizationKeyCommitment",
    "rowCount",
    "rowsDigest",
    "manifestHash",
    "manifestCanonical",
    "createdAt",
    "rawEvidenceIncluded",
    "rawIdentityIncluded",
    "exactPaymentDataIncluded",
    "shadowOnly",
  ] as const;
  assertExactKeys(value, expectedKeys, "Export manifest line");
  assertCondition(value.recordType === "manifest", "The first JSONL line must be the manifest.");
  assertString(value.exportId, "manifest.exportId");
  assertCondition(
    UUID_EXACT_PATTERN.test(value.exportId),
    "manifest.exportId must be a UUID.",
  );
  assertString(value.exportSchemaVersion, "manifest.exportSchemaVersion");
  assertString(value.analysisPlanVersion, "manifest.analysisPlanVersion");
  assertHex64(value.analysisPlanHash, "manifest.analysisPlanHash");
  assertString(value.sourceCutoffAt, "manifest.sourceCutoffAt");
  assertCondition(
    Number.isFinite(Date.parse(value.sourceCutoffAt)),
    "manifest.sourceCutoffAt must be a valid timestamp.",
  );
  assertHex64(value.pseudonymizationKeyCommitment, "manifest.pseudonymizationKeyCommitment");
  assertCondition(Number.isInteger(value.rowCount) && Number(value.rowCount) >= 1, "manifest.rowCount must be a positive integer.");
  assertHex64(value.rowsDigest, "manifest.rowsDigest");
  assertHex64(value.manifestHash, "manifest.manifestHash");
  assertString(value.manifestCanonical, "manifest.manifestCanonical");
  assertString(value.createdAt, "manifest.createdAt");
  assertCondition(
    Number.isFinite(Date.parse(value.createdAt)),
    "manifest.createdAt must be a valid timestamp.",
  );
  assertCondition(value.rawEvidenceIncluded === false, "The export must exclude raw evidence.");
  assertCondition(value.rawIdentityIncluded === false, "The export must exclude raw identity.");
  assertCondition(value.exactPaymentDataIncluded === false, "The export must exclude exact payment data.");
  assertCondition(value.shadowOnly === true, "The export must be shadow-only.");
  assertCondition(value.exportSchemaVersion === plan.exportSchemaVersion, "The export schema does not match the frozen analysis plan.");
  assertCondition(value.analysisPlanVersion === plan.analysisPlanVersion, "The export analysis-plan version does not match the frozen plan.");
  assertCondition(value.analysisPlanHash === plan.analysisPlanSha256, "The export analysis-plan hash does not match the frozen plan.");
  assertCondition(sha256Hex(value.manifestCanonical) === value.manifestHash, "The canonical manifest payload does not match manifestHash.");

  const canonicalUnknown: unknown = JSON.parse(value.manifestCanonical);
  assertCondition(isRecord(canonicalUnknown), "manifestCanonical must decode to an object.");
  assertExactKeys(canonicalUnknown, MANIFEST_CANONICAL_KEYS, "Canonical manifest");
  assertCondition(canonicalUnknown.exportSchemaVersion === value.exportSchemaVersion, "Canonical manifest schema mismatch.");
  assertCondition(canonicalUnknown.analysisPlanVersion === value.analysisPlanVersion, "Canonical manifest plan-version mismatch.");
  assertCondition(canonicalUnknown.analysisPlanHash === value.analysisPlanHash, "Canonical manifest plan-hash mismatch.");
  assertCondition(canonicalUnknown.sourceCutoffAt === value.sourceCutoffAt, "Canonical manifest cutoff mismatch.");
  assertCondition(canonicalUnknown.pseudonymizationKeyCommitment === value.pseudonymizationKeyCommitment, "Canonical manifest pseudonymization commitment mismatch.");
  assertCondition(canonicalUnknown.rowCount === value.rowCount, "Canonical manifest row-count mismatch.");
  assertCondition(canonicalUnknown.rowsDigest === value.rowsDigest, "Canonical manifest rows-digest mismatch.");
  assertCondition(canonicalUnknown.rawEvidenceIncluded === false, "Canonical manifest raw-evidence flag mismatch.");
  assertCondition(canonicalUnknown.rawIdentityIncluded === false, "Canonical manifest raw-identity flag mismatch.");
  assertCondition(canonicalUnknown.exactPaymentDataIncluded === false, "Canonical manifest payment-data flag mismatch.");
  assertCondition(canonicalUnknown.shadowOnly === true, "Canonical manifest shadow-only flag mismatch.");
  assertNoDirectIdentifiers(canonicalUnknown, "manifestCanonical");

  return value as unknown as ExportManifestLine;
}

function parseObservation(value: Record<string, unknown>): CalibrationObservation {
  assertExactKeys(value, OBSERVATION_KEYS, "Calibration observation");
  assertCondition(value.schemaVersion === EXPORT_SCHEMA_VERSION, "Observation schema version mismatch.");
  for (const key of [
    "observationToken",
    "agreementGroupToken",
    "decisionChainGroupToken",
    "subjectGroupToken",
    "participantPairGroupToken",
    "auditReviewerGroupToken",
    "samplingRunGroupToken",
  ] as const) {
    assertHex64(value[key], `observation.${key}`);
  }
  assertTokenOrNull(value.counterpartyGroupToken, "observation.counterpartyGroupToken");
  assertTokenOrNull(value.originalReviewerGroupToken, "observation.originalReviewerGroupToken");
  for (const key of [
    "targetType",
    "dimension",
    "category",
    "role",
    "modelVersion",
    "samplingPolicyVersion",
    "samplingStratum",
    "selectedReason",
    "sourcePathway",
    "originalStatus",
    "originalAdjudicationClass",
    "originalFinalityReason",
    "originalIntegrityFinding",
    "originalResponsivenessFinding",
    "originalDisputeConductFinding",
    "labelTier",
    "blindingMode",
    "finalStatus",
    "finalFinalityReason",
    "finalIntegrityFinding",
    "finalResponsivenessFinding",
    "finalDisputeConductFinding",
  ] as const) {
    assertString(value[key], `observation.${key}`);
  }
  assertCondition(
    TARGET_TYPES.includes(value.targetType as TargetType),
    "observation.targetType is invalid.",
  );
  assertCondition(
    value.dimension === "fulfilment" || value.dimension === "settlement",
    "observation.dimension is invalid.",
  );
  assertCondition(
    (value.targetType === "evidence_decision" && value.dimension === "fulfilment") ||
      (value.targetType === "settlement_decision" && value.dimension === "settlement"),
    "observation.targetType and dimension are inconsistent.",
  );
  assertCondition(
    SELECTED_REASONS.includes(value.selectedReason as SelectedReason),
    "observation.selectedReason is invalid for an exported selected draw.",
  );
  assertCondition(
    SOURCE_PATHWAYS.includes(value.sourcePathway as SourcePathway),
    "observation.sourcePathway is invalid.",
  );
  assertCondition(
    DECISION_STATUSES.includes(value.originalStatus as DecisionStatus),
    "observation.originalStatus is invalid.",
  );
  assertCondition(
    DECISION_STATUSES.includes(value.finalStatus as DecisionStatus),
    "observation.finalStatus is invalid.",
  );
  assertCondition(
    value.labelTier === "blinded_random_rereview",
    "observation.labelTier is unsupported.",
  );
  assertCondition(
    value.blindingMode === "technical_complete" ||
      value.blindingMode === "procedural_partial",
    "observation.blindingMode is invalid.",
  );
  assertHex64(value.samplingSeedCommitment, "observation.samplingSeedCommitment");
  assertHex64(value.predictionSnapshotHash, "observation.predictionSnapshotHash");
  assertHex64(value.labelHash, "observation.labelHash");
  assertCondition(value.samplingKind === "random" || value.samplingKind === "mandatory", "observation.samplingKind is invalid.");
  assertFiniteNumber(value.inclusionProbability, "observation.inclusionProbability");
  assertCondition(value.inclusionProbability > 0 && value.inclusionProbability <= 1, "observation.inclusionProbability must be in (0, 1].");
  assertFiniteNumber(value.samplingRandomUnit, "observation.samplingRandomUnit");
  assertCondition(value.samplingRandomUnit >= 0 && value.samplingRandomUnit < 1, "observation.samplingRandomUnit must be in [0, 1)." );
  assertCondition(
    value.samplingRandomUnit < value.inclusionProbability,
    "Every exported observation must satisfy its immutable selection rule.",
  );
  const mandatorySelection = value.selectedReason !== "random_selected";
  assertCondition(
    (mandatorySelection && value.samplingKind === "mandatory") ||
      (!mandatorySelection && value.samplingKind === "random"),
    "observation.samplingKind and selectedReason are inconsistent.",
  );
  if (mandatorySelection) {
    assertCondition(
      value.inclusionProbability === 1,
      "Mandatory audit observations must have inclusion probability 1.",
    );
  }
  assertNullableFiniteNumber(value.originalOutcome, "observation.originalOutcome");
  if (value.originalOutcome !== null) {
    assertCondition(
      value.originalOutcome >= 0 && value.originalOutcome <= 1,
      "observation.originalOutcome must be in [0, 1].",
    );
  }
  assertCondition(CONFIDENCE_BANDS.includes(value.originalConfidenceBand as ConfidenceBand), "observation.originalConfidenceBand is invalid.");
  assertCondition(PROVENANCE_CLASSES.includes(value.originalProvenanceClass as ProvenanceClass), "observation.originalProvenanceClass is invalid.");
  assertCondition(value.additionalityStatus === "not_evaluated", "Causal additionality must remain not_evaluated.");
  for (const key of [
    "provenanceWeight",
    "decisionConfidenceWeight",
    "contextSimilarity",
    "recencyWeightAtDecision",
  ] as const) {
    assertFiniteNumber(value[key], `observation.${key}`);
    assertCondition(
      value[key] >= 0 && value[key] <= 1,
      `observation.${key} must be in [0, 1].`,
    );
  }
  assertFiniteNumber(value.stakeWeight, "observation.stakeWeight");
  assertCondition(
    value.stakeWeight >= 1 && value.stakeWeight <= 2,
    "observation.stakeWeight must remain inside the frozen bounded stake-weight range [1, 2].",
  );
  assertFiniteNumber(
    value.eventAgeDaysAtDecision,
    "observation.eventAgeDaysAtDecision",
  );
  assertCondition(
    value.eventAgeDaysAtDecision >= 0,
    "observation.eventAgeDaysAtDecision must be nonnegative.",
  );
  assertCondition(Number.isInteger(value.counterpartySequenceAtDecision) && Number(value.counterpartySequenceAtDecision) >= 1, "observation.counterpartySequenceAtDecision must be a positive integer.");
  assertCondition(Number.isInteger(value.recencyHalfLifeDays) && Number(value.recencyHalfLifeDays) >= 1, "observation.recencyHalfLifeDays must be a positive integer.");
  assertNullableFiniteNumber(value.provisionalEventWeightAtDecision, "observation.provisionalEventWeightAtDecision");
  assertDate(value.decisionDateUtc, "observation.decisionDateUtc");
  assertDate(value.auditCompletedDateUtc, "observation.auditCompletedDateUtc");
  assertCondition(typeof value.blindingComplete === "boolean", "observation.blindingComplete must be boolean.");
  assertNullableFiniteNumber(value.finalOutcome, "observation.finalOutcome");
  if (value.finalOutcome !== null) {
    assertCondition(
      value.finalOutcome >= 0 && value.finalOutcome <= 1,
      "observation.finalOutcome must be in [0, 1].",
    );
  }
  assertCondition(typeof value.materiallyUpheld === "boolean", "observation.materiallyUpheld must be boolean.");
  assertNullableFiniteNumber(value.absoluteError, "observation.absoluteError");
  if (value.absoluteError !== null) {
    assertCondition(
      value.absoluteError >= 0 && value.absoluteError <= 1,
      "observation.absoluteError must be in [0, 1].",
    );
  }
  assertNoDirectIdentifiers(value, "observation");
  return value as unknown as CalibrationObservation;
}

function parseObservationLine(
  value: Record<string, unknown>,
  expectedRowNumber: number,
): ExportObservationLine {
  assertExactKeys(
    value,
    ["recordType", "rowNumber", "rowHash", "observation", "observationCanonical"],
    `Observation line ${expectedRowNumber}`,
  );
  assertCondition(value.recordType === "observation", `JSONL line ${expectedRowNumber + 1} must be an observation.`);
  assertCondition(value.rowNumber === expectedRowNumber, `Observation row numbers must be contiguous; expected ${expectedRowNumber}.`);
  assertHex64(value.rowHash, `row ${expectedRowNumber}.rowHash`);
  assertString(value.observationCanonical, `row ${expectedRowNumber}.observationCanonical`);
  assertCondition(sha256Hex(value.observationCanonical) === value.rowHash, `Observation row ${expectedRowNumber} failed its canonical SHA-256 check.`);
  const canonicalUnknown: unknown = JSON.parse(value.observationCanonical);
  assertCondition(isRecord(canonicalUnknown), `Observation row ${expectedRowNumber} canonical payload must be an object.`);
  const canonical = parseObservation(canonicalUnknown);
  assertCondition(isRecord(value.observation), `Observation row ${expectedRowNumber} parsed payload must be an object.`);
  const parsed = parseObservation(value.observation);
  assertCondition(
    JSON.stringify(canonical) === JSON.stringify(parsed),
    `Observation row ${expectedRowNumber} parsed and canonical payloads differ.`,
  );
  return {
    recordType: "observation",
    rowNumber: expectedRowNumber,
    rowHash: value.rowHash,
    observation: canonical,
    observationCanonical: value.observationCanonical,
  };
}

export function validateAnalysisPlan(plan: AnalysisPlan) {
  assertCondition(plan.schemaVersion === ANALYSIS_PLAN_SCHEMA_VERSION, "Analysis-plan schema version is invalid.");
  assertString(plan.analysisPlanVersion, "analysisPlanVersion");
  assertHex64(plan.analysisPlanSha256, "analysisPlanSha256");
  assertCondition(plan.exportSchemaVersion === EXPORT_SCHEMA_VERSION, "Analysis plan expects an unsupported export schema.");
  const primaryReasons = new Set(plan.primaryCohort.selectedReasons);
  assertCondition(
    primaryReasons.size === 2 &&
      primaryReasons.has("random_selected") &&
      primaryReasons.has("mandatory_zero_confidence_or_review_required"),
    "The frozen probability-audit selection reasons are incomplete or duplicated.",
  );
  assertCondition(
    plan.primaryCohort.requireCompleteBlinding === true,
    "Primary calibration requires complete reviewer blinding.",
  );
  assertCondition(plan.primaryMaterialTolerance > 0 && plan.primaryMaterialTolerance < 1, "Primary material tolerance must be in (0, 1)." );
  assertCondition(plan.sensitivityMaterialTolerances.length >= 2, "At least two sensitivity tolerances are required.");
  assertCondition(plan.logLossClip > 0 && plan.logLossClip < 0.5, "Log-loss clip must be in (0, 0.5)." );
  assertCondition(plan.calibrationBins.length >= 2, "Calibration bins are required.");
  assertCondition(plan.calibrationBins[0] === 0 && plan.calibrationBins.at(-1) === 1, "Calibration bins must span [0, 1].");
  for (let index = 1; index < plan.calibrationBins.length; index += 1) {
    assertCondition(plan.calibrationBins[index] > plan.calibrationBins[index - 1], "Calibration bins must be strictly increasing.");
  }
  assertCondition(plan.weighting.method === "hajek_inverse_probability", "Unsupported weighting method.");
  if (plan.weighting.maxInverseProbabilityWeight !== null) {
    assertCondition(plan.weighting.maxInverseProbabilityWeight >= 1, "Inverse-probability cap must be at least 1.");
  }
  assertCondition(plan.split.targetHoldoutFraction > 0 && plan.split.targetHoldoutFraction < 1, "Holdout target must be in (0, 1)." );
  assertCondition(
    plan.split.primaryGrouping === "agreement_pair_reviewer",
    "The primary split must jointly group agreement, participant pair, and reviewer.",
  );
  const sensitivityGroupings = new Set(plan.split.sensitivityGroupings);
  assertCondition(
    sensitivityGroupings.size === 3 &&
      sensitivityGroupings.has("agreement") &&
      sensitivityGroupings.has("agreement_pair") &&
      sensitivityGroupings.has("agreement_reviewer"),
    "The frozen split sensitivities are incomplete or duplicated.",
  );
  assertCondition(plan.split.maximumHoldoutFraction >= plan.split.targetHoldoutFraction && plan.split.maximumHoldoutFraction < 1, "Maximum holdout fraction is invalid.");
  assertCondition(Number.isInteger(plan.split.minimumHoldoutRows) && plan.split.minimumHoldoutRows >= 1, "Minimum holdout rows must be positive.");
  assertCondition(Number.isInteger(plan.split.minimumFitRows) && plan.split.minimumFitRows >= 1, "Minimum fit rows must be positive.");
  assertCondition(Number.isInteger(plan.uncertainty.repetitions) && plan.uncertainty.repetitions >= 100, "Bootstrap repetitions must be at least 100.");
  assertCondition(plan.uncertainty.confidenceLevel > 0.5 && plan.uncertainty.confidenceLevel < 1, "Bootstrap confidence level is invalid.");
  assertString(plan.uncertainty.seed, "uncertainty.seed");
  assertCondition(plan.candidateModels.length >= 5, "At least five pre-registered candidate models are required.");
  assertCondition(
    new Set(plan.candidateModels).size === plan.candidateModels.length,
    "Candidate-model identifiers must be unique.",
  );
  assertCondition(
    plan.roleDimensionPriorEffectiveN > 0 &&
      Number.isFinite(plan.roleDimensionPriorEffectiveN),
    "Role-dimension prior effective sample size must be positive.",
  );
  assertCondition(
    plan.provenancePriorEffectiveN > 0 &&
      Number.isFinite(plan.provenancePriorEffectiveN),
    "Provenance prior effective sample size must be positive.",
  );
  assertCondition(
    plan.candidateSelection.method ===
      "deterministic_grouped_cross_validation",
    "Unsupported candidate-selection method.",
  );
  assertCondition(
    Number.isInteger(plan.candidateSelection.folds) &&
      plan.candidateSelection.folds >= 2 &&
      plan.candidateSelection.folds <= 10,
    "Candidate-selection folds must be an integer from 2 through 10.",
  );
  assertCondition(
    plan.candidateSelection.brierTieTolerance >= 0 &&
      plan.candidateSelection.brierTieTolerance <= 0.05,
    "Candidate-selection Brier tie tolerance is invalid.",
  );
  assertString(plan.candidateSelection.seed, "candidateSelection.seed");
}

export function parseCalibrationExport(
  text: string,
  plan: AnalysisPlan,
): ParsedCalibrationExport {
  validateAnalysisPlan(plan);
  const normalized = text.replace(/\r\n/g, "\n").trimEnd();
  const lines = normalized.split("\n");
  assertCondition(lines.length >= 2, "Calibration export must contain a manifest and at least one observation.");
  const manifest = parseManifest(parseJsonLine(lines[0], 1), plan);
  const rows = lines.slice(1).map((line, index) =>
    parseObservationLine(parseJsonLine(line, index + 2), index + 1),
  );
  const observationTokens = new Set<string>();
  for (const row of rows) {
    assertCondition(
      !observationTokens.has(row.observation.observationToken),
      `Duplicate observation token ${row.observation.observationToken}.`,
    );
    observationTokens.add(row.observation.observationToken);
  }
  for (const row of rows) {
    const observation = row.observation;
    const expectedMateriallyUpheld = deriveMaterialUpheld(
      observation,
      plan.primaryMaterialTolerance,
    );
    assertCondition(
      observation.materiallyUpheld === expectedMateriallyUpheld,
      `Observation ${observation.observationToken} has a material-uphold label inconsistent with the frozen tolerance.`,
    );
    const expectedAbsoluteError =
      observation.originalOutcome === null || observation.finalOutcome === null
        ? null
        : Math.abs(observation.originalOutcome - observation.finalOutcome);
    assertCondition(
      (expectedAbsoluteError === null && observation.absoluteError === null) ||
        (expectedAbsoluteError !== null &&
          observation.absoluteError !== null &&
          Math.abs(expectedAbsoluteError - observation.absoluteError) <= 1e-9),
      `Observation ${observation.observationToken} has an absolute-error label inconsistent with its frozen outcomes.`,
    );
    assertCondition(
      (observation.originalStatus === "eligible") ===
        (observation.originalOutcome !== null),
      `Observation ${observation.observationToken} has an original status/outcome mismatch.`,
    );
    assertCondition(
      (observation.finalStatus === "eligible") ===
        (observation.finalOutcome !== null),
      `Observation ${observation.observationToken} has a final status/outcome mismatch.`,
    );
    assertCondition(
      (observation.originalStatus === "eligible") ===
        (observation.provisionalEventWeightAtDecision !== null),
      `Observation ${observation.observationToken} has a provisional-weight/status mismatch.`,
    );
    if (observation.provisionalEventWeightAtDecision !== null) {
      const expectedProvisionalWeight =
        observation.recencyWeightAtDecision *
        observation.provenanceWeight *
        observation.decisionConfidenceWeight *
        (1 / Math.sqrt(observation.counterpartySequenceAtDecision)) *
        observation.contextSimilarity *
        observation.stakeWeight;
      assertCondition(
        Math.abs(
          expectedProvisionalWeight -
            observation.provisionalEventWeightAtDecision,
        ) <= 1e-6,
        `Observation ${observation.observationToken} has inconsistent provisional-weight components.`,
      );
    }
  }
  assertCondition(rows.length === manifest.rowCount, "Observation count does not match manifest.rowCount.");
  const computedRowsDigest = sha256Hex(rows.map((row) => row.rowHash).join("|"));
  assertCondition(computedRowsDigest === manifest.rowsDigest, "Ordered observation hashes do not match manifest.rowsDigest.");
  return {
    manifest,
    rows,
    exportFileSha256: sha256Hex(text),
  };
}

export async function loadAnalysisPlan(
  planJsonPath: string,
  planDocumentPath: string,
): Promise<AnalysisPlan> {
  const [jsonText, documentText] = await Promise.all([
    readFile(planJsonPath, "utf8"),
    readFile(planDocumentPath, "utf8"),
  ]);
  const unknown: unknown = JSON.parse(jsonText);
  assertCondition(isRecord(unknown), "Analysis plan JSON must contain an object.");
  const plan = unknown as unknown as AnalysisPlan;
  validateAnalysisPlan(plan);
  const actualHash = sha256Hex(documentText);
  assertCondition(actualHash === plan.analysisPlanSha256, "Frozen analysis-plan document hash does not match plan JSON.");
  return plan;
}

function inverseProbabilityWeight(
  observation: CalibrationObservation,
  plan: AnalysisPlan,
): number {
  const raw = 1 / observation.inclusionProbability;
  const cap = plan.weighting.maxInverseProbabilityWeight;
  return cap === null ? raw : Math.min(raw, cap);
}

export function isPrimaryProbabilityAudit(
  observation: CalibrationObservation,
  plan: AnalysisPlan,
): boolean {
  return (
    plan.primaryCohort.selectedReasons.includes(
      observation.selectedReason as
        | "random_selected"
        | "mandatory_zero_confidence_or_review_required",
    ) &&
    observation.blindingComplete === plan.primaryCohort.requireCompleteBlinding
  );
}

export function isPrimaryModelComparisonRow(
  observation: CalibrationObservation,
  plan: AnalysisPlan,
): boolean {
  return (
    isPrimaryProbabilityAudit(observation, plan) &&
    (!plan.primaryCohort.requireOriginalEligibleForModelComparison ||
      observation.originalStatus === "eligible")
  );
}

export function deriveMaterialUpheld(
  observation: CalibrationObservation,
  tolerance: number,
): boolean {
  const categoricalEqual =
    observation.originalStatus === observation.finalStatus &&
    observation.originalFinalityReason === observation.finalFinalityReason &&
    observation.originalIntegrityFinding === observation.finalIntegrityFinding &&
    observation.originalResponsivenessFinding === observation.finalResponsivenessFinding &&
    observation.originalDisputeConductFinding === observation.finalDisputeConductFinding;
  if (!categoricalEqual) return false;
  if (observation.originalOutcome === null || observation.finalOutcome === null) {
    return observation.originalOutcome === observation.finalOutcome;
  }
  return Math.abs(observation.originalOutcome - observation.finalOutcome) <= tolerance;
}

interface UnionFind {
  parent: number[];
  rank: number[];
}

function makeUnionFind(size: number): UnionFind {
  return {
    parent: Array.from({ length: size }, (_, index) => index),
    rank: Array.from({ length: size }, () => 0),
  };
}

function findRoot(uf: UnionFind, value: number): number {
  let current = value;
  while (uf.parent[current] !== current) {
    uf.parent[current] = uf.parent[uf.parent[current]];
    current = uf.parent[current];
  }
  return current;
}

function union(uf: UnionFind, left: number, right: number) {
  let rootLeft = findRoot(uf, left);
  let rootRight = findRoot(uf, right);
  if (rootLeft === rootRight) return;
  if (uf.rank[rootLeft] < uf.rank[rootRight]) {
    [rootLeft, rootRight] = [rootRight, rootLeft];
  }
  uf.parent[rootRight] = rootLeft;
  if (uf.rank[rootLeft] === uf.rank[rootRight]) uf.rank[rootLeft] += 1;
}

function groupingTokens(
  row: CalibrationObservation,
  mode: GroupingMode,
): string[] {
  const tokens = [`agreement:${row.agreementGroupToken}`];
  if (mode === "agreement_pair" || mode === "agreement_pair_reviewer") {
    tokens.push(`pair:${row.participantPairGroupToken}`);
  }
  if (
    mode === "agreement_reviewer" ||
    mode === "agreement_pair_reviewer"
  ) {
    tokens.push(`reviewer:${row.originalReviewerGroupToken ?? "missing"}`);
  }
  return tokens;
}

function componentAssignments(
  rows: CalibrationObservation[],
  mode: GroupingMode,
): Map<number, number[]> {
  const uf = makeUnionFind(rows.length);
  const seen = new Map<string, number>();
  rows.forEach((row, index) => {
    for (const token of groupingTokens(row, mode)) {
      const previous = seen.get(token);
      if (previous === undefined) seen.set(token, index);
      else union(uf, previous, index);
    }
  });
  const components = new Map<number, number[]>();
  rows.forEach((_row, index) => {
    const root = findRoot(uf, index);
    const members = components.get(root) ?? [];
    members.push(index);
    components.set(root, members);
  });
  return components;
}

function dateOrdinal(date: string): number {
  return Date.parse(`${date}T00:00:00.000Z`);
}

export function buildTemporalSplit(
  allRows: CalibrationObservation[],
  plan: AnalysisPlan,
  groupingMode: GroupingMode = "agreement_pair_reviewer",
): TemporalSplit {
  const rows = allRows.filter((row) => isPrimaryModelComparisonRow(row, plan));
  const empty: TemporalSplit = {
    cutoffDateUtc: null,
    targetHoldoutFraction: plan.split.targetHoldoutFraction,
    actualHoldoutFraction: 0,
    fit: [],
    holdout: [],
    fitRowTokens: [],
    holdoutRowTokens: [],
    groupingMode,
    eligible: false,
    reason: "No primary random-audit rows are available.",
  };
  if (!rows.length) return empty;

  const components = componentAssignments(rows, groupingMode);
  const componentList = [...components.values()].map((indices) => ({
    indices,
    maxDate: indices.reduce(
      (latest, index) =>
        dateOrdinal(rows[index].decisionDateUtc) > dateOrdinal(latest)
          ? rows[index].decisionDateUtc
          : latest,
      rows[indices[0]].decisionDateUtc,
    ),
  }));
  const candidateDates = [...new Set(componentList.map((component) => component.maxDate))].sort();
  let best:
    | {
        cutoff: string;
        fitIndices: number[];
        holdoutIndices: number[];
        fraction: number;
        score: number;
      }
    | undefined;

  for (const cutoff of candidateDates) {
    const fitIndices: number[] = [];
    const holdoutIndices: number[] = [];
    for (const component of componentList) {
      const target = component.maxDate >= cutoff ? holdoutIndices : fitIndices;
      target.push(...component.indices);
    }
    const fraction = holdoutIndices.length / rows.length;
    if (
      holdoutIndices.length < plan.split.minimumHoldoutRows ||
      fitIndices.length < plan.split.minimumFitRows ||
      fraction > plan.split.maximumHoldoutFraction
    ) {
      continue;
    }
    const score = Math.abs(fraction - plan.split.targetHoldoutFraction);
    if (
      !best ||
      score < best.score - 1e-12 ||
      (Math.abs(score - best.score) <= 1e-12 && cutoff > best.cutoff)
    ) {
      best = { cutoff, fitIndices, holdoutIndices, fraction, score };
    }
  }

  if (!best) {
    return {
      ...empty,
      reason: `No deterministic out-of-time cutoff satisfies at least ${plan.split.minimumFitRows} fit rows, ${plan.split.minimumHoldoutRows} holdout rows, and at most ${(plan.split.maximumHoldoutFraction * 100).toFixed(0)}% holdout.`,
    };
  }

  const fit = best.fitIndices.map((index) => rows[index]);
  const holdout = best.holdoutIndices.map((index) => rows[index]);
  const fitAgreements = new Set(fit.map((row) => row.agreementGroupToken));
  assertCondition(
    !holdout.some((row) => fitAgreements.has(row.agreementGroupToken)),
    "Agreement leakage exists across fit and holdout.",
  );
  if (
    groupingMode === "agreement_pair" ||
    groupingMode === "agreement_pair_reviewer"
  ) {
    const fitPairs = new Set(fit.map((row) => row.participantPairGroupToken));
    assertCondition(
      !holdout.some((row) => fitPairs.has(row.participantPairGroupToken)),
      "Participant-pair leakage exists across fit and holdout.",
    );
  }
  if (
    groupingMode === "agreement_reviewer" ||
    groupingMode === "agreement_pair_reviewer"
  ) {
    const fitReviewers = new Set(
      fit.map((row) => row.originalReviewerGroupToken ?? "missing"),
    );
    assertCondition(
      !holdout.some((row) =>
        fitReviewers.has(row.originalReviewerGroupToken ?? "missing"),
      ),
      "Reviewer leakage exists across fit and holdout.",
    );
  }

  return {
    cutoffDateUtc: best.cutoff,
    targetHoldoutFraction: plan.split.targetHoldoutFraction,
    actualHoldoutFraction: best.fraction,
    fit,
    holdout,
    fitRowTokens: fit.map((row) => row.observationToken).sort(),
    holdoutRowTokens: holdout.map((row) => row.observationToken).sort(),
    groupingMode,
    eligible: true,
    reason: null,
  };
}

function summarizeTemporalSplit(split: TemporalSplit): TemporalSplitSummary {
  return {
    cutoffDateUtc: split.cutoffDateUtc,
    targetHoldoutFraction: split.targetHoldoutFraction,
    actualHoldoutFraction: split.actualHoldoutFraction,
    fitRows: split.fit.length,
    holdoutRows: split.holdout.length,
    fitObservationSetDigest: sha256Hex(split.fitRowTokens.join("|")),
    holdoutObservationSetDigest: sha256Hex(split.holdoutRowTokens.join("|")),
    groupingMode: split.groupingMode,
    eligible: split.eligible,
    reason: split.reason,
  };
}

export function effectiveSampleSize(weights: number[]): number {
  if (!weights.length) return 0;
  const sum = weights.reduce((total, weight) => total + weight, 0);
  const sumSquares = weights.reduce((total, weight) => total + weight * weight, 0);
  return sumSquares > 0 ? (sum * sum) / sumSquares : 0;
}

function weightedMean(values: number[], weights: number[]): number | null {
  assertCondition(values.length === weights.length, "Weighted mean arrays must have equal length.");
  if (!values.length) return null;
  const weightSum = weights.reduce((total, weight) => total + weight, 0);
  if (!(weightSum > 0)) return null;
  return values.reduce((total, value, index) => total + value * weights[index], 0) / weightSum;
}

function binaryPoints(
  rows: CalibrationObservation[],
  predictions: Map<string, number>,
  plan: AnalysisPlan,
): WeightedBinaryPoint[] {
  return rows.flatMap((row) => {
    const prediction = predictions.get(row.observationToken);
    if (prediction === undefined || !Number.isFinite(prediction)) return [];
    return [
      {
        prediction: Math.min(1, Math.max(0, prediction)),
        outcome: row.materiallyUpheld ? 1 : 0,
        weight: inverseProbabilityWeight(row, plan),
        cluster: row.agreementGroupToken,
        row,
      } satisfies WeightedBinaryPoint,
    ];
  });
}

function solveLinearSystem(matrix: number[][], vector: number[]): number[] | null {
  const size = vector.length;
  const augmented = matrix.map((row, index) => [...row, vector[index]]);
  for (let column = 0; column < size; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < size; row += 1) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row;
    }
    if (Math.abs(augmented[pivot][column]) < 1e-12) return null;
    [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];
    const scale = augmented[column][column];
    for (let index = column; index <= size; index += 1) augmented[column][index] /= scale;
    for (let row = 0; row < size; row += 1) {
      if (row === column) continue;
      const factor = augmented[row][column];
      for (let index = column; index <= size; index += 1) {
        augmented[row][index] -= factor * augmented[column][index];
      }
    }
  }
  return augmented.map((row) => row[size]);
}

function sigmoid(value: number): number {
  if (value >= 0) {
    const exp = Math.exp(-value);
    return 1 / (1 + exp);
  }
  const exp = Math.exp(value);
  return exp / (1 + exp);
}

function logit(value: number): number {
  return Math.log(value / (1 - value));
}

function fitCalibrationLine(points: WeightedBinaryPoint[]): {
  intercept: number | null;
  slope: number | null;
} {
  if (points.length < 3) return { intercept: null, slope: null };
  let beta = [0, 1];
  for (let iteration = 0; iteration < 80; iteration += 1) {
    const gradient = [0, 0];
    const hessian = [
      [1e-8, 0],
      [0, 1e-8],
    ];
    for (const point of points) {
      const clipped = Math.min(1 - 1e-6, Math.max(1e-6, point.prediction));
      const x = [1, logit(clipped)];
      const probability = sigmoid(beta[0] + beta[1] * x[1]);
      const variance = point.weight * probability * (1 - probability);
      const residual = point.weight * (point.outcome - probability);
      for (let left = 0; left < 2; left += 1) {
        gradient[left] += x[left] * residual;
        for (let right = 0; right < 2; right += 1) {
          hessian[left][right] += x[left] * x[right] * variance;
        }
      }
    }
    const step = solveLinearSystem(hessian, gradient);
    if (!step || step.some((value) => !Number.isFinite(value))) return { intercept: null, slope: null };
    beta = beta.map((value, index) => value + step[index]);
    if (Math.max(...step.map(Math.abs)) < 1e-8) break;
  }
  return { intercept: beta[0], slope: beta[1] };
}

export function computeBinaryMetrics(
  points: WeightedBinaryPoint[],
  plan: AnalysisPlan,
): BinaryMetrics {
  const weights = points.map((point) => point.weight);
  const weightSum = weights.reduce((total, weight) => total + weight, 0);
  const effectiveN = effectiveSampleSize(weights);
  if (!points.length || !(weightSum > 0)) {
    return {
      rawN: 0,
      effectiveN: 0,
      weightSum: 0,
      brier: null,
      logLoss: null,
      observedRate: null,
      meanPrediction: null,
      absoluteCalibrationError: null,
      calibrationIntercept: null,
      calibrationSlope: null,
      expectedCalibrationError: null,
      maximumCalibrationError: null,
      bins: [],
    };
  }
  const brier = weightedMean(
    points.map((point) => (point.prediction - point.outcome) ** 2),
    weights,
  );
  const logLoss = weightedMean(
    points.map((point) => {
      const clipped = Math.min(1 - plan.logLossClip, Math.max(plan.logLossClip, point.prediction));
      return -(
        point.outcome * Math.log(clipped) +
        (1 - point.outcome) * Math.log(1 - clipped)
      );
    }),
    weights,
  );
  const observedRate = weightedMean(points.map((point) => point.outcome), weights);
  const meanPrediction = weightedMean(points.map((point) => point.prediction), weights);
  const bins: CalibrationBin[] = [];
  for (let index = 0; index < plan.calibrationBins.length - 1; index += 1) {
    const lower = plan.calibrationBins[index];
    const upper = plan.calibrationBins[index + 1];
    const inBin = points.filter((point) =>
      index === plan.calibrationBins.length - 2
        ? point.prediction >= lower && point.prediction <= upper
        : point.prediction >= lower && point.prediction < upper,
    );
    if (!inBin.length) continue;
    const binWeights = inBin.map((point) => point.weight);
    const binMean = weightedMean(inBin.map((point) => point.prediction), binWeights) ?? 0;
    const binRate = weightedMean(inBin.map((point) => point.outcome), binWeights) ?? 0;
    bins.push({
      lower,
      upper,
      rawN: inBin.length,
      effectiveN: effectiveSampleSize(binWeights),
      meanPrediction: binMean,
      observedRate: binRate,
      absoluteGap: Math.abs(binMean - binRate),
    });
  }
  const ece = bins.reduce((total, bin) => {
    const binWeight = points
      .filter((point) =>
        bin.upper === 1
          ? point.prediction >= bin.lower && point.prediction <= bin.upper
          : point.prediction >= bin.lower && point.prediction < bin.upper,
      )
      .reduce((sum, point) => sum + point.weight, 0);
    return total + (binWeight / weightSum) * bin.absoluteGap;
  }, 0);
  const calibration = fitCalibrationLine(points);
  return {
    rawN: points.length,
    effectiveN,
    weightSum,
    brier,
    logLoss,
    observedRate,
    meanPrediction,
    absoluteCalibrationError:
      observedRate === null || meanPrediction === null
        ? null
        : Math.abs(observedRate - meanPrediction),
    calibrationIntercept: calibration.intercept,
    calibrationSlope: calibration.slope,
    expectedCalibrationError: ece,
    maximumCalibrationError: bins.length
      ? Math.max(...bins.map((bin) => bin.absoluteGap))
      : null,
    bins,
  };
}

export function computeFractionalMetrics(
  rows: CalibrationObservation[],
  plan: AnalysisPlan,
): FractionalMetrics {
  const eligible = rows.filter(
    (row) =>
      row.originalOutcome !== null &&
      row.finalOutcome !== null &&
      isPrimaryProbabilityAudit(row, plan),
  );
  const weights = eligible.map((row) => inverseProbabilityWeight(row, plan));
  const errors = eligible.map((row) => (row.originalOutcome as number) - (row.finalOutcome as number));
  const absolute = errors.map(Math.abs);
  const tolerances = [
    plan.primaryMaterialTolerance,
    ...plan.sensitivityMaterialTolerances,
  ];
  const toleranceAgreementRates: Record<string, number | null> = {};
  for (const tolerance of tolerances) {
    toleranceAgreementRates[tolerance.toFixed(3)] = weightedMean(
      absolute.map((error) => (error <= tolerance ? 1 : 0)),
      weights,
    );
  }
  return {
    rawN: eligible.length,
    effectiveN: effectiveSampleSize(weights),
    meanAbsoluteError: weightedMean(absolute, weights),
    rootMeanSquaredError: (() => {
      const value = weightedMean(errors.map((error) => error * error), weights);
      return value === null ? null : Math.sqrt(value);
    })(),
    signedError: weightedMean(errors, weights),
    overEstimationRate: weightedMean(errors.map((error) => (error > 0 ? 1 : 0)), weights),
    underEstimationRate: weightedMean(errors.map((error) => (error < 0 ? 1 : 0)), weights),
    exactAgreementRate: weightedMean(errors.map((error) => (Math.abs(error) < 1e-12 ? 1 : 0)), weights),
    toleranceAgreementRates,
  };
}

export function computeConfusionMatrix(
  rows: CalibrationObservation[],
  original: (row: CalibrationObservation) => string,
  final: (row: CalibrationObservation) => string,
  plan: AnalysisPlan,
): ConfusionMatrix {
  const eligible = rows.filter((row) => isPrimaryProbabilityAudit(row, plan));
  const labels = [...new Set(eligible.flatMap((row) => [original(row), final(row)]))].sort();
  const counts: Record<string, Record<string, number>> = {};
  const weightedCounts: Record<string, Record<string, number>> = {};
  for (const source of labels) {
    counts[source] = {};
    weightedCounts[source] = {};
    for (const destination of labels) {
      counts[source][destination] = 0;
      weightedCounts[source][destination] = 0;
    }
  }
  const weights: number[] = [];
  for (const row of eligible) {
    const source = original(row);
    const destination = final(row);
    const weight = inverseProbabilityWeight(row, plan);
    counts[source][destination] += 1;
    weightedCounts[source][destination] += weight;
    weights.push(weight);
  }
  const totalWeight = weights.reduce((total, weight) => total + weight, 0);
  if (!(totalWeight > 0)) {
    return {
      labels,
      counts,
      weightedCounts,
      rawN: 0,
      effectiveN: 0,
      observedAgreement: null,
      expectedAgreement: null,
      cohensKappa: null,
      classConditionalErrorRates: Object.fromEntries(
        labels.map((label) => [label, null]),
      ),
    };
  }
  const observedAgreement =
    labels.reduce((total, label) => total + weightedCounts[label][label], 0) /
    totalWeight;
  const expectedAgreement = labels.reduce((total, label) => {
    const rowMarginal = labels.reduce(
      (sum, destination) => sum + weightedCounts[label][destination],
      0,
    );
    const columnMarginal = labels.reduce(
      (sum, source) => sum + weightedCounts[source][label],
      0,
    );
    return total + (rowMarginal / totalWeight) * (columnMarginal / totalWeight);
  }, 0);
  const denominator = 1 - expectedAgreement;
  return {
    labels,
    counts,
    weightedCounts,
    rawN: eligible.length,
    effectiveN: effectiveSampleSize(weights),
    observedAgreement,
    expectedAgreement,
    cohensKappa: Math.abs(denominator) < 1e-12
      ? null
      : (observedAgreement - expectedAgreement) / denominator,
    classConditionalErrorRates: Object.fromEntries(
      labels.map((label) => {
        const rowTotal = labels.reduce(
          (sum, destination) => sum + weightedCounts[label][destination],
          0,
        );
        return [
          label,
          rowTotal > 0 ? 1 - weightedCounts[label][label] / rowTotal : null,
        ];
      }),
    ),
  };
}

interface FittedCandidate {
  id: string;
  description: string;
  complexityRank: number;
  predict(row: CalibrationObservation): number | null;
  details: Record<string, unknown>;
}

function weightedRateForRows(
  rows: CalibrationObservation[],
  plan: AnalysisPlan,
): { rate: number; effectiveN: number; rawN: number } {
  const weights = rows.map((row) => inverseProbabilityWeight(row, plan));
  const rate = weightedMean(rows.map((row) => (row.materiallyUpheld ? 1 : 0)), weights);
  return {
    rate: rate ?? 0.5,
    effectiveN: effectiveSampleSize(weights),
    rawN: rows.length,
  };
}

function fitPava(
  pairs: Array<{ score: number; outcome: number; weight: number }>,
): Array<{ lower: number; upper: number; value: number }> {
  const grouped = new Map<number, { weight: number; weightedOutcome: number }>();
  for (const pair of pairs) {
    const existing = grouped.get(pair.score) ?? { weight: 0, weightedOutcome: 0 };
    existing.weight += pair.weight;
    existing.weightedOutcome += pair.weight * pair.outcome;
    grouped.set(pair.score, existing);
  }
  const blocks = [...grouped.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([score, summary]) => ({
      lower: score,
      upper: score,
      weight: summary.weight,
      weightedOutcome: summary.weightedOutcome,
      value: summary.weightedOutcome / summary.weight,
    }));
  let index = 0;
  while (index < blocks.length - 1) {
    if (blocks[index].value <= blocks[index + 1].value + 1e-15) {
      index += 1;
      continue;
    }
    const merged = {
      lower: blocks[index].lower,
      upper: blocks[index + 1].upper,
      weight: blocks[index].weight + blocks[index + 1].weight,
      weightedOutcome:
        blocks[index].weightedOutcome + blocks[index + 1].weightedOutcome,
      value: 0,
    };
    merged.value = merged.weightedOutcome / merged.weight;
    blocks.splice(index, 2, merged);
    if (index > 0) index -= 1;
  }
  return blocks.map(({ lower, upper, value }) => ({ lower, upper, value }));
}

function pavaPredict(
  blocks: Array<{ lower: number; upper: number; value: number }>,
  score: number,
): number {
  if (!blocks.length) return 0.5;
  for (const block of blocks) {
    if (score <= block.upper) return block.value;
  }
  return blocks[blocks.length - 1].value;
}

function fitGlobalCandidate(
  fitRows: CalibrationObservation[],
  plan: AnalysisPlan,
): FittedCandidate {
  const summary = weightedRateForRows(fitRows, plan);
  return {
    id: "unweighted_global",
    description: "Hájek-weighted empirical material-uphold rate in the fit set.",
    complexityRank: 0,
    predict: () => summary.rate,
    details: summary,
  };
}

function fitRoleDimensionCandidate(
  fitRows: CalibrationObservation[],
  plan: AnalysisPlan,
): FittedCandidate {
  const global = weightedRateForRows(fitRows, plan);
  const groups = new Map<string, CalibrationObservation[]>();
  for (const row of fitRows) {
    const key = `${row.dimension}\u001f${row.role}`;
    const items = groups.get(key) ?? [];
    items.push(row);
    groups.set(key, items);
  }
  const estimates = new Map<string, number>();
  const detail: Record<string, unknown> = {};
  for (const [key, rows] of groups) {
    const summary = weightedRateForRows(rows, plan);
    const value =
      (summary.rate * summary.effectiveN +
        global.rate * plan.roleDimensionPriorEffectiveN) /
      (summary.effectiveN + plan.roleDimensionPriorEffectiveN);
    estimates.set(key, value);
    detail[key] = { ...summary, prediction: value };
  }
  return {
    id: "role_dimension_smoothed",
    description: "Role-by-dimension empirical rate shrunk toward the global fit rate.",
    complexityRank: 1,
    predict: (row) => estimates.get(`${row.dimension}\u001f${row.role}`) ?? global.rate,
    details: { global, groups: detail },
  };
}

function fitConfidenceDirectCandidate(): FittedCandidate {
  return {
    id: "confidence_direct",
    description: "Direct confidence-band mapping 0/25/50/75/100 to 0/.25/.5/.75/1.",
    complexityRank: 1,
    predict: (row) => row.originalConfidenceBand / 100,
    details: {},
  };
}

function fitConfidenceIsotonicCandidate(
  fitRows: CalibrationObservation[],
  plan: AnalysisPlan,
): FittedCandidate {
  const blocks = fitPava(
    fitRows.map((row) => ({
      score: row.originalConfidenceBand,
      outcome: row.materiallyUpheld ? 1 : 0,
      weight: inverseProbabilityWeight(row, plan),
    })),
  );
  return {
    id: "confidence_isotonic",
    description: "Monotone weighted isotonic calibration of the five confidence bands.",
    complexityRank: 2,
    predict: (row) => pavaPredict(blocks, row.originalConfidenceBand),
    details: { blocks },
  };
}

function fitProvenanceCandidate(
  fitRows: CalibrationObservation[],
  plan: AnalysisPlan,
): FittedCandidate {
  const global = weightedRateForRows(fitRows, plan);
  const estimates = new Map<ProvenanceClass, number>();
  const details: Record<string, unknown> = {};
  for (const provenance of PROVENANCE_CLASSES) {
    const rows = fitRows.filter((row) => row.originalProvenanceClass === provenance);
    const summary = weightedRateForRows(rows, plan);
    const prediction = rows.length
      ? (summary.rate * summary.effectiveN +
          global.rate * plan.provenancePriorEffectiveN) /
        (summary.effectiveN + plan.provenancePriorEffectiveN)
      : global.rate;
    estimates.set(provenance, prediction);
    details[provenance] = { ...summary, prediction };
  }
  return {
    id: "provenance_smoothed",
    description: `Provenance-specific weighted rates with ${plan.provenancePriorEffectiveN} effective prior observations centered on the global rate.`,
    complexityRank: 2,
    predict: (row) => estimates.get(row.originalProvenanceClass) ?? global.rate,
    details: { global, classes: details },
  };
}

function fitHeuristicIsotonicCandidate(
  fitRows: CalibrationObservation[],
  plan: AnalysisPlan,
  fallback: number,
): FittedCandidate {
  const nativeRows = fitRows.filter(
    (row) => row.provisionalEventWeightAtDecision !== null,
  );
  const blocks = fitPava(
    nativeRows.map((row) => ({
      score: row.provisionalEventWeightAtDecision as number,
      outcome: row.materiallyUpheld ? 1 : 0,
      weight: inverseProbabilityWeight(row, plan),
    })),
  );
  return {
    id: "current_heuristic_isotonic",
    description: "Monotone calibration layer over the frozen current multiplicative event-weight score.",
    complexityRank: 3,
    predict: (row) =>
      row.provisionalEventWeightAtDecision === null
        ? fallback
        : pavaPredict(blocks, row.provisionalEventWeightAtDecision),
    details: {
      blocks,
      nativeFitRows: nativeRows.length,
      fallback,
    },
  };
}

function ridgeLogLikelihood(
  beta: number[],
  examples: Array<{ x: number[]; y: number; weight: number }>,
  lambda: number,
): number {
  let value = 0;
  for (const example of examples) {
    const linear = example.x.reduce((sum, item, index) => sum + item * beta[index], 0);
    const probability = Math.min(1 - 1e-12, Math.max(1e-12, sigmoid(linear)));
    value +=
      example.weight *
      (example.y * Math.log(probability) +
        (1 - example.y) * Math.log(1 - probability));
  }
  for (let index = 1; index < beta.length; index += 1) {
    value -= 0.5 * lambda * beta[index] * beta[index];
  }
  return value;
}

function fitRidgeLogistic(
  examples: Array<{ x: number[]; y: number; weight: number }>,
  lambda: number,
): number[] {
  const dimensions = examples[0]?.x.length ?? 0;
  if (!dimensions) return [];
  let beta = Array.from({ length: dimensions }, () => 0);
  for (let iteration = 0; iteration < 100; iteration += 1) {
    const gradient = Array.from({ length: dimensions }, () => 0);
    const hessian = Array.from({ length: dimensions }, () =>
      Array.from({ length: dimensions }, () => 0),
    );
    for (const example of examples) {
      const linear = example.x.reduce((sum, item, index) => sum + item * beta[index], 0);
      const probability = sigmoid(linear);
      const residual = example.weight * (example.y - probability);
      const variance = example.weight * probability * (1 - probability);
      for (let left = 0; left < dimensions; left += 1) {
        gradient[left] += example.x[left] * residual;
        for (let right = 0; right < dimensions; right += 1) {
          hessian[left][right] += example.x[left] * example.x[right] * variance;
        }
      }
    }
    for (let index = 1; index < dimensions; index += 1) {
      gradient[index] -= lambda * beta[index];
      hessian[index][index] += lambda;
    }
    hessian[0][0] += 1e-8;
    const step = solveLinearSystem(hessian, gradient);
    if (!step) break;
    const oldLikelihood = ridgeLogLikelihood(beta, examples, lambda);
    let scale = 1;
    let candidate = beta.map((value, index) => value + step[index]);
    while (
      scale > 1 / 1024 &&
      ridgeLogLikelihood(candidate, examples, lambda) < oldLikelihood
    ) {
      scale /= 2;
      candidate = beta.map((value, index) => value + scale * step[index]);
    }
    beta = candidate;
    if (Math.max(...step.map((value) => Math.abs(scale * value))) < 1e-8) break;
  }
  return beta;
}

function interactionFeatures(row: CalibrationObservation): number[] {
  const confidence = (row.originalConfidenceBand - 50) / 50;
  const nonReference = PROVENANCE_CLASSES.slice(1);
  const dummies = nonReference.map((provenance) =>
    row.originalProvenanceClass === provenance ? 1 : 0,
  );
  return [1, confidence, ...dummies, ...dummies.map((dummy) => dummy * confidence)];
}

function fitInteractionCandidate(
  fitRows: CalibrationObservation[],
  plan: AnalysisPlan,
): FittedCandidate {
  const weights = fitRows.map((row) => inverseProbabilityWeight(row, plan));
  const meanWeight = weights.reduce((sum, weight) => sum + weight, 0) / Math.max(1, weights.length);
  const examples = fitRows.map((row, index) => ({
    x: interactionFeatures(row),
    y: row.materiallyUpheld ? 1 : 0,
    weight: weights[index] / meanWeight,
  }));
  const lambda = 1;
  const beta = fitRidgeLogistic(examples, lambda);
  return {
    id: "confidence_provenance_interaction_ridge",
    description: "Fixed-L2 logistic interaction model over confidence and provenance, providing partial pooling for sparse cells.",
    complexityRank: 4,
    predict: (row) => {
      const x = interactionFeatures(row);
      return sigmoid(x.reduce((sum, value, index) => sum + value * (beta[index] ?? 0), 0));
    },
    details: {
      lambda,
      beta,
      referenceProvenance: PROVENANCE_CLASSES[0],
      featureOrder: [
        "intercept",
        "confidence_centered",
        ...PROVENANCE_CLASSES.slice(1).map((value) => `provenance:${value}`),
        ...PROVENANCE_CLASSES.slice(1).map((value) => `confidence_x:${value}`),
      ],
    },
  };
}

function fitCandidates(
  fitRows: CalibrationObservation[],
  plan: AnalysisPlan,
): FittedCandidate[] {
  const global = fitGlobalCandidate(fitRows, plan);
  const fallback = Number(global.details.rate ?? 0.5);
  const candidates = [
    global,
    fitRoleDimensionCandidate(fitRows, plan),
    fitConfidenceDirectCandidate(),
    fitConfidenceIsotonicCandidate(fitRows, plan),
    fitProvenanceCandidate(fitRows, plan),
    fitHeuristicIsotonicCandidate(fitRows, plan, fallback),
    fitInteractionCandidate(fitRows, plan),
  ];
  const expected = new Set(plan.candidateModels);
  assertCondition(
    candidates.length === expected.size &&
      candidates.every((candidate) => expected.has(candidate.id)),
    "Implemented candidate set does not match the frozen analysis plan.",
  );
  return candidates;
}

function evaluateCandidate(
  candidate: FittedCandidate,
  rows: CalibrationObservation[],
  plan: AnalysisPlan,
): CandidateEvaluation {
  let nativeCount = 0;
  const predictions = new Map<string, number>();
  for (const row of rows) {
    const prediction = candidate.predict(row);
    if (prediction !== null && Number.isFinite(prediction)) {
      nativeCount += 1;
      predictions.set(row.observationToken, Math.min(1, Math.max(0, prediction)));
    }
  }
  const points = binaryPoints(rows, predictions, plan);
  return {
    id: candidate.id,
    description: candidate.description,
    complexityRank: candidate.complexityRank,
    nativeCoverage: rows.length ? nativeCount / rows.length : 0,
    metrics: computeBinaryMetrics(points, plan),
    predictions: points.map((point) => ({
      observationToken: point.row.observationToken,
      prediction: point.prediction,
      outcome: point.outcome,
      weight: point.weight,
      cluster: point.cluster,
    })),
    fitDetails: candidate.details,
  };
}

function summarizeCandidate(candidate: CandidateEvaluation): CandidateReport {
  return {
    id: candidate.id,
    description: candidate.description,
    complexityRank: candidate.complexityRank,
    nativeCoverage: candidate.nativeCoverage,
    metrics: candidate.metrics,
    fitDetails: candidate.fitDetails,
  };
}

interface CandidateSelectionResult {
  method: "deterministic_grouped_cross_validation";
  requestedFolds: number;
  realizedFolds: number;
  seed: string;
  candidates: CandidateReport[];
  selectedCandidateId: string | null;
}

function deterministicGroupedFolds(
  rows: CalibrationObservation[],
  plan: AnalysisPlan,
): number[][] {
  const components = [...
    componentAssignments(rows, plan.split.primaryGrouping).values()
  ].map((indices) => ({
    indices,
    key: sha256Hex(
      `${plan.candidateSelection.seed}:${indices
        .map((index) => rows[index].observationToken)
        .sort()
        .join("|")}`,
    ),
  }));
  const foldCount = Math.min(plan.candidateSelection.folds, components.length);
  if (foldCount < 2) return [];
  components.sort(
    (left, right) =>
      right.indices.length - left.indices.length || left.key.localeCompare(right.key),
  );
  const folds = Array.from({ length: foldCount }, () => [] as number[]);
  const sizes = Array.from({ length: foldCount }, () => 0);
  for (const component of components) {
    let target = 0;
    for (let index = 1; index < foldCount; index += 1) {
      if (sizes[index] < sizes[target]) target = index;
    }
    folds[target].push(...component.indices);
    sizes[target] += component.indices.length;
  }
  return folds.map((indices) => indices.sort((left, right) => left - right));
}

function crossValidateCandidates(
  fitRows: CalibrationObservation[],
  plan: AnalysisPlan,
): CandidateSelectionResult {
  const folds = deterministicGroupedFolds(fitRows, plan);
  if (folds.length < 2) {
    return {
      method: plan.candidateSelection.method,
      requestedFolds: plan.candidateSelection.folds,
      realizedFolds: folds.length,
      seed: plan.candidateSelection.seed,
      candidates: [],
      selectedCandidateId: null,
    };
  }
  const predictionMaps = new Map<string, Map<string, number>>();
  const complexity = new Map<string, { description: string; rank: number }>();
  for (const validationIndices of folds) {
    const validationSet = new Set(validationIndices);
    const trainingRows = fitRows.filter((_row, index) => !validationSet.has(index));
    const validationRows = validationIndices.map((index) => fitRows[index]);
    const fitted = fitCandidates(trainingRows, plan);
    for (const candidate of fitted) {
      const predictions = predictionMaps.get(candidate.id) ?? new Map<string, number>();
      for (const row of validationRows) {
        const prediction = candidate.predict(row);
        if (prediction !== null && Number.isFinite(prediction)) {
          predictions.set(
            row.observationToken,
            Math.min(1, Math.max(0, prediction)),
          );
        }
      }
      predictionMaps.set(candidate.id, predictions);
      complexity.set(candidate.id, {
        description: candidate.description,
        rank: candidate.complexityRank,
      });
    }
  }
  const candidates = plan.candidateModels.map((id) => {
    const predictions = predictionMaps.get(id) ?? new Map<string, number>();
    const points = binaryPoints(fitRows, predictions, plan);
    const metadata = complexity.get(id);
    assertCondition(metadata, `Cross-validation did not fit candidate ${id}.`);
    return {
      id,
      description: metadata.description,
      complexityRank: metadata.rank,
      nativeCoverage: fitRows.length ? predictions.size / fitRows.length : 0,
      metrics: computeBinaryMetrics(points, plan),
      fitDetails: {
        selectionMethod: plan.candidateSelection.method,
        requestedFolds: plan.candidateSelection.folds,
        realizedFolds: folds.length,
      },
    } satisfies CandidateReport;
  });
  return {
    method: plan.candidateSelection.method,
    requestedFolds: plan.candidateSelection.folds,
    realizedFolds: folds.length,
    seed: plan.candidateSelection.seed,
    candidates,
    selectedCandidateId: selectCandidate(
      candidates,
      plan.candidateSelection.brierTieTolerance,
    ),
  };
}

function seedToUint32(seed: string): number {
  return Number.parseInt(sha256Hex(seed).slice(0, 8), 16) >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function quantile(sorted: number[], probability: number): number | null {
  if (!sorted.length) return null;
  const position = (sorted.length - 1) * probability;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  const fraction = position - lower;
  return sorted[lower] * (1 - fraction) + sorted[upper] * fraction;
}

export function clusterBootstrapDifference(
  candidate: CandidateEvaluation,
  baseline: CandidateEvaluation,
  metric: "brier" | "logLoss",
  plan: AnalysisPlan,
): BootstrapInterval {
  const baselineByToken = new Map(
    baseline.predictions.map((prediction) => [prediction.observationToken, prediction]),
  );
  const joined = candidate.predictions.flatMap((candidatePrediction) => {
    const baselinePrediction = baselineByToken.get(candidatePrediction.observationToken);
    if (!baselinePrediction) return [];
    return [{ candidate: candidatePrediction, baseline: baselinePrediction }];
  });
  const clusters = new Map<string, typeof joined>();
  for (const pair of joined) {
    const entries = clusters.get(pair.candidate.cluster) ?? [];
    entries.push(pair);
    clusters.set(pair.candidate.cluster, entries);
  }
  const clusterEntries = [...clusters.values()];
  const estimate = (() => {
    const candidatePoints = joined.map((pair) => ({
      prediction: pair.candidate.prediction,
      outcome: pair.candidate.outcome,
      weight: pair.candidate.weight,
      cluster: pair.candidate.cluster,
      row: {} as CalibrationObservation,
    }));
    const baselinePoints = joined.map((pair) => ({
      prediction: pair.baseline.prediction,
      outcome: pair.baseline.outcome,
      weight: pair.baseline.weight,
      cluster: pair.baseline.cluster,
      row: {} as CalibrationObservation,
    }));
    const candidateMetrics = computeBinaryMetrics(candidatePoints, plan);
    const baselineMetrics = computeBinaryMetrics(baselinePoints, plan);
    const left = candidateMetrics[metric];
    const right = baselineMetrics[metric];
    return left === null || right === null ? null : left - right;
  })();
  if (!clusterEntries.length || estimate === null) {
    return {
      estimate,
      lower: null,
      upper: null,
      repetitions: plan.uncertainty.repetitions,
      confidenceLevel: plan.uncertainty.confidenceLevel,
    };
  }
  const random = mulberry32(
    seedToUint32(`${plan.uncertainty.seed}:${candidate.id}:${metric}`),
  );
  const values: number[] = [];
  for (let repetition = 0; repetition < plan.uncertainty.repetitions; repetition += 1) {
    const sampled = Array.from({ length: clusterEntries.length }, () =>
      clusterEntries[Math.floor(random() * clusterEntries.length)],
    ).flat();
    const candidatePoints = sampled.map((pair) => ({
      prediction: pair.candidate.prediction,
      outcome: pair.candidate.outcome,
      weight: pair.candidate.weight,
      cluster: pair.candidate.cluster,
      row: {} as CalibrationObservation,
    }));
    const baselinePoints = sampled.map((pair) => ({
      prediction: pair.baseline.prediction,
      outcome: pair.baseline.outcome,
      weight: pair.baseline.weight,
      cluster: pair.baseline.cluster,
      row: {} as CalibrationObservation,
    }));
    const left = computeBinaryMetrics(candidatePoints, plan)[metric];
    const right = computeBinaryMetrics(baselinePoints, plan)[metric];
    if (left !== null && right !== null && Number.isFinite(left - right)) {
      values.push(left - right);
    }
  }
  values.sort((left, right) => left - right);
  const alpha = 1 - plan.uncertainty.confidenceLevel;
  return {
    estimate,
    lower: quantile(values, alpha / 2),
    upper: quantile(values, 1 - alpha / 2),
    repetitions: plan.uncertainty.repetitions,
    confidenceLevel: plan.uncertainty.confidenceLevel,
  };
}

function clusterBootstrapUpholdRate(
  rows: CalibrationObservation[],
  plan: AnalysisPlan,
  seedSuffix: string,
): BootstrapInterval {
  const weights = rows.map((row) => inverseProbabilityWeight(row, plan));
  const estimate = weightedMean(
    rows.map((row) => (row.materiallyUpheld ? 1 : 0)),
    weights,
  );
  const clusters = new Map<string, CalibrationObservation[]>();
  for (const row of rows) {
    const entries = clusters.get(row.agreementGroupToken) ?? [];
    entries.push(row);
    clusters.set(row.agreementGroupToken, entries);
  }
  const clusterEntries = [...clusters.values()];
  if (estimate === null || clusterEntries.length < 2) {
    return {
      estimate,
      lower: null,
      upper: null,
      repetitions: plan.uncertainty.repetitions,
      confidenceLevel: plan.uncertainty.confidenceLevel,
    };
  }
  const random = mulberry32(
    seedToUint32(`${plan.uncertainty.seed}:uphold:${seedSuffix}`),
  );
  const values: number[] = [];
  for (let repetition = 0; repetition < plan.uncertainty.repetitions; repetition += 1) {
    const sampled = Array.from({ length: clusterEntries.length }, () =>
      clusterEntries[Math.floor(random() * clusterEntries.length)],
    ).flat();
    const sampledWeights = sampled.map((row) =>
      inverseProbabilityWeight(row, plan),
    );
    const rate = weightedMean(
      sampled.map((row) => (row.materiallyUpheld ? 1 : 0)),
      sampledWeights,
    );
    if (rate !== null && Number.isFinite(rate)) values.push(rate);
  }
  values.sort((left, right) => left - right);
  const alpha = 1 - plan.uncertainty.confidenceLevel;
  return {
    estimate,
    lower: quantile(values, alpha / 2),
    upper: quantile(values, 1 - alpha / 2),
    repetitions: plan.uncertainty.repetitions,
    confidenceLevel: plan.uncertainty.confidenceLevel,
  };
}

function confidenceUpholdIntervals(
  rows: CalibrationObservation[],
  plan: AnalysisPlan,
): Record<string, BootstrapInterval> {
  return Object.fromEntries(
    CONFIDENCE_BANDS.map((band) => [
      String(band),
      clusterBootstrapUpholdRate(
        rows.filter((row) => row.originalConfidenceBand === band),
        plan,
        `confidence:${band}`,
      ),
    ]),
  );
}

function selectCandidate(
  evaluations: CandidateReport[],
  brierTieTolerance: number,
): string | null {
  const eligible = evaluations.filter(
    (candidate) => candidate.metrics.brier !== null && candidate.nativeCoverage >= 0.999,
  );
  if (!eligible.length) return null;
  eligible.sort((left, right) => {
    const brierDifference =
      (left.metrics.brier as number) - (right.metrics.brier as number);
    if (Math.abs(brierDifference) > brierTieTolerance) return brierDifference;
    if (left.complexityRank !== right.complexityRank) {
      return left.complexityRank - right.complexityRank;
    }
    return left.id.localeCompare(right.id);
  });
  return eligible[0].id;
}

function subgroupDefinitions(): Array<{
  id: string;
  value: (row: CalibrationObservation) => string;
}> {
  return [
    { id: "targetType", value: (row) => row.targetType },
    { id: "dimension", value: (row) => row.dimension },
    { id: "category", value: (row) => row.category },
    { id: "role", value: (row) => row.role },
    { id: "provenance", value: (row) => row.originalProvenanceClass },
    { id: "confidenceBand", value: (row) => String(row.originalConfidenceBand) },
    { id: "sourcePathway", value: (row) => row.sourcePathway },
    { id: "labelTier", value: (row) => row.labelTier },
    {
      id: "counterpartySequenceBand",
      value: (row) =>
        row.counterpartySequenceAtDecision === 1
          ? "first"
          : row.counterpartySequenceAtDecision <= 3
            ? "2-3"
            : "4+",
    },
    {
      id: "stakeWeightBand",
      value: (row) =>
        row.stakeWeight <= 1.25
          ? "standard"
          : row.stakeWeight <= 1.6
            ? "elevated"
            : "high",
    },
    { id: "originalReviewer", value: (row) => row.originalReviewerGroupToken ?? "missing" },
  ];
}

function evaluateSubgroups(
  rows: CalibrationObservation[],
  baseline: CandidateEvaluation,
  selected: CandidateEvaluation | null,
  plan: AnalysisPlan,
): CalibrationAnalysisReport["subgroupChecks"] {
  const output: CalibrationAnalysisReport["subgroupChecks"] = {};
  if (!selected) return output;
  const baselinePrediction = new Map(
    baseline.predictions.map((prediction) => [prediction.observationToken, prediction.prediction]),
  );
  const selectedPrediction = new Map(
    selected.predictions.map((prediction) => [prediction.observationToken, prediction.prediction]),
  );
  for (const definition of subgroupDefinitions()) {
    const groups = new Map<string, CalibrationObservation[]>();
    for (const row of rows) {
      const value = definition.value(row);
      const items = groups.get(value) ?? [];
      items.push(row);
      groups.set(value, items);
    }
    output[definition.id] = {};
    for (const [value, groupRows] of groups) {
      const baselineMetrics = computeBinaryMetrics(
        binaryPoints(groupRows, baselinePrediction, plan),
        plan,
      );
      const selectedMetrics = computeBinaryMetrics(
        binaryPoints(groupRows, selectedPrediction, plan),
        plan,
      );
      output[definition.id][value] = {
        rawN: groupRows.length,
        effectiveN: selectedMetrics.effectiveN,
        baselineBrier: baselineMetrics.brier,
        selectedBrier: selectedMetrics.brier,
        selectedMinusBaselineBrier:
          selectedMetrics.brier === null || baselineMetrics.brier === null
            ? null
            : selectedMetrics.brier - baselineMetrics.brier,
        selectedCalibrationError: selectedMetrics.expectedCalibrationError,
      };
    }
  }
  return output;
}

function evaluateFractionalErrorSubgroups(
  rows: CalibrationObservation[],
  plan: AnalysisPlan,
): CalibrationAnalysisReport["fractionalErrorSubgroups"] {
  const output: CalibrationAnalysisReport["fractionalErrorSubgroups"] = {};
  for (const definition of subgroupDefinitions()) {
    const groups = new Map<string, CalibrationObservation[]>();
    for (const row of rows) {
      const value = definition.value(row);
      const entries = groups.get(value) ?? [];
      entries.push(row);
      groups.set(value, entries);
    }
    output[definition.id] = Object.fromEntries(
      [...groups.entries()].map(([value, groupRows]) => [
        value,
        computeFractionalMetrics(groupRows, plan),
      ]),
    );
  }
  return output;
}

function buildPathwayDiagnostics(
  rows: CalibrationObservation[],
): CalibrationAnalysisReport["pathwayDiagnostics"] {
  const groups = new Map<string, CalibrationObservation[]>();
  for (const row of rows) {
    const entries = groups.get(row.sourcePathway) ?? [];
    entries.push(row);
    groups.set(row.sourcePathway, entries);
  }
  const bySourcePathway = Object.fromEntries(
    [...groups.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([pathway, groupRows]) => {
        const upheld = groupRows.map((row) => (row.materiallyUpheld ? 1 : 0));
        const errors = groupRows.flatMap((row) =>
          row.absoluteError === null ? [] : [row.absoluteError],
        );
        const materialUpholdRate = upheld.length
          ? upheld.reduce<number>((sum, value) => sum + value, 0) / upheld.length
          : null;
        return [
          pathway,
          {
            rawN: groupRows.length,
            materialUpholdRate,
            materialOverturnRate:
              materialUpholdRate === null ? null : 1 - materialUpholdRate,
            meanAbsoluteError: errors.length
              ? errors.reduce((sum, value) => sum + value, 0) / errors.length
              : null,
          },
        ];
      }),
  );
  const appealRows = rows.filter((row) => row.sourcePathway === "appeal");
  const appealOverturnedN = appealRows.filter(
    (row) => row.finalFinalityReason === "appeal_overturned",
  ).length;
  const administrativeCorrectionN = rows.filter(
    (row) =>
      row.sourcePathway === "administrative_correction" ||
      row.finalFinalityReason === "administrative_correction",
  ).length;
  return {
    bySourcePathway,
    appealOverturned: {
      rawN: appealOverturnedN,
      rateWithinAppealPathway: appealRows.length
        ? appealOverturnedN / appealRows.length
        : null,
    },
    administrativeCorrection: {
      rawN: administrativeCorrectionN,
      rateAmongAllResolved: rows.length
        ? administrativeCorrectionN / rows.length
        : null,
    },
  };
}

function assessReadiness(
  allRows: CalibrationObservation[],
  primarySplit: TemporalSplit,
  plan: AnalysisPlan,
): ReadinessAssessment {
  const primary = allRows.filter((row) => isPrimaryProbabilityAudit(row, plan));
  const reasons: string[] = [];
  let stage: 0 | 1 | 2 | 3 = 0;
  if (allRows.length >= 50 && primarySplit.holdout.length >= 20) stage = 1;
  else reasons.push("Stage 1 requires at least 50 resolved rows and 20 out-of-time holdout rows.");
  const classCounts = [
    ...CONFIDENCE_BANDS.map((band) => ({
      id: `confidence:${band}`,
      count: primary.filter((row) => row.originalConfidenceBand === band).length,
    })),
    ...PROVENANCE_CLASSES.map((provenance) => ({
      id: `provenance:${provenance}`,
      count: primary.filter((row) => row.originalProvenanceClass === provenance).length,
    })),
  ];
  const sparse = classCounts.filter(
    (item) => item.count < plan.activationGates.minimumDistinctParameterLabels,
  );
  if (
    allRows.length >= plan.activationGates.minimumResolvedOverall &&
    primarySplit.eligible &&
    primarySplit.holdout.length >= plan.split.minimumHoldoutRows &&
    !sparse.length
  ) {
    stage = 2;
  } else if (stage >= 1) {
    reasons.push(
      `Stage 2 requires ${plan.activationGates.minimumResolvedOverall} total labels, a valid ${plan.split.minimumHoldoutRows}-row holdout, and ${plan.activationGates.minimumDistinctParameterLabels} random complete-blinding labels for every retained distinct confidence/provenance parameter.`,
    );
    if (sparse.length) reasons.push(`Sparse classes: ${sparse.map((item) => `${item.id}=${item.count}`).join(", ")}.`);
  }
  return {
    stage,
    resolvedOverall: allRows.length,
    primaryProbabilityAuditCompleteBlinding: primary.length,
    fitRows: primarySplit.fit.length,
    holdoutRows: primarySplit.holdout.length,
    reasons,
  };
}

function monotoneConfidenceRates(
  byBand: Record<string, BinaryMetrics>,
): boolean | null {
  const observed = CONFIDENCE_BANDS.flatMap((band) => {
    const rate = byBand[String(band)]?.observedRate;
    return rate === null || rate === undefined ? [] : [rate];
  });
  if (observed.length < 2) return null;
  return observed.every(
    (rate, index) => index === 0 || rate >= observed[index - 1] - 1e-12,
  );
}

function evaluateActivationGates(
  report: Omit<CalibrationAnalysisReport, "activationGates">,
  plan: AnalysisPlan,
): ActivationGateResult[] {
  const selected = report.candidates.find(
    (candidate) => candidate.id === report.selectedCandidateId,
  );
  const baseline = report.candidates.find(
    (candidate) => candidate.id === "unweighted_global",
  );
  const gates: ActivationGateResult[] = [];
  gates.push({
    id: "minimum_resolved_overall",
    status:
      report.readiness.resolvedOverall >= plan.activationGates.minimumResolvedOverall
        ? "pass"
        : "fail",
    detail: `${report.readiness.resolvedOverall} independently resolved rows; ${plan.activationGates.minimumResolvedOverall} required.`,
  });
  gates.push({
    id: "strict_out_of_time_split",
    status: report.split.primary.eligible ? "pass" : "fail",
    detail: report.split.primary.eligible
      ? `Strict agreement + participant-pair + reviewer split has ${report.split.primary.fitRows} fit and ${report.split.primary.holdoutRows} holdout rows at cutoff ${report.split.primary.cutoffDateUtc}.`
      : report.split.primary.reason ?? "No strict leakage-safe split exists.",
  });
  const supportEntries = [
    ...Object.entries(report.parameterSupport.confidenceBands).map(
      ([id, support]) => ({ id: `confidence:${id}`, ...support }),
    ),
    ...Object.entries(report.parameterSupport.provenanceClasses).map(
      ([id, support]) => ({ id: `provenance:${id}`, ...support }),
    ),
  ];
  const insufficientSupport = supportEntries.filter(
    (entry) =>
      entry.rawN < plan.activationGates.minimumDistinctParameterLabels,
  );
  gates.push({
    id: "minimum_distinct_parameter_support",
    status: insufficientSupport.length ? "fail" : "pass",
    detail: insufficientSupport.length
      ? `Distinct parameters below ${plan.activationGates.minimumDistinctParameterLabels} labels: ${insufficientSupport
          .map((entry) => `${entry.id}=${entry.rawN}`)
          .join(", ")}.`
      : `Every confidence band and provenance class has at least ${plan.activationGates.minimumDistinctParameterLabels} complete-blinding random labels.`,
  });
  const monotone = monotoneConfidenceRates(
    report.holdoutConfidenceCalibrationByBand,
  );
  gates.push({
    id: "confidence_monotonicity",
    status:
      monotone === null ? "not_assessable" : monotone ? "pass" : "fail",
    detail:
      monotone === null
        ? "Fewer than two confidence bands have holdout observations."
        : `Observed holdout material-uphold rates are ${monotone ? "monotone" : "not monotone"}.`,
  });
  const highConfidenceSummary = [75, 100]
    .map((band) => {
      const metrics = report.holdoutConfidenceCalibrationByBand[String(band)];
      const interval = report.holdoutConfidenceUpholdIntervals[String(band)];
      const overturnRate =
        metrics?.observedRate === null || metrics?.observedRate === undefined
          ? null
          : 1 - metrics.observedRate;
      const overturnLower =
        interval?.upper === null || interval?.upper === undefined
          ? null
          : 1 - interval.upper;
      const overturnUpper =
        interval?.lower === null || interval?.lower === undefined
          ? null
          : 1 - interval.lower;
      const intervalText =
        overturnLower === null || overturnUpper === null
          ? "interval=NA"
          : `95%=[${overturnLower.toFixed(4)}, ${overturnUpper.toFixed(4)}]`;
      return `${band}: n=${metrics?.rawN ?? 0}, overturn=${
        overturnRate === null ? "NA" : overturnRate.toFixed(4)
      }, ${intervalText}`;
    })
    .join("; ");
  gates.push({
    id: "high_confidence_overturn_review",
    status: "human_review_required",
    detail: `Bands 75 and 100 require uncertainty-aware private overturn/correction review (${highConfidenceSummary}).`,
  });
  const selectedEce = selected?.metrics.expectedCalibrationError ?? null;
  gates.push({
    id: "overall_calibration_error",
    status:
      selectedEce === null
        ? "not_assessable"
        : selectedEce <= plan.activationGates.maximumOverallCalibrationError
          ? "pass"
          : "fail",
    detail:
      selectedEce === null
        ? "No selected candidate calibration estimate is available."
        : `Selected-candidate fixed-bin ECE is ${selectedEce.toFixed(4)}; maximum ${plan.activationGates.maximumOverallCalibrationError.toFixed(2)}.`,
  });
  const baselineBrier = baseline?.metrics.brier ?? null;
  const selectedBrier = selected?.metrics.brier ?? null;
  gates.push({
    id: "brier_noninferiority",
    status:
      baselineBrier === null || selectedBrier === null
        ? "not_assessable"
        : selectedBrier - baselineBrier <=
            plan.activationGates.maximumBrierWorsening
          ? "pass"
          : "fail",
    detail:
      baselineBrier === null || selectedBrier === null
        ? "Baseline or selected-candidate Brier score is unavailable."
        : `Selected minus baseline Brier is ${(selectedBrier - baselineBrier).toFixed(4)}; maximum worsening ${plan.activationGates.maximumBrierWorsening.toFixed(2)}.`,
  });
  const brierInterval = report.selectedCandidateId
    ? report.candidateBrierDifferencesVsBaseline[report.selectedCandidateId]
    : undefined;
  const logInterval = report.selectedCandidateId
    ? report.candidateLogLossDifferencesVsBaseline[report.selectedCandidateId]
    : undefined;
  const robustImprovement =
    (brierInterval?.upper !== null && brierInterval?.upper !== undefined && brierInterval.upper < 0) ||
    (logInterval?.upper !== null && logInterval?.upper !== undefined && logInterval.upper < 0);
  gates.push({
    id: "primary_metric_improvement",
    status:
      !brierInterval || !logInterval
        ? "not_assessable"
        : robustImprovement
          ? "pass"
          : "fail",
    detail: robustImprovement
      ? "A pre-registered primary loss improves with a cluster-bootstrap 95% interval entirely below zero."
      : "No pre-registered primary loss has a cluster-bootstrap interval entirely below zero.",
  });
  const poweredSubgroups = Object.values(report.subgroupChecks).flatMap((groups) =>
    Object.entries(groups).filter(([, result]) => result.rawN >= plan.subgroupMinimumRawN),
  );
  const subgroupCalibrationFailure = poweredSubgroups.find(
    ([, result]) =>
      result.selectedCalibrationError !== null &&
      result.selectedCalibrationError >
        plan.activationGates.maximumSubgroupCalibrationError,
  );
  gates.push({
    id: "subgroup_calibration",
    status:
      poweredSubgroups.length === 0
        ? "not_assessable"
        : subgroupCalibrationFailure
          ? "fail"
          : "pass",
    detail:
      poweredSubgroups.length === 0
        ? `No subgroup has at least ${plan.subgroupMinimumRawN} holdout rows.`
        : subgroupCalibrationFailure
          ? `At least one powered subgroup exceeds ECE ${plan.activationGates.maximumSubgroupCalibrationError.toFixed(2)}.`
          : `All powered subgroups are at or below ECE ${plan.activationGates.maximumSubgroupCalibrationError.toFixed(2)}.`,
  });
  const subgroupBrierFailure = poweredSubgroups.find(
    ([, result]) =>
      result.selectedMinusBaselineBrier !== null &&
      result.selectedMinusBaselineBrier >
        plan.activationGates.maximumSubgroupBrierWorsening,
  );
  gates.push({
    id: "subgroup_brier_noninferiority",
    status:
      poweredSubgroups.length === 0
        ? "not_assessable"
        : subgroupBrierFailure
          ? "fail"
          : "pass",
    detail:
      poweredSubgroups.length === 0
        ? `No subgroup has at least ${plan.subgroupMinimumRawN} holdout rows.`
        : subgroupBrierFailure
          ? `At least one powered subgroup worsens Brier by more than ${plan.activationGates.maximumSubgroupBrierWorsening.toFixed(2)}.`
          : `No powered subgroup worsens Brier by more than ${plan.activationGates.maximumSubgroupBrierWorsening.toFixed(2)}.`,
  });
  gates.push({
    id: "reviewer_process_review",
    status: "human_review_required",
    detail: "Appeal, duplicate-review, reviewer-disagreement, turnaround, abstention, and retraining thresholds require a separate private operational review.",
  });
  gates.push({
    id: "deliberate_fabrication_review",
    status: "human_review_required",
    detail: `${report.falsePositiveDeliberateFabrication.falsePositiveN} false-positive deliberate-fabrication labels among ${report.falsePositiveDeliberateFabrication.originalPositiveN} original positives. Every case requires separate private review and remains non-compensatory.`,
  });
  gates.push({
    id: "immutable_reproduction",
    status: report.integrity.verified ? "pass" : "fail",
    detail: "Canonical row hashes, ordered rows digest, manifest hash, plan version, and plan hash were verified before analysis.",
  });
  gates.push({
    id: "activation_boundary",
    status: "human_review_required",
    detail: "This report never authorizes activation. A separate model-version and production-release decision is mandatory.",
  });
  return gates;
}

function parameterSupport(
  rows: CalibrationObservation[],
  plan: AnalysisPlan,
): CalibrationAnalysisReport["parameterSupport"] {
  const primary = rows.filter((row) => isPrimaryProbabilityAudit(row, plan));
  const confidenceBands: Record<string, { rawN: number; effectiveN: number }> = {};
  for (const band of CONFIDENCE_BANDS) {
    const bandRows = primary.filter((row) => row.originalConfidenceBand === band);
    confidenceBands[String(band)] = {
      rawN: bandRows.length,
      effectiveN: effectiveSampleSize(
        bandRows.map((row) => inverseProbabilityWeight(row, plan)),
      ),
    };
  }
  const provenanceClasses: Record<
    string,
    { rawN: number; effectiveN: number }
  > = {};
  for (const provenance of PROVENANCE_CLASSES) {
    const classRows = primary.filter(
      (row) => row.originalProvenanceClass === provenance,
    );
    provenanceClasses[provenance] = {
      rawN: classRows.length,
      effectiveN: effectiveSampleSize(
        classRows.map((row) => inverseProbabilityWeight(row, plan)),
      ),
    };
  }
  return { confidenceBands, provenanceClasses };
}

function confidenceByBand(
  rows: CalibrationObservation[],
  plan: AnalysisPlan,
): Record<string, BinaryMetrics> {
  const output: Record<string, BinaryMetrics> = {};
  for (const band of CONFIDENCE_BANDS) {
    const bandRows = rows.filter((row) => row.originalConfidenceBand === band);
    const predictions = new Map(
      bandRows.map((row) => [row.observationToken, band / 100]),
    );
    output[String(band)] = computeBinaryMetrics(
      binaryPoints(bandRows, predictions, plan),
      plan,
    );
  }
  return output;
}

function falsePositiveFabrication(rows: CalibrationObservation[]) {
  const positives = rows.filter(
    (row) => row.originalIntegrityFinding === "deliberate_fabrication",
  );
  const falsePositives = positives.filter(
    (row) => row.finalIntegrityFinding !== "deliberate_fabrication",
  );
  return {
    originalPositiveN: positives.length,
    falsePositiveN: falsePositives.length,
    rate: positives.length ? falsePositives.length / positives.length : null,
  };
}

export function buildCalibrationAnalysisReport(
  parsed: ParsedCalibrationExport,
  plan: AnalysisPlan,
  codeCommit: string,
  generatedAtUtc?: string,
): CalibrationAnalysisReport {
  assertCondition(HEX_40.test(codeCommit), "codeCommit must be a full 40-character lowercase Git SHA.");
  const reportGeneratedAtUtc = generatedAtUtc ?? parsed.manifest.createdAt;
  assertCondition(
    Number.isFinite(Date.parse(reportGeneratedAtUtc)),
    "generatedAtUtc must be a valid timestamp.",
  );
  const allRows = parsed.rows.map((row) => row.observation);
  const primarySplit = buildTemporalSplit(
    allRows,
    plan,
    plan.split.primaryGrouping,
  );
  const agreementOnlySplit = buildTemporalSplit(allRows, plan, "agreement");
  const pairSplit = buildTemporalSplit(allRows, plan, "agreement_pair");
  const reviewerSplit = buildTemporalSplit(
    allRows,
    plan,
    "agreement_reviewer",
  );
  const holdoutRows = primarySplit.holdout;
  const fitRows = primarySplit.fit;
  const candidateSelection = primarySplit.eligible
    ? crossValidateCandidates(fitRows, plan)
    : {
        method: plan.candidateSelection.method,
        requestedFolds: plan.candidateSelection.folds,
        realizedFolds: 0,
        seed: plan.candidateSelection.seed,
        candidates: [],
        selectedCandidateId: null,
      } satisfies CandidateSelectionResult;
  const candidateEvaluations = primarySplit.eligible
    ? fitCandidates(fitRows, plan).map((candidate) =>
        evaluateCandidate(candidate, holdoutRows, plan),
      )
    : [];
  const selectedCandidateId = candidateSelection.selectedCandidateId;
  const baseline = candidateEvaluations.find(
    (candidate) => candidate.id === "unweighted_global",
  );
  const selected = candidateEvaluations.find(
    (candidate) => candidate.id === selectedCandidateId,
  ) ?? null;
  const candidateBrierDifferencesVsBaseline: Record<string, BootstrapInterval> = {};
  const candidateLogLossDifferencesVsBaseline: Record<string, BootstrapInterval> = {};
  if (baseline) {
    for (const candidate of candidateEvaluations) {
      candidateBrierDifferencesVsBaseline[candidate.id] =
        clusterBootstrapDifference(candidate, baseline, "brier", plan);
      candidateLogLossDifferencesVsBaseline[candidate.id] =
        clusterBootstrapDifference(candidate, baseline, "logLoss", plan);
    }
  }
  const primaryAll = allRows.filter((row) => isPrimaryProbabilityAudit(row, plan));
  const confidenceDirectPredictions = new Map(
    primaryAll.map((row) => [
      row.observationToken,
      row.originalConfidenceBand / 100,
    ]),
  );
  const baseReport: Omit<CalibrationAnalysisReport, "activationGates"> = {
    reportSchemaVersion: "evidence-credibility-calibration-report-v1",
    generatedAtUtc: reportGeneratedAtUtc,
    analysisPlanVersion: plan.analysisPlanVersion,
    analysisPlanSha256: plan.analysisPlanSha256,
    exportId: parsed.manifest.exportId,
    exportFileSha256: parsed.exportFileSha256,
    exportManifestHash: parsed.manifest.manifestHash,
    exportRowsDigest: parsed.manifest.rowsDigest,
    sourceCutoffAt: parsed.manifest.sourceCutoffAt,
    codeCommit,
    activationAuthorized: false,
    integrity: {
      verified: true,
      rowCount: parsed.rows.length,
      canonicalRowsVerified: parsed.rows.length,
    },
    cohorts: {
      all: allRows.length,
      randomSelected: allRows.filter(
        (row) => row.selectedReason === "random_selected",
      ).length,
      mandatorySelected: allRows.filter(
        (row) => row.selectedReason !== "random_selected",
      ).length,
      probabilityAuditCompleteBlinding: primaryAll.length,
      originalEligibleProbabilityAuditCompleteBlinding: allRows.filter((row) =>
        isPrimaryModelComparisonRow(row, plan),
      ).length,
    },
    split: {
      primary: summarizeTemporalSplit(primarySplit),
      agreementOnlySensitivity: summarizeTemporalSplit(agreementOnlySplit),
      participantPairSensitivity: summarizeTemporalSplit(pairSplit),
      reviewerSensitivity: summarizeTemporalSplit(reviewerSplit),
    },
    readiness: assessReadiness(allRows, primarySplit, plan),
    parameterSupport: parameterSupport(allRows, plan),
    confidenceCalibrationByBand: confidenceByBand(primaryAll, plan),
    confidenceCalibrationOverall: computeBinaryMetrics(
      binaryPoints(primaryAll, confidenceDirectPredictions, plan),
      plan,
    ),
    holdoutConfidenceCalibrationByBand: confidenceByBand(holdoutRows, plan),
    holdoutConfidenceCalibrationOverall: computeBinaryMetrics(
      binaryPoints(
        holdoutRows,
        new Map(
          holdoutRows.map((row) => [
            row.observationToken,
            row.originalConfidenceBand / 100,
          ]),
        ),
        plan,
      ),
      plan,
    ),
    holdoutConfidenceUpholdIntervals: confidenceUpholdIntervals(
      holdoutRows,
      plan,
    ),
    fractionalCompletion: computeFractionalMetrics(allRows, plan),
    fractionalErrorSubgroups: evaluateFractionalErrorSubgroups(
      allRows,
      plan,
    ),
    categorical: {
      status: computeConfusionMatrix(
        allRows,
        (row) => row.originalStatus,
        (row) => row.finalStatus,
        plan,
      ),
      finalityReason: computeConfusionMatrix(
        allRows,
        (row) => row.originalFinalityReason,
        (row) => row.finalFinalityReason,
        plan,
      ),
      integrity: computeConfusionMatrix(
        allRows,
        (row) => row.originalIntegrityFinding,
        (row) => row.finalIntegrityFinding,
        plan,
      ),
      responsiveness: computeConfusionMatrix(
        allRows,
        (row) => row.originalResponsivenessFinding,
        (row) => row.finalResponsivenessFinding,
        plan,
      ),
      disputeConduct: computeConfusionMatrix(
        allRows,
        (row) => row.originalDisputeConductFinding,
        (row) => row.finalDisputeConductFinding,
        plan,
      ),
    },
    pathwayDiagnostics: buildPathwayDiagnostics(allRows),
    falsePositiveDeliberateFabrication: falsePositiveFabrication(allRows),
    candidateSelection,
    candidates: candidateEvaluations.map(summarizeCandidate),
    selectedCandidateId,
    candidateBrierDifferencesVsBaseline,
    candidateLogLossDifferencesVsBaseline,
    subgroupChecks:
      baseline && selected
        ? evaluateSubgroups(holdoutRows, baseline, selected, plan)
        : {},
    limitations: [
      "The export does not contain duration bands, indivisibility, payment/nonpayment flags, or consented demographic attributes; this v1 report does not infer them.",
      "Deliberate-fabrication-, administrative-correction-, appeal-, and provider-selected observations are reported descriptively and are not pooled into primary probability-sample calibration estimates; the census-selected zero-confidence/review-required stratum is included with its known inclusion probability.",
      "Inverse-probability weighting corrects known sampling probabilities but cannot remove bias from incomplete labels, operational exclusions, or imperfect blinding.",
      "Candidate comparison concerns prediction of independent material uphold, not causal additionality, moral value, safety, restrictions, or participant worth.",
      "Passing every automated gate would still not authorize model activation or production release.",
    ],
  };
  return {
    ...baseReport,
    activationGates: evaluateActivationGates(baseReport, plan),
  };
}

function formatMetric(value: number | null, digits = 4): string {
  return value === null || !Number.isFinite(value) ? "NA" : value.toFixed(digits);
}

export function renderReportMarkdown(
  report: CalibrationAnalysisReport,
): string {
  const lines: string[] = [
    "# Private Evidence-Credibility Calibration Report",
    "",
    "> Private research artifact. This report does not authorize activation, deployment, public display, ranking, eligibility, safeguards, restrictions, or payment effects.",
    "",
    "## Reproduction identity",
    "",
    `- Analysis plan: \`${report.analysisPlanVersion}\``,
    `- Analysis-plan SHA-256: \`${report.analysisPlanSha256}\``,
    `- Export ID: \`${report.exportId}\``,
    `- Export file SHA-256: \`${report.exportFileSha256}\``,
    `- Export manifest hash: \`${report.exportManifestHash}\``,
    `- Export rows digest: \`${report.exportRowsDigest}\``,
    `- Source cutoff: \`${report.sourceCutoffAt}\``,
    `- Code commit: \`${report.codeCommit}\``,
    "",
    "## Readiness",
    "",
    `Stage: **${report.readiness.stage}**`,
    "",
    `Resolved rows: ${report.readiness.resolvedOverall}; primary random complete-blinding rows: ${report.readiness.primaryProbabilityAuditCompleteBlinding}; fit: ${report.readiness.fitRows}; holdout: ${report.readiness.holdoutRows}.`,
    "",
    ...report.readiness.reasons.map((reason) => `- ${reason}`),
    "",
    "## Leakage-safe split",
    "",
    `- Primary grouping: \`${report.split.primary.groupingMode}\``,
    `- Cutoff: \`${report.split.primary.cutoffDateUtc ?? "unavailable"}\``,
    `- Fit rows: ${report.split.primary.fitRows}; holdout rows: ${report.split.primary.holdoutRows}`,
    `- Fit observation-set digest: \`${report.split.primary.fitObservationSetDigest}\``,
    `- Holdout observation-set digest: \`${report.split.primary.holdoutObservationSetDigest}\``,
    "",
    "## Distinct-parameter support",
    "",
    "| Parameter | n | effective n |",
    "|---|---:|---:|",
    ...Object.entries(report.parameterSupport.confidenceBands).map(
      ([band, support]) =>
        `| confidence:${band} | ${support.rawN} | ${support.effectiveN.toFixed(1)} |`,
    ),
    ...Object.entries(report.parameterSupport.provenanceClasses).map(
      ([provenance, support]) =>
        `| provenance:${provenance} | ${support.rawN} | ${support.effectiveN.toFixed(1)} |`,
    ),
    "",
    "## Holdout confidence calibration",
    "",
    "| Band | n | effective n | observed uphold | 95% cluster interval | Brier | ECE |",
    "|---:|---:|---:|---:|---:|---:|---:|",
    ...CONFIDENCE_BANDS.map((band) => {
      const metrics = report.holdoutConfidenceCalibrationByBand[String(band)];
      const interval = report.holdoutConfidenceUpholdIntervals[String(band)];
      const intervalText =
        interval.lower === null || interval.upper === null
          ? "NA"
          : `[${interval.lower.toFixed(4)}, ${interval.upper.toFixed(4)}]`;
      return `| ${band} | ${metrics.rawN} | ${metrics.effectiveN.toFixed(1)} | ${formatMetric(metrics.observedRate)} | ${intervalText} | ${formatMetric(metrics.brier)} | ${formatMetric(metrics.expectedCalibrationError)} |`;
    }),
    "",
    "## Candidate selection inside the fit set",
    "",
    `Method: \`${report.candidateSelection.method}\`; folds: ${report.candidateSelection.realizedFolds}/${report.candidateSelection.requestedFolds}; selected: \`${report.candidateSelection.selectedCandidateId ?? "none"}\`.`,
    "",
    "| Candidate | Out-of-fold coverage | Brier | Log loss | ECE | Selected |",
    "|---|---:|---:|---:|---:|:---:|",
    ...report.candidateSelection.candidates.map(
      (candidate) =>
        `| ${candidate.id} | ${(candidate.nativeCoverage * 100).toFixed(1)}% | ${formatMetric(candidate.metrics.brier)} | ${formatMetric(candidate.metrics.logLoss)} | ${formatMetric(candidate.metrics.expectedCalibrationError)} | ${candidate.id === report.candidateSelection.selectedCandidateId ? "yes" : ""} |`,
    ),
    "",
    "## Candidate comparison on sealed out-of-time holdout",
    "",
    "| Candidate | Coverage | Brier | Log loss | ECE | Selected |",
    "|---|---:|---:|---:|---:|:---:|",
    ...report.candidates.map(
      (candidate) =>
        `| ${candidate.id} | ${(candidate.nativeCoverage * 100).toFixed(1)}% | ${formatMetric(candidate.metrics.brier)} | ${formatMetric(candidate.metrics.logLoss)} | ${formatMetric(candidate.metrics.expectedCalibrationError)} | ${candidate.id === report.selectedCandidateId ? "yes" : ""} |`,
    ),
    "",
    "## Fractional completion",
    "",
    `- n: ${report.fractionalCompletion.rawN}; effective n: ${report.fractionalCompletion.effectiveN.toFixed(1)}`,
    `- MAE: ${formatMetric(report.fractionalCompletion.meanAbsoluteError)}`,
    `- RMSE: ${formatMetric(report.fractionalCompletion.rootMeanSquaredError)}`,
    `- Signed error (original minus independent final): ${formatMetric(report.fractionalCompletion.signedError)}`,
    `- Over-estimation rate: ${formatMetric(report.fractionalCompletion.overEstimationRate)}`,
    `- Under-estimation rate: ${formatMetric(report.fractionalCompletion.underEstimationRate)}`,
    "",
    "## Pathway diagnostics",
    "",
    "| Source pathway | n | material uphold | material overturn | mean absolute error |",
    "|---|---:|---:|---:|---:|",
    ...Object.entries(report.pathwayDiagnostics.bySourcePathway).map(
      ([pathway, diagnostic]) =>
        `| ${pathway} | ${diagnostic.rawN} | ${formatMetric(diagnostic.materialUpholdRate)} | ${formatMetric(diagnostic.materialOverturnRate)} | ${formatMetric(diagnostic.meanAbsoluteError)} |`,
    ),
    "",
    `- Appeal-overturned labels: ${report.pathwayDiagnostics.appealOverturned.rawN}; rate within appeal pathway: ${formatMetric(report.pathwayDiagnostics.appealOverturned.rateWithinAppealPathway)}.`,
    `- Administrative-correction labels/pathways: ${report.pathwayDiagnostics.administrativeCorrection.rawN}; descriptive rate among resolved exports: ${formatMetric(report.pathwayDiagnostics.administrativeCorrection.rateAmongAllResolved)}.`,
    "",
    "## Activation gates",
    "",
    "| Gate | Status | Detail |",
    "|---|---|---|",
    ...report.activationGates.map(
      (gate) => `| ${gate.id} | ${gate.status} | ${gate.detail.replaceAll("|", "\\|")} |`,
    ),
    "",
    "## Limitations",
    "",
    ...report.limitations.map((limitation) => `- ${limitation}`),
    "",
  ];
  return `${lines.join("\n")}\n`;
}

export function renderReliabilitySvg(
  report: CalibrationAnalysisReport,
): string {
  const width = 720;
  const height = 520;
  const margin = 70;
  const chart = width - 2 * margin;
  const x = (value: number) => margin + value * chart;
  const y = (value: number) => height - margin - value * chart;
  const points = CONFIDENCE_BANDS.flatMap((band) => {
    const metrics = report.holdoutConfidenceCalibrationByBand[String(band)];
    return metrics.observedRate === null
      ? []
      : [{ prediction: band / 100, observed: metrics.observedRate, n: metrics.rawN }];
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">\n  <title id="title">Confidence reliability diagram</title>\n  <desc id="desc">Predicted confidence band against independently observed material-uphold rate. Synthetic fixtures are never empirical evidence.</desc>\n  <rect width="100%" height="100%" fill="white"/>\n  <line x1="${margin}" y1="${height - margin}" x2="${width - margin}" y2="${margin}" stroke="black" stroke-dasharray="6 6"/>\n  <line x1="${margin}" y1="${height - margin}" x2="${width - margin}" y2="${height - margin}" stroke="black"/>\n  <line x1="${margin}" y1="${height - margin}" x2="${margin}" y2="${margin}" stroke="black"/>\n  ${points.map((point) => `<circle cx="${x(point.prediction).toFixed(2)}" cy="${y(point.observed).toFixed(2)}" r="${Math.max(4, Math.min(14, 3 + Math.sqrt(point.n))).toFixed(2)}" fill="none" stroke="black"><title>predicted ${point.prediction.toFixed(2)}, observed ${point.observed.toFixed(3)}, n=${point.n}</title></circle>`).join("\n  ")}\n  <text x="${width / 2}" y="${height - 16}" text-anchor="middle" font-family="sans-serif" font-size="16">Predicted probability</text>\n  <text x="18" y="${height / 2}" transform="rotate(-90 18 ${height / 2})" text-anchor="middle" font-family="sans-serif" font-size="16">Observed material-uphold rate</text>\n</svg>\n`;
}

export async function writeCalibrationReport(
  report: CalibrationAnalysisReport,
  outputDirectory: string,
): Promise<void> {
  const resolved = resolve(outputDirectory);
  await mkdir(resolved, { recursive: false });
  try {
    const json = `${JSON.stringify(report, null, 2)}\n`;
    const markdown = renderReportMarkdown(report);
    const reliability = renderReliabilitySvg(report);
    await Promise.all([
      writeFile(resolve(resolved, "report.json"), json, { flag: "wx" }),
      writeFile(resolve(resolved, "report.md"), markdown, { flag: "wx" }),
      writeFile(resolve(resolved, "reliability.svg"), reliability, { flag: "wx" }),
    ]);
    const manifest = {
      reportSchemaVersion: report.reportSchemaVersion,
      generatedAtUtc: report.generatedAtUtc,
      analysisPlanVersion: report.analysisPlanVersion,
      analysisPlanSha256: report.analysisPlanSha256,
      exportId: report.exportId,
      exportFileSha256: report.exportFileSha256,
      exportManifestHash: report.exportManifestHash,
      exportRowsDigest: report.exportRowsDigest,
      sourceCutoffAt: report.sourceCutoffAt,
      codeCommit: report.codeCommit,
      reportJsonSha256: sha256Hex(json),
      reportMarkdownSha256: sha256Hex(markdown),
      reliabilitySvgSha256: sha256Hex(reliability),
      activationAuthorized: false,
    };
    await writeFile(
      resolve(resolved, "analysis-manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
      { flag: "wx" },
    );
  } catch (error) {
    await rm(resolved, { recursive: true, force: true });
    throw error;
  }
}

export interface RunCalibrationAnalysisOptions {
  inputPath: string;
  outputDirectory: string;
  planJsonPath: string;
  planDocumentPath: string;
  codeCommit: string;
  acknowledgeHeldoutOpen: boolean;
  generatedAtUtc?: string;
}

export async function runCalibrationAnalysis(
  options: RunCalibrationAnalysisOptions,
): Promise<CalibrationAnalysisReport> {
  assertCondition(
    options.acknowledgeHeldoutOpen,
    "Opening the held-out labels requires explicit --acknowledge-heldout-open acknowledgement.",
  );
  const plan = await loadAnalysisPlan(
    options.planJsonPath,
    options.planDocumentPath,
  );
  const exportText = await readFile(options.inputPath, "utf8");
  const parsed = parseCalibrationExport(exportText, plan);
  const report = buildCalibrationAnalysisReport(
    parsed,
    plan,
    options.codeCommit,
    options.generatedAtUtc,
  );
  await mkdir(dirname(resolve(options.outputDirectory)), { recursive: true });
  await writeCalibrationReport(report, options.outputDirectory);
  return report;
}
