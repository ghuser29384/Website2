import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  buildGraphFeasibilityReport,
  generateSyntheticSnapshot,
  sha256,
} from "./graph-feasibility-core.mjs";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(MODULE_DIR, "../..");
const PACKAGE_DIR = path.join(
  ROOT,
  "docs/commitments/impact-identification/study-candidates/" +
    "trade-bilateral-encouragement-planning-v1/graph-feasibility",
);

export const PATHS = Object.freeze({
  contract: path.join(PACKAGE_DIR, "graph-feasibility-contract.json"),
  snapshotSchema: path.join(PACKAGE_DIR, "graph-snapshot.schema.v1.json"),
  spec: path.join(PACKAGE_DIR, "synthetic-graph-spec.json"),
  report: path.join(PACKAGE_DIR, "synthetic-graph-report.json"),
  core: path.join(MODULE_DIR, "graph-feasibility-core.mjs"),
  runner: fileURLToPath(import.meta.url),
});

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function rawSha256(file) {
  return `sha256:${crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex")}`;
}

export function generateCommittedReport() {
  const contract = readJson(PATHS.contract);
  const snapshotSchema = readJson(PATHS.snapshotSchema);
  const spec = readJson(PATHS.spec);
  const snapshot = generateSyntheticSnapshot(spec);
  return buildGraphFeasibilityReport({
    contract,
    spec,
    snapshot,
    diagnosticCodeHash: rawSha256(PATHS.core),
    runnerCodeHash: rawSha256(PATHS.runner),
    snapshotSchemaHash: sha256(snapshotSchema),
  });
}

function main() {
  const report = generateCommittedReport();
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  const mode = process.argv[2] ?? "--print";

  if (mode === "--write") {
    fs.writeFileSync(PATHS.report, serialized);
    process.stdout.write(`${JSON.stringify({ ok: true, reportPayloadHash: report.reportPayloadHash })}\n`);
    return;
  }

  if (mode === "--check") {
    const committed = fs.readFileSync(PATHS.report, "utf8");
    if (committed !== serialized) {
      throw new Error("Committed synthetic graph report does not match deterministic regeneration.");
    }
    process.stdout.write(`${JSON.stringify({ ok: true, reportPayloadHash: report.reportPayloadHash })}\n`);
    return;
  }

  if (mode !== "--print") throw new Error(`Unknown mode: ${mode}`);
  process.stdout.write(serialized);
}

const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) main();
