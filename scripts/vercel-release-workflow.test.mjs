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

test("a successful trusted rendered QA run for the exact SHA is mandatory", async () => {
  const source = await workflow();
  assert.match(source, /rendered_verification_run_id:\n\s+description:[^\n]+\n\s+required: true/);
  assert.match(source, /actions: read/);
  assert.match(source, /TRUSTED_RENDERED_WORKFLOW_ID: '324968062'/);
  assert.match(source, /actions\/runs\/\$RENDERED_VERIFICATION_RUN_ID/);
  assert.match(source, /'\.workflow_id'/);
  assert.match(source, /'\.head_sha'/);
  assert.match(source, /'\.conclusion'/);
  assert.match(source, /\.name == "rendered-smoke"/);
  assert.doesNotMatch(source, /npm run test:e2e/);

  const evidenceIndex = source.indexOf("- name: Verify exact trusted rendered QA evidence");
  const deployIndex = source.indexOf('"vercel@$VERCEL_CLI_VERSION" deploy');
  assert.notEqual(evidenceIndex, -1);
  assert.notEqual(deployIndex, -1);
  assert.ok(evidenceIndex < deployIndex);
});

test("quality gates complete before an immutable prebuilt deployment", async () => {
  const source = await workflow();
  const testIndex = source.indexOf("npm test");
  const lintIndex = source.indexOf("npm run lint -- --quiet");
  const typeIndex = source.indexOf("npx tsc --noEmit");
  const appBuildIndex = source.indexOf("npm run build");
  const vercelBuildIndex = source.indexOf('"vercel@$VERCEL_CLI_VERSION" build');
  const deployIndex = source.indexOf('"vercel@$VERCEL_CLI_VERSION" deploy');

  for (const index of [
    testIndex,
    lintIndex,
    typeIndex,
    appBuildIndex,
    vercelBuildIndex,
    deployIndex,
  ]) {
    assert.notEqual(index, -1);
  }
  assert.ok(testIndex < deployIndex);
  assert.ok(lintIndex < deployIndex);
  assert.ok(typeIndex < deployIndex);
  assert.ok(appBuildIndex < deployIndex);
  assert.ok(vercelBuildIndex < deployIndex);
  assert.match(source, /--prebuilt/);
});

test("the uploaded deployment receives a read-only canonical route smoke", async () => {
  const source = await workflow();
  const deployIndex = source.indexOf("- name: Upload the already-built artifact exactly once");
  const smokeIndex = source.indexOf("- name: Run read-only canonical route smoke against the deployment");
  const evidenceIndex = source.indexOf("- name: Upload immutable release smoke evidence");
  assert.notEqual(deployIndex, -1);
  assert.notEqual(smokeIndex, -1);
  assert.notEqual(evidenceIndex, -1);
  assert.ok(deployIndex < smokeIndex);
  assert.ok(smokeIndex < evidenceIndex);
  assert.match(source, /smoke_route '\/' root/);
  assert.match(source, /smoke_route '\/create\?structure=conditional-donation' create/);
  assert.match(source, /smoke_route '\/donation-upgrades' donation-upgrades/);
  assert.match(
    source,
    /DEPLOYMENT_DISABLED\|Application error\|Internal Server Error\|FUNCTION_INVOCATION_FAILED/,
  );
  assert.match(source, /sha256sum "\$body"/);
});

test("the release requires repository credentials without embedding them", async () => {
  const source = await workflow();
  assert.match(source, /secrets\.VERCEL_TOKEN/);
  assert.match(source, /github\.token/);
  assert.doesNotMatch(source, /tok_[A-Za-z0-9_-]+/);
});
