import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflowUrl = new URL(
  "../workflows/pr547-every-org-staging-bypass-rotation-0207a584-20260816.yml",
  import.meta.url,
);
const workflow = readFileSync(workflowUrl, "utf8");

test("the successor controller is pinned to the exact accepted candidate", () => {
  assert.match(
    workflow,
    /EXPECTED_CANDIDATE_SHA: 0207a58410480b6edd1bb5a1496bc8ce7c66d6f6/,
  );
  assert.match(
    workflow,
    /EXPECTED_CANDIDATE_TREE: 360c4ac6949f1f83adc4e9dbf428b55f3870aea6/,
  );
  assert.match(
    workflow,
    /EXPECTED_STACKED_BASE_SHA: b2c45dc0110d8841f7cbd7576347936044310c1c/,
  );
});

test("the dedicated provider bypass is required separately from general automation", () => {
  assert.match(
    workflow,
    /EVERY_ORG_STAGING_VERCEL_BYPASS_SECRET: \$\{\{ secrets\.EVERY_ORG_STAGING_VERCEL_BYPASS_SECRET \}\}/,
  );
  assert.match(
    workflow,
    /VERCEL_AUTOMATION_BYPASS_SECRET: \$\{\{ secrets\.VERCEL_AUTOMATION_BYPASS_SECRET \}\}/,
  );
  assert.match(
    workflow,
    /test "\$VERCEL_AUTOMATION_BYPASS_SECRET" != "\$EVERY_ORG_STAGING_VERCEL_BYPASS_SECRET"/,
  );
  assert.match(
    workflow,
    /provider_bypass="x-vercel-protection-bypass=\$EVERY_ORG_STAGING_VERCEL_BYPASS_SECRET"/,
  );
  assert.match(
    workflow,
    /automation_bypass="x-vercel-protection-bypass=\$VERCEL_AUTOMATION_BYPASS_SECRET"/,
  );
});

test("the provider callback template uses only the dedicated bypass", () => {
  assert.match(
    workflow,
    /<EVERY_ORG_STAGING_WEBHOOK_PATH_SECRET>\?x-vercel-protection-bypass=<EVERY_ORG_STAGING_VERCEL_BYPASS_SECRET>/,
  );
  const templateBlock = workflow.match(
    /cat > evidence\/webhook-url-template\.txt <<'EOF_TEMPLATE'\n([\s\S]*?)\n\s*EOF_TEMPLATE/,
  );
  assert.ok(templateBlock);
  assert.doesNotMatch(templateBlock[1], /<VERCEL_AUTOMATION_BYPASS_SECRET>/);
});

test("provider-issued webhook credentials remain absent and Phase 2 remains blocked", () => {
  assert.doesNotMatch(workflow, /EVERY_ORG_STAGING_DONATE_LINK_WEBHOOK_TOKEN/);
  assert.doesNotMatch(
    workflow,
    /EVERY_ORG_STAGING_PARTNER_WEBHOOK_AUTHORIZATION_TOKEN/,
  );
  assert.match(workflow, /PROVIDER_AUTHORIZATION_CONTRACT_STATUS: unconfirmed/);
  assert.match(workflow, /providerIssuedWebhookCredentialsInjected: false/);
  assert.match(workflow, /commitmentsReady: false/);
  assert.match(workflow, /checkoutReady: false/);
});

test("deployment requires an exact one-file owner authorization and stays non-production", () => {
  assert.match(
    workflow,
    /PHASE1_AUTHORIZATION: \.github\/pr547-every-org-phase1-bypass-rotation-0207a584\.authorize/,
  );
  assert.match(
    workflow,
    /authorization=AUTHORIZE_PR547_EVERY_ORG_PHASE1_BYPASS_ROTATION_0207A584/,
  );
  assert.match(
    workflow,
    /test "\$\(wc -l < evidence\/changed-paths\.txt \| tr -d ' '\)" = 1/,
  );
  assert.doesNotMatch(workflow, /--prod/);
  assert.match(workflow, /productionAliasChanged: false/);
  assert.match(workflow, /providerTransactionAttempted: false/);
});
