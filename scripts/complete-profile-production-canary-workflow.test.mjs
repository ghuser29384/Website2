import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workflowPath = new URL(
  "../.github/workflows/complete-profile-production-canary.yml",
  import.meta.url,
);

async function workflow() {
  return readFile(workflowPath, "utf8");
}

test("the canary verifies live production without deploying", async () => {
  const source = await workflow();

  assert.match(source, /push:\n\s+branches:\n\s+- main/);
  assert.match(source, /schedule:\n\s+- cron: "17 \*\/6 \* \* \*"/);
  assert.match(source, /workflow_dispatch:/);
  assert.doesNotMatch(source, /\bvercel(?:@\$\{?VERCEL_CLI_VERSION\}?)?\s+deploy\b/);
  assert.doesNotMatch(source, /--prod\b/);
});

test("the control revision is distinct from the deployed application revision", async () => {
  const source = await workflow();

  assert.match(source, /CONTROL_SHA: \$\{\{ github\.sha \}\}/);
  assert.match(source, /deployed_sha="\$\(jq -r '\.meta\.githubCommitSha'/);
  assert.match(source, /git merge-base --is-ancestor "\$deployed_sha" "\$CONTROL_SHA"/);
  assert.match(
    source,
    /EXPECTED_SHA: \$\{\{ steps\.deployment\.outputs\.deployed_sha \}\}/,
  );
  assert.doesNotMatch(source, /EXPECTED_SHA: \$\{\{ github\.sha \}\}/);
});

test("exact deployment proof comes from READY production metadata and both aliases", async () => {
  const source = await workflow();

  assert.match(source, /api\.vercel\.com\/v6\/deployments\?/);
  assert.match(source, /api\.vercel\.com\/v13\/deployments\/\$\{deployment_id\}/);
  assert.match(source, /\.target == "production"/);
  assert.match(source, /\(\.readyState \/\/ \.state \/\/ ""\) == "READY"/);
  assert.match(source, /index\(\$apex\) != null/);
  assert.match(source, /index\(\$canonical\) != null/);
  assert.match(source, /\.meta\.githubCommitSha == \$deployed_sha/);
  assert.match(source, /Reconfirm the exact deployment still owns both production aliases/);
});

test("route verification is independent of deployment identity", async () => {
  const source = await workflow();

  assert.match(source, /Spend 100 sparks of attention\./);
  assert.match(source, /x-matched-path: \/complete-profile/);
  assert.match(
    source,
    /\^location: https:\/\/www\\\.moraltrade\\\.org\/complete-profile/,
  );
  assert.doesNotMatch(
    source,
    /grep\s+-Fq\s+["']?\$EXPECTED_DEPLOYMENT_ID["']?\s+["']?\$CANARY_OUTPUT_DIR\/www-returning\.html/,
  );
  assert.doesNotMatch(source, /EXPECTED_DEPLOYMENT_ID.*www-returning\.html/);
});

test("the six rendered scenarios run before a success status is published", async () => {
  const source = await workflow();
  const renderedIndex = source.indexOf(
    "- name: Run the rendered first-time and returning-user canary",
  );
  const reconfirmIndex = source.indexOf(
    "- name: Reconfirm the exact deployment still owns both production aliases",
  );
  const publishIndex = source.indexOf("- name: Publish the canary result");

  assert.notEqual(renderedIndex, -1);
  assert.notEqual(reconfirmIndex, -1);
  assert.notEqual(publishIndex, -1);
  assert.ok(renderedIndex < reconfirmIndex);
  assert.ok(reconfirmIndex < publishIndex);
  assert.match(
    source,
    /Live production deployment passed all six Complete Profile canary scenarios/,
  );
});

test("the canary status is attached to the deployed commit when resolution succeeds", async () => {
  const source = await workflow();

  assert.match(
    source,
    /DEPLOYED_SHA: \$\{\{ steps\.deployment\.outputs\.deployed_sha \}\}/,
  );
  assert.match(source, /statuses\/\$\{DEPLOYED_SHA\}/);
  assert.match(source, /status_sha="\$\{DEPLOYED_SHA:-\$CONTROL_SHA\}"/);
  assert.match(source, /statuses\/\$\{status_sha\}/);
});
