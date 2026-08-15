import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflowPath =
  ".github/workflows/pr547-every-org-provider-staging-708-phase1-fix-b2c45dc0-20260815.yml";
const workflow = readFileSync(workflowPath, "utf8");

function section(begin, end) {
  const start = workflow.indexOf(begin);
  const finish = workflow.indexOf(end);
  assert.notEqual(start, -1, `missing section marker: ${begin}`);
  assert.notEqual(finish, -1, `missing section marker: ${end}`);
  assert.ok(finish > start, `invalid section marker order: ${begin}`);
  return workflow.slice(start, finish + end.length);
}

const providerIssued = [
  "EVERY_ORG_STAGING_DONATE_LINK_WEBHOOK_TOKEN",
  "EVERY_ORG_STAGING_PARTNER_WEBHOOK_AUTHORIZATION_TOKEN",
];

const phase1Prerequisites = section(
  "# PHASE1_PREREQUISITES_BEGIN",
  "# PHASE1_PREREQUISITES_END",
);
const phase2Prerequisites = section(
  "# PHASE2_PREREQUISITES_BEGIN",
  "# PHASE2_PREREQUISITES_END",
);
const phase1DeployEnvironment = section(
  "# PHASE1_DEPLOY_ENV_BEGIN",
  "# PHASE1_DEPLOY_ENV_END",
);
const phase1VercelFlags = section(
  "# PHASE1_VERCEL_FLAGS_BEGIN",
  "# PHASE1_VERCEL_FLAGS_END",
);

test("Phase 1 requires no provider-issued webhook credential", () => {
  for (const credential of providerIssued) {
    assert.doesNotMatch(phase1Prerequisites, new RegExp(credential));
  }
  for (const required of [
    "EVERY_ORG_STAGING_PUBLIC_API_KEY",
    "EVERY_ORG_STAGING_WEBHOOK_PATH_SECRET",
    "EVERY_ORG_STAGING_PARTNER_METADATA_SECRET",
    "VERCEL_AUTOMATION_BYPASS_SECRET",
  ]) {
    assert.match(phase1Prerequisites, new RegExp(required));
  }
});

test("both provider-issued webhook credentials are Phase 2-only prerequisites", () => {
  assert.match(phase2Prerequisites, /EVERY_ORG_STAGING_DONATE_LINK_WEBHOOK_TOKEN/);
  assert.match(
    phase2Prerequisites,
    /EVERY_ORG_STAGING_PARTNER_WEBHOOK_AUTHORIZATION_TOKEN/,
  );
  assert.match(phase2Prerequisites, /"\$\{phase1_names\[@\]\}"/);
});

test("Phase 1 deployment environment and Vercel flags contain no provider-issued webhook credential", () => {
  for (const segment of [phase1DeployEnvironment, phase1VercelFlags]) {
    for (const credential of providerIssued) {
      assert.doesNotMatch(segment, new RegExp(credential));
    }
  }
  assert.match(
    phase1VercelFlags,
    /EVERY_ORG_PUBLIC_API_KEY=\$EVERY_ORG_STAGING_PUBLIC_API_KEY/,
  );
  assert.match(
    phase1VercelFlags,
    /EVERY_ORG_WEBHOOK_PATH_SECRET=\$EVERY_ORG_STAGING_WEBHOOK_PATH_SECRET/,
  );
  assert.match(
    phase1VercelFlags,
    /EVERY_ORG_PARTNER_METADATA_SECRET=\$EVERY_ORG_STAGING_PARTNER_METADATA_SECRET/,
  );
});

test("Phase 1 preserves search-only readiness and fail-closed webhook smoke checks", () => {
  assert.match(workflow, /DIRECT_DONATION_UPGRADE_QA_FIXTURES=false/);
  assert.match(
    workflow,
    /nonprofit-search '\/api\/donation-upgrades\/nonprofits\/search\?q=GiveWell'/,
  );
  assert.match(workflow, /test "\$webhook_code" = 401/);
  assert.match(workflow, /jq -e '\. == \{"ok": false\}'/);
  assert.match(workflow, /providerIssuedWebhookCredentialsInjected: false/);
});

test("no Phase 2 deployment is enabled in the corrected controller", () => {
  assert.match(workflow, /PHASE2_DEPLOYMENT_ENABLED: "false"/);
  assert.doesNotMatch(workflow, /^\s{2}deploy_phase2:/m);
});
