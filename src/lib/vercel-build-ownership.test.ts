import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const SCRIPT_PATH = path.resolve(process.cwd(), "scripts/vercel-ignore-build.mjs");
const POLICY_WORKFLOW_PATH = path.resolve(
  process.cwd(),
  ".github/workflows/vercel-build-ownership-policy.yml",
);
const POLICY_WORKFLOW_SOURCE = readFileSync(POLICY_WORKFLOW_PATH, "utf8");
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

test("skips every build on the non-canonical website2 project", () => {
  const result = runOwnershipCheck({
    VERCEL_PROJECT_ID: WEBSITE2_PROJECT_ID,
    VERCEL_ENV: "preview",
    VERCEL_GIT_COMMIT_REF: RELEASE_PREVIEW_BRANCH,
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Skipping non-canonical Vercel project/);
});

test("keeps the canonical release Preview build when the changed range is unavailable", () => {
  const result = runOwnershipCheck({
    VERCEL_PROJECT_ID: MORALTRADE_PROJECT_ID,
    VERCEL_ENV: "preview",
    VERCEL_GIT_COMMIT_REF: RELEASE_PREVIEW_BRANCH,
  });

  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.match(result.stdout, /changed-file range is unavailable; build conservatively/);
});

test("keeps canonical main production builds when the changed range is unavailable", () => {
  const result = runOwnershipCheck({
    VERCEL_PROJECT_ID: MORALTRADE_PROJECT_ID,
    VERCEL_ENV: "production",
    VERCEL_GIT_COMMIT_REF: "main",
  });

  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.match(result.stdout, /changed-file range is unavailable; build conservatively/);
});

test("skips canonical main-branch Preview deployments", () => {
  const result = runOwnershipCheck({
    VERCEL_PROJECT_ID: MORALTRADE_PROJECT_ID,
    VERCEL_TARGET_ENV: "preview",
    VERCEL_GIT_COMMIT_REF: "main",
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Only "release\/vercel-preview" may create a release preview/);
});

test("skips unapproved canonical Preview branches", () => {
  const result = runOwnershipCheck({
    VERCEL_PROJECT_ID: MORALTRADE_PROJECT_ID,
    VERCEL_ENV: "preview",
    VERCEL_GIT_COMMIT_REF: "feature/unrelated-domain-change",
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /is not an approved release branch/);
});

test("fails open when Vercel build metadata is absent", () => {
  const result = runOwnershipCheck({});

  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.match(result.stdout, /No Vercel project is identified; build conservatively/);
});

test("ownership CI applies repository-only scope checks conditionally", () => {
  assert.match(
    POLICY_WORKFLOW_SOURCE,
    /scripts\/vercel-project-config\.mjs/,
    "runtime-affecting Vercel project configuration changes must trigger the policy workflow",
  );
  assert.match(
    POLICY_WORKFLOW_SOURCE,
    /repository_only_change=true/,
    "the workflow must classify repository-only maintenance explicitly",
  );
  assert.match(
    POLICY_WORKFLOW_SOURCE,
    /Runtime-affecting or mixed ownership\/configuration change detected; the repository-only path restriction is not applicable\./,
    "runtime-affecting PRs must not be rejected merely because they contain application changes",
  );
  assert.doesNotMatch(
    POLICY_WORKFLOW_SOURCE,
    /test "\$changed" = "\$expected"/,
    "the previous unconditional two-file exact-diff assertion must not return",
  );
});
