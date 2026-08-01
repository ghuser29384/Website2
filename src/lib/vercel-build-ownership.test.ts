import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";

const SCRIPT_PATH = path.resolve(process.cwd(), "scripts/vercel-ignore-build.mjs");
const WEBSITE2_PROJECT_ID = "prj_uhfNhPo00nQrcbG0dk2zLWo7UmdK";
const MORALTRADE_PROJECT_ID = "prj_Em3j7Uj7RatX2R1ZYhla3XSHRde7";
const RELEASE_PREVIEW_BRANCH = "release/vercel-preview";

const CONTROLLED_ENV_KEYS = [
  "VERCEL_PROJECT_ID",
  "VERCEL_ENV",
  "VERCEL_TARGET_ENV",
  "VERCEL_GIT_COMMIT_REF",
  "VERCEL_GIT_PREVIOUS_SHA",
  "VERCEL_GIT_COMMIT_SHA",
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

test("skips every Preview build on the non-canonical website2 project", () => {
  const result = runOwnershipCheck({
    VERCEL_PROJECT_ID: WEBSITE2_PROJECT_ID,
    VERCEL_ENV: "preview",
    VERCEL_GIT_COMMIT_REF: RELEASE_PREVIEW_BRANCH,
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Skipping non-canonical Vercel project/);
});

test("skips every production build on the non-canonical website2 project", () => {
  const result = runOwnershipCheck({
    VERCEL_PROJECT_ID: WEBSITE2_PROJECT_ID,
    VERCEL_ENV: "production",
    VERCEL_GIT_COMMIT_REF: "main",
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Skipping non-canonical Vercel project/);
});

test("keeps the canonical designated release Preview build", () => {
  const result = runOwnershipCheck({
    VERCEL_PROJECT_ID: MORALTRADE_PROJECT_ID,
    VERCEL_ENV: "preview",
    VERCEL_GIT_COMMIT_REF: RELEASE_PREVIEW_BRANCH,
  });

  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.match(result.stdout, /changed-file range is unavailable; build conservatively/i);
});

test("keeps the canonical main production build", () => {
  const result = runOwnershipCheck({
    VERCEL_PROJECT_ID: MORALTRADE_PROJECT_ID,
    VERCEL_ENV: "production",
    VERCEL_GIT_COMMIT_REF: "main",
  });

  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.match(result.stdout, /changed-file range is unavailable; build conservatively/i);
});

test("skips ordinary feature-branch Previews on the canonical project", () => {
  const result = runOwnershipCheck({
    VERCEL_PROJECT_ID: MORALTRADE_PROJECT_ID,
    VERCEL_ENV: "preview",
    VERCEL_GIT_COMMIT_REF: "feature/unrelated-domain-change",
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /not an approved release branch/);
});

test("skips main-branch Previews because only the designated release branch may preview", () => {
  const result = runOwnershipCheck({
    VERCEL_PROJECT_ID: MORALTRADE_PROJECT_ID,
    VERCEL_TARGET_ENV: "preview",
    VERCEL_GIT_COMMIT_REF: "main",
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Only "release\/vercel-preview" may create a release preview/);
});

test("fails open when Vercel build metadata is absent", () => {
  const result = runOwnershipCheck({});

  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.match(result.stdout, /No Vercel project is identified; build conservatively/);
});
