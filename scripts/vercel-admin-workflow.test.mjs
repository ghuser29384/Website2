import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workflowPath = new URL(
  "../.github/workflows/vercel-admin-cost-controls.yml",
  import.meta.url,
);

async function workflow() {
  return readFile(workflowPath, "utf8");
}

test("administrative changes are manual, serialized, and explicitly confirmed", async () => {
  const source = await workflow();
  assert.match(source, /on:\n\s+workflow_dispatch:/);
  assert.doesNotMatch(source, /^\s{2}(?:push|pull_request):/m);
  assert.match(source, /APPLY-VERCEL-COST-CONTROLS/);
  assert.match(source, /cancel-in-progress: false/);
});

test("the workflow preserves the canonical project and disconnects only website2", async () => {
  const source = await workflow();
  assert.match(source, /CANONICAL_PROJECT_ID: prj_Em3j7Uj7RatX2R1ZYhla3XSHRde7/);
  assert.match(source, /DUPLICATE_PROJECT_ID: prj_uhfNhPo00nQrcbG0dk2zLWo7UmdK/);
  assert.match(source, /printf 'y\\n' \| npx --yes/);
  assert.match(source, /git disconnect \\\n\s+--token=/);
  assert.match(source, /website2 is already disconnected from Git/);
  assert.doesNotMatch(source, /git disconnect github/);
  assert.doesNotMatch(source, /project rm moraltrade-site/);
});

test("resuming production requires live-state and exact canonical-route checks", async () => {
  const source = await workflow();
  assert.match(source, /REQUIRE_CANONICAL_LIVE: \$\{\{ inputs\.resume_production \}\}/);
  assert.match(source, /Smoke-test the canonical production routes after resume/);
  assert.match(source, /inputs\.mode == 'apply' && inputs\.resume_production/);
  assert.match(source, /VERCEL_COST_CONTROL_MODE: smoke/);
  assert.match(source, /VERCEL_PRODUCTION_BASE_URL: https:\/\/www\.moraltrade\.org/);
  assert.match(source, /VERCEL_PRODUCTION_SMOKE_ATTEMPTS: 30/);
  assert.match(source, /vercel-production-smoke\.json/);
});

test("audit, apply, verification, and smoke evidence are retained without credentials", async () => {
  const source = await workflow();
  assert.match(source, /VERCEL_COST_CONTROL_MODE: audit/);
  assert.match(source, /VERCEL_COST_CONTROL_MODE: apply/);
  assert.match(source, /VERCEL_COST_CONTROL_MODE: verify/);
  assert.match(source, /VERCEL_COST_CONTROL_MODE: smoke/);
  assert.match(source, /actions\/upload-artifact@v4/);
  assert.match(source, /secrets\.VERCEL_TOKEN/);
  assert.doesNotMatch(source, /tok_[A-Za-z0-9_-]+/);
});
