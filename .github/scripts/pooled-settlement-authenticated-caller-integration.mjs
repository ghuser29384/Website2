import { readFile, rm, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import { buildAuthenticatedHarnessSource } from "./pooled-settlement-authenticated-caller-integration-contract.mjs";

const sourcePath = ".github/scripts/pooled-settlement-qa-e2e.mjs";
const generatedPath = ".github/scripts/.generated-pooled-settlement-authenticated-caller-e2e.mjs";

const source = await readFile(sourcePath, "utf8");
const generated = buildAuthenticatedHarnessSource(source);
await writeFile(generatedPath, generated, "utf8");

try {
  const url = `${pathToFileURL(generatedPath).href}?run=${encodeURIComponent(
    process.env.GITHUB_RUN_ID || String(Date.now()),
  )}`;
  await import(url);
} finally {
  await rm(generatedPath, { force: true });
}
