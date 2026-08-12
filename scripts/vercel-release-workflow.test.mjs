import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { verifyStaticArtifactIntegrity } from "./vercel-static-artifact-integrity.mjs";

const workflowPath = new URL(
  "../.github/workflows/vercel-release.yml",
  import.meta.url,
);
const completeProfileCanaryPath = new URL(
  "../.github/workflows/complete-profile-production-canary.yml",
  import.meta.url,
);
const releaseControlsPath = new URL(
  "../.github/workflows/vercel-release-controls.yml",
  import.meta.url,
);

async function workflow() {
  return readFile(workflowPath, "utf8");
}

async function completeProfileCanary() {
  return readFile(completeProfileCanaryPath, "utf8");
}

async function releaseControls() {
  return readFile(releaseControlsPath, "utf8");
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
  const browserIndex = source.indexOf("npm run test:e2e:release -- --reporter=line");
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

test("the prebuilt release starts clean and proves public-asset byte identity before upload", async () => {
  const source = await workflow();
  const buildIndex = source.indexOf(
    "- name: Build a clean Vercel artifact on GitHub Actions compute",
  );
  const integrityIndex = source.indexOf(
    "- name: Prove every prebuilt public asset matches the checked-in source",
  );
  const deployIndex = source.indexOf(
    "- name: Upload the already-built artifact exactly once",
  );

  for (const index of [buildIndex, integrityIndex, deployIndex]) {
    assert.notEqual(index, -1);
  }
  assert.ok(buildIndex < integrityIndex);
  assert.ok(integrityIndex < deployIndex);

  const buildStep = source.slice(buildIndex, integrityIndex);
  const integrityStep = source.slice(integrityIndex, deployIndex);
  assert.match(buildStep, /rm -rf \.next \.vercel\/output/);
  assert.match(
    integrityStep,
    /node scripts\/vercel-static-artifact-integrity\.mjs/,
  );
  assert.match(integrityStep, /STATIC_BUILD_DIR: \.vercel\/output\/static/);
  assert.match(integrityStep, /static-artifact-integrity\.json/);
});

test("production upload performs one production transition and verifies both canonical alias records", async () => {
  const source = await workflow();
  const deployIndex = source.indexOf(
    "- name: Upload the already-built artifact exactly once",
  );
  const guardIndex = source.indexOf("- name: Guard the exact uploaded deployment");
  const canonicalIndex = source.indexOf(
    "- name: Verify both canonical aliases and the published critical asset",
  );
  const evidenceIndex = source.indexOf("- name: Upload immutable release evidence");

  for (const index of [deployIndex, guardIndex, canonicalIndex, evidenceIndex]) {
    assert.notEqual(index, -1);
  }
  assert.ok(deployIndex < guardIndex);
  assert.ok(guardIndex < canonicalIndex);
  assert.ok(canonicalIndex < evidenceIndex);

  const deployStep = source.slice(deployIndex, guardIndex);
  const canonicalStep = source.slice(canonicalIndex, evidenceIndex);
  assert.match(
    deployStep,
    /if \[\[ '\$\{\{ inputs\.target \}\}' == 'production' \]\]; then/,
  );
  assert.equal(
    (deployStep.match(/"vercel@\$VERCEL_CLI_VERSION" deploy/g) ?? []).length,
    2,
  );
  assert.equal((deployStep.match(/--prebuilt/g) ?? []).length, 2);
  assert.equal((deployStep.match(/--prod/g) ?? []).length, 1);
  assert.doesNotMatch(source, /"vercel@\$VERCEL_CLI_VERSION" promote/);
  assert.doesNotMatch(source, /VERCEL_TEAM_SCOPE:/);
  assert.doesNotMatch(source, /vercel-promote\.log/);
  assert.match(
    source,
    /Canonical aliases: assigned by the exact production upload and independently verified/,
  );

  assert.match(
    canonicalStep,
    /for alias_name in "\$CANONICAL_APEX_DOMAIN" "\$CANONICAL_WWW_DOMAIN"; do/,
  );
  assert.match(canonicalStep, /api\.vercel\.com\/v4\/aliases\/\$\{alias_name\}/);
  assert.match(
    canonicalStep,
    /deploymentId \/\/ \.deployment\.id \/\/ \.deployment\.uid/,
  );
  assert.match(
    canonicalStep,
    /api\.vercel\.com\/v13\/deployments\/\$\{EXPECTED_DEPLOYMENT_ID\}/,
  );
  assert.match(canonicalStep, /\(\.target == "production"\)/);
  assert.match(canonicalStep, /\(\(\.aliasError \/\/ null\) == null\)/);
  assert.match(canonicalStep, /cmp --silent "public\/\$RELEASE_CRITICAL_ASSET"/);
});

test("release evidence is retained without credentials", async () => {
  const source = await workflow();
  assert.match(source, /uses: actions\/upload-artifact@v4/);
  assert.match(source, /name: gated-vercel-release-\$\{\{ inputs\.target \}\}-\$\{\{ github\.run_id \}\}/);
  assert.match(source, /path: \$\{\{ env\.RELEASE_EVIDENCE_DIR \}\}/);
  assert.match(source, /retention-days: 30/);
  assert.doesNotMatch(source, /\.env\.production\.local/);
});

test("a dedicated repository gate parses and tests every release-control change", async () => {
  const source = await releaseControls();

  const pullRequestStart = source.indexOf("  pull_request:");
  const pushStart = source.indexOf("  push:");
  const permissionsStart = source.indexOf("permissions:");
  for (const index of [pullRequestStart, pushStart, permissionsStart]) {
    assert.notEqual(index, -1);
  }

  const pullRequestTrigger = source.slice(pullRequestStart, pushStart);
  const pushTrigger = source.slice(pushStart, permissionsStart);
  for (const trigger of [pullRequestTrigger, pushTrigger]) {
    assert.match(trigger, /\.github\/workflows\/vercel-release-controls\.yml/);
    assert.match(trigger, /\.github\/workflows\/vercel-release\.yml/);
    assert.match(trigger, /scripts\/vercel-release-workflow\.test\.mjs/);
    assert.match(trigger, /scripts\/vercel-static-artifact-integrity\.mjs/);
  }
  assert.match(pushTrigger, /branches:\n\s+- main/);
  assert.match(source, /node --check scripts\/vercel-static-artifact-integrity\.mjs/);
  assert.match(source, /node --test scripts\/vercel-release-workflow\.test\.mjs/);
  assert.match(source, /ARGV\.each/);
  assert.match(source, /\.github\/workflows\/vercel-release-controls\.yml/);
  assert.match(source, /\.github\/workflows\/vercel-release\.yml/);
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
  assert.match(browserGate, /npm run test:e2e:release -- --reporter=line/);
  assert.doesNotMatch(browserGate, /https:\/\/www\.moraltrade\.org/);
});

test("the release requires a repository secret rather than embedding credentials", async () => {
  const source = await workflow();
  assert.match(source, /secrets\.VERCEL_TOKEN/);
  assert.doesNotMatch(source, /tok_[A-Za-z0-9_-]+/);
});

test("the static artifact verifier checks the full public tree and records normalized evidence", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "vercel-static-integrity-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const sourceRoot = path.join(root, "public");
  const builtRoot = path.join(root, "output", "static");
  const evidenceDir = path.join(root, "evidence");

  await Promise.all([
    mkdir(path.join(sourceRoot, "nested"), { recursive: true }),
    mkdir(path.join(builtRoot, "nested"), { recursive: true }),
  ]);
  await Promise.all([
    writeFile(path.join(sourceRoot, "moral-trade-live-create-router.js"), "router\n"),
    writeFile(path.join(builtRoot, "moral-trade-live-create-router.js"), "router\n"),
    writeFile(path.join(sourceRoot, "nested", "asset.txt"), "asset\n"),
    writeFile(path.join(builtRoot, "nested", "asset.txt"), "asset\n"),
  ]);

  const result = await verifyStaticArtifactIntegrity({
    sourceRoot,
    builtRoot,
    evidenceDir,
  });

  assert.equal(result.fileCount, 2);
  assert.equal(result.critical.relativePath, "moral-trade-live-create-router.js");
  assert.equal(result.critical.sha256.length, 64);
  assert.deepEqual(
    result.entries.map((entry) => entry.relativePath),
    ["moral-trade-live-create-router.js", path.join("nested", "asset.txt")],
  );
  assert.equal(
    await readFile(path.join(evidenceDir, "public-source.sha256"), "utf8"),
    await readFile(path.join(evidenceDir, "public-prebuilt.sha256"), "utf8"),
  );
  const recorded = JSON.parse(
    await readFile(path.join(evidenceDir, "static-artifact-integrity.json"), "utf8"),
  );
  assert.equal(recorded.fileCount, 2);
});

test("the static artifact verifier fails closed on missing or changed output", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "vercel-static-integrity-fail-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const sourceRoot = path.join(root, "public");
  const builtRoot = path.join(root, "output", "static");

  await Promise.all([
    mkdir(sourceRoot, { recursive: true }),
    mkdir(builtRoot, { recursive: true }),
  ]);
  await Promise.all([
    writeFile(path.join(sourceRoot, "moral-trade-live-create-router.js"), "source\n"),
    writeFile(path.join(builtRoot, "moral-trade-live-create-router.js"), "changed\n"),
  ]);

  await assert.rejects(
    verifyStaticArtifactIntegrity({ sourceRoot, builtRoot }),
    /Prebuilt public asset differs from source/,
  );

  await writeFile(path.join(builtRoot, "moral-trade-live-create-router.js"), "source\n");
  await writeFile(path.join(sourceRoot, "missing.txt"), "missing\n");
  await assert.rejects(
    verifyStaticArtifactIntegrity({ sourceRoot, builtRoot }),
    /Prebuilt artifact is missing public asset missing\.txt/,
  );
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
