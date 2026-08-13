import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// QA-only: register the pooled-settlement contracts in the existing no-secrets CI runner.
import "../trade-donation-pool-source-contract.test";
import "../trade-donation-pool.test";

const mandates = readFileSync("src/lib/payments/conditional-mandates.ts", "utf8");
const workspace = readFileSync("src/app/donation-offsets/payments/page.tsx", "utf8");
const environmentExample = readFileSync(".env.example", "utf8");

test("Stripe Checkout uses dynamic payment methods instead of a card-only allow-list", () => {
  assert.match(mandates, /mode: "setup"/);
  assert.doesNotMatch(mandates, /payment_method_types\s*:/);
  assert.match(mandates, /Stripe dynamically selects eligible Dashboard-enabled methods/);
  assert.match(mandates, /Your selected payment method will not be charged now/);
});

test("the payment workspace accurately discloses wallet and PayPal eligibility", () => {
  assert.match(workspace, /Card, Apple Pay, Google Pay, and Link when eligible/);
  assert.match(workspace, /PayPal appears only for supported Stripe account regions and flows/);
  assert.match(workspace, /PayPal requires a[\s\S]*supported Stripe account region/);
  assert.match(environmentExample, /Dashboard-managed dynamic payment methods/);
});

test("live money remains fail-closed by default", () => {
  assert.match(environmentExample, /CONDITIONAL_PAYMENTS_MODE=disabled/);
  assert.match(environmentExample, /MPGF_REAL_MONEY_ENABLED=false/);
  assert.match(environmentExample, /MPGF_REAL_MONEY_ACCEPTANCE_ENABLED=false/);
});
