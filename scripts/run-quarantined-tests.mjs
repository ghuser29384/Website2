import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const manifestPath = path.join(ROOT, "scripts", "core-test-quarantine.json");
const listed = JSON.parse(await readFile(manifestPath, "utf8"));
const existing = [];

for (const relativePath of listed) {
  try {
    await access(path.join(ROOT, relativePath), constants.R_OK);
    existing.push(relativePath);
  } catch {
    // Retired files remain documented but are not passed to the test runner.
  }
}

if (!existing.length) {
  console.log("No quarantined test files remain in the current tree.");
  process.exit(0);
}

console.log(`Running ${existing.length} quarantined test files as a non-release diagnostic.`);
const child = spawn(
  process.execPath,
  ["--import", "tsx", "--test", "--test-reporter=spec", ...existing],
  {
    cwd: ROOT,
    env: process.env,
    stdio: "inherit",
  },
);

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});
child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`Quarantined diagnostics terminated by ${signal}.`);
    process.exit(1);
  }
  process.exit(code ?? 1);
});
