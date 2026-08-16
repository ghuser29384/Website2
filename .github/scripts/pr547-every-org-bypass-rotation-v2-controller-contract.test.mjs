import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const workflowPath = ".github/workflows/pr547-every-org-staging-bypass-rotation-v2-0207a584-20260816.yml";
const workflow = fs.readFileSync(workflowPath, "utf8");

test("the hardened successor is pinned to the exact accepted candidate", () => {
  assert.match(workflow, /EXPECTED_CANDIDATE_SHA: 0207a58410480b6edd1bb5a1496bc8ce7c66d6f6/);
  assert.match(workflow, /EXPECTED_CANDIDATE_TREE: 360c4ac6949f1f83adc4e9dbf428b55f3870aea6/);
  assert.match(workflow, /EXPECTED_STACKED_BASE_SHA: b2c45dc0110d8841f7cbd7576347936044310c1c/);
});

test("the dedicated provider bypass must have the registered Vercel format", () => {
  assert.match(workflow, /EVERY_ORG_STAGING_VERCEL_BYPASS_SECRET:must_be_registered_32_char_alphanumeric/);
  assert.match(workflow, /\^\[A-Za-z0-9\]\{32\}\$/);
  assert.match(workflow, /test "\$VERCEL_AUTOMATION_BYPASS_SECRET" != "\$EVERY_ORG_STAGING_VERCEL_BYPASS_SECRET"/);
});

test("provider bypass is verified independently by header and query without redirect-following", () => {
  assert.match(workflow, /dedicated-bypass-header-connectors/);
  assert.match(workflow, /dedicated-bypass-query-connectors/);
  assert.match(workflow, /x-vercel-protection-bypass: \$secret/);
  assert.doesNotMatch(workflow, /--location/);
});

test("the webhook smoke proves the application generic 401 and retains no raw body", () => {
  assert.match(workflow, /webhook-empty-dedicated-query/);
  assert.match(workflow, /jq -e '\. == \{"ok": false\}' "\$webhook_body"/);
  assert.match(workflow, /raw_http_bodies_retained=false/);
  assert.match(workflow, /Sanitize every evidence file before upload/);
  assert.match(workflow, /secret_bearing_files_removed=/);
});

test("provider-issued credentials and Phase 2 remain absent", () => {
  assert.doesNotMatch(workflow, /EVERY_ORG_STAGING_DONATE_LINK_WEBHOOK_TOKEN/);
  assert.doesNotMatch(workflow, /EVERY_ORG_STAGING_PARTNER_WEBHOOK_AUTHORIZATION_TOKEN/);
  assert.match(workflow, /PROVIDER_AUTHORIZATION_CONTRACT_STATUS: unconfirmed/);
  assert.match(workflow, /providerIssuedWebhookCredentialsRequired": False/);
});

test("deployment remains one-file-authorized, bounded, and non-production", () => {
  assert.match(workflow, /wc -l < evidence\/changed-paths\.txt/);
  assert.match(workflow, /phase=phase1_bypass_rotation_v2/);
  assert.match(workflow, /target: "preview"/);
  assert.match(workflow, /productionAliasChanged: false/);
  assert.doesNotMatch(workflow, /--prod/);
});
