import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";

const SCRIPT_PATH = path.resolve(process.cwd(), "scripts/vercel-ignore-build.mjs");
const WEBSITE2_PROJECT_ID = "prj_uhfNhPo00nQrcbG0dk2zLWo7UmdK";
const MORALTRADE_PROJECT_ID = "prj_Em3j7Uj7RatX2R1ZYhla3XSHRde7";
const LAUNCH_BRANCH = "launch/verify-and-harden-20260723";

const CONTROLLED_ENV_KEYS = [
  "VERCEL_PROJECT_ID",
  "VERCEL_ENV",
  "VERCEL_TARGET_ENV",
  "VERCEL_GIT_COMMIT_REF",
] as const;

function runOwnershipCheck(
  overrides: Partial<Record<(typeof CONTROLLED_ENV_KEYS)[number], string>>,
) {
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const key of CONTROLLED_ENV_KEYS) delete env[key];
  Object.assign(env, overrides);

  return spawnSync(process.execPath, [SCRIPT_PATH], {
    cwd: process.cwd(),
    encoding: "utf8",
    env,
  });
}

test("skips an allowlisted Moral Trade-only Preview build on website2", () => {
  const result = runOwnershipCheck({
    VERCEL_PROJECT_ID: WEBSITE2_PROJECT_ID,
    VERCEL_ENV: "preview",
    VERCEL_GIT_COMMIT_REF: LAUNCH_BRANCH,
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Skipping duplicate website2 Preview build/);
});

test("keeps the authoritative moraltrade-site Preview build", () => {
  const result = runOwnershipCheck({
    VERCEL_PROJECT_ID: MORALTRADE_PROJECT_ID,
    VERCEL_ENV: "preview",
    VERCEL_GIT_COMMIT_REF: LAUNCH_BRANCH,
  });

  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.match(result.stdout, /not the duplicate website2 project/);
});

test("keeps website2 production builds", () => {
  const result = runOwnershipCheck({
    VERCEL_PROJECT_ID: WEBSITE2_PROJECT_ID,
    VERCEL_ENV: "production",
    VERCEL_GIT_COMMIT_REF: "main",
  });

  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.match(result.stdout, /production and other non-preview deployments remain enabled/);
});

test("keeps website2 main-branch Preview deployments", () => {
  const result = runOwnershipCheck({
    VERCEL_PROJECT_ID: WEBSITE2_PROJECT_ID,
    VERCEL_TARGET_ENV: "preview",
    VERCEL_GIT_COMMIT_REF: "main",
  });

  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.match(result.stdout, /main-branch deployments remain enabled/);
});

test("keeps unreviewed website2 Preview branches", () => {
  const result = runOwnershipCheck({
    VERCEL_PROJECT_ID: WEBSITE2_PROJECT_ID,
    VERCEL_ENV: "preview",
    VERCEL_GIT_COMMIT_REF: "feature/unrelated-domain-change",
  });

  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.match(result.stdout, /not on the reviewed Moral Trade-only allowlist/);
});

test("fails open when Vercel build metadata is absent", () => {
  const result = runOwnershipCheck({});

  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.match(result.stdout, /not the duplicate website2 project/);
});
