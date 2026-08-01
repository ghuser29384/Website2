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
  assert.match(source, /git disconnect github/);
  assert.doesNotMatch(source, /project rm moraltrade-site/);
});

test("audit, apply, and verification evidence are all retained without credentials", async () => {
  const source = await workflow();
  assert.match(source, /VERCEL_COST_CONTROL_MODE: audit/);
  assert.match(source, /VERCEL_COST_CONTROL_MODE: apply/);
  assert.match(source, /VERCEL_COST_CONTROL_MODE: verify/);
  assert.match(source, /actions\/upload-artifact@v4/);
  assert.match(source, /secrets\.VERCEL_TOKEN/);
  assert.doesNotMatch(source, /tok_[A-Za-z0-9_-]+/);
});
