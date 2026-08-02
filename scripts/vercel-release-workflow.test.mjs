import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workflowPath = new URL(
  "../.github/workflows/vercel-release.yml",
  import.meta.url,
);

async function workflow() {
  return readFile(workflowPath, "utf8");
}

test("Vercel releases are manual and never run on ordinary pushes or pull requests", async () => {
  const source = await workflow();
  assert.match(source, /on:\n\s+workflow_dispatch:/);
  assert.doesNotMatch(source, /^\s{2}(?:push|pull_request):/m);
  assert.match(source, /cancel-in-progress: false/);
});

test("only main and the designated release-preview branch can deploy", async () => {
  const source = await workflow();
  assert.match(source, /RELEASE_PREVIEW_BRANCH: release\/vercel-preview/);
  assert.match(source, /test "\$\{\{ inputs\.ref \}\}" = 'main'/);
  assert.match(source, /test "\$\{\{ inputs\.ref \}\}" = "\$RELEASE_PREVIEW_BRANCH"/);
  assert.match(source, /test "\$remote_sha" = "\$\{\{ inputs\.expected_sha \}\}"/);
});

test("the workflow targets only the canonical project", async () => {
  const source = await workflow();
  assert.match(source, /VERCEL_PROJECT_ID: prj_Em3j7Uj7RatX2R1ZYhla3XSHRde7/);
  assert.doesNotMatch(source, /prj_uhfNhPo00nQrcbG0dk2zLWo7UmdK/);
});

test("deployment requires immutable exact-head validation evidence", async () => {
  const source = await workflow();
  assert.match(source, /validation_runs:/);
  assert.match(source, /actions: read/);
  assert.match(source, /checks: read/);
  assert.match(source, /statuses: read/);

  const validationIndex = source.indexOf(
    "- name: Require successful exact-head validation runs",
  );
  const buildIndex = source.indexOf(
    "- name: Build the Vercel artifact on GitHub Actions compute",
  );
  const deployIndex = source.indexOf(
    "- name: Upload the already-built artifact exactly once",
  );

  assert.notEqual(validationIndex, -1);
  assert.ok(validationIndex < buildIndex);
  assert.ok(validationIndex < deployIndex);

  const validation = source.slice(
    validationIndex,
    source.indexOf("- name: Upload exact-head validation evidence", validationIndex),
  );
  assert.match(validation, /actions\/runs\/\$run_id/);
  assert.match(validation, /actual_head_repository/);
  assert.match(validation, /actual_sha/);
  assert.match(validation, /actual_workflow/);
  assert.match(validation, /actual_conclusion/);
  assert.match(validation, /test "\$actual_sha" = "\$EXPECTED_SHA"/);
  assert.match(validation, /test "\$actual_conclusion" = 'success'/);
  assert.match(
    validation,
    /pull_request\|pull_request_target\|push\|workflow_dispatch/,
  );
  assert.match(
    validation,
    /\["classification", "engineering", "rendered"\] - \[\.\[\]\.gate\]/,
  );
  assert.match(validation, /\[\.\[\]\.id\] \| unique/);
  assert.match(
    validation,
    /printf '%s' "\$VALIDATION_RUNS" > "\$requirements_file"/,
  );
  assert.match(
    validation,
    /' "\$requirements_file" > \/dev\/null/,
  );
  assert.doesNotMatch(
    validation,
    /jq -e[\s\S]*> "\$requirements_file"\n\s*\n\s*: > "\$readback_file"/,
  );
});

test("quality gates and exact validation complete before an immutable prebuilt deployment", async () => {
  const source = await workflow();
  const validationIndex = source.indexOf(
    "- name: Require successful exact-head validation runs",
  );
  const testIndex = source.indexOf("npm test");
  const lintIndex = source.indexOf("npm run lint -- --quiet");
  const typeIndex = source.indexOf("npx tsc --noEmit");
  const appBuildIndex = source.indexOf("npm run build");
  const vercelBuildIndex = source.indexOf('"vercel@$VERCEL_CLI_VERSION" build');
  const deployIndex = source.indexOf('"vercel@$VERCEL_CLI_VERSION" deploy');

  for (const index of [
    validationIndex,
    testIndex,
    lintIndex,
    typeIndex,
    appBuildIndex,
    vercelBuildIndex,
    deployIndex,
  ]) {
    assert.notEqual(index, -1);
  }
  assert.ok(validationIndex < deployIndex);
  assert.ok(testIndex < deployIndex);
  assert.ok(lintIndex < deployIndex);
  assert.ok(typeIndex < deployIndex);
  assert.ok(appBuildIndex < deployIndex);
  assert.ok(vercelBuildIndex < deployIndex);
  assert.match(source, /--prebuilt/);
});

test("the generic release job does not rerun the environment-dependent full Playwright suite", async () => {
  const source = await workflow();
  assert.doesNotMatch(source, /npm run test:e2e -- --reporter=line/);
  assert.doesNotMatch(source, /npx playwright install/);
  assert.match(source, /gate: \$gate/);
  assert.match(source, /workflow: \$workflow/);
  assert.match(source, /headSha: \$sha/);
});

test("validation evidence is retained independently of the deployment artifact", async () => {
  const source = await workflow();
  assert.match(source, /actions\/upload-artifact@v4/);
  assert.match(source, /gated-vercel-validation-\$\{\{ github\.run_id \}\}/);
  assert.match(source, /retention-days: 30/);
  assert.match(source, /if-no-files-found: error/);
});

test("the release requires repository secrets rather than embedding credentials", async () => {
  const source = await workflow();
  assert.match(source, /secrets\.VERCEL_TOKEN/);
  assert.doesNotMatch(source, /tok_[A-Za-z0-9_-]+/);
  assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY/);
});
