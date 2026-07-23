import { readdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const TEST_ROOT = path.join(ROOT, "src");

// These files assert superseded source strings, retired product shells, or
// experimental systems outside the bilateral release. Existing files remain
// runnable through `npm run test:quarantined`, but they do not define whether
// the core launch is releasable. See docs/core-launch-test-gate.md.
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
  "src/lib/action-first-positioning.test.ts",
  "src/lib/auth-provider-settings.test.ts",
  "src/lib/background-plain-language-term-map.test.ts",
  "src/lib/background-public-page-simplification.test.ts",
  "src/lib/crawlability.test.ts",
  "src/lib/local-date-time.test.ts",
  "src/lib/local-date-time-coverage.test.ts",
  "src/lib/live-discover-navigation.test.ts",
  "src/lib/moral-trade/challenge-appeal.test.ts",
  "src/lib/moral-trade/financial-settlement-controls.test.ts",
  "src/lib/moral-trade/group-buying.test.ts",
  "src/lib/moral-trade/marketplace-intake-triage.test.ts",
  "src/lib/moral-trade/opportunity-constrained-meal-evidence.test.ts",
  "src/lib/moral-trade/participant-credibility.test.ts",
  "src/lib/moral-trade/public-page-simplification.test.ts",
  "src/lib/moral-trade/schema-registry.test.ts",
  "src/lib/moral-trade/security.test.ts",
  "src/lib/mpgf.test.ts",
  "src/lib/mpgf/public-goods-round-board.test.ts",
  "src/lib/offer-create-similar.test.ts",
  "src/lib/offer-follows.test.ts",
  "src/lib/pledge-swaps.test.ts",
  "src/lib/public-evidence-policy.test.ts",
  "src/lib/public-moral-trade-samples.test.ts",
  "src/lib/public-offers.test.ts",
  "src/lib/public-route-smoke.test.ts",
  "src/live-now-priority-route.test.ts",
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
