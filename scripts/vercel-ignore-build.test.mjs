import assert from "node:assert/strict";
import test from "node:test";

import {
  CANONICAL_MORAL_TRADE_PROJECT_ID,
  DUPLICATE_WEBSITE2_PROJECT_ID,
  RELEASE_PREVIEW_BRANCH,
} from "./vercel-project-config.mjs";
import {
  evaluateVercelBuildOwnership,
  isIgnorableDeploymentPath,
  isRuntimeDocumentPath,
} from "./vercel-ignore-build.mjs";

function env(overrides = {}) {
  return {
    VERCEL_PROJECT_ID: CANONICAL_MORAL_TRADE_PROJECT_ID,
    VERCEL_GIT_COMMIT_REF: "main",
    VERCEL_ENV: "production",
    VERCEL_GIT_PREVIOUS_SHA: "previous",
    VERCEL_GIT_COMMIT_SHA: "current",
    ...overrides,
  };
}

test("the duplicate website2 project never receives another build", () => {
  const decision = evaluateVercelBuildOwnership(
    env({ VERCEL_PROJECT_ID: DUPLICATE_WEBSITE2_PROJECT_ID }),
    { changedPaths: ["src/app/page.tsx"] },
  );
  assert.equal(decision.ignore, true);
  assert.match(decision.reason, /non-canonical/);
});

test("unapproved feature branches never receive Vercel previews", () => {
  const decision = evaluateVercelBuildOwnership(
    env({
      VERCEL_GIT_COMMIT_REF: "feature/new-interface",
      VERCEL_ENV: "preview",
    }),
    { changedPaths: ["src/app/page.tsx"] },
  );
  assert.equal(decision.ignore, true);
  assert.match(decision.reason, /not an approved release branch/);
});

test("only the designated release branch may create a preview", () => {
  const allowed = evaluateVercelBuildOwnership(
    env({
      VERCEL_GIT_COMMIT_REF: RELEASE_PREVIEW_BRANCH,
      VERCEL_ENV: "preview",
    }),
    { changedPaths: ["src/app/page.tsx"] },
  );
  assert.equal(allowed.ignore, false);

  const mainPreview = evaluateVercelBuildOwnership(
    env({ VERCEL_GIT_COMMIT_REF: "main", VERCEL_ENV: "preview" }),
    { changedPaths: ["src/app/page.tsx"] },
  );
  assert.equal(mainPreview.ignore, true);
});

test("only main may create a production deployment", () => {
  const allowed = evaluateVercelBuildOwnership(env(), {
    changedPaths: ["src/app/page.tsx"],
  });
  assert.equal(allowed.ignore, false);

  const previewBranchProduction = evaluateVercelBuildOwnership(
    env({
      VERCEL_GIT_COMMIT_REF: RELEASE_PREVIEW_BRANCH,
      VERCEL_ENV: "production",
    }),
    { changedPaths: ["src/app/page.tsx"] },
  );
  assert.equal(previewBranchProduction.ignore, true);
});

test("workflow, ordinary documentation, and browser-test-only commits skip", () => {
  const decision = evaluateVercelBuildOwnership(env(), {
    changedPaths: [
      ".github/workflows/qa.yml",
      "docs/operations/release.md",
      "tests/discover.spec.ts",
      "playwright.config.ts",
    ],
  });
  assert.equal(decision.ignore, true);
});

test("runtime-traced MPG/F documentation still requires a build", () => {
  assert.equal(isRuntimeDocumentPath("docs/mpgf/design.md"), true);
  assert.equal(
    isRuntimeDocumentPath(
      "mpgf_pilot_v0_3_codex_build_instruction_latest.md",
    ),
    true,
  );
  assert.equal(isIgnorableDeploymentPath("docs/mpgf/design.md"), false);

  const decision = evaluateVercelBuildOwnership(env(), {
    changedPaths: ["docs/mpgf/design.md"],
  });
  assert.equal(decision.ignore, false);
});

test("application, dependency, database, and public-asset changes build", () => {
  for (const path of [
    "src/app/page.tsx",
    "package-lock.json",
    "supabase/migrations/20260801000000_example.sql",
    "public/moral-trade-discover.js",
  ]) {
    const decision = evaluateVercelBuildOwnership(env(), {
      changedPaths: [path],
    });
    assert.equal(decision.ignore, false, path);
  }
});

test("missing Git comparison data builds conservatively", () => {
  const decision = evaluateVercelBuildOwnership(
    env({
      VERCEL_GIT_PREVIOUS_SHA: "",
      VERCEL_GIT_COMMIT_SHA: "",
    }),
  );
  assert.equal(decision.ignore, false);
  assert.match(decision.reason, /conservatively/);
});

test("an empty effective diff skips", () => {
  const decision = evaluateVercelBuildOwnership(env(), {
    changedPaths: [],
  });
  assert.equal(decision.ignore, true);
});

test("an unidentified local build remains enabled", () => {
  const decision = evaluateVercelBuildOwnership(
    env({ VERCEL_PROJECT_ID: "" }),
    { changedPaths: ["src/app/page.tsx"] },
  );
  assert.equal(decision.ignore, false);
});
