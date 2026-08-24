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
    /const \{ data: existing, error: lookupError \} = await supabase[\s\S]*\.eq\("environment", environment\)[\s\S]*\.eq\("gate_key", gateKey\)[\s\S]*\.maybeSingle\(\)/,
  );
  assert.match(source, /if \(!existing\) \{[\s\S]*gate row was unavailable/);
  assert.match(
    source,
    /const \{ data, error \} = await supabase[\s\S]*\.upsert\(\{[\s\S]*environment,[\s\S]*gate_key: gateKey,[\s\S]*status: "passed"[\s\S]*\}, \{ onConflict: "environment,gate_key" \}\)[\s\S]*\.select\("environment,gate_key,status"\)[\s\S]*\.maybeSingle\(\)/,
  );
  assert.match(source, /if \(error\) \{[\s\S]*gate could not be persisted/);
  assert.match(
    source,
    /if \(!data \|\| data\.status !== "passed"\) \{[\s\S]*did not persist its passed state/,
  );
  assert.match(source, /updated_at: timestamp/);
});
