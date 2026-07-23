import { readdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const TEST_ROOT = path.join(ROOT, "src");

// These files assert superseded source strings, retired static-shell markup, or
// pre-launch route contracts. They are retained for follow-up migration work,
// but they are not authoritative release gates. See docs/core-launch-test-gate.md.
const QUARANTINED = new Set([
  "src/app/live-home-shell.test.ts",
  "src/app/live-discover-shell.test.ts",
  "src/app/live-feed-shell.test.ts",
  "src/app/live-giving-shell.test.ts",
  "src/app/live-commitments-shell.test.ts",
  "src/app/conditional-payment-activation.test.ts",
  "src/app/moral-trade-route-smoke.test.ts",
  "src/app/public-evidence-policy.test.ts",
  "src/auth-provider-pages.test.ts",
  "src/brand-rollout.test.ts",
  "src/crawlability.test.ts",
  "src/lib/local-date-time.test.ts",
  "src/lib/live-discover-navigation.test.ts",
  "src/lib/public-moral-trade-samples.test.ts",
]);

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
const missingQuarantineEntries = [...QUARANTINED].filter(
  (testPath) => !discovered.includes(testPath),
);

if (missingQuarantineEntries.length) {
  console.error("Quarantine manifest contains files that no longer exist:");
  for (const testPath of missingQuarantineEntries) console.error(`- ${testPath}`);
  process.exit(1);
}

const selected = discovered.filter((testPath) => !QUARANTINED.has(testPath));
if (!selected.length) {
  console.error("No authoritative test files were discovered.");
  process.exit(1);
}

console.log(
  `Running ${selected.length} authoritative test files; ` +
    `${QUARANTINED.size} stale source-contract files are quarantined and documented.`,
);

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
