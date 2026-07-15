import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Stripe webhook fails closed before constructing the API client", () => {
  const source = readFileSync("src/app/api/stripe/webhook/route.ts", "utf8");
  const environmentGate = source.indexOf("if (!hasStripeEnv() || !webhookSecret)");
  const clientConstruction = source.indexOf("const stripe = getStripe();");

  assert.notEqual(environmentGate, -1, "webhook route must check the complete Stripe environment");
  assert.notEqual(clientConstruction, -1, "webhook route must construct a Stripe client after configuration checks");
  assert.ok(
    environmentGate < clientConstruction,
    "webhook route must return a structured 503 before getStripe() can throw on missing configuration",
  );
  assert.match(source, /status: 503/);
});
