#!/usr/bin/env node

import { runCalibrationAnalysis } from "../src/lib/evidence-credibility-calibration-analysis";

interface CliOptions {
  inputPath: string;
  outputDirectory: string;
  planJsonPath: string;
  planDocumentPath: string;
  codeCommit: string;
  acknowledgeHeldoutOpen: boolean;
}

function usage() {
  return [
    "Usage:",
    "  npm run analyze:evidence-credibility -- \\",
    "    --input /private/path/export.jsonl \\",
    "    --output /private/path/new-report-directory \\",
    "    --plan-json analysis/evidence-credibility-calibration-v1/plan.json \\",
    "    --plan-document docs/moral-trade/evidence-credibility-calibration-analysis-plan-v1.md \\",
    "    --code-commit <40-character-git-sha> \\",
    "    --acknowledge-heldout-open",
    "",
    "The output directory must not already exist. The command verifies the frozen plan and every export hash before opening labels. It never authorizes activation.",
  ].join("\n");
}

function takeValue(args: string[], index: number, flag: string) {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

function parseArguments(args: string[]): CliOptions {
  const values = new Map<string, string>();
  let acknowledgeHeldoutOpen = false;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--help" || argument === "-h") {
      process.stdout.write(`${usage()}\n`);
      process.exit(0);
    }
    if (argument === "--acknowledge-heldout-open") {
      acknowledgeHeldoutOpen = true;
      continue;
    }
    if (
      argument === "--input" ||
      argument === "--output" ||
      argument === "--plan-json" ||
      argument === "--plan-document" ||
      argument === "--code-commit"
    ) {
      values.set(argument, takeValue(args, index, argument));
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }

  const required = [
    "--input",
    "--output",
    "--plan-json",
    "--plan-document",
    "--code-commit",
  ] as const;
  for (const flag of required) {
    if (!values.has(flag)) throw new Error(`${flag} is required.`);
  }
  return {
    inputPath: values.get("--input") as string,
    outputDirectory: values.get("--output") as string,
    planJsonPath: values.get("--plan-json") as string,
    planDocumentPath: values.get("--plan-document") as string,
    codeCommit: values.get("--code-commit") as string,
    acknowledgeHeldoutOpen,
  };
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const report = await runCalibrationAnalysis(options);
  process.stdout.write(
    `${JSON.stringify(
      {
        ok: true,
        outputDirectory: options.outputDirectory,
        analysisPlanVersion: report.analysisPlanVersion,
        analysisPlanSha256: report.analysisPlanSha256,
        exportId: report.exportId,
        exportFileSha256: report.exportFileSha256,
        codeCommit: report.codeCommit,
        readinessStage: report.readiness.stage,
        selectedCandidateId: report.selectedCandidateId,
        activationAuthorized: false,
      },
      null,
      2,
    )}\n`,
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Calibration analysis failed closed: ${message}\n\n${usage()}\n`);
  process.exitCode = 1;
});
