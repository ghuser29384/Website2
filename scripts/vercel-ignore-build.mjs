#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  CANONICAL_MORAL_TRADE_PROJECT_ID,
  RELEASE_PREVIEW_BRANCH,
} from "./vercel-project-config.mjs";

const MAIN_BRANCH = "main";
const ALLOWED_RELEASE_BRANCHES = new Set([
  MAIN_BRANCH,
  RELEASE_PREVIEW_BRANCH,
]);

// These files are operational, documentary, or test-only. A commit containing
// only these paths has already been checked by GitHub Actions and does not need
// another paid application build on Vercel.
const IGNORABLE_PREFIXES = [
  ".github/",
  "docs/",
  "test-results/",
  "tests/",
  "playwright-report/",
];
const IGNORABLE_EXACT_PATHS = new Set([
  ".editorconfig",
  ".gitignore",
  "CODE_OF_CONDUCT.md",
  "CONTRIBUTING.md",
  "LICENSE",
  "README.md",
  "playwright.config.ts",
]);

// Some documentation-looking files are packaged into deployed MPG/F routes and
// therefore remain application inputs. They must never be treated as docs-only.
const RUNTIME_DOCUMENT_PREFIXES = ["docs/mpgf/"];
const RUNTIME_DOCUMENT_EXACT_PATHS = new Set([
  "mpgf_pilot_v0_3_codex_build_instruction_latest.md",
]);

function normalizedPath(value) {
  return String(value ?? "")
    .replaceAll("\\", "/")
    .replace(/^\.\//, "")
    .trim();
}

export function isRuntimeDocumentPath(value) {
  const path = normalizedPath(value);
  return (
    RUNTIME_DOCUMENT_EXACT_PATHS.has(path) ||
    RUNTIME_DOCUMENT_PREFIXES.some((prefix) => path.startsWith(prefix))
  );
}

export function isIgnorableDeploymentPath(value) {
  const path = normalizedPath(value);
  if (!path || isRuntimeDocumentPath(path)) return false;
  if (IGNORABLE_EXACT_PATHS.has(path)) return true;
  if (IGNORABLE_PREFIXES.some((prefix) => path.startsWith(prefix))) return true;
  return /(?:^|\/)(?:README|CHANGELOG|SECURITY)(?:\.[^/]+)?$/i.test(path);
}

function changedPathsFromGit(env = process.env) {
  const previousSha = env.VERCEL_GIT_PREVIOUS_SHA?.trim();
  const currentSha = env.VERCEL_GIT_COMMIT_SHA?.trim() || "HEAD";
  if (!previousSha || /^0+$/.test(previousSha)) return null;

  try {
    const output = execFileSync(
      "git",
      ["diff", "--name-only", "--no-renames", previousSha, currentSha],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    return output
      .split(/\r?\n/)
      .map(normalizedPath)
      .filter(Boolean);
  } catch {
    return null;
  }
}

function deploymentEnvironment(env) {
  return env.VERCEL_TARGET_ENV || env.VERCEL_ENV || "";
}

export function evaluateVercelBuildOwnership(
  env = process.env,
  { changedPaths } = {},
) {
  const projectId = env.VERCEL_PROJECT_ID || "";
  const branch = env.VERCEL_GIT_COMMIT_REF || "";
  const environment = deploymentEnvironment(env);

  if (!projectId) {
    return {
      ignore: false,
      reason: "No Vercel project is identified; build conservatively.",
    };
  }

  if (projectId !== CANONICAL_MORAL_TRADE_PROJECT_ID) {
    return {
      ignore: true,
      reason: `Skipping non-canonical Vercel project ${JSON.stringify(projectId)}.`,
    };
  }

  if (!ALLOWED_RELEASE_BRANCHES.has(branch)) {
    return {
      ignore: true,
      reason: `Branch ${JSON.stringify(branch)} is not an approved release branch.`,
    };
  }

  if (environment === "production" && branch !== MAIN_BRANCH) {
    return {
      ignore: true,
      reason: "Only main may create a production deployment.",
    };
  }

  if (environment === "preview" && branch !== RELEASE_PREVIEW_BRANCH) {
    return {
      ignore: true,
      reason: `Only ${JSON.stringify(RELEASE_PREVIEW_BRANCH)} may create a release preview.`,
    };
  }

  const paths = Array.isArray(changedPaths)
    ? changedPaths.map(normalizedPath).filter(Boolean)
    : changedPathsFromGit(env);

  if (paths === null) {
    return {
      ignore: false,
      reason: "The changed-file range is unavailable; build conservatively.",
    };
  }

  if (paths.length === 0) {
    return {
      ignore: true,
      reason: "The candidate contains no effective file changes.",
    };
  }

  const deploymentInputs = paths.filter(
    (path) => !isIgnorableDeploymentPath(path),
  );
  if (deploymentInputs.length === 0) {
    return {
      ignore: true,
      reason: `All ${paths.length} changed paths are workflow, documentation, or test-only.`,
    };
  }

  return {
    ignore: false,
    reason: `Build required for ${deploymentInputs.length} deployment input${deploymentInputs.length === 1 ? "" : "s"}.`,
  };
}

function isDirectExecution() {
  return process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
}

if (isDirectExecution()) {
  const decision = evaluateVercelBuildOwnership();
  console.log(`[vercel-build-ownership] ${decision.reason}`);

  // Vercel's Ignored Build Step contract is inverted: exit 0 skips the build,
  // while exit 1 continues it.
  process.exit(decision.ignore ? 0 : 1);
}
