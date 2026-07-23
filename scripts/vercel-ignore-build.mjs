#!/usr/bin/env node

const WEBSITE2_PROJECT_ID = "prj_uhfNhPo00nQrcbG0dk2zLWo7UmdK";
const MAIN_BRANCH = "main";

// Keep this list deliberately narrow. `website2` still has unrelated deployment
// responsibilities, so only branches reviewed as Moral Trade-only may skip its
// duplicate Preview build.
const MORAL_TRADE_ONLY_PREVIEW_BRANCHES = new Set([
  "ops/website2-preview-ownership-20260723",
  "launch/verify-and-harden-20260723",
  "fix/home-new-trade-template-route-20260723",
  "feat/smart-query-pipeline",
]);

function deploymentEnvironment(env) {
  return env.VERCEL_TARGET_ENV || env.VERCEL_ENV || "";
}

export function evaluateVercelBuildOwnership(env = process.env) {
  const projectId = env.VERCEL_PROJECT_ID || "";
  const branch = env.VERCEL_GIT_COMMIT_REF || "";
  const environment = deploymentEnvironment(env);

  if (projectId !== WEBSITE2_PROJECT_ID) {
    return {
      ignore: false,
      reason: "This is not the duplicate website2 project.",
    };
  }

  if (environment !== "preview") {
    return {
      ignore: false,
      reason: "website2 production and other non-preview deployments remain enabled.",
    };
  }

  if (!branch || branch === MAIN_BRANCH) {
    return {
      ignore: false,
      reason: "website2 main-branch deployments remain enabled.",
    };
  }

  if (!MORAL_TRADE_ONLY_PREVIEW_BRANCHES.has(branch)) {
    return {
      ignore: false,
      reason: `Branch ${JSON.stringify(branch)} is not on the reviewed Moral Trade-only allowlist.`,
    };
  }

  return {
    ignore: true,
    reason: `Skipping duplicate website2 Preview build for reviewed Moral Trade-only branch ${JSON.stringify(branch)}.`,
  };
}

const decision = evaluateVercelBuildOwnership();
console.log(`[vercel-build-ownership] ${decision.reason}`);

// Vercel's Ignored Build Step contract is inverted: exit 0 skips the build,
// while exit 1 continues it.
process.exit(decision.ignore ? 0 : 1);
