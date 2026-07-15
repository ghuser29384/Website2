import assert from "node:assert/strict";
import test from "node:test";

import { evaluateMpgfPaymentEnvironment } from "@/lib/mpgf/real-money";

const sharedEnvironment = {
  STRIPE_WEBHOOK_SECRET: "whsec_example",
  SUPABASE_SERVICE_ROLE_KEY: "service_role_example",
} as NodeJS.ProcessEnv;

test("test-payment mode uses test keys and does not require live acceptance gates", () => {
  const result = evaluateMpgfPaymentEnvironment({
    ...sharedEnvironment,
    MPGF_TEST_PAYMENT_ENABLED: "true",
    MPGF_REAL_MONEY_ENABLED: "false",
    MPGF_REAL_MONEY_ACCEPTANCE_ENABLED: "false",
    STRIPE_SECRET_KEY: "sk_test_example",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_example",
  });

  assert.equal(result.mode, "test_payment");
  assert.deepEqual(result.blockers, []);
});

test("test-payment mode fails closed when live Stripe keys are supplied", () => {
  const result = evaluateMpgfPaymentEnvironment({
    ...sharedEnvironment,
    MPGF_TEST_PAYMENT_ENABLED: "true",
    MPGF_REAL_MONEY_ENABLED: "false",
    STRIPE_SECRET_KEY: "sk_live_example",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_example",
  });

  assert.equal(result.mode, "test_payment");
  assert.equal(result.blockers.includes("MPGF test-payment mode requires a Stripe test secret key."), true);
  assert.equal(result.blockers.includes("MPGF test-payment mode requires a Stripe test publishable key."), true);
});

test("real-money mode requires live keys and explicit acceptance enablement", () => {
  const blocked = evaluateMpgfPaymentEnvironment({
    ...sharedEnvironment,
    MPGF_REAL_MONEY_ENABLED: "true",
    MPGF_TEST_PAYMENT_ENABLED: "false",
    MPGF_REAL_MONEY_ACCEPTANCE_ENABLED: "false",
    STRIPE_SECRET_KEY: "sk_test_example",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_example",
  });

  assert.equal(blocked.mode, "real_money");
  assert.equal(blocked.blockers.includes("MPGF real-money mode requires a Stripe live secret key."), true);
  assert.equal(blocked.blockers.includes("MPGF real-money mode requires a Stripe live publishable key."), true);
  assert.equal(blocked.blockers.includes("MPGF_REAL_MONEY_ACCEPTANCE_ENABLED is not true."), true);

  const ready = evaluateMpgfPaymentEnvironment({
    ...sharedEnvironment,
    MPGF_REAL_MONEY_ENABLED: "true",
    MPGF_TEST_PAYMENT_ENABLED: "false",
    MPGF_REAL_MONEY_ACCEPTANCE_ENABLED: "true",
    STRIPE_SECRET_KEY: "sk_live_example",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_example",
  });

  assert.equal(ready.mode, "real_money");
  assert.deepEqual(ready.blockers, []);
});

test("ambiguous or disabled payment-mode flags fail closed", () => {
  const both = evaluateMpgfPaymentEnvironment({
    ...sharedEnvironment,
    MPGF_REAL_MONEY_ENABLED: "true",
    MPGF_TEST_PAYMENT_ENABLED: "true",
    STRIPE_SECRET_KEY: "sk_test_example",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_example",
  });
  assert.equal(both.mode, "blocked");
  assert.equal(both.blockers.includes("MPGF real-money and test-payment modes cannot both be enabled."), true);

  const neither = evaluateMpgfPaymentEnvironment({
    ...sharedEnvironment,
    MPGF_REAL_MONEY_ENABLED: "false",
    MPGF_TEST_PAYMENT_ENABLED: "false",
    STRIPE_SECRET_KEY: "sk_test_example",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_example",
  });
  assert.equal(neither.mode, "blocked");
  assert.equal(neither.blockers.includes("Enable exactly one MPGF payment mode: test payment or real money."), true);
});

test("webhook and service-role credentials are mandatory in every payment mode", () => {
  const result = evaluateMpgfPaymentEnvironment({
    MPGF_TEST_PAYMENT_ENABLED: "true",
    MPGF_REAL_MONEY_ENABLED: "false",
    STRIPE_SECRET_KEY: "sk_test_example",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_example",
  });

  assert.equal(result.blockers.includes("STRIPE_WEBHOOK_SECRET is missing."), true);
  assert.equal(result.blockers.includes("SUPABASE_SERVICE_ROLE_KEY is missing."), true);
});
