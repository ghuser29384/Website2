import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  "src/lib/payments/trade-donation-pool-webhook.ts",
  "utf8",
);

test("signed pooled Stripe webhook evidence persists without bypassing operator gate review", () => {
  assert.match(
    source,
    /async function verifySignedWebhookEvidence[\s\S]*\.from\("trade_donation_pool_stripe_events"\)[\s\S]*\.select\("stripe_event_id,event_type,livemode,payload_hash,signature_verified"\)[\s\S]*\.eq\("stripe_event_id", input\.event\.id\)[\s\S]*\.maybeSingle\(\)/,
  );
  assert.match(
    source,
    /data\.stripe_event_id !== input\.event\.id[\s\S]*data\.event_type !== input\.event\.type[\s\S]*data\.livemode !== input\.event\.livemode[\s\S]*data\.payload_hash !== input\.rawBodyHash[\s\S]*data\.signature_verified !== true/,
  );
  assert.match(source, /signed Stripe webhook evidence could not be loaded/);
  assert.match(source, /did not persist its exact verified event identity/);
  assert.doesNotMatch(source, /\.from\("trade_donation_pool_gate_status"\)/);
  assert.match(source, /await verifySignedWebhookEvidence\(input\)/);
});
