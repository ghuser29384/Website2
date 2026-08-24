import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  "src/lib/payments/trade-donation-pool-webhook.ts",
  "utf8",
);

test("signed pooled Stripe webhook gate persistence fails closed", () => {
  assert.match(
    source,
    /const \{ data, error \} = await supabase[\s\S]*\.from\("trade_donation_pool_gate_status"\)[\s\S]*\.eq\("environment", environment\)[\s\S]*\.eq\("gate_key", "stripe_signed_webhook"\)[\s\S]*\.select\("environment,gate_key,status"\)[\s\S]*\.maybeSingle\(\)/,
  );
  assert.match(source, /if \(error\) \{[\s\S]*gate could not be persisted/);
  assert.match(
    source,
    /if \(!data \|\| data\.status !== "passed"\) \{[\s\S]*gate row was unavailable/,
  );
  assert.match(source, /updated_at: new Date\(\)\.toISOString\(\)/);
});
