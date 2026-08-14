import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  "supabase/migrations/20260814030000_harden_trade_donation_pool_stripe_failure_environment.sql",
  "utf8",
);
const webhook = readFileSync(
  "src/lib/payments/trade-donation-pool-webhook.ts",
  "utf8",
);

test("signed Stripe failure events cannot mutate an obligation in the opposite environment", () => {
  assert.match(
    migration,
    /if obligation_row\.stripe_livemode <> p_livemode then/,
  );
  assert.match(
    migration,
    /failureCode', 'stripe_failure_environment_mismatch'/,
  );
  assert.match(
    migration,
    /return jsonb_build_object\('status', 'mismatch'\)/,
  );

  const environmentCheck = migration.indexOf(
    "obligation_row.stripe_livemode <> p_livemode",
  );
  const obligationMutation = migration.indexOf("status = next_status");
  assert.ok(environmentCheck >= 0);
  assert.ok(obligationMutation > environmentCheck);

  assert.match(
    migration,
    /revoke all on function public\.record_trade_donation_pool_stripe_failure\([\s\S]*?\) from public, anon, authenticated/,
  );
  assert.match(
    migration,
    /grant execute on function public\.record_trade_donation_pool_stripe_failure\([\s\S]*?\) to service_role/,
  );
});

test("mismatched pooled Stripe outcomes cannot pass the signed-webhook readiness gate", () => {
  assert.match(
    webhook,
    /\["funded", "bundled", "already_funded"\]\.includes\(status\)[\s\S]*?passSignedWebhookGate/,
  );
  assert.match(
    webhook,
    /\["checkout_abandoned", "payment_failed"\]\.includes\(status\)[\s\S]*?passSignedWebhookGate/,
  );
  assert.match(
    webhook,
    /\["refunded", "disputed", "needs_review"\]\.includes\(status\)[\s\S]*?passSignedWebhookGate/,
  );
  assert.equal(
    webhook.match(/await passSignedWebhookGate\(input\.event\.livemode\);/g)?.length,
    3,
  );
});
