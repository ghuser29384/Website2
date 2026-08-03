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

test("quality gates complete before an immutable prebuilt deployment", async () => {
  const source = await workflow();
  const testIndex = source.indexOf("npm test");
  const lintIndex = source.indexOf("npm run lint -- --quiet");
  const typeIndex = source.indexOf("npx tsc --noEmit");
  const appBuildIndex = source.indexOf("npm run build");
  const browserIndex = source.indexOf("npm run test:e2e -- --reporter=line");
  const vercelBuildIndex = source.indexOf('"vercel@$VERCEL_CLI_VERSION" build');
  const deployIndex = source.indexOf('"vercel@$VERCEL_CLI_VERSION" deploy');

  for (const index of [
    testIndex,
    lintIndex,
    typeIndex,
    appBuildIndex,
    browserIndex,
    vercelBuildIndex,
    deployIndex,
  ]) {
    assert.notEqual(index, -1);
  }
  assert.ok(testIndex < deployIndex);
  assert.ok(lintIndex < deployIndex);
  assert.ok(typeIndex < deployIndex);
  assert.ok(appBuildIndex < deployIndex);
  assert.ok(browserIndex < deployIndex);
  assert.ok(vercelBuildIndex < deployIndex);
  assert.match(source, /--prebuilt/);
});

test("the rendered release gate binds the app to Playwright's local canonical origin", async () => {
  const source = await workflow();
  const start = source.indexOf("- name: Run complete rendered browser gate");
  const end = source.indexOf("- name: Link only the canonical Vercel project", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const browserGate = source.slice(start, end);

  assert.match(browserGate, /NEXT_PUBLIC_SITE_URL: http:\/\/127\.0\.0\.1:3210/);
  assert.match(browserGate, /SITE_URL: http:\/\/127\.0\.0\.1:3210/);
  assert.match(browserGate, /PLAYWRIGHT_HTML_OPEN: never/);
  assert.match(browserGate, /npm run test:e2e -- --reporter=line/);
  assert.doesNotMatch(browserGate, /https:\/\/www\.moraltrade\.org/);
});

test("the release requires a repository secret rather than embedding credentials", async () => {
  const source = await workflow();
  assert.match(source, /secrets\.VERCEL_TOKEN/);
  assert.doesNotMatch(source, /tok_[A-Za-z0-9_-]+/);
});