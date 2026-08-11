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

test("the prebuilt Vercel artifact is rebuilt from clean output directories", async () => {
  const source = await workflow();
  const pullIndex = source.indexOf("- name: Pull exact deployment environment");
  const cleanBuildIndex = source.indexOf(
    "- name: Build a clean Vercel artifact on GitHub Actions compute",
  );
  const integrityIndex = source.indexOf(
    "- name: Prove every prebuilt public asset exactly matches source",
  );
  const deployIndex = source.indexOf(
    "- name: Upload the verified prebuilt artifact exactly once",
  );

  for (const index of [pullIndex, cleanBuildIndex, integrityIndex, deployIndex]) {
    assert.notEqual(index, -1);
  }
  assert.ok(pullIndex < cleanBuildIndex);
  assert.ok(cleanBuildIndex < integrityIndex);
  assert.ok(integrityIndex < deployIndex);

  const cleanBuild = source.slice(cleanBuildIndex, integrityIndex);
  assert.match(cleanBuild, /rm -rf \.next \.vercel\/output/);
  assert.match(cleanBuild, /"vercel@\$VERCEL_CLI_VERSION" build/);
});

test("every checked-in public file must be byte-identical before upload", async () => {
  const source = await workflow();
  const start = source.indexOf(
    "- name: Prove every prebuilt public asset exactly matches source",
  );
  const end = source.indexOf(
    "- name: Upload the verified prebuilt artifact exactly once",
    start,
  );
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const integrityGate = source.slice(start, end);

  assert.match(integrityGate, /find public -type f -print0 \| sort -z/);
  assert.match(integrityGate, /built="\.vercel\/output\/static\/\$relative"/);
  assert.match(integrityGate, /cmp --silent "\$source" "\$built"/);
  assert.match(integrityGate, /Missing prebuilt public asset/);
  assert.match(integrityGate, /Prebuilt public asset differs from source/);
  assert.match(integrityGate, /vercel-prebuilt-public-assets\.sha256/);
  assert.match(integrityGate, /test "\$count" -gt 0/);
});

test("production upload is staged without moving canonical domains", async () => {
  const source = await workflow();
  const deployIndex = source.indexOf(
    "- name: Upload the verified prebuilt artifact exactly once",
  );
  const metadataIndex = source.indexOf(
    "- name: Guard immutable deployment metadata",
  );
  const stagedIndex = source.indexOf(
    "- name: Prove a production release is staged before verification",
  );
  const immutableIndex = source.indexOf(
    "- name: Verify critical assets on the immutable deployment",
  );

  for (const index of [deployIndex, metadataIndex, stagedIndex, immutableIndex]) {
    assert.notEqual(index, -1);
  }
  assert.ok(deployIndex < metadataIndex);
  assert.ok(metadataIndex < stagedIndex);
  assert.ok(stagedIndex < immutableIndex);

  const deploy = source.slice(deployIndex, metadataIndex);
  assert.match(deploy, /--prebuilt/);
  assert.match(deploy, /--prod/);
  assert.match(deploy, /--skip-domain/);

  const staged = source.slice(stagedIndex, immutableIndex);
  assert.match(staged, /if: \$\{\{ inputs\.target == 'production' \}\}/);
  assert.match(staged, /for alias_name in moraltrade\.org www\.moraltrade\.org/);
  assert.match(staged, /api\.vercel\.com\/v4\/aliases\/\$alias_name/);
  assert.match(staged, /resolved_deployment.*deploymentId/);
  assert.match(staged, /Canonical alias moved before immutable verification/);
});

test("critical immutable assets are authenticated and verified before promotion", async () => {
  const source = await workflow();
  const immutableIndex = source.indexOf(
    "- name: Verify critical assets on the immutable deployment",
  );
  const promotionIndex = source.indexOf(
    "- name: Promote the verified staged production deployment to canonical aliases",
  );

  assert.notEqual(immutableIndex, -1);
  assert.notEqual(promotionIndex, -1);
  assert.ok(immutableIndex < promotionIndex);

  const immutableGate = source.slice(immutableIndex, promotionIndex);
  assert.match(immutableGate, /moral-trade-live-create-router\.js/);
  assert.match(immutableGate, /moral-trade-live-command-center\.js/);
  assert.match(immutableGate, /"vercel@\$VERCEL_CLI_VERSION" curl/);
  assert.match(immutableGate, /--deployment="\$DEPLOYMENT_URL"/);
  assert.match(immutableGate, /--token="\$VERCEL_TOKEN"/);
  assert.match(immutableGate, /cmp --silent "\$source" "\$output"/);
  assert.doesNotMatch(immutableGate, /vercel promote/);
});

test("verified production deployments are explicitly promoted and alias ownership is proved", async () => {
  const source = await workflow();
  const promotionIndex = source.indexOf(
    "- name: Promote the verified staged production deployment to canonical aliases",
  );
  const canonicalIndex = source.indexOf(
    "- name: Verify canonical production alias ownership and critical assets",
  );
  const evidenceIndex = source.indexOf(
    "- name: Upload immutable release-integrity evidence",
  );

  for (const index of [promotionIndex, canonicalIndex, evidenceIndex]) {
    assert.notEqual(index, -1);
  }
  assert.ok(promotionIndex < canonicalIndex);
  assert.ok(canonicalIndex < evidenceIndex);

  const promotion = source.slice(promotionIndex, canonicalIndex);
  assert.match(promotion, /if: \$\{\{ inputs\.target == 'production' \}\}/);
  assert.match(promotion, /"vercel@\$VERCEL_CLI_VERSION" promote/);
  assert.match(promotion, /"\$DEPLOYMENT_URL"/);
  assert.match(promotion, /--yes/);
  assert.match(promotion, /--timeout=5m/);
  assert.doesNotMatch(promotion, /vercel alias set/);

  const canonical = source.slice(canonicalIndex, evidenceIndex);
  assert.match(canonical, /for alias_name in moraltrade\.org www\.moraltrade\.org/);
  assert.match(canonical, /api\.vercel\.com\/v4\/aliases\/\$alias_name/);
  assert.match(canonical, /resolved_project.*projectId/);
  assert.match(canonical, /resolved_deployment.*deploymentId/);
  assert.match(canonical, /resolved_deployment" != "\$DEPLOYMENT_ID"/);
  assert.match(canonical, /api\.vercel\.com\/v13\/deployments\/\$DEPLOYMENT_ID/);
  assert.match(canonical, /\$CANONICAL_ORIGIN\/\$relative/);
  assert.match(canonical, /Cache-Control: no-cache/);
  assert.match(canonical, /cmp --silent "\$source" "\$output"/);
});

test("release-integrity manifests and promotion evidence are retained", async () => {
  const source = await workflow();
  assert.match(source, /actions\/upload-artifact@v4/);
  assert.match(source, /gated-vercel-release-integrity-\$\{\{ github\.run_id \}\}/);
  assert.match(source, /vercel-prebuilt-public-manifest\.sha256/);
  assert.match(source, /vercel-deployed-static-assets\.sha256/);
  assert.match(source, /vercel-production-promotion\.txt/);
  assert.match(source, /vercel-production-alias-ownership\.txt/);
  assert.match(source, /vercel-canonical-static-assets\.sha256/);
  assert.match(source, /retention-days: 30/);
});
