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
  assert.match(
    source,
    /test "\$\{\{ inputs\.ref \}\}" = "\$RELEASE_PREVIEW_BRANCH"/,
  );
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

test("preview browser failures are adjudicated against the exact merge base while production stays absolute", async () => {
  const source = await workflow();
  assert.match(source, /rendered_base_sha:/);
  assert.match(source, /test -z "\$RENDERED_BASE_SHA"/);
  assert.match(source, /merge_base="\$\(git merge-base origin\/main HEAD\)"/);
  assert.match(source, /test "\$RENDERED_BASE_SHA" = "\$merge_base"/);
  assert.match(source, /git worktree add --detach "\$base_dir" "\$RENDERED_BASE_SHA"/);
  assert.match(source, /candidate-only-regressions/);
  assert.match(source, /--repeat-each=5/);
  assert.match(source, /if \[\[ "\$RELEASE_TARGET" == 'production' \]\]; then\n\s+npm run test:e2e -- --reporter=line/);
});

test("the release requires a repository secret rather than embedding credentials", async () => {
  const source = await workflow();
  assert.match(source, /secrets\.VERCEL_TOKEN/);
  assert.doesNotMatch(source, /tok_[A-Za-z0-9_-]+/);
});

test("the Complete Profile canary runs after control changes without treating them as deployments", async () => {
  const source = await completeProfileCanary();
  const pushStart = source.indexOf("  push:");
  const scheduleStart = source.indexOf("  schedule:");

  assert.notEqual(pushStart, -1);
  assert.notEqual(scheduleStart, -1);
  const pushTrigger = source.slice(pushStart, scheduleStart);
  assert.match(pushTrigger, /branches:\n\s+- main/);
  assert.match(pushTrigger, /paths:/);
  assert.match(pushTrigger, /complete-profile-canary-diagnostics\.mjs/);
  assert.match(pushTrigger, /complete-profile-production-canary\.mjs/);
  assert.match(pushTrigger, /complete-profile-production-canary\.yml/);
  assert.doesNotMatch(pushTrigger, /src\//);
  assert.doesNotMatch(pushTrigger, /supabase\//);
  assert.match(source, /schedule:/);
  assert.match(source, /workflow_dispatch:/);
});

test("the Complete Profile canary keeps monitor control separate from the deployed app revision", async () => {
  const source = await completeProfileCanary();

  assert.match(source, /CONTROL_SHA: \$\{\{ github\.sha \}\}/);
  assert.match(source, /ref: \$\{\{ env\.CONTROL_SHA \}\}/);
  assert.match(source, /test "\$\(git rev-parse HEAD\)" = "\$CONTROL_SHA"/);
  assert.match(source, /git merge-base --is-ancestor "\$expected_sha" "\$CONTROL_SHA"/);
  assert.doesNotMatch(source, /ref: \$\{\{ steps\.deployment\.outputs\.expected_sha \}\}/);
  assert.match(source, /run: node \.github\/scripts\/complete-profile-production-canary\.mjs/);
});

test("the Complete Profile canary proves current ownership from both alias records", async () => {
  const source = await completeProfileCanary();

  assert.match(source, /for alias_name in moraltrade\.org www\.moraltrade\.org; do/);
  assert.match(source, /api\.vercel\.com\/v4\/aliases\/\$\{alias_name\}/);
  assert.match(
    source,
    /deploymentId \/\/ \.deployment\.id \/\/ \.deployment\.uid \/\/ empty/,
  );
  assert.match(source, /resolved_project.*projectId \/\/ empty/);
  assert.match(
    source,
    /\[\[ "\$apex_deployment_id" != "\$canonical_deployment_id" \]\]/,
  );
  assert.match(source, /api\.vercel\.com\/v13\/deployments\/\$\{deployment_id\}/);
  assert.match(source, /\(\.target == "production"\)/);
  assert.match(source, /\(\(\.readyState \/\/ \.state \/\/ ""\) == "READY"\)/);
  assert.match(source, /\(\(\.aliasError \/\/ null\) == null\)/);
  assert.doesNotMatch(source, /api\.vercel\.com\/v6\/deployments\?/);
  assert.doesNotMatch(
    source,
    /grep -Fq "\$EXPECTED_DEPLOYMENT_ID" "\$CANARY_OUTPUT_DIR\/www-returning\.html"/,
  );
});

test("route behavior remains an independent canary gate", async () => {
  const source = await completeProfileCanary();

  assert.match(source, /grep -Fq 'Spend 100 sparks of attention\.'/);
  assert.match(source, /grep -Fqx 'x-matched-path: \/complete-profile'/);
  assert.match(source, /\[\[ "\$apex_status" == '308' \]\]/);
  assert.match(
    source,
    /\^location: https:\/\/www\\\.moraltrade\\\.org\/complete-profile/,
  );
});

test("the rendered canary runs between current-alias checks", async () => {
  const source = await completeProfileCanary();
  const preBrowserIndex = source.indexOf(
    "- name: Verify current alias ownership and both production routes",
  );
  const browserIndex = source.indexOf(
    "- name: Run the rendered first-time and returning-user canary",
  );
  const postBrowserIndex = source.indexOf(
    "- name: Reconfirm current alias ownership after the rendered canary",
  );
  const publishIndex = source.indexOf("- name: Publish the canary result");

  for (const index of [
    preBrowserIndex,
    browserIndex,
    postBrowserIndex,
    publishIndex,
  ]) {
    assert.notEqual(index, -1);
  }
  assert.ok(preBrowserIndex < browserIndex);
  assert.ok(browserIndex < postBrowserIndex);
  assert.ok(postBrowserIndex < publishIndex);

  const postBrowserSource = source.slice(postBrowserIndex, publishIndex);
  assert.match(postBrowserSource, /api\.vercel\.com\/v4\/aliases\/\$\{alias_name\}/);
  assert.match(
    postBrowserSource,
    /api\.vercel\.com\/v13\/deployments\/\$\{EXPECTED_DEPLOYMENT_ID\}/,
  );
  assert.match(
    source,
    /Exact live production deployment passed all six Complete Profile canary scenarios/,
  );
});

test("the canary reports the narrowly expected first-time navigation cancellation", async () => {
  const source = await completeProfileCanary();

  assert.match(source, /Expected first-time navigation cancellations/);
  assert.match(source, /expectedNavigationAbortCount/);
});

test("pull-request checks cannot cancel a production monitor", async () => {
  const source = await completeProfileCanary();

  assert.match(
    source,
    /group: complete-profile-production-canary-\$\{\{ github\.event_name == 'pull_request' && github\.event\.pull_request\.number \|\| 'production' \}\}/,
  );
});
