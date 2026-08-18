import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { buildAuthenticatedHarnessSource } from "./pooled-settlement-authenticated-caller-integration-contract.mjs";

const sourcePath = ".github/scripts/pooled-settlement-qa-e2e.mjs";
const generatedPath = ".github/scripts/.generated-pooled-settlement-authenticated-caller-e2e.mjs";

function replaceExactly(source, before, after, label) {
  const first = source.indexOf(before);
  assert.ok(first >= 0, `${label}: expected source contract was not found.`);
  assert.equal(
    source.indexOf(before, first + before.length),
    -1,
    `${label}: expected source contract was not unique.`,
  );
  return source.slice(0, first) + after + source.slice(first + before.length);
}

export function alignParticipantUiTruthCopy(input) {
  const before = [
    "  await expectText(stage, /The pooled donation is the activation gate/i);",
    "  await expectText(stage, /presumptive provider-facing donor of record/i);",
  ].join("\n");
  const after = [
    "  await expectText(stage, /Trade is live\\./i);",
    "  await expectText(stage, /Both participants confirmed the same immutable version\\./i);",
    "  await expectText(stage, /Moral Trade does not hold funds\\./i);",
  ].join("\n");
  return replaceExactly(
    String(input),
    before,
    after,
    "participant UI truth-boundary copy",
  );
}

export async function runAuthenticatedIntegration() {
  const source = await readFile(sourcePath, "utf8");
  const generated = alignParticipantUiTruthCopy(
    buildAuthenticatedHarnessSource(source),
  );
  await writeFile(generatedPath, generated, "utf8");

  try {
    const url = `${pathToFileURL(generatedPath).href}?run=${encodeURIComponent(
      process.env.GITHUB_RUN_ID || String(Date.now()),
    )}`;
    await import(url);
  } finally {
    await rm(generatedPath, { force: true });
  }
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  await runAuthenticatedIntegration();
}
