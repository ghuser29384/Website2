import { readdir, readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const TEST_ROOT = path.join(ROOT, "src");
const QUARANTINE_PATH = path.join(ROOT, "scripts", "core-test-quarantine.json");
const QUARANTINED = new Set(
  JSON.parse(await readFile(QUARANTINE_PATH, "utf8")),
);

async function collectTests(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const tests = [];

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      tests.push(...(await collectTests(absolutePath)));
    } else if (entry.isFile() && entry.name.endsWith(".test.ts")) {
      tests.push(path.relative(ROOT, absolutePath).split(path.sep).join("/"));
    }
  }

  return tests;
}

const discovered = (await collectTests(TEST_ROOT)).sort();
const activeQuarantine = discovered.filter((testPath) => QUARANTINED.has(testPath));
const retiredQuarantine = [...QUARANTINED].filter(
  (testPath) => !discovered.includes(testPath),
);
const selected = discovered.filter((testPath) => !QUARANTINED.has(testPath));

if (!selected.length) {
  console.error("No authoritative test files were discovered.");
  process.exit(1);
}

console.log(
  `Running ${selected.length} authoritative test files; ` +
    `${activeQuarantine.length} existing non-authoritative file(s) are quarantined and documented.`,
);
if (retiredQuarantine.length) {
  console.log(
    `${retiredQuarantine.length} previously quarantined file(s) are absent from the current tree.`,
  );
}

const child = spawn(
  process.execPath,
  ["--import", "tsx", "--test", "--test-reporter=dot", ...selected],
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
    console.error(`Authoritative tests terminated by ${signal}.`);
    process.exit(1);
  }
  process.exit(code ?? 1);
});
