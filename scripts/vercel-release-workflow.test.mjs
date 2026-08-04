import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workflowPath = new URL(
  "../.github/workflows/vercel-release.yml",
  import.meta.url,
);
const completeProfileCanaryPath = new URL(
  "../.github/workflows/complete-profile-production-canary.yml",
  import.meta.url,
);

async function workflow() {
  return readFile(workflowPath, "utf8");
}

async function completeProfileCanary() {
  return readFile(completeProfileCanaryPath, "utf8");
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

test("the Complete Profile canary monitors the live deployment rather than every main commit", async () => {
  const source = await completeProfileCanary();

  assert.match(source, /schedule:/);
  assert.match(source, /workflow_dispatch:/);
  assert.doesNotMatch(source, /^\s{2}push:/m);
  assert.match(source, /REQUESTED_SHA: \$\{\{ inputs\.expected_sha \}\}/);
  assert.match(source, /select\(\(\$sha == ""\) or \(\.meta\.githubCommitSha == \$sha\)\)/);
  assert.match(source, /ref: \$\{\{ steps\.deployment\.outputs\.expected_sha \}\}/);
  assert.match(source, /test "\$\(git rev-parse HEAD\)" = "\$EXPECTED_SHA"/);
});

test("the Complete Profile canary binds custom domains through Vercel aliases, not page HTML", async () => {
  const source = await completeProfileCanary();

  assert.match(source, /api\.vercel\.com\/v13\/deployments\/\$\{EXPECTED_DEPLOYMENT_ID\}/);
  assert.match(source, /--arg alias 'moraltrade\.org'/);
  assert.match(source, /--arg alias 'www\.moraltrade\.org'/);
  assert.match(source, /\(\.alias \/\/ \[\]\) \| index\(\$alias\) != null/);
  assert.doesNotMatch(
    source,
    /grep -Fq "\$EXPECTED_DEPLOYMENT_ID" "\$CANARY_OUTPUT_DIR\/www-returning\.html"/,
  );
  assert.match(source, /grep -Fq 'Spend 100 sparks of attention\.'/);
  assert.match(source, /grep -Fqx 'x-matched-path: \/complete-profile'/);
  assert.match(source, /\[\[ "\$apex_status" == '308' \]\]/);
});

test("the Complete Profile canary runs the permanent browser script only after exact alias verification", async () => {
  const source = await completeProfileCanary();
  const domainIndex = source.indexOf(
    "- name: Verify the exact deployment through both production domains",
  );
  const browserIndex = source.indexOf(
    "- name: Run the rendered first-time and returning-user canary",
  );

  assert.notEqual(domainIndex, -1);
  assert.notEqual(browserIndex, -1);
  assert.ok(domainIndex < browserIndex);
  assert.match(
    source.slice(browserIndex),
    /node \.github\/scripts\/complete-profile-production-canary\.mjs/,
  );
  assert.match(
    source,
    /Exact live production deployment passed all six Complete Profile canary scenarios/,
  );
});
