import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { createPrng, sha256 } from "./assignment.mjs";
import { simulateScenario, validateSpec } from "./precision-core.mjs";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_SPEC = path.resolve(
  MODULE_DIR,
  "../../docs/commitments/impact-identification/study-candidates/trade-bilateral-encouragement-planning-v1/precision-spec.json",
);
const DEFAULT_REPORT = path.resolve(
  MODULE_DIR,
  "../../docs/commitments/impact-identification/study-candidates/trade-bilateral-encouragement-planning-v1/precision-report.json",
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function generatePrecisionReport(spec) {
  validateSpec(spec);
  const random = createPrng(spec.simulationSeed);
  const scenarios = [];
  for (const clustersPerArm of spec.clustersPerArm) {
    for (const baselineCompletionRate of spec.baselineCompletionRates) {
      for (const absolutePolicyEffect of spec.absolutePolicyEffects) {
        for (const intraclusterCorrelation of spec.intraclusterCorrelations) {
          scenarios.push(
            simulateScenario(
              spec,
              {
                clustersPerArm,
                baselineCompletionRate,
                absolutePolicyEffect,
                intraclusterCorrelation,
              },
              random,
            ),
          );
        }
      }
    }
  }

  const planningTargetScenarios = scenarios.filter(
    (scenario) =>
      scenario.baselineCompletionRate === spec.planningTarget.baselineCompletionRate &&
      scenario.absolutePolicyEffect === spec.planningTarget.absolutePolicyEffect &&
      scenario.intraclusterCorrelation <= spec.planningTarget.maximumIntraclusterCorrelation,
  );
  const planningCandidatesByClusterCount = [...new Set(planningTargetScenarios.map((scenario) => scenario.clustersPerArm))]
    .sort((left, right) => left - right)
    .map((clustersPerArm) => {
      const members = planningTargetScenarios.filter((scenario) => scenario.clustersPerArm === clustersPerArm);
      const worstPower = members.reduce((current, scenario) =>
        scenario.simulatedPowerOrTypeIError < current.simulatedPowerOrTypeIError ? scenario : current,
      );
      const widestInterval = members.reduce((current, scenario) =>
        scenario.medianConfidenceHalfWidth95 > current.medianConfidenceHalfWidth95 ? scenario : current,
     );
      return {
        clustersPerArm,
        totalClusters: clustersPerArm * 4,
        requiredIccGrid: members.map((scenario) => scenario.intraclusterCorrelation),
        worstPower: worstPower.simulatedPowerOrTypeIError,
        worstPowerMonteCarloInterval95: worstPower.simulatedPowerOrTypeIErrorMonteCarloInterval95,
        worstPowerIcc: worstPower.intraclusterCorrelation,
        widestMedianHalfWidth95: widestInterval.medianConfidenceHalfWidth95,
        widestIntervalIcc: widestInterval.intraclusterCorrelation,
        meetsPlanningTarget:
          worstPower.simulatedPowerOrTypeIErrorMonteCarloInterval95[0] >= spec.planningTarget.minimumPower &&
          widestInterval.medianConfidenceHalfWidth95 <= spec.planningTarget.maximumMedianHalfWidth95,
      };
    });
  const smallestPlanningCandidate =
    planningCandidatesByClusterCount.find((candidate) => candidate.meetsPlanningTarget) ?? null;

  const nullScenarios = scenarios.filter((scenario) => scenario.absolutePolicyEffect === 0);
  const typeIErrorPointWithinTolerance = nullScenarios.every(
    (scenario) =>
      scenario.simulatedPowerOrTypeIError <= spec.planningTarget.maximumTypeIError,
  );
  const typeIErrorMonteCarloUpperWithinTolerance = nullScenarios.every(
    (scenario) =>
      scenario.simulatedPowerOrTypeIErrorMonteCarloInterval95[1] <=
      spec.planningTarget.maximumTypeIError,
  );

  const reportPayload = {
    schemaVersion: "commitments-trade-precision-report-v1",
    studyVariant: spec.studyVariant,
    primaryEstimand: "policy-level assignment-policy ITT",
    primaryContrast: spec.primaryContrast,
    scientificIntervalLevelBps: spec.scientificIntervalLevelBps,
    simulationSpecHash: sha256(spec),
    simulationSeedCommitment: sha256(spec.simulationSeed),
    replicatesPerScenario: spec.replicates,
    scenarioCount: scenarios.length,
    planningTarget: spec.planningTarget,
    planningCandidatesByClusterCount,
    smallestPlanningCandidate,
    typeIErrorPointWithinTolerance,
    typeIErrorMonteCarloUpperWithinTolerance,
    scenarioGridDigest: sha256(scenarios),
    nullDiagnosticsByClusterCount: [...new Set(nullScenarios.map((scenario) => scenario.clustersPerArm))]
      .sort((left, right) => left - right)
      .map((clustersPerArm) => {
        const members = nullScenarios.filter((scenario) => scenario.clustersPerArm === clustersPerArm);
        const worstPoint = members.reduce((current, scenario) =>
          scenario.simulatedPowerOrTypeIError > current.simulatedPowerOrTypeIError ? scenario : current,
        );
        const worstUpper = members.reduce((current, scenario) =>
          scenario.simulatedPowerOrTypeIErrorMonteCarloInterval95[1] >
          current.simulatedPowerOrTypeIErrorMonteCarloInterval95[1]
            ? scenario
            : current,
        );
        return {
          clustersPerArm,
          worstPointTypeIError: worstPoint.simulatedPowerOrTypeIError,
          worstPointIcc: worstPoint.intraclusterCorrelation,
          worstMonteCarloUpper95: worstUpper.simulatedPowerOrTypeIErrorMonteCarloInterval95[1],
          worstUpperIcc: worstUpper.intraclusterCorrelation,
        };
      }),
    selectedScenarioSummaries: scenarios.filter(
      (scenario) =>
        scenario.clustersPerArm === smallestPlanningCandidate?.clustersPerArm &&
        (scenario.absolutePolicyEffect === spec.planningTarget.absolutePolicyEffect ||
          (scenario.intraclusterCorrelation ===
            spec.planningTarget.maximumIntraclusterCorrelation &&
            [0, 0.02, 0.05].includes(scenario.absolutePolicyEffect))),
    ),
    executionDecision: {
      determination: "no_launch",
      reasons: [
        "No frozen real eligible-population graph snapshot or completed graph diagnostics exist.",
        "No independent ethics determination or consent/waiver decision exists.",
        "The numerical planning target is a design aid, not an approved product confidence threshold.",
        "Assignment and analysis code are frozen for synthetic review only; real-user execution is not authorized.",
      ],
    },
    evidenceBoundary: {
      supports: [
        "design-specific planning for a graph-cluster bilateral encouragement study",
        "selection of a candidate independent-cluster range for later graph diagnostics",
      ],
      doesNotSupport: [
        "a claim that Moral Trade invitations cause outcomes in real users",
        "participant expected additional impact",
        "participant direct causal attribution",
        "empirical calibration of any PR #534 methodology",
      ],
    },
  };

  return { ...reportPayload, reportPayloadHash: sha256(reportPayload) };
}

function parseArgs(argv) {
  const result = { specPath: DEFAULT_SPEC, outputPath: DEFAULT_REPORT, check: false };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--spec") result.specPath = path.resolve(argv[++index]);
    else if (argv[index] === "--output") result.outputPath = path.resolve(argv[++index]);
    else if (argv[index] === "--check") result.check = true;
    else throw new Error(`Unknown argument: ${argv[index]}`);
  }
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const options = parseArgs(process.argv.slice(2));
  const spec = JSON.parse(fs.readFileSync(options.specPath, "utf8"));
  const report = generatePrecisionReport(spec);
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  if (options.check) {
    const current = fs.readFileSync(options.outputPath, "utf8");
    assert(current === serialized, "Precision report is stale or was generated by different code.");
    process.stdout.write(`${JSON.stringify({ ok: true, reportPayloadHash: report.reportPayloadHash })}\n`);
  } else {
    fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
    fs.writeFileSync(options.outputPath, serialized);
    process.stdout.write(`${JSON.stringify({ ok: true, outputPath: options.outputPath, reportPayloadHash: report.reportPayloadHash })}\n`);
  }
}
