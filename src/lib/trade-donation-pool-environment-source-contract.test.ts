import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const everyOrgWebhookRoute = readFileSync(
  "src/app/api/connectors/every-org/[secret]/route.ts",
  "utf8",
);

test("pooled Every.org settlement rejects cross-environment bundles before the completion RPC", () => {
  assert.match(
    everyOrgWebhookRoute,
    /const expectedBundleEnvironment = config\.environment === "live" \? "live" : "test"/,
  );
  assert.match(
    everyOrgWebhookRoute,
    /bundle\.environment !== expectedBundleEnvironment/,
  );
  assert.match(
    everyOrgWebhookRoute,
    /error: "environment_mismatch"/,
  );

  const environmentCheck = everyOrgWebhookRoute.indexOf(
    "bundle.environment !== expectedBundleEnvironment",
  );
  const completionRpc = everyOrgWebhookRoute.indexOf(
    '"complete_every_org_trade_donation_pool_bundle"',
  );
  assert.ok(environmentCheck >= 0);
  assert.ok(completionRpc > environmentCheck);
});
